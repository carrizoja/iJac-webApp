# Shortcuts from Hoy

Objective: start the most common tasks from Hoy and from the keyboard. Branch: `feat/web-hoy-shortcuts`. Delivery: single PR with work-unit commits (web only, `--web-only`). Test runner: vitest (`apps/web`).

## Specs

User choice, verbatim: "Buttons + letters, off switch (Recommended)": "Hoy buttons, plus N = nueva orden, C = nuevo cliente, / = focus search on list pages, ignored while typing, listed in a small help, and an on/off switch in Settings (on by default)."

- **S1 — Hoy buttons.** "Nueva orden" and "Nuevo cliente" on Hoy open the create form directly (`/work-orders?new=1`, `/clients?new=1`).
- **S2 — Letters.** N = nueva orden, C = nuevo cliente, / = focus search on list pages. Ignored while typing (inputs, textareas, selects, editable text), with Ctrl/Alt/Meta held, during IME composition, and while a dialog is open.
- **S3 — Listed in a small help.** Settings lists the shortcuts; the Hoy buttons show their key.
- **S4 — Off switch.** A switch in Settings turns the letters on and off; on by default, remembered in this browser. (WCAG 2.1.4: single-character shortcuts must be possible to turn off.)

## Tasks

- [x] T1 — S1 — inline — `?new=1` opens the create form in Órdenes and Clientes; Hoy buttons. RED: 3 new tests failed; GREEN: 636 web tests. Commit: T1 below.
- [x] T2 — S2, S4 — inline — shortcut listener in the app shell and the stored preference. RED: 17 new tests failed (modules missing, wiring); GREEN: 653 web tests.
- [ ] T3 — S3, S4 — inline — Settings section (switch and list); key hints on the Hoy buttons.

Route evidence: the tasks depend on each other and each is under the parallel threshold, so no Writer trigger; work runs inline.

## Log

- L1 (2026-11-11, user): "Go with shorcuts from Hoy"
- L2 (2026-11-11, user): "Buttons + letters, off switch (Recommended)"
- L3: modern-web-guidance `switch`: use `<input type="checkbox" switch>`; the guide's polyfill for Chrome/Firefox would add a dependency (high-risk item 5), so it is left out: those browsers show a plain checkbox, which is still labelled and keyboard operable.
