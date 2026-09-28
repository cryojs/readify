const GROK_MODEL = "grok-4.7"
const GROK_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions"

type GrokMessageContent = string | Array<{
    text?: string
}>

type GrokResponse = {
    choices?: Array<{
        message?: {
            content?: GrokMessageContent
        }
    }>
    error?: string | {
        message?: string
    }
    message?: string
    code?: string
}

function getGrokResponseText(content: GrokMessageContent | undefined): string {
    if (typeof content === "string") {
        return content
    }

    return content?.map((part) => part.text ?? "").join("") ?? ""
}

function getGrokErrorMessage(data: GrokResponse): string | undefined {
    if (typeof data.error === "string") {
        return data.error
    }

    return data.error?.message || data.message || data.code
}

export async function generateGrokResponse(
    apiKey: string,
    prompt: string,
): Promise<string> {
    const response = await fetch(GROK_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: GROK_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        }),
    })

    const data = await response.json() as GrokResponse

    if (!response.ok) {
        throw new Error(
            getGrokErrorMessage(data) || `Grok request failed (${response.status}).`,
        )
    }

    const text = getGrokResponseText(data.choices?.[0]?.message?.content).trim()

    if (!text) {
        throw new Error("Grok returned no text for this request.")
    }

    return text
}
