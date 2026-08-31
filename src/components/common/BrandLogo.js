import React from 'react';
import {
  BRAND_LOGO_FALLBACK,
  BRAND_LOGO_MARK,
  BRAND_LOGO_WORDMARK,
  BRAND_NAME,
} from '../../constants/brand';

const BrandLogo = ({
  variant = 'wordmark',
  alt = BRAND_NAME,
  className = '',
  style,
  height,
}) => {
  const src = variant === 'mark' ? BRAND_LOGO_MARK : BRAND_LOGO_WORDMARK;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ height: height || 36, width: 'auto', display: 'block', ...style }}
      onError={(e) => {
        if (e.currentTarget.dataset.fallback === '1') return;
        e.currentTarget.dataset.fallback = '1';
        e.currentTarget.src = BRAND_LOGO_FALLBACK;
      }}
    />
  );
};

export default BrandLogo;
