from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass

from app.common.exceptions import AppError, error_detail

IMMUNE_GENES = ("PTPRC", "CD3D", "CD3E", "CD8A", "CD4", "HLA-DRA")
STROMAL_GENES = ("COL1A1", "COL1A2", "ACTA2", "VIM")


@dataclass(frozen=True)
class ExpressionScores:
    stromal: float
    immune: float


def calculate_expression_scores(
    expression_values: Mapping[str, float], patient_id: str
) -> ExpressionScores:
    """Extract the delivered notebook's ssGSEA calculation into backend code.

    The input has Ensembl IDs as keys and a single patient expression value per key.
    MyGene resolves IDs to symbols, after which GSEApy computes the fixed Stromal and
    Immune enrichment scores using the notebook's rank normalization.
    """

    try:
        import gseapy as gp
        import pandas as pd
        from mygene import MyGeneInfo
    except ImportError as exc:
        raise AppError(
            status_code=503,
            code="MODEL_RUNTIME_UNAVAILABLE",
            message=(
                "서버의 유전자 발현량 분석 기능이 준비되지 않았습니다. 관리자에게 문의해 주세요."
            ),
            details=[error_detail("backend_dependencies", "gseapy_mygene_pandas")],
        ) from exc

    if not expression_values:
        raise AppError(
            status_code=422,
            code="INVALID_EXPRESSION_VALUE",
            message=(
                "유전자 발현량 파일에 분석할 값이 없습니다. 데이터가 포함된 파일을 선택해 주세요."
            ),
            details=[error_detail("expression_file", "non_empty")],
        )

    try:
        records = MyGeneInfo().querymany(
            [*IMMUNE_GENES, *STROMAL_GENES],
            scopes="symbol",
            fields="ensembl.gene",
            species="human",
            as_dataframe=False,
            verbose=False,
        )
    except Exception as exc:  # MyGene is a required external dependency of the supplied notebook.
        raise AppError(
            status_code=503,
            code="EXPRESSION_GENE_MAPPING_UNAVAILABLE",
            message=(
                "유전자 식별자를 분석에 사용할 정보로 변환하지 못했습니다. 파일의 "
                "식별자 형식을 확인하고 다시 시도해 주세요."
            ),
            details=[error_detail("expression_file", "ensembl_to_symbol_mapping")],
        ) from exc

    id_to_symbol: dict[str, str] = {}
    for record in records:
        if not isinstance(record, dict):
            continue
        symbol = str(record.get("query") or "").upper()
        ensembl = record.get("ensembl")
        candidates = ensembl if isinstance(ensembl, list) else [ensembl]
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("gene"):
                id_to_symbol[str(candidate["gene"])] = symbol
    mapped_values: dict[str, list[float]] = {}
    for original_id, value in expression_values.items():
        base_id = original_id.split(".", 1)[0]
        name = id_to_symbol.get(base_id, original_id)
        mapped_values.setdefault(name, []).append(float(value))

    averaged_values = {
        symbol: sum(values) / len(values) for symbol, values in mapped_values.items()
    }
    expression_frame = pd.DataFrame({patient_id: averaged_values})
    gene_sets = {
        "Immune": [gene for gene in IMMUNE_GENES if gene in expression_frame.index],
        "Stromal": [gene for gene in STROMAL_GENES if gene in expression_frame.index],
    }
    gene_sets = {name: genes for name, genes in gene_sets.items() if genes}
    if set(gene_sets) != {"Immune", "Stromal"}:
        missing = sorted({"Immune", "Stromal"} - set(gene_sets))
        raise AppError(
            status_code=422,
            code="EXPRESSION_GENE_SET_MISSING",
            message=(
                "유전자 발현량 점수 계산에 필요한 유전자가 부족합니다. 분석용 "
                "파일의 유전자 목록을 확인해 주세요."
            ),
            details=[
                error_detail("expression_file", f"missing_{'_'.join(missing).lower()}_gene_set")
            ],
        )

    try:
        result = gp.ssgsea(
            data=expression_frame,
            gene_sets=gene_sets,
            sample_norm_method="rank",
            min_size=1,
            outdir=None,
            no_plot=True,
        ).res2d
        # GSEApy exposes raw rank-sum ES and normalized enrichment NES. The raw
        # ES scales with the 57k-column RNA matrix and overflows the delivered
        # Cox model; NES is the stable per-sample enrichment score used as the
        # model feature.
        score_table = result.pivot(index="Name", columns="Term", values="NES")
        stromal = float(score_table.loc[patient_id, "Stromal"])
        immune = float(score_table.loc[patient_id, "Immune"])
    except Exception as exc:
        raise AppError(
            status_code=503,
            code="EXPRESSION_SCORE_FAILED",
            message=(
                "유전자 발현량 점수를 계산하지 못했습니다. 다시 시도하고 문제가 "
                "계속되면 관리자에게 문의해 주세요."
            ),
            details=[error_detail("expression_file", "ssgsea")],
        ) from exc
    if not math.isfinite(stromal) or not math.isfinite(immune):
        raise AppError(
            status_code=503,
            code="EXPRESSION_SCORE_FAILED",
            message=(
                "유전자 발현량 점수가 정상 범위를 벗어나 분석을 완료하지 "
                "못했습니다. 관리자에게 문의해 주세요."
            ),
            details=[error_detail("expression_file", "finite_ssgsea_scores")],
        )

    return ExpressionScores(stromal=stromal, immune=immune)
