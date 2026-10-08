import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

const CriteriaGroup: React.FC<{
  title: string;
  idPrefix: "IC" | "EC";
  criteria: string[];
  color: "success" | "error";
  testId?: string;
}> = ({ title, idPrefix, criteria, color, testId }) => (
  <Box>
    <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
      {title}
    </Typography>
    <Box
      component="ol"
      data-testid={testId}
      sx={{
        m: 0,
        p: 0,
        listStyle: "none",
        borderRadius: 2,
        border: 1,
        borderColor: (theme) => alpha(theme.palette[color].main, 0.25),
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.05),
      }}
    >
      {criteria.length === 0 && (
        <Typography component="li" variant="body2" sx={{ px: 2, py: 1.5, color: "text.secondary" }}>
          No criteria.
        </Typography>
      )}
      {criteria.map((text, i) => (
        <Box
          component="li"
          key={i}
          sx={{
            display: "flex",
            gap: 1.5,
            px: 2,
            py: 1.25,
            "& + &": {
              borderTop: 1,
              borderColor: (theme) => alpha(theme.palette[color].main, 0.15),
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: `${color}.dark`, minWidth: 24, lineHeight: "20px" }}
          >
            {idPrefix}
            {i + 1}
          </Typography>
          <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
            {text}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

type CriteriaPanelProps = {
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  inclusionTestId?: string;
  exclusionTestId?: string;
};

/** The project's inclusion and exclusion criteria, beside a list of papers. */
export const CriteriaPanel: React.FC<CriteriaPanelProps> = ({
  inclusionCriteria,
  exclusionCriteria,
  inclusionTestId,
  exclusionTestId,
}) => (
  <Paper
    variant="outlined"
    component="aside"
    aria-labelledby="criteria-panel-title"
    sx={{
      borderRadius: 2,
      p: { xs: 2, md: 2.5 },
      display: "flex",
      flexDirection: "column",
      gap: 2.5,
      position: { lg: "sticky" },
      top: 16,
    }}
  >
    <Typography
      id="criteria-panel-title"
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 600 }}
    >
      Criteria
    </Typography>
    <CriteriaGroup
      title="Inclusion criteria"
      idPrefix="IC"
      criteria={inclusionCriteria}
      color="success"
      testId={inclusionTestId}
    />
    <CriteriaGroup
      title="Exclusion criteria"
      idPrefix="EC"
      criteria={exclusionCriteria}
      color="error"
      testId={exclusionTestId}
    />
  </Paper>
);
