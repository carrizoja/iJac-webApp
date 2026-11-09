import { useCallback, useEffect, useState } from 'react';

/**
 * Moves keyboard focus to an element by id once React has rendered the change that shows or
 * enables it. Several ids are tried in order, so a caller can fall back (for example the next
 * row, then the "new" button when the list is empty).
 */
export function useFocusAfterRender() {
  const [targets, setTargets] = useState<string[] | null>(null);

  useEffect(() => {
    if (targets === null) return;
    setTargets(null);
    for (const id of targets) {
      const element = document.getElementById(id);
      if (element) {
        element.focus();
        return;
      }
    }
  }, [targets]);

  return useCallback((...ids: string[]) => setTargets(ids), []);
}
