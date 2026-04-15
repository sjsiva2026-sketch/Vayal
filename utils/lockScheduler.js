/**
 * VAYAL — Midnight Lock Scheduler
 *
 * This utility runs a check at midnight every day.
 * If an owner has unpaid commission, their account is locked.
 *
 * Usage: Call scheduleNightlyLock(ownerId) once after login
 * for each owner. It will auto-run at midnight.
 */

import { lockOwnerIfUnpaid } from '../firebase/functions/lockUserIfUnpaid';
import { todayString }       from './dateFormatter';

// Store timer IDs so we can clear them on logout
const _timers = {};

/**
 * Schedule a nightly lock check for an owner
 * @param {string} ownerId - Firebase UID of the owner
 * @param {Function} onLocked - optional callback when account gets locked
 */
export const scheduleNightlyLock = (ownerId, onLocked) => {
  // Clear any existing timer for this owner
  if (_timers[ownerId]) {
    clearTimeout(_timers[ownerId]);
  }

  const msUntilMidnight = getMsUntilMidnight();

  _timers[ownerId] = setTimeout(async () => {
    const wasLocked = await lockOwnerIfUnpaid(ownerId);
    if (wasLocked && onLocked) {
      onLocked();
    }
    // Re-schedule for next midnight
    scheduleNightlyLock(ownerId, onLocked);
  }, msUntilMidnight);

  console.log(`[Vayal] Nightly lock scheduled for ${ownerId} in ${Math.round(msUntilMidnight / 60000)} minutes`);
};

/**
 * Cancel nightly lock for an owner (call on logout)
 * @param {string} ownerId
 */
export const cancelNightlyLock = (ownerId) => {
  if (_timers[ownerId]) {
    clearTimeout(_timers[ownerId]);
    delete _timers[ownerId];
  }
};

/**
 * Get milliseconds until next midnight
 */
const getMsUntilMidnight = () => {
  const now       = new Date();
  const midnight  = new Date();
  midnight.setHours(24, 0, 0, 0);  // next midnight
  return midnight.getTime() - now.getTime();
};

/**
 * Get milliseconds until a specific time (HH:MM)
 */
export const getMsUntilTime = (hour, minute = 0) => {
  const now    = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
};

/**
 * Schedule evening reminder (8 PM) for owner to pay commission
 * Returns the timer ID
 */
export const scheduleEveningReminder = (callback) => {
  const ms = getMsUntilTime(20, 0); // 8 PM
  const id = setTimeout(() => {
    callback();
    scheduleEveningReminder(callback); // re-schedule daily
  }, ms);
  return id;
};
