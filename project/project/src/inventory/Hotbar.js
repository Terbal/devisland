// Hotbar.js — renders the bottom hotbar and inventory panel from Inventory state.

const ICONS = { stone: '🪨' };

export class Hotbar {
  constructor(inventory) {
    this.inventory = inventory;
    this.hotbarEl = document.getElementById('hotbar');
    this.invSlotsEl = document.getElementById('inventory-slots');
    this.invPanelEl = document.getElementById('inventory-panel');

    inventory.onChange(() => this.render());
    this.render();

    this.invPanelEl.addEventListener('click', (e) => e.stopPropagation());
  }

  render() {
    this._renderInto(this.hotbarEl, 'hotbar-slot');
    this._renderInto(this.invSlotsEl, 'hotbar-slot');
  }

  _renderInto(container, className) {
    container.innerHTML = '';
    this.inventory.slots.forEach((slot, i) => {
      const el = document.createElement('div');
      el.className = className + (i === this.inventory.selectedIndex ? ' selected' : '');
      el.innerHTML = `
        <span class="hotbar-index">${i + 1}</span>
        ${slot ? `<span>${ICONS[slot.itemType] || '?'}</span><span class="hotbar-qty">${slot.quantity}</span>` : ''}
      `;
      el.style.pointerEvents = 'all';
      el.addEventListener('click', () => this.inventory.select(i));
      container.appendChild(el);
    });
  }

  toggleInventoryPanel() {
    this.invPanelEl.classList.toggle('hidden');
  }
}
