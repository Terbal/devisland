// SaveSystem.js
// Small local save system for progression/inventory (spec §36 — "next steps").
//
// Uses localStorage, which is perfectly fine here: this is a normal static
// website the player's own browser runs, not a sandboxed preview. (The one
// exception is the single-file "quick preview" build shared alongside this
// project, which intentionally does NOT include this module — browser storage
// APIs are unsupported inside that preview sandbox, so persistence there is
// session-only. The real project below always has full persistence.)

const KEY = 'stone-realm-save-v1';

const DEFAULT_SAVE = {
  version: 1,
  inventory: { slots: [{ itemType: 'stone', quantity: 0 }, null, null, null, null], selectedIndex: 0 },
  quality: 'moyenne',
  savedAt: null,
};

function isAvailable() {
  try {
    const testKey = '__stone_realm_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export class SaveSystem {
  constructor() {
    this.available = isAvailable();
    if (!this.available) {
      console.warn('[SaveSystem] localStorage unavailable in this environment — progress will not persist between sessions.');
    }
  }

  load() {
    if (!this.available) return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== DEFAULT_SAVE.version) return null;
      return data;
    } catch (e) {
      console.warn('[SaveSystem] Failed to read save data, ignoring it.', e);
      return null;
    }
  }

  save({ inventory, quality }) {
    if (!this.available) return false;
    try {
      const data = {
        version: DEFAULT_SAVE.version,
        inventory: {
          slots: inventory.slots.map((s) => (s ? { itemType: s.itemType, quantity: s.quantity } : null)),
          selectedIndex: inventory.selectedIndex,
        },
        quality: quality || 'moyenne',
        savedAt: Date.now(),
      };
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[SaveSystem] Failed to write save data.', e);
      return false;
    }
  }

  clear() {
    if (!this.available) return;
    try {
      window.localStorage.removeItem(KEY);
    } catch (e) {
      /* no-op */
    }
  }
}
