import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls window to top on every route change. Fixes the mobile bug where
// react-router-dom v7 keeps the previous scroll position when navigating.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Use instant behavior so the top of the new page is shown right away
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
};

export default ScrollToTop;
