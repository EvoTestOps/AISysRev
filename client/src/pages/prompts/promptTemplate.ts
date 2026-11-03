import type { PromptTypeVariables } from "../../state/types/prompt";

// The server's {{ name }} syntax (src/core/prompt_template.py), whitespace inside the braces allowed.
const VARIABLE_SOURCE = String.raw`\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}`;

/** The variable names a template uses, in order of first use. */
export const findVariables = (template: string): string[] => {
  const names = Array.from(template.matchAll(new RegExp(VARIABLE_SOURCE, "g")), (m) => m[1]);
  return [...new Set(names)];
};

/** Substitutes each {{variable}} once; unknown variables are left as they are. */
export const renderTemplate = (template: string, values: Record<string, string>): string =>
  template.replace(new RegExp(VARIABLE_SOURCE, "g"), (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match,
  );

export type TemplateIssue = { kind: "error" | "missing"; message: string };

/** What stops the prompt from working, in the server's words; empty when it's valid. */
export const validateTemplate = (
  typeVariables: PromptTypeVariables,
  systemPrompt: string,
  userPrompt: string,
): TemplateIssue[] => {
  const issues: TemplateIssue[] = [];
  for (const name of findVariables(systemPrompt)) {
    issues.push({
      kind: "error",
      message: `The system prompt can't contain variables; found {{${name}}}`,
    });
  }
  const used = findVariables(userPrompt);
  for (const name of used) {
    if (!typeVariables.allowed.includes(name)) {
      issues.push({ kind: "error", message: `Unknown variable {{${name}}}` });
    }
  }
  for (const name of typeVariables.required) {
    if (!used.includes(name)) {
      issues.push({ kind: "missing", message: `The user prompt must contain {{${name}}}` });
    }
  }
  if (
    typeVariables.requires_criteria &&
    !used.includes("criteria") &&
    !(used.includes("inclusion_criteria") && used.includes("exclusion_criteria"))
  ) {
    issues.push({
      kind: "missing",
      message:
        "The user prompt must contain {{criteria}}, or both {{inclusion_criteria}} and {{exclusion_criteria}}",
    });
  }
  return issues;
};

export type TemplateSegment =
  | { kind: "text"; text: string }
  | { kind: "variable"; text: string; name: string; known: boolean };

/** The template split into plain text and variables, for highlighting. */
export const tokenizeTemplate = (template: string, allowed: string[]): TemplateSegment[] => {
  const segments: TemplateSegment[] = [];
  let last = 0;
  for (const match of template.matchAll(new RegExp(VARIABLE_SOURCE, "g"))) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ kind: "text", text: template.slice(last, start) });
    }
    segments.push({
      kind: "variable",
      text: match[0],
      name: match[1],
      known: allowed.includes(match[1]),
    });
    last = start + match[0].length;
  }
  if (last < template.length) {
    segments.push({ kind: "text", text: template.slice(last) });
  }
  return segments;
};

/**
 * The partial variable name being typed right before the cursor, e.g. "abs"
 * for "...{{abs|", or null when the cursor isn't inside an unclosed {{.
 */
export const variableQueryAt = (text: string, cursor: number): string | null => {
  const match = /\{\{\s*([A-Za-z0-9_]*)$/.exec(text.slice(0, cursor));
  return match ? match[1] : null;
};

/**
 * Inserts {{name}} at the cursor, replacing the "{{partial" typed before it if
 * any. Returns the new text and where the cursor goes.
 */
export const insertVariable = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: string,
): { text: string; cursor: number } => {
  const before = text.slice(0, selectionStart);
  const partial = /\{\{\s*[A-Za-z0-9_]*$/.exec(before);
  const start = partial ? selectionStart - partial[0].length : selectionStart;
  // Completing a "{{partial", swallow the "}}" the user may already have typed after it.
  const after = partial
    ? text.slice(selectionEnd).replace(/^\s*\}\}/, "")
    : text.slice(selectionEnd);
  const token = `{{${name}}}`;
  return { text: text.slice(0, start) + token + after, cursor: start + token.length };
};
