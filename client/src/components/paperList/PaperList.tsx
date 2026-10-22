import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { SxProps, Theme } from "@mui/material/styles";
import { SortOption } from "../../helpers/sort";
import { FadeIn } from "../FadeIn";
import { SkeletonGroup } from "../skeletons";
import { PAPER_LIST_COLUMNS, PAPER_LIST_GUTTER } from "./columns";
import { PaginationBar } from "./PaginationBar";
import { PaperListHeader } from "./PaperListHeader";

// Varied, so the placeholder reads as a list of titles rather than a block.
const SKELETON_TITLE_WIDTHS = ["72%", "58%", "85%", "64%", "77%", "52%", "69%", "81%"];

/** Stands in for a PaperRow while the list loads. */
const PaperRowSkeleton: React.FC<{ titleWidth: string }> = ({ titleWidth }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: PAPER_LIST_COLUMNS,
      columnGap: { xs: 1, md: 2 },
      alignItems: "center",
      px: PAPER_LIST_GUTTER,
      minHeight: 52,
      py: 1,
      borderBottom: 1,
      borderColor: "divider",
    }}
  >
    <Skeleton width={24} />
    <Skeleton width={titleWidth} />
    <Skeleton width={48} sx={{ justifySelf: "end" }} />
    <Skeleton variant="circular" width={20} height={20} sx={{ justifySelf: "end" }} />
  </Box>
);

const PaperRowSkeletons = () => (
  <SkeletonGroup sx={{ "& > :last-child": { borderBottom: 0 } }}>
    {SKELETON_TITLE_WIDTHS.map((width, i) => (
      <PaperRowSkeleton key={i} titleWidth={width} />
    ))}
  </SkeletonGroup>
);

/** Stands in for a whole PaperList, toolbar and headings included, e.g. before its page knows the project. */
export const PaperListSkeleton: React.FC<{ sx?: SxProps<Theme> }> = ({ sx }) => (
  <Paper
    variant="outlined"
    sx={[{ borderRadius: 2, minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: PAPER_LIST_GUTTER,
        py: 1.5,
      }}
    >
      <Typography variant="subtitle1">
        <Skeleton width={110} />
      </Typography>
      <Skeleton variant="rounded" width={220} height={32} />
    </Box>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: PAPER_LIST_COLUMNS,
        columnGap: { xs: 1, md: 2 },
        alignItems: "center",
        px: PAPER_LIST_GUTTER,
        minHeight: 48,
        borderTop: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Skeleton width={24} />
      <Skeleton width={48} />
      <Skeleton width={96} sx={{ justifySelf: "end" }} />
    </Box>
    <Box sx={{ height: 4 }} />
    <PaperRowSkeletons />
  </Paper>
);

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
  sx?: SxProps<Theme>;
  /**
   * The rows, e.g. PaperRows. While the list loads for the first time, skeleton
   * rows stand in for them; when it reloads, the rows stay under a progress bar.
   */
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
  sx,
  children,
}) => {
  // Nothing to show yet: skeleton rows. Rows already shown stay while the list reloads.
  const firstLoad = loading && pagination.itemCount === 0 && !error;
  const message = error ?? (!loading && pagination.itemCount === 0 ? emptyMessage : null);
  return (
    <Paper
      variant="outlined"
      sx={[{ borderRadius: 2, minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
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
      <Box sx={{ height: 4 }}>{loading && !firstLoad && <LinearProgress sx={{ height: 4 }} />}</Box>
      {firstLoad ? (
        <PaperRowSkeletons />
      ) : message ? (
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
        // Fades in when the rows arrive and on each new page. The pagination
        // footer draws the line under the last row.
        <FadeIn key={pagination.page} sx={{ "& > :last-child": { borderBottom: 0 } }}>
          {children}
        </FadeIn>
      )}
      {!firstLoad && (
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
