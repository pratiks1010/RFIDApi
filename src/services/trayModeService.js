const INVENTORY_TRAY_KEY = 'inventoryTrayEnabled';

const normalizeUserKeyPart = (value) => String(value || '').trim().toLowerCase();

const getCurrentUserTrayKey = () => {
  try {
    const raw = localStorage.getItem('userInfo');
    const userInfo = raw ? JSON.parse(raw) : null;
    const loginName = normalizeUserKeyPart(
      userInfo?.Username || userInfo?.UserName || userInfo?.LoginName || userInfo?.name
    );
    const clientCode = normalizeUserKeyPart(
      userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode
    );
    if (loginName && clientCode) {
      return `${INVENTORY_TRAY_KEY}:${clientCode}:${loginName}`;
    }
  } catch (_) {}
  return INVENTORY_TRAY_KEY;
};

export const isInventoryTrayEnabled = () => {
  const userScopedKey = getCurrentUserTrayKey();
  const userScopedValue = localStorage.getItem(userScopedKey);
  if (userScopedValue === 'true' || userScopedValue === 'false') {
    return userScopedValue === 'true';
  }

  // Backward compatibility for legacy global key; migrate forward when user key is available.
  const legacyValue = localStorage.getItem(INVENTORY_TRAY_KEY);
  if (legacyValue === 'true' || legacyValue === 'false') {
    if (userScopedKey !== INVENTORY_TRAY_KEY) {
      localStorage.setItem(userScopedKey, legacyValue);
    }
    return legacyValue === 'true';
  }
  return false;
};

export const setInventoryTrayEnabled = (enabled) => {
  const nextValue = enabled ? 'true' : 'false';
  const userScopedKey = getCurrentUserTrayKey();
  localStorage.setItem(userScopedKey, nextValue);
  // Keep legacy key in sync for older readers still using the global key.
  localStorage.setItem(INVENTORY_TRAY_KEY, nextValue);
};

export const resetInventoryTrayEnabled = () => {
  localStorage.removeItem(getCurrentUserTrayKey());
};

export const inventoryTrayStorageKey = INVENTORY_TRAY_KEY;
