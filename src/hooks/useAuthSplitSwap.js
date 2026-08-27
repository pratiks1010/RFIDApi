import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useAuthSplitSwap(targetIsRegister) {
  const location = useLocation();
  const fromAuth = location.state?.fromAuth;
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate =
    !prefersReduced &&
    ((targetIsRegister && fromAuth === 'login') ||
      (!targetIsRegister && fromAuth === 'register'));

  const [isRegisterLayout, setIsRegisterLayout] = useState(
    shouldAnimate ? !targetIsRegister : targetIsRegister
  );

  useEffect(() => {
    if (!shouldAnimate) {
      setIsRegisterLayout(targetIsRegister);
      return undefined;
    }
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setIsRegisterLayout(targetIsRegister));
    });
    return () => {
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [shouldAnimate, targetIsRegister]);

  return isRegisterLayout;
}
