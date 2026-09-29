import {
  LEGACY_FONT_SIZE_STORAGE_KEY,
  SITE_SETTINGS_STORAGE_KEY_PREFIX,
  createDefaultSiteSettings,
  isRecord,
  legacyFontSizeSettingsToSiteSettings,
  normalizeSiteSettings,
  type SiteSettings,
} from "@/lib/font-size"
import {
  normalizeAiProvider,
  type AiProvider,
} from "@/lib/ai"

export type StorageOperation = "read" | "write"

export const GEMINI_API_KEY_STORAGE_KEY = "readify.geminiApiKey"
export const GROQ_API_KEY_STORAGE_KEY = "readify.groqApiKey"
export const GROK_API_KEY_STORAGE_KEY = "readify.grokApiKey"
export const AI_PROVIDER_STORAGE_KEY = "readify.aiProvider"
export const THEME_STORAGE_KEY = "readify.theme"
export const HIDE_POPUP_HEADER_STORAGE_KEY = "readify.hidePopupHeader"
export const GLOBAL_SITE_SETTINGS_STORAGE_KEY = "readify.globalSiteSettings"
export const GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY = "readify.globalSettingsExclusions"
export const SETTINGS_PRESETS_STORAGE_KEY = "readify.settingsPresets"
export const GLOBAL_PRESET_ID_STORAGE_KEY = "readify.globalPresetId"
export const SIMPLIFY_RESULT_STORAGE_KEY = "readify.simplifyResult"

export type AppTheme = "light" | "dark"

export type SettingsPreset = {
  id: string
  name: string
  settings: SiteSettings
}

export type SettingsBackup = {
  format: "readify-settings-backup"
  version: 1
  exportedAt: string
  globalSettings: SiteSettings
  globalSettingsExclusions: string[]
  globalPresetId: string | null
  presets: SettingsPreset[]
  siteSettings: Record<string, SiteSettings>
  theme: AppTheme
  hidePopupHeader: boolean
  aiProvider: AiProvider
}

export class SettingsStorageError extends Error {
  operation: StorageOperation
  causeValue: unknown

  constructor(operation: StorageOperation, causeValue: unknown) {
    const detail = causeValue instanceof Error ? causeValue.message : String(causeValue)
    super(detail || `Unable to ${operation} Readify settings.`)
    this.name = "SettingsStorageError"
    this.operation = operation
    this.causeValue = causeValue
  }
}

export function getSiteSettingsStorageKey(hostname: string): string {
  return `${SITE_SETTINGS_STORAGE_KEY_PREFIX}${encodeURIComponent(hostname)}`
}

function getStorageArea() {
  if (typeof browser === "undefined" || !browser.storage?.local) {
    throw new SettingsStorageError(
      "read",
      new Error("The browser storage API is unavailable."),
    )
  }

  return browser.storage.local
}

async function readStorage(
  keys: string | string[] | null,
): Promise<Record<string, unknown>> {
  try {
    return (await getStorageArea().get(keys)) as Record<string, unknown>
  } catch (error) {
    if (error instanceof SettingsStorageError) {
      throw error
    }

    throw new SettingsStorageError("read", error)
  }
}

async function writeStorage(values: Record<string, unknown>): Promise<void> {
  try {
    await getStorageArea().set(values)
  } catch (error) {
    if (error instanceof SettingsStorageError) {
      throw new SettingsStorageError("write", error.causeValue)
    }

    throw new SettingsStorageError("write", error)
  }
}

async function removeStorage(keys: string | string[]): Promise<void> {
  try {
    await getStorageArea().remove(keys)
  } catch (error) {
    if (error instanceof SettingsStorageError) {
      throw new SettingsStorageError("write", error.causeValue)
    }

    throw new SettingsStorageError("write", error)
  }
}

export async function loadStoredSiteSettings(
  hostname: string,
): Promise<SiteSettings | null> {
  const storageKey = getSiteSettingsStorageKey(hostname)
  const currentValues = await readStorage(storageKey)

  if (Object.prototype.hasOwnProperty.call(currentValues, storageKey)) {
    return normalizeSiteSettings(currentValues[storageKey])
  }

  const legacyValues = await readStorage(LEGACY_FONT_SIZE_STORAGE_KEY)
  const legacyProfiles = legacyValues[LEGACY_FONT_SIZE_STORAGE_KEY]

  if (!isRecord(legacyProfiles)) {
    return null
  }

  const legacyProfile = legacyProfiles[hostname]
  const migratedSettings = legacyFontSizeSettingsToSiteSettings(legacyProfile)

  if (!migratedSettings) {
    return null
  }

  try {
    await writeStorage({ [storageKey]: migratedSettings })
  } catch (error) {
    console.warn("[Readify] Could not persist migrated settings.", error)
  }

  return migratedSettings
}

export async function loadSiteSettings(hostname: string): Promise<SiteSettings> {
  return (await loadStoredSiteSettings(hostname)) ?? createDefaultSiteSettings()
}

export async function saveSiteSettings(
  hostname: string,
  settings: SiteSettings,
): Promise<SiteSettings> {
  const normalizedSettings = normalizeSiteSettings(settings)
  const storageKey = getSiteSettingsStorageKey(hostname)

  await writeStorage({
    [storageKey]: normalizedSettings,
  })

  return normalizedSettings
}

export async function loadGeminiApiKey(): Promise<string> {
  const values = await readStorage(GEMINI_API_KEY_STORAGE_KEY)
  const apiKey = values[GEMINI_API_KEY_STORAGE_KEY]

  return typeof apiKey === "string" ? apiKey.trim() : ""
}

export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  await writeStorage({
    [GEMINI_API_KEY_STORAGE_KEY]: apiKey.trim(),
  })
}

export async function loadGroqApiKey(): Promise<string> {
  const values = await readStorage(GROQ_API_KEY_STORAGE_KEY)
  const apiKey = values[GROQ_API_KEY_STORAGE_KEY]

  return typeof apiKey === "string" ? apiKey.trim() : ""
}

export async function saveGroqApiKey(apiKey: string): Promise<void> {
  await writeStorage({
    [GROQ_API_KEY_STORAGE_KEY]: apiKey.trim(),
  })
}

export async function loadGrokApiKey(): Promise<string> {
  const values = await readStorage(GROK_API_KEY_STORAGE_KEY)
  const apiKey = values[GROK_API_KEY_STORAGE_KEY]

  return typeof apiKey === "string" ? apiKey.trim() : ""
}

export async function saveGrokApiKey(apiKey: string): Promise<void> {
  await writeStorage({
    [GROK_API_KEY_STORAGE_KEY]: apiKey.trim(),
  })
}

export async function loadAiProvider(): Promise<AiProvider> {
  const values = await readStorage(AI_PROVIDER_STORAGE_KEY)
  return normalizeAiProvider(values[AI_PROVIDER_STORAGE_KEY])
}

export async function saveAiProvider(provider: AiProvider): Promise<void> {
  await writeStorage({
    [AI_PROVIDER_STORAGE_KEY]: normalizeAiProvider(provider),
  })
}

export function normalizeAppTheme(value: unknown): AppTheme {
  return value === "dark" ? "dark" : "light"
}

export async function loadAppTheme(): Promise<AppTheme> {
  const values = await readStorage(THEME_STORAGE_KEY)
  return normalizeAppTheme(values[THEME_STORAGE_KEY])
}

export async function saveAppTheme(theme: AppTheme): Promise<void> {
  await writeStorage({
    [THEME_STORAGE_KEY]: normalizeAppTheme(theme),
  })
}

export async function loadHidePopupHeader(): Promise<boolean> {
  const values = await readStorage(HIDE_POPUP_HEADER_STORAGE_KEY)
  return values[HIDE_POPUP_HEADER_STORAGE_KEY] === true
}

export async function saveHidePopupHeader(hidePopupHeader: boolean): Promise<void> {
  await writeStorage({
    [HIDE_POPUP_HEADER_STORAGE_KEY]: hidePopupHeader === true,
  })
}

export async function loadGlobalSiteSettings(): Promise<SiteSettings> {
  const values = await readStorage(GLOBAL_SITE_SETTINGS_STORAGE_KEY)
  return Object.prototype.hasOwnProperty.call(values, GLOBAL_SITE_SETTINGS_STORAGE_KEY)
    ? normalizeSiteSettings(values[GLOBAL_SITE_SETTINGS_STORAGE_KEY])
    : createDefaultSiteSettings()
}

export async function hasGlobalSiteSettings(): Promise<boolean> {
  const values = await readStorage(GLOBAL_SITE_SETTINGS_STORAGE_KEY)
  return Object.prototype.hasOwnProperty.call(values, GLOBAL_SITE_SETTINGS_STORAGE_KEY)
}

export async function saveGlobalSiteSettings(
  settings: SiteSettings,
): Promise<SiteSettings> {
  const normalizedSettings = normalizeSiteSettings(settings)

  await writeStorage({
    [GLOBAL_SITE_SETTINGS_STORAGE_KEY]: normalizedSettings,
  })

  return normalizedSettings
}

export function normalizeHostnameInput(value: string): string | null {
  const trimmedValue = value.trim().toLowerCase()

  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(
      trimmedValue.includes("://") ? trimmedValue : `https://${trimmedValue}`,
    )

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null
    }

    return parsedUrl.hostname || null
  } catch {
    return null
  }
}

export async function loadGlobalSettingsExclusions(): Promise<string[]> {
  const values = await readStorage(GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY)
  const rawExclusions = values[GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY]

  if (!Array.isArray(rawExclusions)) {
    return []
  }

  return normalizeHostnameList(rawExclusions)
}

export async function saveGlobalSettingsExclusions(
  hostnames: string[],
): Promise<string[]> {
  const normalizedHostnames = normalizeHostnameList(hostnames)

  await writeStorage({
    [GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY]: normalizedHostnames,
  })

  return normalizedHostnames
}

export async function loadEffectiveSiteSettings(
  hostname: string,
): Promise<SiteSettings> {
  const siteSettings = await loadStoredSiteSettings(hostname)

  if (siteSettings) {
    return siteSettings
  }

  const exclusions = await loadGlobalSettingsExclusions()

  if (exclusions.includes(hostname.toLowerCase())) {
    return createDefaultSiteSettings()
  }

  return loadGlobalSiteSettings()
}

export async function removeSiteSettings(hostname: string): Promise<void> {
  await removeStorage(getSiteSettingsStorageKey(hostname))
}

function normalizeHostnameList(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map(normalizeHostnameInput)
        .filter((hostname): hostname is string => hostname !== null),
    ),
  )
}

export function createSettingsPreset(
  name: string,
  settings: SiteSettings,
): SettingsPreset {
  const generatedId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    id: generatedId,
    name: name.trim(),
    settings: normalizeSiteSettings(settings),
  }
}

export async function loadSettingsPresets(): Promise<SettingsPreset[]> {
  const values = await readStorage(SETTINGS_PRESETS_STORAGE_KEY)
  const rawPresets = values[SETTINGS_PRESETS_STORAGE_KEY]

  if (!Array.isArray(rawPresets)) {
    return []
  }

  return rawPresets.flatMap((value) => {
    if (!isRecord(value)) {
      return []
    }

    const id = typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : null
    const name = typeof value.name === "string" ? value.name.trim() : ""

    if (!id || !name) {
      return []
    }

    return [{
      id,
      name,
      settings: normalizeSiteSettings(value.settings),
    }]
  })
}

export async function saveSettingsPresets(
  presets: SettingsPreset[],
): Promise<SettingsPreset[]> {
  const normalizedPresets = presets.flatMap((preset) => {
    const name = preset.name.trim()

    if (!preset.id || !name) {
      return []
    }

    return [{
      id: preset.id,
      name,
      settings: normalizeSiteSettings(preset.settings),
    }]
  })

  await writeStorage({
    [SETTINGS_PRESETS_STORAGE_KEY]: normalizedPresets,
  })

  return normalizedPresets
}

export async function loadGlobalPresetId(): Promise<string | null> {
  const values = await readStorage(GLOBAL_PRESET_ID_STORAGE_KEY)
  const presetId = values[GLOBAL_PRESET_ID_STORAGE_KEY]

  return typeof presetId === "string" && presetId.trim()
    ? presetId.trim()
    : null
}

export async function saveGlobalPresetId(presetId: string | null): Promise<void> {
  if (presetId) {
    await writeStorage({
      [GLOBAL_PRESET_ID_STORAGE_KEY]: presetId.trim(),
    })
    return
  }

  await removeStorage(GLOBAL_PRESET_ID_STORAGE_KEY)
}

export async function exportSettingsBackup(): Promise<SettingsBackup> {
  const [
    globalSettings,
    globalSettingsExclusions,
    globalPresetId,
    presets,
    theme,
    hidePopupHeader,
    aiProvider,
    storedValues,
  ] = await Promise.all([
    loadGlobalSiteSettings(),
    loadGlobalSettingsExclusions(),
    loadGlobalPresetId(),
    loadSettingsPresets(),
    loadAppTheme(),
    loadHidePopupHeader(),
    loadAiProvider(),
    readStorage(null),
  ])

  const siteSettings = loadSiteSettingsFromStorageValues(storedValues)

  return {
    format: "readify-settings-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    globalSettings,
    globalSettingsExclusions,
    globalPresetId: presets.some((preset) => preset.id === globalPresetId)
      ? globalPresetId
      : null,
    presets,
    siteSettings,
    theme,
    hidePopupHeader,
    aiProvider,
  }
}

export async function importSettingsBackup(value: unknown): Promise<SettingsBackup> {
  const backup = normalizeSettingsBackup(value)
  const storedValues = await readStorage(null)
  const existingSiteKeys = Object.keys(storedValues).filter((key) =>
    key.startsWith(SITE_SETTINGS_STORAGE_KEY_PREFIX),
  )
  const importedSiteKeys = Object.keys(backup.siteSettings).map(getSiteSettingsStorageKey)
  const valuesToWrite: Record<string, unknown> = {
    [GLOBAL_SITE_SETTINGS_STORAGE_KEY]: backup.globalSettings,
    [GLOBAL_SETTINGS_EXCLUSIONS_STORAGE_KEY]: backup.globalSettingsExclusions,
    [SETTINGS_PRESETS_STORAGE_KEY]: backup.presets,
    [THEME_STORAGE_KEY]: backup.theme,
    [HIDE_POPUP_HEADER_STORAGE_KEY]: backup.hidePopupHeader,
    [AI_PROVIDER_STORAGE_KEY]: backup.aiProvider,
  }

  for (const [hostname, settings] of Object.entries(backup.siteSettings)) {
    valuesToWrite[getSiteSettingsStorageKey(hostname)] = settings
  }

  await writeStorage(valuesToWrite)

  const siteKeysToRemove = existingSiteKeys.filter(
    (key) => !importedSiteKeys.includes(key),
  )

  if (siteKeysToRemove.length > 0) {
    await removeStorage(siteKeysToRemove)
  }

  if (backup.globalPresetId) {
    await saveGlobalPresetId(backup.globalPresetId)
  } else {
    await saveGlobalPresetId(null)
  }

  return backup
}

function normalizeSettingsBackup(value: unknown): SettingsBackup {
  if (!isRecord(value) || value.format !== "readify-settings-backup" || value.version !== 1) {
    throw new Error("This is not a valid Readify settings backup.")
  }

  if (!Array.isArray(value.presets) || !Array.isArray(value.globalSettingsExclusions)) {
    throw new Error("The Readify backup is missing required settings.")
  }

  if (!isRecord(value.siteSettings)) {
    throw new Error("The Readify backup has invalid website settings.")
  }

  const presets = normalizeSettingsPresets(value.presets)
  const siteSettings: Record<string, SiteSettings> = {}

  for (const [rawHostname, rawSettings] of Object.entries(value.siteSettings)) {
    const hostname = normalizeHostnameInput(rawHostname)

    if (hostname) {
      siteSettings[hostname] = normalizeSiteSettings(rawSettings)
    }
  }

  const rawGlobalPresetId = typeof value.globalPresetId === "string"
    ? value.globalPresetId.trim()
    : ""

  return {
    format: "readify-settings-backup",
    version: 1,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    globalSettings: normalizeSiteSettings(value.globalSettings),
    globalSettingsExclusions: normalizeHostnameList(value.globalSettingsExclusions),
    globalPresetId: presets.some((preset) => preset.id === rawGlobalPresetId)
      ? rawGlobalPresetId
      : null,
    presets,
    siteSettings,
    theme: normalizeAppTheme(value.theme),
    hidePopupHeader: value.hidePopupHeader === true,
    aiProvider: normalizeAiProvider(value.aiProvider),
  }
}

function normalizeSettingsPresets(value: unknown): SettingsPreset[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()

  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return []
    }

    const id = typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id.trim()
      : null
    const name = typeof candidate.name === "string" ? candidate.name.trim() : ""

    if (!id || !name || seenIds.has(id)) {
      return []
    }

    seenIds.add(id)

    return [{
      id,
      name,
      settings: normalizeSiteSettings(candidate.settings),
    }]
  })
}

function loadSiteSettingsFromStorageValues(
  values: Record<string, unknown>,
): Record<string, SiteSettings> {
  const siteSettings: Record<string, SiteSettings> = {}

  for (const [storageKey, rawSettings] of Object.entries(values)) {
    if (!storageKey.startsWith(SITE_SETTINGS_STORAGE_KEY_PREFIX)) {
      continue
    }

    try {
      const hostname = normalizeHostnameInput(
        decodeURIComponent(storageKey.slice(SITE_SETTINGS_STORAGE_KEY_PREFIX.length)),
      )

      if (hostname) {
        siteSettings[hostname] = normalizeSiteSettings(rawSettings)
      }
    } catch {
      // Ignore malformed site-settings keys in an export.
    }
  }

  return siteSettings
}

export async function loadAiApiKey(provider: AiProvider): Promise<string> {
  if (provider === "groq") {
    return loadGroqApiKey()
  }

  return provider === "grok" ? loadGrokApiKey() : loadGeminiApiKey()
}

export async function saveAiApiKey(
  provider: AiProvider,
  apiKey: string,
): Promise<void> {
  if (provider === "groq") {
    await saveGroqApiKey(apiKey)
    return
  }

  if (provider === "grok") {
    await saveGrokApiKey(apiKey)
    return
  }

  await saveGeminiApiKey(apiKey)
}

export async function loadSimplifyResult(): Promise<string | null> {
  const values = await readStorage(SIMPLIFY_RESULT_STORAGE_KEY)
  const result = values[SIMPLIFY_RESULT_STORAGE_KEY]

  return typeof result === "string" && result ? result : null
}

export async function saveSimplifyResult(result: string): Promise<void> {
  await writeStorage({
    [SIMPLIFY_RESULT_STORAGE_KEY]: result,
  })
}

export async function clearSimplifyResult(): Promise<void> {
  await removeStorage(SIMPLIFY_RESULT_STORAGE_KEY)
}

export function getStorageErrorMessage(
  error: unknown,
  operation: StorageOperation,
): string {
  const detail = error instanceof SettingsStorageError
    ? error.message.toLowerCase()
    : String(error).toLowerCase()

  if (
    detail.includes("permission") ||
    detail.includes("unavailable") ||
    detail.includes("context invalid") ||
    detail.includes("access")
  ) {
    return "Readify storage is unavailable. Reload the extension and try again."
  }

  return operation === "write"
    ? "Could not save these settings. Please try again."
    : "Could not load saved settings. Defaults are ready to use."
}
