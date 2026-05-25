import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "./ui/ConfirmDialog";

interface BudgetCategory {
  id: number;
  name: string;
  assigned: number;
  activity: number;
  available: number;
  budgetId: number | null;
}

interface BudgetGroup {
  id: number;
  name: string;
  isIncome: boolean;
  categories: BudgetCategory[];
}

interface BudgetData {
  groups: BudgetGroup[];
  readyToAssign: number;
  month: string;
}

export default function BudgetView() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddCategory, setShowAddCategory] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingCat, setRenamingCat] = useState<number | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "category" | "group";
    id: number;
  } | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  const fetchBudget = useCallback(() => {
    fetch(`/api/budgets?month=${month}`)
      .then((r) => r.json())
      .then(setData);
  }, [month]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = () => {
    const [y, m] = month.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const handleAssign = async (categoryId: number) => {
    const val = parseFloat(editValue);
    if (isNaN(val)) {
      setEditingCell(null);
      return;
    }

    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, month, assigned: val }),
    });
    setEditingCell(null);
    fetchBudget();
  };

  const addCategory = async (groupId: number) => {
    if (!newCatName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, name: newCatName }),
    });
    setShowAddCategory(null);
    setNewCatName("");
    fetchBudget();
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", name: newGroupName }),
    });
    setShowAddGroup(false);
    setNewGroupName("");
    fetchBudget();
  };

  const renameCategory = async (id: number) => {
    if (!renameValue.trim()) {
      setRenamingCat(null);
      return;
    }
    await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: renameValue }),
    });
    setRenamingCat(null);
    setRenameValue("");
    fetchBudget();
  };

  const renameGroup = async (id: number) => {
    if (!renameValue.trim()) {
      setRenamingGroup(null);
      return;
    }
    await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: "group", name: renameValue }),
    });
    setRenamingGroup(null);
    setRenameValue("");
    fetchBudget();
  };

  const deleteCategory = async (id: number) => {
    setDeleteConfirm({ type: "category", id });
  };

  const deleteGroup = async (id: number) => {
    setDeleteConfirm({ type: "group", id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    await fetch(`/api/categories?id=${id}&type=${type}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchBudget();
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const expenseGroups = data.groups.filter((g) => !g.isIncome);
  const totalAssigned = expenseGroups.reduce(
    (s, g) => s + g.categories.reduce((cs, c) => cs + c.assigned, 0),
    0,
  );
  const totalActivity = expenseGroups.reduce(
    (s, g) => s + g.categories.reduce((cs, c) => cs + c.activity, 0),
    0,
  );
  const totalAvailable = expenseGroups.reduce(
    (s, g) => s + g.categories.reduce((cs, c) => cs + c.available, 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header with month nav and ready to assign */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="btn-ghost btn-sm rounded-lg">
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
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-ink-900 min-w-[200px] text-center">
            {monthLabel()}
          </h2>
          <button onClick={nextMonth} className="btn-ghost btn-sm rounded-lg">
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
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>

        <div
          className={`px-5 py-3 rounded-xl ${data.readyToAssign >= 0 ? "bg-success-50 border border-success-200" : "bg-danger-50 border border-danger-200"}`}
        >
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">
            Ready to Assign
          </p>
          <p
            className={`text-xl font-bold ${data.readyToAssign >= 0 ? "text-success-600" : "text-danger-600"}`}
          >
            {fmt(data.readyToAssign)}
          </p>
        </div>
      </div>

      {/* Budget Table */}
      <div className="card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-paper-200 border-b text-xs font-semibold text-ink-500 uppercase tracking-wider">
          <div className="col-span-5">Category</div>
          <div className="col-span-2 text-right">Assigned</div>
          <div className="col-span-2 text-right">Activity</div>
          <div className="col-span-3 text-right">Available</div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-12 gap-2 px-6 py-2.5 bg-brand-50/50 border-b text-sm font-semibold">
          <div className="col-span-5 text-brand-900">All Categories</div>
          <div className="col-span-2 text-right text-brand-700">
            {fmt(totalAssigned)}
          </div>
          <div className="col-span-2 text-right text-brand-700">
            {fmt(totalActivity)}
          </div>
          <div className="col-span-3 text-right text-brand-700">
            {fmt(totalAvailable)}
          </div>
        </div>

        {/* Groups */}
        {expenseGroups.map((group) => {
          const groupAssigned = group.categories.reduce(
            (s, c) => s + c.assigned,
            0,
          );
          const groupActivity = group.categories.reduce(
            (s, c) => s + c.activity,
            0,
          );
          const groupAvailable = group.categories.reduce(
            (s, c) => s + c.available,
            0,
          );

          return (
            <div key={group.id}>
              {/* Group Header */}
              <div className="group/grp grid grid-cols-12 gap-2 px-6 py-2.5 bg-paper-200/50 border-b border-t">
                <div className="col-span-5 flex items-center gap-2">
                  {renamingGroup === group.id ? (
                    <input
                      autoFocus
                      className="input py-1 text-sm font-semibold flex-1 max-w-[200px]"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => renameGroup(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameGroup(group.id);
                        if (e.key === "Escape") setRenamingGroup(null);
                      }}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-ink-700">
                      {group.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover/grp:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setRenamingGroup(group.id);
                        setRenameValue(group.name);
                      }}
                      className="p-1 rounded text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Rename group"
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
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="p-1 rounded text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                      title="Delete group"
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
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-ink-500">
                  {fmt(groupAssigned)}
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-ink-500">
                  {fmt(groupActivity)}
                </div>
                <div className="col-span-3 text-right text-sm font-medium text-ink-500">
                  {fmt(groupAvailable)}
                </div>
              </div>

              {/* Categories */}
              {group.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group/cat grid grid-cols-12 gap-2 px-6 py-2.5 border-b border-paper-200 hover:bg-paper-200/50 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-2">
                    {renamingCat === cat.id ? (
                      <input
                        autoFocus
                        className="input py-1 text-sm flex-1 max-w-[200px] ml-4"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameCategory(cat.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameCategory(cat.id);
                          if (e.key === "Escape") setRenamingCat(null);
                        }}
                      />
                    ) : (
                      <span className="text-sm text-ink-700 pl-4">
                        {cat.name}
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setRenamingCat(cat.id);
                          setRenameValue(cat.name);
                        }}
                        className="p-1 rounded text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Rename category"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1 rounded text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                        title="Delete category"
                      >
                        <svg
                          className="w-3 h-3"
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

                  {/* Assigned - editable */}
                  <div className="col-span-2 text-right">
                    {editingCell === `${cat.id}-assigned` ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-right text-sm border border-brand-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleAssign(cat.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAssign(cat.id);
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCell(`${cat.id}-assigned`);
                          setEditValue(String(cat.assigned || ""));
                        }}
                        className="text-sm text-ink-900 hover:bg-brand-50 rounded px-2 py-1 transition-colors cursor-pointer"
                      >
                        {fmt(cat.assigned)}
                      </button>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <span
                      className={`text-sm ${cat.activity < 0 ? "text-danger-600" : cat.activity > 0 ? "text-success-600" : "text-ink-400"}`}
                    >
                      {fmt(cat.activity)}
                    </span>
                  </div>

                  <div className="col-span-3 text-right flex items-center justify-end gap-2">
                    <div className="flex-1 max-w-[80px]">
                      {cat.assigned > 0 && (
                        <div className="progress-bar h-1.5">
                          <div
                            className={`progress-fill ${cat.available < 0 ? "bg-danger-500" : cat.available === 0 ? "bg-success-500" : "bg-brand-500"}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, ((cat.assigned + cat.activity) / cat.assigned) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${cat.available < 0 ? "text-danger-600" : cat.available > 0 ? "text-success-600" : "text-ink-400"}`}
                    >
                      {fmt(cat.available)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Add Category */}
              {showAddCategory === group.id ? (
                <div className="px-6 py-2 border-b flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Category name"
                    className="input py-1.5 text-sm flex-1"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCategory(group.id);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => addCategory(group.id)}
                    className="btn-primary btn-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCategory(null);
                      setNewCatName("");
                    }}
                    className="btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCategory(group.id)}
                  className="w-full px-6 py-1.5 text-left text-xs text-ink-400 hover:text-brand-600 hover:bg-paper-200 transition-colors border-b"
                >
                  + Add category
                </button>
              )}
            </div>
          );
        })}

        {/* Add Group */}
        {showAddGroup ? (
          <div className="px-6 py-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Group name"
              className="input py-1.5 text-sm flex-1"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addGroup();
              }}
              autoFocus
            />
            <button onClick={addGroup} className="btn-primary btn-sm">
              Add
            </button>
            <button
              onClick={() => {
                setShowAddGroup(false);
                setNewGroupName("");
              }}
              className="btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddGroup(true)}
            className="w-full px-6 py-3 text-left text-sm text-ink-400 hover:text-brand-600 hover:bg-paper-200 transition-colors font-medium"
          >
            + Add Category Group
          </button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title={
          deleteConfirm?.type === "group"
            ? "Delete Category Group"
            : "Delete Category"
        }
        message={
          deleteConfirm?.type === "group"
            ? "Delete this group and ALL its categories? This cannot be undone."
            : "Delete this category? Any budget data will also be removed."
        }
        confirmText="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
