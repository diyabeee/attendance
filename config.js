/*
 * App configuration.
 * If you change NAMES, CENTER, or RADIUS_METERS here, make the same change
 * in apps-script/Code.gs (CONFIG at the top) and redeploy the script.
 */
(function (root) {
  var CONFIG = {
    // Paste your Apps Script Web app URL here (Deploy -> Manage deployments).
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyObvo6g_tacDrsfEOG4TJUjdsId8V91giKPlz8isI80181KxFbS5BNUu4W4qtqUf8/exec',

    // 29°36'21.4"N 82°21'57.3"W
    CENTER: { lat: 29.6059444, lng: -82.3659167 },

    // 0.3 miles in meters
    RADIUS_METERS: 482.8032,

    LOCATION_MESSAGE: "Make sure you're at the correct location before signing in or out",

    NAMES: [
      'Jay Kapur',
      'Abigail Rosario',
      'Nithila Neminathan',
      'Malcolm Owusu',
      'Aarushi Pant',
      'Katherine Mock',
      'Angela Lim',
      'Allison Lewis',
      'Brooke Hube',
      'Mia Tubito',
      'Mary Kim',
      'Samuel Ginsberg',
      'Jasraj Kaeley',
      'Ria Patel',
      'Ambrose Carbunar',
      'Andrew Encinosa',
      'Andy Hagen',
      'Raghav Balaji',
      'Matthew Nguyen',
      'Raelin Gao',
      'Jennifer Kang',
      'Pranav Tigura',
      'Brandon Huynh',
      'Vladimir Handjiev',
      'Lilia Megerova',
      'Kayleen Siason',
      'David Starr',
      'Aadarsh Arul',
      'Youssef Isshak',
      'Diya Behal',
      'Jessica Vargo'
    ]
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = CONFIG;
  } else {
    root.APP_CONFIG = CONFIG;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
