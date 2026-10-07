import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";

type PaginationBarProps = {
  /** 1-based. */
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

/** Page links for a paginated list; hidden when everything fits on one page. */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  pageCount,
  onPageChange,
}) => {
  if (pageCount <= 1) {
    return null;
  }
  return (
    <Paper
      elevation={3}
      data-testid="pagination-card"
      sx={{
        position: "sticky",
        bottom: 24,
        mt: 4,
        py: 1.5,
        display: "flex",
        justifyContent: "center",
        borderRadius: 2,
      }}
    >
      <Pagination
        count={pageCount}
        page={currentPage}
        onChange={(_, page) => onPageChange(page)}
        color="primary"
        shape="rounded"
        siblingCount={2}
      />
    </Paper>
  );
};
