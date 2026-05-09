// context/BookingContext.js
import React, { createContext, useContext, useState } from 'react';

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [activeBookings, setActiveBookings] = useState([]);

  return (
    <BookingContext.Provider value={{ pendingCount, setPendingCount, activeBookings, setActiveBookings }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
