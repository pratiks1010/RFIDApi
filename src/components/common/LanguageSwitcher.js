import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { FaGlobe, FaChevronDown, FaCheck } from 'react-icons/fa';
import './LanguageSwitcher.css';

const LanguageSwitcher = ({ variant = 'header' }) => {
  const { t, currentLanguage, changeLanguage, availableLanguages, isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage) || availableLanguages[0];

  const handleLanguageChange = (languageCode) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  if (variant === 'header') {
    return (
      <div ref={dropdownRef} className="language-switcher-header">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="language-switcher-button"
          aria-label={t('languageSwitcher.selectLanguage')}
        >
          <FaGlobe className="language-icon" />
          <span className="language-text">{currentLang.name}</span>
          <FaChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>

        {isOpen && (
          <div className="language-dropdown">
            <div className="language-dropdown-header">
              <span className="language-dropdown-title">{t('languageSwitcher.selectLanguage')}</span>
            </div>
            <div className="language-list">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`language-option ${currentLanguage === language.code ? 'active' : ''}`}
                >
                  <span className="language-flag">{language.flag}</span>
                  <span className="language-name">{language.name}</span>
                  {currentLanguage === language.code && (
                    <FaCheck className="check-icon" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Profile variant for dropdown menus
  return (
    <div ref={dropdownRef} className="language-switcher-profile">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="language-profile-button"
      >
        <FaGlobe className="language-icon" />
        <span>{t('languageSwitcher.selectLanguage')}</span>
        <FaChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="language-profile-dropdown">
          {availableLanguages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`language-profile-option ${currentLanguage === language.code ? 'active' : ''}`}
            >
              <span className="language-flag">{language.flag}</span>
              <span className="language-name">{language.name}</span>
              {currentLanguage === language.code && (
                <FaCheck className="check-icon" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;