import * as THREE from 'three';
import { RibbonLineGPU, UseMode } from '../core/RibbonLineGPU';
import { FadeStyle, RibbonConfig } from '../core/RibbonLine';
import { NavigationIntersection } from '../core/navigation/NavigationModel';
import gsap from 'gsap';

interface Arrow extends THREE.Group {
    line: RibbonLineGPU;
    animation?: gsap.core.Tween;
}

export class IntersectionUIController {
    private container: THREE.Group;
    private arrows: { [key: string]: Arrow } = {};
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;

    constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
        this.camera = camera;
        this.scene = scene;
        this.container = new THREE.Group();
        this.scene.add(this.container);
        this.container.visible = false;

        this.createArrows();
    }

    private createArrows(): void {
        const baseArrowOutline = [
            new THREE.Vector3(0.5, 0.6, 0),   // Top-outer
            new THREE.Vector3(-0.2, 0, 0),       // Tip
            new THREE.Vector3(0.5, -0.6, 0),  // Bottom-outer

            new THREE.Vector3(0.5, -0.4, 0), // Bottom-inner
            new THREE.Vector3(0.2, 0, 0),     // Middle-inner
            new THREE.Vector3(0.5, 0.4, 0),  // Top-inner
        ];

        const numPoints = 60;
        const config: RibbonConfig = {
            maxLength: numPoints,
            width: 0.3,
            color: new THREE.Color(0x00ffdd),
            colorEnd: new THREE.Color(0x0066ff),
            transitionSize: 1.0,
            colorMix: 0.9,
            fadeTransitionSize: 0.2,
            opacity: 1.0,
            useMode: UseMode.Trail,
            fadeStyle: FadeStyle.FadeInOut,
        };

        const directions = { 
            right: 0,
            left: Math.PI, 
            up: Math.PI / 2,
            down: -Math.PI / 2 
        };

        for (const [dir, angle] of Object.entries(directions)) {
            const rotatedShape = baseArrowOutline.map(p => p.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), angle));
            const curve = new THREE.CatmullRomCurve3(rotatedShape, true);
            const densePath = curve.getPoints(numPoints - 1);

            // --- DEBUG VISUALIZATION ---
            const lineGeom = new THREE.BufferGeometry().setFromPoints(densePath);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xff00ff });
            const pathVisualizer = new THREE.Line(lineGeom, lineMat);
            // --- END DEBUG ---

            const line = new RibbonLineGPU(densePath, { ...config, maxLength: numPoints });
            line.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

            const group = new THREE.Group() as Arrow;
            group.line = line;
            group.add(line.mesh);
            group.add(pathVisualizer); // Add the visualizer to the group
            this.arrows[dir] = group;
            this.container.add(group);
        }

        this.arrows.up.position.set(0, 1.2, 0);
        this.arrows.down.position.set(0, -1.2, 0);
        this.arrows.left.position.set(-1.2, 0, 0);
        this.arrows.right.position.set(1.2, 0, 0);
    }

    public show(intersection: NavigationIntersection): void {
        console.log('🎨 [IntersectionUI] Showing arrows for', intersection.choices);
        this.container.visible = true;

        Object.values(this.arrows).forEach(arrow => arrow.visible = false);

        for (const choice of intersection.choices) {
            const arrow = this.arrows[choice.direction];
            if (arrow) {
                arrow.visible = true;
                
                const trailLength = 0.9;
                arrow.line.setTrail(0, trailLength);

                arrow.animation = gsap.fromTo(arrow.line.material.uniforms.uTrailHead, 
                    { value: 0 }, 
                    { 
                        value: 2.0, 
                        duration: 2.0, 
                        ease: 'none',
                        repeat: -1,
                    }
                );
            }
        }
    }

    public hide(): void {
        console.log('🎨 [IntersectionUI] Hiding arrows.');
        this.container.visible = false;
        Object.values(this.arrows).forEach(arrow => {
            arrow.animation?.kill();
        });
    }

    public updateResolution(width: number, height: number): void {
        for (const arrow of Object.values(this.arrows)) {
            arrow.line.material.uniforms.uResolution.value.set(width, height);
        }
    }

    public update(): void {
        if (!this.container.visible) return;

        this.container.quaternion.copy(this.camera.quaternion);

        const distance = 5;
        const position = this.camera.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(distance));
        this.container.position.copy(position);
    }
}
