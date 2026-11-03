import { describe, expect, it } from "vitest";
import { JobPromptingType } from "../../state/types";
import type { PromptTypeVariables } from "../../state/types/prompt";
import {
  findVariables,
  insertVariable,
  renderTemplate,
  tokenizeTemplate,
  validateTemplate,
  variableQueryAt,
} from "./promptTemplate";

const ZERO_SHOT: PromptTypeVariables = {
  prompting_type: JobPromptingType.ZERO_SHOT,
  allowed: [
    "title",
    "abstract",
    "content_label",
    "criteria",
    "inclusion_criteria",
    "exclusion_criteria",
    "additional_instructions",
  ],
  required: ["title", "abstract"],
  requires_criteria: true,
};

const messages = (system: string, user: string) =>
  validateTemplate(ZERO_SHOT, system, user).map((i) => i.message);

describe("renderTemplate", () => {
  it("fills in variables, with or without whitespace inside the braces", () => {
    expect(renderTemplate("{{title}} | {{ abstract }}", { title: "T", abstract: "A" })).toBe(
      "T | A",
    );
  });

  it("substitutes each value once and leaves unknown variables alone", () => {
    expect(renderTemplate("{{title}} {{nope}}", { title: "{{abstract}}", abstract: "x" })).toBe(
      "{{abstract}} {{nope}}",
    );
  });
});

describe("findVariables", () => {
  it("lists each variable once, in order of first use", () => {
    expect(findVariables("{{b}} {{a}} {{ b }}")).toEqual(["b", "a"]);
  });
});

describe("validateTemplate", () => {
  it("accepts a complete prompt", () => {
    expect(messages("System", "{{title}} {{abstract}} {{criteria}}")).toEqual([]);
  });

  it("accepts both criteria lists in place of {{criteria}}", () => {
    expect(
      messages("", "{{title}} {{abstract}} {{inclusion_criteria}} {{exclusion_criteria}}"),
    ).toEqual([]);
  });

  it("reports unknown, missing and system prompt variables", () => {
    const issues = validateTemplate(ZERO_SHOT, "Hi {{title}}", "{{title}} {{criterion}}");
    expect(issues.filter((i) => i.kind === "error").map((i) => i.message)).toEqual([
      "The system prompt can't contain variables; found {{title}}",
      "Unknown variable {{criterion}}",
    ]);
    expect(issues.filter((i) => i.kind === "missing").map((i) => i.message)).toEqual([
      "The user prompt must contain {{abstract}}",
      "The user prompt must contain {{criteria}}, or both {{inclusion_criteria}} and {{exclusion_criteria}}",
    ]);
  });
});

describe("tokenizeTemplate", () => {
  it("splits text and variables, marking unknown ones", () => {
    expect(tokenizeTemplate("A {{title}} B {{x}}", ["title"])).toEqual([
      { kind: "text", text: "A " },
      { kind: "variable", text: "{{title}}", name: "title", known: true },
      { kind: "text", text: " B " },
      { kind: "variable", text: "{{x}}", name: "x", known: false },
    ]);
  });
});

describe("variableQueryAt", () => {
  it("finds the partial name typed after an unclosed {{", () => {
    expect(variableQueryAt("Title: {{ti", 11)).toBe("ti");
    expect(variableQueryAt("Title: {{", 9)).toBe("");
  });

  it("is null outside a variable", () => {
    expect(variableQueryAt("Title: {{title}} ", 17)).toBeNull();
    expect(variableQueryAt("plain text", 5)).toBeNull();
  });
});

describe("insertVariable", () => {
  it("inserts at the cursor, replacing a selection", () => {
    expect(insertVariable("Hello world", 6, 11, "title")).toEqual({
      text: "Hello {{title}}",
      cursor: 15,
    });
  });

  it("completes a partly typed variable", () => {
    expect(insertVariable("A {{ab B", 6, 6, "abstract")).toEqual({
      text: "A {{abstract}} B",
      cursor: 14,
    });
  });

  it("doesn't double the closing braces the user already typed", () => {
    expect(insertVariable("A {{ab}} B", 6, 6, "abstract").text).toBe("A {{abstract}} B");
  });

  it("leaves following braces alone when not completing a variable", () => {
    expect(insertVariable("A }} B", 2, 2, "title").text).toBe("A {{title}}}} B");
  });
});
