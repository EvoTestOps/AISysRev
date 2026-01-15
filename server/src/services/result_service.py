from typing import List
from uuid import UUID

import pandas as pd
from pydantic import TypeAdapter

from src.crud.result_crud import ResultCrud
from src.db.db_context import DBContext
from src.db.models.paper import HumanResult
from src.schemas.llm import Criterion

criteria_adapter = TypeAdapter(List[Criterion])


def _ie(x) -> bool | None:
    s = str(x).lower()
    return True if s in ("true", "1") else False if s in ("false", "0") else None


def create_dataframe(data: list[dict]) -> pd.DataFrame:
    if not data:
        return pd.DataFrame(columns=["title", "abstract", "doi", "human_result"])
    df = pd.DataFrame(
        data,
        columns=[
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
        ],
    )
    df["notes"] = ""
    df["human_result"] = df["human_result"].apply(
        lambda r: str(r.value) if isinstance(r, HumanResult) else ""
    )

    # If there are no LLM evals, return the df
    if df["model_name"].isna().all():
        df2 = df[["title", "abstract", "doi", "human_result", "notes"]].copy()
        df2["notes"] = "Please run screening tasks to see LLM results."
        return df2

    df["inclusion_criteria"] = df["inclusion_criteria"].apply(
        lambda v: criteria_adapter.validate_json(v) if v else []
    )
    df["exclusion_criteria"] = df["exclusion_criteria"].apply(
        lambda v: criteria_adapter.validate_json(v) if v else []
    )

    # make per-criterion columns (one-liners)
    df["inclusion_cols"] = df["inclusion_criteria"].apply(
        lambda crits: {
            f"{c.name.split(':', 1)[0].strip()}.binary": _ie(c.decision.binary_decision)
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

    df["exclusion_cols"] = df["exclusion_criteria"].apply(
        lambda crits: {
            f"{c.name.split(':', 1)[0].strip()}.binary": _ie(c.decision.binary_decision)
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

    inc = df.pop("inclusion_cols").apply(pd.Series)
    exc = df.pop("exclusion_cols").apply(pd.Series)
    df = pd.concat([df, inc, exc], axis=1)
    df = df.drop(columns=["inclusion_criteria", "exclusion_criteria"])

    df["binary_decision"] = df["binary_decision"].map(
        lambda v: (
            "INCLUDE"
            if str(v).lower() in ("true", "1")
            else "EXCLUDE"
            if str(v).lower() in ("false", "0")
            else ""
        )
    )

    crit_cols = [c for c in df.columns if c.startswith(("IC", "EC"))]
    values = [
        "binary_decision",
        "reason",
        "likert_decision",
        "probability_decision",
        "error",
        *crit_cols,
    ]

    base_cols = ["title", "abstract", "doi", "human_result", "notes"]

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
    overall_likert = [c for c in pivot.columns if c.endswith(".likert_decision")]
    overall_prob = [c for c in pivot.columns if c.endswith(".probability_decision")]

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

    pivot = pivot[[c for c in new_order if c in pivot.columns]]

    return pivot


class ResultService:
    def __init__(self, result_crud: ResultCrud):
        self.result_crud = result_crud

    async def generate_result_csv(self, project_uuid: UUID) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)  # type: ignore
        return df.to_csv(index=False)

    async def generate_html(self, project_uuid: UUID) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)  # type: ignore
        return df.to_html(index=False)

    async def fetch_result(self, project_uuid: UUID) -> list[dict]:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)  # type: ignore
        return df.to_dict("records")


def create_result_service(db_ctx: DBContext) -> ResultService:
    return ResultService(db_ctx.crud(ResultCrud))
