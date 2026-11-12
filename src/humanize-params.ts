export interface InstrumentHumanizeParams {
  timingJitterMs: number;
  velocityJitterAmount: number;
  swingAmount: number;
  ghostNoteProbability: number;
  /**
   * Fraction of each note's natural duration (its gap to the next onset,
   * capped by its own written duration) that's actually held before the
   * next note — 1 holds the full written duration (fully legato), lower
   * values leave more silence between notes (PRD §9's per-instrument
   * articulation: a bowed string stays closer to legato by default, a
   * struck/plucked instrument's natural decay leaves more separation).
   */
  articulationGapRatio: number;
}

/**
 * Baseline (fully-humanized, `--humanize 1`) parameters per instrument.
 * A single `--humanize` value maps to different concrete ranges per
 * instrument rather than one shared random multiplier (PRD §11.3) —
 * e.g. drums tolerate more timing/velocity variation than a sustained
 * melody. Proposed values, to be tuned against real recordings.
 */
const INSTRUMENT_BASELINES: Record<string, InstrumentHumanizeParams> = {
  melody: { timingJitterMs: 8, velocityJitterAmount: 6, swingAmount: 0.1, ghostNoteProbability: 0, articulationGapRatio: 1 },
  piano: { timingJitterMs: 10, velocityJitterAmount: 10, swingAmount: 0.1, ghostNoteProbability: 0.05, articulationGapRatio: 0.9 },
  bass: { timingJitterMs: 6, velocityJitterAmount: 8, swingAmount: 0.1, ghostNoteProbability: 0, articulationGapRatio: 1 },
  drums: { timingJitterMs: 15, velocityJitterAmount: 12, swingAmount: 0.2, ghostNoteProbability: 0.15, articulationGapRatio: 1 },
  guitar: { timingJitterMs: 8, velocityJitterAmount: 10, swingAmount: 0.1, ghostNoteProbability: 0.05, articulationGapRatio: 0.8 },
  violin: { timingJitterMs: 6, velocityJitterAmount: 6, swingAmount: 0, ghostNoteProbability: 0, articulationGapRatio: 0.97 },
  viola: { timingJitterMs: 6, velocityJitterAmount: 6, swingAmount: 0, ghostNoteProbability: 0, articulationGapRatio: 0.97 },
  cello: { timingJitterMs: 6, velocityJitterAmount: 6, swingAmount: 0, ghostNoteProbability: 0, articulationGapRatio: 0.97 },
};

export function deriveHumanizeParams(humanizeAmount: number, instrument: string): InstrumentHumanizeParams {
  const baseline = INSTRUMENT_BASELINES[instrument] ?? INSTRUMENT_BASELINES.melody;
  const amount = Math.min(1, Math.max(0, humanizeAmount));

  return {
    timingJitterMs: baseline.timingJitterMs * amount,
    velocityJitterAmount: baseline.velocityJitterAmount * amount,
    swingAmount: baseline.swingAmount * amount,
    ghostNoteProbability: baseline.ghostNoteProbability * amount,
    // Blends from 1 (no articulation shaping) toward the instrument's own
    // style as `amount` rises to 1, rather than jumping straight to the
    // baseline at any nonzero humanize amount.
    articulationGapRatio: 1 - (1 - baseline.articulationGapRatio) * amount,
  };
}
