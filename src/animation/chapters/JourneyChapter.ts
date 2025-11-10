import * as THREE from 'three';
import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import { PathData } from '../../core/pathing/PathData';
import { ProceduralRibbonLine, ProceduralRibbonConfig } from '../../core/ProceduralRibbonLine';
import { Text } from 'troika-three-text';
import { gsap } from 'gsap';
import { PathFollower } from '../../core/pathing/PathFollower';
import { FadeStyle } from '../../core/RibbonLine';

// Extend the class slightly to hold animation properties
interface AnimatingRibbonLine extends ProceduralRibbonLine {
    initialSeed?: number;
    animationSpeed?: number;
}

export class JourneyChapter implements IAnimationChapter {
    private settings = {
        journey: {
            speed: 7.6032,
            revealDistance: 0.1,
            horizontalRange: 0.82,
            verticalRange: 0.5,
            smoothing: 0.03496,
            textFadeDistance: 8.6,
            masterAnimationSpeed: 0.06,
            animationIndividuality: 1,
            wordStartProgress: 0.217,
            wordEndProgress: 0.906,
            textVerticalOffset: 1.48,
            textFadeDuration: 5,
            hostRibbonYOffset: -15.0, // Offset for the host ribbon
            hostRibbonZOffset: -25.0, // Offset for the host ribbon in Z
            },
            ribbon: {
                width: 1.5409,
                radius: 3,
                radiusVariation: 0.04,
                angleFrequency: 0.1,
                radiusFrequency: 0.1,
            }
        };
            
                private disposables: { dispose: () => void }[] = [];
                private animationFrameId: number | null = null;
                private originalStrategy: any = null; // To store the original strategy
                private mouse = new THREE.Vector2();
            
                public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
                    return new Promise(resolve => {
                        console.log('JourneyChapter started');
                        const { scene, camera, hostRibbon, hostFollower, movementController, lookAtTarget } = targets;
            
                        // --- Takeover ---
                        this.originalStrategy = movementController.getActiveStrategy();
                        movementController.setStrategy(null); // Pause main loop's control
                        targets.enableDrawing(true);
            
                        // --- Path ---
                        const startPoint = new THREE.Vector3(0, 0, 20);
                        const endPoint = new THREE.Vector3(0, 0, -60);
                        const pathLengthZ = Math.abs(startPoint.z - endPoint.z);
                        const numIntermediatePoints = 3;
                        const randomness = 15; // The range for x/y, e.g., [-7.5, 7.5]
                        const controlPoints = [startPoint];
                        for (let i = 1; i <= numIntermediatePoints; i++) {
                            const progress = i / (numIntermediatePoints + 1);
                            const z = startPoint.z - progress * pathLengthZ;
                            const x = (Math.random() - 0.5) * randomness;
                            const y = (Math.random() - 0.5) * randomness;
                            controlPoints.push(new THREE.Vector3(x, y, z));
                        }
                        controlPoints.push(endPoint);
                        const pathData = new PathData([controlPoints], false);
                        const divisions = 200;
                        const { normals, binormals } = pathData.curves[0].computeFrenetFrames(divisions, false);
                        
                        hostFollower.setPath(pathData);
                        hostFollower.setSpeed(this.settings.journey.speed);
            
                        // --- Ribbons ---
                        const ribbonSettings: ProceduralRibbonConfig = {
                            maxLength: divisions + 1,
                            ...this.settings.ribbon
                        };
            
                        const ribbons: AnimatingRibbonLine[] = [];
                        for (let i = 0; i < 4; i++) {
                            const ribbon = new ProceduralRibbonLine(pathData, {
                                ...ribbonSettings,
                                seed: Math.random() * 100,
                                color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
                                colorEnd: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
                                fadeStyle: FadeStyle.FadeInOut, // FadeIn
                                fadeTransitionSize: 20.0,
                            });
                            ribbon.initialSeed = ribbon.material.uniforms.uSeed.value;
                            ribbon.animationSpeed = Math.random() * 0.8 + 0.6;
                            scene.add(ribbon.mesh);
                            this.disposables.push(ribbon);
                            ribbons.push(ribbon);
                        }
            
                        ribbons.forEach((ribbon, i) => {
                            gsap.to(ribbon.material.uniforms.uFadeTransitionSize, {
                                value: 0.9,
                                duration: 3,
                                delay: i * 0.2, // Stagger the animations
                                ease: 'power2.inOut',
                            });
                        });

                        // Animate hostRibbon's uFadeTransitionSize
                        gsap.to(targets.hostRibbon.material.uniforms.uFadeTransitionSize, {
                            value: 20.0, // Your target value
                            duration: 2.0,
                            ease: 'power2.inOut',
                        });
            
                        // --- Text ---
                        const textObjects: Text[] = [];
                        const words = [
                            "Igual", "de", "importante", "que el", "mensaje",
                            "es la", "forma en", "que lo", "transmites"
                        ];
                        const startProgress = this.settings.journey.wordStartProgress;
                        const endProgress = this.settings.journey.wordEndProgress;
                        const range = endProgress - startProgress;
                        const textChapters = words.map((word, index) => {
                            const progress = startProgress + (index / (words.length - 1)) * range;
                            return { progress, text: word };
                        });
            
                        textChapters.forEach(chapter => {
                            const text = new Text();
                            text.text = chapter.text;
                            text.fontSize = 1.5;
                            text.color = 0xffffff;
                            text.anchorX = 'center';
                            text.material.transparent = true;
                            text.fillOpacity = 0;
                            const point = pathData.curves[0].getPointAt(chapter.progress);
                            text.position.copy(point);
                            text.position.y += this.settings.journey.textVerticalOffset;
                            scene.add(text);
                            textObjects.push(text);
                            this.disposables.push(text);
                        });
            
                        // --- Animation ---
                        const clock = new THREE.Clock();
                        const cameraOffset = new THREE.Vector2();
                        window.addEventListener('mousemove', this.onMouseMove);
            
                        const animate = () => {
                            this.animationFrameId = requestAnimationFrame(animate);
                            const deltaTime = clock.getDelta();
                            const elapsedTime = clock.getElapsedTime();
            
                            hostFollower.update(deltaTime);
                            cameraOffset.lerp(this.mouse, this.settings.journey.smoothing);
            
                            const basePosition = hostFollower.position;
                            const curveIndex = Math.floor(hostFollower.progress * divisions);
                            const normal = normals[curveIndex];
                            const binormal = binormals[curveIndex];
                            const rightVec = normal;
                            const upVec = binormal;
            
                            const offset = new THREE.Vector3()
                                .add(rightVec.clone().multiplyScalar(cameraOffset.x * this.settings.journey.horizontalRange))
                                .add(upVec.clone().multiplyScalar(cameraOffset.y * this.settings.journey.verticalRange));
                            
                            targets.cameraTarget.position.copy(basePosition).add(offset);
            
                            const lookAtProgress = (hostFollower.progress + 0.05) % 1.0;
                            const lookAtPosition = pathData.curves[0].getPointAt(lookAtProgress);
                            const lookAtOffset = new THREE.Vector3()
                                .add(rightVec.clone().multiplyScalar(cameraOffset.x * this.settings.journey.horizontalRange * 0.2))
                                .add(upVec.clone().multiplyScalar(cameraOffset.y * this.settings.journey.verticalRange * 0.2));
                            lookAtTarget.position.copy(lookAtPosition.add(lookAtOffset));
            
                            const revealStart = hostFollower.progress;
                            const revealEnd = (hostFollower.progress + this.settings.journey.revealDistance) % 1.0;
                            ribbons.forEach(r => {
                                r.setRevealWindow(revealStart, revealEnd);
                                const baseSpeed = 1.0;
                                const effectiveSpeedMultiplier = THREE.MathUtils.lerp(baseSpeed, r.animationSpeed, this.settings.journey.animationIndividuality);
                                r.material.uniforms.uSeed.value = r.initialSeed + elapsedTime * effectiveSpeedMultiplier * this.settings.journey.masterAnimationSpeed;
                            });
            
                            targets.hostSourceObject.position.copy(hostFollower.position);
                            targets.hostSourceObject.position.y += this.settings.journey.hostRibbonYOffset; // Apply Y offset
                            targets.hostSourceObject.position.z += this.settings.journey.hostRibbonZOffset; // Apply Z offset
            
                            textObjects.forEach(text => {
                                const distance = camera.position.distanceTo(text.position);
                                const opacity = 1.0 - THREE.MathUtils.smoothstep(distance, this.settings.journey.textFadeDistance, this.settings.journey.textFadeDistance + this.settings.journey.textFadeDuration);
                                text.fillOpacity = opacity;
                                text.lookAt(camera.position);
                            });
                            
                            if (hostFollower.isAtEnd) {
                                director.playChapter('TraceLogo').then(resolve);
                            }
                        };
            
                        animate();
                    });
                }
            
                private onMouseMove = (event: MouseEvent) => {
                    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                };
            
                public stop(targets: AnimationTargets): void {
                    if (this.animationFrameId) {
                        cancelAnimationFrame(this.animationFrameId);
                    }
                    window.removeEventListener('mousemove', this.onMouseMove);
                    targets.movementController.setStrategy(this.originalStrategy);
                    targets.enableDrawing(false);
            
                    this.disposables.forEach(item => {
                        if (item instanceof ProceduralRibbonLine) {
                            targets.scene.remove(item.mesh);
                        }
                        if (item instanceof Text) {
                            targets.scene.remove(item);
                        }
                        item.dispose();
                    });
                    this.disposables = [];
                }
            }