import { useApp } from '../context/AppContext';

// Delete control that is disabled for Munshi with an explanatory tooltip.
export default function DeleteButton({ onDelete, label = 'Delete' }) {
  const { role } = useApp();
  const isMalik = role === 'malik';
  return (
    <div className="group relative inline-block">
      <button
        type="button"
        disabled={!isMalik}
        onClick={isMalik ? onDelete : undefined}
        aria-label={label}
        className={isMalik ? 'rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700' : 'rounded-md p-2 cursor-not-allowed text-gray-300'}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
      {!isMalik && (
        <span className="pointer-events-none absolute -top-9 right-0 z-20 hidden whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white group-hover:block">
          Only Malik can delete
        </span>
      )}
    </div>
  );
}
