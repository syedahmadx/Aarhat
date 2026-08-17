const STYLES = {
  Sale: 'bg-primary-100 text-primary-800',
  Wasooli: 'bg-green-100 text-green-800',
  Payment: 'bg-orange-100 text-orange-800',
  beopari: 'bg-indigo-100 text-indigo-800',
  khareedar: 'bg-cyan-100 text-cyan-800',
};

const LABELS = { beopari: 'Beopari', khareedar: 'Khareedar' };

export default function TypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STYLES[type] || 'bg-gray-100 text-gray-700'}`}>
      {LABELS[type] || type}
    </span>
  );
}
