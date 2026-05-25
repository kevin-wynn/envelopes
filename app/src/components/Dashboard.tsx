import { useEffect, useState } from "react";

interface AccountData {
  id: number;
  name: string;
  type: string;
  balance: number;
  institution: string | null;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/transactions?limit=5").then((r) => r.json()),
    ])
      .then(([accts, txns]) => {
        setAccounts(accts);
        setRecentTxns(txns);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const assetTypes = [
    "checking",
    "savings",
    "cash",
    "cd",
    "investment",
    "retirement",
  ];
  const liabilityTypes = [
    "credit_card",
    "mortgage",
    "auto_loan",
    "personal_loan",
    "student_loan",
  ];

  const totalAssets = accounts
    .filter((a) => assetTypes.includes(a.type))
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => liabilityTypes.includes(a.type))
    .reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Net Worth</p>
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-brand-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p
            className={`stat-value ${netWorth >= 0 ? "text-success-600" : "text-danger-600"}`}
          >
            {fmt(netWorth)}
          </p>
          <p className="text-xs text-ink-400 mt-1">Total financial position</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Total Assets</p>
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
                  d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                />
              </svg>
            </div>
          </div>
          <p className="stat-value text-success-600">{fmt(totalAssets)}</p>
          <p className="text-xs text-ink-400 mt-1">
            {accounts.filter((a) => assetTypes.includes(a.type)).length}{" "}
            accounts
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Total Liabilities</p>
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
                  d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"
                />
              </svg>
            </div>
          </div>
          <p className="stat-value text-danger-600">{fmt(totalLiabilities)}</p>
          <p className="text-xs text-ink-400 mt-1">
            {accounts.filter((a) => liabilityTypes.includes(a.type)).length}{" "}
            accounts
          </p>
        </div>
      </div>

      {/* Accounts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900">Accounts</h3>
            <a
              href="/app/accounts"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </a>
          </div>
          <div className="divide-y divide-paper-200">
            {accounts.length > 0 ? (
              accounts.slice(0, 6).map((acct) => (
                <div
                  key={acct.id}
                  className="px-6 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {acct.name}
                    </p>
                    <p className="text-xs text-ink-400">
                      {acct.institution || acct.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${acct.balance >= 0 ? "text-success-600" : "text-danger-600"}`}
                  >
                    {fmt(acct.balance)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-400 text-center py-8 px-6">
                No accounts yet. Add your first account to get started.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900">
              Recent Transactions
            </h3>
            <a
              href="/app/transactions"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </a>
          </div>
          <div className="divide-y divide-paper-200">
            {recentTxns.length > 0 ? (
              recentTxns.map((txn: any) => (
                <div
                  key={txn.id}
                  className="px-6 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {txn.payeeName || "Unknown"}
                    </p>
                    <p className="text-xs text-ink-400">
                      {txn.categoryName || "Uncategorized"} ·{" "}
                      {new Date(txn.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${txn.amount >= 0 ? "text-success-600" : "text-danger-600"}`}
                  >
                    {fmt(txn.amount)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-400 text-center py-8 px-6">
                No transactions yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
