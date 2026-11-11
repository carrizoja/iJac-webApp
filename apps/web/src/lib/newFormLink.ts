/** The link that opens a page's create form straight away (Hoy buttons, keyboard shortcuts). */
export const NEW_FORM_PARAM = 'new';

export function newFormHref(path: string): string {
  return `${path}?${NEW_FORM_PARAM}=1`;
}

/**
 * True when the page was opened with `?new=1`. The flag is removed from the URL at once, so a
 * reload or the filters the page writes to the URL do not open the form again.
 */
export function takeNewFormRequest(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get(NEW_FORM_PARAM) !== '1') return false;
  params.delete(NEW_FORM_PARAM);
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  );
  return true;
}
