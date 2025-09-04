import pandas as pd
import json, re
from uuid import UUID
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.crud.result_crud import ResultCrud
from src.db.session import get_db


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
        ],
    )
    df["notes"] = ""

    df["human_result"] = df["human_result"].apply(lambda r: r.value)
    df["binary_decision"] = df["binary_decision"].map(
        lambda v: (
            "INCLUDE"
            if str(v).lower() in ("true", "1")
            else "EXCLUDE" if str(v).lower() in ("false", "0") else ""
        )
    )

    # If there are no manual evals, return the df
    if df["model_name"].isna().all():
        df2 = df[["title", "abstract", "doi", "human_result", "notes"]]
        df2["notes"] = "Please run screening tasks to see LLM results."
        return df2

    pivot = df.pivot_table(
        index=["title", "abstract", "doi", "human_result", "notes"],
        columns="model_name",
        values=["binary_decision", "reason", "likert_decision", "probability_decision"],
        aggfunc="first",
    )
    pivot.columns = [f"{model}.{field}" for field, model in pivot.columns]
    return pivot.reset_index()


class ResultService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.result_crud = ResultCrud(db)

    async def generate_result_csv(self, project_uuid: UUID) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)
        return df.to_csv(index=False)
    
    async def generate_html(self, project_uuid: UUID) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)
        return df.to_html(index=False)

    async def fetch_result(self, project_uuid: UUID) -> list[dict]:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)
        return df.to_dict("records")


def get_result_service(db: AsyncSession = Depends(get_db)) -> ResultService:
    return ResultService(db)
