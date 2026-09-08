import "@/assets/reading-fonts.css"

import {
  APPLY_SITE_SETTINGS_MESSAGE,
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

function hasDirectText(element: HTMLElement): boolean {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  )
}

function isVisibleTextElement(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || SKIPPED_TAGS.has(element.tagName)) {
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

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    const hostname = getSupportedHostname(window.location.href)

    if (!hostname || !document.body) {
      return
    }

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
      if (!isSiteSettingsMessage(message)) {
        return
      }

      setActiveSettings(message.settings)
      return Promise.resolve({ applied: true })
    })
  },
})
