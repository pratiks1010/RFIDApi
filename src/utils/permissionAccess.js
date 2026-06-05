import { SIDEBAR_PERMISSION_BY_PATH } from '../constants/sidebarMenu';
import { getAuthState, hasPermission } from './authState';

export { getDefaultHomePath } from './authState';

/** Filter nav items: optional permissionKey, subUserOnly, adminOnly on item */
export const canAccessMenuItem = (item) => {
  const state = getAuthState();
  if (!state) return false;

  if (item.subUserOnly) return state.isSubUser;
  if (item.adminOnly && state.isSubUser) return false;

  if (state.isSubUser && item.path === '/my-samples') return true;
  if (!state.isSubUser && item.path === '/my-samples') return false;
  if (item.path === '/sample-out-list') {
    if (!state.isSubUser) return true;
    return (
      hasPermission('CanSampleOut') ||
      hasPermission('CanViewReports') ||
      hasPermission('CanSampleIn')
    );
  }

  if (!state.isSubUser) return true;

  const perm =
    item.permissionKey ??
    item.permission ??
    SIDEBAR_PERMISSION_BY_PATH[item.path?.split('?')[0]];
  if (!perm) return item.path === '/analytics' || item.path === '/my-samples';
  return hasPermission(perm);
};

export const filterMenuItems = (items) =>
  (items || []).filter((item) => canAccessMenuItem(item));
