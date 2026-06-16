import { Component, inject, signal, OnDestroy, ElementRef, ViewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatbotService } from '../../core/chatbot/chatbot.service';
import { SseRealChatbotService } from '../../core/chatbot/sse-real-chatbot.service';
import { ChatbotMessage, ChatbotChunk } from '../../shared/models/chatbot.model';
import { MessageBubbleComponent } from './message-bubble.component';
import { ConversationSidebarComponent } from './conversation-sidebar.component';
import { ConversationService } from './conversation.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, MessageBubbleComponent, ConversationSidebarComponent],
  template: `
    <div class="chatbot-layout">
    <app-conversation-sidebar
      (conversationSelected)="onConversationSelected($event)"
      (conversationDeleted)="onConversationDeleted($event)"></app-conversation-sidebar>
    <div class="chatbot-screen">

      <!-- Conversation area -->
      <div class="chatbot-messages" #scrollContainer>
        @for (msg of messages(); track $index) {
          <!-- Skip the empty placeholder while the assistant is still
               "thinking" — the typing indicator below represents that state,
               so we don't render a bare bubble with a lone cursor. -->
          @if (!(msg.role === 'assistant' && msg.streaming && !msg.content)) {
            <app-message-bubble [message]="msg" />
          }
        }
        @if (messages().length === 0) {
          <div class="chatbot-empty">Posez une question sur votre flotte…</div>
        }

        <!-- Typing / dotBounce indicator -->
        @if (isTyping()) {
          <div class="chatbot-typing">
            <div class="chatbot-typing__avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="9" width="16" height="10" rx="2"/>
                <path d="M12 9V6"/><circle cx="12" cy="4.5" r="1.2"/>
                <path d="M9 14h.01M15 14h.01"/>
                <path d="M4 13H2.5M21.5 13H20"/>
              </svg>
            </div>
            <div class="chatbot-typing__bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        }

        <div #bottomAnchor></div>
      </div>

      <!-- Input row -->
      <div class="chatbot-input-row">
        <div class="chatbot-input-row__wrap">
          <div class="chatbot-input-row__field">
            <input
              class="chatbot-input-row__input"
              [(ngModel)]="inputText"
              placeholder="Tapez votre question sur le parc, les interventions ou les KPIs…"
              (keydown.enter)="onEnterKey($event)"
            />
          </div>
          <button
            class="chatbot-input-row__send"
            [class.chatbot-input-row__send--active]="inputText.trim()"
            [disabled]="streaming() || !inputText.trim()"
            (click)="onSend(inputText)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
          </button>
        </div>
      </div>

    </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes dotBounce {
      0%,80%,100% { transform: translateY(0); }
      40%          { transform: translateY(-8px); }
    }

    .chatbot-layout {
      display: flex;
      height: calc(100vh - var(--topbar-height, 72px));
    }

    .chatbot-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--color-surface-1, #f8f9fc);
      animation: screenEnter 300ms ease-out both;
      min-width: 0;
    }

    /* ── Messages ── */
    .chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .chatbot-empty {
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text-muted, #64748b);
      text-align: center;
      padding: 48px 0;
    }

    /* ── Typing indicator ── */
    .chatbot-typing {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .chatbot-typing__avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: var(--color-primary-soft, #eff6ff);
      border: 2px solid var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .chatbot-typing__bubble {
      background: var(--color-surface, #fff);
      padding: 14px 18px;
      border-radius: 4px 12px 12px 12px;
      border: 1px solid var(--color-border, #e2e8f0);
      display: flex;
      gap: 5px;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--color-text-muted, #64748b);
      animation: dotBounce 1.2s infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    /* ── Input row (centered floating card) ── */
    .chatbot-input-row {
      background: transparent;
      padding: 12px 24px 24px;
      display: flex;
      justify-content: center;
      flex-shrink: 0;
    }
    .chatbot-input-row__wrap {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .chatbot-input-row__field {
      flex: 1;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 16px;
      background: var(--color-surface, #fff);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      display: flex;
      align-items: center;
      padding: 0 18px;
      min-height: 52px;
    }
    .chatbot-input-row__input {
      flex: 1;
      border: none;
      outline: none;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text, #0f172a);
      background: transparent;
    }
    .chatbot-input-row__input::placeholder { color: var(--color-text-muted, #64748b); }
    .chatbot-input-row__send {
      width: 52px; height: 52px;
      border-radius: 16px;
      border: none;
      background: var(--color-border, #e2e8f0);
      color: var(--color-text-muted, #64748b);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: not-allowed;
      transition: background 150ms, color 150ms;
      flex-shrink: 0;
    }
    .chatbot-input-row__send--active {
      background: var(--color-primary, #2563eb);
      color: #fff;
      cursor: pointer;
    }
    .chatbot-input-row__send:disabled { opacity: 0.6; }
    .chatbot-input-row__send--active:not(:disabled):hover {
      background: var(--color-primary-hover, #1d4ed8);
    }
  `],
})
export class ChatbotComponent implements OnDestroy {
  private chatbotService = inject(ChatbotService);
  private convService = inject(ConversationService);
  private subscription: Subscription | null = null;

  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild(ConversationSidebarComponent) private sidebar?: ConversationSidebarComponent;

  messages = signal<ChatbotMessage[]>([]);
  streaming = signal(false);
  inputText = '';
  activeConversationId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const msgs = this.messages(); // tracks this signal
      if (msgs.length) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  /**
   * True only while the assistant is "thinking" — streaming has started but no
   * token has arrived yet. Once text streams in, the bubble (with its cursor)
   * represents the in-progress state, so the dotBounce indicator hides.
   */
  isTyping(): boolean {
    const msgs = this.messages();
    if (msgs.length === 0) return false;
    const last = msgs[msgs.length - 1];
    return last.role === 'assistant' && last.streaming === true && !last.content;
  }

  private scrollToBottom(): void {
    this.bottomAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    event.preventDefault();
    this.onSend(this.inputText);
  }

  onConversationSelected(id: number | null): void {
    this.activeConversationId.set(id);
    this.messages.set([]);
    this.streaming.set(false);
    this.subscription?.unsubscribe();
    this.subscription = null;

    if (id !== null) {
      this.convService.getMessages(id).subscribe((msgs) => {
        this.messages.set(msgs.map(m => ({ ...m, streaming: false })));
      });
    }
  }

  onConversationDeleted(id: number): void {
    // If the deleted conversation was the active one, reset the view.
    if (id === this.activeConversationId()) {
      this.onConversationSelected(null);
    }
  }

  onSend(prompt: string): void {
    const trimmed = prompt.trim();
    if (!trimmed || this.streaming()) return;

    // Pass active conversation ID to the SSE service before streaming
    if (this.chatbotService instanceof SseRealChatbotService) {
      this.chatbotService.activeConversationId = this.activeConversationId();
    }

    this.inputText = '';
    this.subscription?.unsubscribe();
    this.subscription = null;

    const userMsg: ChatbotMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    this.messages.update((msgs) => [...msgs, userMsg]);

    const assistantMsg: ChatbotMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
      sources: [],
    };
    this.messages.update((msgs) => [...msgs, assistantMsg]);
    this.streaming.set(true);

    this.subscription = this.chatbotService.sendMessage(trimmed, this.messages()).subscribe({
      next: (chunk: ChatbotChunk) => {
        this.messages.update((msgs) => {
          const updated = [...msgs];
          const last = updated[updated.length - 1];
          if (chunk.type === 'text' && chunk.content) {
            updated[updated.length - 1] = { ...last, content: last.content + chunk.content };
          } else if (chunk.type === 'source' && chunk.source) {
            updated[updated.length - 1] = { ...last, sources: [...(last.sources || []), chunk.source] };
          } else if (chunk.type === 'done') {
            updated[updated.length - 1] = { ...last, streaming: false };
          }
          return updated;
        });
        if (chunk.type === 'done') {
          this.streaming.set(false);
          this.syncNewConversation();
        }
      },
      error: () => {
        this.streaming.set(false);
        this.messages.update((msgs) => {
          const updated = [...msgs];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + '\n\nErreur de connexion.',
            streaming: false,
          };
          return updated;
        });
      },
    });
  }

  /**
   * After the first prompt of a fresh chat, the chat endpoint lazily creates
   * the conversation and the SSE service captures its id from the
   * X-Conversation-Id response header. Adopt that id and refresh the sidebar so
   * the new conversation shows up in the history — this is the only point a
   * conversation enters the list.
   */
  private syncNewConversation(): void {
    if (this.activeConversationId() !== null) return;
    if (!(this.chatbotService instanceof SseRealChatbotService)) return;
    const newId = this.chatbotService.activeConversationId;
    if (newId !== null) {
      this.activeConversationId.set(newId);
      this.sidebar?.loadConversations();
    }
  }

  abort(): void {
    this.chatbotService.abort();
    this.streaming.set(false);
    this.messages.update((msgs) => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      if (last.streaming) {
        updated[updated.length - 1] = {
          ...last,
          content: last.content + '\n\nRéponse interrompue.',
          streaming: false,
        };
      }
      return updated;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.chatbotService.abort();
  }
}
