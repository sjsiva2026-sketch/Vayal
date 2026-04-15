import React, { createContext, useContext, useState } from 'react';

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookings, setBookings]           = useState([]);

  return (
    <BookingContext.Provider value={{ activeBooking, setActiveBooking, bookings, setBookings }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
