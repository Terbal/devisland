// Inventory.js — simple slot-based inventory (V1 has a single item type: "stone").

const SLOT_COUNT = 5;

export class Inventory {
  constructor() {
    this.slots = Array.from({ length: SLOT_COUNT }, () => null);
    // Give the first slot to stones by default so the hotbar isn't empty.
    this.slots[0] = { itemType: 'stone', quantity: 0 };
    this.selectedIndex = 0;
    this._listeners = [];
  }

  onChange(fn) {
    this._listeners.push(fn);
  }

  _emit() {
    this._listeners.forEach((fn) => fn(this));
  }

  addStone(count = 1) {
    let slot = this.slots.find((s) => s && s.itemType === 'stone');
    if (!slot) {
      const emptyIndex = this.slots.findIndex((s) => s === null);
      slot = { itemType: 'stone', quantity: 0 };
      this.slots[emptyIndex >= 0 ? emptyIndex : 0] = slot;
    }
    slot.quantity += count;
    this._emit();
  }

  getSelectedSlot() {
    return this.slots[this.selectedIndex];
  }

  select(index) {
    if (index < 0 || index >= SLOT_COUNT) return;
    this.selectedIndex = index;
    this._emit();
  }

  /** Attempts to consume one unit from the currently selected slot. Returns true on success. */
  consumeSelected() {
    const slot = this.getSelectedSlot();
    if (!slot || slot.quantity <= 0) return false;
    slot.quantity -= 1;
    this._emit();
    return true;
  }
}
