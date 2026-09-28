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
  GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY,
  GLOBAL_SITE_SETTINGS_STORAGE_KEY,
  getSiteSettingsStorageKey,
  loadAppTheme,
  loadEffectiveSiteSettings,
  normalizeAppTheme,
  THEME_STORAGE_KEY,
  type AppTheme,
} from "@/lib/settings-storage"
import {
  OPEN_FOLLOW_UP_MESSAGE,
  FOLLOW_UP_SELECTION_REQUEST_MESSAGE,
  SIMPLIFY_SELECTION_REQUEST_MESSAGE,
  isGetSelectedTextMessage,
  isOpenFollowUpMessage,
  isReplaceSelectedTextMessage,
  isSimplifyStatusMessage,
  type FollowUpSelectionResponse,
  type ReplaceSelectedTextResponse,
  type SelectedTextAction,
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
let followUpHost: HTMLElement | null = null
let followUpSelection: SavedSelection | null = null
let followUpRequestToken = 0
let followUpTheme: AppTheme = "light"
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

type FollowUpPanelElements = {
  host: HTMLElement
  heading: HTMLElement
  input: HTMLTextAreaElement
  submit: HTMLButtonElement
  status: HTMLElement
  answer: HTMLElement
  copy: HTMLButtonElement
}

function createFollowUpIcon(name: "copy" | "send"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.classList.add("button-icon")

  if (name === "copy") {
    const back = document.createElementNS("http://www.w3.org/2000/svg", "path")
    back.setAttribute("d", "M9 9h10v10H9z")
    const front = document.createElementNS("http://www.w3.org/2000/svg", "path")
    front.setAttribute("d", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1")
    svg.append(back, front)
  } else {
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path")
    arrow.setAttribute("d", "m22 2-7 20-4-9-9-4Z")
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path")
    line.setAttribute("d", "M22 2 11 13")
    svg.append(arrow, line)
  }

  return svg
}

function applyFollowUpTheme() {
  if (followUpHost) {
    followUpHost.dataset.theme = followUpTheme
  }
}

function getFollowUpPanelElements(): FollowUpPanelElements | null {
  if (!followUpHost || !followUpHost.isConnected) {
    followUpHost = document.createElement("div")
    followUpHost.dataset.readifyUi = "true"
    followUpHost.style.position = "fixed"
    followUpHost.style.top = "16px"
    followUpHost.style.right = "16px"
    followUpHost.style.zIndex = "2147483647"
    followUpHost.style.pointerEvents = "none"
    applyFollowUpTheme()

    const shadowRoot = followUpHost.attachShadow({mode: "open"})
    const style = document.createElement("style")
    style.textContent = `
      :host {
        --readify-background: oklch(1 0 0);
        --readify-foreground: oklch(0.145 0 0);
        --readify-card: oklch(1 0 0);
        --readify-card-foreground: oklch(0.145 0 0);
        --readify-muted: oklch(0.97 0 0);
        --readify-muted-foreground: oklch(0.556 0 0);
        --readify-border: oklch(0.922 0 0);
        --readify-input: oklch(0.922 0 0);
        --readify-primary: oklch(0.205 0 0);
        --readify-primary-foreground: oklch(0.985 0 0);
        --readify-ring: oklch(0.708 0 0);
        all: initial;
        color-scheme: light;
      }
      :host([data-theme="dark"]) {
        --readify-background: oklch(0.145 0 0);
        --readify-foreground: oklch(0.985 0 0);
        --readify-card: oklch(0.205 0 0);
        --readify-card-foreground: oklch(0.985 0 0);
        --readify-muted: oklch(0.269 0 0);
        --readify-muted-foreground: oklch(0.708 0 0);
        --readify-border: oklch(1 0 0 / 10%);
        --readify-input: oklch(1 0 0 / 15%);
        --readify-primary: oklch(0.922 0 0);
        --readify-primary-foreground: oklch(0.205 0 0);
        --readify-ring: oklch(0.556 0 0);
        color-scheme: dark;
      }
      .panel {
        background: var(--readify-card);
        border: 1px solid var(--readify-border);
        border-radius: 0.625rem;
        box-shadow: 0 0 0 1px color-mix(in oklch, var(--readify-foreground) 10%, transparent), 0 10px 30px rgb(0 0 0 / 0.14);
        box-sizing: border-box;
        color: var(--readify-card-foreground);
        display: flex;
        flex-direction: column;
        font: 12px/1.5 "Inter Variable", Inter, system-ui, sans-serif;
        gap: 10px;
        padding: 12px;
        pointer-events: auto;
        width: min(420px, calc(100vw - 32px));
      }
      .header {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }
      .heading { color: var(--readify-card-foreground); font-weight: 500; }
      button {
        align-items: center;
        background: var(--readify-background);
        border: 1px solid var(--readify-border);
        border-radius: 6px;
        box-sizing: border-box;
        color: var(--readify-foreground);
        cursor: pointer;
        display: inline-flex;
        font: 500 12px/1.4 "Inter Variable", Inter, system-ui, sans-serif;
        gap: 6px;
        height: 26px;
        justify-content: center;
        min-width: 76px;
        padding: 0 12px;
        transition: background-color 120ms ease, border-color 120ms ease;
      }
      button:hover:not(:disabled) { background: var(--readify-muted); }
      button:focus-visible {
        outline: 2px solid color-mix(in oklch, var(--readify-ring) 60%, transparent);
        outline-offset: 1px;
      }
      button:disabled { cursor: default; opacity: 0.5; }
      .button-icon {
        fill: none;
        flex: 0 0 auto;
        height: 14px;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
        width: 14px;
      }
      .close {
        background: transparent;
        border: 0;
        color: var(--readify-muted-foreground);
        font-size: 18px;
        height: 24px;
        line-height: 1;
        min-width: 24px;
        padding: 0;
      }
      .close:hover { background: var(--readify-muted); color: var(--readify-foreground); }
      textarea {
        background: color-mix(in oklch, var(--readify-input) 20%, transparent);
        border: 1px solid var(--readify-input);
        border-radius: 6px;
        box-sizing: border-box;
        color: var(--readify-foreground);
        font: 400 12px/1.5 "Inter Variable", Inter, system-ui, sans-serif;
        min-height: 64px;
        outline: none;
        padding: 8px;
        resize: vertical;
        width: 100%;
      }
      textarea:focus {
        border-color: var(--readify-ring);
        box-shadow: 0 0 0 2px color-mix(in oklch, var(--readify-ring) 30%, transparent);
      }
      textarea::placeholder { color: var(--readify-muted-foreground); }
      .footer {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }
      .status { color: var(--readify-muted-foreground); font-size: 11px; }
      .status[data-tone="error"] { color: var(--readify-destructive, oklch(0.577 0.245 27.325)); }
      .primary {
        background: var(--readify-primary);
        border-color: var(--readify-primary);
        color: var(--readify-primary-foreground);
      }
      .primary:hover:not(:disabled) { background: color-mix(in oklch, var(--readify-primary) 80%, transparent); }
      .secondary { min-width: 82px; }
      .answer {
        background: color-mix(in oklch, var(--readify-muted) 45%, transparent);
        border: 1px solid var(--readify-border);
        border-radius: 6px;
        color: var(--readify-card-foreground);
        font-size: 12px;
        max-height: 260px;
        overflow: auto;
        padding: 9px;
        white-space: pre-wrap;
      }
      [hidden] { display: none !important; }
    `

    const panel = document.createElement("section")
    panel.className = "panel"
    panel.setAttribute("role", "dialog")
    panel.setAttribute("aria-label", "Ask about selected text")

    const header = document.createElement("div")
    header.className = "header"

    const heading = document.createElement("div")
    heading.className = "heading"
    heading.textContent = "Ask about selected text"

    const close = document.createElement("button")
    close.className = "close"
    close.type = "button"
    close.setAttribute("aria-label", "Close follow-up")
    close.textContent = "×"
    close.addEventListener("click", closeFollowUpPanel)
    header.append(heading, close)

    const input = document.createElement("textarea")
    input.rows = 2
    input.placeholder = "Ask a question or request an explanation…"
    input.setAttribute("aria-label", "Follow-up question")
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeFollowUpPanel()
      } else if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        void submitFollowUp()
      }
    })

    const answer = document.createElement("div")
    answer.className = "answer"
    answer.hidden = true

    const footer = document.createElement("div")
    footer.className = "footer"

    const status = document.createElement("div")
    status.className = "status"
    status.setAttribute("aria-live", "polite")

    const actions = document.createElement("div")
    actions.style.display = "flex"
    actions.style.gap = "6px"

    const copy = document.createElement("button")
    copy.className = "secondary"
    copy.type = "button"
    copy.append(createFollowUpIcon("copy"), document.createTextNode("Copy"))
    copy.hidden = true
    copy.addEventListener("click", () => {
      void copyFollowUpAnswer()
    })

    const submit = document.createElement("button")
    submit.className = "primary"
    submit.type = "button"
    submit.append(createFollowUpIcon("send"), document.createTextNode("Ask"))
    submit.addEventListener("click", () => {
      void submitFollowUp()
    })

    actions.append(copy, submit)
    footer.append(status, actions)
    panel.append(header, input, answer, footer)
    shadowRoot.append(style, panel)
    ;(document.body ?? document.documentElement).appendChild(followUpHost)
  }

  const shadowRoot = followUpHost.shadowRoot
  const heading = shadowRoot?.querySelector<HTMLElement>(".heading")
  const input = shadowRoot?.querySelector<HTMLTextAreaElement>("textarea")
  const submit = shadowRoot?.querySelector<HTMLButtonElement>(".primary")
  const status = shadowRoot?.querySelector<HTMLElement>(".status")
  const answer = shadowRoot?.querySelector<HTMLElement>(".answer")
  const copy = shadowRoot?.querySelector<HTMLButtonElement>(".secondary")

  if (!heading || !input || !submit || !status || !answer || !copy) {
    return null
  }

  return {
    host: followUpHost,
    heading,
    input,
    submit,
    status,
    answer,
    copy,
  }
}

function closeFollowUpPanel() {
  followUpRequestToken += 1
  followUpSelection = null

  if (followUpHost) {
    followUpHost.remove()
  }

  followUpHost = null
}

function showFollowUpComposer(selection: SavedSelection) {
  followUpRequestToken += 1
  followUpSelection = {
    range: selection.range.cloneRange(),
    text: selection.text,
  }

  const elements = getFollowUpPanelElements()

  if (!elements) {
    return
  }

  elements.heading.textContent = "Ask about selected text"
  elements.input.value = ""
  elements.input.disabled = false
  elements.submit.disabled = false
  elements.status.dataset.tone = ""
  elements.status.textContent = "Press Enter to ask, or Shift + Enter for a new line."
  elements.answer.textContent = ""
  elements.answer.hidden = true
  elements.copy.hidden = true
  elements.input.focus()
}

function showFollowUpError(
  elements: FollowUpPanelElements,
  message: string,
) {
  elements.input.disabled = false
  elements.submit.disabled = false
  elements.status.dataset.tone = "error"
  elements.status.textContent = message
  elements.input.focus()
}

async function submitFollowUp() {
  const selection = followUpSelection

  if (!followUpHost?.isConnected || !selection) {
    return
  }

  const elements = getFollowUpPanelElements()

  if (!elements || elements.input.disabled) {
    return
  }

  const question = elements.input.value.trim()

  if (!question) {
    showFollowUpError(elements, "Write a question before sending it.")
    return
  }

  const requestToken = ++followUpRequestToken
  elements.input.disabled = true
  elements.submit.disabled = true
  elements.copy.hidden = true
  elements.answer.hidden = true
  elements.status.dataset.tone = ""
  elements.status.textContent = "Thinking…"

  try {
    const response = (await browser.runtime.sendMessage({
      type: FOLLOW_UP_SELECTION_REQUEST_MESSAGE,
      selectedText: selection.text,
      question,
    })) as FollowUpSelectionResponse | undefined

    if (requestToken !== followUpRequestToken || followUpHost !== elements.host) {
      return
    }

    if (!response?.accepted || !response.answer?.trim()) {
      showFollowUpError(
        elements,
        response?.error ?? "Readify did not return an answer. Please try again.",
      )
      return
    }

    elements.answer.textContent = response.answer.trim()
    elements.answer.hidden = false
    elements.copy.hidden = false
    elements.input.value = ""
    elements.input.disabled = false
    elements.submit.disabled = false
    elements.status.dataset.tone = ""
    elements.status.textContent = "Ask another question about the same text, or close this panel."
    elements.input.focus()
  } catch (error) {
    if (requestToken !== followUpRequestToken || followUpHost !== elements.host) {
      return
    }

    console.warn("[Readify] Could not send the follow-up question.", error)
    showFollowUpError(elements, "Could not send the follow-up. Please try again.")
  }
}

async function copyFollowUpAnswer() {
  if (!followUpHost?.isConnected) {
    return
  }

  const elements = getFollowUpPanelElements()
  const answer = elements?.answer.textContent?.trim()

  if (!elements || !answer) {
    return
  }

  try {
    await navigator.clipboard.writeText(answer)
    elements.status.dataset.tone = ""
    elements.status.textContent = "Answer copied."
  } catch (error) {
    console.warn("[Readify] Could not copy the follow-up answer.", error)
    elements.status.dataset.tone = "error"
    elements.status.textContent = "Could not copy the answer."
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

    void loadAppTheme()
      .then((theme) => {
        followUpTheme = theme
        applyFollowUpTheme()
      })
      .catch((error) => {
        console.warn("[Readify] Could not load the saved theme for the follow-up panel.", error)
      })

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
      if (event.repeat || !event.altKey || !event.shiftKey) {
        return
      }

      const key = event.key.toLowerCase()
      const target = event.target

      if (
        target instanceof HTMLElement &&
        (target.closest("[data-readify-ui]") ||
          target.isContentEditable ||
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

      if (key === "a") {
        event.preventDefault()
        showFollowUpComposer(selection)
        return
      }

      let action: SelectedTextAction

      if (key === "s") {
        action = "simplify"
      } else if (key === "h") {
        action = "shorten"
      } else {
        return
      }

      event.preventDefault()
      void browser.runtime.sendMessage({
        type: SIMPLIFY_SELECTION_REQUEST_MESSAGE,
        action,
      }).then((response) => {
        if (response && response.accepted === false) {
          showSimplifyStatus(
            response.error ??
              (action === "shorten"
                ? "Could not shorten the selection."
                : "Could not simplify the selection."),
            "error",
          )
        }
      }).catch((error) => {
        console.warn("[Readify] Could not start selected-text action.", error)
        showSimplifyStatus(
          action === "shorten"
            ? "Could not shorten the selection."
            : "Could not simplify the selection.",
          "error",
        )
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
        setActiveSettings(await loadEffectiveSiteSettings(hostname))
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

      if (changes[THEME_STORAGE_KEY]) {
        followUpTheme = normalizeAppTheme(changes[THEME_STORAGE_KEY].newValue)
        applyFollowUpTheme()
      }

      if (
        changes[storageKey] ||
        changes[GLOBAL_SITE_SETTINGS_STORAGE_KEY] ||
        changes[GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY]
      ) {
        void loadSettings()
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

      if (isOpenFollowUpMessage(message)) {
        if (followUpHost?.isConnected) {
          return Promise.resolve({accepted: true})
        }

        const selection = getSavedSelection() ?? captureSelection()

        if (!selection) {
          const error = "Select some text before asking a follow-up."
          showSimplifyStatus(error, "error")
          return Promise.resolve({accepted: false, error})
        }

        showFollowUpComposer(selection)
        return Promise.resolve({accepted: true})
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
          showSimplifyStatus(
            message.action === "shorten" ? "Text shortened." : "Text simplified.",
            "success",
          )
        } else {
          showSimplifyStatus(
            response.error ?? "Could not update the selected text.",
            "error",
          )
        }

        return Promise.resolve(response)
      }

      if (isSimplifyStatusMessage(message)) {
        showSimplifyStatus(
          message.message ??
            (message.status === "loading"
              ? "Updating selected text…"
              : message.status === "success"
                ? "Selected text updated."
                : "Could not update the selected text."),
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
