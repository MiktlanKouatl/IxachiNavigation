import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import * as THREE from 'three';
import { RibbonLine, UseMode, RibbonConfig, FadeStyle } from '../../core/RibbonLine';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';
import { PathFollower } from "../../core/pathing/PathFollower";
import { gsap } from 'gsap';
import { PathData } from "../../core/pathing/PathData";

export class TraceLogoChapter implements IAnimationChapter {
    private revealRibbons: RibbonLine[] = [];
    private trailRibbons: RibbonLineGPU[] = [];
    private trailLoop: gsap.core.Tween | null = null;
    private allTweens: gsap.core.Tween[] = [];
    private scene: THREE.Scene | null = null;
    private logoContainer: THREE.Group | null = null;

    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        // This chapter's promise should never resolve, as it runs an infinite loop.
        return new Promise(() => {
            console.log('TraceLogoChapter started');

            this.scene = targets.scene;

            // --- Animation Parameters ---
            const params = {
                revealDuration: 4.0,
                staticOpacity: 0.15,
                crossfadeDuration: 2.5,
                trailSpeed: 0.2,
                trailLength: 0.7,
            };

            // --- Initial Setup ---
            // No camera movement, respect the end position of JourneyChapter.
            // The logo will appear in front of the camera.
            this.logoContainer = new THREE.Group();
            this.logoContainer.position.set(0, 0, -85);
            this.scene.add(this.logoContainer);

            // Point the camera at the new logo position.
            targets.lookAtTarget.position.copy(this.logoContainer.position);

            this.allTweens.push(
                gsap.to(targets.hostRibbon.material.uniforms.uFadeTransitionSize, { value: 1.0, duration: 1.5, ease: 'power1.in' })
            );

            const logoPathData = targets.assetManager.getPath('ixachiLogoSVG');
            if (logoPathData.curves.length === 0) {
                console.warn('TraceLogoChapter: No curves found in logo path data.');
                // In a non-resolving promise, we can't resolve, but we can stop.
                return;
            }

            // --- Create Ribbons ---
            const { colorManager } = targets;
            for (const curve of logoPathData.curves) {
                const highResPoints = new PathData([curve.points]).curves[0].getPoints(150);
                
                const revealRibbon = new RibbonLine({
                    color: colorManager.getColor('primary'),
                    width: 0.5,
                    maxLength: highResPoints.length,
                    useMode: UseMode.Reveal,
                    fadeStyle: FadeStyle.None,
                });
                revealRibbon.material.uniforms.uDrawProgress.value = 0; // Set initial state for animation
                revealRibbon.setPoints(highResPoints);
                this.logoContainer.add(revealRibbon.mesh);
                this.revealRibbons.push(revealRibbon);

                const trailConfig: RibbonConfig = {
                    color: colorManager.getColor('ribbonDefault'),
                    width: 0.5,
                    maxLength: highResPoints.length,
                    useMode: UseMode.Trail,
                    fadeStyle: FadeStyle.FadeInOut,
                    opacity: 0,
                };
                const trailRibbon = new RibbonLineGPU(highResPoints, trailConfig);
                this.logoContainer.add(trailRibbon.mesh);
                this.trailRibbons.push(trailRibbon);

                // Add listener for palette changes
                colorManager.on('update', () => {
                    revealRibbon.material.uniforms.uColor.value.copy(colorManager.getColor('primary'));
                    trailRibbon.material.uniforms.uColor.value.copy(colorManager.getColor('ribbonDefault'));
                });
            }

            // --- Reveal Animation ---
            const revealTl = gsap.timeline({
                onComplete: () => {
                    // --- Start Loop Animation after Reveal ---
                    console.log('Starting crossfade and trail loop...');
                    
                    const fadeTl = gsap.timeline();
                    this.allTweens.push(fadeTl);
                    for (const ribbon of this.revealRibbons) {
                        fadeTl.to(ribbon.material.uniforms.uOpacity, {
                            value: params.staticOpacity,
                            duration: params.crossfadeDuration
                        }, 0);
                    }
                    for (const ribbon of this.trailRibbons) {
                        fadeTl.to(ribbon.material.uniforms.uOpacity, {
                            value: 1.0,
                            duration: params.crossfadeDuration
                        }, 0);
                    }

                    const progress = { value: 0 };
                    this.trailLoop = gsap.to(progress, {
                        value: 1,
                        duration: 1 / params.trailSpeed,
                        ease: 'none',
                        repeat: -1,
                        onUpdate: () => {
                            for (const ribbon of this.trailRibbons) {
                                ribbon.setTrail(progress.value, params.trailLength);
                            }
                        }
                    });
                }
            });
            this.allTweens.push(revealTl);

            for (const ribbon of this.revealRibbons) {
                revealTl.to(ribbon.material.uniforms.uDrawProgress, {
                    value: 1,
                    duration: params.revealDuration,
                    ease: 'power1.inOut'
                }, 0);
            }
        });
    }

    public stop(): void {
        console.log('Stopping TraceLogoChapter');
        if (this.trailLoop) this.trailLoop.kill();
        for (const tween of this.allTweens) tween.kill();
        this.allTweens = [];

        if (this.scene) {
            if (this.logoContainer) {
                this.scene.remove(this.logoContainer);
            }
            for (const ribbon of this.revealRibbons) {
                ribbon.dispose();
            }
            for (const ribbon of this.trailRibbons) {
                ribbon.dispose();
            }
        }
        this.revealRibbons = [];
        this.trailRibbons = [];
        this.logoContainer = null;
        this.scene = null;
    }
}
