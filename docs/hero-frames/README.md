# Hero demo frame strips

Playwright captures of the home hero order table across one full animation loop.

- Cadence: one shot every 500ms
- Widths: `1440/`, `768/`, `375/`
- Regenerate: `BASE_URL=http://127.0.0.1:3000 node scripts/capture-hero-frames.mjs`

Each frame was checked for unique order IDs and non-overlapping row bounding boxes.
