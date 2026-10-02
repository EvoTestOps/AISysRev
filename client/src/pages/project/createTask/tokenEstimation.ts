import { JobPromptingType, TokenEstimation } from "../../../state/types";
import { PromptingStrategy, ScreeningMethod } from "./useCreateTaskForm";

const INPUT_TOKENS_PER_PAPER = 1880;
const OUTPUT_TOKENS_PER_PAPER = 1300;
const FEW_SHOT_MULTIPLIER = 1.4;

export const estimateTokens = ({
  paperCount,
  criteriaCount,
  screeningMethod,
  promptingStrategy,
}: {
  paperCount: number;
  criteriaCount: number;
  screeningMethod: ScreeningMethod;
  promptingStrategy: PromptingStrategy;
}): TokenEstimation => {
  if (screeningMethod === ScreeningMethod.JEV) {
    // One request per paper; Jev's output tokens are free.
    return {
      estimated_input_tokens: Math.round(paperCount * INPUT_TOKENS_PER_PAPER),
      estimated_output_tokens: null,
    };
  }
  const inputMultiplier =
    promptingStrategy === JobPromptingType.PER_CRITERIA
      ? criteriaCount
      : promptingStrategy === JobPromptingType.FEW_SHOT
        ? FEW_SHOT_MULTIPLIER
        : 1;
  return {
    estimated_input_tokens: Math.round(paperCount * INPUT_TOKENS_PER_PAPER * inputMultiplier),
    estimated_output_tokens: Math.round(paperCount * OUTPUT_TOKENS_PER_PAPER),
  };
};
