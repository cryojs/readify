const GROQ_MODEL = "openai/gpt-oss-20b"
const GROQ_CHAT_COMPLETIONS_URL =
    "https://api.groq.com/openai/v1/chat/completions"

type GroqResponse = {
    choices?: Array<{
        message?: {
            content?: string
        }
    }>
    error?: string | {
        message?: string
    }
    message?: string
    code?: string
}

function getGroqErrorMessage(data: GroqResponse): string | undefined {
    if (typeof data.error === "string") {
        return data.error
    }

    return data.error?.message || data.message || data.code
}

export async function generateGroqResponse(
    apiKey: string,
    prompt: string,
): Promise<string> {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        }),
    })

    const data = await response.json() as GroqResponse

    if (!response.ok) {
        throw new Error(
            getGroqErrorMessage(data) || `Groq request failed (${response.status}).`,
        )
    }

    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) {
        throw new Error("Groq returned no text for this request.")
    }

    return text
}
