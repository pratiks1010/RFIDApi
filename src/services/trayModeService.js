const INVENTORY_TRAY_KEY = 'inventoryTrayEnabled';

export const isInventoryTrayEnabled = () => localStorage.getItem(INVENTORY_TRAY_KEY) === 'true';

export const setInventoryTrayEnabled = (enabled) => {
  localStorage.setItem(INVENTORY_TRAY_KEY, enabled ? 'true' : 'false');
};

export const resetInventoryTrayEnabled = () => {
  localStorage.removeItem(INVENTORY_TRAY_KEY);
};

export const inventoryTrayStorageKey = INVENTORY_TRAY_KEY;
