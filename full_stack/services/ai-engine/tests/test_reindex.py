def test_reindex_requires_auth(client):
    resp = client.post('/ai/embeddings/reindex')
    assert resp.status_code == 401


def test_reindex_requires_fleet_manager_role(client):
    resp = client.post('/ai/embeddings/reindex',
        headers={'X-Authenticated-User-Id': '1',
                 'X-Authenticated-User-Roles': 'ROLE_USER'})
    assert resp.status_code == 403


def test_reindex_returns_202_for_fleet_manager(client):
    resp = client.post('/ai/embeddings/reindex',
        headers={'X-Authenticated-User-Id': '1',
                 'X-Authenticated-User-Roles': 'ROLE_FLEET_MANAGER'})
    assert resp.status_code == 202
    data = resp.get_json()
    assert data['status'] in ('reindex_started', 'already_running')


def test_format_fleet_summary_includes_total_and_breakdowns():
    from app.routes.reindex import _format_fleet_summary
    text = _format_fleet_summary(
        total=42,
        by_type=[('camion', 15), ('chariot', 8)],
        by_statut=[('in-service', 30), ('workshop', 5)],
        n_interv=1071, n_comp=320, n_pneus=88)
    assert '42 véhicules au total' in text
    assert '15 camion' in text and '8 chariot' in text
    assert '30 in-service' in text and '5 workshop' in text
    assert '1071 interventions' in text
    assert len(text) <= 1000


def test_format_fleet_summary_handles_empty_fleet():
    from app.routes.reindex import _format_fleet_summary
    text = _format_fleet_summary(0, [], [], 0, 0, 0)
    assert '0 véhicules au total' in text
    assert 'aucun' in text


def test_format_fleet_summary_includes_code_rosters_per_type():
    from app.routes.reindex import _format_fleet_summary
    text = _format_fleet_summary(
        total=9,
        by_type=[('camion', 7), ('camion_tracteur', 1), ('semi_remorque', 1)],
        by_statut=[('in-service', 9)],
        n_interv=10, n_comp=5, n_pneus=12,
        code_rosters=[
            ('camion', 'CAM-401, CAM-402, CAM-403, CAM-404, CAM-405, CAM-406, CAM-407'),
            ('camion_tracteur', 'CAM-438'),
            ('semi_remorque', 'SMR-438'),
        ])
    assert 'Codes des véhicules par type' in text
    assert 'CAM-401' in text and 'CAM-407' in text
    assert 'SMR-438' in text


def test_format_fleet_summary_without_rosters_omits_codes_section():
    from app.routes.reindex import _format_fleet_summary
    text = _format_fleet_summary(3, [('camion', 3)], [('in-service', 3)], 0, 0, 0)
    assert 'Codes des véhicules' not in text


def test_source_url_routes_vehicules_to_detail_page():
    from app.routes.chat import _source_url
    assert _source_url('vehicules', 7) == '/vehicules/7'
