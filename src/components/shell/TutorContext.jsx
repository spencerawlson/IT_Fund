import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const TutorContext = createContext({ open: false, setOpen: () => {} });

/**
 * Whether the app-wide tutor panel is open. The navigation opens it; the panel closes it.
 * On close, focus goes back to whatever opened the panel, so keyboard users keep their place.
 */
export function TutorProvider({ children }) {
  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);
  const opener = useRef(null);

  const setOpen = useCallback((next) => {
    if (next === openRef.current) return;
    openRef.current = next;
    if (next) {
      opener.current = document.activeElement;
    } else {
      const el = opener.current;
      opener.current = null;
      // After the panel unmounts; skip if the opener left the page (e.g. on navigation).
      setTimeout(() => el?.isConnected && el.focus?.(), 0);
    }
    setOpenState(next);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export const useTutorPanel = () => useContext(TutorContext);
