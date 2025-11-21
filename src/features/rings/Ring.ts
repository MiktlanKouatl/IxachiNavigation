import * as THREE from 'three';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';
import { RenderMode, RibbonConfig } from '../../core/RibbonLine';

export type RingState = 'active' | 'collected';

// This interface is a subset of the one in RingController, defining what a Ring needs to know
interface RingStyle {
    radius: number;
    width: number;
    color: THREE.Color;
    collectedColor: THREE.Color;
}

export class Ring {
    public ribbon: RibbonLineGPU;
    public state: RingState = 'active';
    public type: string;
    public position: THREE.Vector3;
    
    private style: RingStyle;

    constructor(position: THREE.Vector3, type: string, tangent: THREE.Vector3, style: RingStyle) {
        this.position = position;
        this.type = type;
        this.style = style;

        const segments = 32;
        const circlePoints = this.generateCirclePoints(style.radius, segments);

        const ribbonConfig: RibbonConfig = {
            color: style.color,
            width: style.width,
            maxLength: segments + 1,
            renderMode: RenderMode.Glow,
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

    public collect() {
        if (this.state === 'active') {
            this.state = 'collected';
            this.ribbon.material.uniforms.uColor.value = this.style.collectedColor;
            this.ribbon.setOpacity(0.5); // Fade out slightly
            console.log(`Ring of type '${this.type}' collected!`);
        }
    }

    // Getter for backward compatibility with scene.add(ring.mesh)
    public get mesh(): THREE.Mesh {
        return this.ribbon.mesh;
    }
}