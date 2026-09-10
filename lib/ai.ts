export type AiMode = "shorten" | "explain" | "ask"

export const AI_MODE_INSTRUCTIONS: Record<AiMode, string> = {
    shorten: "Shorten the following page text while preserving its meaning and key information.",
    explain: "Explain the following page text in clear, accessible language.",
    ask: "Answer the user's question using the following page text as context.",
}

export function buildAiInput(mode: AiMode, question: string, pageText: string) {
    const questionSection = mode === "ask"
        ? `\n\nQuestion:\n${question.trim() || "(No question provided.)"}`
        : ""

    return `${AI_MODE_INSTRUCTIONS[mode]}${questionSection}\n\nPage text:\n${pageText}`
}
