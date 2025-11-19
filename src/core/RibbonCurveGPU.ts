import * as THREE from 'three';
import { RibbonConfig, RenderMode, FadeStyle, UseMode } from './RibbonLine'; 
import vertexShader from '../shaders/ribbon_curve.vert.glsl?raw';
import fragmentShader from '../shaders/ribbon_gpu.frag.glsl?raw';

export { UseMode };

// Add subdivisions to the config
export interface RibbonCurveConfig extends RibbonConfig {
    subdivisions?: number;
}

export class RibbonCurveGPU {
    public mesh: THREE.Mesh;
    public material: THREE.ShaderMaterial;
    private geometry: THREE.BufferGeometry;

    constructor(config: RibbonCurveConfig) {
        console.log('🚧 Creando RibbonCurveGPU v1.0...');
        
        const subdivisions = config.subdivisions ?? 8;
        const maxPoints = config.maxLength;
        const numSegments = maxPoints - 1;
        const verticesPerSegment = subdivisions + 1;
        const totalVertices = numSegments * verticesPerSegment * 2;

        this.geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(totalVertices * 3); // Not used, but required by THREE
        const sides = new Float32Array(totalVertices);
        const uvs = new Float32Array(totalVertices * 2);
        const segmentIndices = new Float32Array(totalVertices);
        const segmentTs = new Float32Array(totalVertices);
        const ribbonProgress = new Float32Array(totalVertices);

        for (let i = 0; i < numSegments; i++) {
            for (let j = 0; j < verticesPerSegment; j++) {
                const t = j / subdivisions;
                const baseIndex = (i * verticesPerSegment + j) * 2;

                // Left side vertex
                sides[baseIndex] = -1;
                uvs[baseIndex * 2] = i / numSegments + t / numSegments;
                uvs[baseIndex * 2 + 1] = 0;
                segmentIndices[baseIndex] = i;
                segmentTs[baseIndex] = t;
                ribbonProgress[baseIndex] = (i + t) / maxPoints;

                // Right side vertex
                sides[baseIndex + 1] = 1;
                uvs[(baseIndex + 1) * 2] = i / numSegments + t / numSegments;
                uvs[(baseIndex + 1) * 2 + 1] = 1;
                segmentIndices[baseIndex + 1] = i;
                segmentTs[baseIndex + 1] = t;
                ribbonProgress[baseIndex + 1] = (i + t) / maxPoints;
            }
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('side', new THREE.BufferAttribute(sides, 1));
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        this.geometry.setAttribute('a_segmentIndex', new THREE.BufferAttribute(segmentIndices, 1));
        this.geometry.setAttribute('a_segmentT', new THREE.BufferAttribute(segmentTs, 1));
        this.geometry.setAttribute('a_ribbonProgress', new THREE.BufferAttribute(ribbonProgress, 1));

        const indexBuffer = [];
        for (let i = 0; i < numSegments; i++) {
            for (let j = 0; j < subdivisions; j++) {
                const n = (i * verticesPerSegment + j) * 2;
                indexBuffer.push(n, n + 1, n + 2);
                indexBuffer.push(n + 2, n + 1, n + 3);
            }
        }
        this.geometry.setIndex(indexBuffer);

        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: config.renderMode === RenderMode.Glow ? THREE.AdditiveBlending : THREE.NormalBlending,
            
            uniforms: {
                uColor: { value: config.color },
                uOpacity: { value: config.opacity ?? 1.0 },
                uWidth: { value: config.width },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uPathTexture: { value: null }, // Will be set externally
                uPathTextureSize: { value: new THREE.Vector2(1, 1) },
                uPathLength: { value: maxPoints },
                u_headIndex: { value: 0.0 },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        }); 

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        console.log('✅ Componente RibbonCurveGPU v1.0 ensamblado y listo.');
    }

    public setPathTexture(texture: THREE.DataTexture): void {
        this.material.uniforms.uPathTexture.value = texture;
        this.material.uniforms.uPathTextureSize.value.set(texture.image.width, texture.image.height);
    }

    public setHeadIndex(index: number): void {
        this.material.uniforms.u_headIndex.value = index;
    }

    public setPathLength(length: number): void {
        this.material.uniforms.uPathLength.value = length;
    }

    public dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }
}