/* =========================================================
   LOGO SIDEBAR + SCROLLBAR BONITA
========================================================= */

/* contenedor del logo */
.sidebar-brand-logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 14px 10px;
  min-height: 92px;
}

/* logo */
.sidebar-brand-logo {
  display: block;
  width: 100%;
  max-width: 138px;
  height: auto;
  object-fit: contain;
  opacity: 1 !important;
  filter: none !important;
  mix-blend-mode: normal !important;
}

/* En modo oscuro: logo claro bien visible */
[data-theme="dark"] .sidebar-brand-logo {
  filter: brightness(1.05) contrast(1.05) !important;
}

/* En modo claro: logo oscuro bien visible */
[data-theme="light"] .sidebar-brand-logo {
  filter: none !important;
}

/* texto del sidebar en modo claro: más contraste */
[data-theme="light"] .sidebar .nav-link,
[data-theme="light"] .sidebar a,
[data-theme="light"] .sidebar button,
[data-theme="light"] .sidebar .section-title,
[data-theme="light"] .sidebar .section-label,
[data-theme="light"] .sidebar .profile-name,
[data-theme="light"] .sidebar .profile-role {
  opacity: 1 !important;
}

[data-theme="light"] .sidebar .nav-link,
[data-theme="light"] .sidebar a,
[data-theme="light"] .sidebar button {
  color: #5b4757 !important;
}

[data-theme="light"] .sidebar .nav-link:hover {
  color: #2a1f29 !important;
  background: rgba(236, 88, 214, 0.10) !important;
}

[data-theme="light"] .sidebar .nav-link.active {
  color: #721a68 !important;
  background: rgba(228, 166, 220, 0.75) !important;
}

/* =========================================================
   SCROLLBAR GENERAL
========================================================= */

/* Firefox */
html,
body,
.sidebar,
.sidebar-nav,
.main-area {
  scrollbar-width: thin;
}

[data-theme="dark"] html,
[data-theme="dark"] body,
[data-theme="dark"] .sidebar,
[data-theme="dark"] .sidebar-nav,
[data-theme="dark"] .main-area {
  scrollbar-color: #6e2f67 #1e171d;
}

[data-theme="light"] html,
[data-theme="light"] body,
[data-theme="light"] .sidebar,
[data-theme="light"] .sidebar-nav,
[data-theme="light"] .main-area {
  scrollbar-color: #c88ac1 #f1e8ef;
}

/* Chrome / Edge / Opera */
html::-webkit-scrollbar,
body::-webkit-scrollbar,
.sidebar::-webkit-scrollbar,
.sidebar-nav::-webkit-scrollbar,
.main-area::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

[data-theme="dark"] html::-webkit-scrollbar-track,
[data-theme="dark"] body::-webkit-scrollbar-track,
[data-theme="dark"] .sidebar::-webkit-scrollbar-track,
[data-theme="dark"] .sidebar-nav::-webkit-scrollbar-track,
[data-theme="dark"] .main-area::-webkit-scrollbar-track {
  background: #1b151b;
  border-radius: 10px;
}

[data-theme="dark"] html::-webkit-scrollbar-thumb,
[data-theme="dark"] body::-webkit-scrollbar-thumb,
[data-theme="dark"] .sidebar::-webkit-scrollbar-thumb,
[data-theme="dark"] .sidebar-nav::-webkit-scrollbar-thumb,
[data-theme="dark"] .main-area::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8c3d82, #5f2858);
  border-radius: 10px;
  border: 2px solid #1b151b;
}

[data-theme="light"] html::-webkit-scrollbar-track,
[data-theme="light"] body::-webkit-scrollbar-track,
[data-theme="light"] .sidebar::-webkit-scrollbar-track,
[data-theme="light"] .sidebar-nav::-webkit-scrollbar-track,
[data-theme="light"] .main-area::-webkit-scrollbar-track {
  background: #efe5ed;
  border-radius: 10px;
}

[data-theme="light"] html::-webkit-scrollbar-thumb,
[data-theme="light"] body::-webkit-scrollbar-thumb,
[data-theme="light"] .sidebar::-webkit-scrollbar-thumb,
[data-theme="light"] .sidebar-nav::-webkit-scrollbar-thumb,
[data-theme="light"] .main-area::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d28dc8, #b967aa);
  border-radius: 10px;
  border: 2px solid #efe5ed;
}