/**
 * A function that takes a normalized time value (usually looping) and returns a value, typically between -1 and 1.
 */
export type WaveFunction = (t: number) => number;

/**
 * A library of standard wave functions to be used by movement strategies.
 */
export const WaveForms = {
    /**
     * Standard sine wave. Smooth oscillation.
     */
    sin: (t: number): number => Math.sin(t),

    /**
     * Standard cosine wave. Smooth oscillation, offset from sine by PI/2.
     */
    cos: (t: number): number => Math.cos(t),

    /**
     * Triangle wave. Linear movement back and forth.
     * Produces sharp peaks.
     */
    tri: (t: number): number => {
        const a = (t / Math.PI) % 2;
        return a < 1 ? 2 * a - 1 : 1 - 2 * (a - 1);
    },

    /**
     * Sawtooth wave. Linear ramp up, then instant drop.
     */
    saw: (t: number): number => {
        const a = (t / (2 * Math.PI)) % 1;
        return a * 2 - 1;
    },

    /**
     * Square wave. Instant flips between -1 and 1.
     */
    sqr: (t: number): number => Math.sign(Math.sin(t)),
};
