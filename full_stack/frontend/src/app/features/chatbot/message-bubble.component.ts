import { Component, Input } from '@angular/core';
import { ChatbotMessage } from '../../shared/models/chatbot.model';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [],
  template: `
    <div class="bubble-row" [class.bubble-row--user]="message.role === 'user'">

      <!-- Avatar -->
      <div class="bubble-avatar" [class.bubble-avatar--user]="message.role === 'user'">
        @if (message.role === 'assistant') {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="var(--color-primary)" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
        } @else {
          <span class="bubble-avatar__initials">KB</span>
        }
      </div>

      <!-- Bubble content -->
      <div class="bubble-content">
        <div class="bubble"
             [class.bubble--user]="message.role === 'user'"
             [class.bubble--assistant]="message.role === 'assistant'">
          <p class="bubble__text">{{ message.content }}</p>
          @if (message.streaming) {
            <span class="bubble__cursor"></span>
          }
        </div>

        <!-- Sources chips -->
        @if (sources.length > 0) {
          <div class="bubble-sources">
            <div class="bubble-sources__label">Sources ({{ sources.length }})</div>
            <div class="bubble-sources__chips">
              @for (src of sources; track src.url) {
                <a [href]="src.url" target="_blank" class="bubble-sources__chip">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  {{ src.title }}
                </a>
              }
            </div>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .bubble-row {
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: flex-start;
      animation: fadeIn 200ms ease-out both;
    }
    .bubble-row--user {
      flex-direction: row-reverse;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Avatar */
    .bubble-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: var(--color-primary-soft, #eff6ff);
      border: 2px solid var(--color-primary, #2563eb);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .bubble-avatar--user {
      background: var(--color-text, #0f172a);
      border-color: var(--color-text-muted, #64748b);
    }
    .bubble-avatar__initials {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px; font-weight: 700;
      color: #fff;
    }

    /* Bubble content wrapper */
    .bubble-content {
      max-width: 640px;
    }

    /* Bubble */
    .bubble {
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .bubble--user {
      background: var(--color-text, #0f172a);
      border: 1px solid var(--color-text-muted, #64748b);
      border-radius: 12px 4px 12px 12px;
    }
    .bubble--assistant {
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 4px 12px 12px 12px;
    }
    .bubble__text {
      font-family: 'Open Sans', sans-serif;
      font-size: 14px; line-height: 1.7;
      margin: 0;
      white-space: pre-line;
    }
    .bubble--user .bubble__text {
      color: #fff;
    }
    .bubble--assistant .bubble__text {
      color: var(--color-text, #0f172a);
    }

    /* Streaming cursor */
    .bubble__cursor {
      display: inline-block;
      width: 8px; height: 8px;
      background: var(--color-text-muted, #64748b);
      border-radius: 50%;
      animation: blink 1s infinite;
      margin-left: 4px;
      vertical-align: middle;
    }
    @keyframes blink {
      0%, 50%  { opacity: 1; }
      51%,100% { opacity: 0; }
    }

    /* Sources */
    .bubble-sources {
      margin-top: 8px;
      background: var(--color-surface-1, #f8f9fc);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      padding: 10px 14px;
    }
    .bubble-sources__label {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px; font-weight: 600;
      color: var(--color-text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .bubble-sources__chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .bubble-sources__chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 999px;
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      color: var(--color-text, #0f172a);
      background: var(--color-surface, #fff);
      text-decoration: none;
      cursor: pointer;
      transition: border-color 150ms, color 150ms;
    }
    .bubble-sources__chip:hover {
      border-color: var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
    }
  `],
})
export class MessageBubbleComponent {
  @Input() message!: ChatbotMessage;

  get sources(): { title: string; url: string }[] {
    return (this.message.sources ?? []).filter((s): s is { title: string; url: string } => s != null);
  }
}
