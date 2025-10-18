import * as THREE from 'three';
import { Boid } from '../Boid';
import { IAreaConstraint } from './IAreaConstraint';

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