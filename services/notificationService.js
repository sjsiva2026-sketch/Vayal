import { Linking, Alert } from 'react-native';

export const notificationService = {

  // Direct phone call
  call: async (phone) => {
    const url = `tel:+91${phone}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      Linking.openURL(url);
    } else {
      Alert.alert('Cannot Call', 'Your device cannot make calls. Please dial manually: +91 ' + phone);
    }
  },

  // WhatsApp message
  whatsapp: async (phone, message = '') => {
    const text = encodeURIComponent(message || 'Hello, I am contacting you via Vayal 🌾 app.');
    const url  = `whatsapp://send?phone=91${phone}&text=${text}`;
    const ok   = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        'WhatsApp Not Found',
        'WhatsApp is not installed. Try calling instead.',
        [{ text: 'OK' }]
      );
    }
  },

  // SMS
  sms: async (phone, message = '') => {
    const url = `sms:+91${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
    const ok  = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      Linking.openURL(url);
    } else {
      Alert.alert('Cannot SMS', 'SMS not available on this device.');
    }
  },

  // UPI payment deep link
  openUPI: async (upiId, amount, note = 'Vayal Commission') => {
    const url = `upi://pay?pa=${upiId}&pn=VayalApp&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    const ok  = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      Linking.openURL(url);
    } else {
      Alert.alert('No UPI App', 'No UPI app found. Install GPay or PhonePe.');
    }
  },
};
