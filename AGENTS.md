<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## CashTrap AI architecture

- Financial calculations live in `src/lib/finance/` as pure functions (metrics, risk, alerts, cash impact, parsing); UI never computes ratios itself — keeps logic testable and swappable for a backend.
- `analyzeFinancials()` in `src/lib/finance/analyze.ts` mirrors a future `POST /analyze`; `investigateReport` server function mirrors a future `POST /investigate`. Keep their input/output shapes stable so a FastAPI backend can replace them.
- Missing or non-meaningful inputs are `null`, never 0; risk scores normalise over available indicators (min 4) — prevents misleading scores.
- The AI report receives only the pre-formatted engine fact sheet (`src/lib/report/facts.ts`) and must never compute figures; a deterministic, clearly labelled fallback report exists in `src/lib/report/deterministic.ts`.
- App-wide company/analysis state is a React context (`src/lib/store/analysis-context.tsx`) persisted to localStorage after hydration; no backend database — prototype needs no login.
- Engine rules are covered by `src/test/finance/engine.test.ts`; update it when thresholds or formulas change.
