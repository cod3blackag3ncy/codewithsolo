/* ═══════════════════════════════════════════════
   Cache Buster — Force fresh content on all devices
   ═══════════════════════════════════════════════ */

// Clear old caches on load
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
    });
  });
}

// Force refresh of documentation
const docCacheKey = 'codewithsolo-docs-v1';
if ('caches' in window) {
  caches.open(docCacheKey).then(cache => {
    fetch('/CODEWITHSOLO_FIX_DOCUMENTATION.md')
      .then(response => {
        if (response.ok) {
          cache.put('/CODEWITHSOLO_FIX_DOCUMENTATION.md', response);
        }
      });
  });
}

// Notify about update
console.log('[Cache Buster] Documentation cache cleared. Fresh version loaded.');
