import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import * as THREE from 'three';
import { RibbonLine, RibbonConfig, UseMode } from "../../core/RibbonLine";
import { PathFollower } from "../../core/pathing/PathFollower";
import { gsap } from 'gsap';

export class TraceLogoChapter implements IAnimationChapter {
    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        return new Promise(resolve => {
            console.log('TraceLogoChapter started');

            // 1. Camera and HostRibbon animation
            gsap.to(targets.cameraTarget.position, { x: 0, y: 0, z: 25, duration: 2, ease: 'power2.inOut' });
            gsap.to(targets.lookAtTarget.position, { x: 0, y: 0, z: 0, duration: 2, ease: 'power2.inOut' });
            gsap.to(targets.hostRibbon.material.uniforms.uFadeTransitionSize, { value: 1.0, duration: 1.5, ease: 'power1.in' });

            const logoPathData = targets.assetManager.getPath('ixachiLogoSVG');

            const logoRibbon = new RibbonLine({
                color: new THREE.Color(0xffffff),
                width: 0.5,
                maxLength: logoPathData.curve.points.length,
                useMode: UseMode.Reveal,
            });
            logoRibbon.setPoints(logoPathData.curve.points);
            targets.scene.add(logoRibbon.mesh);

            const hostFollower = new PathFollower(logoPathData, { speed: 10 });

            gsap.to(targets.hostSourceObject.position, {
                x: logoPathData.curve.points[0].x,
                y: logoPathData.curve.points[0].y,
                z: logoPathData.curve.points[0].z,
                duration: 2,
                ease: 'power2.inOut',
                onComplete: () => {
                    const traceTl = gsap.timeline({ onComplete: resolve });

                    traceTl.to(hostFollower, { progress: 1, duration: 5, ease: 'linear' });

                    traceTl.to(logoRibbon.material.uniforms.uDrawProgress, { value: 1, duration: 5, ease: 'linear' }, 0);

                    const updateFn = () => {
                        hostFollower.update(0.016);
                        targets.hostSourceObject.position.copy(hostFollower.position);
                    };

                    gsap.ticker.add(updateFn);

                    traceTl.then(() => {
                        gsap.ticker.remove(updateFn);
                    });
                }
            });
        });
    }
}
