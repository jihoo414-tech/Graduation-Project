from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi.testclient import TestClient
from jsonschema import validate

from app.main import app

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]
SHARED_DOCS = REPO_ROOT / 'shared-docs'
VALID_JSON_INPUT = json.loads(
    (SHARED_DOCS / 'sample-data' / 'patient-example.json').read_text(encoding='utf-8')
)
VALID_CSV = (
    SHARED_DOCS / 'sample-data' / 'patient-example.csv'
).read_text(encoding='utf-8').strip()
PATIENT_INPUT_SCHEMA = json.loads(
    (SHARED_DOCS / 'schemas' / 'patient-input.schema.json').read_text(encoding='utf-8')
)
RESULT_ENVELOPE_SCHEMA = json.loads(
    (SHARED_DOCS / 'schemas' / 'result-envelope-v1.schema.json').read_text(encoding='utf-8')
)
EXPECTED_NORMALIZED_INPUT = {
    'deidentified_patient_id': 'P-001',
    'gene_variants': [
        {'gene': 'TP53', 'variant_classification': 'Missense_Mutation'},
        {'gene': 'EGFR', 'variant_classification': 'L858R'},
    ],
    'clinical': {'age': 67, 'pathologic_stage': 'IIA', 'gender': 'female'},
}


def _upload(name: str, content: str, content_type: str = 'text/plain'):
    return client.post(
        '/api/v1/inference/upload',
        files={'file': (name, io.BytesIO(content.encode('utf-8')), content_type)},
    )


def _assert_matches_result_envelope(body: dict) -> None:
    validate(instance=body, schema=RESULT_ENVELOPE_SCHEMA)


def test_health() -> None:
    response = client.get('/api/v1/health')

    assert response.status_code == 200
    assert response.json() == {'status': 'ok', 'adapter': 'mock'}


def test_health_allows_local_vite_origin() -> None:
    response = client.get('/api/v1/health', headers={'Origin': 'http://localhost:5173'})

    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'


def test_contract_examples() -> None:
    response = client.get('/api/v1/contracts/patient-example')

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {'csv_example', 'json_example', 'envelope_example'}
    assert body['csv_example'] == VALID_CSV
    validate(instance=body['json_example'], schema=PATIENT_INPUT_SCHEMA)
    _assert_matches_result_envelope(body['envelope_example'])
    assert body['envelope_example']['normalized_input'] == EXPECTED_NORMALIZED_INPUT


def test_upload_valid_csv_success() -> None:
    response = _upload('patient.csv', VALID_CSV, 'text/csv')

    assert response.status_code == 200
    body = response.json()
    _assert_matches_result_envelope(body)
    assert body['patient'] == {'deidentified_patient_id': 'P-001'}
    assert body['normalized_input'] == EXPECTED_NORMALIZED_INPUT
    assert body['result']['adapter'] == 'mock'
    assert body['result']['artifacts'] == {'survival_curve': None, 'explanations': []}


def test_upload_valid_json_success() -> None:
    response = _upload('patient.json', json.dumps(VALID_JSON_INPUT), 'application/json')

    assert response.status_code == 200
    body = response.json()
    _assert_matches_result_envelope(body)
    assert body['normalized_input'] == EXPECTED_NORMALIZED_INPUT


def test_upload_valid_json_with_nested_clinical_success() -> None:
    payload = {
        'deidentified_patient_id': 'P-001',
        'gene_variants': [{'gene': 'TP53', 'variant_classification': 'Missense_Mutation'}],
        'clinical': {'age': 67, 'pathologic_stage': 'IIA', 'gender': 'female'},
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 200
    body = response.json()
    _assert_matches_result_envelope(body)
    assert body['normalized_input'] == {
        'deidentified_patient_id': 'P-001',
        'gene_variants': [{'gene': 'TP53', 'variant_classification': 'Missense_Mutation'}],
        'clinical': {'age': 67, 'pathologic_stage': 'IIA', 'gender': 'female'},
    }


def test_upload_valid_json_without_optional_clinical_fields() -> None:
    payload = {
        'deidentified_patient_id': 'P-001',
        'gene_variants': [{'gene': 'TP53', 'variant_classification': 'Missense_Mutation'}],
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 200
    body = response.json()
    _assert_matches_result_envelope(body)
    assert body['normalized_input'] == {
        **payload,
        'clinical': {'age': None, 'pathologic_stage': None, 'gender': None},
    }


def test_upload_rejects_missing_file_with_canonical_error_shape() -> None:
    response = client.post('/api/v1/inference/upload')

    assert response.status_code == 422
    body = response.json()
    _assert_error(body, 'VALIDATION_ERROR')
    assert body['error']['details'][0]['field'] == 'file'


def test_upload_rejects_unsupported_file_type() -> None:
    response = _upload('patient.txt', 'hello')

    assert response.status_code == 415
    _assert_error(response.json(), 'UNSUPPORTED_FILE_TYPE')


def test_upload_rejects_malformed_csv() -> None:
    malformed_csv = 'deidentified_patient_id,gene\nP-001,TP53,extra'

    response = _upload('patient.csv', malformed_csv, 'text/csv')

    assert response.status_code == 400
    _assert_error(response.json(), 'MALFORMED_FILE')


def test_upload_rejects_malformed_json() -> None:
    response = _upload('patient.json', '{"deidentified_patient_id":', 'application/json')

    assert response.status_code == 400
    _assert_error(response.json(), 'MALFORMED_FILE')


def test_upload_rejects_multiple_patient_ids() -> None:
    csv_payload = '''deidentified_patient_id,gene,variant_classification
P-001,TP53,Missense_Mutation
P-002,EGFR,L858R
'''

    response = _upload('patient.csv', csv_payload, 'text/csv')

    assert response.status_code == 400
    _assert_error(response.json(), 'MULTIPLE_PATIENT_IDS')


def test_upload_rejects_missing_patient_id() -> None:
    payload = {
        'gene_variants': [{'gene': 'TP53', 'variant_classification': 'Missense_Mutation'}],
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 422
    _assert_error(response.json(), 'MISSING_PATIENT_ID')


def test_upload_rejects_missing_gene_variants() -> None:
    payload = {'deidentified_patient_id': 'P-001', 'gene_variants': []}

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 422
    _assert_error(response.json(), 'MISSING_GENE_VARIANTS')


def test_upload_rejects_missing_gene() -> None:
    payload = {
        'deidentified_patient_id': 'P-001',
        'gene_variants': [{'variant_classification': 'Missense_Mutation'}],
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 422
    _assert_error(response.json(), 'MISSING_REQUIRED_FIELD')
    assert response.json()['error']['details'][0]['field'] == 'gene_variants[0].gene'


def test_upload_rejects_missing_variant_classification() -> None:
    payload = {
        'deidentified_patient_id': 'P-001',
        'gene_variants': [{'gene': 'TP53'}],
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 422
    _assert_error(response.json(), 'MISSING_REQUIRED_FIELD')
    assert response.json()['error']['details'][0]['field'] == (
        'gene_variants[0].variant_classification'
    )


def test_upload_rejects_disallowed_identifier_field_in_json() -> None:
    payload = {
        'deidentified_patient_id': 'P-001',
        'name': 'Jane Doe',
        'gene_variants': [{'gene': 'TP53', 'variant_classification': 'Missense_Mutation'}],
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 422
    body = response.json()
    _assert_error(body, 'DISALLOWED_IDENTIFIER_FIELD')
    assert 'Jane Doe' not in json.dumps(body)


def test_upload_rejects_disallowed_identifier_field_in_csv() -> None:
    csv_payload = '''deidentified_patient_id,name,gene,variant_classification
P-001,Jane Doe,TP53,Missense_Mutation
'''

    response = _upload('patient.csv', csv_payload, 'text/csv')

    assert response.status_code == 422
    body = response.json()
    _assert_error(body, 'DISALLOWED_IDENTIFIER_FIELD')
    assert body['error']['details'][0]['field'] == 'name'
    assert 'Jane Doe' not in json.dumps(body)


def test_error_responses_do_not_echo_payload_values() -> None:
    payload = {
        'deidentified_patient_id': 'P-001',
        'hospital_id': 'SECRET-123',
        'gene_variants': [{'gene': 'TP53', 'variant_classification': 'Missense_Mutation'}],
    }

    response = _upload('patient.json', json.dumps(payload), 'application/json')

    assert response.status_code == 422
    serialized = json.dumps(response.json())
    assert 'SECRET-123' not in serialized
    assert 'TP53' not in serialized


def _assert_error(body: dict, code: str) -> None:
    assert body['error']['code'] == code
    assert set(body['error'].keys()) == {'code', 'message', 'details'}
