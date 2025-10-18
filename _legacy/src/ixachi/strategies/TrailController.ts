// src/ixachi/strategies/TrailController.ts

import * as THREE from 'three';
import { ILineController } from '../../../src/core/ILineController';
import { IMotionSource } from '../../../src/types/IMotionSource';
import { RibbonLine } from '../core/RibbonLine';

interface TrailOptions {
    trailLength?: number;
    speed?: number; // Este speed controla qué tan rápido sigue la estela a la guía
}

export class TrailController implements ILineController {
    private ribbon: RibbonLine;
    private motionSource: IMotionSource;
    private points: THREE.Vector3[];
    private trailLengthRatio: number; // Porcentaje de la curva visible
    private head: number = 0; // OPTIMIZACIÓN: Puntero a la cabeza de nuestro buffer circular

    constructor(ribbon: RibbonLine, motionSource: IMotionSource, options: TrailOptions = {}) {
        this.ribbon = ribbon;
        this.motionSource = motionSource;
        
        // El trailLength ahora se define como un ratio de 0 a 1 de la longitud máxima de la cinta
        this.trailLengthRatio = options.trailLength ?? 0.5;
        
        // Inicializamos el array de puntos con una longitud fija, lleno de copias del punto inicial.
        // Esto evita re-alocaciones de memoria.
        this.points = [];
        const initialPoint = this.motionSource.position;
        const maxPoints = this.ribbon.getMaxPoints();
        for (let i = 0; i < maxPoints; i++) {
            this.points.push(initialPoint.clone());
        }
    }

    public update(deltaTime: number): void {
        // La fuente de movimiento (PathGuideV2) ya se actualiza desde el LineManager,
        // por lo que no necesitamos llamarlo de nuevo aquí.

        // --- OPTIMIZACIÓN: Lógica de Buffer Circular ---
        // 1. Obtenemos el nuevo punto de la guía.
        const newPoint = this.motionSource.position;
        const maxPoints = this.ribbon.getMaxPoints();

        // 2. Sobrescribimos el punto en la posición de la "cabeza"
        this.points[this.head].copy(newPoint);

        // 3. Movemos el puntero de la cabeza, reiniciándolo si llega al final.
        this.head = (this.head + 1) % maxPoints;
        
        // --- Lógica de la Estela ---
        const trailPointCount = Math.floor(maxPoints * this.trailLengthRatio);
        const trailPoints: THREE.Vector3[] = [];

        // Reconstruimos el array de la estela en el orden correcto para el RibbonLine
        for (let i = 0; i < trailPointCount; i++) {
            const index = (this.head - 1 - i + maxPoints) % maxPoints;
            trailPoints.push(this.points[index]);
        }

        this.ribbon.setPoints (trailPoints);
    }
}