export type Language = "en" | "fa";

export const LANGUAGE_STORAGE_KEY = "signal-forex-language";
export const LANGUAGE_COOKIE_KEY = "signal_forex_language";
export const DEFAULT_LANGUAGE: Language = "en";

// Persian translations and assets stay in the project while their public
// language option is temporarily hidden. Set this to `true` to restore it.
export const PERSIAN_LANGUAGE_ENABLED = false;
export const LANGUAGE_FLAGS_ENABLED = false;
export const LANGUAGE_SWITCHER_ENABLED = false;

export function resolveAvailableLanguage(value: unknown): Language {
  if (value === "fa" && PERSIAN_LANGUAGE_ENABLED) {
    return "fa";
  }

  return "en";
}
