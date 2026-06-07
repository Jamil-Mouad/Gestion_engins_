import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ChatbotChunk, ChatbotMessage } from '../../shared/models/chatbot.model';

@Injectable()
export abstract class ChatbotService {
  abstract sendMessage(prompt: string, history: ChatbotMessage[]): Observable<ChatbotChunk>;
  abstract abort(): void;
}