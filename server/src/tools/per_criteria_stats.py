# Modified from command line version (AISysRevCmdLine)
# https://github.com/EvoTestOps/AISysRevCmdLine/blob/main/screen_boolean.py

from typing import Optional

import krippendorff
import numpy as np

# import pandas as pd
# from irrCAC.raw import CAC


def compute_criterion_irr(
    probs_by_rater: dict[str, dict[str, Optional[float]]],
) -> dict:
    if len(probs_by_rater) < 2:
        return {
            "krippendorff_alpha": None,
            "percent_agreement": None,
            "gwet_ac1": None,
            "n_papers": 0,
        }

    rater_ids = sorted(probs_by_rater.keys())
    all_papers = sorted({p for rater in probs_by_rater.values() for p in rater})

    matrix = np.full((len(rater_ids), len(all_papers)), np.nan)
    for r, rater_id in enumerate(rater_ids):
        for p, paper_uuid in enumerate(all_papers):
            prob = probs_by_rater[rater_id].get(paper_uuid)
            if prob is not None:
                matrix[r, p] = prob

    n_papers = int(np.sum(np.sum(~np.isnan(matrix), axis=0) >= 2))

    alpha = None
    try:
        alpha = round(
            float(krippendorff.alpha(matrix, level_of_measurement="interval")), 4
        )
    except Exception:
        pass

    binary = (matrix >= 0.5).astype(float)
    binary[np.isnan(matrix)] = np.nan

    pct_agreement = None
    agree = total = 0
    for p in range(binary.shape[1]):
        col = binary[:, p][~np.isnan(binary[:, p])]
        if len(col) >= 2:
            total += 1
            if len(set(col.tolist())) == 1:
                agree += 1
    if total > 0:
        pct_agreement = round(agree / total, 4)

    ac1 = None
    # try:
    #     binary_df = pd.DataFrame(binary.T, columns=rater_ids)
    #     cac = CAC(binary_df, categories=[0, 1])
    #     ac1 = round(float(cac.gwet()["est"]["coefficient_value"]), 4)
    # except Exception:
    #     pass

    return {
        "krippendorff_alpha": alpha,
        "percent_agreement": pct_agreement,
        "gwet_ac1": ac1,
        "n_papers": n_papers,
    }
