import { ScreeningTarget } from "../state/types";

/** What a project screens, in words, e.g. "paper" and "papers". */
export const ITEM_NAMES: Record<ScreeningTarget, { singular: string; plural: string }> = {
  [ScreeningTarget.PAPER]: { singular: "paper", plural: "papers" },
  [ScreeningTarget.GITHUB_REPOSITORY]: { singular: "repository", plural: "repositories" },
};

/**
 * Where an item's identifier links to. A paper's DOI resolves on doi.org; a
 * repository's identifier is its URL, so it is linked only when it is one.
 */
export const itemHref = (identifier: string, screeningTarget: ScreeningTarget) => {
  switch (screeningTarget) {
    case ScreeningTarget.PAPER:
      return encodeURI(`https://doi.org/${identifier}`);
    case ScreeningTarget.GITHUB_REPOSITORY:
      return /^https?:\/\//i.test(identifier) ? identifier : undefined;
  }
};
