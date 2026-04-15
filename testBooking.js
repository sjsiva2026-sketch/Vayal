/**
 * testBooking.js — Vayal Booking Request Tester
 * -----------------------------------------------
 * Run this with Node.js to test the full booking flow
 * against your real Firebase project.
 *
 * HOW TO RUN:
 *   node testBooking.js
 *
 * REQUIRES:
 *   npm install firebase   (already installed in node_modules)
 *
 * This script will:
 *   1. Connect to your real Firebase (vayal-33b12)
 *   2. Fetch an existing machine from Firestore
 *   3. Create a test booking (status: pending)
 *   4. Read it back and verify the data
 *   5. Clean up the test booking
 *   6. Print a full diagnostic report
 */

// ─── Firebase SDK (CommonJS compat via compat path) ───────────────────────────
const { initializeApp }    = require('firebase/app');
const {
  getFirestore,
  collection, addDoc, getDoc, getDocs,
  doc, query, where, deleteDoc, serverTimestamp,
} = require('firebase/firestore');

// ─── Config (same as firebase/config.js) ──────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4',
  authDomain:        'vayal-33b12.firebaseapp.com',
  projectId:         'vayal-33b12',
  storageBucket:     'vayal-33b12.firebasestorage.app',
  messagingSenderId: '881016543795',
  appId:             '1:881016543795:android:d567faf49f9def975de146',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const todayString = () => new Date().toISOString().split('T')[0];

const log   = (msg)  => console.log(`  ✅  ${msg}`);
const warn  = (msg)  => console.warn(`  ⚠️   ${msg}`);
const error = (msg)  => console.error(`  ❌  ${msg}`);
const hr    = ()     => console.log('\n' + '─'.repeat(55) + '\n');

// ─── Main Test ────────────────────────────────────────────────────────────────
async function runTest() {
  console.log('\n🌾  VAYAL — BOOKING REQUEST DIAGNOSTIC TEST');
  console.log('='.repeat(55));

  // Step 1: Init Firebase
  console.log('\n[1] Initialising Firebase...');
  let app, db;
  try {
    app = initializeApp(FIREBASE_CONFIG);
    db  = getFirestore(app);
    log('Firebase initialised — project: vayal-33b12');
  } catch (e) {
    error('Firebase init failed: ' + e.message);
    process.exit(1);
  }

  // Step 2: Check machines collection
  hr();
  console.log('[2] Fetching machines from Firestore...');
  let testMachine = null;
  try {
    const snap = await getDocs(collection(db, 'machines'));
    if (snap.empty) {
      warn('No machines found in Firestore. Add a machine first via the app.');
      warn('Continuing with a DUMMY machine for booking write test...');
      testMachine = {
        id:            'DUMMY_MACHINE_ID',
        type:          'Tractor',
        ownerId:       'DUMMY_OWNER_ID',
        ownerName:     'Test Owner',
        ownerPhone:    '9999999999',
        price_per_hour: 500,
        taluk:         'TestTaluk',
        isActive:      true,
      };
    } else {
      const machines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      log(`Found ${machines.length} machine(s) in Firestore`);

      // Pick first active machine
      testMachine = machines.find(m => m.isActive !== false) || machines[0];
      log(`Using machine: "${testMachine.type}" (id: ${testMachine.id})`);
      console.log('     Owner ID   :', testMachine.ownerId    || '—');
      console.log('     Owner Name :', testMachine.ownerName  || '—');
      console.log('     Owner Phone:', testMachine.ownerPhone || '—');
      console.log('     Taluk      :', testMachine.taluk      || '—');
      console.log('     Price/hr   :', testMachine.price_per_hour || '—');

      if (!testMachine.ownerId) {
        warn('Machine is missing ownerId — booking will have empty owner reference');
      }
      if (!testMachine.ownerPhone) {
        warn('Machine is missing ownerPhone — owner contact will not show in app');
      }
    }
  } catch (e) {
    error('Failed to read machines: ' + e.message);
    console.error(e);
    process.exit(1);
  }

  // Step 3: Simulate booking payload (same as BookingScreen.js)
  hr();
  console.log('[3] Building booking payload...');
  const otp = generateOTP();
  const bookingPayload = {
    farmerId:         'TEST_FARMER_001',
    farmerName:       'Test Farmer (Diagnostic)',
    farmerPhone:      '8888888888',
    ownerId:          testMachine.ownerId       || 'UNKNOWN_OWNER',
    ownerName:        testMachine.ownerName     || '',
    ownerPhone:       testMachine.ownerPhone    || '',
    machineId:        testMachine.id,
    machineType:      testMachine.type          || 'Unknown',
    pricePerHour:     testMachine.price_per_hour || 0,
    date:             todayString(),
    timeSlot:         '6AM–10AM',
    hectareRequested: 2.5,
    hectareCompleted: 0,
    commission:       0,
    status:           'pending',
    otp,
    taluk:            testMachine.taluk || '',
    createdAt:        serverTimestamp(),
    _testRun:         true,   // marker so you can identify test docs
  };

  console.log('     Booking payload:');
  Object.entries(bookingPayload).forEach(([k, v]) => {
    if (k !== 'createdAt') console.log(`       ${k.padEnd(20)}: ${v}`);
  });

  // Step 4: Write booking to Firestore
  hr();
  console.log('[4] Writing booking to Firestore (bookings collection)...');
  let bookingRef;
  try {
    bookingRef = await addDoc(collection(db, 'bookings'), bookingPayload);
    log(`Booking written — id: ${bookingRef.id}`);
  } catch (e) {
    error('createBooking FAILED: ' + e.message);
    console.error('\n     Full error:');
    console.error(e);
    console.log('\n     ⚠️  Common causes:');
    console.log('       • Firestore security rules blocking unauthenticated writes');
    console.log('       • Network / offline issue');
    console.log('       • Wrong project config');
    process.exit(1);
  }

  // Step 5: Read booking back
  hr();
  console.log('[5] Reading booking back from Firestore...');
  try {
    const snap = await getDoc(doc(db, 'bookings', bookingRef.id));
    if (!snap.exists()) {
      error('Booking document not found after write — something is wrong!');
    } else {
      const data = snap.data();
      log('Booking read back successfully');
      log(`Status     : ${data.status}`);
      log(`OTP        : ${data.otp}`);
      log(`Farmer     : ${data.farmerName} (${data.farmerPhone})`);
      log(`Owner      : ${data.ownerName}  (${data.ownerPhone})`);
      log(`Machine    : ${data.machineType} — ${data.date} @ ${data.timeSlot}`);
      log(`Hectare    : ${data.hectareRequested} ha`);

      // Validation checks
      if (data.status !== 'pending') warn('Status is not "pending" — check BookingScreen.js');
      if (!data.otp)                 warn('OTP is missing from booking document');
      if (!data.ownerPhone)          warn('ownerPhone is empty — owner contact wont show in BookingConfirm');
      if (!data.farmerPhone)         warn('farmerPhone is empty — farmer contact wont show for owner');
      if (!data.ownerId || data.ownerId === 'UNKNOWN_OWNER')
                                     warn('ownerId missing — owner won\'t see this booking in BookingRequests');
    }
  } catch (e) {
    error('Read-back failed: ' + e.message);
  }

  // Step 6: Check owner can query their bookings
  hr();
  console.log('[6] Testing owner query (listenBookingsByOwner simulation)...');
  if (testMachine.ownerId && testMachine.ownerId !== 'DUMMY_OWNER_ID') {
    try {
      const ownerSnap = await getDocs(
        query(collection(db, 'bookings'), where('ownerId', '==', testMachine.ownerId))
      );
      log(`Owner query returned ${ownerSnap.size} booking(s) for ownerId: ${testMachine.ownerId}`);
      if (ownerSnap.size === 0) {
        warn('Owner has 0 bookings visible — check Firestore rules or ownerId mismatch');
      }
    } catch (e) {
      error('Owner query failed: ' + e.message);
      warn('Likely a Firestore security rule issue — owner must be authenticated');
    }
  } else {
    warn('Skipping owner query — no real ownerId available (dummy machine)');
  }

  // Step 7: Clean up test doc
  hr();
  console.log('[7] Cleaning up test booking...');
  try {
    await deleteDoc(doc(db, 'bookings', bookingRef.id));
    log(`Test booking ${bookingRef.id} deleted`);
  } catch (e) {
    warn('Could not delete test booking: ' + e.message);
    warn(`Delete it manually from Firebase Console: bookings/${bookingRef.id}`);
  }

  // Final Summary
  hr();
  console.log('📊  DIAGNOSTIC SUMMARY');
  console.log('='.repeat(55));
  console.log(`
  If all steps above showed ✅, your booking write/read
  pipeline is working correctly in Firebase.

  Common reasons booking may STILL fail in the app:
  ─────────────────────────────────────────────────
  1. userProfile is null in UserContext
     → User is not logged in / profile not loaded
     → Check: useUser() in BookingScreen.js

  2. machine.ownerId is missing
     → Machine was added without ownerId field
     → Fix: update machine doc in Firebase Console

  3. Firestore rules block authenticated writes
     → Rules require auth — works in test only if
       your rules allow open writes during dev

  4. navigation.replace('BookingConfirm',...) fails
     → Check your Navigator has 'BookingConfirm'
       registered in navigation/FarmerNavigator

  5. Network timeout (Expo Go / emulator)
     → Try on a physical device or check internet

  6. CONFIG.TIME_SLOTS mismatch
     → Slot picker shows slots from constants/config.js
       Make sure slot value matches what Firestore expects
  `);

  process.exit(0);
}

runTest().catch(e => {
  console.error('\n❌ Unhandled error:', e);
  process.exit(1);
});
