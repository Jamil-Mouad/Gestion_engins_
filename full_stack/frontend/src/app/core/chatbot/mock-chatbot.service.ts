import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { ChatbotService } from './chatbot.service';
import { ChatbotChunk, ChatbotMessage } from '../../shared/models/chatbot.model';

const SCENARIO_MAINTENANCE: ChatbotChunk[] = [
  { type: 'text', content: 'La prochaine vidange du véhicule ' },
  { type: 'text', content: 'CAM-001 est prévue dans ' },
  { type: 'text', content: '120 heures moteur, ' },
  { type: 'text', content: 'soit approximativement le 15 juin 2026.' },
  { type: 'text', content: ' Je vous recommande de planifier ' },
  { type: 'text', content: "un arrêt préventif avant cette échéance." },
  { type: 'source', source: { title: 'Suivi Vidanges CAM-001', url: '/vehicules/1' } },
  { type: 'source', source: { title: 'Historique interventions', url: '/interventions?vehicule=1' } },
  { type: 'done' },
];

const SCENARIO_PNEUS: ChatbotChunk[] = [
  { type: 'text', content: 'Sur les 24 camions en service, ' },
  { type: 'text', content: '3 pneus sont en état ' },
  { type: 'text', content: '« warn » et 1 est en état « empty ».' },
  { type: 'text', content: ' Le pneu #47 du CAM-008 (position 4)' },
  { type: 'text', content: ' a un kilométrage restant estimé à 0 km.' },
  { type: 'text', content: ' Un remplacement immédiat est recommandé.' },
  { type: 'source', source: { title: 'Fiche pneu #47', url: '/pneus/47' } },
  { type: 'done' },
];

const SCENARIO_GENERIC: ChatbotChunk[] = [
  { type: 'text', content: "Je n'ai pas trouvé de donnée spécifique " },
  { type: 'text', content: 'correspondant à votre demande.' },
  { type: 'text', content: ' Essayez de préciser le numéro de véhicule ' },
  { type: 'text', content: 'ou la période concernée.' },
  { type: 'done' },
];

export const CANNED_SCENARIOS: ChatbotChunk[][] = [
  SCENARIO_MAINTENANCE,
  SCENARIO_PNEUS,
  SCENARIO_GENERIC,
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

@Injectable()
export class MockChatbotService extends ChatbotService {
  private abortController: AbortController | null = null;

  override sendMessage(prompt: string, history: ChatbotMessage[]): Observable<ChatbotChunk> {
    this.abortController = new AbortController();
    const scenario = CANNED_SCENARIOS[Math.abs(hashCode(prompt)) % CANNED_SCENARIOS.length];

    return new Observable<ChatbotChunk>((subscriber) => {
      let index = 0;
      const interval = setInterval(() => {
        if (this.abortController?.signal.aborted) {
          clearInterval(interval);
          if (!subscriber.closed) {
            subscriber.next({ type: 'done' });
            subscriber.complete();
          }
          return;
        }
        if (index >= scenario.length) {
          clearInterval(interval);
          if (!subscriber.closed) {
            subscriber.complete();
          }
          return;
        }
        subscriber.next(scenario[index++]);
      }, 30);

      return () => clearInterval(interval);
    });
  }

  override abort(): void {
    this.abortController?.abort();
  }
}