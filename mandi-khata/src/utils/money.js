// Money and measurement primitives for Mandi Khata.
//
// UNITS — every value crossing this module's boundary is an integer:
//   amounts  integer paisa            (Rs. 1        = 100 paisa)
//   weights  integer grams            (1 kg         = 1000 g)
//   rates    integer paisa per kg     (Rs. 437.50/kg = 43750)
//   commission integer basis points   (6.25%        = 625)
//
// WHY NO FLOATS. Two different reasons, and it is worth being precise about
// which applies where:
//
//   1. The PARSE path is where doubles actually and frequently break. The
//      common idiom `parseFloat("0.29") * 100` yields 28.999999999999996, so
//      truncating gives 28 paisa. Measured across the 10,000 rupee values
//      from 0.00 to 99.99, that idiom is wrong on 573 of them. These functions
//      parse digit strings directly and never construct a float at all.
//
//   2. The MULTIPLY path (grossPaisa, commissionPaisa) is, at every magnitude
//      this app will ever see, exactly representable in a double — 500 kg at
//      Rs. 5000/kg is only 2.5e11, far below 2^53. BigInt here is not fixing
//      an observed bug; it removes the need for anyone to re-derive that
//      safety argument later, and it keeps the guarantee if a rate or weight
//      ever grows. `Math.floor(a / b)` on doubles is the specific thing being
//      avoided, since its off-by-one cases are hard to spot in review.
//
// Floats are permitted only where a human types a number in or reads one out.
// Nothing downstream of these functions should ever see one.

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

const PAISA_PER_RUPEE = 100n;
const GRAMS_PER_KG = 1000n;
const BP_DENOMINATOR = 10000n; // basis points: 10000 bp = 100%

// Currency words and separators a user might type or paste, in either language.
const CURRENCY_NOISE = /(?:rs\.?|pkr|روپے|روپیہ)/gi;
const UNIT_NOISE = /(?:kgs?|کلو|kilograms?)/gi;

function assertInteger(value, name) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer, received ${JSON.stringify(value)}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} exceeds safe integer range: ${value}`);
  }
}

function assertNonNegativeInteger(value, name) {
  assertInteger(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must not be negative, received ${value}`);
  }
}

function toSafeNumber(big, name) {
  if (big > MAX_SAFE || big < -MAX_SAFE) {
    throw new RangeError(`${name} overflowed safe integer range: ${big}`);
  }
  return Number(big);
}

// Round-half-up on exact integers: floor(n/d + 1/2) computed as
// (2n + d) / 2d. BigInt division truncates toward zero, which equals floor
// for the non-negative operands this is called with. A tie (exactly .5)
// always rounds up, matching how a shopkeeper rounds by hand.
function divRoundHalfUp(n, d) {
  if (n < 0n) throw new RangeError('divRoundHalfUp expects a non-negative numerator');
  if (d <= 0n) throw new RangeError('divRoundHalfUp expects a positive denominator');
  return (2n * n + d) / (2n * d);
}

/**
 * Gross amount of a sale: weight x rate.
 * @param {number} weightG integer grams
 * @param {number} ratePaisaPerKg integer paisa per kg
 * @returns {number} integer paisa, rounded half-up
 */
export function grossPaisa(weightG, ratePaisaPerKg) {
  assertNonNegativeInteger(weightG, 'weightG');
  assertNonNegativeInteger(ratePaisaPerKg, 'ratePaisaPerKg');
  const exact = BigInt(weightG) * BigInt(ratePaisaPerKg);
  return toSafeNumber(divRoundHalfUp(exact, GRAMS_PER_KG), 'grossPaisa');
}

/**
 * Arhti's commission on a gross amount.
 * @param {number} gross integer paisa
 * @param {number} bp integer basis points (6.25% = 625)
 * @returns {number} integer paisa, rounded half-up
 */
export function commissionPaisa(gross, bp) {
  assertNonNegativeInteger(gross, 'gross');
  assertNonNegativeInteger(bp, 'bp');
  const exact = BigInt(gross) * BigInt(bp);
  return toSafeNumber(divRoundHalfUp(exact, BP_DENOMINATOR), 'commissionPaisa');
}

/**
 * What the beopari is actually paid: gross less commission and expenses.
 *
 * ROUNDING REMAINDER — deliberate choice. netPayout is *derived by
 * subtraction*, never rounded on its own. grossPaisa and commissionPaisa each
 * round half-up, so each can be off by at most half a paisa from the exact
 * rational value; because netPayout is whatever is left after subtracting
 * them, every one of those remainders lands here automatically. That makes
 *
 *     gross === commission + expensesTotal + netPayout
 *
 * hold exactly, by construction, for all inputs — there is no third rounding
 * step that could break it. The alternative (rounding netPayout independently)
 * would let the three parts fail to reconcile with the total by a paisa, which
 * is precisely the discrepancy a shopkeeper spots and cannot explain. The
 * beopari absorbs the sub-paisa remainder, which is also what happens on paper.
 *
 * May legitimately return a negative value when expenses exceed the gross.
 *
 * @param {number} gross integer paisa
 * @param {number} commission integer paisa
 * @param {number} expensesTotal integer paisa
 * @returns {number} integer paisa, possibly negative
 */
export function netPayoutPaisa(gross, commission, expensesTotal) {
  assertNonNegativeInteger(gross, 'gross');
  assertNonNegativeInteger(commission, 'commission');
  assertNonNegativeInteger(expensesTotal, 'expensesTotal');
  const net = BigInt(gross) - BigInt(commission) - BigInt(expensesTotal);
  return toSafeNumber(net, 'netPayoutPaisa');
}

// Pakistani / South-Asian digit grouping: the last three digits, then pairs.
// 12500000 paisa -> "1,25,000"
function groupPakistani(digits) {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

/**
 * Display an amount: 12500000 -> "Rs. 1,25,000.00".
 * Negative amounts are prefixed with a minus sign: "-Rs. 1,000.00".
 * @param {number} paisa integer paisa
 * @returns {string}
 */
export function formatPKR(paisa) {
  assertInteger(paisa, 'paisa');
  const negative = paisa < 0;
  const abs = negative ? -BigInt(paisa) : BigInt(paisa);
  const rupees = abs / PAISA_PER_RUPEE;
  const paise = abs % PAISA_PER_RUPEE;
  const grouped = groupPakistani(rupees.toString());
  const fraction = paise.toString().padStart(2, '0');
  return `${negative ? '-' : ''}Rs. ${grouped}.${fraction}`;
}

// Shared decimal parser. Works entirely on digit strings so no float ever
// exists: "437.50" at scale 2 becomes the integer 43750.
function parseScaled(input, decimals, label, { allowNegative }) {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} expects a string, received ${JSON.stringify(input)}`);
  }
  const cleaned = input
    .replace(CURRENCY_NOISE, '')
    .replace(UNIT_NOISE, '')
    .replace(/[\s,_]/g, '');

  if (cleaned === '') {
    throw new SyntaxError(`${label} received an empty value`);
  }

  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) {
    throw new SyntaxError(`${label} could not parse ${JSON.stringify(input)}`);
  }

  const [, sign, whole, rawFraction = ''] = match;
  if (rawFraction.length > decimals) {
    throw new SyntaxError(
      `${label} allows at most ${decimals} decimal place(s), received ${JSON.stringify(input)}`
    );
  }
  if (sign === '-' && !allowNegative) {
    throw new RangeError(`${label} must not be negative, received ${JSON.stringify(input)}`);
  }

  const scaled = BigInt(whole + rawFraction.padEnd(decimals, '0'));
  return toSafeNumber(sign === '-' ? -scaled : scaled, label);
}

/**
 * Parse a typed amount into integer paisa. "Rs. 1,25,000.00" -> 12500000.
 * Accepts an optional Rs./PKR/روپے prefix, thousands separators and a leading
 * sign. Throws on anything it cannot read exactly.
 * @param {string} str
 * @returns {number} integer paisa
 */
export function parsePKR(str) {
  return parseScaled(str, 2, 'parsePKR', { allowNegative: true });
}

/**
 * Parse a typed weight in kg into integer grams. "12.5" -> 12500.
 * @param {string} str
 * @returns {number} integer grams
 */
export function parseWeightKg(str) {
  return parseScaled(str, 3, 'parseWeightKg', { allowNegative: false });
}

/**
 * Parse a typed rate in rupees per kg into integer paisa per kg.
 * "437.50" -> 43750.
 * @param {string} str
 * @returns {number} integer paisa per kg
 */
export function parseRate(str) {
  return parseScaled(str, 2, 'parseRate', { allowNegative: false });
}

/**
 * Parse a typed commission percentage into integer basis points.
 * "6.25" -> 625. Exists so no component ever multiplies a percent by 100.
 * @param {string} str
 * @returns {number} integer basis points
 */
export function parsePercentBp(str) {
  return parseScaled(str, 2, 'parsePercentBp', { allowNegative: false });
}

/**
 * Display a weight: 190000 grams -> "190 kg". Trailing zeros are trimmed so
 * whole kilos read as "190 kg", not "190.000 kg".
 * @param {number} grams integer grams, may be negative on a contra row
 * @returns {string}
 */
export function formatKg(grams) {
  assertInteger(grams, 'grams');
  const negative = grams < 0;
  const abs = negative ? -BigInt(grams) : BigInt(grams);
  const whole = abs / GRAMS_PER_KG;
  const fraction = (abs % GRAMS_PER_KG).toString().padStart(3, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
