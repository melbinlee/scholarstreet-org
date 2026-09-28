/* State status for the homepage state status table.
   Static placeholder data, meant to be swapped for a real source later.
   The lookup only reads window.SS_STATES, so a replacement just has to
   produce the same shape:

     code      two-letter postal code
     name      state name as displayed
     status    'opted-in' | 'pending-warm' | 'pending-cold' |
               'not-participating' | null (not yet verified)
     verified  true only when every field below is sourced
     optInDate        'YYYY-MM-DD' the state opted into §25F, or null
     optInGovernor    governor who made the opt-in, or null
     currentGovernor  sitting governor, or null
     irsListed        'YYYY-MM-DD' the IRS listed the state, or null
     credit    { name, detail } for a state scholarship tax credit, or null
               (null on a verified state means it has none)
     updates   [{ date: 'YYYY-MM-DD', text }], newest first

   Only Virginia is populated. Every other state is a placeholder with no
   status and no tax-credit claim; the page shows it as "Not yet verified"
   rather than guessing. */
(function () {
  var NAMES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
  };

  var KNOWN = {
    VA: {
      status: 'opted-in',
      verified: true,
      optInDate: '2026-01-09',
      optInGovernor: 'Glenn Youngkin',
      currentGovernor: 'Abigail Spanberger',
      irsListed: '2026-06-08',
      credit: {
        name: 'EISTC',
        detail: '65% credit · Va. Code § 58.1-439.26'
      },
      updates: [
        { date: '2026-06-08', text: 'IRS confirms Virginia on its list of participating states.' },
        { date: '2026-01-09', text: 'Virginia opts into §25F under Governor Youngkin, the first state to do so.' }
      ]
    }
  };

  window.SS_STATES = Object.keys(NAMES).map(function (code) {
    var known = KNOWN[code];
    return {
      code: code,
      name: NAMES[code],
      status: known ? known.status : null,
      verified: known ? known.verified : false,
      optInDate: known ? known.optInDate : null,
      optInGovernor: known ? known.optInGovernor : null,
      currentGovernor: known ? known.currentGovernor : null,
      irsListed: known ? known.irsListed : null,
      credit: known ? known.credit : null,
      updates: known ? known.updates : []
    };
  });

  /* Sample mode, for trying the table's filters before real data exists.
     Only with ?sample=1 in the URL, so a normal visit can never show it.
     Fills every unverified state with made-up values that say they are
     made up ("Sample governor", "Sample credit"), sets SS_SAMPLE so the
     page shows a "Sample data" notice, and leaves real states untouched.
     Seeded from the postal code, so a state gets the same values each load. */
  if (!/[?&]sample=1\b/.test(window.location.search)) return;
  window.SS_SAMPLE = true;
  var STATUSES = ['opted-in', 'pending-warm', 'pending-cold', 'not-participating'];
  function rng(code) {
    var h = code.charCodeAt(0) * 31 + code.charCodeAt(1) * 7;
    return function () { h = (h * 1103515245 + 12345) % 2147483648; return h / 2147483648; };
  }
  function day(r, fromMonth, toMonth) {
    var m = fromMonth + Math.floor(r() * (toMonth - fromMonth + 1));
    var d = 1 + Math.floor(r() * 28);
    return '2026-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  window.SS_STATES.forEach(function (s) {
    if (s.verified) return;
    var r = rng(s.code);
    s.status = STATUSES[Math.floor(r() * STATUSES.length)];
    s.currentGovernor = 'Sample governor';
    if (r() < 0.45) s.credit = { name: 'Sample credit', detail: 'Made-up state tax credit' };
    if (s.status === 'opted-in') {
      s.optInDate = day(r, 1, 5);
      s.optInGovernor = r() < 0.7 ? 'Sample governor' : 'Earlier sample governor';
      s.irsListed = day(r, 6, 8);
      s.updates = [
        { date: s.irsListed, text: 'Sample update: IRS lists ' + s.name + '.' },
        { date: s.optInDate, text: 'Sample update: ' + s.name + ' opts in.' }
      ];
    } else if (s.status === 'not-participating') {
      s.updates = [{ date: day(r, 3, 9), text: 'Sample update: ' + s.name + ' declines to opt in.' }];
    } else {
      s.updates = [{ date: day(r, 4, 9), text: 'Sample update: opt-in under discussion in ' + s.name + '.' }];
    }
  });
})();
