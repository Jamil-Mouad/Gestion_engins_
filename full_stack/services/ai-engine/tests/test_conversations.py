def test_list_requires_auth(client):
    resp = client.get('/ai/conversations')
    assert resp.status_code == 401


def test_list_returns_empty_for_new_user(client):
    resp = client.get('/ai/conversations',
        headers={'X-Authenticated-User-Id': '999'})
    assert resp.status_code == 200
    assert resp.get_json() == []


def test_create_conversation(client):
    resp = client.post('/ai/conversations',
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 201
    data = resp.get_json()
    assert 'id' in data
    assert data['titre'] == 'Nouvelle conversation'


def test_pin_conversation(client):
    create_resp = client.post('/ai/conversations',
        headers={'X-Authenticated-User-Id': '1'})
    conv_id = create_resp.get_json()['id']
    resp = client.patch(f'/ai/conversations/{conv_id}/pin',
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['id'] == conv_id
    assert data['favori'] is True


def test_delete_conversation(client):
    create_resp = client.post('/ai/conversations',
        headers={'X-Authenticated-User-Id': '1'})
    conv_id = create_resp.get_json()['id']

    resp = client.delete(f'/ai/conversations/{conv_id}',
        headers={'X-Authenticated-User-Id': '1'})
    assert resp.status_code == 204

    # Subsequent access returns 404 (row is gone).
    follow = client.get(f'/ai/conversations/{conv_id}/messages',
        headers={'X-Authenticated-User-Id': '1'})
    assert follow.status_code == 404


def test_delete_conversation_of_other_user_returns_404(client):
    create_resp = client.post('/ai/conversations',
        headers={'X-Authenticated-User-Id': '1'})
    conv_id = create_resp.get_json()['id']

    resp = client.delete(f'/ai/conversations/{conv_id}',
        headers={'X-Authenticated-User-Id': '2'})
    assert resp.status_code == 404


def test_delete_requires_auth(client):
    resp = client.delete('/ai/conversations/1')
    assert resp.status_code == 401
