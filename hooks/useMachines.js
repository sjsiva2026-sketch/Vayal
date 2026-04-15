import { useEffect, useState } from 'react';
import { getMachinesByOwner, getMachinesByTalukAndCategory } from '../firebase/firestore';

export const useMachines = ({ ownerId, taluk, category } = {}) => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        let snap;
        if (ownerId) {
          snap = await getMachinesByOwner(ownerId);
        } else if (taluk && category) {
          snap = await getMachinesByTalukAndCategory(taluk, category);
        } else {
          setLoading(false);
          return;
        }
        setMachines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [ownerId, taluk, category]);

  return { machines, loading };
};
