fir# ComplyVerse — Full App Build Prompt

Copy everything below into Claude Code, Cursor, or another AI coding agent to scaffold the full application.

---

## PROMPT START

Build **ComplyVerse**, an autonomous compliance intelligence platform. It ingests enterprise documents (contracts, policies, regulatory filings, emails, spreadsheets), synthesizes them into a living knowledge graph, runs multi-agent reasoning over that graph, and answers compliance questions with citation-backed, low-hallucination responses. It also simulates the downstream impact of proposed policy or regulatory changes before they're adopted.

### Tech stack
- **Frontend**: React + TypeScript + Vite, TailwindCSS (utility classes only, no compiler plugins), Framer Motion for micro-interactions
- **Backend**: Node.js + Express (or FastAPI/Python if you prefer stronger NLP tooling)
- **Graph database**: Neo4j (or Kuzu for a lightweight local-first version)
- **Vector store**: pgvector or Qdrant, for the RAG retrieval layer feeding the graph agents
- **LLM**: Claude via the Anthropic API, used for extraction, graph-grounded QA, and simulation reasoning
- **Auth**: simple email/password or SSO stub — this is an internal enterprise tool
- **File parsing**: pdf-parse / unstructured.io for PDFs, xlsx for spreadsheets, an OCR fallback (Tesseract) for scanned documents

### Core data model (graph schema)
Nodes:
- `Party` (companies, individuals, vendors)
- `Document` (source file, with page/clause references)
- `Obligation` (a duty owed by a Party)
- `Regulation` (a law/rule, with jurisdiction and article/section)
- `Deadline` (a date tied to an Obligation)
- `RiskFlag` (a detected conflict, with severity and status)

Relationships:
- `(Party)-[:OWES]->(Obligation)`
- `(Obligation)-[:GOVERNED_BY]->(Regulation)`
- `(Obligation)-[:DUE]->(Deadline)`
- `(Obligation)-[:EVIDENCED_BY]->(Document)`
- `(RiskFlag)-[:AFFECTS]->(Obligation)`
- `(RiskFlag)-[:CONFLICTS_WITH]->(Regulation | Obligation)`

Every node must store a `source_ref` (document name + page/clause) so every graph fact and every LLM answer can cite back to raw evidence. Never let an agent write a node without a source_ref.

### Multi-agent pipeline (this is the product's core logic — build it as four distinct, composable services/functions, not one big prompt)

1. **Ingestion Agent**
   - Input: raw file (PDF, DOCX, XLSX, email export, plain text)
   - Output: structured JSON of extracted entities (Party, Obligation, Regulation, Deadline candidates) with a confidence score and the exact source location
   - Use Claude with a strict JSON schema response — reject and retry if the response isn't valid JSON or is missing source_ref fields

2. **Graph Agent**
   - Input: structured JSON from the Ingestion Agent
   - Output: graph write operations — entity resolution (dedupe "Acme Corp" vs "Acme Corporation"), merge into existing nodes, version old edges instead of overwriting them
   - Must be idempotent — re-running ingestion on the same document should not create duplicate nodes

3. **Simulation Agent**
   - Input: a proposed change in natural language (e.g. "we're adding a US-based sub-processor")
   - Process: retrieves the graph neighborhood relevant to the change, asks Claude to reason over which existing Obligation/Regulation edges would be violated
   - Output: a diff — list of `RiskFlag` nodes with severity, plain-language explanation, and the specific obligation/regulation in conflict

4. **Evidence Agent**
   - Input: any user question or the Simulation Agent's output
   - Process: retrieves graph nodes relevant to the question, drafts an answer, and cross-checks that every claim in the draft maps to a real node with a source_ref
   - Output: final answer text with inline citations (document + clause/page), and a confidence/evidence-match score per claim
   - If a claim can't be traced to a graph node, the agent must drop it rather than answer from general knowledge — this is the near-zero-hallucination guarantee

### API endpoints to build
- `POST /api/documents/upload` — accepts a file, runs Ingestion Agent, returns extracted entities for review before committing to the graph
- `POST /api/documents/commit` — writes reviewed entities into the graph via Graph Agent
- `GET /api/graph/node/:id` — node detail with source_ref and connected edges
- `GET /api/graph/search?q=` — natural-language graph search (Evidence Agent)
- `POST /api/simulate` — body: `{ proposedChange: string }`, returns RiskFlag diff from Simulation Agent
- `GET /api/evidence/feed` — recent RiskFlags and answered questions, most recent first
- `GET /api/graph/export` — full graph as JSON for the 3D visualization

### Frontend pages
1. **Landing/marketing page** — already designed (see design system below); reuse as the public-facing home page
2. **Dashboard** — the 3D knowledge graph as an interactive, not just decorative, visualization (click a node to see its detail panel slide in from the right with source_ref, connected edges, and history)
3. **Upload/Review** — drag-and-drop file upload, shows Ingestion Agent's extracted entities in an editable table before committing to the graph
4. **Simulate** — text input for a proposed change, shows the before/after graph diff (reuse the sim-panel split-view component) with flagged conflicts highlighted
5. **Evidence/Chat** — a chat interface to ask compliance questions, every response rendered with inline citation chips that open the source document at the right page
6. **Risk feed** — a scrollable list of all current RiskFlags, filterable by severity/status/owner

### Design system — MATCH THIS EXACTLY (already built and approved)

Reuse the existing HTML/CSS as the visual reference; port these tokens into Tailwind config / CSS variables:

```css
--bg-void:#05060c;
--bg-deep:#0a0e1c;
--glass-fill:rgba(255,255,255,0.045);
--glass-fill-2:rgba(255,255,255,0.07);
--glass-border:rgba(255,255,255,0.12);
--glass-border-hi:rgba(255,255,255,0.22);
--accent-violet:#8b7bff;
--accent-violet-dim:#5b4fd6;
--accent-cyan:#4fd8ff;
--accent-amber:#ffb454;
--accent-pink:#ff8fc9;
--text-primary:#edeffb;
--text-muted:#8792b0;
--text-faint:#5b6482;
```

- **Fonts**: Sora (display/headings, weight 600–700), Inter (body), JetBrains Mono (citations, confidence scores, data/metadata labels)
- **Glassmorphism everywhere**: `background: var(--glass-fill); border: 1px solid var(--glass-border); backdrop-filter: blur(18px) saturate(140%);` on every card/panel
- **3D effects**:
  - Hero: rotating 3D knowledge graph rendered on canvas (fibonacci-sphere node layout, manual perspective projection — see reference implementation), color-coded nodes by entity type, glowing amber edges for active conflicts
  - Cards: subtle mouse-tracked tilt on hover (`perspective(700px) rotateX() rotateY()`)
- **Motion**: scroll-reveal fade/slide on sections, pulse animation on live-status dots, no more than one orchestrated animation per view (avoid busy/scattered effects)
- **Layout**: dark void background with soft radial violet/cyan glow gradients + faint grid pattern masked to the top of the page
- **Component reference**: agent pipeline cards are numbered (this is a real sequence, keep numbering), evidence cards use a 3-column grid (icon / content / confidence score), simulation view is a strict before/after 2-column split

Reference implementation of the 3D graph canvas (port this logic into a reusable component, but make nodes clickable/interactive instead of decorative):

```javascript
// fibonacci sphere distribution for node positions
const N = 14;
for(let i=0;i<N;i++){
  const y = 1 - (i/(N-1))*2;
  const radius = Math.sqrt(1-y*y);
  const theta = Math.PI*(3-Math.sqrt(5))*i;
  const x = Math.cos(theta)*radius;
  const z = Math.sin(theta)*radius;
}
// manual 3D rotation + perspective projection per frame,
// sort by depth before drawing so overlap looks correct,
// glow via ctx.shadowBlur on filled circles
```

### Build order (do this incrementally, confirm each stage works before moving on)
1. Scaffold repo: frontend (Vite+React+Tailwind) + backend (Express) + Neo4j running locally via Docker
2. Implement Ingestion Agent with a hardcoded set of 3-5 sample contracts, verify structured JSON output with source_refs
3. Implement Graph Agent writes + entity resolution, verify in Neo4j browser
4. Build the Upload/Review page wired to real ingestion
5. Build the Dashboard with the interactive 3D graph pulling from `/api/graph/export`
6. Implement Evidence Agent + Chat page
7. Implement Simulation Agent + Simulate page
8. Polish: risk feed, citation chip → source document viewer, responsive pass, reduced-motion support

### Non-negotiables
- Every fact surfaced anywhere in the UI must be traceable to a `source_ref` — no answer without a citation
- Idempotent ingestion — no duplicate graph nodes on re-upload
- Design system tokens above are fixed; don't drift into default AI-generated look (no cream/terracotta, no generic SaaS blue)

## PROMPT END