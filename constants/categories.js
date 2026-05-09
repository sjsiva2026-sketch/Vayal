// constants/categories.js
export const CATEGORIES = [
  { id: 'harvester',    label: 'Harvester',     icon: '🌾' },
  { id: 'rotavator',   label: 'Rotavator',     icon: '🚜' },
  { id: 'cultivator',  label: 'Cultivator',    icon: '🌱' },
  { id: 'strawchopper',label: 'Straw Chopper', icon: '🌿' },
];

export const getCategoryLabel = (id) =>
  CATEGORIES.find(c => c.id === id)?.label ?? id ?? '—';

export const getCategoryIcon = (id) =>
  CATEGORIES.find(c => c.id === id)?.icon ?? '🚜';
