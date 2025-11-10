import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import * as THREE from 'three';
import { RibbonLine, UseMode } from "../../core/RibbonLine";
import { PathFollower } from "../../core/pathing/PathFollower";
import { gsap } from 'gsap';
import { PathData } from "../../core/pathing/PathData";

export class TraceLogoChapter implements IAnimationChapter {
    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        return new Promise(resolve => {
            console.log('TraceLogoChapter started');

            // 1. Camera and HostRibbon animation
            gsap.to(targets.cameraTarget.position, { x: 0, y: 0, z: 25, duration: 2, ease: 'power2.inOut' });
            gsap.to(targets.lookAtTarget.position, { x: 0, y: 0, z: 0, duration: 2, ease: 'power2.inOut' });
            gsap.to(targets.hostRibbon.material.uniforms.uFadeTransitionSize, { value: 1.0, duration: 1.5, ease: 'power1.in' });

            const logoPathData = targets.assetManager.getPath('ixachiLogoSVG');
            if (logoPathData.curves.length === 0) {
                console.warn('TraceLogoChapter: No curves found in logo path data.');
                resolve();
                return;
            }

            const firstPoint = logoPathData.curves[0].points[0];
            gsap.to(targets.hostSourceObject.position, {
                x: firstPoint.x,
                y: firstPoint.y,
                z: firstPoint.z,
                duration: 2,
                ease: 'power2.inOut',
                onComplete: () => {
                    const masterTl = gsap.timeline({ onComplete: resolve });
                    const totalDuration = 5; // Total time to trace all paths

                    for (const curve of logoPathData.curves) {
                        // Create a new PathData for this specific curve to get the "true" curve follower will use
                        const singlePathData = new PathData([curve.points]);
                        const finalCurve = singlePathData.curves[0];

                        // Get a high-resolution set of points from this final curve for drawing
                        const highResPoints = finalCurve.getPoints(150);
                        
                        const logoRibbon = new RibbonLine({
                            color: new THREE.Color(0xffffff),
                            width: 0.5,
                            maxLength: highResPoints.length,
                            useMode: UseMode.Reveal,
                        });
                        logoRibbon.setPoints(highResPoints);
                        targets.scene.add(logoRibbon.mesh);

                        const pathFollower = new PathFollower(singlePathData, { speed: 10 });

                        const duration = (singlePathData.totalLength / logoPathData.totalLength) * totalDuration;

                        const tl = gsap.timeline();
                        tl.to(pathFollower, { 
                            progress: 1, 
                            duration: duration, 
                            ease: 'linear',
                            onUpdate: () => {
                                pathFollower.update(0); // Manual update since we're driving progress
                                targets.hostSourceObject.position.copy(pathFollower.position);
                            }
                        });
                        tl.to(logoRibbon.material.uniforms.uDrawProgress, { value: 1, duration: duration, ease: 'linear' }, 0);
                        
                        masterTl.add(tl);
                    }
                }
            });
        });
    }
}
