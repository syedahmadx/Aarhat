import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useLang } from '../../i18n/LanguageContext';
import { isVoidRow } from '../../data/ledgerMath';

// The two ledger charts, shared by Dashboard (fixed 7/14-day windows) and
// Reports (its date-range picker). Rows come in as the app's camelCase shape
// with integer-paisa amounts; a voided pair nets to zero, so both halves are
// dropped rather than plotted cancelling each other.
//
// Loading and error are handled by DataState, which gates every screen these
// render on; the empty state is per-chart because "no sales this week" and
// "no cash movement this week" are independent facts.
//
// Accessibility: series are distinguished by label (legend + tooltip) and by
// line dash pattern, never by colour alone. Animation is off — the numbers
// ARE the content.

const TEAL = '#296a73';   // primary-600
const AMBER = '#b45309';  // amber-700, WCAG AA on white

const live = (r) => !isVoidRow(r);
const inRange = (iso, from, to) => iso >= from && iso <= to;

// Paisa -> compact rupee tick: 2,50,00,000 paisa (2.5 lakh Rs) -> "2.5L".
function rsTick(paisa) {
  const r = Math.round(paisa / 100);
  if (Math.abs(r) >= 100_000) return `${(r / 100_000).toFixed(1)}L`;
  if (Math.abs(r) >= 1_000) return `${Math.round(r / 1_000)}k`;
  return String(r);
}

function ChartCard({ title, empty, children }) {
  const { t } = useLang();
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {empty ? (
        <p className="py-14 text-center text-sm text-gray-400">{t('chart.empty')}</p>
      ) : (
        // Charts stay LTR even in Urdu: axes, dates and amounts are Latin.
        <div dir="ltr" className="latin mt-4 h-64">
          {children}
        </div>
      )}
    </div>
  );
}

function RsTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-bold text-gray-800">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.stroke || p.fill }}>
          {p.name}: {fmt.rs(p.value)}
        </p>
      ))}
    </div>
  );
}

const AXIS_TICK = { fontSize: 11, fill: '#6b7280' };

/** Bar chart: gross sales per fish type over [fromISO, toISO]. */
export function SalesByFishChart({ sales, fromISO, toISO, title }) {
  const { t, fmt, fishName } = useLang();

  const data = useMemo(() => {
    const byFish = new Map();
    for (const s of sales) {
      if (!live(s) || !inRange(s.date, fromISO, toISO)) continue;
      const label = fishName({ name: s.fishType, nameUr: s.fishTypeUr }) || s.fishType;
      byFish.set(label, (byFish.get(label) ?? 0) + s.grossPaisa);
    }
    return [...byFish.entries()]
      .map(([fish, grossPaisa]) => ({ fish, grossPaisa }))
      .sort((a, b) => b.grossPaisa - a.grossPaisa);
  }, [sales, fromISO, toISO, fishName]);

  return (
    <ChartCard title={title} empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="fish" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#d1d5db' }} />
          <YAxis
            tickFormatter={rsTick}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            label={{ value: t('chart.rs'), angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
          />
          <Tooltip content={<RsTooltip fmt={fmt} />} cursor={{ fill: 'rgba(41,106,115,0.08)' }} />
          <Bar dataKey="grossPaisa" name={t('sale.gross')} fill={TEAL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Line chart: wasooli vs payments per day over [fromISO, toISO]. */
export function CashFlowChart({ cashEntries, fromISO, toISO, title }) {
  const { t, fmt } = useLang();

  const data = useMemo(() => {
    const byDay = new Map();
    // Every calendar day appears, so quiet days plot as zero instead of the
    // line skipping straight across a gap.
    for (let d = new Date(fromISO); ; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (iso > toISO) break;
      byDay.set(iso, { date: iso, inPaisa: 0, outPaisa: 0 });
    }
    for (const c of cashEntries) {
      if (!live(c) || !inRange(c.date, fromISO, toISO)) continue;
      const row = byDay.get(c.date);
      if (!row) continue;
      if (c.direction === 'wasooli') row.inPaisa += c.amountPaisa;
      else row.outPaisa += c.amountPaisa;
    }
    return [...byDay.values()].map((r) => ({ ...r, label: fmt.shortDate(r.date) }));
  }, [cashEntries, fromISO, toISO, fmt]);

  const allZero = data.every((r) => r.inPaisa === 0 && r.outPaisa === 0);

  return (
    <ChartCard title={title} empty={allZero}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#d1d5db' }} interval="preserveStartEnd" />
          <YAxis
            tickFormatter={rsTick}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            label={{ value: t('chart.rs'), angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
          />
          <Tooltip content={<RsTooltip fmt={fmt} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="inPaisa" name={t('dash.cashIn')} stroke={TEAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="outPaisa" name={t('dash.cashOut')} stroke={AMBER} strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
