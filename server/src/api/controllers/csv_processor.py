from fastapi import APIRouter, UploadFile, File, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from services.csv_processing_service import process_csv_files

router = APIRouter()

@router.post("/api/files/upload")
async def process_csv(
    files: List[UploadFile] = File(...), 
    db: AsyncSession = Depends(get_db)
):
    return await process_csv_files(files, db)
