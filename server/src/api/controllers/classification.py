from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.db.db_context import DBContext, get_db_ctx
from src.schemas.classification import (
    ClassificationConfigCreate,
    ClassificationConfigRead,
    ClassificationConfigUpdate,
)
from src.services.classification_service import create_classification_service

router = APIRouter()


@router.get(
    "/classification-config",
    status_code=status.HTTP_200_OK,
    response_model=list[ClassificationConfigRead],
    tags=["Classification"],
)
async def list_classification_configs(db_ctx: DBContext = Depends(get_db_ctx)):
    """List all classification configurations."""
    service = create_classification_service(db_ctx)
    try:
        return await service.fetch_all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classification configs: {str(e)}",
        )


@router.get(
    "/projects/{project_uuid}/classification-configs",
    status_code=status.HTTP_200_OK,
    response_model=list[ClassificationConfigRead],
    tags=["Classification"],
)
async def list_project_classification_configs(
    project_uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    """List all classification configurations for a specific project."""
    service = create_classification_service(db_ctx)
    try:
        return await service.fetch_by_project_uuid(project_uuid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classification configs: {str(e)}",
        )


@router.get(
    "/classification-config/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=ClassificationConfigRead,
    tags=["Classification"],
)
async def get_classification_config(
    uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Get a specific classification configuration by UUID."""
    service = create_classification_service(db_ctx)
    try:
        config = await service.fetch_by_uuid(uuid)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )
        return config
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classification config: {str(e)}",
        )


@router.post(
    "/classification-config",
    status_code=status.HTTP_201_CREATED,
    tags=["Classification"],
)
async def create_classification_config(
    config_data: ClassificationConfigCreate, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Create a new classification configuration."""
    service = create_classification_service(db_ctx)
    try:
        config_id, config_uuid = await service.create(config_data)
        await db_ctx.commit()
        return {"id": config_id, "uuid": str(config_uuid)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification config creation failed: {str(e)}",
        )


@router.put(
    "/classification-config/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=ClassificationConfigRead,
    tags=["Classification"],
)
async def update_classification_config(
    uuid: UUID,
    config_data: ClassificationConfigUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
):
    """Update an existing classification configuration."""
    service = create_classification_service(db_ctx)
    try:
        updated_config = await service.update(uuid, config_data)
        if not updated_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )
        await db_ctx.commit()
        return updated_config
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update classification config: {str(e)}",
        )


@router.delete(
    "/classification-config/{uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Classification"],
)
async def delete_classification_config(
    uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Delete a classification configuration."""
    service = create_classification_service(db_ctx)
    try:
        deleted = await service.delete(uuid)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )
        await db_ctx.commit()
        return {"detail": "Classification config deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete classification config: {str(e)}",
        )
