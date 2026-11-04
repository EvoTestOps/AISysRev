import {
  acceptCompletion,
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { Prec } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, type Theme, useTheme } from "@mui/material/styles";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";
import type { PromptVariable } from "../../state/types/prompt";
import { insertVariable, VARIABLE_SOURCE } from "./promptTemplate";

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
  helperText?: string;
  error?: boolean;
  testId?: string;
};

const FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const knownVariable = Decoration.mark({ class: "cm-variable cm-variable-known" });
const unknownVariable = Decoration.mark({ class: "cm-variable cm-variable-unknown" });

/** Marks each {{variable}}, unknown ones differently. */
const variableHighlighter = (allowed: string[]) => {
  const decorator = new MatchDecorator({
    regexp: new RegExp(VARIABLE_SOURCE, "g"),
    decoration: (match) => (allowed.includes(match[1]) ? knownVariable : unknownVariable),
  });
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        this.decorations = decorator.updateDeco(update, this.decorations);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
};

/** Puts {{name}} at the selection, completing a "{{partial" typed before it. */
const insertAtSelection = (view: EditorView, name: string) => {
  const { from, to } = view.state.selection.main;
  const change = insertVariable(view.state.doc.toString(), from, to, name);
  view.dispatch({
    changes: change,
    selection: { anchor: change.from + change.insert.length },
    scrollIntoView: true,
  });
  view.focus();
};

/** Suggests the variables after a typed {{, matching by name or label. */
const variableCompletions =
  (variables: PromptVariable[]) =>
  (context: CompletionContext): CompletionResult | null => {
    const typed = context.matchBefore(/\{\{\s*[A-Za-z0-9_]*$/);
    if (!typed) return null;
    const query = typed.text.replace(/^\{\{\s*/, "").toLowerCase();
    return {
      from: typed.from,
      filter: false,
      options: variables
        .filter((v) => v.name.startsWith(query) || v.label.toLowerCase().includes(query))
        .map((v) => ({
          label: `{{${v.name}}}`,
          detail: v.label,
          info: v.description,
          apply: (view: EditorView) => insertAtSelection(view, v.name),
        })),
    };
  };

const editorTheme = (theme: Theme, error: boolean, readOnly: boolean, minRows: number) => {
  const accent = error ? theme.palette.error.main : theme.palette.primary.main;
  return EditorView.theme(
    {
      "&": {
        fontSize: "13px",
        color: theme.palette.text.primary,
        backgroundColor: readOnly ? theme.palette.grey[50] : theme.palette.background.paper,
        border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
        borderRadius: `${theme.shape.borderRadius}px`,
      },
      "&.cm-focused": { outline: "none", borderColor: accent, boxShadow: `0 0 0 1px ${accent}` },
      ".cm-scroller": { fontFamily: FONT_FAMILY, lineHeight: 1.6 },
      ".cm-content": { padding: "12px", minHeight: `calc(${minRows} * 1.6em + 24px)` },
      ".cm-line": { padding: 0 },
      ".cm-cursor": { borderLeftColor: theme.palette.text.primary },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: alpha(theme.palette.primary.main, 0.25),
      },
      ".cm-variable": { borderRadius: "2px" },
      ".cm-variable-known": {
        color: theme.palette.primary.dark,
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
      },
      ".cm-variable-unknown": {
        color: theme.palette.error.main,
        backgroundColor: alpha(theme.palette.error.main, 0.12),
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: FONT_FAMILY, maxHeight: "280px" },
    },
    { dark: theme.palette.mode === "dark" },
  );
};

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
  const theme = useTheme();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const labelId = testId ? `${testId}-label` : undefined;
  const helpId = testId ? `${testId}-help` : undefined;
  const hasHelp = Boolean(helperText);

  const extensions = useMemo(
    () => [
      EditorView.lineWrapping,
      variableHighlighter(variables.map((v) => v.name)),
      autocompletion({ override: [variableCompletions(variables)], icons: false }),
      Prec.highest(keymap.of([{ key: "Tab", run: acceptCompletion }])),
      EditorView.contentAttributes.of({
        ...(labelId && { "aria-labelledby": labelId }),
        ...(hasHelp && helpId && { "aria-describedby": helpId }),
        ...(testId && { "data-testid": testId }),
      }),
    ],
    [variables, labelId, helpId, testId, hasHelp],
  );
  const themeExtension = useMemo(
    () => editorTheme(theme, error, readOnly, minRows),
    [theme, error, readOnly, minRows],
  );

  const insert = (name: string) => {
    const view = editorRef.current?.view;
    if (view) insertAtSelection(view, name);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="subtitle2" id={labelId}>
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
                // Keep the editor's selection: a mousedown would blur it first.
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
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        editable={!readOnly}
        theme={themeExtension}
        extensions={extensions}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          highlightSelectionMatches: false,
          bracketMatching: false,
          closeBrackets: false,
          autocompletion: false,
          completionKeymap: false,
          syntaxHighlighting: false,
          indentOnInput: false,
          lintKeymap: false,
          foldKeymap: false,
        }}
      />
      {helperText && (
        <Typography id={helpId} variant="caption" color={error ? "error" : "textSecondary"}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};
