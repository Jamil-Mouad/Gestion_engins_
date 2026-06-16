def test_health_returns_200(client):
    resp = client.get('/ai/health')
    assert resp.status_code == 200


def test_health_has_required_fields(client):
    data = client.get('/ai/health').get_json()
    assert 'status' in data
    assert 'ollama' in data
    assert 'pgvector' in data


def test_health_status_is_valid_enum(client):
    data = client.get('/ai/health').get_json()
    assert data['status'] in ('healthy', 'unhealthy')
