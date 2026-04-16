## STR Magic – Architecture & Developer Guide

### Overview
STR Magic evaluates a property address, fetches market metrics (ADR, Occupancy, Seasonality, Comps Strength), and renders a Pro Forma card. It uses Next.js App Router with a clean separation of concerns:

- View (React components in `app/`) consume a ViewModel.
- ViewModel (`lib/viewmodels/`) manages UI state, side-effects, and user actions.
- Services (`lib/services/`) encapsulate vendor integrations (e.g., AirDNA).
- Domain (`lib/types.ts`, `lib/evaluate.ts`) defines types and core calculations.
- API routes (`app/api/*`) expose server endpoints to the ViewModel.

### Directory Structure
- `app/`
  - `page.tsx`: Main view rendering search UI, Pro Forma, Eligibility, Comps.
  - `api/evaluate/route.ts`: Server endpoint merging seeded comps, pro forma, and market metrics.
  - `api/places/*`: Google Places Autocomplete and Details proxy routes.
- `lib/`
  - `types.ts`: Shared domain/types (ProForma, MarketMetrics, EvaluateResponse, etc.).
  - `evaluate.ts`: Core utilities (comps generation, pro forma compute, AirDNA fetch + fallback).
  - `viewmodels/useEvaluateViewModel.ts`: MVVM ViewModel hook for the search/evaluate flow.
  - `services/airdna.ts`: Thin AirDNA service wrapper.
- `components/`
  - `ThemeToggle.tsx`: UI theme toggle.

### MVVM
- View = `app/page.tsx`: Renders UI only; delegates logic to ViewModel.
- ViewModel = `useEvaluateViewModel`: Owns state (`address`, `suggestions`, `loading`, `data`), exposes actions (`onSearch`, `onSelectSuggestion`, etc.), and performs debounced autocomplete effects.
- Model/Domain = `types.ts`, compute helpers in `evaluate.ts`.

### Data Flow
1) User types address → ViewModel debounces and calls `/api/places/autocomplete`.
2) User selects suggestion → ViewModel fetches `/api/places/details` for formatting.
3) User submits → ViewModel requests `/api/evaluate?address=...`.
4) Evaluate API:
   - Builds seeded comps → computes naive pro forma (for UI context).
   - Retrieves Market Metrics via AirDNA (or seeded fallback when no key).
   - Returns `EvaluateResponse` with `market` and `proForma`.
5) View renders Pro Forma card from `market`; RevPAR is computed client-side (ADR × Occupancy).

### Environment Variables
- `AIRDNA_API_KEY`: AirDNA Bearer token. Omit for seeded fallback.
- `AIRDNA_API_BASE_URL`: Defaults to `https://api.airdna.co`.
- `GOOGLE_MAPS_API_KEY`: Required for Places Autocomplete/Details.

For local dev, create `.env.local`:
```bash
AIRDNA_API_KEY=YOUR_AIRDNA_KEY
AIRDNA_API_BASE_URL=https://api.airdna.co
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_KEY
```

On Vercel, add the same names in Project → Settings → Environment Variables for Preview and Production.

### Development
1) Install Node.js LTS and run:
```bash
npm install
npm run dev
```
2) Open `http://localhost:3000`.

### Key Files (annotated)
Pro Forma comes from `market`:
- `EvaluateResponse.market.projectedAnnualRentRevenue` → Gross Revenue (/year)
- `EvaluateResponse.market.adr` → ADR (/night)
- `EvaluateResponse.market.occupancy` → Occupancy (%)
- RevPAR (client) → `adr * occupancy`
- `EvaluateResponse.market.seasonalityIndex` → 12-month multipliers
- `EvaluateResponse.market.compsStrength` → `{ count, medianDistanceMiles? }`

Server retrieval:
- `app/api/evaluate/route.ts` uses `fetchAirDNAMarketMetrics` (with env-configured API key) and merges with seeded pro forma.

### Code Style & Principles
- Strong typing in public APIs and ViewModel surface.
- MVVM separation: ViewModel owns async flows; View is declarative.
- Services isolate vendor logic; swapping sources won’t affect Views.
- Minimal global state; per-view state contained in the ViewModel.

### Extending
- Add new vendor metrics: implement a new service, map to `MarketMetrics`, and update evaluate API.
- Add more UI cards: create a dedicated ViewModel or extend current one while keeping a narrow, typed surface.

### Support
Ensure API keys are set. Without AirDNA key, the app gracefully falls back to a seeded deterministic estimate so the UI remains functional.

