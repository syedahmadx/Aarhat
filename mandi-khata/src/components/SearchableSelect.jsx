import { useEffect, useMemo, useRef, useState } from 'react';

// Touch-friendly searchable dropdown. options: [{ value, label, sublabel }]
export default function SearchableSelect({ options, value, onChange, placeholder = 'Select…', error }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-base ${error ? 'border-red-400' : 'border-gray-300'} ${selected ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">Koi party nahi mili</li>}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-primary-50 ${o.value === value ? 'bg-primary-50 font-semibold text-primary-800' : 'text-gray-800'}`}
                >
                  <span>{o.label}</span>
                  {o.sublabel && <span className="text-xs text-gray-400">{o.sublabel}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
