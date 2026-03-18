from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.schemas import ContractExamplesResponse
from app.services.inference import run_mock_inference


def load_contract_examples() -> ContractExamplesResponse:
    repo_root = Path(__file__).resolve().parents[3]
    shared_docs = repo_root / "shared-docs"
    csv_path = shared_docs / "sample-data" / "patient-example.csv"
    json_path = shared_docs / "sample-data" / "patient-example.json"

    csv_example = csv_path.read_text(encoding="utf-8").strip()
    json_example = json.loads(json_path.read_text(encoding="utf-8"))
    envelope_example = run_mock_inference(_example_patient(json_example))

    return ContractExamplesResponse(
        csv_example=csv_example,
        json_example=json_example,
        envelope_example=envelope_example,
    )


def _example_patient(payload: dict[str, Any]):
    from app.services.inference import parse_uploaded_patient

    return parse_uploaded_patient(
        "patient-example.json",
        json.dumps(payload).encode("utf-8"),
        "application/json",
    )
