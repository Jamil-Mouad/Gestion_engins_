import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { ChatbotComponent } from './chatbot.component';
import { ChatbotService } from '../../core/chatbot/chatbot.service';
import { ChatbotChunk } from '../../shared/models/chatbot.model';

class MockChatbotServiceStub {
  sendMessage = jasmine.createSpy('sendMessage').and.returnValue(of());
  abort = jasmine.createSpy('abort');
}

describe('ChatbotComponent', () => {
  let mockService: MockChatbotServiceStub;

  beforeEach(() => {
    mockService = new MockChatbotServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ChatbotService, useValue: mockService },
      ],
    });
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('messages signal starts empty', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    expect(fixture.componentInstance.messages()).toEqual([]);
  });

  it('streaming signal starts false', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    expect(fixture.componentInstance.streaming()).toBe(false);
  });

  it('onSend() adds user message and triggers chatbot service', () => {
    const subject = new Subject<ChatbotChunk>();
    mockService.sendMessage.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('Bonjour');

    expect(mockService.sendMessage).toHaveBeenCalledWith('Bonjour', jasmine.any(Array));
    const msgs = component.messages();
    expect(msgs.length).toBe(2); // user + assistant placeholder
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('Bonjour');
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].streaming).toBe(true);
    expect(component.streaming()).toBe(true);

    subject.complete();
  });

  it('isTyping() shows only before the first token, not during/after streaming', () => {
    const subject = new Subject<ChatbotChunk>();
    mockService.sendMessage.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('Salut');

    // Streaming started, no token yet → thinking indicator.
    expect(component.isTyping()).toBe(true);

    // First token arrived → bubble (with cursor) represents progress, no dots.
    subject.next({ type: 'text', content: 'Bon' });
    expect(component.isTyping()).toBe(false);

    subject.next({ type: 'done' });
    subject.complete();
    expect(component.isTyping()).toBe(false);
  });

  it('onSend() does nothing when prompt is empty or whitespace', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('   ');
    expect(mockService.sendMessage).not.toHaveBeenCalled();
    expect(component.messages().length).toBe(0);
  });

  it('onSend() accumulates text chunks into assistant message', () => {
    const subject = new Subject<ChatbotChunk>();
    mockService.sendMessage.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('Test');

    subject.next({ type: 'text', content: 'Bonjour' });
    subject.next({ type: 'text', content: ' monde' });
    subject.next({ type: 'done' });
    subject.complete();

    const msgs = component.messages();
    expect(msgs[1].content).toBe('Bonjour monde');
    expect(msgs[1].streaming).toBe(false);
    expect(component.streaming()).toBe(false);
  });

  it('abort() stops streaming and appends "Réponse interrompue"', () => {
    const subject = new Subject<ChatbotChunk>();
    mockService.sendMessage.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('Analyse');

    subject.next({ type: 'text', content: 'En cours...' });
    component.abort();

    expect(mockService.abort).toHaveBeenCalled();
    expect(component.streaming()).toBe(false);
    const msgs = component.messages();
    expect(msgs[1].content).toContain('Réponse interrompue');
    expect(msgs[1].streaming).toBe(false);

    subject.complete();
  });

  it('handles error from sendMessage gracefully', () => {
    const { throwError } = require('rxjs');
    mockService.sendMessage.and.returnValue(throwError(() => new Error('network error')));

    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('Erreur');

    expect(component.streaming()).toBe(false);
    const msgs = component.messages();
    expect(msgs[1].content).toContain('Erreur de connexion');
  });

  it('isTyping() returns true when last message is streaming', () => {
    const subject = new Subject<ChatbotChunk>();
    mockService.sendMessage.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.onSend('Test');

    expect(component.isTyping()).toBe(true);

    subject.next({ type: 'done' });
    subject.complete();

    expect(component.isTyping()).toBe(false);
  });

  it('isTyping() returns false when messages is empty', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    expect(component.isTyping()).toBe(false);
  });

  it('ngOnDestroy() calls abort on the service', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    fixture.componentInstance.ngOnDestroy();
    expect(mockService.abort).toHaveBeenCalled();
  });

  it('onConversationDeleted() clears the view when the active conversation is deleted', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.activeConversationId.set(42);
    component.messages.set([{ role: 'user', content: 'hi', timestamp: '' }]);

    component.onConversationDeleted(42);

    expect(component.activeConversationId()).toBeNull();
    expect(component.messages()).toEqual([]);
  });

  it('onConversationDeleted() leaves the view intact when another conversation is deleted', () => {
    const fixture = TestBed.createComponent(ChatbotComponent);
    const component = fixture.componentInstance;
    component.activeConversationId.set(42);
    component.messages.set([{ role: 'user', content: 'hi', timestamp: '' }]);

    component.onConversationDeleted(7);

    expect(component.activeConversationId()).toBe(42);
    expect(component.messages().length).toBe(1);
  });
});
