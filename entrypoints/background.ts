import {
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
  REPLACE_SELECTED_TEXT_MESSAGE,
  SIMPLIFY_STATUS_MESSAGE,
  isSimplifySelectionRequestMessage,
  type ReplaceSelectedTextResponse,
  type SelectedTextAction,
  type SelectedTextResponse,
} from "@/lib/simplify"

const SIMPLIFY_SELECTION_COMMAND = "simplify-selection"
const SHORTEN_SELECTION_COMMAND = "shorten-selection"
const SIMPLIFY_SELECTION_MENU_ID = "readify-simplify-selection"
const SHORTEN_SELECTION_MENU_ID = "readify-shorten-selection"
const activeSimplifyTabs = new Set<number>()
let contextMenuSetup: Promise<void> | null = null

function getErrorMessage(error: unknown, action: SelectedTextAction): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return action === "shorten"
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
