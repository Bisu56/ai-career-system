export const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-Time" },
  { value: "part-time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "remote", label: "Remote" },
];

export const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Manager" },
];

export const labelFor = (options, value) =>
  options.find((o) => o.value === value)?.label ?? value;

export const APP_STATUS_COLORS = {
  applied:     "bg-blue-100 text-blue-700",
  shortlisted: "bg-yellow-100 text-yellow-700",
  interview:   "bg-brand-100 text-brand-700",
  selected:    "bg-green-100 text-green-700",
  rejected:    "bg-red-100 text-red-600",
  withdrawn:   "bg-slate-100 text-slate-600",
};

export const REVIEW_STATUS_COLORS = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export const REVIEW_STATUS_TABS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "" },
];
