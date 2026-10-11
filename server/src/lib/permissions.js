// Role → permission matrix.
// superadmin: owns the system, can create admins
// admin:      full restaurant management (menu, bills, expenses, managers, settings)
// manager:    counter staff — can input data (orders, payments, expenses) and view analytics,
//             but cannot create/edit/delete menu items, edit past bills, manage users or settings.

export const ROLES = ['superadmin', 'admin', 'manager'];

const MANAGER_PERMS = [
  'orders:view',
  'orders:create',
  'payments:record',
  'expenses:view',
  'expenses:create',
  'analytics:view',
  'closings:view',
  'menu:view',
];

const ADMIN_PERMS = [
  ...MANAGER_PERMS,
  'orders:edit',
  'orders:delete',
  'expenses:edit',
  'expenses:delete',
  'menu:manage',
  'users:manage',
  'settings:manage',
  'closings:write',
];

const SUPER_PERMS = [...ADMIN_PERMS];

export function permissionsFor(role) {
  if (role === 'superadmin') return SUPER_PERMS;
  if (role === 'admin') return ADMIN_PERMS;
  return MANAGER_PERMS;
}

// Who can manage which role's users
export function canManageRole(actorRole, targetRole) {
  if (actorRole === 'superadmin') return ROLES.includes(targetRole) && targetRole !== 'superadmin';
  if (actorRole === 'admin') return targetRole === 'manager';
  return false;
}
