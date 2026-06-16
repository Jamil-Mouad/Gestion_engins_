import { TestBed } from '@angular/core/testing';

import { MessageBubbleComponent } from './message-bubble.component';
import { ChatbotMessage } from '../../shared/models/chatbot.model';

describe('MessageBubbleComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MessageBubbleComponent] });
  });

  function render(message: ChatbotMessage): HTMLElement {
    const fixture = TestBed.createComponent(MessageBubbleComponent);
    fixture.componentInstance.message = message;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  describe('renderMarkdown()', () => {
    it('converts **bold** to <strong>', () => {
      expect(MessageBubbleComponent.renderMarkdown('Voici **Intervention #22** ok'))
        .toContain('<strong>Intervention #22</strong>');
    });

    it('converts *italic* and _italic_ to <em>', () => {
      expect(MessageBubbleComponent.renderMarkdown('un *mot* ici')).toContain('<em>mot</em>');
      expect(MessageBubbleComponent.renderMarkdown('un _mot_ ici')).toContain('<em>mot</em>');
    });

    it('wraps bullet lines in a <ul><li> list', () => {
      const html = MessageBubbleComponent.renderMarkdown('* a\n* b');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>a</li>');
      expect(html).toContain('<li>b</li>');
      expect(html).toContain('</ul>');
    });

    it('escapes HTML so model output cannot inject markup', () => {
      const html = MessageBubbleComponent.renderMarkdown('<script>alert(1)</script>');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('renders non-bullet newlines as <br> without a trailing break', () => {
      const html = MessageBubbleComponent.renderMarkdown('ligne 1\nligne 2');
      expect(html).toContain('ligne 1<br>ligne 2');
      expect(html.endsWith('<br>')).toBe(false);
    });
  });

  it('renders the assistant content as HTML (markdown applied)', () => {
    const el = render({
      role: 'assistant',
      content: 'Les **changements** :\n* pneu #22',
      timestamp: new Date().toISOString(),
    });
    const text = el.querySelector('.bubble__text')!;
    expect(text.querySelector('strong')?.textContent).toBe('changements');
    expect(text.querySelector('ul li')?.textContent).toContain('pneu #22');
  });

  it('no longer renders a Sources section', () => {
    const el = render({
      role: 'assistant',
      content: 'Bonjour',
      timestamp: new Date().toISOString(),
      sources: [{ title: 'Interventions #43', url: '/interventions/43' }],
    });
    expect(el.querySelector('.bubble-sources')).toBeNull();
  });
});
