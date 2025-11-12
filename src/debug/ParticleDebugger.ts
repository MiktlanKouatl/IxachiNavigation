import * as THREE from 'three';
import { GPUParticleSystem } from '../core/GPUParticleSystem';
import vertexShader from '../shaders/particle_debug.vert.glsl?raw';
import fragmentShader from '../shaders/particle_render.frag.glsl?raw'; // We can reuse the simple color shader

export class ParticleDebugger {
    public points: THREE.Points;
    private material: THREE.ShaderMaterial;
    private geometry: THREE.BufferGeometry;

    constructor(particleSystem: GPUParticleSystem) {
        const numParticles = particleSystem.numParticles;

        this.geometry = new THREE.BufferGeometry();
        
        const particleIndices = new Float32Array(numParticles);
        const positions = new Float32Array(numParticles * 3); // Dummy positions

        for (let i = 0; i < numParticles; i++) {
            particleIndices[i] = i;
            // positions can be all zero as they are overridden in the shader
        }
        this.geometry.setAttribute('a_particleIndex', new THREE.BufferAttribute(particleIndices, 1));
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                u_positions: { value: null }, // This will be set externally
            },
            vertexShader,
            fragmentShader,
        });

        this.points = new THREE.Points(this.geometry, this.material);
    }

    public update(particleSystem: GPUParticleSystem): void {
        // Update the material to use the latest position texture from the particle system
        this.material.uniforms.u_positions.value = particleSystem.getPositionTexture();
    }

    public dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }
}
