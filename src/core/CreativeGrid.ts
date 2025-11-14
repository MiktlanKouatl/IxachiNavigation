import * as THREE from 'three';
import { kdTree } from 'kd-tree-javascript';
import gridVisualVertex from '../shaders/grid_visual.vert.glsl?raw';
import gridVisualFragment from '../shaders/grid_visual.frag.glsl?raw';

export interface CreativeGridParams {
    scene: THREE.Scene;
    numLayers: number;
    maxRadius: number;
    fibStartLayer: number;
    pointSize: number;
    color: THREE.Color;
    numPlanes: number; // Nuevo: para el cilindro
    planeSpacing: number; // Nuevo: para el cilindro
}

// Coordenada de Red (simplificada, ahora es más un dato de origen)
export type GridCoord = [number, number];

interface PointData {
    x: number;
    y: number;
    z: number;
    index: number; // El índice 'n' global del punto
    coord: GridCoord; // La coordenada de red [capa, indice]
    plane: number; // En qué plano del cilindro está
}

/**
 * Programa 1: El "Tejido-Armónico" v2 (Cilindro 3D)
 * Genera una red de puntos de referencia en un cilindro 3D.
 */
export class CreativeGrid {
    private scene: THREE.Scene;
    private params: CreativeGridParams;

    // --- Mapa de la Red ---
    private pointsData: PointData[] = [];
    private gridTexture: THREE.DataTexture | null = null;
    private neighborTexture: THREE.DataTexture | null = null;
    
    // --- Visualización ---
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private points: THREE.Points;

    private fibSequence: number[] = [];

    constructor(params: CreativeGridParams) {
        this.scene = params.scene;
        this.params = params;

        this.generateFibSequence(params.fibStartLayer + 15); 
        this.generateGridData();
        this.buildNeighborMap();
        this.createTextures();
        this.createVisuals();
    }

    private generateFibSequence(count: number): void {
        this.fibSequence = [0, 1];
        for (let i = 2; i < count + 1; i++) {
            this.fibSequence.push(this.fibSequence[i - 1] + this.fibSequence[i - 2]);
        }
    }

    private getFib(n: number): number {
        return this.fibSequence[n] || this.fibSequence[this.fibSequence.length - 1];
    }

    /**
     * Genera los datos de la red en un cilindro 3D.
     */
    private generateGridData(): void {
        const { numLayers, maxRadius, fibStartLayer, numPlanes, planeSpacing } = this.params;
        const positions: number[] = [];
        
        this.pointsData = [];
        let globalIndex = 0;

        // Punto central único para todo el cilindro
        this.pointsData.push({ x: 0, y: 0, z: 0, index: globalIndex, coord: [0, 0], plane: -1 });
        positions.push(0, 0, 0);
        globalIndex++;

        // Genera cada plano del cilindro
        for (let p = 0; p < numPlanes; p++) {
            const yOffset = (p - (numPlanes - 1) / 2) * planeSpacing;

            // Genera las capas concéntricas para este plano
            for (let i = 1; i <= numLayers; i++) {
                const radius = (i / numLayers) * maxRadius;
                
                const fibIndex = Math.floor((i / numLayers) * 10) + fibStartLayer;
                const numPointsInLayer = this.getFib(fibIndex);

                if (numPointsInLayer < 1) continue;

                for (let j = 0; j < numPointsInLayer; j++) {
                    const angle = (j / numPointsInLayer) * Math.PI * 2;
                    
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;

                    positions.push(x, yOffset, z);
                    this.pointsData.push({ x, y: yOffset, z, index: globalIndex, coord: [i, j], plane: p });
                    globalIndex++;
                }
            }
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    }

    /**
     * Construye el mapa de vecinos para todos los puntos en 3D.
     */
    private buildNeighborMap(): void {
        const totalPoints = this.pointsData.length;
        if (totalPoints === 0) return;

        const numNeighbors = 6;
        const dimensions = ['x', 'y', 'z'];

        const kd = new kdTree(this.pointsData, (a, b) => {
            return Math.sqrt(
                Math.pow(a.x - b.x, 2) +
                Math.pow(a.y - b.y, 2) +
                Math.pow(a.z - b.z, 2)
            );
        }, dimensions);

        const neighborMapData = new Float32Array(totalPoints * 4);

        for (let i = 0; i < totalPoints; i++) {
            const point = this.pointsData[i];
            const nearest = kd.nearest(point, numNeighbors + 1);

            let neighborCount = 0;
            for (let k = 0; k < nearest.length; k++) {
                const neighbor = nearest[k][0] as PointData;
                if (neighbor.index === i) continue;
                
                if (neighborCount < 4) {
                    neighborMapData[i * 4 + neighborCount] = neighbor.index;
                    neighborCount++;
                }
            }
            while (neighborCount < 4) {
                neighborMapData[i * 4 + neighborCount] = -1.0;
                neighborCount++;
            }
        }
        
        this.neighborTexture = new THREE.DataTexture(
            neighborMapData, totalPoints, 1, THREE.RGBAFormat, THREE.FloatType
        );
        this.neighborTexture.needsUpdate = true;
    }

    private createTextures(): void {
        const totalPoints = this.pointsData.length;
        if (totalPoints === 0) return;

        const positions = this.geometry.attributes.position.array as Float32Array;
        const textureData = new Float32Array(totalPoints * 4);

        for (let i = 0; i < totalPoints; i++) {
            textureData[i * 4 + 0] = positions[i * 3 + 0]; // x
            textureData[i * 4 + 1] = positions[i * 3 + 1]; // y
            textureData[i * 4 + 2] = positions[i * 3 + 2]; // z
            textureData[i * 4 + 3] = 1.0; 
        }

        this.gridTexture = new THREE.DataTexture(
            textureData, totalPoints, 1, THREE.RGBAFormat, THREE.FloatType
        );
        this.gridTexture.needsUpdate = true;
    }

    private createVisuals(): void {
        if (!this.geometry) return;
        this.material = new THREE.ShaderMaterial({
            vertexShader: gridVisualVertex,
            fragmentShader: gridVisualFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0.0 },
                uPointSize: { value: this.params.pointSize || 1.0 },
                uColor: { value: this.params.color || new THREE.Color(0xffffff) },
                uOpacity: { value: 0.25 },
            }
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }
    
    public getGridMapTexture(): THREE.DataTexture | null {
        return this.gridTexture;
    }

    public getNeighborMapTexture(): THREE.DataTexture | null {
        return this.neighborTexture;
    }

    public setPointSize(size: number): void {
        if (this.material) {
            this.material.uniforms.uPointSize.value = size;
        }
    }

    public dispose(): void {
        if (this.points) this.scene.remove(this.points);
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
    }

    public update(deltaTime: number): void {
        if (this.material) {
            this.material.uniforms.uTime.value += deltaTime * 0.1;
        }
    }
}