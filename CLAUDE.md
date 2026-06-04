<!-- LGR-STANDARDS:BEGIN -->
<!-- Synced from lgr-standards/CLAUDE.base.md — do not edit this block by hand.
     Re-run sync-into-repo.sh to update. -->

# LGR 13-Rule Agent Standard
Stack-specific invariants live in each project's own CLAUDE.md. These 13 are global.
Keep the combined rules surface (global + project) under ~200 lines — past that, compliance
collapses and rules get pattern-matched instead of read.

## Code-writing discipline (Karpathy 1–4)
1. Don't assume. Surface confusion and tradeoffs; ask when a requirement is ambiguous.
2. Simplicity first. Minimum code for the stated problem — no speculative features or abstractions.
3. Scope precision. Every changed line traces to the request; don't refactor what you weren't asked to.
4. Define success criteria up front, then loop until verified.

## Agent-orchestration discipline (5–12)
5. Budget / no spirals. Cap attempts (~3) and token spend; on repeated failure re-diagnose, then
   STOP and report the impasse with diagnostics. Never loop until context/credits are exhausted.
6. Surface conflicts — don't average. When two parts of a codebase differ, follow the dominant
   existing pattern and raise the conflict; never invent a third blended style.
7. Read before you write. Before changing a shared signature, type, env var, or config, grep ALL
   call sites first. Orthogonal damage to untouched files is the #1 confident-wrong failure.
8. Minimal context loading. Load only the skills/files/agents a task needs; avoid hook/skill cascades.
9. Tests verify intent, not just behavior. Tests must encode WHY behavior matters, not just WHAT it
   does. A test that can't fail when business logic changes is wrong.
10. Checkpoint after every significant step. Summarize what was done, what's verified, what's left.
    Don't continue from a state you can't describe back. If you lose track, stop and restate.
11. Match the codebase's conventions, even if you disagree. Conformance > taste inside the codebase.
    If you genuinely think a convention is harmful, surface it. Don't fork silently.
12. Fail loud. "Completed" is wrong if anything was skipped silently. "Tests pass" is wrong if any
    were skipped. Default to surfacing uncertainty, not hiding it.
13. Verify independently, at the stakes. For irreversible or high-stakes results (money, deploys,
    deletions, a "done" claim on a multi-part task), verify with an independent check — a fresh
    context or adversarial agent told to refute — not self-review; and confirm every item, not a
    sample. Combats self-preferential bias and agentic laziness.
(Provenance: rules 1–4 = Karpathy/Forrest Chang; 9–12 verbatim from Mnimiy's May-2026 thread;
 5–8 are content-confirmed, exact wording may be refined; 13 added 2026-06 — mined from LGR
 sessions + the kalshi-trader "independent adversarial panel" lesson, ratified by Laurence.)
<!-- LGR-STANDARDS:END -->
