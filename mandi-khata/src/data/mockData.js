import { daysAgoISO } from '../utils/format';

// ---- Parties ----
// balance convention: positive = Lena (receivable, they owe us),
// negative = Dena (payable, we owe them). openingBalance is the balance
// before any of the mock sales / cash entries below.
export const initialParties = [
  { id: 'p1', name: 'Haji Rafiq', nameUr: 'حاجی رفیق',          type: 'beopari',   phone: '0300-4571122', area: 'Ichhra', areaUr: 'اچھرہ',     openingBalance: -45000 },
  { id: 'p2', name: 'Malik Shafqat', nameUr: 'ملک شفقت',       type: 'beopari',   phone: '0321-8834455', area: 'Shadman', areaUr: 'شادمان',    openingBalance: 12000 },
  { id: 'p3', name: 'Chaudhry Aslam', nameUr: 'چوہدری اسلم',      type: 'beopari',   phone: '0333-2216677', area: 'Model Town', areaUr: 'ماڈل ٹاؤن', openingBalance: -78000 },
  { id: 'p4', name: 'Rana Waseem', nameUr: 'رانا وسیم',         type: 'beopari',   phone: '0345-9903311', area: 'Anarkali', areaUr: 'انارکلی',   openingBalance: 0 },
  { id: 'p5', name: 'Shahid Machli Wala', nameUr: 'شاہد مچھلی والا',  type: 'khareedar', phone: '0301-7712233', area: 'Ichhra', areaUr: 'اچھرہ',     openingBalance: 95000 },
  { id: 'p6', name: 'Akram Fish Corner', nameUr: 'اکرم فش کارنر',   type: 'khareedar', phone: '0322-5541199', area: 'Anarkali', areaUr: 'انارکلی',   openingBalance: 34000 },
  { id: 'p7', name: 'Bismillah Fish House', nameUr: 'بسم اللہ فش ہاؤس',type: 'khareedar', phone: '0334-8890044', area: 'Shadman', areaUr: 'شادمان',    openingBalance: -15000 },
  { id: 'p8', name: 'Karachi Sea Foods', nameUr: 'کراچی سی فوڈز',   type: 'khareedar', phone: '0346-1123388', area: 'Model Town', areaUr: 'ماڈل ٹاؤن', openingBalance: 152000 },
];

export const FISH_TYPES = ['Rohu', 'Thaila', 'Jhinga', 'Mori', 'Silver Carp'];
export const EXPENSE_TYPES = ['Baraf', 'Mazdoori', 'Kraya', 'Advance Cut', 'Other'];

// Helper to build a sale with derived amounts
let saleSeq = 1;
function sale(dayOffset, time, gaari, beopariId, khareedarId, fish, weight, rate, expenses, status) {
  const gross = weight * rate;
  const commission = Math.round(gross * 0.0625);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netPayout = gross - commission - totalExpenses;
  let receivedAmount = 0;
  if (status === 'Paid') receivedAmount = gross;
  else if (status === 'Partial') receivedAmount = Math.round(gross * 0.5);
  return {
    id: `s${saleSeq++}`,
    date: daysAgoISO(dayOffset),
    time,
    gaari,
    beopariId,
    khareedarId,
    fishType: fish,
    weight,
    rate,
    commissionPct: 6.25,
    expenses,
    gross,
    commission,
    totalExpenses,
    netPayout,
    status,
    receivedAmount,
  };
}

export const initialSales = [
  // 4 days ago
  sale(4, '06:15', 'LEB-4521', 'p1', 'p5', 'Rohu',        220, 450, [{ type: 'Baraf', amount: 1500 }, { type: 'Mazdoori', amount: 2000 }], 'Paid'),
  sale(4, '07:05', 'MNA-1187', 'p3', 'p6', 'Jhinga',       60, 900, [{ type: 'Baraf', amount: 800 }, { type: 'Kraya', amount: 3000 }], 'Paid'),
  sale(4, '08:40', 'LEC-7733', 'p2', 'p8', 'Thaila',      180, 520, [{ type: 'Mazdoori', amount: 1800 }], 'Paid'),
  // 3 days ago
  sale(3, '06:30', 'LEB-4521', 'p1', 'p7', 'Mori',        140, 300, [{ type: 'Baraf', amount: 1000 }, { type: 'Advance Cut', amount: 5000 }], 'Paid'),
  sale(3, '07:50', 'RIM-9902', 'p4', 'p5', 'Silver Carp', 300, 260, [{ type: 'Kraya', amount: 4500 }, { type: 'Mazdoori', amount: 2500 }], 'Partial'),
  sale(3, '09:10', 'MNA-1187', 'p3', 'p8', 'Rohu',        250, 470, [{ type: 'Baraf', amount: 2000 }], 'Paid'),
  // 2 days ago
  sale(2, '06:00', 'LEC-7733', 'p2', 'p6', 'Rohu',        160, 440, [{ type: 'Baraf', amount: 1200 }, { type: 'Mazdoori', amount: 1500 }], 'Partial'),
  sale(2, '07:25', 'LEB-8814', 'p1', 'p8', 'Jhinga',       85, 850, [{ type: 'Baraf', amount: 900 }, { type: 'Kraya', amount: 2800 }], 'Pending'),
  sale(2, '08:55', 'RIM-9902', 'p4', 'p7', 'Thaila',      120, 500, [{ type: 'Mazdoori', amount: 1600 }], 'Paid'),
  // yesterday
  sale(1, '06:20', 'MNA-1187', 'p3', 'p5', 'Thaila',      200, 510, [{ type: 'Baraf', amount: 1800 }, { type: 'Kraya', amount: 3500 }], 'Partial'),
  sale(1, '07:40', 'LEB-4521', 'p1', 'p6', 'Mori',        100, 320, [{ type: 'Baraf', amount: 700 }], 'Pending'),
  sale(1, '09:00', 'LEC-7733', 'p2', 'p8', 'Silver Carp', 280, 255, [{ type: 'Mazdoori', amount: 2200 }, { type: 'Other', amount: 500 }], 'Pending'),
  // today
  sale(0, '06:10', 'RIM-9902', 'p4', 'p5', 'Rohu',        190, 460, [{ type: 'Baraf', amount: 1400 }, { type: 'Mazdoori', amount: 1900 }], 'Pending'),
  sale(0, '07:30', 'LEB-8814', 'p1', 'p7', 'Jhinga',       45, 880, [{ type: 'Baraf', amount: 600 }], 'Pending'),
];

let cashSeq = 1;
function cash(dayOffset, time, partyId, direction, amount, note, noteUr) {
  return { id: `c${cashSeq++}`, date: daysAgoISO(dayOffset), time, partyId, direction, amount, note, noteUr };
}

// direction: 'wasooli' = cash received from party, 'payment' = cash paid out to party
export const initialCashEntries = [
  cash(4, '11:30', 'p5', 'wasooli', 99000,  'Rohu sale wasooli', 'روہو سیل کی وصولی'),
  cash(4, '12:15', 'p1', 'payment', 92375,  'Payout for gaari LEB-4521', 'گاڑی LEB-4521 کی ادائیگی'),
  cash(3, '10:45', 'p6', 'wasooli', 54000,  'Jhinga full payment', 'جھینگا مکمل ادائیگی'),
  cash(3, '13:00', 'p3', 'payment', 46575,  'Payout Jhinga lot', 'جھینگا لاٹ کی ادائیگی'),
  cash(2, '11:00', 'p5', 'wasooli', 39000,  'Partial against Silver Carp', 'سلور کارپ کے خلاف جزوی'),
  cash(2, '12:30', 'p8', 'wasooli', 93600,  'Thaila lot cleared', 'تھیلا لاٹ کلیئر'),
  cash(1, '10:15', 'p7', 'wasooli', 42000,  'Mori bill', 'موری کا بل'),
  cash(1, '12:00', 'p4', 'payment', 51900,  'Payout Thaila gaari RIM-9902', 'تھیلا گاڑی RIM-9902 کی ادائیگی'),
  cash(0, '09:45', 'p5', 'wasooli', 51000,  'Thaila partial wasooli', 'تھیلا جزوی وصولی'),
  cash(0, '10:30', 'p2', 'payment', 60000,  'Advance payout', 'ایڈوانس ادائیگی'),
];
