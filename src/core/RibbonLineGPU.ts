// src/ixachi/core/RibbonLineGPU.ts

import * as THREE from 'three';
// We bring the enums from RibbonLine to maintain consistency.
import { RibbonConfig, RenderMode, FadeStyle, UseMode } from './RibbonLine'; 
import vertexShader from '../shaders/ribbon_gpu.vert.glsl?raw';
import fragmentShader from '../shaders/ribbon_gpu.frag.glsl?raw';

export { UseMode }; // Export UseMode so it can be used from other files

export class RibbonLineGPU {
    public mesh: THREE.Mesh;
    public material: THREE.ShaderMaterial;
    private geometry: THREE.BufferGeometry;
    private pathTexture: THREE.DataTexture;

    constructor(pathPoints: THREE.Vector3[], config: RibbonConfig) {
        console.log('🚧 Creando RibbonLineGPU v3.0 con UseMode...');
        this.pathTexture = this.createPathTexture(pathPoints);

        this.geometry = new THREE.BufferGeometry();
        const maxPoints = config.maxLength;
        const positions = new Float32Array(maxPoints * 2 * 3);

        const indices = new Float32Array(maxPoints * 2);
        const sides = new Float32Array(maxPoints * 2);
        const uvs = new Float32Array(maxPoints * 2 * 2);

        for (let i = 0; i < maxPoints; i++) {
            const i2 = i * 2;
            const progress = i / (maxPoints - 1);
            indices[i2] = progress;
            indices[i2 + 1] = progress;
            sides[i2] = -1;
            sides[i2 + 1] = 1;
            uvs[i2 * 2] = progress;
            uvs[i2 * 2 + 1] = 0;
            uvs[(i2 + 1) * 2] = progress;
            uvs[(i2 + 1) * 2 + 1] = 1;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('a_index', new THREE.BufferAttribute(indices, 1));
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
            blending: config.renderMode === RenderMode.Glow ? THREE.AdditiveBlending : THREE.NormalBlending,
            
            uniforms: {
                // Common uniforms
                uColor: { value: config.color },
                uColorEnd: { value: config.colorEnd ?? config.color },
                uOpacity: { value: config.opacity ?? 1.0 },
                uWidth: { value: config.width },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uRenderMode: { value: config.renderMode ?? RenderMode.Solid },
                uPathTexture: { value: this.pathTexture },
                uPathLength: { value: pathPoints.length },

                // Fade and Color Mix uniforms
                uFadeStyle: { value: config.fadeStyle ?? FadeStyle.None },
                uFadeTransitionSize: { value: config.fadeTransitionSize ?? 0.1 },
                uColorMix: { value: 0.5 },
                uTransitionSize: { value: 0.1 },

                // New explicit mode control
                uUseMode: { value: config.useMode ?? UseMode.Static },
                
                // Mode-specific uniforms
                uRevealProgress: { value: 1.0 }, // For UseMode.Reveal
                uTrailHead: { value: 0.0 },      // For UseMode.Trail
                uTrailLength: { value: 0.2 }     // For UseMode.Trail
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        }); 

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        console.log('✅ Componente RibbonLineGPU v3.0 ensamblado y listo.');
    }

    private createPathTexture(points: THREE.Vector3[]): THREE.DataTexture {
        const numPoints = points.length;
        const textureData = new Float32Array(numPoints * 4);
        for (let i = 0; i < numPoints; i++) {
            const point = points[i];
            const index = i * 4;
            textureData[index] = point.x;
            textureData[index + 1] = point.y;
            textureData[index + 2] = point.z;
            textureData[index + 3] = 1.0;
        }
        const texture = new THREE.DataTexture(textureData, numPoints, 1, THREE.RGBAFormat, THREE.FloatType);
        texture.needsUpdate = true;
        console.log(`Textura de ${numPoints}x1 puntos generada.`);
        return texture;
    }

    // --- New explicit methods ---

    public setRevealProgress(progress: number): void {
        this.material.uniforms.uRevealProgress.value = progress;
    }

    public setTrail(head: number, length: number): void {
        this.material.uniforms.uTrailHead.value = head;
        this.material.uniforms.uTrailLength.value = length;
    }

    public setOpacity(opacity: number): void {
        this.material.uniforms.uOpacity.value = opacity;
    }

    public setWidth(width: number): void {
        this.material.uniforms.uWidth.value = width;
    }

    public dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
        this.pathTexture.dispose();
    }
}