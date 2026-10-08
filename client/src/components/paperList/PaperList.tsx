import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { SortOption } from "../../helpers/sort";
import { PAPER_LIST_GUTTER } from "./columns";
import { PaginationBar } from "./PaginationBar";
import { PaperListHeader } from "./PaperListHeader";

type PaperListProps = {
  /** Above the column headings, e.g. a count and filters. */
  toolbar?: React.ReactNode;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  probabilityLabel?: string;
  loading: boolean;
  /** Shown in place of the rows, e.g. when the list failed to load. */
  error?: string | null;
  /** Shown when the list has no rows. */
  emptyMessage: string;
  emptyTestId?: string;
  pagination: {
    page: number;
    pageCount: number;
    itemCount: number;
    onPageChange: (page: number) => void;
  };
  /** The rows, e.g. PaperRows. */
  children: React.ReactNode;
};

/** A sortable, paginated list of papers on one surface, in the manner of a data table. */
export const PaperList: React.FC<PaperListProps> = ({
  toolbar,
  sortOption,
  onSortChange,
  probabilityLabel,
  loading,
  error,
  emptyMessage,
  emptyTestId,
  pagination,
  children,
}) => {
  const message = error ?? (!loading && pagination.itemCount === 0 ? emptyMessage : null);
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, minWidth: 0 }}>
      {toolbar && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: PAPER_LIST_GUTTER,
            py: 1.5,
          }}
        >
          {toolbar}
        </Box>
      )}
      <PaperListHeader
        sortOption={sortOption}
        onSortChange={onSortChange}
        probabilityLabel={probabilityLabel}
      />
      <Box sx={{ height: 4 }}>{loading && <LinearProgress sx={{ height: 4 }} />}</Box>
      {message ? (
        <Typography
          variant="body2"
          data-testid={error ? undefined : emptyTestId}
          sx={{
            px: PAPER_LIST_GUTTER,
            py: 6,
            textAlign: "center",
            color: error ? "error.main" : "text.secondary",
          }}
        >
          {message}
        </Typography>
      ) : (
        !loading && (
          // The pagination footer draws the line under the last row.
          <Box sx={{ "& > :last-child": { borderBottom: 0 } }}>{children}</Box>
        )
      )}
      {!loading && (
        <PaginationBar
          currentPage={pagination.page}
          pageCount={pagination.pageCount}
          itemCount={pagination.itemCount}
          onPageChange={pagination.onPageChange}
        />
      )}
    </Paper>
  );
};
