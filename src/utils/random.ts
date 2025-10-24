/**
 * Returns a random number between a given minimum and maximum range.
 * @param min The minimum value of the range.
 * @param max The maximum value of the range.
 * @returns A random floating-point number.
 */
export function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}
