# XPath Tester Web Application – Development Plan

## 1. Goal & Scope
Build a web‑based tool that lets users paste **XML or HTML**, enter an **XPath**, and instantly see:
* **Matched nodes** in a result pane.
* **In‑place highlighting** of those nodes in the source editor.
* **Formatted / pretty‑printed** source.
* **Live XPath hints** when hovering any element in the source.

The app must feel snappy for documents up to **tens of megabytes** and be easy to share (just open a URL).

---

## 2. Functional Requirements
| ID | Requirement |
|----|-------------|
| F‑1 | XML/HTML **source editor** with syntax highlighting & line numbers. |
| F‑2 | **XPath input** box with history, auto‑complete for axis & functions, and on‑blur validation. |
| F‑3 | **Evaluate** button (or auto‑run with debounce) returning a list of matching nodes and count. |
| F‑4 | Synchronized **inline highlights** of matched nodes in the editor. |
| F‑5 | **Pretty‑Print** / **Minify** toggle for source. |
| F‑6 | **Hover‑to‑XPath**: when the cursor moves over a tag, show the absolute or shorthand XPath and copy‑to‑clipboard. |
| F‑7 | **Download** result nodes as new XML/HTML. |
| F‑8 | **Keyboard shortcuts** for format (⌘⇧F / Ctrl‑Shift‑F) and run (⌘↵ / Ctrl‑Enter). |

---

## 3. Non‑Functional Requirements
| ID | Requirement |
|----|-------------|
| NF‑1 | Handle documents **≥ 10 MB** without blocking the UI. |
| NF‑2 | Initial load time ≤ 2 s over 5 Mbps connection. |
| NF‑3 | Evaluation latency ≤ 150 ms for 1 MB, ≤ 1 s for 10 MB docs. |
| NF‑4 | Works in latest Chrome, Firefox, Edge, Safari; progressive enhancement for older. |
| NF‑5 | Accessible (WCAG 2.1 AA) – ARIA roles, color contrast, keyboard navigation. |

---

## 4. High‑Level Architecture
```text
┌──────────────┐   REST   ┌────────────────┐
│   Frontend   │◀────────▶│  Node.js API   │
│  React + TS  │          │  (Express)     │
└─────▲────────┘          └─────▲──────────┘
      │ WebWorkers               │ (optional, heavy docs)
      ▼                          ▼
Monaco Editor            xmldom + xpath (npm)
Prism.js highlight       Worker Threads / Streams
```

### 4.1 Frontend
* **React + TypeScript** (Vite + SWC for fast dev builds).
* **Monaco Editor** for source; natively supports XML/HTML syntax feedback.
* **Prism.js** overlays for additional match highlighting.
* **XPath parser** in browser: [`fonto‑xpath`](https://github.com/FontoXML/fontoxpath) compiled to WebAssembly or run in a WebWorker.
* State management with **Zustand** (lightweight) or React Context.
* UI framework: **shadcn/ui** + **Tailwind CSS** for utility‑first styling.

### 4.2 Backend (optional path for heavy jobs)
* **Node.js 20 LTS** with **Express**.
* Libraries: `xmldom`, `xpath`, `fast-xml-parser`.
* Endpoint `/evaluate` accepts raw XML/HTML & XPath; streams back JSON list of node XPaths & offsets.
* Runs inside a **worker_thread** to avoid event‑loop blocking.
* **Rate limit** & payload size guard (e.g., 25 MB).

---

## 5. Performance Strategy
1. **Client‑first**: Evaluate in a WebWorker for docs < 5 MB – no network hop.
2. **Chunked Parsing**: Break large files into DOM chunks; evaluate iteratively.
3. **Streaming API**: For > 5 MB, POST to backend; backend streams results so UI can paint incrementally.
4. **Caching** compiled XPath expressions by hash.
5. **Virtual Scrolling** in result list for thousands of matches.
6. **Memoize** pretty‑print results per doc hash.

---

## 6. Security & Privacy
* Run evaluation in **sandboxed iframe** or WebWorker to prevent XSS from malicious markup.
* Sanitize output; encode entities.
* HTTPS everywhere; 10 MB body limit unless authenticated.
* No persistent storage by default; optional localStorage for user prefs.

---

## 7. DevOps & Deployment
* **GitHub Actions** – build, lint, test, Docker image push.
* **Docker** – multi‑stage build with Alpine for backend.
* Deploy to **Vercel** (frontend) + **Fly.io / Render / AWS Fargate** (backend); same origin via reverse proxy.
* Error logging via **Sentry**; metrics via **Prometheus** + Grafana Cloud.

---

## 8. Testing
* **Unit**: Jest + React Testing Library; mock WebWorker.
* **Integration**: Cypress for user flows (evaluate, hover, formatting).
* **Performance**: Lighthouse CI; k6 for backend load.

---

## 9. Milestone Roadmap (6 weeks)
| Week | Deliverable |
|------|-------------|
| 1 | Project scaffold, CI/CD, basic UI skeleton. |
| 2 | Monaco Editor integration; XPath input & live evaluate in WebWorker. |
| 3 | Match highlighting, result pane, keyboard shortcuts. |
| 4 | Pretty‑print, hover‑to‑XPath, clipboard. |
| 5 | Large‑file strategy, backend service & streaming. |
| 6 | Polish: accessibility, responsive layout, docs, public launch. |

---

## 10. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| WebWorker/WASM performance insufficient for 10 MB+ | Offload to backend micro‑service with streaming. |
| XPath library edge‑case bugs | Build test corpus of tricky XPaths and DOMs; add differential tests with two libraries. |
| DOM highlight rendering lag | Use virtual DOM overlay with requestAnimationFrame throttling. |
| Browser compatibility | Use polyfills & Playwright cross‑browser CI. |

---