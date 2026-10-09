import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import Typography from "@mui/material/Typography";
import { PAPER_LIST_GUTTER } from "./columns";
import { ITEMS_PER_PAGE } from "./pagination";

type PaginationBarProps = {
  /** 1-based. */
  currentPage: number;
  pageCount: number;
  /** How many items the list has across all pages. */
  itemCount: number;
  onPageChange: (page: number) => void;
};

/**
 * The footer of a paginated list: which items are shown and the page links.
 * Hidden when everything fits on one page.
 */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  pageCount,
  itemCount,
  onPageChange,
}) => {
  if (pageCount <= 1) {
    return null;
  }
  const first = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const last = Math.min(currentPage * ITEMS_PER_PAGE, itemCount);
  return (
    <Box
      data-testid="pagination-card"
      sx={{
        // Stays in reach at the bottom of the window while scrolling a long page.
        position: "sticky",
        bottom: 0,
        zIndex: 2,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: { xs: "center", sm: "space-between" },
        gap: 1,
        px: PAPER_LIST_GUTTER,
        py: 1,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        borderBottomLeftRadius: "inherit",
        borderBottomRightRadius: "inherit",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {first}–{last} of {itemCount}
      </Typography>
      <Pagination
        count={pageCount}
        page={currentPage}
        onChange={(_, page) => onPageChange(page)}
        color="primary"
        siblingCount={1}
      />
    </Box>
  );
};
