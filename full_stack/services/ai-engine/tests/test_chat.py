def test_chat_rejects_empty_message(client):
    resp = client.post('/ai/chat',
        json={'message': '', 'conversation_id': None},
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 400


def test_chat_rejects_message_over_2000_chars(client):
    resp = client.post('/ai/chat',
        json={'message': 'x' * 2001, 'conversation_id': None},
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 400


def test_chat_requires_auth_header(client):
    resp = client.post('/ai/chat', json={'message': 'test'})
    assert resp.status_code == 401


def test_chat_includes_structured_context_for_vehicle_code(monkeypatch, client):
    """When the message mentions a vehicle code, the system prompt sent to
    the LLM must contain a 'Données structurées (DB)' block built from the
    real vehicules row, not the bare fleet_summary / vector passages."""
    captured = {}

    # Stub the embedding search so we don't pay the 350MB model-load cost
    # and don't depend on the ai_embeddings index being populated.
    from app import embeddings as emb
    monkeypatch.setattr(emb, 'search_similar', lambda message, k=None: [])
    monkeypatch.setattr(emb, 'get_fleet_summary', lambda: None)

    class _FakeChoice:
        def __init__(self, content):
            self.delta = type('D', (), {'content': content})()

    class _FakeChunk:
        def __init__(self, content):
            self.choices = [_FakeChoice(content)]

    class _FakeStream:
        def __iter__(self):
            yield _FakeChunk('Bonjour')
            yield _FakeChunk('.')

    class _FakeCompletions:
        def create(self, **kwargs):
            captured['messages'] = kwargs.get('messages') or []
            return _FakeStream()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        def __init__(self, **kwargs):
            self.chat = _FakeChat()

    import openai
    monkeypatch.setattr(openai, 'OpenAI', _FakeClient)

    resp = client.post('/ai/chat',
        json={'message': 'donne moi des infos plus detailler sur CAM-403',
              'conversation_id': None},
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 200
    # consume the SSE stream so the generator runs to completion
    list(resp.response)

    messages = captured.get('messages') or []
    assert messages, 'LLM was not called'
    system = messages[0]['content']
    assert '== Données structurées (DB) ==' in system, (
        f'system prompt is missing the structured-DB block:\n{system}')
    # The rendered vehicle record should mention the code and the canonical
    # driver-missing phrase (CAM-403 / 4790-B-8 row is in seed data).
    assert 'CAM-403' in system


def test_chat_includes_fleet_summary_for_greeting(monkeypatch, client):
    """The 'hi' greeting should still inject the fleet_summary context."""
    captured = {}

    from app import embeddings as emb
    monkeypatch.setattr(emb, 'search_similar', lambda message, k=None: [])
    monkeypatch.setattr(emb, 'get_fleet_summary', lambda: '42 véhicules au total.')

    class _FakeChoice:
        def __init__(self, content):
            self.delta = type('D', (), {'content': content})()

    class _FakeChunk:
        def __init__(self, content):
            self.choices = [_FakeChoice(content)]

    class _FakeStream:
        def __iter__(self):
            yield _FakeChunk('Bonjour')

    class _FakeCompletions:
        def create(self, **kwargs):
            captured['messages'] = kwargs.get('messages') or []
            return _FakeStream()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        def __init__(self, **kwargs):
            self.chat = _FakeChat()

    import openai
    monkeypatch.setattr(openai, 'OpenAI', _FakeClient)

    resp = client.post('/ai/chat',
        json={'message': 'hi', 'conversation_id': None},
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 200
    list(resp.response)
    messages = captured.get('messages') or []
    system = messages[0]['content']
    # fleet_summary is always injected; structured layer is empty for a
    # greeting so its data block must not appear.
    assert 'Statistiques du parc' in system
    assert '42 véhicules' in system
    assert '== Données structurées (DB) ==' not in system
