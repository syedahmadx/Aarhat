import { daysAgoISO } from '../utils/format';
import { grossPaisa, commissionPaisa, netPayoutPaisa } from '../utils/money';

// UNITS — everything stored here is an integer (see CLAUDE.md):
//   *Paisa fields  integer paisa        (Rs. 1,500 = 150_000)
//   weightG        integer grams        (220 kg    = 220_000)
//   ratePaisaPerKg integer paisa per kg (Rs. 450   = 45_000)
//   commissionBp   integer basis points (6.25%     = 625)

// The one and only commission rate in the fixtures. All commission maths in
// the codebase goes through commissionPaisa() in utils/money.js.
const COMMISSION_BP = 625; // 6.25%
const HALF_BP = 5000; // 50%, reused to derive a Partial sale's received amount

// ---- Parties ----
// balance convention: positive = Lena (receivable, they owe us),
// negative = Dena (payable, we owe them). openingPaisa is the balance
// before any of the mock sales / cash entries below.
export const initialParties = [
  { id: 'p1', name: 'Haji Rafiq',          nameUr: 'حاجی رفیق',        type: 'beopari',   phone: '0300-4571122', area: 'Ichhra',     areaUr: 'اچھرہ',     openingPaisa:  -4_500_000, merged_into: null },
  { id: 'p2', name: 'Malik Shafqat',       nameUr: 'ملک شفقت',         type: 'beopari',   phone: '0321-8834455', area: 'Shadman',    areaUr: 'شادمان',    openingPaisa:   1_200_000, merged_into: null },
  { id: 'p3', name: 'Chaudhry Aslam',      nameUr: 'چوہدری اسلم',      type: 'beopari',   phone: '0333-2216677', area: 'Model Town', areaUr: 'ماڈل ٹاؤن', openingPaisa:  -7_800_000, merged_into: null },
  { id: 'p4', name: 'Rana Waseem',         nameUr: 'رانا وسیم',        type: 'beopari',   phone: '0345-9903311', area: 'Anarkali',   areaUr: 'انارکلی',   openingPaisa:           0, merged_into: null },
  { id: 'p5', name: 'Shahid Machli Wala',  nameUr: 'شاہد مچھلی والا',  type: 'khareedar', phone: '0301-7712233', area: 'Ichhra',     areaUr: 'اچھرہ',     openingPaisa:   9_500_000, merged_into: null },
  { id: 'p6', name: 'Akram Fish Corner',   nameUr: 'اکرم فش کارنر',    type: 'khareedar', phone: '0322-5541199', area: 'Anarkali',   areaUr: 'انارکلی',   openingPaisa:   3_400_000, merged_into: null },
  { id: 'p7', name: 'Bismillah Fish House',nameUr: 'بسم اللہ فش ہاؤس', type: 'khareedar', phone: '0334-8890044', area: 'Shadman',    areaUr: 'شادمان',    openingPaisa:  -1_500_000, merged_into: null },
  { id: 'p8', name: 'Karachi Sea Foods',   nameUr: 'کراچی سی فوڈز',    type: 'khareedar', phone: '0346-1123388', area: 'Model Town', areaUr: 'ماڈل ٹاؤن', openingPaisa:  15_200_000, merged_into: null },

  // FIXTURE — a duplicate party, merged into p6. Two munshis typing the same
  // khareedar slightly differently is the single most common data-entry fault
  // in this trade. Parties are merged, never deleted (CLAUDE.md), so the row
  // survives with a pointer at its survivor.
  //
  // It is deliberately inert: zero opening balance and no sales or cash
  // entries reference it, so no money is stranded behind a merge that the
  // context does not yet resolve. Merge resolution (folding a merged party's
  // entries into its target) is NOT implemented — see the note in AppContext.
  { id: 'p9', name: 'Akram Fish',          nameUr: 'اکرم فش',          type: 'khareedar', phone: '0322-5541199', area: 'Anarkali',   areaUr: 'انارکلی',   openingPaisa:           0, merged_into: 'p6' },
];

export const FISH_TYPES = ['Rohu', 'Thaila', 'Jhinga', 'Mori', 'Silver Carp'];
export const EXPENSE_TYPES = ['Baraf', 'Mazdoori', 'Kraya', 'Advance Cut', 'Other'];

// Builds a sale with every derived amount coming from utils/money.js.
let saleSeq = 1;
function sale(dayOffset, time, gaari, beopariId, khareedarId, fish, weightG, ratePaisaPerKg, expenses, status) {
  const gross = grossPaisa(weightG, ratePaisaPerKg);
  const commission = commissionPaisa(gross, COMMISSION_BP);
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amountPaisa, 0);

  let receivedPaisa = 0;
  if (status === 'Paid') receivedPaisa = gross;
  // A Partial sale is modelled as half paid. Expressed in basis points so it
  // rounds through the same half-up path as everything else — no Math.round.
  else if (status === 'Partial') receivedPaisa = commissionPaisa(gross, HALF_BP);

  return {
    id: `s${saleSeq++}`,
    date: daysAgoISO(dayOffset),
    time,
    gaari,
    beopariId,
    khareedarId,
    fishType: fish,
    weightG,
    ratePaisaPerKg,
    commissionBp: COMMISSION_BP,
    expenses,
    grossPaisa: gross,
    commissionPaisa: commission,
    expensesTotalPaisa: expensesTotal,
    netPayoutPaisa: netPayoutPaisa(gross, commission, expensesTotal),
    status,
    receivedPaisa,
    voids_id: null,  // set on a contra row, points at the sale it reverses
    voided_by: null, // set on an original, points at the contra that voided it
  };
}

// A void never deletes. It posts a mirror-image row dated the day of the void;
// the original stays visible and struck through. Every amount is negated, so
// the pair sums to zero in any balance or report that simply adds rows up.
function contraSale(original, dayOffset, time) {
  return {
    ...original,
    id: `s${saleSeq++}`,
    date: daysAgoISO(dayOffset),
    time,
    weightG: -original.weightG,
    expenses: original.expenses.map((e) => ({ ...e, amountPaisa: -e.amountPaisa })),
    grossPaisa: -original.grossPaisa,
    commissionPaisa: -original.commissionPaisa,
    expensesTotalPaisa: -original.expensesTotalPaisa,
    netPayoutPaisa: -original.netPayoutPaisa,
    receivedPaisa: -original.receivedPaisa,
    voids_id: original.id,
    voided_by: null,
  };
}

const baseSales = [
  // 4 days ago
  sale(4, '06:15', 'LEB-4521', 'p1', 'p5', 'Rohu',        220_000, 45_000, [{ type: 'Baraf', amountPaisa: 150_000 }, { type: 'Mazdoori', amountPaisa: 200_000 }], 'Paid'),
  sale(4, '07:05', 'MNA-1187', 'p3', 'p6', 'Jhinga',       60_000, 90_000, [{ type: 'Baraf', amountPaisa:  80_000 }, { type: 'Kraya',    amountPaisa: 300_000 }], 'Paid'),
  sale(4, '08:40', 'LEC-7733', 'p2', 'p8', 'Thaila',      180_000, 52_000, [{ type: 'Mazdoori', amountPaisa: 180_000 }], 'Paid'),
  // 3 days ago
  sale(3, '06:30', 'LEB-4521', 'p1', 'p7', 'Mori',        140_000, 30_000, [{ type: 'Baraf', amountPaisa: 100_000 }, { type: 'Advance Cut', amountPaisa: 500_000 }], 'Paid'),
  sale(3, '07:50', 'RIM-9902', 'p4', 'p5', 'Silver Carp', 300_000, 26_000, [{ type: 'Kraya', amountPaisa: 450_000 }, { type: 'Mazdoori',    amountPaisa: 250_000 }], 'Partial'),
  sale(3, '09:10', 'MNA-1187', 'p3', 'p8', 'Rohu',        250_000, 47_000, [{ type: 'Baraf', amountPaisa: 200_000 }], 'Paid'),
  // 2 days ago
  sale(2, '06:00', 'LEC-7733', 'p2', 'p6', 'Rohu',        160_000, 44_000, [{ type: 'Baraf', amountPaisa: 120_000 }, { type: 'Mazdoori', amountPaisa: 150_000 }], 'Partial'),
  sale(2, '07:25', 'LEB-8814', 'p1', 'p8', 'Jhinga',       85_000, 85_000, [{ type: 'Baraf', amountPaisa:  90_000 }, { type: 'Kraya',    amountPaisa: 280_000 }], 'Pending'),
  sale(2, '08:55', 'RIM-9902', 'p4', 'p7', 'Thaila',      120_000, 50_000, [{ type: 'Mazdoori', amountPaisa: 160_000 }], 'Paid'),
  // yesterday
  sale(1, '06:20', 'MNA-1187', 'p3', 'p5', 'Thaila',      200_000, 51_000, [{ type: 'Baraf', amountPaisa: 180_000 }, { type: 'Kraya', amountPaisa: 350_000 }], 'Partial'),
  sale(1, '07:40', 'LEB-4521', 'p1', 'p6', 'Mori',        100_000, 32_000, [{ type: 'Baraf', amountPaisa:  70_000 }], 'Pending'),
  sale(1, '09:00', 'LEC-7733', 'p2', 'p8', 'Silver Carp', 280_000, 25_500, [{ type: 'Mazdoori', amountPaisa: 220_000 }, { type: 'Other', amountPaisa: 50_000 }], 'Pending'),
  // today
  sale(0, '06:10', 'RIM-9902', 'p4', 'p5', 'Rohu',        190_000, 46_000, [{ type: 'Baraf', amountPaisa: 140_000 }, { type: 'Mazdoori', amountPaisa: 190_000 }], 'Pending'),
  sale(0, '07:30', 'LEB-8814', 'p1', 'p7', 'Jhinga',       45_000, 88_000, [{ type: 'Baraf', amountPaisa:  60_000 }], 'Pending'),
];

// FIXTURE — a voided sale. The wrong khareedar was written on the parchi, so
// the sale was reversed the same morning. Both rows stay in the day book.
const voidedSale = sale(0, '08:15', 'LEC-7733', 'p2', 'p6', 'Mori', 80_000, 34_000, [{ type: 'Baraf', amountPaisa: 50_000 }], 'Pending');
const voidingContra = contraSale(voidedSale, 0, '08:20');
voidedSale.voided_by = voidingContra.id;

export const initialSales = [...baseSales, voidedSale, voidingContra];

let cashSeq = 1;
function cash(dayOffset, time, partyId, direction, amountPaisa, note, noteUr) {
  return {
    id: `c${cashSeq++}`,
    date: daysAgoISO(dayOffset),
    time,
    partyId,
    direction,
    amountPaisa,
    note,
    noteUr,
    voids_id: null,
    voided_by: null,
  };
}

// direction: 'wasooli' = cash received from party, 'payment' = cash paid out to party
export const initialCashEntries = [
  cash(4, '11:30', 'p5', 'wasooli', 9_900_000, 'Rohu sale wasooli',            'روہو سیل کی وصولی'),
  cash(4, '12:15', 'p1', 'payment', 9_237_500, 'Payout for gaari LEB-4521',    'گاڑی LEB-4521 کی ادائیگی'),
  cash(3, '10:45', 'p6', 'wasooli', 5_400_000, 'Jhinga full payment',          'جھینگا مکمل ادائیگی'),
  cash(3, '13:00', 'p3', 'payment', 4_657_500, 'Payout Jhinga lot',            'جھینگا لاٹ کی ادائیگی'),
  cash(2, '11:00', 'p5', 'wasooli', 3_900_000, 'Partial against Silver Carp',  'سلور کارپ کے خلاف جزوی'),
  cash(2, '12:30', 'p8', 'wasooli', 9_360_000, 'Thaila lot cleared',           'تھیلا لاٹ کلیئر'),
  cash(1, '10:15', 'p7', 'wasooli', 4_200_000, 'Mori bill',                    'موری کا بل'),
  cash(1, '12:00', 'p4', 'payment', 5_190_000, 'Payout Thaila gaari RIM-9902', 'تھیلا گاڑی RIM-9902 کی ادائیگی'),
  cash(0, '09:45', 'p5', 'wasooli', 5_100_000, 'Thaila partial wasooli',       'تھیلا جزوی وصولی'),
  cash(0, '10:30', 'p2', 'payment', 6_000_000, 'Advance payout',               'ایڈوانس ادائیگی'),
];
