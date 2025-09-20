// src/ixachi/strategies/TrailController.ts
import * as THREE from 'three';
import { ILineController } from '../core/ILineController';
import { IMotionSource } from '../core/IMotionSource';
import { RibbonLine } from '../core/RibbonLine';

export class TrailController implements ILineController {
    private ribbon: RibbonLine;
    private motionSource: IMotionSource;
    private points: THREE.Vector3[];
    private maxLength: number;

    constructor(ribbon: RibbonLine, motionSource: IMotionSource, maxLength: number = 100) {
        this.ribbon = ribbon;
        this.motionSource = motionSource;
        this.maxLength = maxLength;
        this.points = [];
    }

    public update(deltaTime: number, elapsedTime: number): void {
        // Primero, le decimos a nuestra fuente de movimiento que actualice su propia lógica.
        this.motionSource.update(deltaTime, elapsedTime);

        // Luego, hacemos el trabajo de crear la estela.
        const newPoint = this.motionSource.position.clone();
        this.points.unshift(newPoint);

        if (this.points.length > this.maxLength) {
            this.points.pop();
        }
                
        //console.log(`[TrailController]: Actualizando con ${this.points.length} puntos.`);

        //this.ribbon.updatePoints(this.points);
        this.ribbon.setPoints(this.points);
    }
}