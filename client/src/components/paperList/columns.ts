/**
 * Columns shared by a paper list's header and rows: ID, title, probability,
 * expand icon. The title column is minmax(0, 1fr) so long titles truncate
 * instead of widening the page.
 */
export const PAPER_LIST_COLUMNS = {
  xs: "44px minmax(0, 1fr) 96px 40px",
  md: "60px minmax(0, 1fr) 200px 40px",
};
