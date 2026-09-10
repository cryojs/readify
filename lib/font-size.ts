export const LEGACY_FONT_SIZE_STORAGE_KEY = "readify.fontSizeProfiles"
export const SITE_SETTINGS_STORAGE_KEY_PREFIX = "readify.siteSettings."
export const APPLY_SITE_SETTINGS_MESSAGE = "APPLY_SITE_SETTINGS"
export const GET_PAGE_TEXT_MESSAGE = "GET_PAGE_TEXT"
export const SITE_SETTINGS_VERSION = 2 as const

export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 72
export const FONT_SIZE_STEP = 1

export const MIN_TEXT_SCALE = 50
export const MAX_TEXT_SCALE = 300
export const TEXT_SCALE_STEP = 5

export const MIN_LETTER_SPACING = -1
export const MAX_LETTER_SPACING = 3
export const LETTER_SPACING_STEP = 0.1

export const MIN_LINE_HEIGHT = 1
export const MAX_LINE_HEIGHT = 3
export const LINE_HEIGHT_STEP = 0.1

export const FONT_SIZE_FIELDS = [
  {
    key: "body",
    label: "Body text",
    description: "Paragraphs, lists, and general copy",
    preview: "Make every word easier to read.",
    defaultValue: 16,
  },
  {
    key: "headings",
    label: "Headings",
    description: "H1 through H6 section titles",
    preview: "Simplify Text",
    defaultValue: 28,
  },
  {
    key: "links",
    label: "Links",
    description: "Anchors and link labels",
    preview: "Click me!",
    defaultValue: 16,
  },
  {
    key: "controls",
    label: "Controls",
    description: "Buttons, inputs, and menus",
    preview: "Save your changes?",
    defaultValue: 14,
  },
  {
    key: "small",
    label: "Small text",
    description: "Captions, metadata, and fine print",
    preview: "A clearer page starts here.",
    defaultValue: 12,
  },
] as const

export type FontSizeCategory = (typeof FONT_SIZE_FIELDS)[number]["key"]
export type ExactFontSizeOverrides = Partial<Record<FontSizeCategory, number>>

export const WEBSITE_DEFAULT_FONT_FAMILY_OPTION = {
  value: "site-default",
  label: "Website Default",
  css: null,
} as const

type FontFamilyOption = {
  readonly value: string
  readonly label: string
  readonly css: string | null
}

export const FONT_FAMILY_GROUPS = [
  {
    label: "Recommended",
    options: [
      {
        value: "atkinson-hyperlegible-next",
        label: "Atkinson Hyperlegible Next",
        css: '"Atkinson Hyperlegible Next Variable", sans-serif',
      },
      {
        value: "lexend",
        label: "Lexend",
        css: '"Lexend Variable", sans-serif',
      },
      {
        value: "verdana",
        label: "Verdana",
        css: "Verdana, Geneva, sans-serif",
      },
    ],
  },
  {
    label: "Sans Serif",
    options: [
      {
        value: "system-ui",
        label: "System UI",
        css: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
      {
        value: "arial",
        label: "Arial",
        css: "Arial, Helvetica, sans-serif",
      },
      {
        value: "tahoma",
        label: "Tahoma",
        css: "Tahoma, sans-serif",
      },
      {
        value: "trebuchet",
        label: "Trebuchet MS",
        css: '"Trebuchet MS", Arial, sans-serif',
      },
      {
        value: "geist",
        label: "Geist",
        css: '"Geist Variable", sans-serif',
      },
    ],
  },
  {
    label: "Serif",
    options: [
      {
        value: "georgia",
        label: "Georgia",
        css: 'Georgia, "Times New Roman", serif',
      },
      {
        value: "charter",
        label: "Charter",
        css: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
      },
      {
        value: "times-new-roman",
        label: "Times New Roman",
        css: '"Times New Roman", Times, serif',
      },
    ],
  },
  {
    label: "Monospace",
    options: [
      {
        value: "jetbrains-mono",
        label: "JetBrains Mono",
        css: '"JetBrains Mono Variable", monospace',
      },
      {
        value: "ibm-plex-mono",
        label: "IBM Plex Mono",
        css: '"IBM Plex Mono", monospace',
      },
      {
        value: "source-code-pro",
        label: "Source Code Pro",
        css: '"Source Code Pro Variable", monospace',
      },
    ],
  },
  {
    label: "Distinctive",
    options: [
      {
        value: "open-dyslexic",
        label: "OpenDyslexic",
        css: '"OpenDyslexic", sans-serif',
      },
      {
        value: "comic-sans-ms",
        label: "Comic Sans MS",
        css: '"Comic Sans MS", "Comic Sans", cursive',
      },
    ],
  },
] as const

const ALL_FONT_FAMILY_GROUP_OPTIONS = FONT_FAMILY_GROUPS.reduce<FontFamilyOption[]>(
  (options, group) => {
    options.push(...(group.options as readonly FontFamilyOption[]))
    return options
  },
  [],
)

export const FONT_FAMILY_OPTIONS: readonly FontFamilyOption[] = [
  WEBSITE_DEFAULT_FONT_FAMILY_OPTION,
  ...ALL_FONT_FAMILY_GROUP_OPTIONS,
]

export type FontFamilyKey =
  | typeof WEBSITE_DEFAULT_FONT_FAMILY_OPTION["value"]
  | (typeof FONT_FAMILY_GROUPS)[number]["options"][number]["value"]

export type TextSizeSettings = {
  scale: number
  overrides: ExactFontSizeOverrides
}

export type TypographySettings = {
  fontFamily: FontFamilyKey
  letterSpacing: number | null
  lineHeight: number | null
}

export type SiteSettings = {
  version: typeof SITE_SETTINGS_VERSION
  textSize: TextSizeSettings
  typography: TypographySettings
}

export type SiteSettingsMessage = {
  type: typeof APPLY_SITE_SETTINGS_MESSAGE
  settings: SiteSettings
}

export type GetPageTextMessage = {
  type: typeof GET_PAGE_TEXT_MESSAGE
}

export type PageTextResponse = {
  text: string
}

export const DEFAULT_TEXT_SIZE_SETTINGS: TextSizeSettings = {
  scale: 100,
  overrides: {},
}

export const DEFAULT_TYPOGRAPHY_SETTINGS: TypographySettings = {
  fontFamily: "site-default",
  letterSpacing: null,
  lineHeight: null,
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  version: SITE_SETTINGS_VERSION,
  textSize: DEFAULT_TEXT_SIZE_SETTINGS,
  typography: DEFAULT_TYPOGRAPHY_SETTINGS,
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function roundToStep(value: number, step: number): number {
  const precision = step < 1 ? 10 : 1
  return Math.round(value * precision) / precision
}

export function clampNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  step: number,
  fallback: number,
): number {
  if (typeof value === "string" && value.trim() === "") {
    return fallback
  }

  const parsedValue = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  const steppedValue = roundToStep(parsedValue, step)
  return roundToStep(
    Math.min(maximum, Math.max(minimum, steppedValue)),
    step,
  )
}

export function clampFontSize(value: unknown, fallback: number): number {
  return clampNumber(value, MIN_FONT_SIZE, MAX_FONT_SIZE, FONT_SIZE_STEP, fallback)
}

export function createDefaultTextSizeSettings(): TextSizeSettings {
  return {
    scale: DEFAULT_TEXT_SIZE_SETTINGS.scale,
    overrides: {},
  }
}

export function createDefaultTypographySettings(): TypographySettings {
  return { ...DEFAULT_TYPOGRAPHY_SETTINGS }
}

export function createDefaultSiteSettings(): SiteSettings {
  return {
    version: SITE_SETTINGS_VERSION,
    textSize: createDefaultTextSizeSettings(),
    typography: createDefaultTypographySettings(),
  }
}

export function normalizeTextSizeSettings(value: unknown): TextSizeSettings {
  const record = isRecord(value) ? value : {}
  const rawOverrides = isRecord(record.overrides) ? record.overrides : {}
  const overrides: ExactFontSizeOverrides = {}

  for (const field of FONT_SIZE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(rawOverrides, field.key)) {
      overrides[field.key] = clampFontSize(
        rawOverrides[field.key],
        field.defaultValue,
      )
    }
  }

  return {
    scale: clampNumber(
      record.scale,
      MIN_TEXT_SCALE,
      MAX_TEXT_SCALE,
      TEXT_SCALE_STEP,
      DEFAULT_TEXT_SIZE_SETTINGS.scale,
    ),
    overrides,
  }
}

function normalizeFontFamily(value: unknown): FontFamilyKey {
  if (value === "helvetica") {
    return "geist"
  }

  if (
    FONT_FAMILY_OPTIONS.some(
      (option) => option.value === value,
    )
  ) {
    return value as FontFamilyKey
  }

  return DEFAULT_TYPOGRAPHY_SETTINGS.fontFamily
}

function normalizeOptionalNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  step: number,
): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string" && value.trim() === "") {
    return null
  }

  return clampNumber(value, minimum, maximum, step, minimum)
}

export function normalizeTypographySettings(value: unknown): TypographySettings {
  const record = isRecord(value) ? value : {}

  return {
    fontFamily: normalizeFontFamily(record.fontFamily),
    letterSpacing: normalizeOptionalNumber(
      record.letterSpacing,
      MIN_LETTER_SPACING,
      MAX_LETTER_SPACING,
      LETTER_SPACING_STEP,
    ),
    lineHeight: normalizeOptionalNumber(
      record.lineHeight,
      MIN_LINE_HEIGHT,
      MAX_LINE_HEIGHT,
      LINE_HEIGHT_STEP,
    ),
  }
}

export function normalizeSiteSettings(value: unknown): SiteSettings {
  const record = isRecord(value) ? value : {}

  return {
    version: SITE_SETTINGS_VERSION,
    textSize: normalizeTextSizeSettings(record.textSize),
    typography: normalizeTypographySettings(record.typography),
  }
}

export function legacyFontSizeSettingsToSiteSettings(
  value: unknown,
): SiteSettings | null {
  if (!isRecord(value)) {
    return null
  }

  const hasLegacyValue = FONT_SIZE_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(value, field.key),
  )

  if (!hasLegacyValue) {
    return null
  }

  const overrides: ExactFontSizeOverrides = {}

  for (const field of FONT_SIZE_FIELDS) {
    overrides[field.key] = clampFontSize(value[field.key], field.defaultValue)
  }

  return {
    version: SITE_SETTINGS_VERSION,
    textSize: {
      scale: 100,
      overrides,
    },
    typography: createDefaultTypographySettings(),
  }
}

export function getSupportedHostname(url: string | undefined): string | null {
  if (!url) {
    return null
  }

  try {
    const parsedUrl = new URL(url)

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null
    }

    return parsedUrl.hostname.toLowerCase() || null
  } catch {
    return null
  }
}

export function getFontFamilyCss(fontFamily: FontFamilyKey): string | null {
  return (
    FONT_FAMILY_OPTIONS.find((option) => option.value === fontFamily)?.css ?? null
  )
}

export function getFontSizeCategory(element: Element): FontSizeCategory {
  if (
    element.closest(
      "small, sub, sup, caption, figcaption, time",
    )
  ) {
    return "small"
  }

  if (
    element.closest(
      "button, input:not([type=hidden]), textarea, select, option, [role=button]",
    )
  ) {
    return "controls"
  }

  if (element.closest("a")) {
    return "links"
  }

  if (element.closest("h1, h2, h3, h4, h5, h6")) {
    return "headings"
  }

  return "body"
}

export function isSiteSettingsMessage(value: unknown): value is SiteSettingsMessage {
  return (
    isRecord(value) &&
    value.type === APPLY_SITE_SETTINGS_MESSAGE &&
    isRecord(value.settings)
  )
}

export function isGetPageTextMessage(value: unknown): value is GetPageTextMessage {
  return isRecord(value) && value.type === GET_PAGE_TEXT_MESSAGE
}

export function isPageTextResponse(value: unknown): value is PageTextResponse {
  return isRecord(value) && typeof value.text === "string"
}
