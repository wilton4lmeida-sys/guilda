# Project Organization (Prompt-Friendly)

This project was reorganized to make future changes easier and safer.

## Structure

- `dashboard.html`
  - Keeps only page markup (HTML skeleton + components/modals).
  - References external CSS and JS files.
- `assets/css/dashboard.css`
  - All dashboard styles and design tokens.
  - Best place for visual changes (colors, spacing, typography, card styles).
- `assets/js/dashboard.js`
  - All dashboard behavior (state, rendering, events, Supabase integration, business rules).

## How To Change By Prompt

- Visual/theme changes:
  - Edit only `assets/css/dashboard.css`.
  - Prefer changing `:root` variables first (tokens), then component classes.
- UI text/content changes:
  - Edit `dashboard.html` for static text/structure.
  - Edit `assets/js/dashboard.js` when text is generated dynamically.
- Rules/logic/data flow changes:
  - Edit `assets/js/dashboard.js`.
  - Keep function names stable where possible to avoid breaking inline handlers in HTML.

## Safe Editing Rules

- Keep script as module in HTML:
  - `<script type="module" src="assets/js/dashboard.js"></script>`
- Keep stylesheet linked in HTML:
  - `<link rel="stylesheet" href="assets/css/dashboard.css" />`
- If adding new JS files later, import them from `assets/js/dashboard.js`.

## Suggested Next Modularization (optional)

1. Split `assets/js/dashboard.js` into:
   - `assets/js/config.js` (Supabase URL/key and constants)
   - `assets/js/data.js` (demo data and static lists)
   - `assets/js/ui.js` (render functions)
   - `assets/js/features/*.js` (missions, ranking, diary, meetings)
2. Keep one entrypoint file (`dashboard.js`) that wires everything.
