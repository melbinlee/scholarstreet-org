/* State status for the homepage state lookup.
   Static placeholder data, meant to be swapped for a real source later.
   The lookup only reads window.SS_STATES, so a replacement just has to
   produce the same shape:

     code      two-letter postal code
     name      state name as displayed
     status    'opted-in' | 'pending-warm' | 'pending-cold' |
               'not-participating' | null (not yet verified)
     verified  true only when every field below is sourced
     summary   one plain-language paragraph, or '' when unverified
     credit    { name, detail } for a state scholarship tax credit, or null
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
      summary: 'Virginia opted into the federal Education Freedom Tax Credit (IRC §25F) ' +
        'on January 9, 2026, under Governor Glenn Youngkin — the first state to do so. ' +
        'The IRS confirmed Virginia on its list of participating states on June 8, 2026. ' +
        'Virginia’s current governor, Abigail Spanberger, is not the governor who made the opt-in.',
      credit: {
        name: 'Education Improvement Scholarships Tax Credits (EISTC)',
        detail: 'A 65% Virginia tax credit on donations to approved scholarship foundations ' +
          '(Va. Code § 58.1-439.26).'
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
      summary: known ? known.summary : '',
      credit: known ? known.credit : null,
      updates: known ? known.updates : []
    };
  });
})();
