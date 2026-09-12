# REC Guardian - Frontend & UX Architecture Guide

This document details the frontend architecture, institutional design system, user experience workflows, component hierarchy, and synchronization between the dual frontend implementations in **REC Guardian**.

---

## 1. Design System & Visual Theme: Leaves Green & White (Light Mode)

### 1.1 Aesthetic Inspiration: Team Presentation Deck
In alignment with the official team presentation deck for **Team: KHATRON KE KHILADI** (*"Renewable Energy Certificate Fraud Detection System"*), the frontend is built exclusively in **pure Light Mode** using a **Leaves Green and White** botanical design system.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 LEAVES GREEN & WHITE LIGHT-MODE DESIGN SYSTEM               │
├──────────────────┬───────────────────┬───────────────────┬──────────────────┤
│ Canvas Surface   │ Deep Forest Green │ Leaf Emerald      │ Lime Accent Trim │
│ Pure White / Tint│ Primary Brand & H1│ Cards & Badges    │ Sprout Highlights│
│ #ffffff / #f8faf7│ #143d2b / #0c2419 │ #15803d / #16a34a │ #84cc16 / #65a30d│
└──────────────────┴───────────────────┴───────────────────┴──────────────────┘
```

### 1.2 Core Color Tokens & Semantics

| Token Name | Hex Code | UI Semantic & Application |
| :--- | :--- | :--- |
| **Porcelain Mint Canvas** | `#f8faf7` | Main page background; bright, clean, organic, and easy on the eyes. |
| **Card & Surface Pure White** | `#ffffff` | Elevated cards, dialog surfaces, table containers. |
| **Border Sage Muted** | `#e2ece5` / `#d0e0d5` | Structural borders, subtle dividers, inactive pill borders. |
| **Deep Forest Green** | `#143d2b` / `#0c2419` | Hero banner gradient, high-contrast headings, primary text. |
| **Vibrant Leaf Green** | `#15803d` / `#166534` | Primary actions, verified badges, active navigation indicators. |
| **Sprout Lime Trim** | `#84cc16` / `#a3e635` | Mottos, pill borders (*"DETECT. EXPLAIN. INVESTIGATE. PRESERVE EVIDENCE."*), twin-leaf logo accent. |
| **Forensic Warning Amber** | `#b45309` (on `#fffbeb`) | Medium risk claims, pending review notices, non-critical warnings. |
| **Forensic Alert Crimson** | `#b91c1c` (on `#fef2f2`) | High/Critical fraud holds, wash trading cycles, ledger tampering alerts. |

---

## 2. shadcn/ui Component Architecture

The frontend components in `frontend/src/components/ui/` adhere strictly to the **shadcn/ui** design patterns:

| Component | File Path | Description & Variants |
| :--- | :--- | :--- |
| `Button` | `frontend/src/components/ui/button.tsx` | Variants: `default` (Leaf 700), `outline` (Sage 200), `destructive` (Red 600), `ghost`, `link`, `sprout` (Lime). |
| `Card` | `frontend/src/components/ui/card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` with `#e2ece5` borders and soft shadows. |
| `Badge` | `frontend/src/components/ui/badge.tsx` | Variants: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `lime`, `forest`. |
| `Tabs` | `frontend/src/components/ui/tabs.tsx` | Segmented control with light sage background and active white pill. |
| `Dialog` | `frontend/src/components/ui/dialog.tsx` | Floating accessible modal with backdrop blur (`bg-forest-950/40`) and smooth enter animations. |
| `Table` | `frontend/src/components/ui/table.tsx` | Horizontal scroll wrapper (`overflow-x-auto`) with mint header (`bg-sage-100/70`) and cell hover highlights. |
| `Input` / `Label` | `frontend/src/components/ui/input.tsx` | Crisp input with subtle leaf-green focus ring (`focus-visible:ring-leaf-600`). |
| `Select` | `frontend/src/components/ui/select.tsx` | Styled dropdown selector matching the botanical palette. |
| `Progress` | `frontend/src/components/ui/progress.tsx` | Rounded progress bar with smooth leaf-green fill transition. |
| `Sheet` | `frontend/src/components/ui/sheet.tsx` | Slide-out drawer for 100% mobile and tablet responsiveness. |
| `Alert` | `frontend/src/components/ui/alert.tsx` | Notification banners with `default`, `destructive`, `warning`, `success`, and `forest` variants. |
| `Separator` | `frontend/src/components/ui/separator.tsx` | Structural dividing rules. |

---

## 3. Responsive Layout & Mobile Experience

The interface is engineered for responsiveness across all screen dimensions:
- **Mobile (< 768px)**:
  - Header displays twin-leaf logo, title, and a **hamburger menu button**.
  - Clicking hamburger opens the slide-out **`<Sheet>` Navigation Drawer** with direct access to all 7 modules.
  - KPI metric cards automatically collapse to a single-column layout (`grid-cols-1`).
  - All data tables are wrapped in smooth horizontal scroll containers (`overflow-x-auto`) with minimum table widths to prevent awkward text wrapping.
  - Floating dialogs fit comfortably on mobile screens with scrollable content bodies (`max-h-[90vh]`).
- **Tablet (768px - 1024px)**:
  - 2-column grid for metric cards (`grid-cols-2`).
  - 2-column layout for the 6-stage Lineage Explorer cards.
- **Desktop (> 1024px)**:
  - Full horizontal tab strip with icon badges.
  - 4-column metric cards (`lg:grid-cols-4`).
  - 3-column / 6-stage lineage provenance grid with vertical chronological timeline.
  - Full-width Vis.js interactive physics canvas.

---

## 4. Dual Frontend Implementations

```
                              ┌───────────────────────────┐
                              │     FastAPI Backend       │
                              │     http://127.0.0.1:8000 │
                              └─────────────┬─────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Embedded Zero-Node SPA  │                 │    Standalone Next.js     │
       │   `backend/app/static/`   │                 │        `frontend/`        │
       ├───────────────────────────┤                 ├───────────────────────────┤
       │ • Pure HTML5 + JS (ES6)   │                 │ • Next.js 14 App Router   │
       │ • React 18 + Babel CDN    │                 │ • TypeScript & React 18   │
       │ • Tailwind CSS CDN        │                 │ • Tailwind CSS + Lucide   │
       │ • Vis.js Network CDN      │                 │ • shadcn/ui Components    │
       │ • Served by FastAPI at /  │                 │ • Dev Server: Port 3000   │
       │ • Zero NPM friction       │                 │ • Production SSR/SSG ready│
       └───────────────────────────┘                 └───────────────────────────┘
```

Both implementations share identical visual styling, color tokens, and workflows, ensuring that evaluators running `python backend/run.py` experience the exact same high-polish light-mode GovTech interface as frontend engineers running the Next.js application.

---

## 5. Running the Frontends

### Option A: Embedded Live SPA (Instant, Zero Setup)
```bash
python backend/run.py
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in any browser.

### Option B: Next.js 14 Production App
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with hot module reloading.
