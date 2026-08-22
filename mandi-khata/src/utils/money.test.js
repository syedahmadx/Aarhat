import { describe, it, expect } from 'vitest';
import {
  grossPaisa,
  commissionPaisa,
  netPayoutPaisa,
  formatPKR,
  parsePKR,
  parseWeightKg,
  parseRate,
} from './money';
import { initialParties, initialSales, initialCashEntries } from '../data/mockData';
import { computePartyBalance } from '../context/AppContext';

// Seeded PRNG so a failing random case is reproducible instead of a ghost.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rnd, min, max) => min + Math.floor(rnd() * (max - min + 1));

describe('the money identity', () => {
  it('holds exactly across 1000 randomised sales', () => {
    const rnd = mulberry32(0x4d414e44); // "MAND"
    const failures = [];

    for (let i = 0; i < 1000; i += 1) {
      const weightG = randInt(rnd, 1, 500_000); // 1 g to 500 kg
      const ratePaisaPerKg = randInt(rnd, 100, 500_000); // Rs. 1 to Rs. 5000 per kg
      const bp = randInt(rnd, 0, 2000); // 0% to 20%

      const gross = grossPaisa(weightG, ratePaisaPerKg);
      const commission = commissionPaisa(gross, bp);

      const lineCount = randInt(rnd, 0, 6);
      const lines = [];
      for (let j = 0; j < lineCount; j += 1) {
        // Expense lines are drawn generously so some cases deliberately push
        // net payout negative — that is a legal state, not an error.
        lines.push(randInt(rnd, 0, Math.max(1, Math.floor(gross / 4))));
      }
      const expensesTotal = lines.reduce((sum, n) => sum + n, 0);

      const net = netPayoutPaisa(gross, commission, expensesTotal);

      if (gross !== commission + expensesTotal + net) {
        failures.push({ i, weightG, ratePaisaPerKg, bp, gross, commission, expensesTotal, net });
      }

      expect(Number.isSafeInteger(gross)).toBe(true);
      expect(Number.isSafeInteger(commission)).toBe(true);
      expect(Number.isSafeInteger(net)).toBe(true);
      expect(gross).toBeGreaterThanOrEqual(0);
      expect(commission).toBeGreaterThanOrEqual(0);
      expect(commission).toBeLessThanOrEqual(gross);
    }

    expect(failures).toEqual([]);
  });

  it('holds when expenses swallow the whole sale', () => {
    const gross = grossPaisa(1000, 45251);
    const commission = commissionPaisa(gross, 625);
    const expensesTotal = gross * 3;
    const net = netPayoutPaisa(gross, commission, expensesTotal);

    expect(net).toBeLessThan(0);
    expect(gross).toBe(commission + expensesTotal + net);
  });
});

describe('grossPaisa', () => {
  it('is exact when the half-kg lands on a whole paisa', () => {
    // 0.5 kg at Rs. 437.50/kg = Rs. 218.75 exactly, no remainder.
    expect(grossPaisa(500, 43750)).toBe(21875);
    expect(grossPaisa(1500, 43750)).toBe(65625);
  });

  it('rounds half-up on the 0.5 kg odd-rate case that breaks float math', () => {
    // 500 g x 45251 paisa = 22,625.5 paisa. Half-up -> 22,626.
    expect(grossPaisa(500, 45251)).toBe(22626);
    // 500 g x 45253 paisa = 22,626.5 paisa. Half-up -> 22,627.
    expect(grossPaisa(500, 45253)).toBe(22627);
    // Smallest possible tie: 0.5 kg at 1 paisa/kg = 0.5 paisa -> 1.
    expect(grossPaisa(500, 1)).toBe(1);
  });

  it('rounds down below the halfway point', () => {
    // 400 g x 1 paisa = 0.4 paisa -> 0.
    expect(grossPaisa(400, 1)).toBe(0);
    // 499 g x 1 paisa = 0.499 paisa -> 0.
    expect(grossPaisa(499, 1)).toBe(0);
  });

  it('handles the largest realistic sale without precision loss', () => {
    // 500 kg at Rs. 5000/kg = Rs. 25,00,000.
    expect(grossPaisa(500_000, 500_000)).toBe(250_000_000);
  });

  it('rejects negatives and non-integers', () => {
    expect(() => grossPaisa(-1, 100)).toThrow(RangeError);
    expect(() => grossPaisa(100, -1)).toThrow(RangeError);
    expect(() => grossPaisa(12.5, 100)).toThrow(TypeError);
    expect(() => grossPaisa('500', 100)).toThrow(TypeError);
  });
});

describe('commissionPaisa', () => {
  it('computes the standard 6.25% arhti commission', () => {
    expect(commissionPaisa(10_000_000, 625)).toBe(625_000);
    expect(commissionPaisa(22626, 625)).toBe(1414); // 1414.125 -> 1414
  });

  it('rounds half-up on an exact tie', () => {
    // 8 x 625 / 10000 = 0.5 -> 1
    expect(commissionPaisa(8, 625)).toBe(1);
    // 24 x 625 / 10000 = 1.5 -> 2
    expect(commissionPaisa(24, 625)).toBe(2);
  });

  it('handles the zero-commission case', () => {
    expect(commissionPaisa(999_999, 0)).toBe(0);
  });
});

describe('formatPKR', () => {
  it('uses Pakistani digit grouping', () => {
    expect(formatPKR(0)).toBe('Rs. 0.00');
    expect(formatPKR(1)).toBe('Rs. 0.01');
    expect(formatPKR(100)).toBe('Rs. 1.00');
    expect(formatPKR(100_000)).toBe('Rs. 1,000.00');
    expect(formatPKR(10_000_000)).toBe('Rs. 1,00,000.00');
    expect(formatPKR(12_500_000)).toBe('Rs. 1,25,000.00');
    expect(formatPKR(123_456_789)).toBe('Rs. 12,34,567.89');
  });

  it('prefixes negatives with a minus sign', () => {
    expect(formatPKR(-12_500_000)).toBe('-Rs. 1,25,000.00');
    expect(formatPKR(-1)).toBe('-Rs. 0.01');
  });

  it('rejects a float', () => {
    expect(() => formatPKR(1.5)).toThrow(TypeError);
  });
});

describe('parsePKR', () => {
  it('reads grouped, prefixed and bare amounts', () => {
    expect(parsePKR('Rs. 1,25,000.00')).toBe(12_500_000);
    expect(parsePKR('125000')).toBe(12_500_000);
    expect(parsePKR('0.01')).toBe(1);
    expect(parsePKR('  Rs.1,000  ')).toBe(100_000);
    expect(parsePKR('1,000 روپے')).toBe(100_000);
    expect(parsePKR('-1,000.00')).toBe(-100_000);
  });

  it('throws on garbage', () => {
    expect(() => parsePKR('')).toThrow(SyntaxError);
    expect(() => parsePKR('   ')).toThrow(SyntaxError);
    expect(() => parsePKR('abc')).toThrow(SyntaxError);
    expect(() => parsePKR('12.345')).toThrow(SyntaxError); // sub-paisa precision
    expect(() => parsePKR('1.2.3')).toThrow(SyntaxError);
    expect(() => parsePKR('--5')).toThrow(SyntaxError);
    expect(() => parsePKR('1e5')).toThrow(SyntaxError);
    expect(() => parsePKR(125000)).toThrow(TypeError);
    expect(() => parsePKR(null)).toThrow(TypeError);
  });
});

describe('format / parse round-trip', () => {
  it.each([0, 1, 12_500_000])('survives %i paisa unchanged', (paisa) => {
    expect(parsePKR(formatPKR(paisa))).toBe(paisa);
  });

  it('survives negatives and a spread of magnitudes', () => {
    for (const paisa of [-12_500_000, -1, 99, 100, 123_456_789, 250_000_000]) {
      expect(parsePKR(formatPKR(paisa))).toBe(paisa);
    }
  });
});

describe('parseWeightKg', () => {
  it('converts kilograms to integer grams', () => {
    expect(parseWeightKg('12.5')).toBe(12_500);
    expect(parseWeightKg('0.5')).toBe(500);
    expect(parseWeightKg('500')).toBe(500_000);
    expect(parseWeightKg('0.001')).toBe(1);
    expect(parseWeightKg('12.5 kg')).toBe(12_500);
  });

  it('throws below gram precision or on a negative weight', () => {
    expect(() => parseWeightKg('12.0005')).toThrow(SyntaxError);
    expect(() => parseWeightKg('-5')).toThrow(RangeError);
    expect(() => parseWeightKg('')).toThrow(SyntaxError);
  });
});

describe('parseRate', () => {
  it('converts rupees per kg to integer paisa per kg', () => {
    expect(parseRate('437.50')).toBe(43_750);
    expect(parseRate('437.5')).toBe(43_750);
    expect(parseRate('1')).toBe(100);
    expect(parseRate('Rs. 5,000.00')).toBe(500_000);
  });

  it('throws below paisa precision or on a negative rate', () => {
    expect(() => parseRate('437.505')).toThrow(SyntaxError);
    expect(() => parseRate('-437.50')).toThrow(RangeError);
  });
});

describe('the 0.5 kg pipeline end to end', () => {
  it('reconciles a typed half-kilo sale at an odd rate', () => {
    const weightG = parseWeightKg('0.5');
    const rate = parseRate('452.51');
    expect(weightG).toBe(500);
    expect(rate).toBe(45_251);

    const gross = grossPaisa(weightG, rate); // 22,625.5 -> 22,626
    const commission = commissionPaisa(gross, 625); // 1,414.125 -> 1,414
    const expensesTotal = parsePKR('50.00');
    const net = netPayoutPaisa(gross, commission, expensesTotal);

    expect(gross).toBe(22_626);
    expect(commission).toBe(1_414);
    expect(expensesTotal).toBe(5_000);
    expect(net).toBe(16_212);
    expect(gross).toBe(commission + expensesTotal + net);
    expect(formatPKR(net)).toBe('Rs. 162.12');
  });
});

// ---------------------------------------------------------------------------
// Migration guard: integer paisa fixtures vs. the old float fixtures.
//
// HEADLINE RESULT: khareedar balances are bit-identical. Four beopari balances
// move, by 87, 50, 25 and 50 paisa. That is not drift — the old code computed
// commission as Math.round(gross * 0.0625) with gross in whole RUPEES, so it
// rounded commission to the rupee. The new code rounds to the paisa. Every
// paisa of the difference is attributable to that one change, and the tests
// below prove it two ways: derived from the per-sale commission deltas, and
// pinned against a fixed table so a future regression is loud.
// ---------------------------------------------------------------------------
describe('migration from float fixtures to integer paisa', () => {
  // Frozen copy of the pre-migration fixtures (git 12d47a7), in rupees and kg.
  // Do NOT update these when mockData.js changes — their entire job is to be
  // the old truth to measure against.
  const OLD_OPENING = { p1: -45000, p2: 12000, p3: -78000, p4: 0, p5: 95000, p6: 34000, p7: -15000, p8: 152000 };

  const OLD_SALES = [
    { beopariId: 'p1', khareedarId: 'p5', weight: 220, rate: 450, expenses: [1500, 2000] },
    { beopariId: 'p3', khareedarId: 'p6', weight: 60, rate: 900, expenses: [800, 3000] },
    { beopariId: 'p2', khareedarId: 'p8', weight: 180, rate: 520, expenses: [1800] },
    { beopariId: 'p1', khareedarId: 'p7', weight: 140, rate: 300, expenses: [1000, 5000] },
    { beopariId: 'p4', khareedarId: 'p5', weight: 300, rate: 260, expenses: [4500, 2500] },
    { beopariId: 'p3', khareedarId: 'p8', weight: 250, rate: 470, expenses: [2000] },
    { beopariId: 'p2', khareedarId: 'p6', weight: 160, rate: 440, expenses: [1200, 1500] },
    { beopariId: 'p1', khareedarId: 'p8', weight: 85, rate: 850, expenses: [900, 2800] },
    { beopariId: 'p4', khareedarId: 'p7', weight: 120, rate: 500, expenses: [1600] },
    { beopariId: 'p3', khareedarId: 'p5', weight: 200, rate: 510, expenses: [1800, 3500] },
    { beopariId: 'p1', khareedarId: 'p6', weight: 100, rate: 320, expenses: [700] },
    { beopariId: 'p2', khareedarId: 'p8', weight: 280, rate: 255, expenses: [2200, 500] },
    { beopariId: 'p4', khareedarId: 'p5', weight: 190, rate: 460, expenses: [1400, 1900] },
    { beopariId: 'p1', khareedarId: 'p7', weight: 45, rate: 880, expenses: [600] },
  ];

  const OLD_CASH = [
    { partyId: 'p5', direction: 'wasooli', amount: 99000 },
    { partyId: 'p1', direction: 'payment', amount: 92375 },
    { partyId: 'p6', direction: 'wasooli', amount: 54000 },
    { partyId: 'p3', direction: 'payment', amount: 46575 },
    { partyId: 'p5', direction: 'wasooli', amount: 39000 },
    { partyId: 'p8', direction: 'wasooli', amount: 93600 },
    { partyId: 'p7', direction: 'wasooli', amount: 42000 },
    { partyId: 'p4', direction: 'payment', amount: 51900 },
    { partyId: 'p5', direction: 'wasooli', amount: 51000 },
    { partyId: 'p2', direction: 'payment', amount: 60000 },
  ];

  // The old money maths, reproduced exactly: floats, rupees, Math.round.
  function oldBalancesInPaisa() {
    const bal = { ...OLD_OPENING };
    for (const s of OLD_SALES) {
      const gross = s.weight * s.rate;
      const commission = Math.round(gross * 0.0625);
      const totalExpenses = s.expenses.reduce((a, b) => a + b, 0);
      bal[s.khareedarId] += gross;
      bal[s.beopariId] -= gross - commission - totalExpenses;
    }
    for (const c of OLD_CASH) {
      bal[c.partyId] += c.direction === 'wasooli' ? -c.amount : c.amount;
    }
    return Object.fromEntries(Object.entries(bal).map(([id, rupees]) => [id, rupees * 100]));
  }

  const newBalance = (party) => computePartyBalance(party, initialSales, initialCashEntries);
  const partyOf = (id) => initialParties.find((p) => p.id === id);

  it('leaves every khareedar balance bit-identical', () => {
    const old = oldBalancesInPaisa();
    for (const party of initialParties) {
      if (party.type !== 'khareedar' || !(party.id in old)) continue;
      expect(newBalance(party)).toBe(old[party.id]);
    }
  });

  it('moves beopari balances by exactly the commission rounding, nothing else', () => {
    const old = oldBalancesInPaisa();
    for (const party of initialParties) {
      if (party.type !== 'beopari') continue;
      const mine = OLD_SALES.filter((s) => s.beopariId === party.id);

      // A beopari is credited the net payout, so a smaller commission means a
      // larger payout and a lower balance. The whole delta is the difference
      // between rupee-rounded and paisa-rounded commission.
      const expectedDelta = mine.reduce((sum, s) => {
        const oldCommission = Math.round(s.weight * s.rate * 0.0625) * 100;
        const newCommission = commissionPaisa(grossPaisa(s.weight * 1000, s.rate * 100), 625);
        return sum + (newCommission - oldCommission);
      }, 0);

      expect(newBalance(party)).toBe(old[party.id] + expectedDelta);
      // Never more than a rupee adrift per sale — that is the old rounding
      // granularity, and it bounds the entire blast radius of the migration.
      expect(Math.abs(expectedDelta)).toBeLessThan(100 * mine.length);
    }
  });

  it('matches the measured per-party deltas exactly', () => {
    // Pinned so an accidental change to a fixture literal cannot pass silently.
    const EXPECTED_DELTA_PAISA = { p1: -87, p2: -50, p3: -25, p4: -50, p5: 0, p6: 0, p7: 0, p8: 0 };
    const old = oldBalancesInPaisa();
    for (const [id, delta] of Object.entries(EXPECTED_DELTA_PAISA)) {
      expect(newBalance(partyOf(id)) - old[id]).toBe(delta);
    }
  });

  it('keeps every stored amount and weight an integer', () => {
    const MONEY_FIELDS = [
      'weightG', 'ratePaisaPerKg', 'commissionBp', 'grossPaisa',
      'commissionPaisa', 'expensesTotalPaisa', 'netPayoutPaisa', 'receivedPaisa',
    ];
    for (const p of initialParties) expect(Number.isInteger(p.openingPaisa)).toBe(true);
    for (const s of initialSales) {
      for (const field of MONEY_FIELDS) expect(Number.isInteger(s[field])).toBe(true);
      for (const e of s.expenses) expect(Number.isInteger(e.amountPaisa)).toBe(true);
      // The identity from CLAUDE.md, on every fixture row including contras.
      expect(s.grossPaisa).toBe(s.commissionPaisa + s.expensesTotalPaisa + s.netPayoutPaisa);
    }
    for (const c of initialCashEntries) expect(Number.isInteger(c.amountPaisa)).toBe(true);
  });
});

describe('void and merge fixtures', () => {
  it('carries a party merged into another', () => {
    const merged = initialParties.filter((p) => p.mergedInto);
    expect(merged).toHaveLength(1);
    const target = initialParties.find((p) => p.id === merged[0].mergedInto);
    expect(target).toBeDefined();
    expect(target.mergedInto).toBeNull(); // no merge chains
    // Inert by construction: nothing is stranded behind the unimplemented merge.
    expect(merged[0].openingPaisa).toBe(0);
    expect(initialSales.some((s) => s.beopariId === merged[0].id || s.khareedarId === merged[0].id)).toBe(false);
    expect(initialCashEntries.some((c) => c.partyId === merged[0].id)).toBe(false);
  });

  it('represents a void as a reversing contra row, not a deletion', () => {
    const contras = initialSales.filter((s) => s.voidsId);
    expect(contras).toHaveLength(1);
    const contra = contras[0];
    const original = initialSales.find((s) => s.id === contra.voidsId);

    expect(original).toBeDefined();
    expect(original.voidedBy).toBe(contra.id);
    expect(contra.grossPaisa).toBe(-original.grossPaisa);
    expect(contra.commissionPaisa).toBe(-original.commissionPaisa);
    expect(contra.netPayoutPaisa).toBe(-original.netPayoutPaisa);
    expect(contra.weightG).toBe(-original.weightG);
    // Same parties, so the pair cancels on both sides of the khata.
    expect(contra.beopariId).toBe(original.beopariId);
    expect(contra.khareedarId).toBe(original.khareedarId);
  });

  it('nets the voided pair to zero in both party balances', () => {
    const contra = initialSales.find((s) => s.voidsId);
    const original = initialSales.find((s) => s.id === contra.voidsId);
    const pair = [original, contra];

    for (const id of [original.beopariId, original.khareedarId]) {
      const party = initialParties.find((p) => p.id === id);
      const withPair = computePartyBalance(party, initialSales, initialCashEntries);
      const withoutPair = computePartyBalance(
        party,
        initialSales.filter((s) => !pair.includes(s)),
        initialCashEntries
      );
      expect(withPair).toBe(withoutPair);
    }
  });
});
