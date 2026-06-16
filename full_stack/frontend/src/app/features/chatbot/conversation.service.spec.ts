import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConversationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConversationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() calls GET /api/ai/conversations', () => {
    service.list().subscribe();
    httpMock.expectOne('/api/ai/conversations').flush([]);
  });

  it('create() calls POST /api/ai/conversations', () => {
    service.create().subscribe();
    httpMock
      .expectOne(r => r.method === 'POST' && r.url === '/api/ai/conversations')
      .flush({ id: 1, titre: 'Nouvelle conversation' });
  });

  it('togglePin(1) calls PATCH /api/ai/conversations/1/pin', () => {
    service.togglePin(1).subscribe();
    httpMock
      .expectOne(r => r.method === 'PATCH' && r.url === '/api/ai/conversations/1/pin')
      .flush({ id: 1, favori: true });
  });

  it('delete(1) calls DELETE /api/ai/conversations/1', () => {
    service.delete(1).subscribe();
    httpMock
      .expectOne(r => r.method === 'DELETE' && r.url === '/api/ai/conversations/1')
      .flush(null);
  });
});
