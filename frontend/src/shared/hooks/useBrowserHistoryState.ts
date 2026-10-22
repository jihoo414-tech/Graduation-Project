import { useEffect, useRef, useState } from 'react';

// History stores opaque IDs only. Files and result data stay in this page's memory.
export function useBrowserHistoryState<T>(initial: T, enabled = true) {
  const [value, setValue] = useState(initial);
  const initialRef = useRef(initial);
  const entries = useRef(new Map<string, T>());
  const currentId = useRef('');

  useEffect(() => {
    entries.current.clear();
    setValue(initialRef.current);
    if (!enabled) return;

    const initialize = () => {
      const id = crypto.randomUUID();
      entries.current.set(id, initialRef.current);
      currentId.current = id;
      window.history.replaceState({ appNavigationId: id }, '');
      setValue(initialRef.current);
    };
    initialize();
    const onPopState = (event: PopStateEvent) => {
      const id = event.state?.appNavigationId;
      if (entries.current.has(id)) {
        currentId.current = id;
        setValue(entries.current.get(id)!);
      } else {
        // Old sessions and reloads cannot restore another user's in-memory state.
        initialize();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      entries.current.clear();
    };
  }, [enabled]);

  const navigate = (next: T) => {
    if (!enabled) return '';
    if (Object.is(entries.current.get(currentId.current), next)) return currentId.current;
    const id = crypto.randomUUID();
    entries.current.set(id, next);
    currentId.current = id;
    window.history.pushState({ appNavigationId: id }, '');
    setValue(next);
    return id;
  };

  const replaceEntry = (id: string, next: T) => {
    if (!entries.current.has(id)) return false;
    entries.current.set(id, next);
    if (currentId.current === id) setValue(next);
    return currentId.current === id;
  };

  return { value, navigate, replaceEntry, hasEntry: (id: string) => entries.current.has(id) };
}
