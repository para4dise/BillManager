import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import ko from './ko.json';
import ja from './ja.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
};

// Get device language
const getDeviceLanguage = () => {
  try {
    // Default to English instead of device language
    return 'en';
    
    // Uncomment below if you want to use device language
    /*
    const locale = Localization.locale || Localization.getLocales()[0]?.languageCode || 'en';
    const languageCode = locale.split('-')[0];
    
    if (resources[languageCode]) {
      return languageCode;
    }
    
    return 'en';
    */
  } catch (error) {
    console.error('Error getting device language:', error);
    return 'en';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;