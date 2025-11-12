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
        const { colorManager } = targets;
        const endColor = colorManager.getColor('background');

        // Set the initial body background color if it's different
        // This prevents a flash if the default CSS color is different from the palette's start color
        gsap.set('body', { backgroundColor: `#${endColor.getHexString()}` });


        // The chapter now resolves immediately as it just sets the state.
        // The background color is now managed by the ColorManager listener.
        colorManager.on('update', () => {
            gsap.to('body', {
                backgroundColor: `#${colorManager.getColor('background').getHexString()}`,
                duration: 1.0, // Smooth transition on palette change
                ease: 'power1.inOut',
            });
        });

        return Promise.resolve();
    }

    public stop(): void {
        // No timeline to kill anymore, but we might want to remove the listener
        // For now, we'll leave it active to allow dynamic palette changes.
    }
}