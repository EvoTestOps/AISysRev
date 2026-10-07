import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTypedStoreState } from "../../state/store";
import { JobWithStats } from "../../state/types";
import { jobFields } from "./jobLabels";

/** How a job screens, as labelled fields: LLM, evaluation mode, prompting, screening mode. */
export const JobFields: React.FC<{ job: JobWithStats }> = ({ job }) => {
  const providerTitle = useTypedStoreState(
    (state) => state.providers.find((p) => p.name === job.llm_config.provider_name)?.title,
  );
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        columnGap: 3,
        rowGap: 1,
      }}
    >
      {jobFields(job, providerTitle).map((field) => (
        <Box key={field.key} sx={{ minWidth: 0 }} data-testid={`job-field-${field.key}`}>
          <Typography component="dt" variant="caption" color="text.secondary">
            {field.label}
          </Typography>
          <Tooltip title={field.tooltip} describeChild placement="bottom-start">
            <Typography component="dd" variant="body2" noWrap sx={{ m: 0, fontWeight: 500 }}>
              {field.value}
              {field.detail && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {" "}
                  · {field.detail}
                </Typography>
              )}
            </Typography>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );
};
