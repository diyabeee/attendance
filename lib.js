/*
 * Pure logic shared by the browser and the Node tests.
 * apps-script/Code.gs mirrors these rules on the server.
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = lib;
  } else {
    root.AttendanceLib = lib;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var EARTH_RADIUS_M = 6371008.8;
  var ACTIONS = ['Sign In', 'Sign Out'];
  var SHIFTS = ['Clinic', 'Admin'];
  var MANUAL_MAX_DAYS_BACK = 7;
  var FUTURE_SKEW_MS = 5 * 60 * 1000; // tolerate small clock differences
  var REASON_MAX_LENGTH = 500;

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  /** Great-circle distance in meters between two lat/lng points. */
  function haversineMeters(lat1, lng1, lat2, lng2) {
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /** True when (lat, lng) is within radiusMeters of center. */
  function isWithinRadius(lat, lng, center, radiusMeters) {
    if (!isValidCoord(lat, lng)) return false;
    return haversineMeters(lat, lng, center.lat, center.lng) <= radiusMeters;
  }

  function isValidCoord(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      isFinite(lat) &&
      isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    );
  }

  /**
   * Validate a submission payload.
   * payload: { name, action, shift, lat, lng, accuracy, manualTime (ISO string or empty), reason }
   * options: { names: string[], now: Date }
   * Returns { valid: boolean, errors: string[] }.
   */
  function validateSubmission(payload, options) {
    var errors = [];
    var names = (options && options.names) || [];
    var now = (options && options.now) || new Date();
    var p = payload || {};

    if (typeof p.name !== 'string' || names.indexOf(p.name) === -1) {
      errors.push('Please select your name.');
    }
    if (SHIFTS.indexOf(p.shift) === -1) {
      errors.push('Please choose Clinic or Admin.');
    }
    if (ACTIONS.indexOf(p.action) === -1) {
      errors.push('Please choose Sign In or Sign Out.');
    }
    if (!isValidCoord(p.lat, p.lng)) {
      errors.push('Location is missing. Please check your location again.');
    }

    if (p.manualTime) {
      var t = new Date(p.manualTime);
      if (typeof p.manualTime !== 'string' || isNaN(t.getTime())) {
        errors.push('The time you entered is not valid.');
      } else if (t.getTime() > now.getTime() + FUTURE_SKEW_MS) {
        errors.push('The time you entered is in the future.');
      } else if (now.getTime() - t.getTime() > MANUAL_MAX_DAYS_BACK * 24 * 3600 * 1000) {
        errors.push('The time you entered is more than ' + MANUAL_MAX_DAYS_BACK + ' days ago.');
      }
      var reason = typeof p.reason === 'string' ? p.reason.trim() : '';
      if (!reason) {
        errors.push('Please give a reason for using a different time.');
      } else if (reason.length > REASON_MAX_LENGTH) {
        errors.push('Reason must be ' + REASON_MAX_LENGTH + ' characters or fewer.');
      }
    }

    return { valid: errors.length === 0, errors: errors };
  }

  return {
    ACTIONS: ACTIONS,
    SHIFTS: SHIFTS,
    MANUAL_MAX_DAYS_BACK: MANUAL_MAX_DAYS_BACK,
    REASON_MAX_LENGTH: REASON_MAX_LENGTH,
    haversineMeters: haversineMeters,
    isWithinRadius: isWithinRadius,
    isValidCoord: isValidCoord,
    validateSubmission: validateSubmission
  };
});
