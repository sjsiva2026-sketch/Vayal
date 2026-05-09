// utils/imageSize.js — All responsive image sizes in one place
import { Dimensions } from 'react-native';
const { width: W } = Dimensions.get('window');
const rs = (n) => Math.round((W / 375) * n);

export const IMG = {
  // Logo on RoleSelect / Login header
  LOGO_CONTAINER: rs(96),
  LOGO_SIZE:      rs(72),

  // Role icons (farmer / owner) on RoleSelect
  ROLE_CONTAINER: rs(80),
  ROLE_SIZE:      rs(60),

  // Category boxes on CategoryScreen (2-col grid)
  CATEGORY_BOX_W:        Math.floor((W - rs(32) - rs(12)) / 2),
  CATEGORY_CIRCLE:       rs(80),
  CATEGORY_IMG_IN_BOX:   rs(56),
  CATEGORY_SHOWCASE:     rs(180),

  // UPI logos on PayCommission
  UPI_LOGO:     W * 0.25,   // 25% screen width
  UPI_LOGO_SM:  W * 0.18,

  // Machine card image on MachineList
  MACHINE_CARD_IMG: rs(60),
};
