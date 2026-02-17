from typing import Optional, Sequence, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.visualization import Visualization
from src.schemas.visualization import (
    VisualizationCreate,
    VisualizationUpdate,
)


class VisualizationCrud:
    """CRUD operations for visualizations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_all(self) -> Sequence[Visualization]:
        """Fetch all visualizations."""
        stmt = select(Visualization)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_by_project_uuid(
        self, project_uuid: UUID
    ) -> Sequence[Visualization]:
        """Fetch all visualizations for a specific project."""
        stmt = select(Visualization).where(
            Visualization.project_uuid == project_uuid
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_by_uuid(self, uuid: UUID) -> Optional[Visualization]:
        """Fetch a visualization by UUID."""
        stmt = select(Visualization).where(Visualization.uuid == uuid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_by_uuid_with_html(self, uuid: UUID) -> Optional[Visualization]:
        """Fetch a visualization with HTML content by UUID."""
        return await self.fetch_by_uuid(uuid)

    async def create(self, viz_data: VisualizationCreate) -> Tuple[int, UUID]:
        """Create a new visualization."""
        new_viz = Visualization(**viz_data.model_dump(exclude_none=True))
        self.db.add(new_viz)
        await self.db.flush()
        return new_viz.id, new_viz.uuid

    async def update(
        self, uuid: UUID, viz_data: VisualizationUpdate
    ) -> Optional[Visualization]:
        """Update an existing visualization."""
        stmt = select(Visualization).where(Visualization.uuid == uuid)
        result = await self.db.execute(stmt)
        viz = result.scalar_one_or_none()

        if not viz:
            return None

        update_data = viz_data.model_dump(exclude_none=True)
        for key, value in update_data.items():
            setattr(viz, key, value)

        await self.db.flush()
        return viz

    async def delete(self, uuid: UUID) -> bool:
        """Delete a visualization."""
        stmt = select(Visualization).where(Visualization.uuid == uuid)
        result = await self.db.execute(stmt)
        viz = result.scalar_one_or_none()

        if viz:
            await self.db.delete(viz)
            return True
        return False
