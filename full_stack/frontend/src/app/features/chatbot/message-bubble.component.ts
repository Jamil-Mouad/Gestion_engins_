import { Component, Input } from '@angular/core';
import DOMPurify from 'dompurify';
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="9" width="16" height="10" rx="2"/>
            <path d="M12 9V6"/><circle cx="12" cy="4.5" r="1.2"/>
            <path d="M9 14h.01M15 14h.01"/>
            <path d="M4 13H2.5M21.5 13H20"/>
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
          <div class="bubble__text" [innerHTML]="renderedContent"></div>
          @if (message.streaming) {
            <span class="bubble__cursor"></span>
          }
        </div>
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
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* Avatar */
    .bubble-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: var(--color-primary-soft, #eff6ff);
      border: 2px solid var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
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
      word-break: break-word;
    }
    .bubble__text ul {
      margin: 6px 0;
      padding-left: 20px;
    }
    .bubble__text li { margin: 2px 0; }
    .bubble__text strong { font-weight: 700; }
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

  `],
})
export class MessageBubbleComponent {
  @Input() message!: ChatbotMessage;

  /**
   * Render the small markdown subset the assistant emits (bold, italic, bullet
   * lists, line breaks). HTML is escaped first, then DOMPurify strips everything
   * outside the allowlisted tag set before the result reaches [innerHTML].
   */
  get renderedContent(): string {
    const html = MessageBubbleComponent.renderMarkdown(this.message.content ?? '');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['strong', 'em', 'ul', 'li', 'br'],
      ALLOWED_ATTR: [],
    });
  }

  static renderMarkdown(raw: string): string {
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const html: string[] = [];
    let inList = false;
    const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };

    for (const line of lines) {
      const bullet = line.match(/^\s*[*-]\s+(.*)$/);
      if (bullet) {
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push('<li>' + MessageBubbleComponent.inline(bullet[1]) + '</li>');
      } else if (line.trim() === '') {
        closeList();
      } else {
        closeList();
        html.push(MessageBubbleComponent.inline(line) + '<br>');
      }
    }
    closeList();
    // Drop a trailing <br> so bubbles don't end with extra whitespace.
    return html.join('').replace(/(<br>)+$/, '');
  }

  /** Inline transforms: **bold** then *italic* / _italic_. */
  private static inline(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, '<em>$1</em>')
      .replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, '<em>$1</em>');
  }
}
