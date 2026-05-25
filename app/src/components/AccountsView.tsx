import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "./ui/ConfirmDialog";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking", group: "Cash" },
  { value: "savings", label: "Savings", group: "Cash" },
  { value: "cash", label: "Cash", group: "Cash" },
  { value: "credit_card", label: "Credit Card", group: "Credit" },
  { value: "mortgage", label: "Mortgage", group: "Loans" },
  { value: "auto_loan", label: "Auto Loan", group: "Loans" },
  { value: "personal_loan", label: "Personal Loan", group: "Loans" },
  { value: "student_loan", label: "Student Loan", group: "Loans" },
  { value: "investment", label: "Investment", group: "Investments" },
  { value: "retirement", label: "Retirement", group: "Investments" },
  { value: "cd", label: "Certificate of Deposit", group: "Investments" },
  { value: "other", label: "Other", group: "Other" },
];

const ASSET_TYPES = [
  "checking",
  "savings",
  "cash",
  "cd",
  "investment",
  "retirement",
];
const LIABILITY_TYPES = [
  "credit_card",
  "mortgage",
  "auto_loan",
  "personal_loan",
  "student_loan",
];

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  institution: string | null;
  apr: number | null;
  minimumPayment: number | null;
  creditLimit: number | null;
  loanOriginalAmount: number | null;
  loanTermMonths: number | null;
  maturityDate: string | null;
  notes: string | null;
  isOffBudget: boolean;
  isClosed: boolean;
}

export default function AccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "checking",
    balance: "",
    institution: "",
    apr: "",
    minimumPayment: "",
    creditLimit: "",
    loanOriginalAmount: "",
    loanTermMonths: "",
    maturityDate: "",
    notes: "",
    isOffBudget: false,
    createIncomeTransaction: false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  const fetchAccounts = () => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForm) {
        resetForm();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [showForm]);

  const resetForm = () => {
    setForm({
      name: "",
      type: "checking",
      balance: "",
      institution: "",
      apr: "",
      minimumPayment: "",
      creditLimit: "",
      loanOriginalAmount: "",
      loanTermMonths: "",
      maturityDate: "",
      notes: "",
      isOffBudget: false,
      createIncomeTransaction: false,
    });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (acct: Account) => {
    setEditing(acct);
    setForm({
      name: acct.name,
      type: acct.type,
      balance: String(acct.balance),
      institution: acct.institution || "",
      apr: acct.apr ? String(acct.apr) : "",
      minimumPayment: acct.minimumPayment ? String(acct.minimumPayment) : "",
      creditLimit: acct.creditLimit ? String(acct.creditLimit) : "",
      loanOriginalAmount: acct.loanOriginalAmount
        ? String(acct.loanOriginalAmount)
        : "",
      loanTermMonths: acct.loanTermMonths ? String(acct.loanTermMonths) : "",
      maturityDate: acct.maturityDate || "",
      notes: acct.notes || "",
      isOffBudget: acct.isOffBudget,
      createIncomeTransaction: false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      institution: form.institution || null,
      isOffBudget: form.isOffBudget,
      notes: form.notes || null,
    };
    if (form.apr) payload.apr = parseFloat(form.apr);
    if (form.minimumPayment)
      payload.minimumPayment = parseFloat(form.minimumPayment);
    if (form.creditLimit) payload.creditLimit = parseFloat(form.creditLimit);
    if (form.loanOriginalAmount)
      payload.loanOriginalAmount = parseFloat(form.loanOriginalAmount);
    if (form.loanTermMonths)
      payload.loanTermMonths = parseInt(form.loanTermMonths);
    if (form.maturityDate) payload.maturityDate = form.maturityDate;

    if (editing) {
      payload.id = editing.id;
      await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const account = await response.json();

      // Create income transaction if requested and it's an asset account
      if (
        form.createIncomeTransaction &&
        ASSET_TYPES.includes(form.type) &&
        parseFloat(form.balance) > 0
      ) {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: account.id,
            payeeName: "Starting Balance",
            date: new Date().toISOString().slice(0, 10),
            amount: parseFloat(form.balance),
            memo: `Initial balance for ${form.name}`,
            cleared: true,
            categoryId: null, // Leave uncategorized but still counts as income
          }),
        });
      }
    }
    resetForm();
    fetchAccounts();
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    await fetch(`/api/accounts?id=${deleteConfirm}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchAccounts();
  };

  const assets = accounts.filter(
    (a) => ASSET_TYPES.includes(a.type) && !a.isClosed,
  );
  const liabilities = accounts.filter(
    (a) => LIABILITY_TYPES.includes(a.type) && !a.isClosed,
  );
  const other = accounts.filter((a) => a.type === "other" && !a.isClosed);
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce(
    (s, a) => s + Math.abs(a.balance),
    0,
  );

  const showLoanFields = [
    "mortgage",
    "auto_loan",
    "personal_loan",
    "student_loan",
    "credit_card",
  ].includes(form.type);
  const showInvestmentFields = ["investment", "retirement", "cd"].includes(
    form.type,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500">Net Worth</p>
          <p
            className={`text-3xl font-bold ${totalAssets - totalLiabilities >= 0 ? "text-success-600" : "text-danger-600"}`}
          >
            {fmt(totalAssets - totalLiabilities)}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <svg
            className="w-4 h-4"
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
          Add Account
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editing ? "Edit Account" : "Add Account"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-ink-400 hover:text-ink-600"
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
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Account Name</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                      placeholder="e.g., Chase Checking"
                    />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select
                      className="input"
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value })
                      }
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      {LIABILITY_TYPES.includes(form.type)
                        ? "Current Balance (enter as negative)"
                        : "Current Balance"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={form.balance}
                      onChange={(e) =>
                        setForm({ ...form, balance: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Institution</label>
                    <input
                      className="input"
                      value={form.institution}
                      onChange={(e) =>
                        setForm({ ...form, institution: e.target.value })
                      }
                      placeholder="e.g., Chase Bank"
                    />
                  </div>

                  {showLoanFields && (
                    <>
                      <div>
                        <label className="label">APR %</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={form.apr}
                          onChange={(e) =>
                            setForm({ ...form, apr: e.target.value })
                          }
                          placeholder="e.g., 24.99"
                        />
                      </div>
                      <div>
                        <label className="label">Minimum Payment</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={form.minimumPayment}
                          onChange={(e) =>
                            setForm({ ...form, minimumPayment: e.target.value })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      {form.type === "credit_card" && (
                        <div>
                          <label className="label">Credit Limit</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={form.creditLimit}
                            onChange={(e) =>
                              setForm({ ...form, creditLimit: e.target.value })
                            }
                            placeholder="0.00"
                          />
                        </div>
                      )}
                      {form.type !== "credit_card" && (
                        <>
                          <div>
                            <label className="label">
                              Original Loan Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              value={form.loanOriginalAmount}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  loanOriginalAmount: e.target.value,
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="label">Loan Term (months)</label>
                            <input
                              type="number"
                              className="input"
                              value={form.loanTermMonths}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  loanTermMonths: e.target.value,
                                })
                              }
                              placeholder="e.g., 360"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {showInvestmentFields && (
                    <div>
                      <label className="label">Maturity Date</label>
                      <input
                        type="date"
                        className="input"
                        value={form.maturityDate}
                        onChange={(e) =>
                          setForm({ ...form, maturityDate: e.target.value })
                        }
                      />
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="label">Notes</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      placeholder="Optional notes..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isOffBudget}
                        onChange={(e) =>
                          setForm({ ...form, isOffBudget: e.target.checked })
                        }
                        className="rounded border-paper-400 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-ink-700">
                        Off-budget (tracking only)
                      </span>
                    </label>
                  </div>

                  {!editing &&
                    ASSET_TYPES.includes(form.type) &&
                    parseFloat(form.balance) > 0 && (
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.createIncomeTransaction}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                createIncomeTransaction: e.target.checked,
                              })
                            }
                            className="rounded border-paper-400 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-ink-700">
                            Create income transaction for starting balance
                            (makes funds available to budget)
                          </span>
                        </label>
                      </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editing ? "Update" : "Add Account"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Asset Accounts */}
      {assets.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900">
              Cash & Assets
            </h3>
            <span className="text-sm font-bold text-success-600">
              {fmt(totalAssets)}
            </span>
          </div>
          <div className="divide-y divide-paper-200">
            {assets.map((acct) => (
              <div
                key={acct.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-paper-200/50 transition-colors cursor-pointer"
                onClick={() => handleEdit(acct)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-success-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {acct.name}
                    </p>
                    <p className="text-xs text-ink-400">
                      {acct.institution ||
                        ACCOUNT_TYPES.find((t) => t.value === acct.type)?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-success-600">
                    {fmt(acct.balance)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(acct.id);
                    }}
                    className="text-paper-400 hover:text-danger-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liability Accounts */}
      {liabilities.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900">
              Credit Cards & Loans
            </h3>
            <span className="text-sm font-bold text-danger-600">
              -{fmt(totalLiabilities)}
            </span>
          </div>
          <div className="divide-y divide-paper-200">
            {liabilities.map((acct) => (
              <div
                key={acct.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-paper-200/50 transition-colors cursor-pointer"
                onClick={() => handleEdit(acct)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-danger-50 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-danger-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {acct.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-ink-400">
                        {acct.institution ||
                          ACCOUNT_TYPES.find((t) => t.value === acct.type)
                            ?.label}
                      </p>
                      {acct.apr && (
                        <span className="text-xs text-danger-500 font-medium">
                          {acct.apr}% APR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-danger-600">
                    {fmt(acct.balance)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(acct.id);
                    }}
                    className="text-paper-400 hover:text-danger-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-brand-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink-900 mb-1">
            No accounts yet
          </h3>
          <p className="text-sm text-ink-500 mb-4">
            Add your bank accounts, credit cards, loans, and investments to
            start tracking your finances.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add Your First Account
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Account"
        message="Delete this account? This cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
