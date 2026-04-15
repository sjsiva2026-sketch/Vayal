// assets/index.js
// Central asset registry for VAYAL.
// All require() paths below must match actual files in assets/icons/ and assets/images/.
// Drop your generated PNG files into the folders and this file handles the rest.

export const ICONS = {
  logo:    require('./icons/logo.png'),
  farmer:  require('./icons/farmer_role.png'),
  owner:   require('./icons/owner_role.png'),
  gpay:    require('./icons/gpay.png'),
  phonepe: require('./icons/phonepe.png'),
  paytm:   require('./icons/paytm.png'),
};

export const CATEGORY_IMAGES = {
  harvester:    require('./images/harvester.png'),
  rotavator:    require('./images/rotavator.png'),
  cultivator:   require('./images/cultivator.png'),
  strawchopper: require('./images/straw_chopper.png'),
};
