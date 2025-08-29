import pandas as pd
import json, re
from uuid import UUID
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.crud.result_crud import ResultCrud
from src.db.session import get_db

def reorder_columns(df: pd.DataFrame) -> pd.DataFrame:
    fixed = ["title", "abstract", "doi", "human_result"]
    model_fields = ["binary_decision", "likert_decision", "probability_decision", "reason"]
    model_names = set()

    for col in df.columns:
        m = re.match(r"(.+)_binary_decision$", col)
        if m:
            model_names.add(m.group(1))

    model_cols = []
    for model in sorted(model_names):
        for field in model_fields:
            col = f"{model}_{field}"
            if col in df.columns:
                model_cols.append(col)

    remaining = [col for col in df.columns if col not in fixed + model_cols]
    ordered_cols = fixed + model_cols + remaining

    return df[ordered_cols]

def parse_criteria(df: pd.DataFrame) -> pd.DataFrame:
        for idx, row in df.iterrows():
            for crit_type in ["inclusion_criteria", "exclusion_criteria"]:
                crit_list = row[crit_type]
                if not crit_list:
                    continue

                if isinstance(crit_list, str):
                    try:
                        crit_list = json.loads(crit_list)
                    except Exception:
                        continue
                for crit in crit_list:
                    name = crit.get("name")
                    decision = crit.get("decision", {})
                    for field, value in decision.items():
                        if field == "binary_decision":
                            value = (
                                "INCLUDE" if str(value).lower() in ("true", "1")
                                else "EXCLUDE" if str(value).lower() in ("false", "0")
                                else ""
                            )
                        col_name = f"{row['model_name']}_{name}_{field}"
                        df.at[idx, col_name] = value

        df = df.drop(columns=["inclusion_criteria", "exclusion_criteria"])

        pivot = df.pivot_table(
            index=["title", "abstract", "doi", "human_result"],
            columns="model_name",
            values=[
                "binary_decision", "reason", "likert_decision", "probability_decision"
            ] + [col for col in df.columns if any(x in col for x in ["_EC", "_IC"])],
            aggfunc="first"
        )

        pivot.columns = [
            f"{col[1]}_{col[0]}" if isinstance(col, tuple) else col
            for col in pivot.columns.to_flat_index()
        ]
        return pivot.reset_index()

def create_dataframe(data: list[dict]) -> pd.DataFrame:
        if not data:
            return pd.DataFrame(columns=["title","abstract","doi","human_result"])
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
                "exclusion_criteria"
            ]
        )

        df["human_result"] = df["human_result"].astype(str).apply(lambda s: s.rsplit(".", 1)[-1])
        df["binary_decision"] = df["binary_decision"].map(
            lambda v: "INCLUDE" if str(v).lower() in ("true","1")
            else "EXCLUDE" if str(v).lower() in ("false","0")
            else ""
        )

        pivot = parse_criteria(df)
        return reorder_columns(pivot)

class ResultService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.result_crud = ResultCrud(db)

    async def generate_result_csv(self, project_uuid: UUID) -> str:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)
        return df.to_csv(index=False)

    async def fetch_result(self, project_uuid: UUID) -> list[dict]:
        rows = await self.result_crud.create_result(project_uuid)
        df = create_dataframe(rows)
        return df.to_dict('records')

def get_result_service(db: AsyncSession = Depends(get_db)) -> ResultService:
    return ResultService(db)
