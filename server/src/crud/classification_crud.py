from typing import Optional, Sequence, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.classification_config import ClassificationConfig
from src.schemas.classification import (
    ClassificationConfigCreate,
    ClassificationConfigRead,
    ClassificationConfigUpdate,
)


class ClassificationCrud:
    """CRUD operations for classification configurations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_all(self) -> Sequence[ClassificationConfig]:
        """Fetch all classification configurations."""
        stmt = select(ClassificationConfig)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_by_project_uuid(
        self, project_uuid: UUID
    ) -> Sequence[ClassificationConfig]:
        """Fetch all classification configurations for a specific project."""
        stmt = select(ClassificationConfig).where(
            ClassificationConfig.project_uuid == project_uuid
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_by_uuid(self, uuid: UUID) -> Optional[ClassificationConfig]:
        """Fetch a classification configuration by UUID."""
        stmt = select(ClassificationConfig).where(ClassificationConfig.uuid == uuid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_by_id(self, config_id: int) -> Optional[ClassificationConfig]:
        """Fetch a classification configuration by ID."""
        stmt = select(ClassificationConfig).where(ClassificationConfig.id == config_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self, config_data: ClassificationConfigCreate
    ) -> Tuple[int, UUID]:
        """Create a new classification configuration."""
        # Convert Pydantic models to dicts for JSONB storage
        config_dict = config_data.model_dump(exclude_none=True)
        config_dict["classifications"] = [
            dim.model_dump() for dim in config_data.classifications
        ]

        new_config = ClassificationConfig(**config_dict)
        self.db.add(new_config)
        await self.db.flush()
        return new_config.id, new_config.uuid

    async def update(
        self, uuid: UUID, config_data: ClassificationConfigUpdate
    ) -> Optional[ClassificationConfig]:
        """Update an existing classification configuration."""
        stmt = select(ClassificationConfig).where(ClassificationConfig.uuid == uuid)
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            return None

        update_data = config_data.model_dump(exclude_none=True)
        if "classifications" in update_data:
            update_data["classifications"] = [
                dim.model_dump() for dim in config_data.classifications
            ]

        for key, value in update_data.items():
            setattr(config, key, value)

        await self.db.flush()
        return config

    async def delete(self, uuid: UUID) -> bool:
        """Delete a classification configuration."""
        stmt = select(ClassificationConfig).where(ClassificationConfig.uuid == uuid)
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if config:
            await self.db.delete(config)
            return True
        return False
