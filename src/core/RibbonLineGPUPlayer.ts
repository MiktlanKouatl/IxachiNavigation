// src/ixachi/core/RibbonLineGPUPlayer.ts

import * as THREE from 'three';
// We bring the enums from RibbonLine to maintain consistency.
import { RibbonConfig, RenderMode, FadeStyle, UseMode } from './RibbonLine'; 
import vertexShader from '../shaders/ribbon_gpu_player.vert.glsl?raw';
import fragmentShader from '../shaders/ribbon_gpu_player.frag.glsl?raw';

export { UseMode }; // Export UseMode so it can be used from other files

export class RibbonLineGPUPlayer {
    public mesh: THREE.Mesh;
    public material: THREE.ShaderMaterial;
    private geometry: THREE.BufferGeometry;
    private pathTexture: THREE.DataTexture;

    constructor(pathPoints: THREE.Vector3[], config: RibbonConfig) {
        console.log('🚧 Creando RibbonLineGPUPlayer v3.1 con cabeza integrada...');
        this.pathTexture = this.createPathTexture(pathPoints);

        this.geometry = new THREE.BufferGeometry();
        const maxPoints = config.maxLength;
        const positions = new Float32Array(maxPoints * 2 * 3);

        const indices = new Float32Array(maxPoints * 2);
        const sides = new Float32Array(maxPoints * 2);
        const uvs = new Float32Array(maxPoints * 2 * 2);
        const isHead = new Float32Array(maxPoints * 2);

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
        this.geometry.setAttribute('a_isHead', new THREE.BufferAttribute(isHead, 1));

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
                uTime: { value: 0.0 },
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
                uColorMix: { value: config.colorMix ?? 0.5 },
                uTransitionSize: { value: config.transitionSize ?? 0.1 },

                // New explicit mode control
                uUseMode: { value: config.useMode ?? UseMode.Static },
                
                // Mode-specific uniforms
                uRevealProgress: { value: 1.0 }, // For UseMode.Reveal
                uTrailHead: { value: 0.0 },      // For UseMode.Trail
                uTrailLength: { value: 0.2 },     // For UseMode.Trail

                // Uniforms para estabilización
                uPlayerForward: { value: new THREE.Vector3(0, 0, 1) }, 
                uMinHeadLength: { value: 0.5 }, 

                // Artifact control
                uMinSegmentLengthThreshold: { value: 0.01 } // Added for artifact control
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        }); 

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        console.log('✅ Componente RibbonLineGPUPlayer v3.1 ensamblado y listo.');
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
        // console.log(`Textura de ${numPoints}x1 puntos generada.`);
        return texture;
    }

    // --- New explicit methods ---
    public setTime(time: number): void {
        this.material.uniforms.uTime.value = time;
    }
    
    public updateHead(): void {
        const headAttr = this.geometry.getAttribute('a_isHead') as THREE.BufferAttribute;
        // The head is the very first segment in the trail, which corresponds to the first two vertices.
        // The GPUParticleSystem writes the newest particle at index 0.
        if (headAttr.array[0] !== 1.0) {
            // Reset the previous head if it's not the current one, though with this logic it's not strictly necessary
            // as we are always setting the first two vertices as the head.
            for (let i = 0; i < headAttr.array.length; i++) {
                headAttr.array[i] = 0;
            }
            headAttr.array[0] = 1.0;
            headAttr.array[1] = 1.0;
            headAttr.needsUpdate = true;
        }
    }

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

    /**
     * Sets an external DataTexture to be used as the source for the ribbon's path.
     * This allows the ribbon to be driven by dynamic data, e.g., from a GPU particle system.
     * @param texture The DataTexture containing the path points.
     */
    public setPathTexture(texture: THREE.DataTexture): void {
        this.material.uniforms.uPathTexture.value = texture;
    }

    /**
     * Updates the path length uniform, essential when using an external path texture.
     * @param length The number of points in the path.
     */
    public setPathLength(length: number): void {
        this.material.uniforms.uPathLength.value = length;
    }

    public setPlayerForward(direction: THREE.Vector3): void {
        // Normalizamos aquí para asegurar consistencia
        this.material.uniforms.uPlayerForward.value.copy(direction).normalize();
    }

    public setMinHeadLength(length: number): void {
        this.material.uniforms.uMinHeadLength.value = length;
    }

    public dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }
}