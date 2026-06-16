import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Conversation, ChatbotMessage } from '../../shared/models/chatbot.model';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private http = inject(HttpClient);
  private readonly API = '/api/ai/conversations';

  list(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.API);
  }

  create(): Observable<{ id: number; titre: string }> {
    return this.http.post<{ id: number; titre: string }>(this.API, {});
  }

  togglePin(id: number): Observable<{ id: number; favori: boolean }> {
    return this.http.patch<{ id: number; favori: boolean }>(`${this.API}/${id}/pin`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  getMessages(id: number): Observable<ChatbotMessage[]> {
    return this.http.get<ChatbotMessage[]>(`${this.API}/${id}/messages`);
  }
}
