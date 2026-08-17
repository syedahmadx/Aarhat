import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const tone = toast.tone === 'error' ? 'bg-red-600' : 'bg-green-600';
  return (
    <div key={toast.key} className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6">
      <div className={`${tone} flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg`}>
        {toast.tone === 'error' ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        )}
        {toast.message}
      </div>
    </div>
  );
}
