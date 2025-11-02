import * as THREE from 'three';
import { PathData } from './pathing/PathData';
import vertexShader from '../shaders/procedural_ribbon.vert.glsl?raw';
import fragmentShader from '../shaders/procedural_ribbon.frag.glsl?raw';

// Configuration for the procedural ribbon
export interface ProceduralRibbonConfig {
    maxLength: number;
    width?: number;
    color?: THREE.Color;
    colorEnd?: THREE.Color;
    opacity?: number;
    renderMode?: number; // Using number for direct uniform compatibility
    fadeStyle?: number;
    colorMix?: number;
    transitionSize?: number;
    fadeTransitionSize?: number;
    // Procedural parameters
    seed?: number;
    radius?: number;
    radiusVariation?: number;
    angleFrequency?: number;
    radiusFrequency?: number;
}

export class ProceduralRibbonLine {
    public mesh: THREE.Mesh;
    public material: THREE.ShaderMaterial;
    private geometry: THREE.BufferGeometry;
    private pathTextures: {
        points: THREE.DataTexture;
        normals: THREE.DataTexture;
        binormals: THREE.DataTexture;
    };

    constructor(pathData: PathData, config: ProceduralRibbonConfig) {
        console.log('🚧 Creando ProceduralRibbonLine...');

        const divisions = config.maxLength - 1;
        this.pathTextures = this.createPathDataTextures(pathData, divisions);

        this.geometry = new THREE.BufferGeometry();
        const maxPoints = config.maxLength;
        
        // We only need UVs and side attributes, positions will be generated in the shader
        const sides = new Float32Array(maxPoints * 2);
        const uvs = new Float32Array(maxPoints * 2 * 2);

        for (let i = 0; i < maxPoints; i++) {
            const i2 = i * 2;
            const progress = i / (maxPoints - 1);
            sides[i2] = -1;
            sides[i2 + 1] = 1;
            uvs[i2 * 2] = progress;
            uvs[i2 * 2 + 1] = 0; // v = 0 for left side
            uvs[(i2 + 1) * 2] = progress;
            uvs[(i2 + 1) * 2 + 1] = 1; // v = 1 for right side
        }

        this.geometry.setAttribute('side', new THREE.BufferAttribute(sides, 1));
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const indexBuffer = [];
        for (let i = 0; i < maxPoints - 1; i++) {
            const n = i * 2;
            indexBuffer.push(n, n + 1, n + 2);
            indexBuffer.push(n + 2, n + 1, n + 3);
        }
        this.geometry.setIndex(indexBuffer);

        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: config.renderMode === 0 ? THREE.AdditiveBlending : THREE.NormalBlending, // Assuming 0 is Glow
            
            uniforms: {
                // Path data
                uPathPoints: { value: this.pathTextures.points },
                uPathNormals: { value: this.pathTextures.normals },
                uPathBinormals: { value: this.pathTextures.binormals },

                // Procedural controls
                uSeed: { value: config.seed ?? Math.random() * 100 },
                uRadius: { value: config.radius ?? 5.0 },
                uRadiusVariation: { value: config.radiusVariation ?? 2.0 },
                uAngleFrequency: { value: config.angleFrequency ?? 10.0 },
                uRadiusFrequency: { value: config.radiusFrequency ?? 5.0 },

                // Appearance
                uWidth: { value: config.width ?? 0.5 },
                uColor: { value: config.color ?? new THREE.Color(0xffffff) },
                uColorEnd: { value: config.colorEnd ?? config.color ?? new THREE.Color(0x00ffff) },
                uOpacity: { value: config.opacity ?? 1.0 },
                uRenderMode: { value: config.renderMode ?? 1 }, // Default to Solid
                uFadeStyle: { value: config.fadeStyle ?? 0 }, // Default to None
                uColorMix: { value: config.colorMix ?? 0.5 },
                uTransitionSize: { value: config.transitionSize ?? 0.1 },
                uFadeTransitionSize: { value: config.fadeTransitionSize ?? 0.1 },

                // Animation
                uRevealStart: { value: 0.0 },
                uRevealEnd: { value: 1.0 },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        }); 

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        console.log('✅ Componente ProceduralRibbonLine ensamblado y listo.');
    }

    private createPathDataTextures(pathData: PathData, divisions: number): {
        points: THREE.DataTexture,
        normals: THREE.DataTexture,
        binormals: THREE.DataTexture
    } {
        const points = pathData.curve.getPoints(divisions);
        const frenetFrames = pathData.curve.computeFrenetFrames(divisions, pathData.curve.closed);
        const normals = frenetFrames.normals;
        const binormals = frenetFrames.binormals;

        const numPoints = points.length;
        const pointsData = new Float32Array(numPoints * 4);
        const normalsData = new Float32Array(numPoints * 4);
        const binormalsData = new Float32Array(numPoints * 4);

        for (let i = 0; i < numPoints; i++) {
            const index4 = i * 4;
            const point = points[i];
            const normal = normals[i];
            const binormal = binormals[i];

            pointsData[index4 + 0] = point.x;
            pointsData[index4 + 1] = point.y;
            pointsData[index4 + 2] = point.z;
            pointsData[index4 + 3] = 1.0;

            normalsData[index4 + 0] = normal.x;
            normalsData[index4 + 1] = normal.y;
            normalsData[index4 + 2] = normal.z;
            normalsData[index4 + 3] = 1.0;

            binormalsData[index4 + 0] = binormal.x;
            binormalsData[index4 + 1] = binormal.y;
            binormalsData[index4 + 2] = binormal.z;
            binormalsData[index4 + 3] = 1.0;
        }

        const createTexture = (data: Float32Array) => {
            const texture = new THREE.DataTexture(data, numPoints, 1, THREE.RGBAFormat, THREE.FloatType);
            texture.needsUpdate = true;
            return texture;
        };

        return {
            points: createTexture(pointsData),
            normals: createTexture(normalsData),
            binormals: createTexture(binormalsData),
        };
    }

    public setRevealWindow(start: number, end: number): void {
        this.material.uniforms.uRevealStart.value = start;
        this.material.uniforms.uRevealEnd.value = end;
    }

    public dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
        this.pathTextures.points.dispose();
        this.pathTextures.normals.dispose();
        this.pathTextures.binormals.dispose();
    }
}
