import {
  buildSelectedTextFollowUpInput,
  buildSelectedTextSimplifyInput,
  buildSelectedTextShortenInput,
  generateAiResponse,
  getAiProviderDefinition,
} from "@/lib/ai"
import {
  loadAiApiKey,
  loadAiProvider,
} from "@/lib/settings-storage"
import {
  GET_SELECTED_TEXT_MESSAGE,
  FOLLOW_UP_SELECTION_REQUEST_MESSAGE,
  OPEN_FOLLOW_UP_MESSAGE,
  REPLACE_SELECTED_TEXT_MESSAGE,
  SIMPLIFY_STATUS_MESSAGE,
  isFollowUpSelectionRequestMessage,
  isSimplifySelectionRequestMessage,
  type FollowUpSelectionResponse,
  type ReplaceSelectedTextResponse,
  type SelectedTextAction,
  type SelectedTextResponse,
} from "@/lib/simplify"

const SIMPLIFY_SELECTION_COMMAND = "simplify-selection"
const SHORTEN_SELECTION_COMMAND = "shorten-selection"
const FOLLOW_UP_SELECTION_COMMAND = "ask-followup"
const SIMPLIFY_SELECTION_MENU_ID = "readify-simplify-selection"
const SHORTEN_SELECTION_MENU_ID = "readify-shorten-selection"
const FOLLOW_UP_SELECTION_MENU_ID = "readify-follow-up-selection"
const activeSimplifyTabs = new Set<number>()
let contextMenuSetup: Promise<void> | null = null

type SelectedTextOperation = SelectedTextAction | "followup"

function getErrorMessage(error: unknown, operation: SelectedTextOperation): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (operation === "followup") {
    return "Readify could not answer the follow-up. Please try again."
  }

  return operation === "shorten"
    ? "Readify could not shorten the selected text. Please try again."
    : "Readify could not simplify the selected text. Please try again."
}

async function sendStatus(
  tabId: number,
  status: "loading" | "success" | "error",
  message?: string,
) {
  await browser.tabs.sendMessage(tabId, {
    type: SIMPLIFY_STATUS_MESSAGE,
    status,
    message,
  })
}

async function simplifySelectionInTab(
  tabId: number,
  action: SelectedTextAction = "simplify",
) {
  if (activeSimplifyTabs.has(tabId)) {
    return
  }

  activeSimplifyTabs.add(tabId)

  try {
    const selectionResponse = (await browser.tabs.sendMessage(tabId, {
      type: GET_SELECTED_TEXT_MESSAGE,
    })) as SelectedTextResponse | undefined
    const selectedText = selectionResponse?.text ?? ""

    if (!selectedText.trim() || typeof selectionResponse?.selectionId !== "number") {
      throw new Error(
        "Select some text before " +
          (action === "shorten" ? "shortening" : "simplifying") +
          " it.",
      )
    }

    await sendStatus(
      tabId,
      "loading",
      action === "shorten"
        ? "Shortening selected text…"
        : "Simplifying selected text…",
    )

    const provider = await loadAiProvider()
    const providerDefinition = getAiProviderDefinition(provider)
    const apiKey = await loadAiApiKey(provider)

    if (!apiKey.trim()) {
      throw new Error(
        "Add your " +
        providerDefinition.label +
        " API key in Presets before " +
        (action === "shorten" ? "shortening" : "simplifying") +
        " text.",
      )
    }

    const prompt = action === "shorten"
      ? buildSelectedTextShortenInput(selectedText)
      : buildSelectedTextSimplifyInput(selectedText)
    const generatedText = await generateAiResponse(provider, apiKey, prompt)
    const replacementResponse = (await browser.tabs.sendMessage(tabId, {
      type: REPLACE_SELECTED_TEXT_MESSAGE,
      selectionId: selectionResponse.selectionId,
      text: generatedText,
      action,
    })) as ReplaceSelectedTextResponse | undefined

    if (!replacementResponse?.replaced) {
      throw new Error(
        replacementResponse?.error ??
          "Readify could not edit the selected text. Select it again and try again.",
      )
    }
  } catch (error) {
    const message = getErrorMessage(error, action)

    try {
      await sendStatus(tabId, "error", message)
    } catch {
      console.warn("[Readify] Could not show the simplify error on the page.", error)
    }
  } finally {
    activeSimplifyTabs.delete(tabId)
  }
}

async function askFollowUpInTab(
  tabId: number,
  selectedText: string,
  question: string,
): Promise<string> {
  if (activeSimplifyTabs.has(tabId)) {
    throw new Error("Another selected-text request is already running.")
  }

  activeSimplifyTabs.add(tabId)

  try {
    const normalizedQuestion = question.trim()

    if (!selectedText.trim()) {
      throw new Error("Select some text before asking a follow-up.")
    }

    if (!normalizedQuestion) {
      throw new Error("Write a question before sending it.")
    }

    const provider = await loadAiProvider()
    const providerDefinition = getAiProviderDefinition(provider)
    const apiKey = await loadAiApiKey(provider)

    if (!apiKey.trim()) {
      throw new Error(
        "Add your " +
          providerDefinition.label +
          " API key in Presets before asking a follow-up.",
      )
    }

    return await generateAiResponse(
      provider,
      apiKey,
      buildSelectedTextFollowUpInput(selectedText, normalizedQuestion),
    )
  } finally {
    activeSimplifyTabs.delete(tabId)
  }
}

async function openFollowUpInTab(tabId: number) {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: OPEN_FOLLOW_UP_MESSAGE,
    })
  } catch (error) {
    console.warn("[Readify] Could not open the follow-up input.", error)
  }
}

function createSimplifyContextMenu() {
  if (contextMenuSetup) {
    return
  }

  contextMenuSetup = browser.contextMenus.removeAll()
    .then(async () => {
      await browser.contextMenus.create({
        id: SIMPLIFY_SELECTION_MENU_ID,
        title: "Simplify selected text",
        contexts: ["selection"],
      })
      await browser.contextMenus.create({
        id: SHORTEN_SELECTION_MENU_ID,
        title: "Shorten selected text",
        contexts: ["selection"],
      })
      await browser.contextMenus.create({
        id: FOLLOW_UP_SELECTION_MENU_ID,
        title: "Ask about selected text",
        contexts: ["selection"],
      })
    })
    .catch((error) => {
      console.warn("[Readify] Could not create the simplify context menu.", error)
    })
    .finally(() => {
      contextMenuSetup = null
    })
}

export default defineBackground(() => {
  createSimplifyContextMenu()

  browser.runtime.onInstalled.addListener(() => {
    createSimplifyContextMenu()
  })

  browser.runtime.onStartup.addListener(() => {
    createSimplifyContextMenu()
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === FOLLOW_UP_SELECTION_MENU_ID) {
      const tabId = tab?.id

      if (typeof tabId === "number") {
        await openFollowUpInTab(tabId)
      }

      return
    }

    const action = info.menuItemId === SIMPLIFY_SELECTION_MENU_ID
      ? "simplify"
      : info.menuItemId === SHORTEN_SELECTION_MENU_ID
        ? "shorten"
        : null

    if (!action) {
      return
    }

    const tabId = tab?.id

    if (typeof tabId === "number") {
      await simplifySelectionInTab(tabId, action)
    }
  })

  browser.commands.onCommand.addListener(async (command) => {
    if (command === FOLLOW_UP_SELECTION_COMMAND) {
      await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      }).then(([tab]) => {
        if (typeof tab?.id === "number") {
          return openFollowUpInTab(tab.id)
        }

        return undefined
      }).catch((error) => {
        console.warn("[Readify] Could not find the active tab for follow-up.", error)
      })

      return
    }

    const action = command === SIMPLIFY_SELECTION_COMMAND
      ? "simplify"
      : command === SHORTEN_SELECTION_COMMAND
        ? "shorten"
        : null

    if (!action) {
      return
    }

    await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    }).then(([tab]) => {
      if (typeof tab?.id === "number") {
        return simplifySelectionInTab(tab.id, action)
      }

      return undefined
    }).catch((error) => {
      console.warn("[Readify] Could not find the active tab for simplify.", error)
    })
  })

  browser.runtime.onMessage.addListener((message, sender) => {
    if (isFollowUpSelectionRequestMessage(message)) {
      const tabId = sender.tab?.id

      if (typeof tabId !== "number") {
        return Promise.resolve({
          accepted: false,
          error: "Readify could not identify the current page.",
        } satisfies FollowUpSelectionResponse)
      }

      return askFollowUpInTab(tabId, message.selectedText, message.question)
        .then((answer) => ({accepted: true, answer}))
        .catch((error) => ({
          accepted: false,
          error: getErrorMessage(error, "followup"),
        }))
    }

    if (!isSimplifySelectionRequestMessage(message)) {
      return
    }

    const tabId = sender.tab?.id

    if (typeof tabId !== "number") {
      return Promise.resolve({
        accepted: false,
        error: "Readify could not identify the current page.",
      })
    }

    return simplifySelectionInTab(tabId, message.action ?? "simplify")
      .then(() => ({accepted: true}))
  })
})
