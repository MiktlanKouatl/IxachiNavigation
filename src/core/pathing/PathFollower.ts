// src/core/pathing/PathFollower.ts
import * as THREE from 'three';
import { IMotionSource } from '../../types/IMotionSource';
import { PathData } from './PathData';

interface FollowerOptions {
    speed?: number;
    initialProgress?: number; // Progreso inicial (0 a 1)
}

/**
 * Representa un objeto individual que sigue un PathData.
 * Implementa IMotionSource y tiene su propio estado de movimiento.
 */
export class PathFollower implements IMotionSource {
    public readonly position: THREE.Vector3;
    public readonly direction: THREE.Vector3;
    
    private pathData: PathData;
    private speed: number;
    private progress: number;

    constructor(pathData: PathData, options: FollowerOptions = {}) {
        this.pathData = pathData;
        this.speed = options.speed ?? 5.0;
        this.progress = options.initialProgress ?? 0;

        this.position = this.pathData.curve.getPointAt(this.progress);
        this.direction = this.pathData.curve.getTangentAt(this.progress).normalize();
    }

    public update(deltaTime: number): void {
        const distanceToTravel = this.speed * deltaTime;
        const progressIncrement = distanceToTravel / this.pathData.totalLength;
        this.progress += progressIncrement;

        if (this.progress >= 1) {
            this.progress %= 1; // Siempre en bucle por ahora
        }
        
        this.position.copy(this.pathData.curve.getPointAt(this.progress));
        this.direction.copy(this.pathData.curve.getTangentAt(this.progress)).normalize();
    }

    public setSpeed(newSpeed: number): void {
        this.speed = newSpeed;
    }

    getPosition(): THREE.Vector3 { return this.position; }
    getDirection(): THREE.Vector3 { return this.direction; }
    getSpeed(): number { return this.speed; }
}
