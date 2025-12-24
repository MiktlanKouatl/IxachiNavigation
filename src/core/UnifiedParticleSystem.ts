import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { PathController } from './pathing/PathController';

import computeShaderPosition from '../shaders/unified_particle_compute.glsl?raw';
import renderVertexShader from '../shaders/unified_particle_render.vert.glsl?raw';
import renderFragmentShader from '../shaders/unified_particle_render.frag.glsl?raw';

export enum ParticleBehavior {
    INACTIVE = 0,
    AMBIENT = 1,
    PATH = 2,
}

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 512;

export class UnifiedParticleSystem {
    private particleCount: number;
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private pathController?: PathController;

    private gpuCompute!: GPUComputationRenderer;
    private positionVariable: any;
    private velocityVariable: any;

    private points: THREE.Points;
    private material: THREE.ShaderMaterial;

    private isInitialized = false;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.particleCount = TEXTURE_WIDTH * TEXTURE_HEIGHT;

        const geometry = new THREE.BufferGeometry();
        const reference = new Float32Array(this.particleCount * 2);
        const positions = new Float32Array(this.particleCount * 3); // Dummy positions

        for (let i = 0; i < this.particleCount; i++) {
            const i2 = i * 2;
            const x = (i % TEXTURE_WIDTH);
            const y = Math.floor(i / TEXTURE_WIDTH);

            // Use half-pixel offset for correct texture sampling
            reference[i2 + 0] = (x + 0.5) / TEXTURE_WIDTH;
            reference[i2 + 1] = (y + 0.5) / TEXTURE_HEIGHT;

            // Initialize dummy positions (not used by shader, but needed for draw count/bounding sphere)
            positions[i * 3 + 0] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }

        geometry.setAttribute('reference', new THREE.BufferAttribute(reference, 2));
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                positionTexture: { value: null },
                tPathPos: { value: null },
                tPathNorm: { value: null },
                tPathBinorm: { value: null },
                uPlayerT: { value: 0.0 },
                uWindowSize: { value: 0.05 } // 5% of track
            },
            vertexShader: renderVertexShader,
            fragmentShader: renderFragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
        });

        this.points = new THREE.Points(geometry, this.material);
        this.points.frustumCulled = false; // Disable culling
        this.scene.add(this.points);
    }

    private pathLutResolution = 4096;
    private tPathPosition: THREE.DataTexture | null = null;
    private tPathNormal: THREE.DataTexture | null = null;
    private tPathBinormal: THREE.DataTexture | null = null;

    public setPathController(pathController: PathController): void {
        this.pathController = pathController;
        if (this.pathController) {
            this.generatePathLUT();
        }
        if (!this.isInitialized) {
            this.initGpuCompute();
            this.isInitialized = true;
        }
    }

    private generatePathLUT(): void {
        if (!this.pathController) return;
        const curvePath = this.pathController.getCurve() as THREE.CurvePath<THREE.Vector3>;
        if (!curvePath) return;

        const size = this.pathLutResolution;
        const dataPos = new Float32Array(size * 4); // RGBA
        const dataNorm = new Float32Array(size * 4);
        const dataBinorm = new Float32Array(size * 4);

        const curveLength = curvePath.getLength();
        console.log(`🛣️ [UnifiedParticleSystem] generatePathLUT called. Curve Length: ${curveLength}`);

        // Sample the path
        for (let i = 0; i < size; i++) {
            const t = i / (size - 1);

            // Get Frenet Frame at t
            // Note: getPointAt is expensive if called many times, but we only do this once at startup.
            // Optimized approach: Walk the curves directly if needed, but for now standard API is safer.
            const point = curvePath.getPointAt(t);

            // We need tangent to compute frame. 
            // computeFrenetFrames is for a set of points.
            // Let's rely on PathController or standard Threejs tangent.
            const tangent = curvePath.getTangentAt(t).normalize();

            // Basic Frenet: 
            // Binormal = Tangent x Up (WorldUp usually)
            // This is a naive frame, prone to flipping, but consistent if path is flat-ish.
            // Ideally we use the TrackBuilder's frames, but curvePath loses that metadata.
            // Better: Use curve.computeFrenetFrames on the whole list of points?

            // For now, let's use a robust frame computation:
            // Tangent is reliable.
            // Use an arbitrary up (0,1,0) to get binormal.
            let up = new THREE.Vector3(0, 1, 0);
            let binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
            if (binormal.lengthSq() < 0.001) {
                // Tangent is nearing vertical, switch up vector
                binormal.crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
            }
            let normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

            // Store in arrays
            const idx = i * 4;

            dataPos[idx + 0] = point.x;
            dataPos[idx + 1] = point.y;
            dataPos[idx + 2] = point.z;

            // Metadata: Sector ID
            // Map t to specific curve to get userData
            // CurvePath doesn't expose "getCurveAt(t)" easily.
            // We can approximate by iterating curves? No, slow.
            // But we do this ONLY ONCE.

            // Hacky but effective: 
            // The curves are in 'curvePath.curves'.
            // They are joined.
            // We can use curvePath.getCurveLengths() to find the active curve index.
            // But getCurveLengths is lazy. Let's force it.
            const lengths = curvePath.getCurveLengths();
            // lengths[i] is cumulative length up to END of curve i.
            const dist = t * curveLength;
            let curveIndex = 0;
            for (let j = 0; j < lengths.length; j++) {
                if (dist <= lengths[j]) {
                    curveIndex = j;
                    break;
                }
            }
            if (t >= 0.999) curveIndex = lengths.length - 1;

            const activeCurve = curvePath.curves[curveIndex] as any;
            const sectorName = activeCurve?.userData?.particleSector || 'full';

            let sectorId = 0.0; // 0 = Full
            if (sectorName === 'bed') sectorId = 1.0;
            if (sectorName === 'roof') sectorId = 2.0;

            dataPos[idx + 3] = sectorId;

            // Apply Banking (Roll)
            // Note: Our naive frame (binormal = tangent x up) is "flat".
            // We need to rotate it by the roll amount around the tangent.
            const rollDeg = activeCurve?.userData?.roll || 0;
            if (rollDeg !== 0) {
                const rollRad = THREE.MathUtils.DEG2RAD * rollDeg;
                // Rotate Normal and Binormal around Tangent
                // Note: applyAxisAngle mutates the vector
                normal.applyAxisAngle(tangent, rollRad);
                binormal.applyAxisAngle(tangent, rollRad);
            }

            dataNorm[idx + 0] = normal.x;
            dataNorm[idx + 1] = normal.y;
            dataNorm[idx + 2] = normal.z;
            dataNorm[idx + 3] = 0.0;

            dataBinorm[idx + 0] = binormal.x;
            dataBinorm[idx + 1] = binormal.y;
            dataBinorm[idx + 2] = binormal.z;
            dataBinorm[idx + 3] = 0.0;
        }

        // Create Textures
        this.tPathPosition = new THREE.DataTexture(dataPos, size, 1, THREE.RGBAFormat, THREE.FloatType);
        this.tPathPosition.needsUpdate = true;
        this.tPathPosition.minFilter = THREE.LinearFilter; // Smooth interpolation
        this.tPathPosition.magFilter = THREE.LinearFilter;

        this.tPathNormal = new THREE.DataTexture(dataNorm, size, 1, THREE.RGBAFormat, THREE.FloatType);
        this.tPathNormal.needsUpdate = true;
        this.tPathNormal.minFilter = THREE.LinearFilter;
        this.tPathNormal.magFilter = THREE.LinearFilter;

        this.tPathBinormal = new THREE.DataTexture(dataBinorm, size, 1, THREE.RGBAFormat, THREE.FloatType);
        this.tPathBinormal.needsUpdate = true;
        this.tPathBinormal.minFilter = THREE.LinearFilter;
        this.tPathBinormal.magFilter = THREE.LinearFilter; // Important for smooth rotation

        console.log(`🛣️ [UnifiedParticleSystem] Path LUT Baked. Resolution: ${size}`);

        // Pass LUTs to Material
        if (this.material) {
            this.material.uniforms.tPathPos.value = this.tPathPosition;
            this.material.uniforms.tPathNorm.value = this.tPathNormal;
            this.material.uniforms.tPathBinorm.value = this.tPathBinormal;
        }
    }

    private initGpuCompute(): void {
        if (!this.renderer.capabilities.isWebGL2) {
            console.error('[UnifiedParticleSystem] WebGL2 is not available. This system requires WebGL2.');
            return;
        }

        // In WebGL2, we need EXT_color_buffer_float for rendering to float textures.
        // OES_texture_float is implied for sampling.
        if (!this.renderer.extensions.get('EXT_color_buffer_float')) {
            console.error('[UnifiedParticleSystem] EXT_color_buffer_float extension is not supported. GPU Compute may fail.');
        }

        this.gpuCompute = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_HEIGHT, this.renderer);

        const posTexture = this.gpuCompute.createTexture();
        const velTexture = this.gpuCompute.createTexture(); // Will now hold "Offsets"

        this.fillInitialTextures(posTexture, velTexture);

        const passThroughShader = 'void main() { gl_FragColor = vec4(0.0); }'; // Placeholder

        // Note: computeShaderPosition will be replaced later
        this.positionVariable = this.gpuCompute.addVariable("texturePosition", computeShaderPosition, posTexture);
        this.velocityVariable = this.gpuCompute.addVariable("textureVelocity", passThroughShader, velTexture);

        this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);
        this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);

        // Pass LUTs to shader (will add logic in next step)
        // this.positionVariable.material.uniforms.tPathPos = { value: this.tPathPosition };

        const error = this.gpuCompute.init();
        if (error !== null) {
            console.error(`[UnifiedParticleSystem] GPUCompute Error: ${error}`);
        }
    }

    private fillInitialTextures(posTexture: THREE.DataTexture, velTexture: THREE.DataTexture): void {
        // Init Ring State
        const posArray = posTexture.image.data;
        // const velArray = velTexture.image.data;

        // Structured Ring Configuration
        const particlesPerRing = 24; // Visual request: ~20. Using 24 for symmetry.
        // We want rings to be spaced out. 
        // Instead of filling the whole buffer, let's define a fixed number of rings for the WINDOW.
        // If window is 5% of track, 64 rings is plenty.
        const numRings = 64;
        const usedParticles = numRings * particlesPerRing;

        // Ensure we don't exceed buffer
        if (usedParticles > this.particleCount) {
            console.warn(`[UnifiedParticleSystem] Configured rings exceed buffer size.`);
        }

        // Initialize particles with STRUCTURED RING state
        let pIndex = 0;
        for (let r = 0; r < numRings; r++) {
            const tOffset = r / numRings; // 0..1 distributed evenly

            for (let p = 0; p < particlesPerRing; p++) {
                if (pIndex >= this.particleCount) break;

                const i4 = pIndex * 4;
                const angle = (p / particlesPerRing) * Math.PI * 2;

                // X: Linear T Offset (0..1)
                posArray[i4 + 0] = tOffset;

                // Y: Angle (0..2PI)
                posArray[i4 + 1] = angle;

                // Z: Radius (0..1) - small jitter for volume, or 0 for perfect rings
                // Let's add slight random jitter for "Neon" look, but mostly structured.
                posArray[i4 + 2] = (Math.random() - 0.5) * 0.1;

                // W: Behavior ID + Speed/Noise factor
                // Shader expects ID > 1.5 to Render.
                // We use 2.0 as "Standard Particle". Fraction can be used for animation offset.
                posArray[i4 + 3] = 2.0 + Math.random() * 0.9;

                pIndex++;
            }
        }

        // Zero out remaining unused particles (if any)
        for (let i = usedParticles; i < this.particleCount; i++) {
            const i4 = i * 4;
            posArray[i4 + 3] = 0.0; // Inactive (ID < 1.5)
        }

        console.log(`✨ [UnifiedParticleSystem] Initialized Structured Rings: ${numRings} rings, ${particlesPerRing} per ring.`);
    }

    public setPlayerT(t: number): void {
        if (this.material) {
            this.material.uniforms.uPlayerT.value = t;
        }
    }

    public update(deltaTime: number): void {
        if (!this.isInitialized) return;
        this.gpuCompute.compute();
        this.material.uniforms.positionTexture.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
    }



    public dispose(): void {
        this.scene.remove(this.points);
        this.points.geometry.dispose();
        this.material.dispose();
    }
}
