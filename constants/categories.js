// BUG FIX: All category ids and labels are now the single source of truth.
// AddMachine, CategoryScreen, MachineList, and booking displays all use
// this file so the machine type stored in Firestore always matches what's
// shown to the user.
export const CATEGORIES = [
  { id: 'harvester',    label: 'Harvester',     icon: '🌾' },
  { id: 'rotavator',    label: 'Rotavator',     icon: '🔄' },
  { id: 'cultivator',   label: 'Cultivator',    icon: '🌱' },
  { id: 'strawchopper', label: 'Straw Chopper', icon: '✂️' },
];

// Helper: get human-readable label from stored id
export const getCategoryLabel = (id) => {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? cat.label : id; // fallback to raw id if not found
};

// Helper: get emoji from stored id
export const getCategoryIcon = (id) => {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? cat.icon : '🚜';
};
