type Citation = { url: string; title?: string };

export type PostPromptConfig = {
  enabled: boolean;
  template: string;
  warning: string | null;
};

export function shouldApplyPostPrompt(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizePostPromptConfig(input: {
  enabled: boolean | null | undefined;
  template: string | null | undefined;
}): PostPromptConfig {
  const template = typeof input.template === "string" ? input.template : "";
  const wantEnabled = input.enabled === true;
  const hasTemplate = template.trim().length > 0;
  const enabled = wantEnabled && hasTemplate;
  const warning = wantEnabled && !hasTemplate ? "Post prompt is enabled but empty; skipping." : null;
  return { enabled, template, warning };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[]";
  }
}

export function formatSourcesText(citations: Citation[]): string {
  const list = Array.isArray(citations)
    ? citations
        .filter((c) => c && typeof c.url === "string" && c.url.trim().length > 0)
        .slice(0, 5)
        .map((c) => (c.title && c.title.trim() ? `- ${c.title}: ${c.url}` : `- ${c.url}`))
    : [];
  return list.length ? `Sources:\n${list.join("\n")}` : "";
}

export function buildPostPromptVariables(args: {
  baseVariables: Record<string, string>;
  output: string;
  citations: Citation[];
  usedWebSearch: boolean;
  llmModel: string;
}): Record<string, string> {
  const sourcesText = formatSourcesText(args.citations);
  const sourcesJson = safeJson(args.citations);
  const meta: Record<string, string> = {
    output: args.output,
    sources: sourcesText,
    sources_json: sourcesJson,
    used_web_search: args.usedWebSearch ? "true" : "false",
    llm_model: args.llmModel,
  };

  return { ...args.baseVariables, ...meta };
}
