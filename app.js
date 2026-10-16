(function () {
  'use strict';

  var CONFIG = window.APP_CONFIG;
  var lib = window.AttendanceLib;

  var POSITION_MAX_AGE_MS = 5 * 60 * 1000; // re-check location if older than 5 min
  var GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

  var els = {
    locationSection: document.getElementById('location-section'),
    locationStatus: document.getElementById('location-status'),
    checkLocationBtn: document.getElementById('check-location-btn'),
    form: document.getElementById('attendance-form'),
    name: document.getElementById('name'),
    toggleManual: document.getElementById('toggle-manual'),
    manualSection: document.getElementById('manual-section'),
    manualTime: document.getElementById('manual-time'),
    reason: document.getElementById('reason'),
    clearManual: document.getElementById('clear-manual'),
    formErrors: document.getElementById('form-errors'),
    submitBtn: document.getElementById('submit-btn'),
    warningSection: document.getElementById('warning-section'),
    warningMessage: document.getElementById('warning-message'),
    warningConfirm: document.getElementById('warning-confirm'),
    warningCancel: document.getElementById('warning-cancel'),
    successSection: document.getElementById('success-section'),
    successDetails: document.getElementById('success-details'),
    doneBtn: document.getElementById('done-btn')
  };

  var state = {
    position: null, // { lat, lng, accuracy, timestamp }
    pendingPayload: null,
    sending: false
  };

  // ---------- Setup ----------

  function populateNames() {
    var sorted = CONFIG.NAMES.slice().sort(function (a, b) {
      return a.localeCompare(b);
    });
    sorted.forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      els.name.appendChild(opt);
    });
  }

  // ---------- Location ----------

  function setLocationStatus(text, kind) {
    els.locationStatus.textContent = text;
    els.locationStatus.className = 'status' + (kind ? ' status-' + kind : '');
  }

  function getPosition() {
    return new Promise(function (resolve, reject) {
      if (!('geolocation' in navigator)) {
        reject({ code: 'unsupported' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now()
          });
        },
        reject,
        GEO_OPTIONS
      );
    });
  }

  function geoErrorMessage(err) {
    if (err && err.code === 'unsupported') {
      return 'Your browser does not support location. Please try a different browser.';
    }
    if (err && err.code === 1) {
      return 'Location permission was denied. Please allow location access for this site in your browser settings, then tap "Check my location".';
    }
    if (err && err.code === 3) {
      return 'Finding your location took too long. Make sure location services are on, then tap "Check my location".';
    }
    return 'We could not get your location. Make sure location services are on, then tap "Check my location".';
  }

  /** Get and verify location. Resolves true if within range. */
  function verifyLocation() {
    els.checkLocationBtn.hidden = true;
    setLocationStatus('Checking your location\u2026');

    return getPosition().then(
      function (pos) {
        if (lib.isWithinRadius(pos.lat, pos.lng, CONFIG.CENTER, CONFIG.RADIUS_METERS)) {
          state.position = pos;
          setLocationStatus('Location verified.', 'ok');
          els.form.hidden = false;
          return true;
        }
        state.position = null;
        setLocationStatus(CONFIG.LOCATION_MESSAGE, 'err');
        els.checkLocationBtn.textContent = 'Try again';
        els.checkLocationBtn.hidden = false;
        els.form.hidden = true;
        return false;
      },
      function (err) {
        state.position = null;
        setLocationStatus(geoErrorMessage(err), 'err');
        els.checkLocationBtn.textContent = 'Check my location';
        els.checkLocationBtn.hidden = false;
        els.form.hidden = true;
        return false;
      }
    );
  }

  // ---------- Manual time ----------

  function toLocalInputValue(date) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return (
      date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    );
  }

  function openManual() {
    els.manualSection.hidden = false;
    els.toggleManual.setAttribute('aria-expanded', 'true');
    els.manualTime.max = toLocalInputValue(new Date());
    if (!els.manualTime.value) els.manualTime.value = toLocalInputValue(new Date());
    els.manualTime.focus();
  }

  function closeManual() {
    els.manualSection.hidden = true;
    els.toggleManual.setAttribute('aria-expanded', 'false');
    els.manualTime.value = '';
    els.reason.value = '';
  }

  // ---------- Form ----------

  function checkedValue(name) {
    var el = els.form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function buildPayload() {
    var manualOn = !els.manualSection.hidden && els.manualTime.value;
    var manualIso = '';
    if (manualOn) {
      // datetime-local is interpreted in the phone's local time zone.
      var d = new Date(els.manualTime.value);
      manualIso = isNaN(d.getTime()) ? 'invalid' : d.toISOString();
    }
    return {
      name: els.name.value,
      shift: checkedValue('shift'),
      action: checkedValue('action'),
      lat: state.position ? state.position.lat : null,
      lng: state.position ? state.position.lng : null,
      accuracy: state.position ? Math.round(state.position.accuracy) : null,
      manualTime: manualIso,
      reason: manualOn ? els.reason.value.trim() : '',
      override: false
    };
  }

  function showErrors(errors) {
    els.formErrors.innerHTML = '';
    if (!errors || !errors.length) return;
    var ul = document.createElement('ul');
    errors.forEach(function (e) {
      var li = document.createElement('li');
      li.textContent = e;
      ul.appendChild(li);
    });
    els.formErrors.appendChild(ul);
  }

  function setSending(sending) {
    state.sending = sending;
    els.submitBtn.disabled = sending;
    els.warningConfirm.disabled = sending;
    els.submitBtn.textContent = sending ? 'Submitting\u2026' : 'Submit';
    els.warningConfirm.textContent = sending ? 'Submitting\u2026' : 'Submit anyway';
  }

  function ensureFreshPosition() {
    if (state.position && Date.now() - state.position.timestamp < POSITION_MAX_AGE_MS) {
      return Promise.resolve(true);
    }
    return verifyLocation();
  }

  function onSubmit(event) {
    event.preventDefault();
    if (state.sending) return;
    showErrors([]);

    ensureFreshPosition().then(function (ok) {
      if (!ok) return;
      var payload = buildPayload();
      var result = lib.validateSubmission(payload, { names: CONFIG.NAMES, now: new Date() });
      if (!result.valid) {
        showErrors(result.errors);
        return;
      }
      send(payload);
    });
  }

  function send(payload) {
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.indexOf('PASTE_') === 0) {
      showErrors(['This page is not connected to the Google Sheet yet (SCRIPT_URL is missing in config.js).']);
      return;
    }
    setSending(true);
    state.pendingPayload = payload;

    fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      // text/plain avoids a CORS preflight, which Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(handleResponse)
      .catch(function () {
        showView('form');
        showErrors(['Could not reach the server. Check your connection and tap Submit again.']);
      })
      .then(function () {
        setSending(false);
      });
  }

  function handleResponse(data) {
    if (data && data.status === 'ok') {
      showSuccess(data.record || {});
      state.pendingPayload = null;
    } else if (data && data.status === 'warning') {
      els.warningMessage.textContent = data.message;
      showView('warning');
      els.warningConfirm.focus();
    } else {
      showView('form');
      showErrors([(data && data.message) || 'Something went wrong. Please try again.']);
    }
  }

  function showSuccess(record) {
    els.successDetails.innerHTML = '';
    [
      ['Name', record.name],
      ['Action', record.action],
      ['Shift', record.shift],
      ['Date', record.date],
      ['Time', record.time]
    ].forEach(function (row) {
      var dt = document.createElement('dt');
      dt.textContent = row[0];
      var dd = document.createElement('dd');
      dd.textContent = row[1] || '';
      els.successDetails.appendChild(dt);
      els.successDetails.appendChild(dd);
    });
    showView('success');
    els.successSection.focus();
  }

  function showView(view) {
    els.locationSection.hidden = view !== 'form';
    els.form.hidden = view !== 'form';
    els.warningSection.hidden = view !== 'warning';
    els.successSection.hidden = view !== 'success';
  }

  function resetForm() {
    els.form.reset();
    closeManual();
    showErrors([]);
    state.pendingPayload = null;
    showView('form');
    // Re-verify location for the next person.
    els.form.hidden = true;
    verifyLocation();
  }

  // ---------- Events ----------

  els.checkLocationBtn.addEventListener('click', verifyLocation);
  els.toggleManual.addEventListener('click', function () {
    if (els.manualSection.hidden) openManual(); else closeManual();
  });
  els.clearManual.addEventListener('click', function () {
    closeManual();
    els.toggleManual.focus();
  });
  els.form.addEventListener('submit', onSubmit);
  els.warningConfirm.addEventListener('click', function () {
    if (!state.pendingPayload || state.sending) return;
    var payload = Object.assign({}, state.pendingPayload, { override: true });
    send(payload);
  });
  els.warningCancel.addEventListener('click', function () {
    state.pendingPayload = null;
    showView('form');
  });
  els.doneBtn.addEventListener('click', resetForm);

  // ---------- Start ----------

  populateNames();
  if (!window.isSecureContext) {
    setLocationStatus('This page must be opened over https:// for location to work.', 'err');
  } else {
    verifyLocation();
  }
})();
