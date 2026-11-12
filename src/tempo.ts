import type { SongSection, TempoChange } from "@hum2music/core";

const BEATS_PER_BAR = 4;
const RITARDANDO_STEPS = 8;
/** At amount=1, the final tempo step is this fraction slower than the base tempo. */
const MAX_RITARDANDO_FRACTION = 0.25;

/**
 * Derives a tempo curve with a terminal ritardando over the piece's final
 * song section — a stepped, deterministic slowdown reaching
 * `MAX_RITARDANDO_FRACTION * amount` below the base tempo by the last bar
 * (PRD §9/§10.5's tempo tied to song structure: rule-driven from section
 * boundaries, not random, and independent of any `seed`). At `amount` 0,
 * or with no sections, returns a flat tempo (no ritardando) so the MIDI
 * output is unaffected unless this is explicitly requested.
 */
export function deriveSectionTempoCurve(sections: SongSection[], baseBpm: number, amount: number): TempoChange[] {
  if (sections.length === 0 || amount <= 0) return [{ atBeat: 0, bpm: baseBpm }];

  const finalSection = sections[sections.length - 1];
  const sectionStartBeat = finalSection.startBarIndex * BEATS_PER_BAR;
  const sectionBeats = finalSection.barCount * BEATS_PER_BAR;
  const clampedAmount = Math.min(1, amount);

  const curve: TempoChange[] = [{ atBeat: 0, bpm: baseBpm }];
  for (let step = 1; step <= RITARDANDO_STEPS; step++) {
    const progress = step / RITARDANDO_STEPS;
    const slowdownFraction = MAX_RITARDANDO_FRACTION * clampedAmount * progress;
    curve.push({ atBeat: sectionStartBeat + progress * sectionBeats, bpm: baseBpm * (1 - slowdownFraction) });
  }
  return curve;
}
