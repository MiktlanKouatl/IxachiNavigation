import { gsap } from 'gsap';
import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";

/**
 * Chapter 0: Fade in the background from a starting color to black.
 */
export class FadeInChapter implements IAnimationChapter {
    private timeline: gsap.core.Timeline | null = null; // Store timeline for cleanup

    public readonly params = {
        duration: 1.5,
        endColor: '#111111', // Very dark gray
        ease: 'power1.in',
    };

    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        return new Promise<void>(resolve => {
            this.timeline = gsap.timeline({
                onComplete: () => resolve(), // Resolve the promise when the timeline finishes
            });

            // Animate the body's background color
            this.timeline.to('body', {
                backgroundColor: this.params.endColor,
                duration: this.params.duration,
                ease: this.params.ease,
            });
        });
    }

    public stop(): void {
        if (this.timeline) {
            this.timeline.kill(); // Kill the timeline to stop and clean up animations
            this.timeline = null;
        }
    }
}