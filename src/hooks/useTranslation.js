import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useTranslationContext } from '../context/TranslationContext';
import { useEffect } from 'react';

export const useTranslation = (namespace) => {
  const i18nTranslation = useI18nTranslation(namespace);
  const translationContext = useTranslationContext();

  // Available languages with flags and names
  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  ];

  const currentLanguage = i18nTranslation.i18n.language || 'en';

  // RTL languages
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

  // Set document direction based on current language
  useEffect(() => {
    const isRTL = rtlLanguages.includes(currentLanguage);
    // Only set RTL on body, not the entire document
    document.body.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLanguage);
    
    // Add RTL class to body for CSS targeting
    if (isRTL) {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }
  }, [currentLanguage]);

  // Change language function
  const changeLanguage = (languageCode) => {
    i18nTranslation.i18n.changeLanguage(languageCode);
  };

  return {
    ...i18nTranslation,
    ...translationContext,
    availableLanguages,
    currentLanguage,
    changeLanguage,
    isRTL: rtlLanguages.includes(currentLanguage),
    // Helper function to get translated text with fallback
    t: (key, options = {}) => {
      try {
        return i18nTranslation.t(key, options);
      } catch (error) {
        console.warn(`Translation key "${key}" not found:`, error);
        return key; // Return the key itself as fallback
      }
    }
  };
};

export default useTranslation;