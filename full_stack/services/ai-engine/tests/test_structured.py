"""Unit tests for the pure helpers in app.structured.

The DB-touching functions (lookup_vehicle, list_vehicles_by_type, list_drivers)
need a real PostgreSQL instance and are exercised indirectly through the
chat route in test_chat.py. The renderers, intent detector, and label
normalizer are pure and are tested here in isolation.
"""
from app import structured


# ────────────────────────── normalize_type_label ────────────────────────────

def test_normalize_type_label_accepts_db_enum_values():
    for label in ('camion', 'camion_tracteur', 'chariot', 'chargeur',
                  'semi_remorque', 'voiture', 'bus', 'balayeuse', 'pick_up'):
        assert structured.normalize_type_label(label) == label


def test_normalize_type_label_maps_hyphenated_french_forms():
    assert structured.normalize_type_label('camion-tracteur') == 'camion_tracteur'
    assert structured.normalize_type_label('semi-remorque')   == 'semi_remorque'
    assert structured.normalize_type_label('pick-up')         == 'pick_up'
    assert structured.normalize_type_label('Camion-Tracteur') == 'camion_tracteur'
    assert structured.normalize_type_label('CAMION-TRACTEUR') == 'camion_tracteur'


def test_normalize_type_label_accepts_synonyms():
    assert structured.normalize_type_label('tracteur')        == 'camion_tracteur'
    assert structured.normalize_type_label('camion tracteur') == 'camion_tracteur'
    assert structured.normalize_type_label('semi')            == 'semi_remorque'
    assert structured.normalize_type_label('pickup')          == 'pick_up'


def test_normalize_type_label_returns_none_for_unknown():
    assert structured.normalize_type_label('avion') is None
    assert structured.normalize_type_label('')     is None
    assert structured.normalize_type_label(None)   is None


def test_normalize_type_label_accepts_plurals():
    assert structured.normalize_type_label('camions')         == 'camion'
    assert structured.normalize_type_label('tracteurs')       == 'camion_tracteur'
    assert structured.normalize_type_label('semi-remorques')  == 'semi_remorque'
    assert structured.normalize_type_label('camions tracteurs') == 'camion_tracteur'
    assert structured.normalize_type_label('voitures')        == 'voiture'
    assert structured.normalize_type_label('chariots')        == 'chariot'
    assert structured.normalize_type_label('remorques')       == 'semi_remorque'
    assert structured.normalize_type_label('Camions')         == 'camion'


def test_normalize_type_label_plural_fallback_does_not_break_bus():
    # 'bus' ends with s but is a direct map hit — must not be singularized
    assert structured.normalize_type_label('bus') == 'bus'


# ────────────────────────── detect_vehicle_code ─────────────────────────────

def test_detect_vehicle_code_finds_cam_dash_number():
    assert structured.detect_vehicle_code('qui est le chauffeur du camion CAM-401 ?') == 'CAM-401'


def test_detect_vehicle_code_finds_cam_underscore():
    assert structured.detect_vehicle_code('infos sur CAM_403') == 'CAM-403'


def test_detect_vehicle_code_case_insensitive():
    assert structured.detect_vehicle_code('cam-403 details') == 'CAM-403'


def test_detect_vehicle_code_returns_none_when_absent():
    assert structured.detect_vehicle_code('bonjour') is None
    assert structured.detect_vehicle_code('')        is None
    assert structured.detect_vehicle_code(None)      is None


# ────────────────────────── _driver_text ────────────────────────────────────

def test_driver_text_includes_name_when_present():
    text = structured._driver_text({
        'chauffeur_prenom': 'Ahmed',
        'chauffeur_nom':    'Benali',
    })
    assert 'Ahmed' in text and 'Benali' in text


def test_driver_text_falls_back_to_canonical_message_when_missing():
    text = structured._driver_text({'chauffeur_prenom': None, 'chauffeur_nom': None})
    assert 'Chauffeur non renseigné dans la base' in text


def test_driver_text_falls_back_when_only_whitespace():
    text = structured._driver_text({'chauffeur_prenom': '  ', 'chauffeur_nom': ''})
    assert 'Chauffeur non renseigné dans la base' in text


# ────────────────────────── render_vehicle ──────────────────────────────────

def test_render_vehicle_includes_all_key_fields():
    v = {
        'id': 281, 'code': 'CAM-403', 'matricule': '4790-B-8',
        'type': 'camion_tracteur', 'marque': 'MAN', 'modele': 'TGS',
        'annee': 2018, 'carburant': 'gasoil', 'statut': 'in-service',
        'compteur_km': 882000, 'compteur_heures': 0,
        'chauffeur_prenom': 'Ahmed', 'chauffeur_nom': 'Benali',
        'capacite_tonnes': 19.0, 'config_axle': '6x4',
        'date_mise_service': '2018-06-12', 'n_interventions': 47,
    }
    text = structured.render_vehicle(v)
    assert 'CAM-403' in text
    assert 'MAN' in text and 'TGS' in text
    assert '882000' in text
    assert 'Chauffeur' in text and 'Ahmed' in text and 'Benali' in text
    assert '19.0' in text and '6x4' in text
    assert '47' in text
    assert len(text) <= 1500


def test_render_vehicle_uses_canonical_missing_driver_phrase():
    v = {
        'id': 401, 'code': 'CAM-401', 'matricule': 'XXXX',
        'type': 'camion', 'marque': 'Renault', 'modele': '',
        'annee': 2020, 'carburant': 'gasoil', 'statut': 'in-service',
        'compteur_km': 100, 'compteur_heures': 0,
        'chauffeur_prenom': None, 'chauffeur_nom': None,
        'capacite_tonnes': None, 'config_axle': None,
        'date_mise_service': None, 'n_interventions': 0,
    }
    text = structured.render_vehicle(v)
    assert 'Chauffeur non renseigné dans la base' in text


# ────────────────────────── render_vehicle_list ─────────────────────────────

def test_render_vehicle_list_empty_returns_helpful_message():
    text = structured.render_vehicle_list([], 'Véhicules de type chariot')
    assert 'aucun véhicule' in text


def test_render_vehicle_list_emits_one_line_per_vehicle():
    vehicles = [
        {'id': 281, 'code': 'CAM-403', 'matricule': '4790-B-8',
         'type': 'camion_tracteur', 'marque': 'MAN', 'modele': 'TGS',
         'statut': 'in-service', 'compteur_km': 882000,
         'n_interventions': 47},
        {'id': 314, 'code': 'CAM-480', 'matricule': '22299-A-73',
         'type': 'camion_tracteur', 'marque': 'VOLVO', 'modele': 'FH',
         'statut': 'in-service', 'compteur_km': 288544,
         'n_interventions': 42},
    ]
    text = structured.render_vehicle_list(vehicles, 'Camion-tracteur')
    assert 'CAM-403' in text and 'CAM-480' in text
    assert text.count('-') >= 2  # bullet for each vehicle
    assert '882000' in text and '288544' in text


def test_render_vehicle_list_keeps_all_codes_for_a_full_roster():
    # 20 vehicles ≈ 2600 chars — the old 1500-char cap truncated mid-list
    vehicles = [
        {'id': i, 'code': f'CAM-{400 + i}', 'matricule': f'{1000 + i}-A-8',
         'type': 'camion', 'marque': 'ISUZU', 'modele': 'NQR',
         'statut': 'in-service', 'compteur_km': 100000 + i,
         'n_interventions': i}
        for i in range(20)
    ]
    text = structured.render_vehicle_list(vehicles, 'Véhicules de type camion')
    for i in range(20):
        assert f'CAM-{400 + i}' in text


# ────────────────────────── render_driver_roster ────────────────────────────

def test_render_driver_roster_empty():
    text = structured.render_driver_roster([], 'Chauffeurs')
    assert 'aucun chauffeur' in text


def test_render_driver_roster_one_line_per_driver():
    drivers = [
        {'chauffeur_prenom': 'Ahmed', 'chauffeur_nom': 'Benali', 'n_vehicules': 1},
        {'chauffeur_prenom': 'Karim', 'chauffeur_nom': 'Idrissi', 'n_vehicules': 2},
    ]
    text = structured.render_driver_roster(drivers, 'Chauffeurs')
    assert 'Ahmed Benali' in text
    assert 'Karim Idrissi' in text
    assert '2 véhicule' in text


# ────────────────────────── detect_intent ───────────────────────────────────

def test_detect_intent_vehicle_code_takes_priority():
    intent = structured.detect_intent('qui est le chauffeur du camion CAM-401 ?')
    assert intent['kind'] == 'driver_for_vehicle'
    assert intent['value'] == 'CAM-401'


def test_detect_intent_vehicle_code_alone():
    intent = structured.detect_intent('infos sur CAM-403')
    assert intent['kind'] == 'vehicle_code'
    assert intent['value'] == 'CAM-403'


def test_detect_intent_code_wins_over_detail_keyword():
    intent = structured.detect_intent('donne moi des infos plus detailler sur CAM-403')
    assert intent['kind'] == 'vehicle_code'
    assert intent['value'] == 'CAM-403'


def test_detect_intent_type_label_after_keyword():
    intent = structured.detect_intent('donne moi les infos sur les vehicules de type Camion-tracteur')
    assert intent['kind'] == 'type_list'
    assert intent['value'].lower().startswith('camion-tracteur')


def test_detect_intent_liste_with_type_label_falls_through():
    intent = structured.detect_intent('liste moi les vehicules de type pick-up')
    assert intent['kind'] == 'type_list'
    assert structured.normalize_type_label(intent['value']) == 'pick_up'


def test_detect_intent_driver_roster_when_no_code():
    intent = structured.detect_intent('qui sont les chauffeurs du parc ?')
    assert intent['kind'] == 'driver_roster'


def test_detect_intent_none_for_greeting():
    assert structured.detect_intent('bonjour')['kind'] == 'none'
    assert structured.detect_intent('')['kind']     == 'none'
    assert structured.detect_intent(None)['kind']   == 'none'


def test_detect_intent_plural_type_with_code_keyword():
    intent = structured.detect_intent('donne moi le code des 7 camions')
    assert intent['kind'] == 'type_list'
    assert structured.normalize_type_label(intent['value']) == 'camion'


def test_detect_intent_plural_type_with_detail_keyword():
    intent = structured.detect_intent('donne moi les infos des 7 camions')
    assert intent['kind'] == 'type_list'
    assert structured.normalize_type_label(intent['value']) == 'camion'


def test_detect_intent_fleet_list_for_codes_without_type():
    intent = structured.detect_intent('donne moi les codes des vehicules')
    assert intent['kind'] == 'fleet_list'


def test_detect_intent_fleet_list_for_parc_listing():
    intent = structured.detect_intent('liste tous les véhicules du parc')
    assert intent['kind'] == 'fleet_list'


def test_detect_intent_driver_roster_wins_over_fleet_list():
    intent = structured.detect_intent('donne moi la liste des chauffeurs du parc')
    assert intent['kind'] == 'driver_roster'


# ────────────────────────── run_intent (pure branches) ──────────────────────

def test_run_intent_returns_unknown_label_message_for_bad_type():
    text, sources = structured.run_intent('donne moi les vehicules de type avion')
    assert 'Type de véhicule inconnu' in text
    assert sources == []


def test_run_intent_returns_empty_for_unmatched_greeting():
    text, sources = structured.run_intent('bonjour')
    assert text == ''
    assert sources == []
