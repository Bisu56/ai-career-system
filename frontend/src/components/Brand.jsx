import { FiTrendingUp } from "react-icons/fi";

// Shared brand mark used across the navbar, sidebar and auth pages.
export default function Brand({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
        <FiTrendingUp className="h-5 w-5" />
      </span>
      <span
        className={`text-lg font-bold tracking-tight ${
          light ? "text-white" : "text-slate-900"
        }`}
      >
        Career<span className="text-indigo-500">AI</span>
      </span>
    </div>
  );
}
