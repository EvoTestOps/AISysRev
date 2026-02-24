import io
import logging

import pandas as pd
from charset_normalizer import from_bytes

logger = logging.getLogger(__name__)


def read_csv_resilient(raw_bytes: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes), encoding="utf-8-sig")
        logger.info("CSV decoded as utf-8-sig")
        return df
    except UnicodeDecodeError:
        logger.warning("UTF-8 decode failed, attempting auto detection")

    matches = from_bytes(raw_bytes)
    best = matches.best()
    if best is None:
        logger.error("Encoding detection failed completely")
        raise ValueError("Could not determine file encoding")

    logger.info(
        "Detected encoding with charset-normalizer: %s",
        best.encoding,
    )

    return pd.read_csv(io.StringIO(str(best)))
