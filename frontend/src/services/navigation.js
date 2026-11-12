const roleHomes = {
  factory: '/dashboard/factory',
  technician: '/dashboard/technician',
  admin: '/dashboard/admin',
};

export const getRoleHome = (role) => roleHomes[role] || '/login';
