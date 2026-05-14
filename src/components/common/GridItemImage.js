import React, { memo, useEffect, useRef, useState } from 'react';

const EMPTY_STYLE = {};
const EMPTY_IMG_STYLE = {};

const defaultPlaceholder = (
  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
    No image
  </div>
);

const observerRegistry = new WeakMap();
let sharedObserver = null;

const getSharedObserver = () => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const callback = observerRegistry.get(entry.target);
        if (callback) callback();
      });
    },
    { rootMargin: '300px 0px' }
  );
  return sharedObserver;
};

const GridItemImage = ({
  src,
  alt,
  className,
  wrapperClassName,
  wrapperStyle = EMPTY_STYLE,
  imgStyle = EMPTY_IMG_STYLE,
  placeholder = defaultPlaceholder,
}) => {
  const hostRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!src) {
      setIsVisible(false);
      return undefined;
    }

    const node = hostRef.current;
    if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = getSharedObserver();
    if (!observer) {
      setIsVisible(true);
      return undefined;
    }

    const markVisible = () => {
      setIsVisible(true);
      observer.unobserve(node);
      observerRegistry.delete(node);
    };
    observerRegistry.set(node, markVisible);
    observer.observe(node);

    return () => {
      observer.unobserve(node);
      observerRegistry.delete(node);
    };
  }, [src]);

  const shouldRenderImage = Boolean(src) && isVisible && !hasError;

  return (
    <div ref={hostRef} className={wrapperClassName} style={wrapperStyle}>
      {shouldRenderImage ? (
        <img
          src={src}
          alt={alt}
          className={className}
          style={imgStyle}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          draggable={false}
          onError={() => setHasError(true)}
        />
      ) : (
        placeholder
      )}
    </div>
  );
};

export default memo(GridItemImage, (prev, next) =>
  prev.src === next.src &&
  prev.alt === next.alt &&
  prev.className === next.className &&
  prev.wrapperClassName === next.wrapperClassName &&
  prev.wrapperStyle === next.wrapperStyle &&
  prev.imgStyle === next.imgStyle &&
  prev.placeholder === next.placeholder
);
