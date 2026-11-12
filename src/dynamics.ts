import type { NoteEvent } from "@hum2music/core";
import type { InstrumentHumanizeParams } from "./humanize-params.ts";

const BEATS_PER_BAR = 4;
const POSITION_EPSILON_BEATS = 1e-6;

/**
 * Accents downbeats (start of each bar) and adds a smaller, seeded
 * velocity variation elsewhere — the accent is a deterministic rule on
 * metrical position, with randomness only filling in the remaining
 * natural variation, damped on strong beats (PRD §11.2 Velocity Accent).
 */
export function applyVelocityHumanization(
  notes: NoteEvent[],
  params: InstrumentHumanizeParams,
  random: () => number,
): NoteEvent[] {
  if (params.velocityJitterAmount <= 0) return notes;

  return notes.map((note) => {
    const positionInBar = note.startBeat % BEATS_PER_BAR;
    const isDownbeat = Math.abs(positionInBar) < POSITION_EPSILON_BEATS;
    const accent = isDownbeat ? params.velocityJitterAmount : 0;
    const jitterScale = isDownbeat ? 0.3 : 1;
    const jitter = (random() * 2 - 1) * params.velocityJitterAmount * 0.5 * jitterScale;

    return { ...note, velocity: clampVelocity(note.velocity + accent + jitter) };
  });
}

/**
 * Applies a single swell (crescendo into decrescendo) across the given
 * notes, as a simplified stand-in for phrase-level dynamics until
 * phrase-boundary detection exists.
 */
export function applyDynamicArc(notes: NoteEvent[], amount: number): NoteEvent[] {
  if (notes.length < 2 || amount <= 0) return notes;

  const firstBeat = notes[0].startBeat;
  const lastBeat = notes[notes.length - 1].startBeat;
  const span = lastBeat - firstBeat || 1;
  const maxArcVelocity = 10 * amount;

  return notes.map((note) => {
    const progress = (note.startBeat - firstBeat) / span;
    const arcOffset = Math.sin(progress * Math.PI) * maxArcVelocity;
    return { ...note, velocity: clampVelocity(note.velocity + arcOffset) };
  });
}

function clampVelocity(velocity: number): number {
  return Math.min(127, Math.max(1, Math.round(velocity)));
}

/**
 * Shapes each note's held duration toward `gapRatio` of its natural gap to
 * the next onset (PRD §9's per-instrument articulation) — never the other
 * way (this only ever shortens a note, it can't create overlap or stretch
 * a note past where the next one starts). Assumes `notes` is already in
 * onset order, true of every monophonic/chordal Arranger output in this
 * project; a note with no following note (the last one) is left untouched.
 */
export function applyArticulation(notes: NoteEvent[], gapRatio: number): NoteEvent[] {
  if (gapRatio >= 1 || notes.length === 0) return notes;

  return notes.map((note, index) => {
    const next = notes[index + 1];
    if (!next) return note;

    const gapToNextOnset = next.startBeat - note.startBeat;
    if (gapToNextOnset <= 0) return note; // simultaneous (e.g. a chord) or out-of-order; leave untouched

    const naturalDurationBeats = Math.min(note.durationBeats, gapToNextOnset);
    return { ...note, durationBeats: naturalDurationBeats * gapRatio };
  });
}
