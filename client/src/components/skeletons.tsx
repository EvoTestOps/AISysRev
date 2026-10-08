import Box, { BoxProps } from "@mui/material/Box";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";

/*
 * Placeholders in the shape of the content they stand in for, shown while that
 * content loads. Each mirrors the sizes of its real counterpart, so the page
 * doesn't shift when the content arrives.
 */

/** Marks a placeholder as loading for assistive technology. */
export const SkeletonGroup: React.FC<BoxProps> = (props) => (
  <Box aria-busy="true" aria-label="Loading" {...props} />
);

/** Stands in for NavTabs, e.g. a project's tabs. */
export const TabsSkeleton: React.FC<{ widths?: number[] }> = ({ widths = [130, 140] }) => (
  <Box
    aria-hidden
    sx={{
      mb: 2,
      minHeight: 48,
      display: "flex",
      alignItems: "center",
      gap: 4,
      px: 2,
      borderBottom: 1,
      borderColor: "divider",
    }}
  >
    {widths.map((width, i) => (
      <Skeleton key={i} width={width} />
    ))}
  </Box>
);

/** Stands in for JobBreadcrumbs: the back arrow and the path to the page. */
export const BreadcrumbsSkeleton = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 34 }}>
    <Skeleton variant="circular" width={28} height={28} />
    <Skeleton width={280} sx={{ maxWidth: "60vw" }} />
  </Box>
);

/** The labelled fields of a job, e.g. its model and prompting. */
const JobFieldsSkeleton = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      columnGap: 3,
      rowGap: 1,
    }}
  >
    {[0, 1, 2, 3].map((i) => (
      <Box key={i}>
        <Typography variant="caption" component="div">
          <Skeleton width="40%" />
        </Typography>
        <Typography variant="body2" component="div">
          <Skeleton width="75%" />
        </Typography>
      </Box>
    ))}
  </Box>
);

/** Stands in for a screening task's card, or the summary card on its page. */
export const JobCardSkeleton = () => (
  <Card sx={{ borderRadius: 2, px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
      <Typography variant="subtitle1">
        <Skeleton width={160} />
      </Typography>
      <JobFieldsSkeleton />
    </Box>
    <Skeleton variant="rounded" width={224} height={32} sx={{ flexShrink: 0 }} />
  </Card>
);

/** Stands in for CriteriaPanel. */
export const CriteriaPanelSkeleton = () => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 2,
      p: { xs: 2, md: 2.5 },
      display: "flex",
      flexDirection: "column",
      gap: 2.5,
    }}
  >
    <Typography variant="subtitle1">
      <Skeleton width={80} />
    </Typography>
    {[0, 1].map((group) => (
      <Box key={group}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          <Skeleton width={130} />
        </Typography>
        <Skeleton variant="rounded" height={112} />
      </Box>
    ))}
  </Paper>
);

/** Stands in for an outlined section with a heading and a few rows, e.g. on the settings pages. */
export const SectionSkeleton: React.FC<{ rows?: number }> = ({ rows = 2 }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2 }}>
    <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
      <Typography variant="h6">
        <Skeleton width={180} />
      </Typography>
      <Typography variant="body2">
        <Skeleton width="55%" />
      </Typography>
    </Box>
    <Box sx={{ px: 1 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Box
          key={i}
          sx={{
            px: 2,
            py: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderBottom: i < rows - 1 ? 1 : 0,
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">
              <Skeleton width={160} />
            </Typography>
            <Typography variant="body2">
              <Skeleton width={260} sx={{ maxWidth: "100%" }} />
            </Typography>
          </Box>
          <Skeleton variant="rounded" width={96} height={36} />
        </Box>
      ))}
    </Box>
  </Paper>
);

/** Stands in for a card of text, e.g. a paper's abstract. */
export const TextCardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <Card sx={{ borderRadius: 2, p: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
    <Typography variant="h6">
      <Skeleton width="45%" />
    </Typography>
    {Array.from({ length: lines }, (_, i) => (
      <Typography key={i} variant="body2">
        <Skeleton width={i === lines - 1 ? "60%" : "100%"} />
      </Typography>
    ))}
  </Card>
);
