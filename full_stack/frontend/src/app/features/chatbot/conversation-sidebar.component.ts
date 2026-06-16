import { Component, inject, signal, output, OnInit } from '@angular/core';
import { Conversation } from '../../shared/models/chatbot.model';
import { ConversationService } from './conversation.service';

@Component({
  selector: 'app-conversation-sidebar',
  standalone: true,
  imports: [],
  template: `
    <div class="sidebar" [class.sidebar--closed]="!open()">
      <div class="sidebar__topbar">
        <button class="sidebar__toggle" (click)="toggleOpen()" title="Historique des conversations">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
      @if (open()) {
        <button class="sidebar__new" (click)="onNew()">+ Nouvelle conversation</button>
        <div class="sidebar__list">
          @if (favoris().length > 0) {
            <div class="sidebar__section-label">Favoris</div>
            @for (conv of favoris(); track conv.id) {
              <div class="sidebar__entry" (click)="conversationSelected.emit(conv.id)">
                <span class="sidebar__title">{{ truncate(conv.titre) }}</span>
                <button class="sidebar__pin sidebar__pin--active" title="Retirer des favoris" (click)="onPin($event, conv.id)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <button class="sidebar__delete" title="Supprimer la conversation" (click)="onDelete($event, conv.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            }
          }
          <div class="sidebar__section-label">Récents</div>
          @if (recents().length === 0 && favoris().length === 0) {
            <div class="sidebar__empty">Aucune conversation — commencez par envoyer un message</div>
          }
          @for (conv of recents(); track conv.id) {
            <div class="sidebar__entry" (click)="conversationSelected.emit(conv.id)">
              <span class="sidebar__title">{{ truncate(conv.titre) }}</span>
              <button class="sidebar__pin" title="Ajouter aux favoris" (click)="onPin($event, conv.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button class="sidebar__delete" title="Supprimer la conversation" (click)="onDelete($event, conv.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* Host defaults to display:inline, which would not stretch to the flex
       layout height — making .sidebar grow to its content and scroll the whole
       page. display:contents lets .sidebar be the direct flex child (like the
       sibling .chatbot-screen div) so it stretches and the list scrolls. */
    :host { display: contents; }
    .sidebar {
      width: 260px; flex-shrink: 0;
      min-height: 0;
      background: var(--color-surface, #fff);
      border-right: 1px solid var(--color-border, #e2e8f0);
      display: flex; flex-direction: column;
      transition: width 200ms ease;
    }
    .sidebar--closed {
      width: 48px;
    }
    .sidebar__topbar {
      padding: 8px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .sidebar__toggle {
      width: 32px; height: 32px;
      background: var(--color-surface-1, #f8f9fc);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: var(--color-text-muted, #64748b);
      flex-shrink: 0;
      transition: background 150ms, color 150ms;
    }
    .sidebar__toggle:hover {
      background: var(--color-border, #e2e8f0);
      color: var(--color-text, #0f172a);
    }
    .sidebar__new {
      margin: 0 12px 8px; padding: 8px 12px;
      background: var(--color-primary-soft, #eff6ff);
      border: 1px solid var(--color-primary, #2563eb);
      border-radius: 6px; color: var(--color-primary, #2563eb);
      font-family: 'Open Sans', sans-serif; font-size: 13px; cursor: pointer;
      flex-shrink: 0;
    }
    .sidebar__list {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding-bottom: 8px;
    }
    .sidebar__list::-webkit-scrollbar { width: 6px; }
    .sidebar__list::-webkit-scrollbar-thumb {
      background: var(--color-border, #e2e8f0);
      border-radius: 3px;
    }
    .sidebar__section-label {
      padding: 8px 12px 4px; font-family: 'Open Sans', sans-serif;
      font-size: 11px; font-weight: 600; color: var(--color-text-muted, #64748b);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .sidebar__entry {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 12px; cursor: pointer; border-radius: 6px; margin: 0 4px;
    }
    .sidebar__entry:hover { background: var(--color-surface-1, #f8f9fc); }
    .sidebar__title {
      font-family: 'Open Sans', sans-serif; font-size: 13px;
      color: var(--color-text, #0f172a);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
    }
    .sidebar__pin {
      background: none; border: none; cursor: pointer;
      color: var(--color-text-muted, #64748b); font-size: 14px;
      flex-shrink: 0; padding: 0 4px;
    }
    .sidebar__pin--active { color: #f59e0b; }
    .sidebar__delete {
      background: none; border: none; cursor: pointer;
      color: var(--color-text-muted, #64748b);
      flex-shrink: 0; padding: 0 4px;
      display: flex; align-items: center;
      transition: color 150ms;
    }
    .sidebar__delete:hover { color: #ef4444; }
    .sidebar__empty {
      padding: 12px; font-family: 'Open Sans', sans-serif;
      font-size: 12px; color: var(--color-text-muted, #64748b);
    }
  `],
})
export class ConversationSidebarComponent implements OnInit {
  private convService = inject(ConversationService);

  open = signal<boolean>(localStorage.getItem('chatbot_sidebar_open') !== 'false');
  conversationSelected = output<number | null>();
  conversationDeleted = output<number>();
  favoris = signal<Conversation[]>([]);
  recents = signal<Conversation[]>([]);

  ngOnInit(): void { this.loadConversations(); }

  loadConversations(): void {
    this.convService.list().subscribe((list) => {
      this.favoris.set(list.filter(c => c.favori));
      this.recents.set(list.filter(c => !c.favori));
    });
  }

  toggleOpen(): void {
    this.open.update(v => !v);
    localStorage.setItem('chatbot_sidebar_open', String(this.open()));
  }

  onNew(): void {
    // Lazy creation: don't register a conversation until the first prompt is
    // sent. Just reset the active view; the chat endpoint creates the row and
    // returns its id, after which the sidebar is refreshed.
    this.conversationSelected.emit(null);
  }

  onPin(event: Event, id: number): void {
    event.stopPropagation();
    this.convService.togglePin(id).subscribe(() => this.loadConversations());
  }

  onDelete(event: Event, id: number): void {
    event.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    this.convService.delete(id).subscribe(() => {
      this.loadConversations();
      this.conversationDeleted.emit(id);
    });
  }

  truncate(text: string): string {
    return text.length > 40 ? text.slice(0, 40) + '…' : text;
  }
}
