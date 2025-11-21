import * as THREE from 'three';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';
import { RenderMode, RibbonConfig, UseMode, FadeStyle } from '../../core/RibbonLine';

export type RingState = 'active' | 'collected';

// This interface now defines the style properties with actual THREE.Color objects
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
    private trailHead: number = Math.random(); // Start at a random point

    constructor(position: THREE.Vector3, type: string, tangent: THREE.Vector3, style: RingStyle) {
        this.position = position;
        this.type = type;
        this.style = style;

        const segments = 32;
        const circlePoints = this.generateCirclePoints(style.radius, segments);

        const ribbonConfig: RibbonConfig = {
            color: style.color,
            colorEnd: style.colorEnd, // Use the end color for the gradient
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
        
        // Orient the ring to face the direction of the path
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
        if (this.state === 'active') {
            this.state = 'collected';
            // Make the trail stop and fade to a solid collected color
            this.ribbon.material.uniforms.uColor.value = this.style.collectedColor;
            this.ribbon.material.uniforms.uColorEnd.value = this.style.collectedColor;
            this.ribbon.setTrail(this.trailHead, 0.0);
            this.ribbon.setOpacity(0.25);
            console.log(`Ring of type '${this.type}' collected!`);
        }
    }

    // Getter for backward compatibility with scene.add(ring.mesh)
    public get mesh(): THREE.Mesh {
        return this.ribbon.mesh;
    }
}