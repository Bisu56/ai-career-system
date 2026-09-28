import { FiTrendingUp } from "react-icons/fi";

// Shared brand mark used across the navbar, sidebar and auth pages.
export default function Brand({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${
          light ? "bg-white text-ink" : "bg-ink text-white"
        }`}
      >
        <FiTrendingUp className="h-4 w-4" />
      </span>
      <span
        className={`text-[17px] font-semibold tracking-tight ${
          light ? "text-white" : "text-ink"
        }`}
      >
        Career<span className="text-brand-600">AI</span>
      </span>
    </div>
  );
}
