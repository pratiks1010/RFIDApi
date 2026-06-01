import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  readLocalItemImageDataUrl,
  resolveLocalItemImageBlobUrl,
} from '../../services/localItemImageService';

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
  itemCode,
  lookupKeys,
  alt,
  className,
  wrapperClassName,
  wrapperStyle = EMPTY_STYLE,
  imgStyle = EMPTY_IMG_STYLE,
  placeholder = defaultPlaceholder,
  /** When true, parent already resolved src — skip duplicate local lookup. */
  localResolved = false,
}) => {
  const hostRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [localSrc, setLocalSrc] = useState('');

  const codesToTry = useMemo(() => {
    if (Array.isArray(lookupKeys) && lookupKeys.length) {
      return lookupKeys.map((k) => String(k || '').trim()).filter(Boolean);
    }
    const single = String(itemCode || '').trim();
    return single ? [single] : [];
  }, [lookupKeys, itemCode]);

  const codesKey = codesToTry.join('|');

  useEffect(() => {
    setHasError(false);
    setApiFailed(false);
    setLocalSrc('');
  }, [src, codesKey]);

  useEffect(() => {
    if (localResolved || !isVisible || !codesToTry.length) return undefined;
    if (src && !apiFailed) return undefined;
    let cancelled = false;
    const resolveLocal = async () => {
      for (let i = 0; i < codesToTry.length; i += 1) {
        if (cancelled) return;
        const url = await resolveLocalItemImageBlobUrl(codesToTry[i]);
        if (url) {
          setLocalSrc(url);
          return;
        }
      }
    };
    resolveLocal().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isVisible, codesKey, codesToTry, src, apiFailed, localResolved]);

  const apiSrc = src && !apiFailed ? src : '';
  const displaySrc = localSrc || apiSrc;

  useEffect(() => {
    setHasError(false);
  }, [displaySrc]);

  useEffect(() => {
    if (!displaySrc && !codesToTry.length) {
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
  }, [displaySrc, codesKey, codesToTry.length]);

  const shouldRenderImage = Boolean(displaySrc) && isVisible && !hasError;

  return (
    <div ref={hostRef} className={wrapperClassName} style={wrapperStyle}>
      {shouldRenderImage ? (
        <img
          src={displaySrc}
          alt={alt}
          className={className}
          style={imgStyle}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          draggable={false}
          onError={() => {
            if (displaySrc === apiSrc && apiSrc) {
              setApiFailed(true);
              return;
            }
            if (String(displaySrc).startsWith('itemimg:') && codesToTry.length) {
              readLocalItemImageDataUrl(codesToTry[0]).then((dataUrl) => {
                if (dataUrl) {
                  setLocalSrc(dataUrl);
                  setHasError(false);
                } else {
                  setHasError(true);
                }
              });
              return;
            }
            setHasError(true);
          }}
        />
      ) : (
        placeholder
      )}
    </div>
  );
};

const lookupKeysEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export default memo(GridItemImage, (prev, next) =>
  prev.src === next.src &&
  prev.itemCode === next.itemCode &&
  lookupKeysEqual(prev.lookupKeys, next.lookupKeys) &&
  prev.alt === next.alt &&
  prev.className === next.className &&
  prev.wrapperClassName === next.wrapperClassName &&
  prev.wrapperStyle === next.wrapperStyle &&
  prev.imgStyle === next.imgStyle &&
  prev.placeholder === next.placeholder &&
  prev.localResolved === next.localResolved
);
