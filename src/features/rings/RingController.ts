
import * as THREE from 'three';
import { PathController } from '../../core/pathing/PathController';
import { Ring } from './Ring';
import { EventEmitter } from '../../core/EventEmitter';

export class RingController {
    public onRingCollected = new EventEmitter<{ type: string, collectedCount: number }>();
    public collectedRingsCount = 0;

    private rings: Ring[] = [];
    private scene: THREE.Scene;
    private pathController: PathController;

    constructor(scene: THREE.Scene, pathController: PathController) {
        this.scene = scene;
        this.pathController = pathController;
    }

    public addRingAt(normalizedDistance: number, type: string): void {
        const position = this.pathController.getPointAt(normalizedDistance);
        const tangent = this.pathController.getTangentAt(normalizedDistance);
        const ring = new Ring(position, type, tangent);

        this.rings.push(ring);
        this.scene.add(ring.mesh);
    }

    public update(playerPosition: THREE.Vector3): void {
        for (const ring of this.rings) {
            if (ring.state === 'active') {
                const distance = playerPosition.distanceTo(ring.position);
                // The trigger distance should be close to the ring's radius
                if (distance < 3.5) { 
                    ring.collect();
                    this.collectedRingsCount++;
                    this.onRingCollected.emit('collect', { type: ring.type, collectedCount: this.collectedRingsCount });
                }
            }
        }
    }
}
