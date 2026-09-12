import {
  LEGACY_FONT_SIZE_STORAGE_KEY,
  SITE_SETTINGS_STORAGE_KEY_PREFIX,
  createDefaultSiteSettings,
  isRecord,
  legacyFontSizeSettingsToSiteSettings,
  normalizeSiteSettings,
  type SiteSettings,
} from "@/lib/font-size"

export type StorageOperation = "read" | "write"

export const GEMINI_API_KEY_STORAGE_KEY = "readify.geminiApiKey"

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

async function readStorage(keys: string | string[]): Promise<Record<string, unknown>> {
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

  return typeof apiKey === "string" ? apiKey : ""
}

export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  await writeStorage({
    [GEMINI_API_KEY_STORAGE_KEY]: apiKey,
  })
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
