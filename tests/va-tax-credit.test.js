// Tests for va-tax-credit.js. Run from the repo root: node --test
// The same test file lives in scholarstreet-org and ScholarPath.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'va-tax-credit.js');
const { calculate, fullCreditGift, notes, CONFIG } = require(FILE);

// Both repos must carry the identical calculator. Update this hash in BOTH
// repos' tests whenever va-tax-credit.js changes (and copy the file across).
const SHARED_SHA256 = '435eeaf1aa5b887c29599b4c7acc660db254047d65cb4126a76318dca3ce2c71';

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

test('notes explain the ordering, the cap and what to designate', () => {
  assert.strictEqual(notes(calculate(4857.14)).f25, 'Designate $1,700 of your gift for §25F when you give.');
  assert.match(notes(calculate(2000)).f25, /Virginia credit is applied first, so \$700 .* \$4,857\.13 or more earns the full \$1,700/);
  assert.match(notes(calculate(10000)).f25, /^Capped at \$1,700\./);
  assert.match(notes(calculate(10000, true), true).f25, /Capped at \$3,400 for a couple \(\$1,700 each\)\..*split between you/);
  assert.match(notes(calculate(499)).eistc, /Below the \$500 EISTC minimum/);
  assert.match(notes(calculate(200000)).eistc, /first \$125,000/);
  assert.deepStrictEqual(notes(calculate(0)), { eistc: '', f25: '' });
  for (const g of [499, 2000, 10000, 200000]) {
    assert.ok(!/—/.test(JSON.stringify(notes(calculate(g)))), 'no em dashes');
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
  assert.match(notes(r).eistc, /Figured on the \$3,157\.14 preauthorized/);
});

test('no EISTC: federal only', () => {
  const r = calculate(5000, false, { eistcAmount: 0 });
  assert.strictEqual(r.eistcCredit, 0);
  assert.strictEqual(r.f25Credit, 1700);
  assert.strictEqual(r.netCost, 3300);
  assert.match(notes(r).eistc, /None of the gift is preauthorized/);
});

test('designating more than the best amount adds nothing', () => {
  const r = calculate(2000, false, { f25Amount: 1700 });
  assert.strictEqual(r.f25Credit, 700);
  assert.strictEqual(r.f25OverBest, true);
  assert.match(notes(r).f25, /more than \$700 adds nothing: the Virginia credit is applied first/);
  const capped = calculate(10000, false, { f25Amount: 5000 });
  assert.strictEqual(capped.f25Credit, 1700);
  assert.match(notes(capped).f25, /capped at \$1,700/);
});

test('designating less than the best amount says what to designate', () => {
  const r = calculate(10000, false, { f25Amount: 1000 });
  assert.strictEqual(r.f25Credit, 1000);
  assert.strictEqual(r.f25UnderBest, true);
  assert.match(notes(r).f25, /Designate \$1,700 instead to earn \$1,700/);
  const none = calculate(10000, false, { f25Amount: 0 });
  assert.strictEqual(none.f25Credit, 0);
  assert.match(notes(none).f25, /Nothing is designated/);
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
  assert.match(notes(r).eistc, /be more than your gift, so \$1,000 is used/);
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

test('config', () => {
  assert.deepStrictEqual(CONFIG, { EISTC_RATE: 0.65, EISTC_MIN: 500, EISTC_MAX: 125000, F25_CAP: 1700 });
});
