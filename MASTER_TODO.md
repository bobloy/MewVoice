# MewVoice — Master TODO List (Agent Playbook)
_Last updated: 2026-02-18_

This document is the shared backlog + reasoning ledger for all agents working on this repo.  
Goal: **be the authority for Mewgenics voice pack mods** — including **enabling/disabling**, **mixing**, and **modifying existing (vanilla) voices** — with **Mewtator compatibility today** and an export path to **standalone / plugin / Workshop** later.

---

## 0) Non‑Negotiable Product Principles (read first)
### P0 — “Authority” means **deterministic outcomes**
**Reasoning:** Users will install multiple packs. If the result is inconsistent or order-dependent, the tool is not an authority; it’s a roulette wheel.  
**Implication:** We must have an explicit **resolver** with visible precedence rules and conflict detection.

### P0 — Mewtator is a launcher, not a mod engine
**Reasoning:** Mewtator primarily supplies the game with mod paths (e.g., via `-modpaths`). The game applies `.patch/.merge/.append` files from those paths.  
**Implication:** “Compatibility with Mewtator” means we must **export a correct mod folder** and help users **manage what mod paths are active**.

### P0 — Start with a local “Voice Manager UI”
**Reasoning:** Before optimizing distribution details, we need a stable UX and semantic model for: enabled state, overrides, and conflict resolution. That model will power *every* export target later (Mewtator / standalone / Workshop).

---

## 1) Current Architecture Snapshot (for context)
- `client/`: React + TypeScript + Vite UI (web app).
- `worker/`: Cloudflare Worker API (TypeScript/Hono) with R2 + D1 for hosting community library/builds.
- `desktop/`: Tauri desktop app for local pack installation and management.
- `unpacked/`: extracted game assets used for reference/research (not a shipping dependency).

**Reasoning:** Agents need to know what is “product code” vs “reference materials” to avoid turning the game dump into an accidental dependency.

---

## 2) Top-Level Milestones (Epics)
Each epic below lists:
- **Why** (reasoning / objective)
- **Deliverables**
- **Acceptance criteria** (so agents can close work confidently)
- **Dependencies / notes**

---

# EPIC A — Voice Manager (Local UI)  ✅ *First milestone*
## A1 — Define the canonical data model for voice management
**Why:** Without a shared model (packs, targets, overrides, enable state), every feature becomes a one-off and future export targets will diverge.

**Deliverables:**
- A versioned internal schema (TypeScript types + JSON persistence format) that represents:
  - Voice sources (built-in catalog, downloaded packs, local packs)
  - Target mapping (what a clip overrides)
  - Enable/disable state at pack/action/variant level
  - Priority rules (load order / precedence)
  - Profiles/presets (“loadouts”)

**Acceptance criteria:**
- Can save and reload state with no data loss.
- Deterministic resolution output for the same inputs.
- Schema has a version field and migration strategy stub.

**Dependencies / notes:**
- Must not depend on network availability (library can be optional).
- Keep it export-target agnostic.

---

## A2 — Build the Voice Manager UI shell
**Why:** The UI is the product surface area; it also clarifies edge cases (conflicts, partial overrides, missing assets).

**Deliverables:**
- Screens:
  1) **Sources**: installed packs / downloaded packs / built-in catalog
  2) **Overrides**: what replaces what (target selection UI)
  3) **Conflicts**: list of collisions + resolution controls
  4) **Profiles**: save/apply voice setups
  5) **Preview**: A/B (base vs resolved) with quick playback

**Acceptance criteria:**
- User can enable/disable packs and immediately see the “resolved output summary”.
- Conflicts are surfaced (not hidden).
- Preview works for at least downloaded packs; built-in preview can be stubbed until catalog exists.

**Dependencies / notes:**
- Start with “downloaded packs + local packs” if built-in catalog isn’t ready yet.
- UI must handle large libraries without lag (virtualization/infinite list if needed).

---

## A3 — Deterministic “Resolver” (single source of truth)
**Why:** This is the core authority engine: it produces the final effective set of voice files and patches.

**Deliverables:**
- A resolver module that takes:
  - selected packs
  - overrides
  - priorities
  - enabled toggles
  and outputs:
  - resolved file map
  - required patch operations
  - conflict list + explanations (“why this won”)

**Acceptance criteria:**
- Resolver output is stable across runs.
- Conflicts have human-readable reasons (“Pack B overrides Pack A because priority is higher”).
- Unit tests cover:
  - same-target overrides
  - partial action overrides
  - disabled variants
  - missing optional actions

**Dependencies / notes:**
- Must support future export formats (don’t bake Mewtator paths into the resolver).

---

# EPIC B — Modify Existing (Vanilla) Voices
## B1 — Build a built-in voice catalog (versioned)
**Why:** To override vanilla voices, we need stable identifiers and mappings for the base game’s voice sets and how they’re referenced.

**Deliverables:**
- A machine-readable catalog:
  - game build identifier (or approximate version tag)
  - list of built-in voice set IDs
  - action categories and expected variants
  - source paths (or logical references)

**Acceptance criteria:**
- Catalog can be used to populate “Target: Built-in voice set X” dropdown.
- Catalog is versioned and can coexist for multiple game versions.

**Dependencies / notes:**
- Do not require shipping the full `unpacked/` directory.
- Prefer a curated extracted JSON manifest committed to repo (small, reviewable).

---

## B2 — Support partial overrides against vanilla targets
**Why:** Users want to replace “just Hit sounds” or “just variant 3” without rebuilding everything.

**Deliverables:**
- Override editor supports targeting:
  - whole voice set
  - action group
  - specific variant
- Resolver supports patch/file map generation accordingly.

**Acceptance criteria:**
- A pack can override only one action and leave everything else vanilla.
- Conflicts are surfaced if multiple packs override the same vanilla variant.

---

# EPIC C — Mewtator Compatibility (Export + Modpath Management)
## C1 — Export a correct “mod folder” (Mewtator-friendly)
**Why:** Mewtator passes mod paths; the game consumes folder contents. Export must be correct and self-contained.

**Deliverables:**
- Export target: “Mewtator”
  - Writes resolved output into a folder that mirrors the game’s expected directory structure.
  - Produces `.patch/.merge/.append` artifacts as needed for registration/overrides.

**Acceptance criteria:**
- Export folder can be dropped into a directory referenced by Mewtator `-modpaths` and work.
- Export includes all assets required for playback and registration.

**Dependencies / notes:**
- The precise patch semantics must match the game’s loader behavior (validate with real-game smoke tests).

---

## C2 — Mewtator integration helper (detect config and mod folder)
**Why:** Reduces user friction. If users can’t find the mod folder or forget to enable modpaths, adoption suffers.

**Deliverables:**
- “Find Mewtator” flow (browse or auto-detect).
- “Install to Mewtator” button:
  - choose profile
  - export into a managed subfolder
  - show instructions for enabling modpaths (or update config if safe/appropriate).

**Acceptance criteria:**
- A user can go from “download pack” to “in game” with minimal steps.
- No destructive edits to unrelated mods.

**Dependencies / notes:**
- Avoid storing absolute user paths in synced/cloud state.

---

## C3 — Native Windows installer / manager (optional but planned)
**Why:** Many users prefer a simple Windows app that manages installs and profiles without Python.

**Deliverables:**
- A small Windows-native tool that:
  - installs resolved output into Mewtator’s mod folder
  - switches profiles (enable/disable)
  - can validate installation
- Keep the legacy Python installer available as a fallback.

**Acceptance criteria:**
- Works on a clean Windows machine without developer tooling.
- Clear error messages for common issues (missing Mewtator, wrong game path, locked files).

**Dependencies / notes:**
- Pick a packaging approach later (don’t commit until requirements are finalized).
- Keep artifacts signed/distributed responsibly (no secrets embedded).

---

# EPIC D — Community Library Reliability (Cloudflare Worker + Storage)
## D1 — Fix R2 deletion correctness (known issue)
**Why:** Orphaned objects = costs + user distrust + eventual storage blowup.

**Deliverables:**
- Ensure “Delete” removes:
  - DB row(s)
  - all associated R2 objects (build + published variants if applicable)

**Acceptance criteria:**
- After delete, listing no longer shows pack and R2 keys no longer exist.
- Add an automated test or a scripted verification checklist.

**Dependencies / notes:**
- Must be careful with shared objects (don’t delete referenced artifacts incorrectly).

---

## D2 — Rate limiting & abuse controls
**Why:** Expected traffic + public upload endpoints invite abuse. This protects uptime and cost.

**Deliverables:**
- Rate limit strategy for:
  - upload/build
  - preview
  - auth endpoints
- Request size limits and timeouts.

**Acceptance criteria:**
- Abuse attempts degrade gracefully (429 / clear error).
- Legit usage isn’t impacted (reasonable per-IP/session thresholds).

---

## D3 — Aggressive Cloudflare cost optimization
**Why:** Scale traffic without surprise bills.

**Deliverables:**
- Caching strategy audit:
  - library list results
  - preview audio
  - published downloads metadata
- R2 operation minimization plan (reduce Class A ops).
- Lifecycle rules / cleanup policy for temporary builds.

**Acceptance criteria:**
- Documented cost model with “what drives spend”.
- Measurable reduction in R2 ops for common flows.
- No stale/incorrect content served from cache.

---

# EPIC E — Pack Quality, Validation, and “Authority” Tooling
## E1 — Pack Doctor (validation + lint report)
**Why:** If MewVoice is the authority, it must be able to explain “why this will/won’t work” clearly.

**Deliverables:**
- Validation report including:
  - audio compliance (format, duration, silence trimming results)
  - clip count recommendations vs minimums
  - missing optional actions
  - naming rules
  - export-target specific warnings

**Acceptance criteria:**
- User sees actionable steps to fix issues.
- Report is export-target aware (Mewtator vs future targets).

---

## E2 — Golden fixtures + regression tests
**Why:** Prevent silent breakage of exports, patches, and resolver semantics.

**Deliverables:**
- A small set of test packs representing edge cases.
- Automated tests for:
  - resolver determinism
  - export file layout
  - patch generation structure

**Acceptance criteria:**
- CI (or local test command) catches breaking changes.

---

# EPIC F — Future-Proofing for Workshop / Other Loaders
## F1 — Export-target abstraction
**Why:** Workshop support will likely require different metadata, directory layout, and update semantics.

**Deliverables:**
- `ExportTarget` interface:
  - input: resolved output
  - output: files + metadata + instructions
- Add placeholders for “WorkshopCandidate” without implementing unknown details.

**Acceptance criteria:**
- Mewtator export continues to work unchanged.
- Adding a new export target doesn’t require rewriting resolver/UI.

---

# EPIC G — Documentation & Operations
## G1 — Canonical specification document
**Why:** “Authority” requires a stable spec that pack authors and tool authors can follow.

**Deliverables:**
- `VOICE_PACK_SPEC.md` (versioned):
  - naming rules
  - actions/variants rules
  - audio requirements
  - override semantics
  - export targets

**Acceptance criteria:**
- Spec is referenced by UI validations and export logic.
- Spec changes are versioned with migration notes.

---

## G2 — End-to-end user documentation
**Why:** Reduces support burden and increases adoption.

**Deliverables:**
- “Install with Mewtator” guide
- “Manage profiles” guide
- “Override vanilla voices” guide
- Troubleshooting checklist

**Acceptance criteria:**
- New user can install a pack and hear it in-game without external help.

---

# 3) Prioritization (Default Order)
**P0 (do first):**
1. A1 Data model
2. A3 Resolver
3. A2 UI shell (incremental)
4. C1 Mewtator export
5. D1 R2 deletion fix

**P1 (next):**
- B1 Built-in voice catalog
- B2 Partial vanilla overrides
- D2 Rate limiting
- E1 Pack Doctor

**P2 (later):**
- D3 Cost optimization refinements
- C2 Mewtator helper UX
- E2 Golden fixtures/test suite expansion
- F1 Workshop export abstraction scaffolding
- C3 Native Windows manager (when requirements settle)

---

# 4) Working Conventions for Agents
- **Never introduce non-determinism** in resolver/external outputs.
- **Keep reference assets out of runtime dependencies** (no shipping `unpacked/`).
- **Prefer additive changes** with clear acceptance criteria.
- **Document why** in PR descriptions and update this file if priorities shift.

---

# 5) Known Risks & Mitigations
- **Risk:** Multiple packs conflict on the same target.
  - **Mitigation:** Resolver conflict list + explicit priority rules + profile system.
- **Risk:** Game patch semantics differ by version.
  - **Mitigation:** Versioned built-in catalog + export-target tests + smoke tests.
- **Risk:** Storage costs from orphaned artifacts.
  - **Mitigation:** Correct deletion + lifecycle cleanup + caching strategy.

---