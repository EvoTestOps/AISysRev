import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Popper, { PopperProps } from "@mui/material/Popper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PromptVariable } from "../../state/types/prompt";
import { insertVariable, tokenizeTemplate, variableQueryAt } from "./promptTemplate";

type PopperInstance = NonNullable<
  Extract<PopperProps["popperRef"], { current: unknown }>["current"]
>;

type PromptTemplateEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The variables this prompt may use, in the order to offer them. */
  variables: PromptVariable[];
  /** Variables that must appear, marked in the toolbar. */
  required?: string[];
  readOnly?: boolean;
  minRows?: number;
  helperText?: React.ReactNode;
  error?: boolean;
  testId?: string;
};

// The textarea and the highlight layer behind it must lay text out identically.
const TEXT_LAYOUT = {
  m: 0,
  p: 1.5,
  border: 0,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 13,
  lineHeight: 1.6,
  letterSpacing: "normal",
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
  wordBreak: "break-word",
  tabSize: 4,
} as const;

/**
 * A prompt template editor: {{variables}} are highlighted (unknown ones in
 * red), the toolbar inserts them at the cursor, and typing {{ suggests them.
 */
export const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({
  label,
  value,
  onChange,
  variables,
  required = [],
  readOnly = false,
  minRows = 12,
  helperText,
  error = false,
  testId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Where the cursor was when the textarea lost focus, so toolbar clicks insert there.
  const selection = useRef({ start: value.length, end: value.length });
  const [query, setQuery] = useState<string | null>(null);
  // The cursor position the suggestions open under, as an index into the text.
  const [caretIndex, setCaretIndex] = useState(0);
  const caretRef = useRef<HTMLSpanElement>(null);
  // Follows the caret's on-screen position, measured from the hidden mirror below.
  const caretAnchor = useMemo(
    () => ({
      getBoundingClientRect: () =>
        (caretRef.current ?? containerRef.current)?.getBoundingClientRect() ?? new DOMRect(),
    }),
    [],
  );
  const popperRef = useRef<PopperInstance | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  // Where the cursor goes after an insert, once the new text is rendered.
  const pendingCursor = useRef<number | null>(null);

  // The textarea grows with its text instead of scrolling, so the highlight
  // layer behind it never has to follow a scroll position or a scrollbar.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
    // Before the browser handles the next keystroke, so typing continues after the variable.
    if (pendingCursor.current !== null) {
      el.focus();
      el.setSelectionRange(pendingCursor.current, pendingCursor.current);
      pendingCursor.current = null;
    }
  }, [value]);

  const allowed = useMemo(() => variables.map((v) => v.name), [variables]);
  const segments = useMemo(() => tokenizeTemplate(value, allowed), [value, allowed]);
  const suggestions = useMemo(
    () =>
      query === null
        ? []
        : variables.filter(
            (v) =>
              v.name.startsWith(query.toLowerCase()) ||
              v.label.toLowerCase().includes(query.toLowerCase()),
          ),
    [query, variables],
  );

  const rememberSelection = () => {
    const el = textareaRef.current;
    if (el) {
      selection.current = { start: el.selectionStart, end: el.selectionEnd };
    }
  };

  const updateQuery = () => {
    const el = textareaRef.current;
    if (!el || readOnly) return;
    rememberSelection();
    const next =
      el.selectionStart === el.selectionEnd ? variableQueryAt(el.value, el.selectionStart) : null;
    setQuery(next);
    setCaretIndex(el.selectionStart);
    setHighlighted(0);
  };

  // Re-place the suggestions as the caret moves while typing.
  useLayoutEffect(() => {
    popperRef.current?.update();
  }, [caretIndex, value]);

  const insert = (name: string) => {
    const { start, end } = selection.current;
    const result = insertVariable(value, start, end, name);
    onChange(result.text);
    setQuery(null);
    selection.current = { start: result.cursor, end: result.cursor };
    pendingCursor.current = result.cursor;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      rememberSelection();
      insert(suggestions[highlighted].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery(null);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="subtitle2" component="label" htmlFor={testId}>
        {label}
      </Typography>
      {!readOnly && variables.length > 0 && (
        <Box
          role="toolbar"
          aria-label={`Insert a variable into the ${label.toLowerCase()}`}
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}
        >
          <Typography variant="caption" color="textSecondary" sx={{ mr: 0.5 }}>
            Insert:
          </Typography>
          {variables.map((v) => (
            <Tooltip key={v.name} title={`{{${v.name}}}: ${v.description}`} describeChild>
              <Chip
                size="small"
                label={v.label}
                variant={required.includes(v.name) ? "filled" : "outlined"}
                color="primary"
                // Keep the textarea's selection: a mousedown would blur it first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(v.name)}
                data-testid={`insert-variable-${v.name}`}
              />
            </Tooltip>
          ))}
          <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>
            or type {"{{"}
          </Typography>
        </Box>
      )}
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          borderRadius: 1,
          border: 1,
          borderColor: error ? "error.main" : "divider",
          bgcolor: readOnly ? "grey.50" : "background.paper",
          "&:focus-within": {
            borderColor: error ? "error.main" : "primary.main",
            boxShadow: (theme) =>
              `0 0 0 1px ${error ? theme.palette.error.main : theme.palette.primary.main}`,
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            ...TEXT_LAYOUT,
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            color: "text.primary",
            pointerEvents: "none",
          }}
        >
          {segments.map((segment, i) =>
            segment.kind === "text" ? (
              <span key={i}>{segment.text}</span>
            ) : (
              <Box
                key={i}
                component="mark"
                sx={{
                  color: segment.known ? "primary.dark" : "error.main",
                  bgcolor: (theme) =>
                    alpha(
                      segment.known ? theme.palette.primary.main : theme.palette.error.main,
                      0.12,
                    ),
                  borderRadius: 0.5,
                  // No padding or bold: either would shift the text out of line with the textarea.
                }}
              >
                {segment.text}
              </Box>
            ),
          )}
          {/* A trailing newline needs something after it to take up a line. */}
          {"​"}
        </Box>
        {query !== null && (
          // The text up to the caret, laid out like the textarea, to find where the caret is.
          <Box
            aria-hidden
            sx={{
              ...TEXT_LAYOUT,
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              visibility: "hidden",
              pointerEvents: "none",
            }}
          >
            {value.slice(0, caretIndex)}
            <span ref={caretRef}>{"​"}</span>
          </Box>
        )}
        <Box
          component="textarea"
          id={testId}
          ref={textareaRef}
          data-testid={testId}
          value={value}
          readOnly={readOnly}
          rows={minRows}
          spellCheck={false}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            requestAnimationFrame(updateQuery);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={(e: React.KeyboardEvent) => {
            if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
              updateQuery();
            }
          }}
          onClick={updateQuery}
          onSelect={rememberSelection}
          onBlur={rememberSelection}
          aria-describedby={testId ? `${testId}-help` : undefined}
          sx={{
            ...TEXT_LAYOUT,
            position: "relative",
            display: "block",
            width: "100%",
            resize: "none",
            overflow: "hidden",
            outline: "none",
            bgcolor: "transparent",
            // The text shows through from the highlight layer; only the caret is drawn here.
            color: "transparent",
            caretColor: (theme) => theme.palette.text.primary,
            "&::selection": {
              color: "transparent",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.25),
            },
          }}
        />
        <Popper
          open={suggestions.length > 0}
          anchorEl={caretAnchor}
          popperRef={popperRef}
          placement="bottom-start"
          sx={{ zIndex: (theme) => theme.zIndex.modal }}
        >
          <ClickAwayListener onClickAway={() => setQuery(null)}>
            <Paper elevation={6} sx={{ mt: 0.5, maxHeight: 280, overflow: "auto", width: 360 }}>
              <List dense role="listbox" aria-label="Variables">
                {suggestions.map((v, i) => (
                  <ListItemButton
                    key={v.name}
                    role="option"
                    selected={i === highlighted}
                    aria-selected={i === highlighted}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insert(v.name)}
                    data-testid={`variable-suggestion-${v.name}`}
                  >
                    <ListItemText
                      primary={`{{${v.name}}}`}
                      secondary={v.description}
                      slotProps={{
                        primary: { sx: { fontFamily: TEXT_LAYOUT.fontFamily, fontSize: 13 } },
                        secondary: { sx: { fontSize: 12 } },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </ClickAwayListener>
        </Popper>
      </Box>
      {helperText && (
        <Box id={testId ? `${testId}-help` : undefined}>
          {typeof helperText === "string" ? (
            <Typography variant="caption" color={error ? "error" : "textSecondary"}>
              {helperText}
            </Typography>
          ) : (
            helperText
          )}
        </Box>
      )}
    </Box>
  );
};
