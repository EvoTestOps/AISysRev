from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from src.crud.classification_crud import ClassificationCrud
from src.db.db_context import DBContext
from src.schemas.classification import (
    ClassificationConfigCreate,
    ClassificationConfigRead,
    ClassificationConfigUpdate,
    ClassificationDimension,
)


class ClassificationService:
    """Service for classification configuration management and business logic."""

    def __init__(self, classification_crud: ClassificationCrud):
        self.classification_crud = classification_crud

    async def fetch_all(self) -> List[ClassificationConfigRead]:
        """Fetch all classification configurations."""
        configs = await self.classification_crud.fetch_all()
        return [ClassificationConfigRead.model_validate(c) for c in configs]

    async def fetch_by_project_uuid(
        self, project_uuid: UUID
    ) -> List[ClassificationConfigRead]:
        """Fetch all classification configurations for a project."""
        configs = await self.classification_crud.fetch_by_project_uuid(project_uuid)
        return [ClassificationConfigRead.model_validate(c) for c in configs]

    async def fetch_by_uuid(
        self, uuid: UUID
    ) -> Optional[ClassificationConfigRead]:
        """Fetch a classification configuration by UUID."""
        config = await self.classification_crud.fetch_by_uuid(uuid)
        return (
            ClassificationConfigRead.model_validate(config) if config else None
        )

    async def create(self, config_data: ClassificationConfigCreate) -> Tuple[int, UUID]:
        """Create a new classification configuration."""
        # Validation happens in Pydantic schema
        return await self.classification_crud.create(config_data)

    async def update(
        self, uuid: UUID, config_data: ClassificationConfigUpdate
    ) -> Optional[ClassificationConfigRead]:
        """Update an existing classification configuration."""
        config = await self.classification_crud.update(uuid, config_data)
        return (
            ClassificationConfigRead.model_validate(config) if config else None
        )

    async def delete(self, uuid: UUID) -> bool:
        """Delete a classification configuration."""
        return await self.classification_crud.delete(uuid)

    @staticmethod
    def generate_prompts_for_paper(
        title: str,
        abstract: str,
        systematic_review_context: str,
        classifications: List[ClassificationDimension],
        prompt_template: str,
    ) -> List[str]:
        """
        Generate classification prompts for a single paper.

        For multi-class probability classification, generates one prompt per class
        in each classification dimension.

        Args:
            title: Paper title
            abstract: Paper abstract
            systematic_review_context: Context for the systematic review
            classifications: List of classification dimensions with classes
            prompt_template: Template string with placeholders:
                {0} = title, {1} = abstract, {2} = sr_context,
                {3} = classification_name, {4} = class_name

        Returns:
            List of prompts (one per class in each dimension)
        """
        prompts = []
        for classification in classifications:
            classification_name = classification.name
            for class_name in classification.classes:
                prompt = prompt_template.format(
                    title,
                    abstract,
                    systematic_review_context,
                    classification_name,
                    class_name,
                )
                prompts.append(prompt)
        return prompts

    @staticmethod
    def assign_chosen_class_per_paper(
        paper_results_dict: Dict[str, Optional[float]],
        classification_names: Set[str],
    ) -> Dict[str, str]:
        """
        Assign a 'chosen' class for each classification dimension based on probabilities.

        Logic (from classify.py):
        - For each classification dimension:
          - If at least one class has probability >= 0.5, choose highest probability
          - Otherwise, assign 'other'

        Args:
            paper_results_dict: {class_column_name: probability}
            classification_names: Set of base classification names

        Returns:
            Dict of {chosen_column_name: chosen_class_name}
        """
        chosen_classes = {}

        # Group probabilities by base classification name
        grouped_probs: Dict[str, List[Tuple[str, float]]] = {
            name: [] for name in classification_names
        }

        for col_name, probability in paper_results_dict.items():
            # Find the base classification name
            for class_name in classification_names:
                if col_name.startswith(class_name):
                    if probability is not None:
                        # Extract specific class name from column name
                        specific_class_name = col_name[len(class_name) + 1 :].replace(
                            "_", " "
                        )
                        grouped_probs[class_name].append(
                            (specific_class_name, probability)
                        )
                    break

        # Apply assignment logic for each classification type
        for class_name, probs_list in grouped_probs.items():
            chosen_col_name = f"{class_name}_chosen"

            # Filter for probabilities >= 0.5
            high_confidence_probs = [
                (cname, prob) for cname, prob in probs_list if prob >= 0.5
            ]

            if high_confidence_probs:
                # Pick the one with highest probability
                highest_class, _ = max(high_confidence_probs, key=lambda item: item[1])
                chosen_classes[chosen_col_name] = highest_class
            else:
                # Otherwise, assign 'other'
                chosen_classes[chosen_col_name] = "other"

        return chosen_classes

    @staticmethod
    def parse_classification_results(
        results: List[Optional[float]],
        classifications: List[ClassificationDimension],
        paper_index: int,
    ) -> Dict[str, any]:
        """
        Parse classification results for a single paper.

        Args:
            results: List of probabilities (one per class), may contain None for failures
            classifications: List of classification dimensions
            paper_index: Index of the paper being processed (for logging)

        Returns:
            Dict with probability columns and chosen class columns
        """
        paper_results_dict = {}
        classification_names = {
            c.name.replace(" ", "_").replace("-", "_") for c in classifications
        }

        res_idx = 0
        for classification in classifications:
            classification_name = classification.name
            for class_name in classification.classes:
                # Column name for the probability score
                col_name = (
                    f"{classification_name}_{class_name}".replace(" ", "_").replace(
                        "-", "_"
                    )
                )

                probability = results[res_idx] if res_idx < len(results) else None

                # Validate probability range
                if probability is not None:
                    if not (0.0 <= probability <= 1.0):
                        print(
                            f"Warning: Probability {probability} out of range for paper "
                            f"index {paper_index}, class {col_name}. Setting to None."
                        )
                        probability = None

                paper_results_dict[col_name] = probability
                res_idx += 1

        # Assign chosen classes
        chosen_classes_dict = ClassificationService.assign_chosen_class_per_paper(
            paper_results_dict, classification_names
        )

        # Merge and return
        return {**chosen_classes_dict, **paper_results_dict}


def create_classification_service(db_ctx: DBContext) -> ClassificationService:
    """Factory function to create ClassificationService with dependencies."""
    return ClassificationService(db_ctx.crud(ClassificationCrud))
