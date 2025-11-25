import * as THREE from 'three';
import { PathController } from '../../core/pathing/PathController';
import { Ring, RingStyle } from './Ring';
import { EventEmitter } from '../../core/EventEmitter';
import { RenderMode, FadeStyle } from '../../core/RibbonLine';
import { ColorManager } from '../../managers/ColorManager';

// This interface now uses string role names for colors
interface RingTypeStyle {
    radius: number;
    width: number;
    color: keyof ColorPalette;
    colorEnd: keyof ColorPalette;
    collectedColor: keyof ColorPalette;
    trailSpeed: number;
    trailLength: number;
    fadeStyle: FadeStyle;
    fadeTransitionSize: number;
    colorMix: number;
    transitionSize: number;
}

export class RingController {
    public onRingCollected = new EventEmitter<{ type: string, collectedCount: number }>();
    public collectedRingsCount = 0;

    private rings: Ring[] = [];
    private scene: THREE.Scene;
    private pathController: PathController;
    private colorManager: ColorManager;

    private ringStyleMap: { [key: string]: RingTypeStyle } = {
        'collection': {
            radius: 1.0,
            width: 1.0,
            color: 'ringCollectionActiveStart',
            colorEnd: 'ringCollectionActiveEnd',
            collectedColor: 'ringCollectionCollectedStart',
            trailSpeed: 0.7,
            trailLength: 1.0,
            fadeStyle: FadeStyle.FadeInOut,
            fadeTransitionSize: 0.5,
            colorMix: 1.0,
            transitionSize: 1.0,
        },
        'event': {
            radius: 3,
            width: 2.0,
            color: 'ringEventActiveStart',
            colorEnd: 'ringEventActiveEnd',
            collectedColor: 'ringEventCollectedStart',
            trailSpeed: 0.7,
            trailLength: 1.0,
            fadeStyle: FadeStyle.FadeInOut,
            fadeTransitionSize: 0.5,
            colorMix: 1.0,
            transitionSize: 1.0,
        }
    };

    constructor(scene: THREE.Scene, pathController: PathController, colorManager: ColorManager) {
        this.scene = scene;
        this.pathController = pathController;
        this.colorManager = colorManager;
    }

    public addRingAt(normalizedDistance: number, type: string): void {
        const style = this.ringStyleMap[type];
        if (!style) {
            console.warn(`Ring style for type "${type}" not found.`);
            return;
        }

        const position = this.pathController.getPointAt(normalizedDistance);
        const tangent = this.pathController.getTangentAt(normalizedDistance);
        
        // Resolve colors from ColorManager
        const ringStyle: RingStyle = {
            radius: style.radius,
            width: style.width,
            color: this.colorManager.getColor(style.color),
            colorEnd: this.colorManager.getColor(style.colorEnd),
            collectedColor: this.colorManager.getColor(style.collectedColor),
            trailSpeed: style.trailSpeed,
            trailLength: style.trailLength,
            fadeStyle: style.fadeStyle,
            fadeTransitionSize: style.fadeTransitionSize,
            colorMix: style.colorMix,
            transitionSize: style.transitionSize,
        }

        const ring = new Ring(position, type, tangent, ringStyle); 

        this.rings.push(ring);
        this.scene.add(ring.mesh);
    }

    public update(deltaTime: number, playerPosition: THREE.Vector3): void {
        for (const ring of this.rings) {
            // Update ring animation
            ring.update(deltaTime);

            // Check for collection
            if (ring.state === 'active') {
                const distance = playerPosition.distanceTo(ring.position);
                const style = this.ringStyleMap[ring.type];
                const triggerDistance = style ? style.radius + 0.5 : 3.5;
                if (distance < triggerDistance) { 
                    ring.collect();
                    this.collectedRingsCount++;
                    this.onRingCollected.emit('collect', { type: ring.type, collectedCount: this.collectedRingsCount });
                }
            }
        }
    }
}