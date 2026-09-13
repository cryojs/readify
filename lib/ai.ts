export type AiMode = "shorten" | "explain" | "ask"

export const AI_MODE_INSTRUCTIONS: Record<AiMode, string> = {
    shorten: "Shorten the following page text while preserving its meaning and key information.",
    explain: "Explain the following page text in clear, accessible language.",
    ask: "Answer the user's question using the following page text as context.",
}

const AI_RESPONSE_FORMAT_INSTRUCTION =
    "Format the response as Markdown. Start directly with the answer and do not add an introduction such as \"Here is what you asked for:\"."

const GEMINI_MODEL = "gemini-3.8-flash"
const GEMINI_GENERATE_CONTENT_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string
            }>
        }
    }>
    error?: {
        message?: string
    }
}

export function buildAiInput(mode: AiMode, question: string, pageText: string) {
    const questionSection = mode === "ask"
        ? `\n\nQuestion:\n${question.trim() || "(No question provided.)"}`
        : ""

    return `${AI_MODE_INSTRUCTIONS[mode]}\n\nResponse formatting:\n${AI_RESPONSE_FORMAT_INSTRUCTION}${questionSection}\n\nPage text:\n${pageText}`
}

export async function generateGeminiResponse(
    apiKey: string,
    prompt: string,
): Promise<string> {
    const response = await fetch(GEMINI_GENERATE_CONTENT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{text: prompt}],
                },
            ],
        }),
    })

    const data = (await response.json()) as GeminiResponse

    if (!response.ok) {
        throw new Error(
            data.error?.message || `Gemini request failed (${response.status}).`,
        )
    }

    const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim()

    if (!text) {
        throw new Error("Gemini returned no text for this request.")
    }

    return text
}
