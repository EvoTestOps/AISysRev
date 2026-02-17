from typing import Optional, Sequence, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.embedding_config import EmbeddingConfig
from src.schemas.embedding import (
    EmbeddingConfigCreate,
    EmbeddingConfigUpdate,
)


class EmbeddingCrud:
    """CRUD operations for embedding configurations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_all(self) -> Sequence[EmbeddingConfig]:
        """Fetch all embedding configurations."""
        stmt = select(EmbeddingConfig)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_by_project_uuid(
        self, project_uuid: UUID
    ) -> Sequence[EmbeddingConfig]:
        """Fetch all embedding configurations for a specific project."""
        stmt = select(EmbeddingConfig).where(
            EmbeddingConfig.project_uuid == project_uuid
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_by_uuid(self, uuid: UUID) -> Optional[EmbeddingConfig]:
        """Fetch an embedding configuration by UUID."""
        stmt = select(EmbeddingConfig).where(EmbeddingConfig.uuid == uuid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_by_id(self, config_id: int) -> Optional[EmbeddingConfig]:
        """Fetch an embedding configuration by ID."""
        stmt = select(EmbeddingConfig).where(EmbeddingConfig.id == config_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, config_data: EmbeddingConfigCreate) -> Tuple[int, UUID]:
        """Create a new embedding configuration."""
        new_config = EmbeddingConfig(**config_data.model_dump(exclude_none=True))
        self.db.add(new_config)
        await self.db.flush()
        return new_config.id, new_config.uuid

    async def update(
        self, uuid: UUID, config_data: EmbeddingConfigUpdate
    ) -> Optional[EmbeddingConfig]:
        """Update an existing embedding configuration."""
        stmt = select(EmbeddingConfig).where(EmbeddingConfig.uuid == uuid)
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            return None

        update_data = config_data.model_dump(exclude_none=True)
        for key, value in update_data.items():
            setattr(config, key, value)

        await self.db.flush()
        return config

    async def delete(self, uuid: UUID) -> bool:
        """Delete an embedding configuration."""
        stmt = select(EmbeddingConfig).where(EmbeddingConfig.uuid == uuid)
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if config:
            await self.db.delete(config)
            return True
        return False
