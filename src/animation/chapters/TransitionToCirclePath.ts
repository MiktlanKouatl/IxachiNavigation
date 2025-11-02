import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationTargets } from "../AnimationTargets";
import { AnimationDirector } from "../AnimationDirector";
import { gsap } from "gsap";
import * as THREE from "three";

export class TransitionToCirclePath implements IAnimationChapter {

    start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        console.log('🎬 [TransitionToCirclePath] Starting transition...');
        return new Promise(resolve => {
            const targetPosition = new THREE.Vector3(10, 5, 0); // Destination: start of circle path
            const targetLookAt = new THREE.Vector3(0, 5, 0); // Look at the center of the circle

            // Animate the virtual camera target
            gsap.to(targets.cameraTarget.position, {
                x: targetPosition.x,
                y: targetPosition.y,
                z: targetPosition.z,
                duration: 1.5,
                ease: "power3.inOut",
                onComplete: () => {
                    console.log('✅ [TransitionToCirclePath] Transition complete.');
                    resolve();
                }
            });

            // Also animate the look-at target for a smooth pan
            gsap.to(targets.lookAtTarget.position, {
                x: targetLookAt.x,
                y: targetLookAt.y,
                z: targetLookAt.z,
                duration: 1.5,
                ease: "power3.inOut",
            });
        });
    }

    stop(targets: AnimationTargets): void {
        gsap.killTweensOf(targets.cameraTarget.position);
        gsap.killTweensOf(targets.lookAtTarget.position);
        console.log('⏹️ [TransitionToCirclePath] Transition stopped.');
    }
}
