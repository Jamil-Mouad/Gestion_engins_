import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatbotService } from './chatbot.service';
import { ChatbotChunk, ChatbotMessage } from '../../shared/models/chatbot.model';

@Injectable()
export class SseRealChatbotService extends ChatbotService {
  private abortController: AbortController | null = null;
  activeConversationId: number | null = null;

  private getToken(): string | null {
    return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token');
  }

  override sendMessage(prompt: string, _history: ChatbotMessage[]): Observable<ChatbotChunk> {
    this.abortController = new AbortController();
    const token = this.getToken();

    return new Observable<ChatbotChunk>((subscriber) => {
      fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: prompt, conversation_id: this.activeConversationId }),
        signal: this.abortController!.signal,
      })
        .then((response) => {
          if (!response.ok) {
            subscriber.error(new Error(`HTTP ${response.status}`));
            return;
          }
          // Adopt the conversation id the backend lazily created (or echoed).
          const convHeader = response.headers.get('X-Conversation-Id');
          if (convHeader) {
            const parsed = Number(convHeader);
            if (!Number.isNaN(parsed)) this.activeConversationId = parsed;
          }
          const reader = response.body!
            .pipeThrough(new TextDecoderStream())
            .getReader();

          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) { subscriber.complete(); return; }
              const lines = value.split('\n');
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const chunk: ChatbotChunk = JSON.parse(line.slice(6));
                  subscriber.next(chunk);
                  if (chunk.type === 'done' || chunk.type === 'error') {
                    subscriber.complete();
                    return;
                  }
                } catch { /* ignore malformed line */ }
              }
              return pump();
            });

          pump().catch((err) => {
            if (err?.name === 'AbortError') { subscriber.complete(); }
            else { subscriber.error(err); }
          });
        })
        .catch((err) => {
          if (err?.name === 'AbortError') { subscriber.complete(); }
          else { subscriber.error(err); }
        });
    });
  }

  override abort(): void {
    this.abortController?.abort();
  }
}
