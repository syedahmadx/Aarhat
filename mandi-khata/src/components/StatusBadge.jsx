const STYLES = {
  Paid: 'bg-green-100 text-green-800 ring-green-600/20',
  Partial: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  Pending: 'bg-red-100 text-red-800 ring-red-600/20',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status] || 'bg-gray-100 text-gray-700 ring-gray-500/20'}`}>
      {status}
    </span>
  );
}
