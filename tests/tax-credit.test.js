// Tests for tax-credit.js. Run from the repo root: node --test
// The same test file lives in scholarstreet-org and ScholarPath.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'tax-credit.js');
const { forProgram, fromRow, F25_CAP } = require(FILE);

// Both repos must carry the identical engine. Update this hash in BOTH repos'
// tests whenever tax-credit.js changes (and copy the file across).
const SHARED_SHA256 = '79c7721f5ec33874795ee0a2d7d8c27457884457b6c0f628ce4b5993114d9d9a';

test('shared file is identical to the pinned version', () => {
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  assert.strictEqual(hash, SHARED_SHA256,
    'tax-credit.js changed: copy it to the other repo and update SHARED_SHA256 in both tests');
});

// Virginia's EISTC as its portal row stores it. The engine holds no state's
// numbers; every Virginia figure below comes from this record.
const VA_ROW = { state: 'VA', state_name: 'Virginia', program_name: 'EISTC',
  individual_credit_rate: 0.65, individual_min_gift: 500, max_creditable_gift: 125000,
  max_credit: null, max_credit_couple: null, stacking_with_25f: 'unconfirmed' };
const va = forProgram(fromRow(VA_ROW));
const { calculate, boxes, fullCreditGift, notes, stateForFullFederal } = va;

test('regression: $4,857.14 earns both credits in full, net cost $0', () => {
  const r = calculate(4857.14);
  assert.strictEqual(r.stateCredit, 3157.14);   // 4857.14 x 0.65, to the cent
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.totalCredits, 4857.14);
  assert.strictEqual(r.netCost, 0);
});

test('the Virginia credit is on the whole gift, not a part of it', () => {
  // The old calculator split the gift and credited 65% of $3,157.14 only.
  assert.strictEqual(calculate(4857.14).stateCredit, 3157.14);
  assert.notStrictEqual(calculate(4857.14).stateCredit, 2052.14);
});

test('federal credit is reduced by the state credit (ordering rule)', () => {
  const r = calculate(2000);
  assert.strictEqual(r.stateCredit, 1300);
  assert.strictEqual(r.f25Credit, 700);          // 2000 - 1300, not 1700
  assert.strictEqual(r.f25LimitedByState, true);
  assert.strictEqual(r.totalCredits, 2000);
  assert.strictEqual(r.netCost, 0);
});

test('credits never exceed the gift', () => {
  for (const g of [1, 499, 500, 750, 2000, 4857.13, 4857.14, 4857.15, 10000, 125000, 200000]) {
    for (const couple of [false, true]) {
      const r = calculate(g, couple);
      assert.ok(r.totalCredits <= r.gift + 1e-9, `credits exceed gift at ${g}`);
      assert.ok(r.netCost >= 0);
    }
  }
});

test('$10,000: federal credit capped at $1,700', () => {
  const r = calculate(10000);
  assert.strictEqual(r.stateCredit, 6500);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.f25Capped, true);
  assert.strictEqual(r.totalCredits, 8200);
  assert.strictEqual(r.netCost, 1800);
});

test('married couple: federal cap $3,400', () => {
  const r = calculate(10000, true);
  assert.strictEqual(r.stateCredit, 6500);
  assert.strictEqual(r.f25Credit, 3400);
  assert.strictEqual(r.totalCredits, 9900);
  assert.strictEqual(r.netCost, 100);
  assert.strictEqual(fullCreditGift(true), 9714.28);
});

test('below the $500 EISTC minimum: federal credit only', () => {
  const r = calculate(499);
  assert.strictEqual(r.belowStateMin, true);
  assert.strictEqual(r.stateCredit, 0);
  assert.strictEqual(r.f25Credit, 499);
  assert.strictEqual(r.netCost, 0);
});

test('$500 is the first gift with an EISTC credit', () => {
  const r = calculate(500);
  assert.strictEqual(r.stateCredit, 325);
  assert.strictEqual(r.f25Credit, 175);
});

test('EISTC credited on the first $125,000 only', () => {
  const r = calculate(200000);
  assert.strictEqual(r.overStateMax, true);
  assert.strictEqual(r.stateCredit, 81250);
  assert.strictEqual(r.f25Credit, 1700);
});

test('one cent below the full-credit gift loses a cent of federal credit', () => {
  // With cent rounding, $4,857.13 already earns the full $1,700.
  assert.strictEqual(fullCreditGift(false), 4857.13);
  assert.strictEqual(calculate(4857.13).f25Credit, 1700);
  assert.strictEqual(calculate(4857.12).f25Credit, 1699.99);
});

test('zero and junk input', () => {
  for (const g of [0, -5, '', 'abc', null, undefined]) {
    const r = calculate(g);
    assert.strictEqual(r.totalCredits, 0);
    assert.strictEqual(r.netCost, 0);
  }
});


// ---- Adjustable amounts: EISTC preauthorized (P) and §25F designated (D) ----

test('blank amounts behave exactly like the gift alone', () => {
  for (const g of [499, 2000, 4857.14, 10000, 200000]) {
    for (const couple of [false, true]) {
      assert.deepStrictEqual(calculate(g, couple, { stateAmount: '', f25Amount: '' }), calculate(g, couple));
    }
  }
  const r = calculate(4857.14);
  assert.strictEqual(r.stateAmount, 4857.14);
  assert.strictEqual(r.f25Designated, 1700);
  assert.strictEqual(r.bestDesignation, 1700);
});

test('splitting the gift between the programs earns less than stacking', () => {
  // The old two-box result, now as a real choice: $3,157.14 preauthorized,
  // $1,700 designated, on a $4,857.14 gift.
  const r = calculate(4857.14, false, { stateAmount: 3157.14, f25Amount: 1700 });
  assert.strictEqual(r.stateCredit, 2052.14);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.totalCredits, 3752.14);
  assert.strictEqual(r.netCost, 1105);
  assert.ok(r.totalCredits < calculate(4857.14).totalCredits);
});

test('no EISTC: federal only', () => {
  const r = calculate(5000, false, { stateAmount: 0 });
  assert.strictEqual(r.stateCredit, 0);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.netCost, 3300);
});

test('designating more than the best amount adds nothing', () => {
  const r = calculate(2000, false, { f25Amount: 1700 });
  assert.strictEqual(r.f25Credit, 700);
  assert.strictEqual(r.f25OverBest, true);
  const capped = calculate(10000, false, { f25Amount: 5000 });
  assert.strictEqual(capped.f25Credit, 1700);
});

test('designating less than the best amount says what to designate', () => {
  const r = calculate(10000, false, { f25Amount: 1000 });
  assert.strictEqual(r.f25Credit, 1000);
  assert.strictEqual(r.f25UnderBest, true);
  const none = calculate(10000, false, { f25Amount: 0 });
  assert.strictEqual(none.f25Credit, 0);
});

test('ordering rule with a partial designation', () => {
  // $3,000 gift, $1,000 designated: the $1,950 state credit first absorbs
  // the $2,000 undesignated part, so the full $1,000 still counts.
  assert.strictEqual(calculate(3000, false, { f25Amount: 1000 }).f25Credit, 1000);
  // $1,100 designated leaves $1,900 undesignated; $50 of the state credit
  // spills over, so $1,050 counts.
  assert.strictEqual(calculate(3000, false, { f25Amount: 1100 }).f25Credit, 1050);
});

test('amounts are held between $0 and the gift', () => {
  const r = calculate(1000, false, { stateAmount: 5000, f25Amount: 9000 });
  assert.strictEqual(r.stateAmount, 1000);
  assert.strictEqual(r.f25Designated, 1000);
  assert.strictEqual(r.stateClamped, true);
  assert.strictEqual(r.f25Clamped, true);
  const neg = calculate(1000, false, { stateAmount: -5, f25Amount: -5 });
  assert.strictEqual(neg.stateAmount, 0);
  assert.strictEqual(neg.f25Designated, 0);
});

test('partial EISTC below the minimum earns no Virginia credit', () => {
  const r = calculate(5000, false, { stateAmount: 400 });
  assert.strictEqual(r.belowStateMin, true);
  assert.strictEqual(r.stateCredit, 0);
  assert.strictEqual(r.f25Credit, 1700);
});

test('adjusted amounts never give credits above the gift', () => {
  for (const g of [500, 2000, 4857.14, 10000]) {
    for (const p of [0, 400, 500, g / 2, g]) {
      for (const d of [0, 500, 1700, 3400, g]) {
        for (const couple of [false, true]) {
          const r = calculate(g, couple, { stateAmount: p, f25Amount: d });
          assert.ok(r.totalCredits <= r.gift + 1e-9, `credits exceed gift at ${g}/${p}/${d}`);
          assert.ok(r.f25Credit <= r.f25Designated + 1e-9);
        }
      }
    }
  }
});

// ---- The two boxes: EISTC (undesignated part) + §25F (designated part) = gift ----

const cents2 = (n) => Math.round(n * 100) / 100;

test('boxes add up: the regression case, typed as two parts', () => {
  const r = boxes(3157.14, 1700);
  assert.strictEqual(r.gift, 4857.14);          // 3,157.14 + 1,700
  assert.strictEqual(r.stateCredit, 3157.14);   // 65% of the whole gift
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.totalCredits, 4857.14);
  assert.strictEqual(r.netCost, 0);
  const n = notes(r);
  assert.match(n.gift, /EISTC and §25F amounts together/);
  assert.match(n.state, /Figured on your whole gift/);
  assert.strictEqual(n.f25, '');
});

test('boxes: the confirmed examples', () => {
  const table = [
    // state, f25, gift, virginia, federal, total, net
    [3157.14, 1700, 4857.14, 3157.14, 1700, 4857.14, 0],
    [8300, 1700, 10000, 6500, 1700, 8200, 1800],
    [300, 1700, 2000, 1300, 700, 2000, 0],
    [5000, 0, 5000, 3250, 0, 3250, 1750],
    [0, 1700, 1700, 0, 1700, 1700, 0],
  ];
  for (const [e, f, g, va, fed, total, net] of table) {
    const r = boxes(e, f);
    assert.deepStrictEqual([r.gift, r.stateCredit, r.f25Credit, r.totalCredits, r.netCost],
      [g, va, fed, total, net], `boxes(${e}, ${f})`);
  }
});

test('boxes: Virginia credit larger than the EISTC part cuts into §25F', () => {
  const n = notes(boxes(300, 1700));
  assert.match(n.f25, /Virginia credit \(\$1,300\) is more than the \$300 EISTC part, so \$1,000 of it comes off the §25F part/);
  assert.match(n.f25, /An EISTC amount of \$3,157\.13 or more keeps the full \$1,700/);
});

test('boxes: the EISTC amount that keeps the federal credit whole', () => {
  assert.strictEqual(stateForFullFederal(1700), 3157.13);
  assert.strictEqual(boxes(3157.13, 1700).f25Credit, 1700);
  assert.strictEqual(boxes(3157.12, 1700).f25Credit, 1699.99);
  assert.strictEqual(stateForFullFederal(3400, true), 6314.28);
  assert.strictEqual(boxes(stateForFullFederal(1000), 1000).f25Credit, 1000);
  assert.ok(boxes(cents2(stateForFullFederal(1000) - 0.01), 1000).f25Credit < 1000);
  assert.strictEqual(stateForFullFederal(0), 0);
});

test('boxes: empty or $0 EISTC means no Virginia credit', () => {
  for (const e of ['', 0, null]) {
    const r = boxes(e, 1700);
    assert.strictEqual(r.stateCredit, 0);
    assert.strictEqual(r.f25Credit, 1700);
    assert.match(notes(r).state, /No EISTC amount, so no Virginia credit/);
  }
});

test('boxes: no §25F amount, cap, couples, minimum', () => {
  assert.match(notes(boxes(5000, 0)).f25, /No §25F amount, so no federal credit/);
  const capped = boxes(10000, 5000);
  assert.strictEqual(capped.f25Credit, 1700);
  assert.match(notes(capped).f25, /Capped at \$1,700\. More than that in §25F adds no federal credit/);
  const couple = boxes(6314.28, 3400, true);
  assert.strictEqual(couple.totalCredits, 9714.28);
  assert.strictEqual(couple.netCost, 0);
  assert.match(notes(couple, true).f25, /Each spouse designates their own half/);
  const small = boxes(200, 100);
  assert.strictEqual(small.stateCredit, 0);
  assert.match(notes(small).state, /Below the \$500 EISTC minimum/);
  assert.match(notes(boxes(200000, 1700)).state, /first \$125,000/);
});

test('boxes: blanks and junk', () => {
  for (const [e, f] of [['', ''], [null, undefined], ['abc', -5]]) {
    const z = boxes(e, f);
    assert.strictEqual(z.gift, 0);
    assert.strictEqual(z.totalCredits, 0);
    assert.deepStrictEqual(notes(z), { gift: '', state: '', f25: '' });
  }
});

test('boxes: credits never exceed the gift, notes have no em dashes', () => {
  for (const e of [0, 200, 499, 500, 2000, 3157.14, 10000, 200000]) {
    for (const f of [0, 100, 500, 1700, 3400, 5000]) {
      for (const couple of [false, true]) {
        const r = boxes(e, f, couple);
        assert.ok(r.totalCredits <= r.gift + 1e-9, `credits exceed gift at ${e}/${f}`);
        assert.ok(!/\u2014/.test(JSON.stringify(notes(r, couple))), 'no em dashes');
      }
    }
  }
});

test('the Virginia record as the engine reads it', () => {
  assert.deepStrictEqual(va.program, { state: 'VA', stateName: 'Virginia', programName: 'EISTC',
    creditRate: 0.65, minGift: 500, maxCreditableGift: 125000, maxCredit: null, maxCreditCouple: null,
    stackingWith25f: 'unconfirmed' });
  assert.strictEqual(F25_CAP, 1700);
});


// ---- Treasury's own examples (proposed §1.25F-2(h)) ----

test('Treasury Example 3: state credit reduces the federal credit', () => {
  // $1,500 to Org X, fully designated; State Q credits 40% of up to $1,000,
  // so $400. D's separate $500 to Org Y earns no state credit. Together:
  // $2,000 of qualified contributions less $400 = $1,600.
  const q = forProgram({ stateName: 'State Q', programName: 'Q', creditRate: 0.40, maxCreditableGift: 1000 });
  const x = q.calculate(1500, false, { f25Amount: 1500 });
  assert.strictEqual(x.stateCredit, 400);
  assert.strictEqual(x.f25Credit, 1100);          // 1,500 - 400
  assert.strictEqual(Math.min(F25_CAP, x.f25Credit + 500), 1600);
});

test('Treasury Example 4: state credit absorbed by the undesignated part first', () => {
  // $4,000 gift, $1,700 designated; State Z credits 10% of up to $4,000 = $400.
  const z = forProgram({ stateName: 'State Z', programName: 'Z', creditRate: 0.10, maxCreditableGift: 4000 });
  const r = z.calculate(4000, false, { f25Amount: 1700 });
  assert.strictEqual(r.stateCredit, 400);
  assert.strictEqual(r.f25Credit, 1700);          // not reduced
  assert.strictEqual(r.totalCredits, 2100);
});

// ---- Other program shapes, all from records ----

test('a 100% credit with a per-person cap (Arizona-style)', () => {
  const az = forProgram({ stateName: 'Arizona', programName: 'STO', creditRate: 1, maxCredit: 1243 });
  const small = az.calculate(1000);
  assert.strictEqual(small.stateCredit, 1000);
  assert.strictEqual(small.f25Credit, 0);          // nothing left for §25F to apply to
  const big = az.calculate(2943);
  assert.strictEqual(big.stateCredit, 1243);
  assert.strictEqual(big.stateCreditCapped, true);
  assert.strictEqual(big.f25Credit, 1700);         // 2,943 - 1,243
  assert.strictEqual(big.netCost, 0);
  assert.strictEqual(az.fullCreditGift(false), 2943);
  assert.match(az.notes(big).state, /Arizona credit capped at \$1,243/);
});

test('a couple cap smaller than twice the individual cap', () => {
  const p = forProgram({ stateName: 'State C', programName: 'C', creditRate: 1, maxCredit: 1000, maxCreditCouple: 1500 });
  assert.strictEqual(p.calculate(5000, true).stateCredit, 1500);
  assert.strictEqual(p.calculate(5000, false).stateCredit, 1000);
});

test('a 100% credit with no cap leaves no federal credit, and says so', () => {
  const p = forProgram({ stateName: 'State U', programName: 'U', creditRate: 1 });
  assert.strictEqual(p.calculate(5000).f25Credit, 0);
  assert.strictEqual(p.fullCreditGift(false), null);
  assert.strictEqual(p.stateForFullFederal(1700), null);
  assert.match(p.notes(p.boxes(100, 1700)).f25, /No U amount keeps the full federal credit/);
});

test('a state with no program: federal credit only', () => {
  const none = forProgram({ stateName: 'Colorado', programName: 'state program', creditRate: 0 });
  const r = none.calculate(1700);
  assert.strictEqual(r.stateCredit, 0);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(none.fullCreditGift(false), 1700);
});

test('Virginia couple: the $125,000 limit is per spouse', () => {
  // Fixed in the move to records: the old engine applied $125,000 to the couple.
  const r = calculate(300000, true);
  assert.strictEqual(r.stateCreditable, 250000);
  assert.strictEqual(r.stateCredit, 162500);
  assert.strictEqual(calculate(300000, false).stateCreditable, 125000);
});

test('stacking flag comes from the record', () => {
  assert.strictEqual(calculate(5000).stackingConfirmed, false);
  const ok = forProgram({ ...fromRow(VA_ROW), stackingWith25f: 'allowed' });
  assert.strictEqual(ok.calculate(5000).stackingConfirmed, true);
});

test('every program: credits never exceed the gift, federal never above its cap', () => {
  const programs = [fromRow(VA_ROW),
    { creditRate: 1, maxCredit: 1243 }, { creditRate: 0.5 }, { creditRate: 0.75, maxCredit: 750 },
    { creditRate: 1 }, { creditRate: 0 }, { creditRate: 0.4, maxCreditableGift: 1000, minGift: 250 }];
  for (const prog of programs) {
    const p = forProgram(prog);
    for (const g of [0, 100, 499, 500, 1700, 2000, 4857.14, 10000, 200000]) {
      for (const d of ['', 0, 500, 1700, 3400, g]) {
        for (const couple of [false, true]) {
          const r = p.calculate(g, couple, { f25Amount: d });
          assert.ok(r.totalCredits <= r.gift + 1e-9, `credits exceed gift: ${JSON.stringify(prog)} ${g}/${d}`);
          assert.ok(r.f25Credit <= r.f25Cap + 1e-9);
          assert.ok(r.f25Credit <= r.f25Designated + 1e-9);
        }
      }
    }
  }
});
