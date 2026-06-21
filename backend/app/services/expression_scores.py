from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass

from app.services.errors import AppError, error_detail

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
            message="RNA-seq scoring dependencies are not installed.",
            details=[error_detail("backend_dependencies", "gseapy_mygene_pandas")],
        ) from exc

    if not expression_values:
        raise AppError(
            status_code=422,
            code="INVALID_EXPRESSION_VALUE",
            message="RNA-seq upload contains no expression values.",
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
            message="Unable to map RNA-seq gene identifiers for score calculation.",
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
            message="RNA-seq upload does not contain enough genes for both expression scores.",
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
            message="Unable to calculate Stromal and Immune expression scores.",
            details=[error_detail("expression_file", "ssgsea")],
        ) from exc
    if not math.isfinite(stromal) or not math.isfinite(immune):
        raise AppError(
            status_code=503,
            code="EXPRESSION_SCORE_FAILED",
            message="Expression score calculation returned a non-finite value.",
            details=[error_detail("expression_file", "finite_ssgsea_scores")],
        )

    return ExpressionScores(stromal=stromal, immune=immune)
