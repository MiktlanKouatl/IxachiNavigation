import { gsap } from 'gsap';
import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import { PathData } from '../../core/pathing/PathData';
import { randomInRange } from '../../utils/random';
import * as THREE from 'three';

/**
 * Chapter 1: The intro animation where the host ribbon flies in.
 * This chapter is now fully self-contained.
 */
export class IntroChapter implements IAnimationChapter {
    private timeline: gsap.core.Timeline | null = null; // Store timeline for cleanup

    public readonly params = {
        duration: 3.5,
        ease: 'power1.inOut',
        pathGeneration: {
            startRadius: 5,
            numIntermediatePoints: 5,
            radiusReductionFactor: 1.0,
            zRange: { min: 20, max: 20 },
        },
        width: {
            start: 40.0,
            end: 8.0,
        }
    };

    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        return new Promise<void>(resolve => {
            const path = this.createIntroPath();
            targets.hostFollower.setPath(path);

            this.timeline = gsap.timeline({
                onComplete: () => resolve(), // Resolve the promise when the timeline finishes
            });

            // Animate follower progress
            this.timeline.to(targets.hostFollower, {
                progress: 1,
                duration: this.params.duration,
                ease: this.params.ease,
            });

            // Animate ribbon width simultaneously
            this.timeline.fromTo(targets.hostRibbon.material.uniforms.uWidth, 
                { value: this.params.width.start },
                { 
                    value: this.params.width.end,
                    duration: this.params.duration,
                    ease: this.params.ease,
                },
                '<' // Start at the same time as the previous tween
            );

            // Animate camera position (example from previous discussion)
            // this.timeline.to(targets.camera.position, {
            //     z: 18, // Example: zoom in slightly
            //     duration: this.params.duration,
            //     ease: this.params.ease
            // }, '<');
        });
    }

    public stop(): void {
        if (this.timeline) {
            this.timeline.kill(); // Kill the timeline to stop and clean up animations
            this.timeline = null;
        }
    }

    /**
     * Creates the procedural, randomized path for the intro animation.
     * @returns A PathData object for the intro sequence.
     */
    private createIntroPath(): PathData {
        const { startRadius, numIntermediatePoints, radiusReductionFactor, zRange } = this.params.pathGeneration;
        const points: THREE.Vector3[] = [];
        let currentRadius = startRadius;

        const startAngle = Math.random() * Math.PI * 2;
        points.push(new THREE.Vector3(currentRadius * Math.cos(startAngle), currentRadius * Math.sin(startAngle), randomInRange(zRange.min, zRange.max)));
        
        for (let i = 0; i < numIntermediatePoints; i++) {
            currentRadius *= radiusReductionFactor;
            const angle = Math.random() * Math.PI * 2;
            points.push(new THREE.Vector3(currentRadius * Math.cos(angle), currentRadius * Math.sin(angle), randomInRange(-3, 3)));
        }
        
        points.push(new THREE.Vector3(0, 0, 0));
        return new PathData(points);
    }
}