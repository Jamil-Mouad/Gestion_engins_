import { Component, inject, signal, OnDestroy, ElementRef, ViewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatbotService } from '../../core/chatbot/chatbot.service';
import { ChatbotMessage, ChatbotChunk } from '../../shared/models/chatbot.model';
import { MessageBubbleComponent } from './message-bubble.component';

const SUGGESTIONS = [
  'Prédiction CHR-042',
  'Coût moyen vidange',
  'Pneus en alerte',
  'Véhicules hors service',
  'Top 3 pannes mars',
];

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, MessageBubbleComponent],
  template: `
    <div class="chatbot-screen">

      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-header__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            <path d="M6 6 4.5 7.5"/>
            <path d="m18 18 1.5 1.5"/>
            <path d="M6 18 4.5 16.5"/>
            <path d="m18 6 1.5-1.5"/>
          </svg>
        </div>
        <div class="chatbot-header__info">
          <h2 class="chatbot-header__title">Assistant IA FleetTracker</h2>
          <span class="chatbot-header__sub">Powered by RAG · Données en temps réel</span>
        </div>
      </div>

      <!-- Conversation area -->
      <div class="chatbot-messages" #scrollContainer>
        @for (msg of messages(); track $index) {
          <app-message-bubble [message]="msg" />
        }
        @if (messages().length === 0) {
          <div class="chatbot-empty">Posez une question sur votre flotte…</div>
        }

        <!-- Typing / dotBounce indicator -->
        @if (isTyping()) {
          <div class="chatbot-typing">
            <div class="chatbot-typing__avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
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

      <!-- Suggestions chips -->
      <div class="chatbot-suggestions">
        @for (s of suggestions; track s) {
          <button class="chatbot-suggestions__chip" (click)="onSuggestion(s)">{{ s }}</button>
        }
      </div>

      <!-- Input row -->
      <div class="chatbot-input-row">
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
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes dotBounce {
      0%,80%,100% { transform: translateY(0); }
      40%          { transform: translateY(-8px); }
    }

    .chatbot-screen {
      display: flex;
      flex-direction: column;
      height: calc(100vh - var(--topbar-height, 72px));
      background: var(--color-surface-1, #f8f9fc);
      animation: screenEnter 300ms ease-out both;
    }

    /* ── Header ── */
    .chatbot-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      background: var(--color-surface, #fff);
      border-bottom: 1px solid var(--color-border, #e2e8f0);
      flex-shrink: 0;
    }
    .chatbot-header__icon {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--color-primary-soft, #eff6ff);
      border: 2px solid var(--color-primary, #2563eb);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .chatbot-header__title {
      font-family: 'Montserrat', sans-serif;
      font-size: 18px; font-weight: 700;
      color: var(--color-text, #0f172a);
      margin: 0;
    }
    .chatbot-header__sub {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted, #64748b);
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

    /* ── Suggestions ── */
    .chatbot-suggestions {
      padding: 0 32px 12px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      flex-shrink: 0;
    }
    .chatbot-suggestions::-webkit-scrollbar { display: none; }
    .chatbot-suggestions__chip {
      height: 34px;
      padding: 0 14px;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 999px;
      background: var(--color-surface, #fff);
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text, #0f172a);
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: border-color 150ms, color 150ms, background 150ms;
    }
    .chatbot-suggestions__chip:hover {
      border-color: var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
      background: var(--color-primary-soft, #eff6ff);
    }

    /* ── Input row ── */
    .chatbot-input-row {
      background: var(--color-surface, #fff);
      border-top: 1px solid var(--color-border, #e2e8f0);
      padding: 14px 32px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    }
    .chatbot-input-row__field {
      flex: 1;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      background: var(--color-surface, #fff);
      display: flex;
      align-items: center;
      padding: 0 16px;
      height: 48px;
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
      width: 48px; height: 48px;
      border-radius: var(--radius-md, 8px);
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
  private subscription: Subscription | null = null;

  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;

  messages = signal<ChatbotMessage[]>([]);
  streaming = signal(false);
  inputText = '';
  suggestions = SUGGESTIONS;

  constructor() {
    effect(() => {
      const msgs = this.messages(); // tracks this signal
      if (msgs.length) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  /** True while the last assistant message is still streaming (dotBounce shown). */
  isTyping(): boolean {
    const msgs = this.messages();
    if (msgs.length === 0) return false;
    const last = msgs[msgs.length - 1];
    return last.role === 'assistant' && (last.streaming === true);
  }

  private scrollToBottom(): void {
    this.bottomAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  onSuggestion(text: string): void {
    this.inputText = text;
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    event.preventDefault();
    this.onSend(this.inputText);
  }

  onSend(prompt: string): void {
    const trimmed = prompt.trim();
    if (!trimmed || this.streaming()) return;

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
        if (chunk.type === 'done') this.streaming.set(false);
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
