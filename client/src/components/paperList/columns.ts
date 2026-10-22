/**
 * Columns shared by a paper list's header and rows: ID, title, probability,
 * expand icon. The title column is minmax(0, 1fr) so long titles truncate
 * instead of widening the page.
 */
export const PAPER_LIST_COLUMNS = {
  xs: "44px minmax(0, 1fr) 56px 24px",
  md: "64px minmax(0, 1fr) 176px 40px",
};

/** Horizontal padding of the list's header, rows and footer. */
export const PAPER_LIST_GUTTER = { xs: 2, md: 3 };
