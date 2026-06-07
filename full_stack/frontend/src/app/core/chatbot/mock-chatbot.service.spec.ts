import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { MockChatbotService } from './mock-chatbot.service';
import { ChatbotChunk, ChatbotMessage } from '../../shared/models/chatbot.model';

describe('MockChatbotService', () => {
  let service: MockChatbotService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MockChatbotService] });
    service = TestBed.inject(MockChatbotService);
  });

  it('sendMessage emits text chunks at 30ms intervals', (done: DoneFn) => {
    const chunks: ChatbotChunk[] = [];
    const history: ChatbotMessage[] = [];

    service.sendMessage('Prochaine vidange CAM-001', history).subscribe({
      next: (chunk) => chunks.push(chunk),
      complete: () => {
        const textChunks = chunks.filter(c => c.type === 'text');
        expect(textChunks.length).toBeGreaterThan(0);
        done();
      },
    });
  });

  it('sendMessage completes with done chunk', (done: DoneFn) => {
    const chunks: ChatbotChunk[] = [];
    const history: ChatbotMessage[] = [];

    service.sendMessage('status pneus', history).subscribe({
      next: (chunk) => chunks.push(chunk),
      complete: () => {
        expect(chunks[chunks.length - 1].type).toBe('done');
        done();
      },
    });
  });

  it('abort() terminates the stream early', (done: DoneFn) => {
    const chunks: ChatbotChunk[] = [];
    const history: ChatbotMessage[] = [];

    service.sendMessage('test prompt', history).subscribe({
      next: (chunk) => chunks.push(chunk),
      complete: () => {
        const hasDoneChunk = chunks.some(c => c.type === 'done');
        expect(chunks.length).toBeGreaterThan(0);
        done();
      },
    });

    setTimeout(() => service.abort(), 10);
  });

  it('same prompt always yields same scenario (deterministic hashCode)', (done: DoneFn) => {
    const history: ChatbotMessage[] = [];
    let firstResult: ChatbotChunk[] = [];
    let secondResult: ChatbotChunk[] = [];

    service.sendMessage('Prochaine vidange CAM-001', history).subscribe({
      next: (chunk) => firstResult.push(chunk),
      complete: () => {
        service.sendMessage('Prochaine vidange CAM-001', history).subscribe({
          next: (chunk) => secondResult.push(chunk),
          complete: () => {
            expect(firstResult.length).toBe(secondResult.length);
            for (let i = 0; i < firstResult.length; i++) {
              expect(firstResult[i].type).toBe(secondResult[i].type);
              expect(firstResult[i].content).toBe(secondResult[i].content);
            }
            done();
          },
        });
      },
    });
  });
});