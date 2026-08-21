// Shared label + input + inline error, matching the field styling the ledger
// forms already use. Errors are rendered inline and announced to assistive
// tech — this app never uses alert().
export const fieldInputCls = (hasError) =>
  `w-full rounded-lg border bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-primary-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`;

export default function FormField({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
