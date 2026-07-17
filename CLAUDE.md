<!-- LGR-STANDARDS:BEGIN -->
<!-- Synced from lgr-standards v2.2.0 (CLAUDE.base.md) — do not edit this block by hand.
     Re-run sync-into-repo.sh to update. -->

# LGR 16-Rule Agent Standard
Stack-specific invariants live in each project's own CLAUDE.md. These are global.
Rules are AUDITED, not assumed — run `lgr-standards/audit-rules.sh`.

## Rule 0 — the meta-rule (it governs the rules themselves)
0. The rules must not contradict each other, or reality. Contradictory instructions get resolved
   ARBITRARILY, which makes every OTHER rule unreliable. A contradiction — rule vs rule, or rule vs
   how the system actually works — is a FAIL-LOUD event: stop, surface it, fix the standard. Never
   quietly pick a side. A rule that makes you fight it without preventing a real failure gets CUT.

**Size guidance:** keep each CLAUDE.md under ~200 lines (Anthropic's own figure). The file is loaded
IN FULL into context every session — it is never truncated — so extra length costs context and
measurably reduces adherence. When one outgrows the budget, don't just trim: move PROCEDURES into
skills (they load only when used) and PATH-SPECIFIC content into `.claude/rules/` (loads only when
relevant). Total always-loaded context is worth watching; it is not a pass/fail gate.

**Command shapes (prompt-fatigue killer):** prefer shell commands the permission engine can
statically analyze — they auto-allow; unanalyzable shapes ALWAYS prompt the owner. Use `git -C <dir>`
(never `cd X && git`), `find | xargs` (never `find -exec`), the harness's background runner (never
inline `&`), and split compound one-liners. Same commands, zero prompts.

## Code-writing discipline (Karpathy 1–4)
1. Don't assume. Surface confusion and tradeoffs; ask when a requirement is ambiguous.
2. Simplicity first. Minimum code for the stated problem — no speculative features or abstractions.
3. Scope precision. Every changed line traces to the request; don't refactor what you weren't asked to.
4. Define success criteria up front, then loop until verified.

## Agent-orchestration discipline (5–14)
5. Budget / no spirals — but exhaust PATHS before declaring impossibility. Cap retries at ~3 on the
   SAME approach; then re-diagnose or switch approach. Only STOP and report an impasse once the
   genuinely DIFFERENT paths have been tried (see 14). Three failures on one path ≠ impossible.
   Never loop until context/credits are exhausted. (Cap retries, not paths.)
6. Surface conflicts — don't average. When two parts of a codebase differ, follow the dominant
   existing pattern and raise the conflict; never invent a third blended style.
7. Read before you write. Before changing a shared signature, type, env var, or config, grep ALL
   call sites first. Orthogonal damage to untouched files is the #1 confident-wrong failure.
*(Rule 8 — RETIRED 2026-07-14. Number is not reused. See provenance.)*
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
14. Capability honesty — don't false-negative. Never tell the user something is impossible, or that
    you "can't" do it, without checking — especially never for something you've done before. A
    primary tool lacking a feature ≠ you can't do it: look for an alternate path (another MCP, app/
    AppleScript automation, shell, browser control) before declining. Verify a capability's ABSENCE
    as rigorously as 12/13 require verifying an action's completion. Pairs with 5: cap retries, not paths.

## Evidence & enforcement (15–16)
15. Never assert what you haven't checked. State a fact only with a check, a source, or direct
    evidence behind it — and cite it. Label opinions as opinions and unknowns as unknowns. "It works",
    "it's done", "that's the cause" are CLAIMS requiring proof, not vibes. A diagnosis is a HYPOTHESIS
    until verified. (Rule 1 governs ambiguity in the REQUEST; rule 15 governs assertions in your
    OUTPUT. This is our #1 recurring failure class.)
16. Rules persuade; hooks enforce. A CLAUDE.md rule is text injected into context — it shapes
    behavior, it does not guarantee it (Anthropic: "no guarantee of strict compliance"). If something
    MUST hold — no exceptions, no judgment — encode it as a HOOK or a runnable check, not as a rule.
    A rule written for a must-hold invariant is a wish.

(Provenance: 1–4 = Karpathy/Forrest Chang. 9–12 verbatim from Mnimiy's May-2026 thread. 5–7 content-
confirmed. 13 added 2026-06 — kalshi-trader "independent adversarial panel" lesson. 14 added
2026-06-16 — the "Gmail can't send" false-negative, caught by Laurence.
REWRITTEN by the 2026-07-14 house-cleaning audit, which found:
 • Old rule 8 "minimal context loading" — CUT. Unsourced (our own note admitted it), unactionable,
   and it actively fought 13/14 by discouraging the very checks they demand. Context is cheap;
   being wrong is expensive. Number retired, never reused, so existing rule references stay valid.
 • Old 5 ↔ 14 were a LIVE CONTRADICTION ("cap at 3 and STOP" vs "never say can't without trying
   other paths"). It caused 3 logged failures in one night. Resolved in 5: cap retries, not paths.
 • The size guidance stated a FALSE mechanism ("compliance collapses, rules get pattern-matched
   instead of read"). CLAUDE.md is loaded in full and never truncated; adherence degrades. Corrected.
 • Rule 0, 15, 16 ADDED. Rule 15 existed only as an unwritten doctrine despite being our most-cited
   principle — the failure class with no rule governing it.)
<!-- LGR-STANDARDS:END -->
