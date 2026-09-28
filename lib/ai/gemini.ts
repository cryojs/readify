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

    const data = await response.json() as GeminiResponse

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
