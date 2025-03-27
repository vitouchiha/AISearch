export const getDefaultLanguage = (): string => {
    if (typeof navigator !== "undefined" && navigator.language) {
      // Extract the primary language code, e.g., "en" from "en-US"
      return navigator.language.split('-')[0];
    }
    return 'en';
  };