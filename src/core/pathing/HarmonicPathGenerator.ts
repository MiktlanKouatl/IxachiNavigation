import * as THREE from 'three';
import { PathData } from './PathData';

export interface FibonacciPathParams {
    numPoints: number;
    radiusScale: number;
    pointSeparation: number;
}

export interface CircularPathParams {
    radius: number;
    numSegments: number;
    pointSeparation: number;
}

export type GridDirection = 'up' | 'down' | 'left' | 'right';

export interface GridPathParams {
    startFila: number;
    startColumna: number;
    direction: GridDirection;
    numSteps: number;
    spacing: number;
    pointSeparation: number; // Distancia entre puntos a lo largo de la curva
    useOffset: boolean;
}

export interface PatternPathParams {
    startFila: number;
    startColumna: number;
    pattern: GridDirection[];
    spacing: number;
    useOffset: boolean;
}

/**
 * Reemplaza a CreativeGrid. Es un generador matemático "Justo-a-Tiempo".
 * No crea objetos 3D, solo calcula los datos de los caminos (PathData)
 * que luego serán consumidos por las RibbonLines.
 */
export class HarmonicPathGenerator {
    
    constructor() {
        // Por ahora, no necesita estado.
    }

    public getGridPosition(fila: number, columna: number, spacing: number, useOffset: boolean): THREE.Vector3 {
        const offset = useOffset ? (fila % 2) * 0.5 : 0;
        const x = (columna + offset) * spacing;
        const z = fila * spacing;
        const y = 0; // Plano en XZ

        return new THREE.Vector3(x, y, z);
    }

    public generateGridPath(params: GridPathParams): PathData {
        const { startFila, startColumna, direction, numSteps, spacing, useOffset } = params;
        const points: THREE.Vector3[] = [];

        let currentFila = startFila;
        let currentColumna = startColumna;

        // Add the starting point
        points.push(this.getGridPosition(currentFila, currentColumna, spacing, useOffset));

        for (let i = 0; i < numSteps; i++) {
            switch (direction) {
                case 'up': currentFila--; break;
                case 'down': currentFila++; break;
                case 'left': currentColumna--; break;
                case 'right': currentColumna++; break;
            }
            points.push(this.getGridPosition(currentFila, currentColumna, spacing, useOffset));
        }
        
        return new PathData([points], false);
    }

    /**
     * Genera un camino siguiendo un patrón de direcciones.
     */
    public generatePatternPath(params: PatternPathParams): PathData {
        const { startFila, startColumna, pattern, spacing, useOffset } = params;
        const points: THREE.Vector3[] = [];

        let currentFila = startFila;
        let currentColumna = startColumna;

        // Add the starting point
        points.push(this.getGridPosition(currentFila, currentColumna, spacing, useOffset));

        // Follow the pattern
        for (const direction of pattern) {
            switch (direction) {
                case 'up': currentFila--; break;
                case 'down': currentFila++; break;
                case 'left': currentColumna--; break;
                case 'right': currentColumna++; break;
            }
            points.push(this.getGridPosition(currentFila, currentColumna, spacing, useOffset));
        }

        return new PathData([points], false);
    }

    public generateFibonacciPath(params: FibonacciPathParams): PathData {
        const { numPoints, radiusScale } = params;
        const points: THREE.Vector3[] = [];
        const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < numPoints; i++) {
            const n = i + 1;
            const radius = radiusScale * Math.sqrt(n);
            const theta = n * GOLDEN_ANGLE;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            const y = 0;
            points.push(new THREE.Vector3(x, y, z));
        }
        return new PathData([points], false);
    }

    public generateCircularPath(params: CircularPathParams): PathData {
        const { radius, numSegments } = params;
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            ));
        }
        return new PathData([points], true);
    }

    /**
     * Convierte coordenadas polares (radio, ángulo) a una posición 3D en el plano XZ.
     */
    public getPolarPosition(radius: number, angle: number): THREE.Vector3 {
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        return new THREE.Vector3(x, 0, z);
    }

    /**
     * Convierte coordenadas cilíndricas (radio, ángulo, altura) a una posición 3D.
     */
    public getCylindricalPosition(radius: number, angle: number, height: number): THREE.Vector3 {
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        return new THREE.Vector3(x, height, z);
    }
}