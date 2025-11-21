import * as THREE from 'three';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';
import { RenderMode, RibbonConfig, UseMode, FadeStyle } from '../../core/RibbonLine';
import gsap from 'gsap';

export type RingState = 'active' | 'collecting' | 'collected';

export interface RingStyle {
    radius: number;
    width: number;
    color: THREE.Color;
    colorEnd: THREE.Color;
    collectedColor: THREE.Color;
    trailSpeed: number;
    trailLength: number;
    fadeStyle: FadeStyle;
    fadeTransitionSize: number;
    colorMix: number;
    transitionSize: number;
}

export class Ring {
    public ribbon: RibbonLineGPU;
    public state: RingState = 'active';
    public type: string;
    public position: THREE.Vector3;
    
    private style: RingStyle;
    private trailHead: number = Math.random();

    constructor(position: THREE.Vector3, type: string, tangent: THREE.Vector3, style: RingStyle) {
        this.position = position;
        this.type = type;
        this.style = style;

        const segments = 32;
        const circlePoints = this.generateCirclePoints(style.radius, segments);

        const ribbonConfig: RibbonConfig = {
            color: style.color,
            colorEnd: style.colorEnd,
            width: style.width,
            maxLength: segments + 1,
            renderMode: RenderMode.Glow,
            useMode: UseMode.Trail,
            fadeStyle: style.fadeStyle,
            fadeTransitionSize: style.fadeTransitionSize,
            colorMix: style.colorMix,
            transitionSize: style.transitionSize,
        };

        this.ribbon = new RibbonLineGPU(circlePoints, ribbonConfig);
        this.ribbon.mesh.position.copy(position);
        
        this.ribbon.mesh.lookAt(position.clone().add(tangent));
    }

    private generateCirclePoints(radius: number, segments: number): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }
        return points;
    }
    
    public update(deltaTime: number): void {
        if (this.state === 'active') {
            this.trailHead = (this.trailHead + this.style.trailSpeed * deltaTime) % 1.0;
            this.ribbon.setTrail(this.trailHead, this.style.trailLength);
        }
    }

    public collect() {
        if (this.state !== 'active') return;

        this.state = 'collecting';

        const tl = gsap.timeline({
            onComplete: () => {
                this.ribbon.material.uniforms.uColor.value = this.style.collectedColor;
                this.ribbon.material.uniforms.uColorEnd.value = this.style.collectedColor;
                this.ribbon.mesh.scale.set(0.5, 0.5, 0.5);
                
                gsap.to(this.ribbon.mesh.scale, {
                    x: 1, y: 1, z: 1,
                    duration: 0.5,
                    ease: 'power2.out'
                });
                gsap.to(this.ribbon.material.uniforms.uWidth, {
                    value: this.style.width,
                    duration: 0.5,
                    ease: 'power2.out'
                });
                gsap.to(this.ribbon.material.uniforms.uOpacity, {
                    value: 0.25,
                    duration: 0.5
                });
                
                this.ribbon.setTrail(0, 1.0);
                this.state = 'collected';
            }
        });

        // Animate out
        tl.to(this.ribbon.mesh.scale, {
            x: 4, y: 4, z: 4,
            duration: 0.5,
            ease: 'power2.in'
        }, 0);
        tl.to(this.ribbon.material.uniforms.uWidth, {
            value: 0.0,
            duration: 0.5,
            ease: 'power1.in'
        }, 0);
        
        console.log(`Ring of type '${this.type}' collection started!`);
    }

    public get mesh(): THREE.Mesh {
        return this.ribbon.mesh;
    }
}
