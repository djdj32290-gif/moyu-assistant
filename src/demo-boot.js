// The standalone demo uses only localStorage. The actual extension uses chrome.storage.
// Never loaded into websites by the extension.
(() => {
  if (globalThis.chrome?.runtime?.id) return;
  const listeners = [];
  window.addEventListener("storage", event => {
    if (event.key?.startsWith("point-resize:")) for (const listener of listeners) listener({ [event.key]: { newValue: JSON.parse(event.newValue || "null") } }, "local");
  });
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { try {
          const keys = key == null ? Object.keys(localStorage) : Array.isArray(key) ? key : [key];
          return Object.fromEntries(keys.map(name => [name, JSON.parse(localStorage.getItem(name) || "null")]));
        } catch { return {}; } },
        async set(data) {
          const changes = {};
          const previous = Object.fromEntries(Object.keys(data).map(key => [key, localStorage.getItem(key)]));
          try {
            for (const [key, value] of Object.entries(data)) {
              const oldValue = JSON.parse(previous[key] || "null");
              localStorage.setItem(key, JSON.stringify(value)); changes[key] = { oldValue, newValue: value };
            }
          } catch (error) {
            // Match extension batch writes: a quota error must not leave half a backup.
            for (const key of Object.keys(data)) localStorage.removeItem(key);
            for (const [key, value] of Object.entries(previous)) if (value !== null) localStorage.setItem(key, value);
            throw error;
          }
          for (const listener of listeners) listener(changes, "local");
        }
      },
      onChanged: { addListener(fn) { listeners.push(fn); }, removeListener(fn) { const index = listeners.indexOf(fn); if (index >= 0) listeners.splice(index, 1); } }
    },
    runtime: { onMessage: { addListener() {} } }
  };
})();
