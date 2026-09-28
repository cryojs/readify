export type AiMode = "shorten" | "explain" | "ask"

export const AI_MODE_INSTRUCTIONS: Record<AiMode, string> = {
    shorten: "Shorten the following page text while preserving its meaning and key information.",
    explain: "Explain the following page text in clear, accessible language.",
    ask: "Answer the user's question using the following page text as context.",
}

const SELECTED_TEXT_SIMPLIFY_INSTRUCTION = [
    "Rewrite the selected text in simpler, clearer language.",
    "Preserve its meaning, factual details, names, numbers, and important information.",
    "Do not summarize, add explanations, or omit important details.",
    "Return only the replacement text as plain text. Do not include a preamble, quotation marks around the whole response, or Markdown formatting.",
    "Preserve paragraph breaks when they are present.",
].join(" ")

const AI_RESPONSE_FORMAT_INSTRUCTION =
    "Format the response as Markdown. Start directly with the answer and do not add an introduction such as \"Here is what you asked for:\"."

export function buildAiInput(mode: AiMode, question: string, pageText: string) {
    const questionSection = mode === "ask"
        ? `\n\nQuestion:\n${question.trim() || "(No question provided.)"}`
        : ""

    return `${AI_MODE_INSTRUCTIONS[mode]}\n\nResponse formatting:\n${AI_RESPONSE_FORMAT_INSTRUCTION}${questionSection}\n\nPage text:\n${pageText}`
}

export function buildSelectedTextSimplifyInput(selectedText: string): string {
    return `${SELECTED_TEXT_SIMPLIFY_INSTRUCTION}\n\nSelected text:\n${selectedText}`
}
