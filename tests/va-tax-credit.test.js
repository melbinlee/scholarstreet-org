// Tests for va-tax-credit.js. Run from the repo root: node --test
// The same test file lives in scholarstreet-org and ScholarPath.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'va-tax-credit.js');
const { calculate, boxes, fullCreditGift, notes, CONFIG } = require(FILE);

// Both repos must carry the identical calculator. Update this hash in BOTH
// repos' tests whenever va-tax-credit.js changes (and copy the file across).
const SHARED_SHA256 = 'f0c6b4c81d8d775bd01c7960c7a52d1e71454148f6e758e726e5b8e366ad7019';

test('shared file is identical to the pinned version', () => {
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  assert.strictEqual(hash, SHARED_SHA256,
    'va-tax-credit.js changed: copy it to the other repo and update SHARED_SHA256 in both tests');
});

test('regression: $4,857.14 earns both credits in full, net cost $0', () => {
  const r = calculate(4857.14);
  assert.strictEqual(r.eistcCredit, 3157.14);   // 4857.14 x 0.65, to the cent
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.totalCredits, 4857.14);
  assert.strictEqual(r.netCost, 0);
});

test('the Virginia credit is on the whole gift, not a part of it', () => {
  // The old calculator split the gift and credited 65% of $3,157.14 only.
  assert.strictEqual(calculate(4857.14).eistcCredit, 3157.14);
  assert.notStrictEqual(calculate(4857.14).eistcCredit, 2052.14);
});

test('federal credit is reduced by the state credit (ordering rule)', () => {
  const r = calculate(2000);
  assert.strictEqual(r.eistcCredit, 1300);
  assert.strictEqual(r.f25Credit, 700);          // 2000 - 1300, not 1700
  assert.strictEqual(r.f25LimitedByEistc, true);
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
  assert.strictEqual(r.eistcCredit, 6500);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.f25Capped, true);
  assert.strictEqual(r.totalCredits, 8200);
  assert.strictEqual(r.netCost, 1800);
});

test('married couple: federal cap $3,400', () => {
  const r = calculate(10000, true);
  assert.strictEqual(r.eistcCredit, 6500);
  assert.strictEqual(r.f25Credit, 3400);
  assert.strictEqual(r.totalCredits, 9900);
  assert.strictEqual(r.netCost, 100);
  assert.strictEqual(fullCreditGift(true), 9714.28);
});

test('below the $500 EISTC minimum: federal credit only', () => {
  const r = calculate(499);
  assert.strictEqual(r.belowEistcMin, true);
  assert.strictEqual(r.eistcCredit, 0);
  assert.strictEqual(r.f25Credit, 499);
  assert.strictEqual(r.netCost, 0);
});

test('$500 is the first gift with an EISTC credit', () => {
  const r = calculate(500);
  assert.strictEqual(r.eistcCredit, 325);
  assert.strictEqual(r.f25Credit, 175);
});

test('EISTC credited on the first $125,000 only', () => {
  const r = calculate(200000);
  assert.strictEqual(r.overEistcMax, true);
  assert.strictEqual(r.eistcCredit, 81250);
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
      assert.deepStrictEqual(calculate(g, couple, { eistcAmount: '', f25Amount: '' }), calculate(g, couple));
    }
  }
  const r = calculate(4857.14);
  assert.strictEqual(r.eistcAmount, 4857.14);
  assert.strictEqual(r.f25Designated, 1700);
  assert.strictEqual(r.bestDesignation, 1700);
});

test('splitting the gift between the programs earns less than stacking', () => {
  // The old two-box result, now as a real choice: $3,157.14 preauthorized,
  // $1,700 designated, on a $4,857.14 gift.
  const r = calculate(4857.14, false, { eistcAmount: 3157.14, f25Amount: 1700 });
  assert.strictEqual(r.eistcCredit, 2052.14);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.totalCredits, 3752.14);
  assert.strictEqual(r.netCost, 1105);
  assert.ok(r.totalCredits < calculate(4857.14).totalCredits);
});

test('no EISTC: federal only', () => {
  const r = calculate(5000, false, { eistcAmount: 0 });
  assert.strictEqual(r.eistcCredit, 0);
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
  const r = calculate(1000, false, { eistcAmount: 5000, f25Amount: 9000 });
  assert.strictEqual(r.eistcAmount, 1000);
  assert.strictEqual(r.f25Designated, 1000);
  assert.strictEqual(r.eistcClamped, true);
  assert.strictEqual(r.f25Clamped, true);
  const neg = calculate(1000, false, { eistcAmount: -5, f25Amount: -5 });
  assert.strictEqual(neg.eistcAmount, 0);
  assert.strictEqual(neg.f25Designated, 0);
});

test('partial EISTC below the minimum earns no Virginia credit', () => {
  const r = calculate(5000, false, { eistcAmount: 400 });
  assert.strictEqual(r.belowEistcMin, true);
  assert.strictEqual(r.eistcCredit, 0);
  assert.strictEqual(r.f25Credit, 1700);
});

test('adjusted amounts never give credits above the gift', () => {
  for (const g of [500, 2000, 4857.14, 10000]) {
    for (const p of [0, 400, 500, g / 2, g]) {
      for (const d of [0, 500, 1700, 3400, g]) {
        for (const couple of [false, true]) {
          const r = calculate(g, couple, { eistcAmount: p, f25Amount: d });
          assert.ok(r.totalCredits <= r.gift + 1e-9, `credits exceed gift at ${g}/${p}/${d}`);
          assert.ok(r.f25Credit <= r.f25Designated + 1e-9);
        }
      }
    }
  }
});

// ---- The two boxes: EISTC (undesignated part) + §25F (designated part) = gift ----

const { eistcForFullFederal } = require(FILE);
const cents2 = (n) => Math.round(n * 100) / 100;

test('boxes add up: the regression case, typed as two parts', () => {
  const r = boxes(3157.14, 1700);
  assert.strictEqual(r.gift, 4857.14);          // 3,157.14 + 1,700
  assert.strictEqual(r.eistcCredit, 3157.14);   // 65% of the whole gift
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.totalCredits, 4857.14);
  assert.strictEqual(r.netCost, 0);
  const n = notes(r);
  assert.match(n.gift, /EISTC and §25F amounts together/);
  assert.match(n.eistc, /Figured on your whole gift/);
  assert.strictEqual(n.f25, '');
});

test('boxes: the confirmed examples', () => {
  const table = [
    // eistc, f25, gift, virginia, federal, total, net
    [3157.14, 1700, 4857.14, 3157.14, 1700, 4857.14, 0],
    [8300, 1700, 10000, 6500, 1700, 8200, 1800],
    [300, 1700, 2000, 1300, 700, 2000, 0],
    [5000, 0, 5000, 3250, 0, 3250, 1750],
    [0, 1700, 1700, 0, 1700, 1700, 0],
  ];
  for (const [e, f, g, va, fed, total, net] of table) {
    const r = boxes(e, f);
    assert.deepStrictEqual([r.gift, r.eistcCredit, r.f25Credit, r.totalCredits, r.netCost],
      [g, va, fed, total, net], `boxes(${e}, ${f})`);
  }
});

test('boxes: Virginia credit larger than the EISTC part cuts into §25F', () => {
  const n = notes(boxes(300, 1700));
  assert.match(n.f25, /Virginia credit \(\$1,300\) is more than the \$300 EISTC part, so \$1,000 of it comes off the §25F part/);
  assert.match(n.f25, /An EISTC amount of \$3,157\.13 or more keeps the full \$1,700/);
});

test('boxes: the EISTC amount that keeps the federal credit whole', () => {
  assert.strictEqual(eistcForFullFederal(1700), 3157.13);
  assert.strictEqual(boxes(3157.13, 1700).f25Credit, 1700);
  assert.strictEqual(boxes(3157.12, 1700).f25Credit, 1699.99);
  assert.strictEqual(eistcForFullFederal(3400, true), 6314.28);
  assert.strictEqual(boxes(eistcForFullFederal(1000), 1000).f25Credit, 1000);
  assert.ok(boxes(cents2(eistcForFullFederal(1000) - 0.01), 1000).f25Credit < 1000);
  assert.strictEqual(eistcForFullFederal(0), 0);
});

test('boxes: empty or $0 EISTC means no Virginia credit', () => {
  for (const e of ['', 0, null]) {
    const r = boxes(e, 1700);
    assert.strictEqual(r.eistcCredit, 0);
    assert.strictEqual(r.f25Credit, 1700);
    assert.match(notes(r).eistc, /No EISTC amount, so no Virginia credit/);
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
  assert.strictEqual(small.eistcCredit, 0);
  assert.match(notes(small).eistc, /Below the \$500 EISTC minimum/);
  assert.match(notes(boxes(200000, 1700)).eistc, /first \$125,000/);
});

test('boxes: blanks and junk', () => {
  for (const [e, f] of [['', ''], [null, undefined], ['abc', -5]]) {
    const z = boxes(e, f);
    assert.strictEqual(z.gift, 0);
    assert.strictEqual(z.totalCredits, 0);
    assert.deepStrictEqual(notes(z), { gift: '', eistc: '', f25: '' });
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

test('config', () => {
  assert.deepStrictEqual(CONFIG, { EISTC_RATE: 0.65, EISTC_MIN: 500, EISTC_MAX: 125000, F25_CAP: 1700 });
});
