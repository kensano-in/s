/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Verlyn Motion System — Perception-Controlled Reality Engine
 *
 * Axiom 4 — Perception Loop: 0ms → 16ms → 100ms → 300ms
 * Axiom 5 — Motion Continuity: all transitions are continuous functions
 * Axiom 14 — Interaction Field: every touch creates a ripple in the system
 *
 * All animations are GPU-composited (transform + opacity only).
 * Step functions (instant jumps) are FORBIDDEN.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Spring Physics ────────────────────────────────────────────────────────────
// Tuned for native-app feel. Higher stiffness = snappier. Lower damping = bouncier.
export const SPRING = {
  micro:   { type: 'spring' as const, stiffness: 500, damping: 28, mass: 0.8 },
  primary: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 0.9 },
  page:    { type: 'spring' as const, stiffness: 260, damping: 26, mass: 1.0 },
  bounce:  { type: 'spring' as const, stiffness: 400, damping: 12, mass: 0.8 },
};

// ── Perception Timing (Axiom 4) ───────────────────────────────────────────────
// These are the four mandatory checkpoints in the perception loop.
// Every user action MUST produce feedback at each of these offsets.
export const PERCEPTION = {
  /** 0ms: The action is registered. No visible change yet. */
  INPUT: 0,
  /** 16ms: First visual frame. Micro-feedback must appear (scale, color flash). */
  MICRO_FEEDBACK: 16,
  /** 100ms: Macro result visible (message appears in list, state changes). */
  MACRO_RESULT: 100,
  /** 300ms: Confirmation (status icon, delivery tick). Loop complete. */
  CONFIRMATION: 300,
} as const;

// ── Duration Tokens ───────────────────────────────────────────────────────────
export const DURATION = {
  micro:   0.1,   // 100ms — instant micro-interactions
  primary: 0.19,  // 190ms — standard transitions
  page:    0.28,  // 280ms — page-level transitions
};

// ── Easing ────────────────────────────────────────────────────────────────────
export const EASE = {
  spring: [0.23, 1, 0.32, 1] as [number, number, number, number], // cubic-bezier matching spring-out
  out:    [0.16, 1, 0.3, 1]  as [number, number, number, number], // aggressive ease-out for UIs
};

// ── Ripple Config (Axiom 14 — Interaction Field) ──────────────────────────────
export const RIPPLE = {
  /** Total duration of the ripple animation in ms */
  duration: 500,
  /** Peak scale of the ripple circle relative to the element's largest dimension */
  maxScale: 4,
  /** Starting opacity of the ripple */
  initialOpacity: 0.25,
};

// ── Conversation Switch Variants (Axiom 5 — Motion Continuity) ───────────────
export const CONV_TRANSITION = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -4 },
  transition: { duration: DURATION.primary, ease: EASE.spring },
};

// ── Message Entry Variants (Axiom 4 — Perception Loop: Macro Result at 100ms) ─
export const MESSAGE_ENTRY = {
  initial:  { opacity: 0, y: 10, scale: 0.98 },
  animate:  { opacity: 1, y: 0,  scale: 1 },
  transition: SPRING.primary,
};
