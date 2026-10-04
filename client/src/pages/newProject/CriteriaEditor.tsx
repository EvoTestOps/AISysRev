import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";

type CriteriaEditorProps = {
  title: string;
  description: string;
  /** Id prefix of the criteria, e.g. IC for IC1, IC2… */
  idPrefix: "IC" | "EC";
  /** Field label for adding a criterion, e.g. "Add inclusion criterion". */
  inputLabel: string;
  inputTestId: string;
  criteria: string[];
  onAdd: (criterion: string) => void;
  onDelete: (index: number) => void;
};

/** A list of criteria, numbered like the prompts number them, and a field to add more. */
export const CriteriaEditor: React.FC<CriteriaEditorProps> = ({
  title,
  description,
  idPrefix,
  inputLabel,
  inputTestId,
  criteria,
  onAdd,
  onDelete,
}) => {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (draft.trim() !== "") {
      onAdd(draft);
      setDraft("");
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {criteria.length > 0 && (
        <List dense disablePadding>
          {criteria.map((criterion, index) => (
            <ListItem
              key={`${index}_${criterion}`}
              divider
              secondaryAction={
                <Tooltip title="Remove">
                  <IconButton
                    edge="end"
                    aria-label={`Remove ${idPrefix}${index + 1}`}
                    onClick={() => onDelete(index)}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <Chip
                label={`${idPrefix}${index + 1}`}
                size="small"
                variant="outlined"
                sx={{ mr: 1.5, fontFamily: "monospace", fontWeight: 600 }}
              />
              <ListItemText primary={criterion} sx={{ wordBreak: "break-word" }} />
            </ListItem>
          ))}
        </List>
      )}
      <TextField
        label={inputLabel}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        helperText="Press Enter to add."
        size="small"
        fullWidth
        slotProps={{
          htmlInput: { "data-testid": inputTestId },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Add">
                  <span>
                    <IconButton
                      aria-label={inputLabel}
                      edge="end"
                      disabled={draft.trim() === ""}
                      onClick={add}
                    >
                      <AddIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    </Stack>
  );
};
