import React from 'react';
import { TranslationProvider } from '../../context/TranslationContext';
import '../../i18n';

const AppWithTranslation = ({ children }) => {
  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  );
};

export default AppWithTranslation;