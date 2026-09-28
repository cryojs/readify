import "@/assets/reading-fonts.css"

import {
  isGetPageTextMessage,
  LEGACY_FONT_SIZE_STORAGE_KEY,
  getFontFamilyCss,
  getFontSizeCategory,
  getSupportedHostname,
  isSiteSettingsMessage,
  normalizeSiteSettings,
  type SiteSettings,
} from "@/lib/font-size"
import {
  getSiteSettingsStorageKey,
  loadStoredSiteSettings,
} from "@/lib/settings-storage"
import {
  SIMPLIFY_SELECTION_REQUEST_MESSAGE,
  isGetSelectedTextMessage,
  isReplaceSelectedTextMessage,
  isSimplifyStatusMessage,
  type ReplaceSelectedTextResponse,
  type SelectedTextResponse,
} from "@/lib/simplify"

const MANAGED_PROPERTIES = [
  "font-size",
  "font-family",
  "letter-spacing",
  "line-height",
] as const

type ManagedProperty = (typeof MANAGED_PROPERTIES)[number]

type InlineStyleSnapshot = Record<
  ManagedProperty,
  { value: string; priority: string }
>

const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "SVG",
  "CANVAS",
  "IMG",
  "VIDEO",
  "AUDIO",
  "IFRAME",
  "OBJECT",
  "EMBED",
])

const CONTROL_SELECTOR =
  "button, input:not([type=hidden]), textarea, select, option, [role=button]"

const originalStyles = new Map<HTMLElement, InlineStyleSnapshot>()
let activeSettings: SiteSettings | null = null
let mutationObserver: MutationObserver | null = null
let applyScheduled = false
let savedSelection: SavedSelection | null = null
let simplifyStatusHost: HTMLElement | null = null
let simplifyStatusTimer: number | null = null
let nextSelectionId = 0
let preserveSelectionUntil = 0
const selectionTargets = new Map<number, SavedSelection>()

type SavedSelection = {
  range: Range
  text: string
}

type SimplifyStatus = "loading" | "success" | "error"

function hasDirectText(element: HTMLElement): boolean {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  )
}

function isVisibleTextElement(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || SKIPPED_TAGS.has(element.tagName)) {
    return false
  }

  if (element.closest("[data-readify-ui]")) {
    return false
  }

  if (element.matches("[aria-hidden=true]")) {
    return false
  }

  const computedStyle = window.getComputedStyle(element)

  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    computedStyle.visibility === "collapse"
  ) {
    return false
  }

  return element.matches(CONTROL_SELECTOR) || hasDirectText(element)
}

function getTextElements(): HTMLElement[] {
  if (!document.body) {
    return []
  }

  const elements = [document.body, ...Array.from(document.body.querySelectorAll("*"))]
  return elements.filter(isVisibleTextElement)
}

function captureInlineStyles(element: HTMLElement): InlineStyleSnapshot {
  return MANAGED_PROPERTIES.reduce((snapshot, property) => {
    snapshot[property] = {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    }
    return snapshot
  }, {} as InlineStyleSnapshot)
}

function restoreInlineStyles() {
  for (const [element, snapshot] of originalStyles) {
    for (const property of MANAGED_PROPERTIES) {
      const original = snapshot[property]

      if (original.value) {
        element.style.setProperty(property, original.value, original.priority)
      } else {
        element.style.removeProperty(property)
      }
    }
  }
}

function setManagedProperty(
  element: HTMLElement,
  property: ManagedProperty,
  value: string,
) {
  element.style.setProperty(property, value, "important")
}

function applyActiveSettings() {
  restoreInlineStyles()
  originalStyles.clear()

  const settings = activeSettings

  if (!settings || !document.body) {
    return
  }

  const entries = getTextElements().map((element) => {
    const computedStyle = window.getComputedStyle(element)
    const currentFontSize = Number.parseFloat(computedStyle.fontSize)
    const category = getFontSizeCategory(element)
    const exactSize = settings.textSize.overrides[category]
    const scaledSize = Number.isFinite(currentFontSize)
      ? currentFontSize * (settings.textSize.scale / 100)
      : 16 * (settings.textSize.scale / 100)

    return {
      element,
      category,
      fontSize: exactSize ?? scaledSize,
    }
  })

  const fontFamily = getFontFamilyCss(settings.typography.fontFamily)

  for (const entry of entries) {
    originalStyles.set(entry.element, captureInlineStyles(entry.element))
    setManagedProperty(entry.element, "font-size", `${entry.fontSize}px`)

    if (fontFamily) {
      setManagedProperty(entry.element, "font-family", fontFamily)
    }

    if (settings.typography.letterSpacing !== null) {
      setManagedProperty(
        entry.element,
        "letter-spacing",
        `${settings.typography.letterSpacing}px`,
      )
    }

    if (settings.typography.lineHeight !== null) {
      setManagedProperty(
        entry.element,
        "line-height",
        `${settings.typography.lineHeight}`,
      )
    }
  }
}

function clearActiveSettings() {
  activeSettings = null
  restoreInlineStyles()
  originalStyles.clear()
}

function scheduleApply() {
  if (!activeSettings || applyScheduled) {
    return
  }

  applyScheduled = true
  window.setTimeout(() => {
    applyScheduled = false
    applyActiveSettings()
  }, 0)
}

function setActiveSettings(settings: SiteSettings | null) {
  activeSettings = settings ? normalizeSiteSettings(settings) : null

  if (activeSettings) {
    applyActiveSettings()
  } else {
    clearActiveSettings()
  }
}

function captureSelection(): SavedSelection | null {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }

  const range = selection.getRangeAt(0)
  const text = range.toString()

  if (!text.trim() || !range.commonAncestorContainer.isConnected) {
    return null
  }

  const snapshot = {
    range: range.cloneRange(),
    text,
  }

  savedSelection = snapshot
  return snapshot
}

function createSelectionTarget(): {selectionId: number; selection: SavedSelection} | null {
  const selection = getSavedSelection() ?? captureSelection()

  if (!selection) {
    return null
  }

  const selectionId = ++nextSelectionId
  const target = {
    range: selection.range.cloneRange(),
    text: selection.text,
  }
  selectionTargets.set(selectionId, target)

  window.setTimeout(() => {
    selectionTargets.delete(selectionId)
  }, 120000)

  return {selectionId, selection: target}
}

function getSavedSelection(): SavedSelection | null {
  if (!savedSelection) {
    return null
  }

  if (!savedSelection.range.commonAncestorContainer.isConnected) {
    savedSelection = null
    return null
  }

  if (savedSelection.range.toString() !== savedSelection.text) {
    savedSelection = null
    return null
  }

  return savedSelection
}

function getSimplifyStatusElements() {
  if (!simplifyStatusHost || !simplifyStatusHost.isConnected) {
    simplifyStatusHost = document.createElement("div")
    simplifyStatusHost.dataset.readifyUi = "true"
    simplifyStatusHost.style.position = "fixed"
    simplifyStatusHost.style.top = "16px"
    simplifyStatusHost.style.right = "16px"
    simplifyStatusHost.style.zIndex = "2147483647"
    simplifyStatusHost.style.pointerEvents = "none"

    const shadowRoot = simplifyStatusHost.attachShadow({mode: "open"})
    const style = document.createElement("style")
    style.textContent = `
      :host { all: initial; }
      .status {
        align-items: center;
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        color: #fafafa;
        display: flex;
        font: 13px/1.4 system-ui, sans-serif;
        max-width: min(360px, calc(100vw - 32px));
        padding: 10px 12px;
      }
      .status[data-status="loading"] { background: #27272a; }
      .status[data-status="success"] { background: #166534; }
      .status[data-status="error"] { background: #991b1b; }
    `
    const status = document.createElement("div")
    status.className = "status"
    shadowRoot.append(style, status)
    ;(document.body ?? document.documentElement).appendChild(simplifyStatusHost)
  }

  const status = simplifyStatusHost.shadowRoot?.querySelector<HTMLElement>(".status")

  if (!status) {
    return null
  }

  return {host: simplifyStatusHost, status}
}

function showSimplifyStatus(
  message: string,
  status: SimplifyStatus,
) {
  if (simplifyStatusTimer !== null) {
    window.clearTimeout(simplifyStatusTimer)
    simplifyStatusTimer = null
  }

  const elements = getSimplifyStatusElements()

  if (!elements) {
    return
  }

  elements.status.dataset.status = status
  elements.status.textContent = message

  if (status !== "loading") {
    simplifyStatusTimer = window.setTimeout(() => {
      elements.host.remove()
      simplifyStatusHost = null
      simplifyStatusTimer = null
    }, status === "error" ? 5000 : 1800)
  }
}

function cleanGeneratedText(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim()

  return normalized
    .replace(/^```(?:text|plaintext|plain)?\s*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim()
}

function createReplacementText(selectedText: string, generatedText: string): string {
  const cleanedText = cleanGeneratedText(generatedText)

  if (!cleanedText) {
    return ""
  }

  const leadingWhitespace = selectedText.match(/^\s*/)?.[0] ?? ""
  const trailingWhitespace = selectedText.match(/\s*$/)?.[0] ?? ""

  return `${leadingWhitespace}${cleanedText}${trailingWhitespace}`
}

function replaceSavedSelection(
  selectionId: number,
  generatedText: string,
): ReplaceSelectedTextResponse {
  const selection = selectionTargets.get(selectionId)
  selectionTargets.delete(selectionId)

  if (!selection) {
    return {
      replaced: false,
      error: "The selected text is no longer available. Select it again and try again.",
    }
  }

  const replacementText = createReplacementText(selection.text, generatedText)

  if (!replacementText.trim()) {
    return {
      replaced: false,
      error: "The simplifier returned empty text. Select the text again and try again.",
    }
  }

  try {
    const replacementNode = document.createTextNode(replacementText)
    selection.range.deleteContents()
    selection.range.insertNode(replacementNode)

    const replacementRange = document.createRange()
    replacementRange.selectNodeContents(replacementNode)
    const currentSelection = window.getSelection()
    currentSelection?.removeAllRanges()
    currentSelection?.addRange(replacementRange)

    savedSelection = {
      range: replacementRange.cloneRange(),
      text: replacementText,
    }

    return {replaced: true}
  } catch (error) {
    console.warn("[Readify] Could not replace selected text.", error)
    return {
      replaced: false,
      error: "Readify could not edit that selection. Select the text again and try again.",
    }
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    const hostname = getSupportedHostname(window.location.href)

    if (!hostname || !document.body) {
      return
    }

    document.addEventListener("selectionchange", () => {
      if (!captureSelection() && Date.now() > preserveSelectionUntil) {
        savedSelection = null
      }
    })
    document.addEventListener(
      "contextmenu",
      () => {
        preserveSelectionUntil = Date.now() + 5000
        captureSelection()
        window.setTimeout(() => {
          captureSelection()
        }, 0)
      },
      true,
    )
    document.addEventListener("keydown", (event) => {
      if (
        event.repeat ||
        !event.altKey ||
        !event.shiftKey ||
        event.key.toLowerCase() !== "s"
      ) {
        return
      }

      const target = event.target

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return
      }

      const selection = getSavedSelection() ?? captureSelection()

      if (!selection) {
        return
      }

      event.preventDefault()
      void browser.runtime.sendMessage({
        type: SIMPLIFY_SELECTION_REQUEST_MESSAGE,
      }).then((response) => {
        if (response && response.accepted === false) {
          showSimplifyStatus(
            response.error ?? "Could not simplify the selection.",
            "error",
          )
        }
      }).catch((error) => {
        console.warn("[Readify] Could not start selected-text simplify.", error)
        showSimplifyStatus("Could not simplify the selection.", "error")
      })
    })

    mutationObserver = new MutationObserver(() => {
      scheduleApply()
    })
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    const loadSettings = async () => {
      try {
        setActiveSettings(await loadStoredSiteSettings(hostname))
      } catch (error) {
        console.warn("[Readify] Could not load site settings.", error)
      }
    }

    void loadSettings()

    const storageKey = getSiteSettingsStorageKey(hostname)
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return
      }

      if (changes[storageKey]) {
        const newValue = changes[storageKey].newValue
        setActiveSettings(newValue ? normalizeSiteSettings(newValue) : null)
        return
      }

      if (changes[LEGACY_FONT_SIZE_STORAGE_KEY]) {
        void loadSettings()
      }
    })

    browser.runtime.onMessage.addListener((message) => {
      if (isSiteSettingsMessage(message)) {
        setActiveSettings(message.settings)
        return Promise.resolve({ applied: true })
      }

      if (isGetSelectedTextMessage(message)) {
        const target = createSelectionTarget()
        const response: SelectedTextResponse = {
          text: target?.selection.text ?? null,
          selectionId: target?.selectionId ?? null,
        }
        return Promise.resolve(response)
      }

      if (isReplaceSelectedTextMessage(message)) {
        const response = replaceSavedSelection(message.selectionId, message.text)

        if (response.replaced) {
          showSimplifyStatus("Text simplified.", "success")
        } else {
          showSimplifyStatus(response.error ?? "Could not simplify the selection.", "error")
        }

        return Promise.resolve(response)
      }

      if (isSimplifyStatusMessage(message)) {
        showSimplifyStatus(
          message.message ??
            (message.status === "loading"
              ? "Simplifying selected text…"
              : message.status === "success"
                ? "Text simplified."
                : "Could not simplify the selection."),
          message.status,
        )
        return Promise.resolve({received: true})
      }

      if (isGetPageTextMessage(message)) {
        return Promise.resolve({
          text: document.body?.innerText.trim() ?? "",
        })
      }
    })
  },
})
