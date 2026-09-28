import {
  buildSelectedTextSimplifyInput,
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
  type SelectedTextResponse,
} from "@/lib/simplify"

const SIMPLIFY_SELECTION_COMMAND = "simplify-selection"
const SIMPLIFY_SELECTION_MENU_ID = "readify-simplify-selection"
const activeSimplifyTabs = new Set<number>()

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Readify could not simplify the selected text. Please try again."
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

async function simplifySelectionInTab(tabId: number) {
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
      throw new Error("Select some text before simplifying it.")
    }

    await sendStatus(tabId, "loading")

    const provider = await loadAiProvider()
    const providerDefinition = getAiProviderDefinition(provider)
    const apiKey = await loadAiApiKey(provider)

    if (!apiKey.trim()) {
      throw new Error(
        "Add your " +
          providerDefinition.label +
          " API key in Presets before simplifying text.",
      )
    }

    const prompt = buildSelectedTextSimplifyInput(selectedText)
    const simplifiedText = await generateAiResponse(provider, apiKey, prompt)
    const replacementResponse = (await browser.tabs.sendMessage(tabId, {
      type: REPLACE_SELECTED_TEXT_MESSAGE,
      selectionId: selectionResponse.selectionId,
      text: simplifiedText,
    })) as ReplaceSelectedTextResponse | undefined

    if (!replacementResponse?.replaced) {
      throw new Error(
        replacementResponse?.error ??
          "Readify could not edit the selected text. Select it again and try again.",
      )
    }
  } catch (error) {
    const message = getErrorMessage(error)

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
  void browser.contextMenus.removeAll()
    .then(() => browser.contextMenus.create({
      id: SIMPLIFY_SELECTION_MENU_ID,
      title: "Simplify selected text",
      contexts: ["selection"],
    }))
    .catch((error) => {
      console.warn("[Readify] Could not create the simplify context menu.", error)
    })
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    createSimplifyContextMenu()
  })

  browser.runtime.onStartup.addListener(() => {
    createSimplifyContextMenu()
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== SIMPLIFY_SELECTION_MENU_ID) {
      return
    }

    const tabId = tab?.id

    if (typeof tabId === "number") {
      await simplifySelectionInTab(tabId)
    }
  })

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== SIMPLIFY_SELECTION_COMMAND) {
      return
    }

    await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    }).then(([tab]) => {
      if (typeof tab?.id === "number") {
        return simplifySelectionInTab(tab.id)
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

    return simplifySelectionInTab(tabId).then(() => ({accepted: true}))
  })
})
