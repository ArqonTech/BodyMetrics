# Validation Report — DPVC + Altura Prevista

**Verifier**: independent (did not author the implementation)
**Commit range verified**: `7a65841~1..6b6d526` (7a65841 through c0d11a0 = code, 6b6d526 = specs docs)
**Method**: spec-anchored code reading (repo has zero test files — no `*.test.*`/`*.spec.*`, no jest/vitest config — so ACs are verified by reading the shipped source directly, not by test coverage).

## Verdict: **PASS**

Core functionality (formulas, gating, ordering, removal of PVC, docs) all verified correct against spec.md and the formulas documented in `docs/contexts/avaliacao.md`.

**Gap fixed (commit `4a730cf`):** the feature had introduced 5 new `@typescript-eslint/no-explicit-any` lint errors in `ReportPaper.tsx` (composition metric list `as any` casts). Re-typed the array literal explicitly (`Array<{ ...; allowNegative?: boolean; hasDataKey?: keyof AthleteMetrics }>`) so `m.hasDataKey`/`m.allowNegative` type-check without casts. Re-ran `npx eslint src/components/ReportPaper.tsx`: 19 errors — matches the pre-feature baseline count exactly, all on pre-existing lines unrelated to this feature (verified by line number). `npm run build` still exits 0 after the fix.

---

## Per-AC Evidence

| # | AC (spec.md) | File:Line | Evidence | Verdict |
|---|---|---|---|---|
| 1 | DPVC formula branch by gender | `src/utils/metrics.ts:139-151` | `const isMulher = mappedAthlete?.gender === 'Feminino'; dpvc = isMulher ? <Mulher formula> : <Homem formula>` | PASS |
| 2 | Homem formula matches spec | `metrics.ts:147-151` vs `docs/contexts/avaliacao.md:25` | `-9.236 + (0.0002708*((altura-altSentado)*altSentado)) - (0.001663*(idade*(altura-altSentado))) + (0.007216*(idade*altSentado)) + (0.02292*((peso/altura)*100))` — term-by-term identical to doc | PASS |
| 3 | Mulher formula matches spec | `metrics.ts:140-146` vs `avaliacao.md:26` | `-9.376 + (0.0001882*((altura-altSentado)*altSentado)) + (0.0022*(idade*(altura-altSentado))) + (0.005841*(idade*altSentado)) - (0.002658*(idade*peso)) + (0.07693*((peso/altura)*100))` — term-by-term identical to doc | PASS |
| 4 | Gender missing → Homem | `metrics.ts:139` | `mappedAthlete?.gender === 'Feminino'` — any other value (incl. `undefined`) falls to `else` (Homem) branch | PASS |
| 5 | `dpvc` not rounded before feeding IF-ladder | `metrics.ts:153-154` | `dpvc` used raw in `dpvc < -1 ? ... : ...` and in `altura/divisor`; only `alturaPrevista` is rounded (`Math.round(x*10)/10`) | PASS |
| 6 | IF-ladder divisors + boundary strictness | `metrics.ts:153` | `dpvc < -1 ? 0.91 : dpvc < 0 ? 0.94 : dpvc < 1 ? 0.975 : dpvc < 2 ? 0.99 : 1` — chained strict `<` naturally routes exact boundary values (-1, 0, 1, 2) to the *following* bracket (e.g. dpvc===-1 fails `<-1`, hits `<0`→0.94, matching spec's Edge Case) | PASS |
| 7 | `alturaPrevista` rounded to 1 decimal | `metrics.ts:154` | `Math.round((altura / divisor) * 10) / 10` | PASS |
| 8 | `hasDpvc` gating | `metrics.ts:135` | `altSentado > 0 && altura > 0 && idade > 0 && peso > 0` — false if sittingHeight/altura/idade/peso missing or ≤0 | PASS |
| 9 | `pvc` fully removed from src | grep `pvc` (case-insensitive) across `src/` | All 24 hits are `dpvc`/`hasDpvc`/`alturaPrevista` — zero standalone `pvc` remnants | PASS |
| 10 | Dashboard: DPVC card, negative shown normally | `AthleteDashboard.tsx:141-144,628-639` | `formatDpvc(val, hasData)` gates only on `hasData`/`isNaN`, no generic `val<=0→'-'` (unlike sibling `formatNumber` at line 136-139 which does have that rule) — negative DPVC displays correctly | PASS |
| 11 | Dashboard: DPVC has trend | `AthleteDashboard.tsx:633-638` | `trend={compareEval && currentMetrics.hasDpvc && ... ? {...} : undefined}` | PASS |
| 12 | Dashboard: Altura Prevista immediately after, unit cm, no trend | `AthleteDashboard.tsx:640-645` | Card follows DPVC card directly; `unit="cm"`; no `trend` prop passed | PASS |
| 13 | ReportPaper: dpvc/alturaPrevista at old `pvc` position, negative-aware | `ReportPaper.tsx:175-187` | Entries follow `relacaoMusculoGordura` (line 175) at 176-177; `hasData = hasDataKey ? currentMetrics.hasDpvc : (curVal>0)` (line 181) — DPVC uses `hasDataKey:'hasDpvc'`, not generic `curVal>0`; `displayValue` uses `allowNegative` branch (`curVal.toFixed(2)`) instead of `formatNumber` (line 187) | PASS |
| 14 | ReportPaper: alturaPrevista no trend, unit cm | `ReportPaper.tsx:177` | `unit: 'cm', showTrend: false` | PASS |
| 15 | GroupReportModal / ReportModal average dpvc + alturaPrevista, `hasDpvc` present | `GroupReportModal.tsx:62-64`, `ReportModal.tsx:50-52` | Both: `dpvc: average(...)`, `hasDpvc: metricsList.some(m=>m.hasDpvc)`, `alturaPrevista: average(...)` — reuses existing `average()`, satisfies `AthleteMetrics` shape | PASS |
| 16 | `report.ts` / `ReportOptionsSidebar.tsx` order | `report.ts:15`, `ReportOptionsSidebar.tsx:34` | Both: `..., relacaoMusculoGordura: true, dpvc: true, alturaPrevista: true` / `{id:'dpvc'}, {id:'alturaPrevista'}` — dpvc then alturaPrevista, same position as old `pvc` | PASS |
| 17 | Docs formula accuracy | `docs/contexts/avaliacao.md:24-28` | Homem/Mulher formulas and IF-ladder text match code term-for-term (cross-checked above) | PASS |

## Gate Results

| Gate | Command | Exit code | Notes |
|---|---|---|---|
| Build | `npm run build` | **0** | Clean build, only a pre-existing chunk-size warning (unrelated) |
| Lint | `npm run lint` | **1** (fails) | Repo-wide pre-existing debt (91 errors before this feature too, spread across `mapper.ts`, `LoginPage.tsx`, `GroupsList.tsx`, `GroupSimplifiedReport.tsx`, two stray `temp_dashboard*.tsx` files at repo root, etc.) — lint was already red before this feature; it does not newly break the gate that wasn't already broken. |

### Lint regression check on touched files (baseline vs current, `any` occurrence count)

| File | Baseline (`7a65841~1`) | Current | Delta |
|---|---|---|---|
| `src/utils/metrics.ts` | 2 (`(circ as any).ankle`, x2 lines, pre-existing) | 2 (same 2 lines, unchanged) | **0 new** |
| `src/components/ReportPaper.tsx` | 19 `any` token occurrences | 24 | **+5 new** |
| `src/pages/AthleteDashboard.tsx` | 1 | 1 | 0 |
| `src/components/GroupReportModal.tsx` | 2 | 2 | 0 |
| `src/components/ReportModal.tsx` | 2 | 2 | 0 |
| `src/components/ReportOptionsSidebar.tsx` | 0 | 0 | 0 |
| `src/types/report.ts` | 0 | 0 | 0 |

**Finding — real regression**: `ReportPaper.tsx` gained 5 new `@typescript-eslint/no-explicit-any` lint errors, all introduced by this feature:
- `ReportPaper.tsx:181:43` and `:181:82` — `(m as any).hasDataKey` (x2 in one line)
- `ReportPaper.tsx:183:58` and `:183:112` — `(m as any).hasDataKey` (x2 in one line)
- `ReportPaper.tsx:187:61` — `(m as any).allowNegative`

These stem from adding optional `hasDataKey`/`allowNegative` fields to the composition-array object literal without typing them on the array's element type, forcing `as any` casts to read them. This is a genuine, verifiable increase in lint debt in a touched file — it contradicts the implicit "no new lint issues beyond pre-existing debt" claim for this feature's task set. It is low severity (repo lint was already failing; TypeScript build is unaffected since `tsc` doesn't enforce this ESLint rule) but is a real, citable gap, not a false alarm.

---

## Discrimination Sensor (mandatory — no test suite exists)

Manual fault-injection reasoning, since there is no unit test to mutation-test:

1. **Sign flip**: If `- (0.001663 * (idade * (altura - altSentado)))` in the Homem formula (`metrics.ts:149`) were flipped to `+`, TypeScript would compile it unchanged (same types), `tsc -b` would report **zero** errors, and ESLint would report **zero** new errors — the arithmetic sign is invisible to both gates. Only a manual read against `docs/contexts/avaliacao.md:25` (as done above) or a numeric unit test with a known expected DPVC value would catch this.
2. **Branch swap**: If the gender check at `metrics.ts:139` were flipped (`!== 'Feminino'` used for the Mulher formula instead of `=== 'Feminino'`), the code would still compile and lint cleanly — every athlete would silently get the wrong-sex formula. No gate (build/lint/type-check) would fail; the dashboard would render a plausible-looking numeric value with no visual indication of the error.

**Conclusion**: TypeScript build and ESLint provide **zero protection** against wrong arithmetic signs or swapped gender branches in this formula. This is a real, currently-uncovered risk given the repo has no test suite. The only mitigations exercised in this verification were manual side-by-side term comparison against `docs/contexts/avaliacao.md` (which the author also wrote/updated in the same feature — not an independent source) and my own re-derivation from `spec.md`'s edge-case description. Recommend (out of scope for this feature per its own Test Coverage Matrix, but worth flagging): a single `assert`-based smoke check with 2-3 known (gender, inputs) → expected-DPVC pairs would close this gap cheaply.
