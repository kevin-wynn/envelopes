import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CategoryPickerProps {
  categories: any[];
  value: string;
  onChange: (id: string) => void;
}

function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedName = (() => {
    for (const g of categories) {
      const c = g.categories.find((c: any) => String(c.id) === value);
      if (c) return c.name;
    }
    return "";
  })();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = categories
    .map((g: any) => ({
      ...g,
      categories: g.categories.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((g: any) => g.categories.length > 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="w-full flex items-center justify-between px-3 py-2 border border-paper-300 rounded-lg bg-white text-sm text-left hover:border-brand-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <span className={selectedName ? "text-ink-900" : "text-ink-400"}>
          {selectedName || "Select category"}
        </span>
        <svg
          className="w-4 h-4 text-ink-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-paper-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-paper-200">
            <input
              autoFocus
              placeholder="Search categories..."
              className="w-full border border-paper-300 rounded-lg px-3 py-1.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setSearch("");
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink-600 hover:bg-paper-50 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Uncategorized
            </button>
            {filtered.map((g: any) => (
              <div key={g.id}>
                <div className="px-4 py-1.5 text-xs font-semibold text-ink-500 uppercase tracking-wider bg-paper-50">
                  {g.name}
                </div>
                {g.categories.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(String(c.id));
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-paper-50 transition-colors ${String(c.id) === value ? "bg-brand-50 text-brand-700" : "text-ink-700"}`}
                  >
                    <span>{c.name}</span>
                    {c.available !== undefined && (
                      <span
                        className={`text-xs font-medium ${c.available < 0 ? "text-danger-600" : c.available > 0 ? "text-success-600" : "text-ink-400"}`}
                      >
                        {fmt(c.available)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-400">
                No categories found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AddTransactionModalProps {
  open: boolean;
  editing: any | null;
  accounts: any[];
  categories: any[];
  onClose: () => void;
  onSave: (saveAndAdd?: boolean) => void;
  form: any;
  setForm: (form: any) => void;
}

export default function AddTransactionModal({
  open,
  editing,
  accounts,
  categories,
  onClose,
  onSave,
  form,
  setForm,
}: AddTransactionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      // Focus first input when modal opens
      const firstInput = dialogRef.current.querySelector(
        "input",
      ) as HTMLInputElement;
      firstInput?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      >
        <div className="px-6 py-4 border-b border-paper-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">
            {editing ? "Edit Transaction" : "Add Transaction"}
          </h3>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Inflow/Outflow Toggle */}
          <div className="flex rounded-lg border border-paper-300 overflow-hidden bg-paper-50 p-1">
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  inflow: "",
                  outflow: form.outflow || "0.00",
                })
              }
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                !form.inflow
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "text-ink-600 hover:text-ink-800 hover:bg-paper-100"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, outflow: "", inflow: form.inflow || "0.00" })
              }
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                form.inflow
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "text-ink-600 hover:text-ink-800 hover:bg-paper-100"
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Amount</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.inflow || form.outflow || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, inflow: val, outflow: "" });
                }}
                required
                placeholder="0.00"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Payee</label>
              <input
                className="input"
                value={form.payeeName}
                onChange={(e) =>
                  setForm({ ...form, payeeName: e.target.value })
                }
                placeholder="e.g., Amazon, Grocery Store"
              />
            </div>
            <div>
              <label className="label">Account</label>
              <select
                className="input"
                value={form.accountId}
                onChange={(e) =>
                  setForm({ ...form, accountId: e.target.value })
                }
                required
              >
                <option value="">Select account</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <CategoryPicker
                categories={categories}
                value={form.categoryId}
                onChange={(id) => setForm({ ...form, categoryId: id })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Memo</label>
              <input
                className="input"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                placeholder="Optional note"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.cleared}
                  onChange={(e) =>
                    setForm({ ...form, cleared: e.target.checked })
                  }
                  className="rounded border-paper-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-ink-700">Cleared</span>
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-paper-50 border-t border-paper-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-600 hover:text-ink-800 hover:bg-paper-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSave(false)}
              disabled={!form.accountId || (!form.inflow && !form.outflow)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {editing ? "Update" : "Save"}
            </button>
            {!editing && (
              <button
                type="button"
                onClick={() => onSave(true)}
                disabled={!form.accountId || (!form.inflow && !form.outflow)}
                className="px-4 py-2 bg-paper-600 hover:bg-paper-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save and add another
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
