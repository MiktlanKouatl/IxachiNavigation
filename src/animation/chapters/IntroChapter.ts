import { gsap } from 'gsap';
import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import { PathData } from '../../core/pathing/PathData';
import { PathFollowStrategy } from '../../core/movement/PathFollowStrategy';
import { ProceduralStrategy } from '../../core/movement/ProceduralStrategy';
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
            startRadius: 15,
            numIntermediatePoints: 5,
            radiusReductionFactor: 1.0,
            zRange: { min: 20, max: 20 },
        },
        width: {
            start: 80.0,
            end: 8.0,
        }
    };

    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        // --- Set Initial Camera State ---
        const cameraPos = new THREE.Vector3(0, 0, 20);
        const lookAtPos = new THREE.Vector3(0, 0, 0);
        targets.cameraTarget.position.copy(cameraPos);
        targets.lookAtTarget.position.copy(lookAtPos);
        targets.camera.position.copy(cameraPos); // Snap real camera to start
        targets.camera.lookAt(lookAtPos); // Snap real camera lookAt to start

        // --- Fix the initial "jump" ---
        // 1. Create the path first to know the starting point.
        const path = this.createIntroPath();
        const startPoint = path.curves[0].getPointAt(0);

        // 2. Move the host object to the start point BEFORE enabling drawing.
        targets.hostSourceObject.position.copy(startPoint);

        // 3. Now, reset ribbon, add to scene, and enable drawing.
        targets.hostRibbon.reset();
        targets.scene.add(targets.hostRibbon.mesh);
        targets.enableDrawing();

        return new Promise<void>(resolve => {
            targets.hostFollower.setPath(path);

            // Set the movement strategy for this chapter
            const strategy = new PathFollowStrategy(targets.hostFollower);
            targets.movementController.setStrategy(strategy);

            this.timeline = gsap.timeline({
                onComplete: () => {
                    // Hand off to the procedural strategy, but configure it for a small orbit first.
                    const nextStrategy = new ProceduralStrategy();
                    // Configure the strategy for the 'waiting' orbit during LoadingChapter
                    nextStrategy.params.radiusMultiplier = 0.04; // Start with a very small orbit
                    nextStrategy.params.stateA.speed = 20; // Make the waiting orbit fast to feel lively
                    nextStrategy.params.stateB.speed = 1.5; // Set the speed for the final circular orbit
                    targets.movementController.setStrategy(nextStrategy);
                    resolve();
                },
            });

            // Animate follower progress
            this.timeline.to(targets.hostFollower, {
                progress: 1,
                duration: this.params.duration,
                ease: this.params.ease,
                // The PathFollower needs to be updated for the strategy to work
                onUpdate: () => {
                    targets.hostFollower.update(0); // deltaTime is not used here, progress is animated directly
                }
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
        });
    }

    public stop(targets: AnimationTargets): void {
        if (this.timeline) {
            this.timeline.kill();
            this.timeline = null;
        }
        // DO NOT clean up the strategy here, as it is intentionally handed off to the next chapter.
    }

    private createIntroPath(): PathData {
        const { startRadius, numIntermediatePoints, radiusReductionFactor, zRange } = this.params.pathGeneration;
        const points: THREE.Vector3[] = [];
        let currentRadius = startRadius;

        const startAngle = Math.random() * Math.PI * 2;
        const startPoint = new THREE.Vector3(currentRadius * Math.cos(startAngle), currentRadius * Math.sin(startAngle), randomInRange(zRange.min, zRange.max));
        console.log('📍 Punto de inicio de HostRibbon:', startPoint);
        points.push(startPoint);

        for (let i = 0; i < numIntermediatePoints; i++) {
            currentRadius *= radiusReductionFactor;
            const angle = Math.random() * Math.PI * 2;
            points.push(new THREE.Vector3(currentRadius * Math.cos(angle), currentRadius * Math.sin(angle), randomInRange(-3, 3)));
        }

        const finalAngle = Math.random() * Math.PI * 2;
        points.push(new THREE.Vector3(0.1 * Math.cos(finalAngle), 0.1 * Math.sin(finalAngle), 0));
        console.log('🌀 Puntos generados para la curva:', points);
        return new PathData([points]);
    }
}