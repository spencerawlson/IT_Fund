import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// `docked` / `registerDock` exist only under the provider: a component
// rendered without TutorProvider (unit tests, isolated previews) sees
// registerDock === null and keeps its own open state instead.
const TutorContext = createContext({ open: false, setOpen: () => {}, docked: false, registerDock: null });

/**
 * Whether the app-wide tutor panel is open. The navigation opens it; the panel closes it.
 * On close, focus goes back to whatever opened the panel, so keyboard users keep their place.
 *
 * One Cypher, not two: a lesson page mounts its floating Cypher panel and
 * registers it as the "dock". While a dock is registered, the header's
 * Ask-the-tutor button opens that lesson panel (same `open` state) and the
 * general chat panel stays out of the way; everywhere else it opens the chat.
 */
export function TutorProvider({ children }) {
  const [open, setOpenState] = useState(false);
  const [dockCount, setDockCount] = useState(0);
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

  // Returns the unregister function (use as an effect cleanup).
  const registerDock = useCallback(() => {
    setDockCount((n) => n + 1);
    return () => setDockCount((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, docked: dockCount > 0, registerDock }),
    [open, setOpen, dockCount, registerDock],
  );
  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export const useTutorPanel = () => useContext(TutorContext);
