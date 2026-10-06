/* State scholarship tax credit + federal §25F credit estimate for ONE gift.
   Reference only: used by display calculators, never by checkout.

   SHARED FILE. The identical file lives in two repos:
     scholarstreet-org/tax-credit.js   (state credit page calculators)
     ScholarPath/tax-credit.js         (donation form calculator)
   Change both together; tests/tax-credit.test.js in each repo checks the
   file's hash, so an edit to one copy fails the tests until the other copy
   and both pinned hashes are updated.

   NO STATE'S NUMBERS LIVE HERE. Each state's program is a record (the State
   Credit Program object in Salesforce, synced to the portal), and the
   calculators pass it in:
       var calc = TaxCredit.forProgram(program);
   program fields, all optional except creditRate:
       state, stateName, programName   'VA', 'Virginia', 'EISTC'
       creditRate          fraction of the gift credited (0.65)
       minGift             smallest gift that earns any state credit
       maxCreditableGift   most of an individual's gifts in a year that earn credit
       maxCredit           most state credit an individual can receive
       maxCreditCouple     most state credit a married couple can receive together
       stackingWith25f     'allowed' | 'not_allowed' | 'unconfirmed'

   THE STACKING RULE. The same dollars can earn both credits. Under the
   proposed §25F regulations a taxpayer's federal credit is the lesser of
   $1,700 or the qualified (designated) contributions reduced by the state
   credits on them (§1.25F-2(c)(1)), and a state credit on a gift that is only
   partly designated is applied first to the undesignated part
   (§1.25F-2(c)(2)). So for a gift G with D designated and state credit S:
       federal = min(cap, D - max(0, S - (G - D))) = min(cap, D, G - S)
   Treasury's Examples 3 and 4 (§1.25F-2(h)(3)-(4)) are in the tests.

   A married couple filing jointly is two taxpayers, each with a $1,700 cap
   and each designating their own gift (§1.25F-2(a)(2)). The calculators take
   one gift for the couple and assume it is split evenly, so the federal cap
   is $3,400 and the per-individual state limits double.

   calculate() takes the gift plus, optionally, how much of it goes through
   the state program (P, default the whole gift) and how much is designated
   for §25F (D, default the best amount). The calculators use boxes(): a
   state box (the undesignated part) and a §25F box (the designated part)
   that add up to the gift. */
(function (root) {
  var F25_CAP = 1700;   // §25F(b)(1), per taxpayer

  function cents(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function blank(v) {
    return v === undefined || v === null || String(v).trim() === '';
  }

  function amount(v) {
    return blank(v) ? 0 : Math.max(0, cents(v));
  }

  function limit(v) {
    return blank(v) || !(Number(v) > 0) ? null : Number(v);
  }

  function money(n) {
    n = cents(n);
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  /* Smallest cent amount x in [lo, hi] with ok(x) true, for ok monotone
     (false then true). null when even hi fails. */
  function smallest(lo, hi, ok) {
    var a = Math.round(lo * 100), b = Math.round(hi * 100);
    if (!ok(b / 100)) return null;
    while (a < b) {
      var m = Math.floor((a + b) / 2);
      if (ok(m / 100)) b = m; else a = m + 1;
    }
    return a / 100;
  }

  function forProgram(program) {
    program = program || {};
    var P = {
      state: program.state || '',
      stateName: program.stateName || program.state || 'State',
      programName: program.programName || 'state program',
      creditRate: Math.min(1, Math.max(0, Number(program.creditRate) || 0)),
      minGift: limit(program.minGift),
      maxCreditableGift: limit(program.maxCreditableGift),
      maxCredit: limit(program.maxCredit),
      maxCreditCouple: limit(program.maxCreditCouple),
      stackingWith25f: program.stackingWith25f || 'unconfirmed'
    };
    var name = P.programName, credit = P.stateName + ' credit';

    /* gift: the donation in dollars. couple: true for a married couple filing
       jointly. opts (optional): stateAmount, the part going through the state
       program (blank = the whole gift); f25Amount, the part designated for
       §25F (blank = the best amount). Each is held between $0 and the gift.
       Returns every figure the calculators show, rounded to cents. */
    function calculate(gift, couple, opts) {
      opts = opts || {};
      var n = couple ? 2 : 1;
      var g = Math.max(0, cents(gift));
      var cap = F25_CAP * n;
      var r = {
        gift: g,
        stateAmount: g,
        stateClamped: false,
        stateCreditable: 0,
        stateCredit: 0,
        belowStateMin: false,
        overStateMax: false,
        stateCreditCapped: false,
        f25Cap: cap,
        f25Designated: 0,
        f25Clamped: false,
        bestDesignation: 0,
        f25Credit: 0,
        f25LimitedByState: false,
        f25Capped: false,
        f25OverBest: false,
        f25UnderBest: false,
        stackingConfirmed: P.stackingWith25f === 'allowed',
        totalCredits: 0,
        netCost: g
      };

      if (!blank(opts.stateAmount)) {
        var p = Math.max(0, cents(opts.stateAmount));
        r.stateClamped = p > g;
        r.stateAmount = Math.min(p, g);
      }
      var S = r.stateAmount;
      if (S > 0 && P.minGift !== null && S < P.minGift) {
        r.belowStateMin = true;
      } else if (S > 0 && P.creditRate > 0) {
        var maxGift = P.maxCreditableGift === null ? Infinity : P.maxCreditableGift * n;
        r.stateCreditable = Math.min(S, maxGift);
        r.overStateMax = S > maxGift;
        var c = cents(r.stateCreditable * P.creditRate);
        var maxCredit = P.maxCredit === null ? Infinity : P.maxCredit * n;
        if (couple && P.maxCreditCouple !== null) maxCredit = Math.min(maxCredit, P.maxCreditCouple);
        r.stateCreditCapped = c > maxCredit;
        r.stateCredit = Math.min(c, maxCredit);
      }

      var afterState = Math.max(0, cents(g - r.stateCredit));
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
      r.f25LimitedByState = r.stateCredit > 0 && afterState < cap && D >= afterState;
      r.f25OverBest = D > r.bestDesignation;
      r.f25UnderBest = D < r.bestDesignation;
      r.totalCredits = cents(r.stateCredit + r.f25Credit);
      r.netCost = Math.max(0, cents(g - r.totalCredits));
      return r;
    }

    /* The smallest gift that earns the full federal credit alongside the
       state's, after cent rounding ($4,857.13 for one Virginia taxpayer).
       null when no gift can: a 100% state credit with no cap leaves nothing
       for the federal credit to apply to. */
    function fullCreditGift(couple) {
      var cap = F25_CAP * (couple ? 2 : 1);
      return smallest(0, 1e7, function (g) { return calculate(g, couple).f25Credit >= cap; });
    }

    /* The calculators' two boxes are two PARTS of one gift, and they add up:
         state box  the part NOT designated for §25F
         §25F box   the part designated for §25F
         gift       state + §25F
       When the state box has an amount, the whole gift goes through the state
       program, so the state credit is figured on the whole gift. An empty or
       $0 state box means the donor isn't giving through the state program: no
       state credit. A blank box is $0. */
    function boxes(stateBox, f25Box, couple) {
      var e = amount(stateBox), f = amount(f25Box), g = cents(e + f);
      return calculate(g, couple, { stateAmount: e > 0 ? g : 0, f25Amount: f });
    }

    /* The smallest state box that keeps a §25F box of f fully counted (up to
       the cap) once the state credit is applied first: about 65/35 of it in
       Virginia, so $3,157.14 for $1,700. null when no state box can. */
    function stateForFullFederal(f, couple) {
      var target = Math.min(amount(f), F25_CAP * (couple ? 2 : 1));
      if (target <= 0) return 0;
      return smallest(0, 1e7, function (e) { return boxes(e, f, couple).f25Credit >= target; });
    }

    /* The notes shown under the results, so every calculator says the same
       thing. Each is an empty string when there is nothing to say. The state
       part is the undesignated part of the gift (gift - §25F) when the gift
       goes through the state program, and $0 when it doesn't. */
    function notes(r, couple) {
      var gift = '', st = [], f25 = [];
      var capText = money(r.f25Cap) + (couple ? ' for a couple (' + money(F25_CAP) + ' each)' : '');
      var statePart = r.stateAmount > 0 ? cents(r.gift - r.f25Designated) : 0;
      var f = r.f25Designated;

      if (statePart > 0 && f > 0) gift = 'Your gift is the ' + name + ' and §25F amounts together.';

      if (r.gift > 0 && r.stateAmount === 0) {
        st.push('No ' + name + ' amount, so no ' + credit + '.');
      } else if (r.belowStateMin) {
        st.push('Below the ' + money(P.minGift) + ' ' + name + ' minimum, so no ' + credit + '.');
      } else if (r.overStateMax) {
        st.push(credit.charAt(0).toUpperCase() + credit.slice(1) + ' figured on the first ' +
          money(r.stateCreditable) + ' given in a year.');
      } else if (r.stateCreditCapped) {
        st.push(credit.charAt(0).toUpperCase() + credit.slice(1) + ' capped at ' + money(r.stateCredit) + '.');
      } else if (r.stateCredit > 0 && f > 0) {
        st.push('Figured on your whole gift: the §25F part goes through ' + name + ' too.');
      }

      if (r.gift > 0 && f === 0) {
        f25.push('No §25F amount, so no federal credit.');
      } else if (r.f25Credit < Math.min(f, r.f25Cap)) {
        // The state credit is bigger than the state part, so the excess comes
        // off the §25F part (§1.25F-2(c)(2)).
        var need = stateForFullFederal(f, couple);
        f25.push('The ' + credit + ' (' + money(r.stateCredit) + ') is more than the ' + money(statePart) +
          ' ' + name + ' part, so ' + money(cents(r.stateCredit - statePart)) + ' of it comes off the §25F part. ' +
          (need === null
            ? 'No ' + name + ' amount keeps the full federal credit, because the ' + credit + ' covers the whole gift.'
            : 'An ' + name + ' amount of ' + money(need) + ' or more keeps the full ' +
              money(Math.min(f, r.f25Cap)) + '.'));
      } else if (f > r.f25Cap) {
        f25.push('Capped at ' + capText + '. More than that in §25F adds no federal credit.');
      }
      if (couple && r.f25Credit > 0) f25.push('Each spouse designates their own half.');
      return { gift: gift, state: st.join(' '), f25: f25.join(' ') };
    }

    return { program: P, F25_CAP: F25_CAP, calculate: calculate, boxes: boxes,
             stateForFullFederal: stateForFullFederal, fullCreditGift: fullCreditGift,
             notes: notes, money: money };
  }

  /* A program row as the portal stores it (snake_case) to the field names
     above. The calculators fetch rows from the portal's public endpoint. */
  function fromRow(row) {
    row = row || {};
    return {
      state: row.state, stateName: row.state_name, programName: row.program_name,
      creditRate: row.individual_credit_rate, minGift: row.individual_min_gift,
      maxCreditableGift: row.max_creditable_gift, maxCredit: row.max_credit,
      maxCreditCouple: row.max_credit_couple, stackingWith25f: row.stacking_with_25f
    };
  }

  var api = { forProgram: forProgram, fromRow: fromRow, F25_CAP: F25_CAP, money: money };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.TaxCredit = api;
  }
})(this);
