import { describe, expect, it } from "vitest";
import { buildPostPromptVariables, formatSourcesText, normalizePostPromptConfig, shouldApplyPostPrompt } from "./post-prompt";

describe("post-prompt", () => {
  it("shouldApplyPostPrompt detects non-empty strings", () => {
    expect(shouldApplyPostPrompt(undefined)).toBe(false);
    expect(shouldApplyPostPrompt(null)).toBe(false);
    expect(shouldApplyPostPrompt("")).toBe(false);
    expect(shouldApplyPostPrompt("   ")).toBe(false);
    expect(shouldApplyPostPrompt("Rewrite it")).toBe(true);
  });

  it("formatSourcesText formats up to 5 citations", () => {
    const text = formatSourcesText([
      { url: "https://a.example" },
      { url: "https://b.example", title: "B" },
      { url: "https://c.example" },
      { url: "https://d.example" },
      { url: "https://e.example" },
      { url: "https://f.example" },
    ]);
    expect(text).toContain("Sources:");
    expect(text).toContain("https://a.example");
    expect(text).toContain("- B: https://b.example");
    expect(text).not.toContain("https://f.example");
  });

  it("buildPostPromptVariables adds output + meta and overrides base keys", () => {
    const vars = buildPostPromptVariables({
      baseVariables: { output: "old", other: "1" },
      output: "new-output",
      citations: [{ url: "https://a.example" }],
      usedWebSearch: true,
      llmModel: "gpt-5-mini",
    });
    expect(vars.other).toBe("1");
    expect(vars.output).toBe("new-output");
    expect(vars.used_web_search).toBe("true");
    expect(vars.llm_model).toBe("gpt-5-mini");
    expect(vars.sources_json).toContain("https://a.example");
  });

  it("normalizePostPromptConfig disables blank templates with a warning", () => {
    expect(normalizePostPromptConfig({ enabled: false, template: "" })).toEqual({
      enabled: false,
      template: "",
      warning: null,
    });

    expect(normalizePostPromptConfig({ enabled: true, template: "" })).toEqual({
      enabled: false,
      template: "",
      warning: "Post prompt is enabled but empty; skipping.",
    });

    expect(normalizePostPromptConfig({ enabled: true, template: "Rewrite" })).toEqual({
      enabled: true,
      template: "Rewrite",
      warning: null,
    });
  });
});
