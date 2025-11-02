import { IAnimationChapter } from '../IAnimationChapter';
import { AnimationDirector } from '../AnimationDirector';
import { AnimationTargets } from '../AnimationTargets';
import { gsap } from 'gsap';
import { ProceduralStrategy } from '../../core/movement/ProceduralStrategy';

export class InnerUniverseChapter implements IAnimationChapter {

    private timeline: gsap.core.Timeline | null = null;

    public readonly params = {
        duration: 5.0, // Increased duration for a more epic feel
        ease: 'power3.inOut',
        orbit: {
            endRadiusX: 8.0,
            endRadiusY: 8.0,
            endRadiusZ: 0.0,
        }
    };

    public async start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        console.log('🌌 [InnerUniverseChapter] Starting');

        const activeStrategy = targets.movementController.getActiveStrategy();
        if (!(activeStrategy instanceof ProceduralStrategy)) {
            console.error('InnerUniverseChapter cannot start: ProceduralStrategy is not active.');
            return Promise.reject('ProceduralStrategy not active');
        }

        const proceduralStrategy = activeStrategy as ProceduralStrategy;

        // Set initial state for the animation: target orbit radii are zero
        proceduralStrategy.params.stateB.axisX.radius = 0.0;
        proceduralStrategy.params.stateB.axisY.radius = 0.0;
        proceduralStrategy.params.stateB.axisZ.radius = 0.0;

        proceduralStrategy.params.stateA.axisX.radius = 1.0;
        proceduralStrategy.params.stateA.axisY.radius = 0.3;
        proceduralStrategy.params.stateA.axisZ.radius = 1.0;
        proceduralStrategy.params.stateA.axisZ.freq = 0.2;

        proceduralStrategy.params.stateA.speed = 5.0;

        proceduralStrategy.params.mix = 0; // Ensure we start at state A
        proceduralStrategy.params.radiusMultiplier = 5.0; // Ensure multiplier is neutral

        return new Promise(resolve => {
            this.timeline = gsap.timeline({
                onComplete: () => {
                    console.log('🌌 [InnerUniverseChapter] Finished.');
                    this.timeline = null;
                    //resolve(); // Now resolves to allow sequence to continue
                }
            });

            let amplitude = 8.0;
            // 1. Animate the mix factor to transition from chaos (A) to order (B)
            /* this.timeline.to(proceduralStrategy.params, {
                radiusMultiplier: amplitude,
                duration: this.params.duration,
                ease: this.params.ease,
            }, 0); */

            // 2. Animate the radii of the target state (B) to create the expansion effect
            /* this.timeline.to(proceduralStrategy.params.stateB.axisX, {
                radius: this.params.orbit.endRadiusX,
                duration: this.params.duration,
                ease: this.params.ease,
            }, 0);
            this.timeline.to(proceduralStrategy.params.stateB.axisY, {
                radius: this.params.orbit.endRadiusY,
                duration: this.params.duration,
                ease: this.params.ease,
            }, 0);
            this.timeline.to(proceduralStrategy.params.stateB.axisZ, {
                radius: this.params.orbit.endRadiusZ,
                duration: this.params.duration,
                ease: this.params.ease,
            }, 0); */
        });
    }

    public stop(targets: AnimationTargets): void {
        if (this.timeline) {
            this.timeline.kill();
        }
    }
}
