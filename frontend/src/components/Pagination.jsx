const buttonClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export default function Pagination({ page, totalPages, onChange, className = "mt-4" }) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={buttonClass}>
          Previous
        </button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={buttonClass}>
          Next
        </button>
      </div>
    </div>
  );
}
