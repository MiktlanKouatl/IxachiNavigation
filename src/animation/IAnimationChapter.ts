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
    stop?(targets: AnimationTargets): void;
}
