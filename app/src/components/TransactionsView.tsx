import { useEffect, useState } from "react";
import AddTransactionModal from "./ui/AddTransactionModal";
import ConfirmDialog from "./ui/ConfirmDialog";

interface Transaction {
  id: number;
  accountId: number;
  categoryId: number | null;
  payeeId: number | null;
  date: string;
  amount: number;
  memo: string | null;
  cleared: boolean;
  accountName: string;
  categoryName: string | null;
  payeeName: string | null;
}

export default function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [form, setForm] = useState({
    accountId: "",
    categoryId: "",
    payeeName: "",
    date: new Date().toISOString().slice(0, 10),
    outflow: "",
    inflow: "",
    memo: "",
    cleared: false,
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  const fetchData = () => {
    const params = new URLSearchParams();
    if (filterAccount) params.set("accountId", filterAccount);
    if (filterMonth) params.set("month", filterMonth);
    params.set("limit", "200");

    const currentMonth = new Date().toISOString().slice(0, 7);

    Promise.all([
      fetch(`/api/transactions?${params}`).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch(`/api/budgets?month=${currentMonth}`).then((r) => r.json()),
    ]).then(([txns, accts, budgetData]) => {
      setTransactions(txns);
      setAccounts(accts);
      setCategories(budgetData.groups || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [filterAccount, filterMonth]);

  const blankForm = () => ({
    accountId: "",
    categoryId: "",
    payeeName: "",
    date: new Date().toISOString().slice(0, 10),
    outflow: "",
    inflow: "",
    memo: "",
    cleared: false,
  });

  const resetForm = () => {
    setForm(blankForm());
    setEditing(null);
    setShowModal(false);
  };

  const handleEdit = (txn: Transaction) => {
    setEditing(txn);
    setForm({
      accountId: String(txn.accountId),
      categoryId: txn.categoryId ? String(txn.categoryId) : "",
      payeeName: txn.payeeName || "",
      date: txn.date,
      outflow: txn.amount < 0 ? String(Math.abs(txn.amount)) : "",
      inflow: txn.amount > 0 ? String(txn.amount) : "",
      memo: txn.memo || "",
      cleared: txn.cleared,
    });
    setShowModal(true);
  };

  const handleSubmit = async (saveAndAdd = false) => {
    const outflow = parseFloat(form.outflow) || 0;
    const inflow = parseFloat(form.inflow) || 0;
    const amount = inflow > 0 ? inflow : -outflow;

    const payload: any = {
      accountId: parseInt(form.accountId),
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      payeeName: form.payeeName || null,
      date: form.date,
      amount,
      memo: form.memo || null,
      cleared: form.cleared,
    };

    if (editing) {
      payload.id = editing.id;
      await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (saveAndAdd) {
      setForm({ ...blankForm(), accountId: form.accountId });
      setEditing(null);
    } else {
      resetForm();
    }
    fetchData();
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    await fetch(`/api/transactions?id=${deleteConfirm}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const totalInflow = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            className="input py-2 w-40"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
          >
            <option value="">All Accounts</option>
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            className="input py-2 w-44"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
          {(filterAccount || filterMonth) && (
            <button
              onClick={() => {
                setFilterAccount("");
                setFilterMonth("");
              }}
              className="btn-ghost btn-sm"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setForm(blankForm());
            setEditing(null);
            setShowModal(true);
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
          Add Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Income</p>
          <p className="text-lg font-bold text-success-600">
            {fmt(totalInflow)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Expenses</p>
          <p className="text-lg font-bold text-danger-600">
            {fmt(totalOutflow)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Net</p>
          <p
            className={`text-lg font-bold ${totalInflow - totalOutflow >= 0 ? "text-success-600" : "text-danger-600"}`}
          >
            {fmt(totalInflow - totalOutflow)}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-paper-200">
                <th className="w-8 px-3 py-3"></th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider w-32">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  Payee
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  Memo
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider w-28">
                  Outflow
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider w-28">
                  Inflow
                </th>
                <th className="w-8 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-paper-200 hover:bg-paper-100/50 cursor-pointer transition-colors group"
                    onClick={() => handleEdit(txn)}
                  >
                    <td className="px-3 py-3">
                      {txn.cleared && (
                        <div className="w-2 h-2 bg-success-500 rounded-full mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-ink-600 whitespace-nowrap">
                      {new Date(txn.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "2-digit" },
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-ink-900">
                      {txn.payeeName || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {txn.categoryName ? (
                        <span className="badge-info">{txn.categoryName}</span>
                      ) : (
                        <span className="text-ink-400 text-xs">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-400 text-sm max-w-[150px] truncate">
                      {txn.memo || ""}
                    </td>
                    <td className="px-3 py-3 text-right text-sm">
                      {txn.amount < 0 && (
                        <span className="font-semibold text-danger-600">
                          {fmt(Math.abs(txn.amount))}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-sm">
                      {txn.amount >= 0 && (
                        <span className="font-semibold text-success-600">
                          {fmt(txn.amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(txn.id);
                        }}
                        className="text-paper-300 hover:text-danger-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-ink-400">
                    No transactions found. Add your first transaction to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        open={showModal}
        editing={editing}
        accounts={accounts}
        categories={categories}
        onClose={resetForm}
        onSave={handleSubmit}
        form={form}
        setForm={setForm}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Transaction"
        message="Delete this transaction? This cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
