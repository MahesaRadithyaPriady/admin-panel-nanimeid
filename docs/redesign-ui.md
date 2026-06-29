# NanimeID Admin Panel — Redesign Spec
> **Neo-Brutalism · Black & White · Mobile-First**
>
> Dokumen ini hanya mencakup perubahan **visual/styling**. Tidak ada perubahan pada API client, logika auth, state management, routing, atau integrasi backend apapun.

---

## 1. Filosofi Desain

### Prinsip Utama

**Neo-Brutalism** bukan sekadar estetika — ini adalah sikap. Setiap elemen harus jujur: border yang terlihat tebal, shadow yang tidak berpura-pura jadi elevasi, dan tipografi yang tidak bersembunyi di balik efek glassmorphism. Panel admin ini bukan aplikasi konsumen, ini alat kerja — tampilannya harus terasa seperti **software profesional yang tidak membuang-buang perhatian pengguna**.

**Hitam-Putih** dipilih bukan karena minimalis, tapi karena **kontras adalah informasi**. Di admin panel yang penuh data, warna sebaiknya hanya muncul ketika ia membawa makna — status badges, error states, dan satu saja accent.

**Mobile-First** berarti kita desain untuk layar 375px terlebih dahulu, lalu scale up. Bukan desktop yang "disusutkan".

### Yang Dihapus dari Desain Lama

| Elemen Lama | Alasan Dihapus |
|---|---|
| Glassmorphism (backdrop-filter blur) | Berat di GPU mobile, tidak informatif |
| Animated gradient background (15s) | Mengalihkan perhatian, memboroskan baterai |
| Drop shadow blur (`box-shadow: ...blur...`) | Diganti hard shadow neo-brutal |
| Semi-transparent panel backgrounds | Sulit dibaca di outdoor/direct sunlight |
| Framer Motion stagger pada setiap list | Dipertahankan hanya di page transition, bukan per-row |
| `glow-primary` box-shadow | Tidak ada glow di B&W system |
| `animate-float` | Dekoratif, tidak bermakna |
| Gradient status badges | Diganti solid fill B&W badges |

### Yang Dipertahankan

- Struktur komponen (semua logic, props, hooks)
- `framer-motion` — dipakai tapi lebih terkontrol (hanya page entry, bukan per-item)
- `react-hot-toast` — hanya styling toast yang berubah
- `chart.js` — hanya theming (B&W palette)
- `lucide-react` — ikon tetap, ukuran disesuaikan

---

## 2. Token System

### 2.1 Color Palette

```css
/* globals.css — GANTI seluruh blok :root dengan ini */
:root {
  /* Core B&W */
  --color-black:     #000000;
  --color-white:     #FFFFFF;
  
  /* Grayscale */
  --color-gray-50:   #FAFAFA;
  --color-gray-100:  #F5F5F5;
  --color-gray-200:  #E5E5E5;
  --color-gray-300:  #D4D4D4;
  --color-gray-400:  #A3A3A3;
  --color-gray-500:  #737373;
  --color-gray-600:  #525252;
  --color-gray-700:  #404040;
  --color-gray-800:  #262626;
  --color-gray-900:  #171717;
  
  /* Semantic */
  --background:      var(--color-white);
  --foreground:      var(--color-black);
  --surface:         var(--color-gray-50);
  --surface-raised:  var(--color-white);
  --border:          var(--color-black);
  --border-muted:    var(--color-gray-300);
  --muted:           var(--color-gray-500);
  --muted-bg:        var(--color-gray-100);
  
  /* Neo-Brutalism Signature */
  --shadow-sm:   2px 2px 0 var(--color-black);
  --shadow-md:   4px 4px 0 var(--color-black);
  --shadow-lg:   6px 6px 0 var(--color-black);
  --shadow-xl:   8px 8px 0 var(--color-black);

  /* Status Colors — satu-satunya warna non-B&W */
  --status-success-bg:   #000000;
  --status-success-text: #FFFFFF;
  --status-warning-bg:   #404040;
  --status-warning-text: #FFFFFF;
  --status-error-bg:     #000000;
  --status-error-text:   #FFFFFF;
  --status-info-bg:      #E5E5E5;
  --status-info-text:    #000000;
  --status-neutral-bg:   #F5F5F5;
  --status-neutral-text: #404040;
}

/* Dark mode — invert */
@media (prefers-color-scheme: dark) {
  :root {
    --background:      var(--color-gray-900);
    --foreground:      var(--color-white);
    --surface:         var(--color-gray-800);
    --surface-raised:  var(--color-gray-700);
    --border:          var(--color-white);
    --border-muted:    var(--color-gray-600);
    --muted:           var(--color-gray-400);
    --muted-bg:        var(--color-gray-800);
    
    --shadow-sm:   2px 2px 0 rgba(255,255,255,0.6);
    --shadow-md:   4px 4px 0 rgba(255,255,255,0.6);
    --shadow-lg:   6px 6px 0 rgba(255,255,255,0.6);
    --shadow-xl:   8px 8px 0 rgba(255,255,255,0.6);
  }
}

/* Manual dark mode toggle (via [data-theme="dark"]) */
[data-theme="dark"] {
  --background:      var(--color-gray-900);
  --foreground:      var(--color-white);
  --surface:         var(--color-gray-800);
  --surface-raised:  var(--color-gray-700);
  --border:          var(--color-white);
  --border-muted:    var(--color-gray-600);
  --muted:           var(--color-gray-400);
  --muted-bg:        var(--color-gray-800);
  
  --shadow-sm:   2px 2px 0 rgba(255,255,255,0.6);
  --shadow-md:   4px 4px 0 rgba(255,255,255,0.6);
  --shadow-lg:   6px 6px 0 rgba(255,255,255,0.6);
  --shadow-xl:   8px 8px 0 rgba(255,255,255,0.6);
}
```

> **Catatan Dark Mode**: Logika theme toggle di `layout.js` tidak berubah — hanya ganti dari class `dark` ke `data-theme="dark"` pada `<html>` element jika perlu, atau sesuaikan selector CSS di atas dengan mekanisme yang sudah ada.

---

### 2.2 Typography

```css
/* Tambahkan di globals.css — @import di paling atas */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

:root {
  /* Font Families */
  --font-display:  'Space Grotesk', system-ui, sans-serif;
  --font-body:     'Space Grotesk', system-ui, sans-serif;
  --font-mono:     'Space Mono', 'JetBrains Mono', monospace;
  
  /* Scale */
  --text-xs:    0.75rem;    /* 12px */
  --text-sm:    0.875rem;   /* 14px */
  --text-base:  1rem;       /* 16px */
  --text-lg:    1.125rem;   /* 18px */
  --text-xl:    1.25rem;    /* 20px */
  --text-2xl:   1.5rem;     /* 24px */
  --text-3xl:   1.875rem;   /* 30px */
  --text-4xl:   2.25rem;    /* 36px */
  
  /* Weights */
  --weight-normal:  400;
  --weight-medium:  500;
  --weight-semibold: 600;
  --weight-bold:    700;
  
  /* Line Heights */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

**Rationale**: Space Grotesk memberikan karakter teknikal-geometrik yang cocok untuk admin panel. Space Mono untuk semua elemen data (ID, kode, angka) memberikan kesan utilitarian yang kuat.

---

### 2.3 Spacing & Border

```css
:root {
  /* Spacing (4px base) */
  --space-1:   0.25rem;   /* 4px */
  --space-2:   0.5rem;    /* 8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */
  
  /* Border */
  --border-width:   2px;
  --border-width-thick: 3px;
  --radius:         0px;       /* Zero radius = neo-brutal */
  --radius-sm:      2px;       /* Hanya untuk input focus ring */
}
```

---

### 2.4 Breakpoints

```
xs:   375px   (target minimum — iPhone SE)
sm:   480px
md:   768px   (tablet portrait — sidebar muncul)
lg:   1024px  (sidebar fixed, layout full)
xl:   1280px
2xl:  1440px
```

---

## 3. CSS Classes — Penggantian Lengkap

Hapus semua class lama di `globals.css` dan ganti dengan blok berikut:

```css
/* ======================
   BASE
   ====================== */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
}

/* ======================
   LAYOUT PRIMITIVES
   ====================== */

/* Menggantikan .gradient-bg */
.app-bg {
  background-color: var(--background);
  min-height: 100dvh;
}

/* Menggantikan .glass-card */
.card {
  background-color: var(--surface-raised);
  border: var(--border-width) solid var(--border);
  box-shadow: var(--shadow-md);
  padding: var(--space-4);
  
  /* Transisi shadow saat hover — satu-satunya animasi subtle yang dipertahankan */
  transition: box-shadow 0.1s ease, transform 0.1s ease;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translate(-1px, -1px);
}

.card--flat {
  box-shadow: none;
}

.card--lg {
  padding: var(--space-6);
}

/* ======================
   TYPOGRAPHY
   ====================== */
.page-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
}

@media (min-width: 768px) {
  .page-title {
    font-size: var(--text-3xl);
  }
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: var(--border-width) solid var(--border);
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-4);
}

.label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

/* ======================
   FORM ELEMENTS
   ====================== */

/* Menggantikan .modern-input dan .inp */
.input {
  width: 100%;
  height: 44px;                       /* Touch target minimum */
  padding: 0 var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  background-color: var(--surface-raised);
  color: var(--foreground);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius);
  outline: none;
  transition: box-shadow 0.1s ease;
  -webkit-appearance: none;
}

.input:focus {
  box-shadow: var(--shadow-sm);
}

.input::placeholder {
  color: var(--muted);
  font-weight: var(--weight-normal);
}

.input:disabled {
  background-color: var(--muted-bg);
  color: var(--muted);
  cursor: not-allowed;
}

.input--error {
  border-color: var(--color-black);
  background-color: var(--color-gray-100);
}

/* Menggantikan .sel */
.select {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-8) 0 var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  background-color: var(--surface-raised);
  color: var(--foreground);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  /* Arrow icon */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  transition: box-shadow 0.1s ease;
}

.select:focus {
  box-shadow: var(--shadow-sm);
}

textarea.input {
  height: auto;
  min-height: 100px;
  padding: var(--space-3);
  resize: vertical;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--foreground);
  font-weight: var(--weight-bold);
}

/* ======================
   BUTTONS
   ====================== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 44px;                        /* Touch target */
  padding: 0 var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: box-shadow 0.1s ease, transform 0.1s ease;
  white-space: nowrap;
  -webkit-user-select: none;
  user-select: none;
}

.btn:active {
  transform: translate(2px, 2px);
  box-shadow: none !important;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* Variant: Primary (hitam) */
.btn--primary {
  background-color: var(--foreground);
  color: var(--background);
  box-shadow: var(--shadow-md);
}
.btn--primary:hover {
  box-shadow: var(--shadow-lg);
  transform: translate(-1px, -1px);
}

/* Variant: Secondary (putih/outline) */
.btn--secondary {
  background-color: var(--background);
  color: var(--foreground);
  box-shadow: var(--shadow-md);
}
.btn--secondary:hover {
  box-shadow: var(--shadow-lg);
  transform: translate(-1px, -1px);
}

/* Variant: Ghost (tanpa border shadow, flat) */
.btn--ghost {
  background-color: transparent;
  color: var(--foreground);
  border-color: transparent;
  box-shadow: none;
}
.btn--ghost:hover {
  background-color: var(--muted-bg);
  border-color: var(--border-muted);
}

/* Variant: Danger */
.btn--danger {
  background-color: var(--color-black);
  color: var(--color-white);
  box-shadow: var(--shadow-md);
}
.btn--danger:hover {
  box-shadow: var(--shadow-lg);
  transform: translate(-1px, -1px);
}

/* Size: Small */
.btn--sm {
  height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
}

/* Size: Large */
.btn--lg {
  height: 52px;
  padding: 0 var(--space-6);
  font-size: var(--text-base);
}

/* Icon-only */
.btn--icon {
  width: 44px;
  padding: 0;
}
.btn--icon.btn--sm {
  width: 36px;
  height: 36px;
}

/* ======================
   STATUS BADGES
   ====================== */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: var(--border-width) solid currentColor;
  white-space: nowrap;
}

/* Status Variants */
.badge--success {
  background-color: var(--status-success-bg);
  color: var(--status-success-text);
  border-color: var(--status-success-bg);
}
.badge--warning {
  background-color: var(--status-warning-bg);
  color: var(--status-warning-text);
  border-color: var(--status-warning-bg);
}
.badge--error {
  background-color: var(--status-error-bg);
  color: var(--status-error-text);
  border-color: var(--status-error-bg);
}
.badge--info {
  background-color: var(--status-info-bg);
  color: var(--status-info-text);
  border-color: var(--color-gray-300);
}
.badge--neutral {
  background-color: var(--status-neutral-bg);
  color: var(--status-neutral-text);
  border-color: var(--border-muted);
}

/* ======================
   TABLE
   ====================== */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: var(--border-width) solid var(--border);
  box-shadow: var(--shadow-md);
  -webkit-overflow-scrolling: touch;
}

.table {
  width: 100%;
  min-width: 600px;           /* Prevents collapse on mobile — horizontal scroll */
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table thead {
  background-color: var(--foreground);
  color: var(--background);
}

.table th {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: left;
  white-space: nowrap;
}

.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-muted);
  vertical-align: middle;
}

.table tbody tr {
  background-color: var(--surface-raised);
  transition: background-color 0.1s ease;
}

.table tbody tr:hover {
  background-color: var(--muted-bg);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

/* Mobile: stack table sebagai cards — hanya untuk table kritis */
.table--stacked-mobile {
  /* Diaktifkan via JS/className tergantung konten */
}

@media (max-width: 767px) {
  .table--stacked-mobile,
  .table--stacked-mobile thead,
  .table--stacked-mobile tbody,
  .table--stacked-mobile th,
  .table--stacked-mobile td,
  .table--stacked-mobile tr {
    display: block;
  }
  .table--stacked-mobile thead tr {
    display: none;
  }
  .table--stacked-mobile tbody tr {
    border: var(--border-width) solid var(--border);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-3);
    padding: var(--space-3);
  }
  .table--stacked-mobile td {
    border-bottom: 1px solid var(--border-muted);
    padding: var(--space-2) 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }
  .table--stacked-mobile td:last-child {
    border-bottom: none;
  }
  .table--stacked-mobile td::before {
    content: attr(data-label);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    flex-shrink: 0;
  }
}

/* ======================
   PAGINATION
   ====================== */
.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  border: var(--border-width) solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  cursor: pointer;
  transition: box-shadow 0.1s ease, transform 0.1s ease;
}

.pagination__btn:hover {
  box-shadow: var(--shadow-sm);
  transform: translate(-1px, -1px);
}

.pagination__btn--active {
  background-color: var(--foreground);
  color: var(--background);
  box-shadow: var(--shadow-sm);
}

.pagination__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ======================
   SEARCH & FILTER BAR
   ====================== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  background-color: var(--muted-bg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-4);
}

.filter-bar .input,
.filter-bar .select {
  flex: 1 1 160px;
  max-width: 280px;
}

@media (max-width: 479px) {
  .filter-bar .input,
  .filter-bar .select {
    flex: 1 1 100%;
    max-width: 100%;
  }
}

/* ======================
   MODAL / DIALOG
   ====================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;     /* Mobile: sheet dari bawah */
  justify-content: center;
  z-index: 100;
  padding: 0;
}

@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
    padding: var(--space-4);
  }
}

.modal {
  background-color: var(--surface-raised);
  border: var(--border-width) solid var(--border);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-height: 90dvh;
  overflow-y: auto;
  padding: var(--space-6);
  position: relative;
  border-radius: 0;
}

@media (min-width: 768px) {
  .modal {
    width: auto;
    min-width: 480px;
    max-width: 720px;
    max-height: 85vh;
  }
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-width) solid var(--border);
}

.modal__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
}

.modal__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
}

/* ======================
   TABS
   ====================== */
.tabs {
  display: flex;
  border-bottom: var(--border-width) solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
  gap: 0;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  border: none;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.1s ease, border-color 0.1s ease;
  margin-bottom: -2px;
}

.tab:hover {
  color: var(--foreground);
}

.tab--active {
  color: var(--foreground);
  border-bottom-color: var(--foreground);
}

/* ======================
   STAT CARDS (Dashboard metrics)
   ====================== */
.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background-color: var(--surface-raised);
  border: var(--border-width) solid var(--border);
  box-shadow: var(--shadow-md);
}

.stat-card__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.stat-card__value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  line-height: 1;
  letter-spacing: -0.02em;
}

.stat-card__delta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

@media (min-width: 768px) {
  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }
}

@media (min-width: 1024px) {
  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* ======================
   TOAST (react-hot-toast override)
   ====================== */
/* Tambahkan ke toastOptions di <Toaster> component */
/*
  toastOptions={{
    style: {
      background: 'var(--color-black)',
      color: 'var(--color-white)',
      border: '2px solid var(--color-white)',
      borderRadius: '0',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
      fontWeight: '700',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      boxShadow: '4px 4px 0 rgba(255,255,255,0.3)',
    },
    success: { iconTheme: { primary: '#fff', secondary: '#000' } },
    error: { iconTheme: { primary: '#fff', secondary: '#000' } },
  }}
*/

/* ======================
   CHART.JS THEME
   ====================== */
/*
  Konfigurasi Chart.js defaults di file terpisah (misalnya lib/chartDefaults.js):
  
  Chart.defaults.color = 'var(--color-gray-500)';
  Chart.defaults.borderColor = 'var(--color-gray-200)';
  Chart.defaults.font.family = "'Space Mono', monospace";
  Chart.defaults.font.size = 11;

  Untuk dataset colors, gunakan:
  - Primary: '#000000'
  - Secondary: '#404040'
  - Tertiary: '#A3A3A3'
  - Grid: '#E5E5E5'
  - Doughnut: ['#000', '#404040', '#737373', '#A3A3A3', '#D4D4D4']
*/

/* ======================
   SHIMMER LOADING
   ====================== */
.shimmer {
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 25%,
    var(--color-gray-200) 50%,
    var(--color-gray-100) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ======================
   TOGGLE SWITCH
   ====================== */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle__track {
  position: absolute;
  inset: 0;
  background-color: var(--color-gray-300);
  border: var(--border-width) solid var(--border);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.toggle__track::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--color-white);
  border: var(--border-width) solid var(--color-black);
  transition: transform 0.15s ease;
}

.toggle input:checked + .toggle__track {
  background-color: var(--color-black);
}

.toggle input:checked + .toggle__track::after {
  transform: translate(20px, -50%);
}

/* ======================
   UPLOAD ZONE
   ====================== */
.upload-zone {
  border: var(--border-width-thick) dashed var(--border);
  padding: var(--space-8);
  text-align: center;
  cursor: pointer;
  transition: background-color 0.1s ease, box-shadow 0.1s ease;
}

.upload-zone:hover,
.upload-zone--dragging {
  background-color: var(--muted-bg);
  box-shadow: var(--shadow-sm);
}

/* ======================
   CONFIRM DIALOG
   ====================== */
.confirm-dialog {
  padding: var(--space-6);
  background-color: var(--surface-raised);
  border: var(--border-width-thick) solid var(--color-black);
  box-shadow: var(--shadow-xl);
  max-width: 400px;
  width: 100%;
}

.confirm-dialog__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  margin-bottom: var(--space-3);
}

.confirm-dialog__message {
  color: var(--muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
  line-height: var(--leading-relaxed);
}

.confirm-dialog__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

/* ======================
   FRAMER MOTION — REDUCED VARIANTS
   ====================== */
/*
  Ganti containerVariants / itemVariants yang ada dengan:

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
  };

  // Hanya page-level wrap dengan motion.div
  // Hapus stagger per-row di table
  // Pertahankan stagger hanya di dashboard overview cards (max 0.05s delay)
*/
```

---

## 4. Layout Redesign (Mobile-First)

### 4.1 Dashboard Layout — Mobile vs Desktop

#### Mobile (< 768px)

```
┌────────────────────────────────┐
│  ■ NanimeID Admin    [menu][⊙] │  ← Top bar (fixed, 56px)
├────────────────────────────────┤
│                                │
│  [Page Content]                │
│   — padding: 16px              │
│   — cards full-width           │
│   — tables: horizontal scroll  │
│                                │
│                                │
├────────────────────────────────┤
│ [⊞] [👥] [📦] [⚙] [···]      │  ← Bottom nav (fixed, 60px)
└────────────────────────────────┘
```

#### Tablet (768px – 1023px)

```
┌───────┬────────────────────────┐
│       │  [Page Header]         │
│ Side  │──────────────────────  │
│ bar   │                        │
│ (80px │  [Content Area]        │
│ icons │   — padding: 24px      │
│ only) │                        │
└───────┴────────────────────────┘
```

#### Desktop (≥ 1024px)

```
┌──────────┬─────────────────────┐
│          │  [Page Header]      │
│ Sidebar  │─────────────────────│
│  280px   │                     │
│  (fixed) │  [Content Area]     │
│          │   — padding: 32px   │
│          │   — max-width: 1400 │
└──────────┴─────────────────────┘
```

### 4.2 Sidebar Redesign (`Sidebar.js`)

**Perubahan Visual (logika collapse/expand tidak berubah):**

```
Lama:
- bg: rgba(30,41,59,0.8) + backdrop-blur
- border: border-white/10
- hover: bg-white/5
- icons: colored

Baru:
- bg: var(--foreground)           [sidebar = inverted = hitam]
- color: var(--background)        [teks putih di atas hitam]
- border-right: 2px solid var(--border)
- hover item: background rgba(255,255,255,0.1), box-shadow inset
- active item: background rgba(255,255,255,0.15), 
               border-left: 3px solid var(--background)
- font: var(--font-mono), text-xs, uppercase, letter-spacing
- icons: 20px, stroke-width: 2
- section headers: opacity 0.5, text-xs mono uppercase
```

**Bottom Nav (mobile — baru, tidak ada di desain lama):**

5 item utama: Dashboard, Users, Content, Store, Settings
- Height: 60px, border-top: 2px solid black
- Background: var(--foreground)
- Active: border-top: 3px solid white (invert karena bg hitam)
- Labels di bawah icon, font-mono text-[10px]

### 4.3 Top Bar / Mobile Header Redesign

```
Lama: gradient bg, hamburguer icon, theme toggle

Baru:
- height: 56px
- border-bottom: 2px solid var(--border)
- background: var(--surface-raised)
- left: logo text "N/A" (monospace, bold, border box)
- center: current page title (truncated)
- right: [🌙/☀] toggle + [≡] menu trigger
```

---

## 5. Halaman — Perubahan Spesifik

### 5.1 Login Page (`app/page.js`)

```
Lama: animated gradient bg, glass card, gradient buttons

Baru:
┌─────────────────────────────┐
│                             │
│  ■■                         │  ← Logo mark (large, geometric)
│  NANIMEID                   │  ← Font mono, bold, uppercase
│  ADMIN PANEL                │  ← Smaller, muted
│                             │
│  ┌─────────────────────────┐│
│  │ USERNAME / EMAIL        ││  ← .input
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ PASSWORD                ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  MASUK  ►              ││  ← .btn--primary, full width
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘

- Background: checkerboard subtle (B&W, very faint) atau solid --background
- Card: border 2px, shadow 8px 8px 0 #000
- No animation background
```

CSS untuk login card:
```css
.login-card {
  width: 100%;
  max-width: 420px;
  padding: var(--space-8) var(--space-6);
  background: var(--surface-raised);
  border: var(--border-width-thick) solid var(--border);
  box-shadow: var(--shadow-xl);
}

.login-logo-mark {
  width: 48px;
  height: 48px;
  background: var(--foreground);
  color: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-weight: var(--weight-bold);
  font-size: var(--text-xl);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-md);
}
```

---

### 5.2 Dashboard Overview (`/dashboard`)

```
Lama: doughnut charts colored, colored metric cards, gradient

Baru:
┌──────────┬──────────┬──────────┐
│ USERS    │ ANIME    │ EPISODES │  ← .stat-grid (3 col desktop, 2 col mobile)
│ 12,450   │  832     │  4,210   │  ← Large mono numbers
└──────────┴──────────┴──────────┘

┌──────────────────┬─────────────┐
│ DAILY STATS      │ SERVER      │  ← 2 col desktop, stack mobile
│ [Line Chart B&W] │ CPU 34%     │
│                  │ RAM 67%     │
│                  │ [Mini bars] │
└──────────────────┴─────────────┘

┌──────────────────────────────────┐
│ ONLINE USERS (12)                │
│ user1 · user2 · user3 · ...      │  ← Chip/tag style, mono
└──────────────────────────────────┘
```

Chart.js overrides untuk B&W:
- Line chart: hitam line, gray area fill (rgba(0,0,0,0.05))
- Doughnut: ['#000', '#404040', '#737373', '#A3A3A3', '#D4D4D4']
- Grid lines: #E5E5E5
- Tick labels: Space Mono 11px

---

### 5.3 Tabel Halaman (Kelola User, Admin, Topup, dll.)

Pola yang sama untuk semua halaman table-based:

```
┌─────────────────────────────────────────────────────────┐
│ PAGE TITLE                              [+ TAMBAH]      │
├─────────────────────────────────────────────────────────┤
│ [SEARCH...........] [STATUS ▼] [FILTER ▼]  12 result   │  ← .filter-bar
├─────────────────────────────────────────────────────────┤
│ TABLE (horizontal scroll on mobile)                     │
│ USERNAME   EMAIL      STATUS     ACTIONS                │  ← thead: inverted
│ ───────────────────────────────────────────────────────│
│ user123    a@b.com    [ACTIVE]  [✏][🗑]                │
│ user456    c@d.com    [BANNED]  [✏][🗑]                │
├─────────────────────────────────────────────────────────┤
│ ◄ [1] [2] [3] ... [10] ►                12 of 450      │
└─────────────────────────────────────────────────────────┘
```

**Mobile view** — table menggunakan `.table--stacked-mobile`:
- Setiap row jadi card
- Label auto dari `data-label` attribute (inject via JS loop)
- Action buttons: full width di bawah row

**Badge mapping (menggantikan gradient badges)**:
```
ACTIVE / COMPLETED / APPROVED   → .badge--success  (bg: black, text: white)
PENDING / UNDER_REVIEW           → .badge--info     (bg: gray-100, text: black)
SUSPENDED / HIATUS               → .badge--warning  (bg: gray-600, text: white)
BANNED / REJECTED / FAILED       → .badge--error    (bg: black, text: white)
CLOSED / CANCELED                → .badge--neutral  (bg: gray-50, text: gray)
```

---

### 5.4 Form / Modal (Create & Edit)

```
Modal → Bottom sheet di mobile, centered di desktop

┌─────────────────────────────────┐
│ TAMBAH PENGGUNA BARU        [✕] │  ← modal__header
├─────────────────────────────────┤
│ USERNAME                        │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ EMAIL                           │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ STATUS           ▼              │
│ ┌───────────────────────────┐   │
│ │ ACTIVE                    │   │
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│          [BATAL] [SIMPAN ►]     │
└─────────────────────────────────┘
```

---

### 5.5 Sidebar Menu (Ilustrasi)

```
Desktop (280px, bg: black, text: white):
┌──────────────────┐
│ ■■ N/A PANEL    │  ← logo
├──────────────────┤
│ ⊞  DASHBOARD   ◀│  ← active: border-left 3px white
├──────────────────┤
│  MANAJEMEN       │  ← section label (opacity 0.4, uppercase mono)
│ 👥 PENGGUNA      │
│ 👤 ADMINISTRATOR │
│ 💳 TOP UP        │
│ 🚩 MODERASI      │
│ 💬 LIVE CHAT     │
├──────────────────┤
│  TOKO            │
│ 🏪 TOKO UTAMA    │
│ ⭐ PRIME STORE   │
│ ...              │
└──────────────────┘

Collapsed (80px):
┌──────┐
│ ■■   │
├──────┤
│ ⊞   │  ← icon only, tooltip on hover
│ 👥   │
│ 👤   │
│ ...  │
└──────┘

Mobile Bottom Nav (5 items):
┌──────────────────────────────────┐
│  ⊞       👥       📦      ⚙  ··· │
│ HOME    USERS  CONTENT  SET  MORE│
└──────────────────────────────────┘
```

---

### 5.6 Log Analitik & Client Logs

```
Stats row (mobile: 2x2 grid, desktop: 4x1):
┌─────────┬─────────┐
│ TOTAL   │ ERROR   │
│ 1,240   │ 32      │
├─────────┼─────────┤
│ ROUTES  │ QUERIES │
│ 48      │ 12 SLOW │
└─────────┴─────────┘

Log table:
- Level badge: ERROR (black), WARN (gray-600), INFO (gray-100)
- Timestamp: Space Mono, muted
- Stack trace: collapsible, monospace pre block dengan border
```

---

### 5.7 Dashboard Charts — Theme Config

```javascript
// lib/chartDefaults.js (buat file baru)
import { Chart } from 'chart.js';

export function applyChartDefaults() {
  Chart.defaults.color = '#737373';
  Chart.defaults.borderColor = '#E5E5E5';
  Chart.defaults.font.family = "'Space Mono', monospace";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
}

export const bwPalette = {
  primary: '#000000',
  secondary: '#404040',
  tertiary: '#737373',
  quaternary: '#A3A3A3',
  quinary: '#D4D4D4',
};

export const doughnutColors = Object.values(bwPalette);

// Panggil applyChartDefaults() di layout.js atau _app, 1x saja
```

---

### 5.8 Mystery Box & Gacha — Tier Visual

```
Tier badges menggantikan gradient warna-warni:

COMMON    → .badge--neutral  (gray-50, border gray)
RARE      → .badge--info     (gray-200, border gray-400)
EPIC      → .badge--warning  (gray-700, text white)
LEGENDARY → .badge--success  (black, text white, shadow)
MYTHIC    → Inverted + border 3px + shadow lg (special treatment)

.badge--mythic {
  background: var(--color-black);
  color: var(--color-white);
  border: 3px solid var(--color-black);
  box-shadow: var(--shadow-md);
  font-size: var(--text-xs);
}
```

---

### 5.9 Image Upload Component

```
Lama: rounded, colored border

Baru:
┌──────────────────────────────┐
│                              │  ← .upload-zone
│  ↑                           │
│  SERET FILE KE SINI          │  ← mono uppercase
│  atau klik untuk pilih       │  ← body, muted
│                              │
│  PNG · JPG · WEBP · max 5MB  │  ← label mono xs
└──────────────────────────────┘

Preview setelah upload:
┌──────────────────────────────┐
│ [IMG............] [GANTI]   │  ← thumbnail + replace btn
└──────────────────────────────┘
```

---

## 6. Motion & Animation — Revised Rules

| Konteks | Aturan |
|---|---|
| Page entry | `opacity: 0→1, y: 8→0`, duration 200ms. Hanya di `<motion.div>` wrapper level page |
| Row list stagger | **Dihapus dari table rows**. Hanya dashboard overview cards (max 6 cards, 50ms delay) |
| Modal open/close | Scale + opacity, 150ms |
| Sidebar collapse | Width transition 200ms ease |
| Button press | `active:translate(2px, 2px)` via CSS, **tanpa framer motion** |
| Tab switch | Opacity fade 100ms |
| Bottom sheet (mobile modal) | `y: 100%→0`, 200ms |
| `prefers-reduced-motion` | Semua durasi set ke 0ms |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Tailwind Config — Tambahan

Di `tailwind.config.js`, extend dengan custom utilities yang mendukung design system:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono:    ['Space Mono', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0 #000',
        'brutal-md': '4px 4px 0 #000',
        'brutal-lg': '6px 6px 0 #000',
        'brutal-xl': '8px 8px 0 #000',
        'brutal-sm-inv': '2px 2px 0 rgba(255,255,255,0.6)',
        'brutal-md-inv': '4px 4px 0 rgba(255,255,255,0.6)',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '2px',
      },
      colors: {
        border: '#000000',
        'border-muted': '#D4D4D4',
        surface: '#FAFAFA',
      },
    },
  },
};
```

Penggunaan di JSX (jika lebih suka Tailwind daripada custom class):

```jsx
// Card neo-brutal
<div className="bg-white border-2 border-black shadow-brutal-md hover:shadow-brutal-lg hover:-translate-x-px hover:-translate-y-px transition-all duration-100">

// Button primary
<button className="h-11 px-4 bg-black text-white border-2 border-black font-bold uppercase text-sm tracking-wide shadow-brutal-md hover:shadow-brutal-lg hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-100">

// Status badge
<span className="px-2 py-0.5 bg-black text-white border-2 border-black font-mono text-xs font-bold uppercase tracking-wide">
  ACTIVE
</span>
```

---

## 8. Responsive Grid System

### Content Area Layout

```css
.content-area {
  width: 100%;
  padding: var(--space-4);
}

@media (min-width: 768px) {
  .content-area {
    padding: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .content-area {
    padding: var(--space-8);
    max-width: 1400px;
  }
}

/* 2-column layout (form + preview, detail + sidebar) */
.grid-2col {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid-2col {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
  }
}

/* 2-column asimetris (content + sidebar) */
.grid-main-aside {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 1024px) {
  .grid-main-aside {
    grid-template-columns: 1fr 320px;
    gap: var(--space-6);
  }
}
```

---

## 9. Aksesibilitas (a11y)

Perubahan visual harus tetap aksesibel:

| Requirement | Implementasi |
|---|---|
| Contrast ratio | Hitam di atas putih = 21:1 (AAA). Gray-500 di atas putih = 4.6:1 (AA) — pakai hanya untuk dekoratif |
| Focus indicator | `outline: 2px solid var(--foreground); outline-offset: 2px` — tidak boleh dihapus |
| Touch targets | Semua interaktif min 44×44px — sudah ada di `.btn` dan `.input` |
| Icon-only buttons | Harus ada `aria-label` dan `title` |
| Table headers | `<th scope="col">` dipertahankan |
| Bottom nav | `aria-label="Menu utama"`, active item `aria-current="page"` |

```css
/* Focus style global — tambahkan ke globals.css */
:focus-visible {
  outline: 2px solid var(--foreground);
  outline-offset: 2px;
}
```

---

## 10. Checklist Implementasi

Urutan pengerjaan yang disarankan:

### Phase 1 — Foundation (globals.css)
- [ ] Hapus semua CSS class lama (glassmorphism, gradient-bg, glow, float)
- [ ] Tambahkan Google Fonts import (Space Grotesk + Space Mono)
- [ ] Terapkan token CSS variables baru (Section 2.1–2.3)
- [ ] Tambahkan semua class utility baru (Section 3)
- [ ] Tambahkan `prefers-reduced-motion` rule

### Phase 2 — Layout Shell
- [ ] Redesign `Sidebar.js` (bg inverted, border style, hover states)
- [ ] Tambahkan `BottomNav.js` (komponen baru, hanya visible di mobile)
- [ ] Redesign mobile header (height, border, typography)
- [ ] Update `layout.js` — ganti `.gradient-bg` → `.app-bg`, hapus backdrop-blur
- [ ] Update theme toggle — ganti class `dark` → `data-theme="dark"` jika diperlukan

### Phase 3 — Shared Components
- [ ] Update semua tombol → `.btn` variants
- [ ] Update semua input → `.input`, `.select`
- [ ] Update semua status badges → `.badge` variants
- [ ] Update modals → bottom sheet mobile + centered desktop
- [ ] Update tabs → border-bottom style
- [ ] Update `react-hot-toast` options (style overrides di `<Toaster>`)
- [ ] Buat `lib/chartDefaults.js` dan call di layout

### Phase 4 — Pages (urutan berdasarkan traffic/priority)
- [ ] Login page
- [ ] Dashboard overview (stat cards + charts)
- [ ] Kelola User (table + modal)
- [ ] Kelola Admin (table + modal)
- [ ] Top Up (table + filter)
- [ ] Semua halaman table lainnya (pola sama)
- [ ] Mystery Box & Gacha (tier badges)
- [ ] Konten pages (batch upload form)
- [ ] Pengaturan (toggle switches)

### Phase 5 — Polish
- [ ] Tambah `data-label` ke semua `<td>` untuk mobile stacked mode
- [ ] Audit semua framer-motion — hapus per-row stagger
- [ ] Test di 375px, 768px, 1024px, 1440px
- [ ] Test dark mode
- [ ] Audit contrast ratios
- [ ] Test `prefers-reduced-motion`

---

## 11. File yang Dimodifikasi (Visual Only)

| File | Perubahan |
|---|---|
| `src/app/globals.css` | Ganti seluruh isi — token baru, class baru |
| `src/app/page.js` | Login card styling |
| `src/app/dashboard/layout.js` | Hapus `.gradient-bg`, tambah `.app-bg`, mount `BottomNav` |
| `src/components/dashboard/Sidebar.js` | Warna, typography, hover states |
| `src/components/dashboard/Header.js` | Mobile header styling |
| `src/components/dashboard/OverviewSuperadmin.js` | Stat cards, chart colors |
| Semua `page.js` di `/dashboard/*` | Button, badge, table, modal classes |
| `tailwind.config.js` | Extend dengan token baru |

**File baru yang dibuat:**

| File | Isi |
|---|---|
| `src/components/dashboard/BottomNav.js` | Mobile bottom navigation (5 item) |
| `src/lib/chartDefaults.js` | Chart.js global theme config |

**File yang TIDAK disentuh:**

| File | Alasan |
|---|---|
| `src/lib/api.js` | Backend client — tidak diubah sama sekali |
| `src/lib/auth.js` | Auth logic — tidak diubah |
| `src/hooks/useSession.js` | Session hook — tidak diubah |
| `src/lib/numberFormat.js` | Utility — tidak diubah |
| Semua API call dalam page.js | Logic tetap sama |
| `tweetnacl` usage | E2E crypto — tidak diubah |

---

*Dokumen redesign ini adalah spec visual-only. Semua logika bisnis, API call, auth flow, dan state management dipertahankan 100%.*
*Dibuat: Jun 2026 | Target: NanimeID Admin Panel v2*