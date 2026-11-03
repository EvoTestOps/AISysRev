import type { PromptTypeVariables } from "../../state/types/prompt";

// The server's {{ name }} syntax (src/core/prompt_template.py), whitespace inside the braces allowed.
export const VARIABLE_SOURCE = String.raw`\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}`;

/** The variable names a template uses, in order of first use. */
export const findVariables = (template: string): string[] => {
  const names = Array.from(template.matchAll(new RegExp(VARIABLE_SOURCE, "g")), (m) => m[1]);
  return [...new Set(names)];
};

export type TemplateIssue = { kind: "error" | "missing"; message: string };

/** What stops the prompt from working, in the server's words; empty when it's valid. */
export const validateTemplate = (
  typeVariables: PromptTypeVariables,
  systemPrompt: string,
  userPrompt: string,
): TemplateIssue[] => {
  const issues: TemplateIssue[] = [];
  const systemPromptVariables = findVariables(systemPrompt);
  const userPromptVariables = findVariables(userPrompt);
  for (const name of systemPromptVariables) {
    issues.push({
      kind: "error",
      message: `The system prompt can't contain variables; found {{${name}}}`,
    });
  }
  for (const name of userPromptVariables) {
    if (!typeVariables.allowed.includes(name)) {
      issues.push({ kind: "error", message: `Unknown variable {{${name}}}` });
    }
  }
  for (const name of typeVariables.required) {
    if (!userPromptVariables.includes(name)) {
      issues.push({ kind: "missing", message: `The user prompt must contain {{${name}}}` });
    }
  }
  if (
    typeVariables.requires_criteria &&
    !userPromptVariables.includes("criteria") &&
    !(
      userPromptVariables.includes("inclusion_criteria") &&
      userPromptVariables.includes("exclusion_criteria")
    )
  ) {
    issues.push({
      kind: "missing",
      message:
        "The user prompt must contain {{criteria}}, or both {{inclusion_criteria}} and {{exclusion_criteria}}",
    });
  }
  return issues;
};

/**
 * The change that inserts {{name}} at the selection, replacing the "{{partial"
 * typed before it if any.
 */
export const insertVariable = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: string,
): { from: number; to: number; insert: string } => {
  const partial = /\{\{\s*[A-Za-z0-9_]*$/.exec(text.slice(0, selectionStart));
  // Completing a "{{partial", swallow the "}}" the user may already have typed after it.
  const closing = partial ? /^\s*\}\}/.exec(text.slice(selectionEnd)) : null;
  return {
    from: partial ? selectionStart - partial[0].length : selectionStart,
    to: selectionEnd + (closing ? closing[0].length : 0),
    insert: `{{${name}}}`,
  };
};
