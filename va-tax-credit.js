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
   each spouse designates half). Designating more than that adds nothing. */
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

  /* gift: the donation in dollars. couple: true for a married couple filing
     jointly. Returns every figure the calculators show, rounded to cents. */
  function calculate(gift, couple) {
    var g = Math.max(0, cents(gift));
    var r = {
      gift: g,
      eistcCreditable: 0,
      eistcCredit: 0,
      belowEistcMin: false,
      overEistcMax: false,
      f25Cap: CONFIG.F25_CAP * (couple ? 2 : 1),
      f25Credit: 0,
      f25LimitedByEistc: false,
      f25Capped: false,
      totalCredits: 0,
      netCost: g
    };
    if (g > 0 && g < CONFIG.EISTC_MIN) {
      r.belowEistcMin = true;
    } else if (g > 0) {
      r.eistcCreditable = Math.min(g, CONFIG.EISTC_MAX);
      r.overEistcMax = g > CONFIG.EISTC_MAX;
      r.eistcCredit = cents(r.eistcCreditable * CONFIG.EISTC_RATE);
    }
    var afterState = cents(g - r.eistcCredit);
    r.f25Credit = Math.min(r.f25Cap, afterState);
    r.f25Capped = afterState > r.f25Cap;
    r.f25LimitedByEistc = r.eistcCredit > 0 && afterState < r.f25Cap;
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
    var eistc = '', f25 = '';
    if (r.belowEistcMin) {
      eistc = 'Below the ' + money(CONFIG.EISTC_MIN) + ' EISTC minimum, so no Virginia credit.';
    } else if (r.overEistcMax) {
      eistc = 'Virginia credit figured on the first ' + money(CONFIG.EISTC_MAX) + ' given in a year.';
    }
    if (r.f25LimitedByEistc) {
      f25 = 'The Virginia credit is applied first, so ' + money(r.f25Credit) +
        ' of your gift counts toward the federal credit. A gift of ' + money(fullCreditGift(couple)) +
        ' or more earns the full ' + money(r.f25Cap) + '.';
    } else if (r.f25Capped) {
      f25 = 'Capped at ' + money(r.f25Cap) +
        (couple ? ' for a couple (' + money(CONFIG.F25_CAP) + ' each)' : '') + '.';
    }
    if (r.f25Credit > 0) {
      f25 += (f25 ? ' ' : '') + 'Designate ' + money(r.f25Credit) + ' of your gift for §25F' +
        (couple ? ', split between you,' : '') + ' when you give.';
    }
    return { eistc: eistc, f25: f25 };
  }

  var api = { CONFIG: CONFIG, calculate: calculate, fullCreditGift: fullCreditGift, notes: notes, money: money };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.VaTaxCredit = api;
  }
})(this);
