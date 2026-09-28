import {generateGeminiResponse} from "./gemini"
import {generateGroqResponse} from "./groq"
import {generateGrokResponse} from "./grok"
import {type AiProvider} from "./types"

export * from "./prompts"
export * from "./types"
export {generateGeminiResponse} from "./gemini"
export {generateGroqResponse} from "./groq"
export {generateGrokResponse} from "./grok"

export async function generateAiResponse(
    provider: AiProvider,
    apiKey: string,
    prompt: string,
): Promise<string> {
    if (provider === "groq") {
        return generateGroqResponse(apiKey, prompt)
    }

    if (provider === "grok") {
        return generateGrokResponse(apiKey, prompt)
    }

    return generateGeminiResponse(apiKey, prompt)
}
