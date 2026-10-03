/* Virginia EISTC + federal §25F tax credit estimate for ONE qualifying gift.
   Reference only: used by display calculators, never by checkout.

   SHARED FILE. The identical file lives in two repos:
     scholarstreet-org/va-tax-credit.js   (VA EISTC page calculator)
     ScholarPath/va-tax-credit.js         (donation form calculator)
   Change both together; tests/va-tax-credit.test.js in each repo checks the
   file's hash, so an edit to one copy fails the tests until the other
   copy and both pinned hashes are updated.

   The same dollars earn both credits. Virginia's credit is 65% of the gift
   (Va. Code § 58.1-439.26: $500 minimum, credited on the first $125,000 an
   individual gives in a year; one preauthorization covers a married couple).
   The federal credit comes after it: under the proposed §25F regulations
   (§1.25F-2(c)(1)-(2)) a state credit is applied first to the part of the
   gift not designated for §25F, and only the excess reduces the designated
   part. So the most a gift can earn federally is
       min(federal cap, gift - Virginia credit)
   with a cap of $1,700 per taxpayer ($3,400 for a married couple, assuming
   each spouse designates half). Designating more than that adds nothing.

   The donor controls two amounts within the one gift, and the calculators
   let them adjust both: how much is preauthorized for EISTC (P, default the
   whole gift) and how much is designated for §25F (D, default the best
   amount). With Virginia credit S = 65% of P:
       federal = min(cap, D, gift - S)
   because the state credit S first absorbs the undesignated part
   (gift - D), and only what is left over reduces D. */
(function (root) {
  var CONFIG = {
    EISTC_RATE: 0.65,
    EISTC_MIN: 500,
    EISTC_MAX: 125000,
    F25_CAP: 1700
  };

  function cents(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function blank(v) {
    return v === undefined || v === null || String(v).trim() === '';
  }

  /* gift: the donation in dollars. couple: true for a married couple filing
     jointly. opts (optional): eistcAmount, the part preauthorized for EISTC
     (blank = the whole gift); f25Amount, the part designated for §25F
     (blank = the best amount). Each is held between $0 and the gift.
     Returns every figure the calculators show, rounded to cents. */
  function calculate(gift, couple, opts) {
    opts = opts || {};
    var g = Math.max(0, cents(gift));
    var cap = CONFIG.F25_CAP * (couple ? 2 : 1);
    var r = {
      gift: g,
      eistcAmount: g,
      eistcClamped: false,
      eistcCreditable: 0,
      eistcCredit: 0,
      belowEistcMin: false,
      overEistcMax: false,
      f25Cap: cap,
      f25Designated: 0,
      f25Clamped: false,
      bestDesignation: 0,
      f25Credit: 0,
      f25LimitedByEistc: false,
      f25Capped: false,
      f25OverBest: false,
      f25UnderBest: false,
      totalCredits: 0,
      netCost: g
    };

    if (!blank(opts.eistcAmount)) {
      var p = Math.max(0, cents(opts.eistcAmount));
      r.eistcClamped = p > g;
      r.eistcAmount = Math.min(p, g);
    }
    var P = r.eistcAmount;
    if (P > 0 && P < CONFIG.EISTC_MIN) {
      r.belowEistcMin = true;
    } else if (P > 0) {
      r.eistcCreditable = Math.min(P, CONFIG.EISTC_MAX);
      r.overEistcMax = P > CONFIG.EISTC_MAX;
      r.eistcCredit = cents(r.eistcCreditable * CONFIG.EISTC_RATE);
    }

    var afterState = Math.max(0, cents(g - r.eistcCredit));
    r.bestDesignation = Math.min(cap, afterState);
    r.f25Designated = r.bestDesignation;
    if (!blank(opts.f25Amount)) {
      var d = Math.max(0, cents(opts.f25Amount));
      r.f25Clamped = d > g;
      r.f25Designated = Math.min(d, g);
    }
    var D = r.f25Designated;
    r.f25Credit = Math.min(cap, D, afterState);
    r.f25Capped = afterState > cap && D >= cap;
    r.f25LimitedByEistc = r.eistcCredit > 0 && afterState < cap && D >= afterState;
    r.f25OverBest = D > r.bestDesignation;
    r.f25UnderBest = D < r.bestDesignation;
    r.totalCredits = cents(r.eistcCredit + r.f25Credit);
    r.netCost = Math.max(0, cents(g - r.totalCredits));
    return r;
  }

  /* The smallest gift that earns the full federal credit alongside
     Virginia's, after cent rounding ($4,857.13 for one taxpayer). */
  function fullCreditGift(couple) {
    var cap = CONFIG.F25_CAP * (couple ? 2 : 1);
    var g = Math.ceil(cap / (1 - CONFIG.EISTC_RATE) * 100) / 100;
    while (calculate(cents(g - 0.01), couple).f25Credit >= cap) g = cents(g - 0.01);
    return g;
  }

  function money(n) {
    n = cents(n);
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  /* The notes shown under each credit, so both calculators say the same
     thing. Empty string when there is nothing to say. */
  function notes(r, couple) {
    var eistc = [], f25 = [];
    var capText = money(r.f25Cap) + (couple ? ' for a couple (' + money(CONFIG.F25_CAP) + ' each)' : '');

    if (r.eistcClamped) eistc.push('Can’t be more than your gift, so ' + money(r.eistcAmount) + ' is used.');
    if (r.gift > 0 && r.eistcAmount === 0) {
      eistc.push('None of the gift is preauthorized for EISTC, so no Virginia credit.');
    } else if (r.belowEistcMin) {
      eistc.push('Below the ' + money(CONFIG.EISTC_MIN) + ' EISTC minimum, so no Virginia credit.');
    } else if (r.overEistcMax) {
      eistc.push('Virginia credit figured on the first ' + money(CONFIG.EISTC_MAX) + ' given in a year.');
    } else if (r.eistcAmount < r.gift) {
      eistc.push('Figured on the ' + money(r.eistcAmount) + ' preauthorized, not the whole gift.');
    }

    if (r.f25Clamped) f25.push('Can’t be more than your gift, so ' + money(r.f25Designated) + ' is used.');
    if (r.f25UnderBest) {
      f25.push(r.f25Designated === 0
        ? 'Nothing is designated. Designate ' + money(r.bestDesignation) + ' to earn ' + money(r.bestDesignation) + '.'
        : 'Designate ' + money(r.bestDesignation) + ' instead to earn ' + money(r.bestDesignation) + '.');
    } else if (r.f25OverBest) {
      f25.push('Designating more than ' + money(r.bestDesignation) + ' adds nothing: ' +
        (r.bestDesignation >= r.f25Cap
          ? 'the federal credit is capped at ' + capText + '.'
          : 'the Virginia credit is applied first, so only ' + money(r.bestDesignation) + ' can count.'));
    } else {
      if (r.f25LimitedByEistc) {
        f25.push('The Virginia credit is applied first, so ' + money(r.f25Credit) +
          ' of your gift counts toward the federal credit.' +
          (r.eistcAmount === r.gift
            ? ' A gift of ' + money(fullCreditGift(couple)) + ' or more earns the full ' + money(r.f25Cap) + '.'
            : ''));
      } else if (r.f25Capped) {
        f25.push('Capped at ' + capText + '.');
      }
      if (r.f25Credit > 0) {
        f25.push('Designate ' + money(r.f25Credit) + ' of your gift for §25F' +
          (couple ? ', split between you,' : '') + ' when you give.');
      }
    }
    return { eistc: eistc.join(' '), f25: f25.join(' ') };
  }

  var api = { CONFIG: CONFIG, calculate: calculate, fullCreditGift: fullCreditGift, notes: notes, money: money };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.VaTaxCredit = api;
  }
})(this);
