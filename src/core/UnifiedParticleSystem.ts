
import * as THREE from 'three';

// Optional: Define a type for particle behavior IDs
export enum ParticleBehavior {
    INACTIVE = 0,
    AMBIENT = 1,
    PATH = 2,
    // Add more as needed
}

import { PathController } from './pathing/PathController';

export class UnifiedParticleSystem {
    private particleCount: number;
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private points: THREE.Points;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private pathController?: PathController;

    // Buffers for particle data (positions, velocities, behavior IDs, etc.)
    private positions: Float32Array;
    private behaviorIDs: Float32Array; // Using float32 for simplicity with shaders, can map to int in shader

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, particleCount: number = 100000) {
        this.renderer = renderer;
        this.scene = scene;
        this.particleCount = particleCount;

        // 1. Setup Geometry
        this.geometry = new THREE.BufferGeometry();

        this.positions = new Float32Array(this.particleCount * 3); // x, y, z
        this.behaviorIDs = new Float32Array(this.particleCount); // custom attribute for behavior

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('behaviorID', new THREE.BufferAttribute(this.behaviorIDs, 1)); // Add behaviorID as an attribute

        // Initialize particles to INACTIVE and random positions (will be updated by compute shader)
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            this.positions[i3 + 0] = (Math.random() - 0.5) * 100;
            this.positions[i3 + 1] = (Math.random() - 0.5) * 100;
            this.positions[i3 + 2] = (Math.random() - 0.5) * 100;
            this.behaviorIDs[i] = ParticleBehavior.INACTIVE;
        }

        // 2. Setup Material (placeholders for now)
        // Vertex Shader and Fragment Shader will be external files later
        const vertexShader = `
            attribute float behaviorID;
            varying float vBehaviorID; // Pass behavior to fragment shader

            void main() {
                vBehaviorID = behaviorID;

                gl_PointSize = 2.0; // Render ALL particles with a visible size for debugging

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying float vBehaviorID; // Receive from vertex shader

            void main() {
                // --- DEBUGGING: Color by Behavior ---
                if (vBehaviorID == 0.0) {
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // INACTIVE = Red
                } else if (vBehaviorID == 2.0) {
                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // PATH = Green
                } else {
                    gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // Unexpected value = Blue
                }
            }
        `;

        this.material = new THREE.ShaderMaterial({
            uniforms: {}, // Uniforms for time, delta, etc. will be added
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
        });

        // 3. Create Points mesh and add to scene
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);

        // TODO: Setup GPUComputationRenderer for compute shaders (will come later)
    }

    public update(deltaTime: number) {
        // This is where the CPU-side update logic or GPU compute shader execution will happen.
        // For now, no CPU updates to particle positions directly. GPU will handle this.
    }

    public dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.scene.remove(this.points);
    }

    // --- Behavior Management (CPU-side logic to be added) ---
    // public allocateParticlesForBehavior(behavior: ParticleBehavior, count: number): number[] { /* ... */ }
    // public releaseParticles(indices: number[]) { /* ... */ }
    // public updateParticleBehavior(index: number, behavior: ParticleBehavior) { /* ... */ }

    public setPathController(pathController: PathController) {
        this.pathController = pathController;
        this.generatePathParticles(); // Generate particles as soon as the path is set
    }

    private generatePathParticles() {
        if (!this.pathController) return;

        const pathParticleCount = 20000; // Use a subset of particles for the path

        for (let i = 0; i < pathParticleCount; i++) {
            // For now, just assign the behavior to the first N particles
            this.behaviorIDs[i] = ParticleBehavior.PATH;
        }

        // Important: notify Three.js that the buffer has changed
        const behaviorAttribute = this.geometry.getAttribute('behaviorID') as THREE.BufferAttribute;
        behaviorAttribute.needsUpdate = true;

        console.log(`🛣️ [UnifiedParticleSystem] Assigned ${pathParticleCount} particles to PATH behavior.`);
    }
}
