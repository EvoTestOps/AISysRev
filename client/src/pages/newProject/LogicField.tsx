import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

type LogicFieldProps = {
  label: string;
  idPrefix: "IC" | "EC";
  criteria: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  defaultHelp: string;
};

/** A boolean expression over criterion ids, with the ids it can use. */
export const LogicField: React.FC<LogicFieldProps> = ({
  label,
  idPrefix,
  criteria,
  value,
  onChange,
  placeholder,
  defaultHelp,
}) => (
  <Stack spacing={1}>
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      helperText={value.trim() === "" ? defaultHelp : " "}
      size="small"
      fullWidth
      // Keep the label floated so the example syntax (placeholder) always shows.
      slotProps={{
        htmlInput: { style: { fontFamily: "monospace" } },
        inputLabel: { shrink: true },
      }}
    />
    {criteria.length > 0 && (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {criteria.map((criterion, i) => (
          <Tooltip key={i} title={criterion} describeChild>
            <Chip
              label={`${idPrefix}${i + 1}`}
              size="small"
              variant="outlined"
              sx={{ fontFamily: "monospace" }}
              onClick={() =>
                onChange(
                  value.trim() === "" ? `${idPrefix}${i + 1}` : `${value} ${idPrefix}${i + 1}`,
                )
              }
            />
          </Tooltip>
        ))}
      </Stack>
    )}
  </Stack>
);
