from typing import List
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.file import FileReadWithPaperCount
from src.schemas.file_service import FulltextImportResult
from src.schemas.paper import PaperRead
from src.schemas.project import ScreeningTarget
from src.services.file_service import create_file_service

router = APIRouter()


@router.get(
    "/files/{project_uuid}",
    status_code=status.HTTP_200_OK,
    response_model=list[FileReadWithPaperCount],
    tags=["File"],
)
async def list_files(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        return await file_service.fetch_all(project_uuid, current_user.uuid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch files: {str(e)}",
        )


@router.post("/files/upload", status_code=200, response_model=dict, tags=["File"])
async def process_csv(
    project_uuid: UUID = Form(...),
    files: List[UploadFile] = File(...),
    screening_target: ScreeningTarget = Form(ScreeningTarget.PAPER),
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        existing_files = await file_service.fetch_all(project_uuid, current_user.uuid)
        if len(existing_files) != 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only one file allowed per project",
            )
        result = await file_service.process_files(project_uuid, files, current_user.uuid, screening_target)
        await db_ctx.commit()
        return result.__dict__
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}",
        )


@router.post(
    "/files/upload-pdfs",
    status_code=200,
    response_model=dict,
    tags=["File"],
)
async def process_pdfs(
    project_uuid: UUID = Form(...),
    files: List[UploadFile] = File(...),
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        result = await file_service.process_pdf_files(project_uuid, files, current_user.uuid)
        await db_ctx.commit()
        return result.__dict__
    except HTTPException as e:
        raise e
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload PDF files: {str(e)}",
        )


@router.post(
    "/files/{paper_uuid}/attach-pdf",
    status_code=200,
    response_model=PaperRead,
    tags=["File"],
)
async def attach_pdf_to_paper(
    paper_uuid: UUID,
    file: UploadFile = File(...),
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        result, old_storage_path = await file_service.attach_pdf_to_paper(
            paper_uuid,
            file,
            current_user.uuid,
        )
        await db_ctx.commit()
        if old_storage_path:
            await file_service.cleanup_pdf_storage(old_storage_path)
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to attach PDF: {str(e)}",
        )


@router.post(
    "/files/import-fulltext",
    status_code=200,
    response_model=FulltextImportResult,
    tags=["File"],
)
async def import_fulltext(
    project_uuid: UUID = Form(...),
    xml_file: UploadFile = File(...),
    pdf_files: List[UploadFile] = File(...),
    pdf_relative_paths: List[str] = Form(...),
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        result = await file_service.import_fulltext_from_endnote_xml(
            project_uuid,
            xml_file,
            pdf_files,
            pdf_relative_paths,
            current_user.uuid,
        )
        await db_ctx.commit()
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import full text: {str(e)}",
        )
    

@router.get("/files/{file_uuid}/download", tags=["File"])
async def download_file(
    file_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        filename, mime_type, content = await file_service.fetch_file_content(
            file_uuid,
            current_user.uuid,
        )
        return Response(
            content=content,
            media_type=mime_type,
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}",
        )