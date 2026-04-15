import { ROLES } from '../constants/roles';

export const getRoleHome = (role) => {
  switch (role) {
    case ROLES.FARMER: return 'FarmerHome';
    case ROLES.OWNER:  return 'OwnerDashboard';
    case ROLES.ADMIN:  return 'AdminDashboard';
    default:           return 'RoleSelect';
  }
};
