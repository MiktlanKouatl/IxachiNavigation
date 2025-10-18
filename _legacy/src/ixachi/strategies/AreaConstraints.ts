import * as THREE from 'three';
import { Boid } from './Boid';
import { IAreaConstraint } from '../core/IAreaConstraint';

export class CubicAreaConstraint implements IAreaConstraint {
    private bounds: THREE.Vector3;
    private strength: number = 0.1; // Fuerza con la que se empuja al boid de vuelta

    constructor(bounds: { x: number; y: number; z: number }, strength: number = 0.1) {
        this.bounds = new THREE.Vector3(bounds.x, bounds.y, bounds.z);
        this.strength = strength;
    }

    constrain(boid: Boid): void {
        const pos = boid.position;
        const acc = boid.acceleration;

        // X-axis
        if (pos.x > this.bounds.x) {
            acc.x -= (pos.x - this.bounds.x) * this.strength;
        } else if (pos.x < -this.bounds.x) {
            acc.x += (-this.bounds.x - pos.x) * this.strength;
        }

        // Y-axis
        if (pos.y > this.bounds.y) {
            acc.y -= (pos.y - this.bounds.y) * this.strength;
        } else if (pos.y < -this.bounds.y) {
            acc.y += (-this.bounds.y - pos.y) * this.strength;
        }

        // Z-axis
        if (pos.z > this.bounds.z) {
            acc.z -= (pos.z - this.bounds.z) * this.strength;
        } else if (pos.z < -this.bounds.z) {
            acc.z += (-this.bounds.z - pos.z) * this.strength;
        }
    }
}

export class DonutAreaConstraint implements IAreaConstraint {
    private innerRadius: number;
    private outerRadius: number;
    private height: number;
    private strength: number = 0.1; // Fuerza con la que se empuja al boid de vuelta

    constructor(innerRadius: number, outerRadius: number, height: number, strength: number = 0.1) {
        if (innerRadius >= outerRadius) {
            console.warn("DonutAreaConstraint: innerRadius must be less than outerRadius.");
            this.innerRadius = outerRadius - 0.1; // Ensure validity
        } else {
            this.innerRadius = innerRadius;
        }
        this.outerRadius = outerRadius;
        this.height = height;
        this.strength = strength;
    }

    constrain(boid: Boid): void {
        const pos = boid.position;
        const acc = boid.acceleration;

        const distXY = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        // Handle outer radius
        if (distXY > this.outerRadius) {
            const forceDir = new THREE.Vector3(-pos.x, -pos.y, 0).normalize();
            acc.add(forceDir.multiplyScalar((distXY - this.outerRadius) * this.strength));
        }
        // Handle inner radius
        else if (distXY < this.innerRadius) {
            const forceDir = new THREE.Vector3(pos.x, pos.y, 0).normalize();
            acc.add(forceDir.multiplyScalar((this.innerRadius - distXY) * this.strength));
        }

        // Handle height (Z-axis)
        if (pos.z > this.height / 2) {
            acc.z -= (pos.z - this.height / 2) * this.strength;
        } else if (pos.z < -this.height / 2) {
            acc.z += (-this.height / 2 - pos.z) * this.strength;
        }
    }
}
