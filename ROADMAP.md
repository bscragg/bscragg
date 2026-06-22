# EldenAR — Roadmap

Forward-looking ideas beyond the built phases (1–6 done; 7 = true DPS, stretch).
Captured here so they're ready to pick up. Each entry notes the design and what
the engine/data already gives us.

---

## 1. Consumables

Add attack-affecting consumables alongside the greases that already exist
(greases are consumables and are done). These are mostly **% attack-power
buffs** that fit the existing multiplier model — the work is data + getting the
**buff category** right so same-category items don't stack (the engine already
takes the strongest within a `group`).

Candidates to verify and add (cross-check values + category on the wiki before
encoding, per the project rule — don't hardcode from memory):

- **Exalted Flesh** — +20% physical attack (≈ Body category). NOTE: if Body, it
  shares a category with Flame Grant Me Strength and Howl of Shabriri → they do
  **not** stack with it; model with the same stacking `group` as those so the
  strongest wins.
- **Uplifting Aromatic** (perfume item) — raises attack power (verify exact % and
  category; perfumes/aromatics may be their own category).
- Survey the rest: most foods/boluses are defense/resistance/cure (Boiled Crab =
  physical negation, Boiled Prawn = non-physical negation, etc.) → **out of
  scope** (defensive, not AR). Throwing pots/fans deal their own damage, not
  weapon AR → out.

**Effort:** small. New `kind: "consumable"` (or fold into `buff`), entries as
`multipliers` with the correct category `group`. No engine change. Mind the
category so Exalted Flesh ↔ body-buff mutual exclusivity is honored.

---

## 2. Buff activation order-of-operations guide

Given the set of buffs/greases/spells/consumables a user has selected, show a
**step-by-step "how to apply these in game"** panel that (a) flags conflicts and
(b) recommends an application *sequence* so everything is active at once.

### The ER mechanics it must encode

- **Buff categories:** Armament, Body, Aura, Health-regen, (Unique). **Only one
  buff per category can be active** — re-applying another in the same category
  *overwrites* the previous one. The engine already models this: same `group` →
  strongest applies (mutually exclusive); we also have `exclusiveGroup` for
  slot/category single-select in the UI.
- **Across different categories:** buffs stack **multiplicatively** and the order
  you apply them **does not change the final AR** (it's commutative). So
  *Golden Vow (Aura) + Howl of Shabriri (Body) + a grease (Armament) + physick*
  all stack regardless of order — the common misconception is that these
  conflict; they don't. The genuine conflicts are *within* a category (e.g. Howl
  vs Flame Grant Me Strength, both Body; the two Golden Vows, both Aura).
- **Why order still matters in practice — duration overlap.** Buffs expire, so to
  have them all live at the moment you attack, apply the **longest-duration ones
  first and the shortest last**. Example: Golden Vow (~80s) early; a Drawstring
  grease (~10s) right before engaging. This is the heart of the "guide."
- **Condition gating / timing.** Some effects need a state at attack time:
  Ritual Sword Talisman (full HP — heal *after* buffing), White Mask / Mushroom
  Crown / Kindred/Lord Exultations (need a status proc nearby — trigger last),
  Black Dumpling (take madness on yourself), Bloodsucking tear (drains HP).

### What to build

1. **Data:** add a structured `durationSeconds?: number` to `Modifier` (today
   durations live only in free-text `condition`). Category is already implicit in
   the stacking `group` / `exclusiveGroup`; consider an explicit
   `category: "armament" | "body" | "aura" | …` for clarity.
2. **Engine/helper (pure, testable):** `planActivation(modifiers)` →
   - **Conflicts:** group selected items by category; if >1 in a category, warn
     "only one applies — using the strongest (X); drop the others." (The AR math
     already does this; the guide makes it visible.)
   - **Sequence:** of the non-conflicting set, order by duration descending
     (longest first, shortest/instant last), with condition steps interleaved
     ("…then heal to full for Ritual Sword", "…proc bleed near you for White
     Mask").
3. **UI:** an "Activation order" panel under the picker — a numbered checklist
   with the conflict warnings up top. Reuses the selected-modifier set.

**Effort:** medium. The category/stacking logic exists; main additions are the
`durationSeconds` data, the `planActivation` helper + tests, and the UI panel.
High user value — it turns the calculator's "what" into an actionable "how."

---

## Already noted elsewhere (see HANDOFF.md)

- Derive the weapon-buff **Spell Buff** from a chosen catalyst + stats instead of
  a manual number.
- **Named saved builds** (a list of presets beyond the single URL/localStorage
  state).
- **Phase 7 — true DPS:** motion values + target defense; needs a new data
  source. The app deliberately says "AR, not DPS" until then.
