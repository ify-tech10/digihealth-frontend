import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

/* Sets the dashboard topbar title/subtitle for the current page. */
export function usePageHeader(title, subtitle = '') {
  const { setHeader } = useOutletContext();
  useEffect(() => {
    setHeader({ title, subtitle });
  }, [setHeader, title, subtitle]);
}
