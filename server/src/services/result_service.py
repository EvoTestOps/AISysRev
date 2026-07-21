import json
from typing import List, Literal
from uuid import UUID

import pandas as pd
from pydantic import TypeAdapter

from src.crud.result_crud import ResultCrud
from src.db.db_context import DBContext
from src.db.models.paper import HumanResult
from src.schemas.llm import Criterion

criteria_adapter = TypeAdapter(List[Criterion])

ALL_COLUMNS = [
    "title",
    "abstract",
    "doi",
    "human_result",
    "model_name",
    "reason",
    "binary_decision",
    "likert_decision",
    "probability_decision",
    "inclusion_criteria",
    "exclusion_criteria",
    "screening_type",
    "error",
    "result_mode",
    "criterion_results",
    "pc_overall_probability",
    "pc_binary_decision",
]

ScreeningTarget = Literal["PAPER", "GITHUB_REPOSITORY"]

GITHUB_REPO_COLUMNS = {
    "title": "repository_name",
    "abstract": "readme",
    "doi": "repository_url",
}

def rename_columns(df: pd.DataFrame, screening_target: ScreeningTarget) -> pd.DataFrame:
    if screening_target == "GITHUB_REPOSITORY":
        df = df.rename(columns=GITHUB_REPO_COLUMNS)
    return df

def _ie(x) -> bool | None:
    s = str(x).lower()
    return True if s in ("true", "1") else False if s in ("false", "0") else None


def _bool_to_label(v) -> str:
    s = str(v).lower()
    if s in ("true", "1"):
        return "INCLUDE"
    if s in ("false", "0"):
        return "EXCLUDE"
    return ""


def _expand_criterion_results(criterion_results_json: str | None) -> dict:
    """Parse criterion_results JSON and return flat {crit_id.probability: v, crit_id.reason: v} dict."""
    if not criterion_results_json:
        return {}
    try:
        data = json.loads(criterion_results_json)
    except json.JSONDecodeError, TypeError:
        return {}
    cols: dict = {}
    for crit_id, val in data.items():
        if isinstance(val, dict) and "error" not in val:
            cols[f"{crit_id}.probability"] = val.get("probability_decision")
            cols[f"{crit_id}.reason"] = val.get("reason")
    return cols


def create_dataframe(data: list[dict]) -> pd.DataFrame:
    if not data:
        return pd.DataFrame(columns=["title", "abstract", "doi", "human_result"])

    df = pd.DataFrame(data, columns=ALL_COLUMNS)
    df["notes"] = ""
    df["human_result"] = df["human_result"].apply(
        lambda r: str(r.value) if isinstance(r, HumanResult) else ""
    )

    if df["model_name"].isna().all():
        df2 = df[["title", "abstract", "doi", "human_result", "notes"]].copy()
        df2["notes"] = "Please run screening tasks to see LLM results."
        return df2

    # Split rows by mode
    is_per_criteria = df["result_mode"].eq("PER_CRITERIA")

    standard_df = df[~is_per_criteria].copy()
    pc_df = df[is_per_criteria].copy()

    frames = []
    if not standard_df.empty:
        frames.append(_build_standard_pivot(standard_df))
    if not pc_df.empty:
        frames.append(_build_per_criteria_pivot(pc_df))

    if not frames:
        return pd.DataFrame(
            columns=["title", "abstract", "doi", "human_result", "notes"]
        )

    if len(frames) == 1:
        return frames[0]

    base_cols = ["title", "abstract", "doi", "human_result", "notes"]
    merged = frames[0]
    for other in frames[1:]:
        merged = merged.merge(other, on=base_cols, how="outer")
    return merged


def _build_standard_pivot(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["inclusion_criteria"] = df["inclusion_criteria"].apply(
        lambda v: criteria_adapter.validate_json(v) if v else []
    )
    df["exclusion_criteria"] = df["exclusion_criteria"].apply(
        lambda v: criteria_adapter.validate_json(v) if v else []
    )

    df["inclusion_cols"] = df["inclusion_criteria"].apply(
        lambda crits: (
            {
                f"{c.name.split(':', 1)[0].strip()}.binary": _ie(
                    c.decision.binary_decision
                )
                for c in crits
            }
            | {
                f"{c.name.split(':', 1)[0].strip()}.likert": c.decision.likert_decision.value
                for c in crits
            }
            | {
                f"{c.name.split(':', 1)[0].strip()}.probability": c.decision.probability_decision
                for c in crits
            }
        )
    )
    df["exclusion_cols"] = df["exclusion_criteria"].apply(
        lambda crits: (
            {
                f"{c.name.split(':', 1)[0].strip()}.binary": _ie(
                    c.decision.binary_decision
                )
                for c in crits
            }
            | {
                f"{c.name.split(':', 1)[0].strip()}.likert": c.decision.likert_decision.value
                for c in crits
            }
            | {
                f"{c.name.split(':', 1)[0].strip()}.probability": c.decision.probability_decision
                for c in crits
            }
        )
    )

    inc = df.pop("inclusion_cols").apply(pd.Series)
    exc = df.pop("exclusion_cols").apply(pd.Series)
    df = pd.concat([df, inc, exc], axis=1)
    df = df.drop(columns=["inclusion_criteria", "exclusion_criteria"])

    df["binary_decision"] = df["binary_decision"].map(_bool_to_label)

    crit_cols = [c for c in df.columns if c.startswith(("IC", "EC"))]
    values = [
        "binary_decision",
        "reason",
        "likert_decision",
        "probability_decision",
        "error",
        *crit_cols,
    ]
    return _pivot_and_order(df, values)


def _build_per_criteria_pivot(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["binary_decision"] = df["pc_binary_decision"].map(_bool_to_label)
    df["probability_decision"] = pd.to_numeric(
        df["pc_overall_probability"], errors="coerce"
    )

    crit_col_frames = (
        df["criterion_results"].apply(_expand_criterion_results).apply(pd.Series)
    )
    df = pd.concat([df, crit_col_frames], axis=1)

    crit_cols = [
        c
        for c in df.columns
        if (c.startswith("IC") or c.startswith("EC"))
        and (c.endswith(".probability") or c.endswith(".reason"))
    ]
    values = ["binary_decision", "probability_decision", "error", *crit_cols]

    return _pivot_and_order(df, values)


def _pivot_and_order(df: pd.DataFrame, values: list[str]) -> pd.DataFrame:
    base_cols = ["title", "abstract", "doi", "human_result", "notes"]
    values = [v for v in values if v in df.columns]

    pivot = df.pivot_table(
        index=base_cols,
        columns=["model_name", "screening_type"],
        values=values,
        aggfunc="first",
    )
    pivot.columns = [
        f"{model}.{stype}.{field}" for field, model, stype in pivot.columns
    ]
    pivot = pivot.reset_index()

    overall_binary = [c for c in pivot.columns if c.endswith(".binary_decision")]
    overall_prob = [c for c in pivot.columns if c.endswith(".probability_decision")]
    overall_likert = [c for c in pivot.columns if c.endswith(".likert_decision")]
    inc_binary = [c for c in pivot.columns if ".IC" in c and c.endswith(".binary")]
    exc_binary = [c for c in pivot.columns if ".EC" in c and c.endswith(".binary")]
    inc_likert = [c for c in pivot.columns if ".IC" in c and c.endswith(".likert")]
    exc_likert = [c for c in pivot.columns if ".EC" in c and c.endswith(".likert")]
    inc_prob = [c for c in pivot.columns if ".IC" in c and c.endswith(".probability")]
    exc_prob = [c for c in pivot.columns if ".EC" in c and c.endswith(".probability")]
    reasons = [c for c in pivot.columns if c.endswith(".reason")]
    errors = [c for c in pivot.columns if c.endswith(".error")]

    new_order = (
        base_cols
        + overall_binary
        + overall_likert
        + overall_prob
        + inc_binary
        + exc_binary
        + inc_likert
        + exc_likert
        + inc_prob
        + exc_prob
        + reasons
        + errors
    )
    return pivot[[c for c in new_order if c in pivot.columns]]


class ResultService:
    def __init__(self, result_crud: ResultCrud):
        self.result_crud = result_crud

    async def generate_result_csv(self, project_uuid: UUID, screening_target: ScreeningTarget) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)  # type: ignore
        df = rename_columns(df, screening_target)
        return df.to_csv(index=False)

    async def generate_html(self, project_uuid: UUID, screening_target: ScreeningTarget) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)  # type: ignore
        df = rename_columns(df, screening_target)
        return df.to_html(index=False)

    async def fetch_result(self, project_uuid: UUID, screening_target: ScreeningTarget) -> list[dict]:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)  # type: ignore
        df = rename_columns(df, screening_target)
        return df.to_dict("records")


def create_result_service(db_ctx: DBContext) -> ResultService:
    return ResultService(db_ctx.crud(ResultCrud))
