
import * as THREE from 'three';
import { PathController } from '../../core/pathing/PathController';
import { Ring } from './Ring';
import { EventEmitter } from '../../core/EventEmitter';
import { RenderMode, RibbonConfig } from '../../core/RibbonLine';

interface RingStyle {
    radius: number;
    width: number;
    color: THREE.Color;
    collectedColor: THREE.Color;
}

export class RingController {
    public onRingCollected = new EventEmitter<{ type: string, collectedCount: number }>();
    public collectedRingsCount = 0;

    private rings: Ring[] = [];
    private scene: THREE.Scene;
    private pathController: PathController;

    private ringStyleMap: { [key: string]: RingStyle } = {
        'collection': {
            radius: 0.8,
            width: 0.2,
            color: new THREE.Color(0x00ffff),
            collectedColor: new THREE.Color(0x555555)
        },
        'event': {
            radius: 3,
            width: 0.5,
            color: new THREE.Color(0xffdd00),
            collectedColor: new THREE.Color(0x888888)
        }
    };

    constructor(scene: THREE.Scene, pathController: PathController) {
        this.scene = scene;
        this.pathController = pathController;
    }

    public addRingAt(normalizedDistance: number, type: string): void {
        const style = this.ringStyleMap[type];
        if (!style) {
            console.warn(`Ring style for type "${type}" not found.`);
            return;
        }

        const position = this.pathController.getPointAt(normalizedDistance);
        const tangent = this.pathController.getTangentAt(normalizedDistance);
        
        const ring = new Ring(position, type, tangent, style); 

        this.rings.push(ring);
        this.scene.add(ring.mesh);
    }

    public update(playerPosition: THREE.Vector3): void {
        for (const ring of this.rings) {
            if (ring.state === 'active') {
                const distance = playerPosition.distanceTo(ring.position);
                const style = this.ringStyleMap[ring.type]; // Retrieve style for correct trigger distance
                const triggerDistance = style ? style.radius + 0.5 : 3.5; // Use ring's radius for trigger
                if (distance < triggerDistance) { 
                    ring.collect();
                    this.collectedRingsCount++;
                    this.onRingCollected.emit('collect', { type: ring.type, collectedCount: this.collectedRingsCount });
                }
            }
        }
    }
}
