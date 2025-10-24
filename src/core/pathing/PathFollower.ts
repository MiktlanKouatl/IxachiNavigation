// src/core/pathing/PathFollower.ts
import * as THREE from 'three';
import { IMotionSource } from '../../types/IMotionSource';
import { PathData } from './PathData';

interface FollowerOptions {
    speed?: number;
    initialProgress?: number; // Progreso inicial (0 a 1)
    loop?: boolean;
}

/**
 * Representa un objeto individual que sigue un PathData.
 * Implementa IMotionSource y tiene su propio estado de movimiento.
 */
export class PathFollower implements IMotionSource {
    public readonly position: THREE.Vector3;
    public readonly direction: THREE.Vector3;
    public isAtEnd: boolean = false;
    
    public progress: number;
    public loop: boolean;
    private pathData: PathData;
    private speed: number;

    constructor(pathData: PathData, options: FollowerOptions = {}) {
        this.pathData = pathData;
        this.speed = options.speed ?? 5.0;
        this.progress = options.initialProgress ?? 0;
        this.loop = options.loop ?? this.pathData.curve.closed;

        this.position = this.pathData.curve.getPointAt(this.progress);
        this.direction = this.pathData.curve.getTangentAt(this.progress).normalize();
    }

    public setPath(newPathData: PathData): void {
        this.pathData = newPathData;
        this.progress = 0;
        this.isAtEnd = false;
    }

    public update(deltaTime: number): void {
        if (this.isAtEnd && !this.loop) return;

        if (this.pathData.totalLength > 0) {
            const distanceToTravel = this.speed * deltaTime;
            const progressIncrement = distanceToTravel / this.pathData.totalLength;
            this.progress += progressIncrement;
        }

        if (this.progress >= 1) {
            if (this.loop) {
                this.progress %= 1;
            } else {
                this.progress = 1;
                this.isAtEnd = true;
            }
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
