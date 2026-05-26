---
description: Add a new React component to the Envelopes app
---

## Add a New React Component

Use this workflow whenever adding a new React component (view, UI widget, or modal).

---

### 1. Determine the component type

| Type | Location | When to use |
|---|---|---|
| **Page view** | `app/src/components/[Name]View.tsx` | Full page mounted as a React island |
| **UI widget** | `app/src/components/ui/[Name].tsx` | Reusable modal, dialog, or shared UI element |
| **Inline** | Inside an existing component file | Small, used only once in the parent |

---

### 2. Page view component template

`app/src/components/[FeatureName]View.tsx`:

```tsx
import { useEffect, useState, useCallback } from "react";
import ConfirmDialog from "./ui/ConfirmDialog"; // if you need delete confirms

interface ItemType {
  id: number;
  name: string;
  // ...
}

export default function FeatureNameView() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const fetchItems = useCallback(() => {
    fetch("/api/resource-name")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* content */}
    </div>
  );
}
```

---

### 3. Modal component template

`app/src/components/ui/[ModalName].tsx`:

```tsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function ModalName({ open, onClose, onSave }: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-paper-50 rounded-2xl shadow-xl border border-paper-300 w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-ink-900">Modal Title</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 text-ink-400"
          >
            ×
          </button>
        </div>

        {/* Form content */}
        <div className="space-y-4">
          <div>
            <label className="label">Field Label</label>
            <input type="text" className="input" placeholder="..." />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={() => onSave({})}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

---

### 4. Using ConfirmDialog

For any delete action, use the shared `<ConfirmDialog>`:

```tsx
import ConfirmDialog from "./ui/ConfirmDialog";

// In state:
const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

// In JSX:
<ConfirmDialog
  open={deleteConfirm !== null}
  title="Delete Item"
  message="Are you sure you want to delete this? This cannot be undone."
  onConfirm={() => {
    // do the delete
    fetch(`/api/resource?id=${deleteConfirm}`, { method: "DELETE" })
      .then(() => { fetchItems(); setDeleteConfirm(null); });
  }}
  onCancel={() => setDeleteConfirm(null)}
/>
```

---

### 5. Design system reference

**Layout**
- `space-y-6` between sections
- `p-6` page padding (applied in the Astro page wrapper)
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` for responsive grids

**Cards**
- `.card` — white card with rounded corners, border, shadow
- `.card-header` — card header div with bottom border and padding
- `.stat-card` — dashboard stat tile
- `.stat-label` — small label inside stat card
- `.stat-value` — large number inside stat card

**Buttons**
- `.btn-primary` — filled brand green button
- `.btn-secondary` — outlined secondary button
- `.btn-lg` — large size modifier
- Add `w-full` for full-width buttons

**Forms**
- `.input` — styled text input
- `.label` — styled form label
- Always pair a `<label>` with `for` / `htmlFor` matching the input `id`

**Typography**
- `text-ink-900 font-semibold` — section headings
- `text-ink-400 text-sm` — secondary/helper text
- `text-success-600` — positive amounts/green
- `text-danger-600` — negative amounts/red

**Icons**
Use `lucide-react`:
```tsx
import { PlusCircle, Trash2, Pencil, ChevronLeft } from "lucide-react";
<PlusCircle className="w-4 h-4" />
```

**Charts**
Use `recharts` for data visualization:
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
```

---

### 6. Mount the component in an Astro page

If it's a new page view, create the Astro page and mount it:

```astro
---
import AppLayout from "../../layouts/AppLayout.astro";
import "../../styles/global.css";
import FeatureNameView from "../../components/FeatureNameView";
---

<AppLayout title="Feature" activeNav="feature-name">
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-ink-900">Feature Name</h1>
    </div>
    <FeatureNameView client:load />
  </div>
</AppLayout>
```

Note: `client:load` is required on all React components — Astro doesn't hydrate them by default.

---

### 7. Update project docs

If the component introduces new patterns, add them to `.windsurf/rules/project.md`.
