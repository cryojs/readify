export const AI_PROVIDER_OPTIONS = [
  {
    value: "gemini",
    label: "Gemini",
    apiKeyLabel: "Gemini API key",
    apiKeyPlaceholder: "Paste your Gemini API key",
    apiKeyDescription: "Get a free key at aistudio.google.com/api-keys.",
    apiKeyUrl: "https://aistudio.google.com/api-keys",
  },
  {
    value: "groq",
    label: "Groq",
    apiKeyLabel: "Groq API key",
    apiKeyPlaceholder: "Paste your Groq API key",
    apiKeyDescription: "Create a key at console.groq.com.",
    apiKeyUrl: "https://console.groq.com/keys",
  },
  {
    value: "grok",
    label: "Grok (xAI)",
    apiKeyLabel: "Grok API key",
    apiKeyPlaceholder: "Paste your Grok API key",
    apiKeyDescription: "Create a key at console.x.ai.",
    apiKeyUrl: "https://console.x.ai/",
  },
] as const;

export type AiProvider = (typeof AI_PROVIDER_OPTIONS)[number]["value"];

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDER_OPTIONS.some((option) => option.value === value);
}

export function normalizeAiProvider(value: unknown): AiProvider {
  return isAiProvider(value) ? value : "gemini";
}

export function getAiProviderDefinition(provider: AiProvider) {
  return (
    AI_PROVIDER_OPTIONS.find((option) => option.value === provider) ??
    AI_PROVIDER_OPTIONS[0]
  );
}
