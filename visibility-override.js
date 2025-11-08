/*
  This script overrides the document's visibility properties
  to make the page believe it is always active.
*/
try {
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: false,
    configurable: false
  });

  Object.defineProperty(document, 'hidden', {
    value: false,
    writable: false,
    configurable: false
  });

  // Prevent the 'visibilitychange' event from firing
  document.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true);

  console.log('Page Visibility API overridden by extension.');

} catch (e) {
  console.error('Failed to override Page Visibility API:', e);
}