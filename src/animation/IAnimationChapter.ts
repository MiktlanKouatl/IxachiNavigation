import { AnimationDirector } from "./AnimationDirector";
import { AnimationTargets } from "./AnimationTargets";

export interface IAnimationChapter {
    // The chapter's parameters, if any
    readonly params?: any;

    /**
     * Starts the chapter's animation or logic.
     * @param director The AnimationDirector instance.
     * @param targets The animatable targets.
     * @returns A Promise that resolves when the chapter's logic is complete.
     */
    start(director: AnimationDirector, targets: AnimationTargets): Promise<void>;

    /**
     * Stops and cleans up the chapter's animation or logic.
     * This is called when the chapter is interrupted or the director moves to the next chapter.
     */
    /**
     * Stops and cleans up the chapter's animation or logic.
     * This is called when the chapter is interrupted or the director moves to the next chapter.
     */
    stop?(targets: AnimationTargets): void;

    /**
     * Optional update loop for the chapter.
     * @param delta Time since last frame in seconds.
     * @param time Total elapsed time in seconds.
     */
    update?(delta: number, time: number): void;

    /**
     * Optional method to get the chapter's active camera.
     * If provided, the main renderer will use this camera when the chapter is active.
     */
    getCamera?(): THREE.Camera | null;
}
