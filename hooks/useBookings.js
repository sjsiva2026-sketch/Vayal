import { useEffect, useState } from 'react';
import { listenBookingsByOwner, listenBookingsByFarmer } from '../firebase/firestore';

export const useBookings = (role, uid) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!uid) return;
    const listen = role === 'owner' ? listenBookingsByOwner : listenBookingsByFarmer;
    const unsub  = listen(uid, (data) => {
      setBookings(data);
      setLoading(false);
    });
    return unsub;
  }, [uid, role]);

  return { bookings, loading };
};
