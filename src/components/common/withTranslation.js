import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const withTranslation = (WrappedComponent) => {
  const WithTranslationComponent = (props) => {
    const translation = useTranslation();
    
    return <WrappedComponent {...props} {...translation} />;
  };

  WithTranslationComponent.displayName = `withTranslation(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithTranslationComponent;
};

export default withTranslation;