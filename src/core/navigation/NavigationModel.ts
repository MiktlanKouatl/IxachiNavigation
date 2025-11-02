import { IAnimationChapter } from '../../animation/IAnimationChapter';

/**
 * Defines a choice available at an intersection.
 */
export interface NavigationChoice {
    /** The input direction required to trigger this choice (e.g., 'left', 'right'). */
    direction: 'left' | 'right' | 'up' | 'down';

    /** The name of the target path to navigate to after the transition. */
    targetPathId: string;

    /** The name of the AnimationChapter to play for the transition. */
    transitionChapterId: string;
}

/**
 * Defines a point on a path where navigation can branch.
 */
export interface NavigationIntersection {
    /** The progress (0-1) along the path where the intersection is located. */
    progress: number;

    /** The list of choices available at this intersection. */
    choices: NavigationChoice[];

    /** Optional: A radius around the progress point to detect entry. Defaults to 0.01 */
    threshold?: number;
}
