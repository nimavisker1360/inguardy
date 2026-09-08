"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import enTranslations from "../../public/locales/en/common.json";
import faTranslations from "../../public/locales/fa/common.json";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/language-preferences";

export {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/language-preferences";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const bundledTranslations: Record<Language, Record<string, unknown>> = {
  en: asTranslationRecord(enTranslations),
  fa: asTranslationRecord(faTranslations),
};

function applyDocumentLanguage(lang: Language, direction?: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dir = direction || (lang === "fa" ? "rtl" : "ltr");
  document.documentElement.lang = lang;
}

function persistLanguage(lang: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {}

  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

function isSupportedLanguage(value: unknown): value is Language {
  return value === "en" || value === "fa";
}

function readPersistedLanguage(): Language | null {
  if (typeof window === "undefined") {
    return null;
  }

  let storedLanguage: string | null = null;

  try {
    storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {}

  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage;
  }

  let cookieMatch: RegExpMatchArray | null = null;

  try {
    cookieMatch = document.cookie.match(
      new RegExp(`(?:^|; )${LANGUAGE_COOKIE_KEY}=(en|fa)(?:;|$)`)
    );
  } catch {}

  return isSupportedLanguage(cookieMatch?.[1]) ? cookieMatch[1] : null;
}

function getInitialLanguage(fallback: Language) {
  return readPersistedLanguage() ?? fallback;
}

function asTranslationRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function translationsMatchLanguage(
  source: Record<string, unknown>,
  lang: Language
) {
  const direction = source.direction;

  if (typeof direction !== "string") {
    return true;
  }

  return lang === "fa" ? direction === "rtl" : direction === "ltr";
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(
    () => getInitialLanguage(initialLanguage)
  );
  const [translations, setTranslations] = useState<Record<string, unknown>>(
    () => bundledTranslations[getInitialLanguage(initialLanguage)]
  );

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setTranslations(bundledTranslations[lang]);
    persistLanguage(lang);
    applyDocumentLanguage(lang);
  }, []);

  useEffect(() => {
    const persistedLanguage = readPersistedLanguage();

    if (!persistedLanguage) {
      persistLanguage(initialLanguage);
      return;
    }

    if (persistedLanguage !== initialLanguage) {
      setLanguageState(persistedLanguage);
      setTranslations(bundledTranslations[persistedLanguage]);
      applyDocumentLanguage(persistedLanguage);
    }

    persistLanguage(persistedLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    setTranslations(bundledTranslations[language]);
    applyDocumentLanguage(
      language,
      typeof bundledTranslations[language].direction === "string"
        ? bundledTranslations[language].direction
        : undefined
    );
    persistLanguage(language);
  }, [language]);

  const translateFrom = (
    source: Record<string, unknown>,
    key: string
  ): string | null => {
    if (typeof key !== "string" || key.length === 0) {
      return "";
    }

    const keys = key.split(".");
    let result: unknown = source;

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }

    return typeof result === "string" ? result : null;
  };

  // Translation function that handles nested keys.
  const t = (key: string): string => {
    const activeTranslations = translationsMatchLanguage(translations, language)
      ? translations
      : bundledTranslations[language];

    return (
      translateFrom(activeTranslations, key) ??
      translateFrom(bundledTranslations[language], key) ??
      translateFrom(bundledTranslations.en, key) ??
      key
    );
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
