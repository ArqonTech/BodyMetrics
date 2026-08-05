# DPVC + Altura Prevista Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its Execute flow and Critical Rules.

---

**Spec**: `.specs/features/dpvc-altura-prevista/spec.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: none (`AGENTS.md`/`CLAUDE.md` absent; no `jest.config.*`/`vitest.config.*`; zero `*.test.*`/`*.spec.*` files in repo). Strong-default matrix would exceed repo depth (zero tests exist at any layer) — per repo-depth floor rule, applying build-gate-only across all tasks rather than introducing a new test framework as unrequested scope.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Calc (`src/utils/metrics.ts`) | none | build gate only (matches repo floor: zero existing tests) | n/a | `npm run build` |
| UI components (dashboard, report) | none | build gate only | n/a | `npm run build` |
| Types / config | none | build gate only | n/a | `npm run build` |

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| none (build gate only) | N/A | N/A | no test runner in repo |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Build | Every task (no tests in repo) | `npm run build && npm run lint` |

---

## Execution Plan

### Phase 1: DPVC + Altura Prevista (Sequential — shared type dependency)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

Single phase (≤3-phase rule not triggered) — execute inline, no sub-agent delegation.

---

## Task Breakdown

### T1: Replace PVC calc with DPVC + Altura Prevista in metrics engine

**What**: In `AthleteMetrics` interface and `calculateMetrics`, remove `pvc` field/calc; add `dpvc` (full-precision, gender-branched formula) and `alturaPrevista` (1-decimal rounded, derived from full-precision `dpvc`).
**Where**: `src/utils/metrics.ts`
**Depends on**: None
**Requirement**: DPVC-01, DPVC-04, DPVC-05

**Done when**:
- [ ] `pvc` removed from `AthleteMetrics` interface and return object
- [ ] `dpvc` computed with Homem formula when `mappedAthlete?.gender !== 'Feminino'`, Mulher formula when `=== 'Feminino'` (missing/undefined gender → Homem, per spec assumption)
- [ ] `dpvc` = 0 (sentinel for "no data") only when `sittingHeight`, `altura`, `idade`, or `peso` is missing/<=0 — otherwise full-precision value kept (including negative)
- [ ] `alturaPrevista` computed via IF-ladder on full-precision `dpvc` (not the 2-decimal display value), rounded to 1 decimal with `Math.round(x*10)/10`
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(metrics): replace pvc calc with dpvc and altura prevista`

---

### T2: Update default report selections

**What**: Replace `pvc: true` with `dpvc: true, alturaPrevista: true` in composition item defaults.
**Where**: `src/types/report.ts`
**Depends on**: T1
**Requirement**: DPVC-09

**Done when**:
- [ ] `pvc` key removed, `dpvc` and `alturaPrevista` keys added (in that order) to default composition selections
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(report): add dpvc and altura prevista to default report selections`

---

### T3: Update report options sidebar

**What**: Replace the `pvc` composition option with `dpvc` and `alturaPrevista` options (in that order, same list position).
**Where**: `src/components/ReportOptionsSidebar.tsx`
**Depends on**: T2
**Requirement**: DPVC-09

**Done when**:
- [ ] `{ id: 'pvc', label: 'PVC' }` replaced by `{ id: 'dpvc', label: 'DPVC' }` then `{ id: 'alturaPrevista', label: 'Altura Prevista' }`, same position in the composition array
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(report): expose dpvc and altura prevista options in report sidebar`

---

### T4: Replace PVC card with DPVC + Altura Prevista cards in dashboard

**What**: Remove the PVC `MetricCard`; add a DPVC card (2-decimal display, negative-aware, trend enabled) immediately followed by an Altura Prevista card (1-decimal, `cm`, no trend).
**Where**: `src/pages/AthleteDashboard.tsx`
**Depends on**: T1
**Requirement**: DPVC-01 through DPVC-08

**Done when**:
- [ ] PVC `MetricCard` (title "PVC") removed
- [ ] DPVC card added at the same grid position, title "DPVC", value formatted with 2 decimals allowing negatives (does NOT use the existing `formatNumber` helper's `val <= 0 → '-'` rule — only `-` when input data is missing, i.e. `dpvc` sentinel value from T1), unit omitted (adimensional), trend comparing against `compareMetrics.dpvc` when a comparison eval is selected
- [ ] Altura Prevista card added immediately after DPVC card, title "Altura Prevista", value with 1 decimal, unit `cm`, no `trend` prop
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(dashboard): show dpvc and altura prevista instead of pvc`

---

### T5: Replace PVC entry with DPVC + Altura Prevista in ReportPaper composition list

**What**: Remove the `pvc` entry from the composition metrics array; add `dpvc` and `alturaPrevista` entries at the same position, with negative-aware N/A logic for `dpvc` only.
**Where**: `src/components/ReportPaper.tsx`
**Depends on**: T1
**Requirement**: DPVC-09, DPVC-12

**Done when**:
- [ ] `{ id: 'pvc', ... }` entry removed from the composition array; replaced at the same index by a `dpvc` entry then an `alturaPrevista` entry
- [ ] `dpvc` entry: `showTrend: true`, no `unit` (or empty), the `isNA` check for this entry does NOT use the generic `curVal <= 0` rule — treats `dpvc === 0` as N/A only when it represents missing input (same sentinel as T1), negative values render normally
- [ ] `alturaPrevista` entry: `unit: 'cm'`, `showTrend: false`
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(report): show dpvc and altura prevista in composition report section`

---

### T6: Update group-average calc in GroupReportModal

**What**: Replace `pvc: average(...)` with `dpvc: average(...)` and `alturaPrevista: average(...)`.
**Where**: `src/components/GroupReportModal.tsx`
**Depends on**: T1
**Requirement**: DPVC-10

**Done when**:
- [ ] `pvc` average line removed; `dpvc` and `alturaPrevista` average lines added using the existing `average()` helper (no new logic)
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(group-report): average dpvc and altura prevista instead of pvc`

---

### T7: Update group-average calc in ReportModal

**What**: Replace `pvc: average(...)` with `dpvc: average(...)` and `alturaPrevista: average(...)`.
**Where**: `src/components/ReportModal.tsx`
**Depends on**: T1
**Requirement**: DPVC-10

**Done when**:
- [ ] Same change as T6, applied to `ReportModal.tsx`
- [ ] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(report): average dpvc and altura prevista instead of pvc`

---

### T8: Update athlete-assessment docs

**What**: Update the PVC mention in the domain docs to describe DPVC + Altura Prevista.
**Where**: `docs/contexts/avaliacao.md`
**Depends on**: T1
**Requirement**: DPVC-11

**Done when**:
- [ ] PVC section replaced with DPVC (formula summary, gender branching) and Altura Prevista (IF-ladder) description
- [ ] Gate check passes: `npm run build && npm run lint` (doc-only, build gate still run for consistency)

**Tests**: none
**Gate**: build

**Commit**: `docs(avaliacao): document dpvc and altura prevista replacing pvc`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 file (calc engine) | ✅ Granular |
| T2 | 1 file (type defaults) | ✅ Granular |
| T3 | 1 file (sidebar options) | ✅ Granular |
| T4 | 1 file (dashboard cards) | ✅ Granular |
| T5 | 1 file (report composition list) | ✅ Granular |
| T6 | 1 file (group avg) | ✅ Granular |
| T7 | 1 file (group avg) | ✅ Granular |
| T8 | 1 file (docs) | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T1 | shown sequential after T3 in single-phase chain (no code dependency on T2/T3, ordered for readability) | ✅ Match |
| T5 | T1 | same | ✅ Match |
| T6 | T1 | same | ✅ Match |
| T7 | T1 | same | ✅ Match |
| T8 | T1 | same | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Calc | none | none | ✅ OK |
| T2 | Types/config | none | none | ✅ OK |
| T3 | UI | none | none | ✅ OK |
| T4 | UI | none | none | ✅ OK |
| T5 | UI | none | none | ✅ OK |
| T6 | UI | none | none | ✅ OK |
| T7 | UI | none | none | ✅ OK |
| T8 | Docs | none | none | ✅ OK |
