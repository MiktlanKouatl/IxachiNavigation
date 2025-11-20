import * as THREE from 'three';
import computeShader from '../shaders/particle_compute.glsl?raw';

export interface GPUParticleSystemOptions {
    numParticles: number;
    renderer: THREE.WebGLRenderer;
}

export class GPUParticleSystem {
    public readonly numParticles: number;
    private renderer: THREE.WebGLRenderer;

    // Simulation (Compute)
    private computeScene: THREE.Scene;
    private computeCamera: THREE.OrthographicCamera;
    private computeMaterial: THREE.ShaderMaterial;
    private computeMesh: THREE.Mesh;

    // Render Targets for ping-ponging
    private positionTarget1: THREE.WebGLRenderTarget;
    private positionTarget2: THREE.WebGLRenderTarget;
    private velocityTarget1: THREE.WebGLRenderTarget;
    private velocityTarget2: THREE.WebGLRenderTarget;

    constructor(options: GPUParticleSystemOptions) {
        this.numParticles = options.numParticles;
        this.renderer = options.renderer;

        this.computeScene = new THREE.Scene();
        this.computeCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);

        // Create render targets
        const targetOptions: THREE.WebGLRenderTargetOptions = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType, // Use FloatType for position/velocity data
            depthBuffer: false,
            stencilBuffer: false,
        };

        // We need textures of size (numParticles x 1)
        this.positionTarget1 = new THREE.WebGLRenderTarget(this.numParticles, 1, targetOptions);
        this.positionTarget2 = new THREE.WebGLRenderTarget(this.numParticles, 1, targetOptions);
        this.velocityTarget1 = new THREE.WebGLRenderTarget(this.numParticles, 1, targetOptions);
        this.velocityTarget2 = new THREE.WebGLRenderTarget(this.numParticles, 1, targetOptions);
        
        this.initTextures();

        // Create the compute material
        this.computeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_positions: { value: null },
                u_velocities: { value: null },
                u_deltaTime: { value: 0.0 },
                u_emitterPos: { value: new THREE.Vector3() },
                u_emitterVel: { value: new THREE.Vector3() },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: computeShader,
        });

        // This plane mesh will run our compute shader
        this.computeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.computeMaterial);
        this.computeScene.add(this.computeMesh);
    }

    private initTextures(): void {
        const posArray = new Float32Array(this.numParticles * 4);
        for (let i = 0; i < this.numParticles; i++) {
            posArray[i * 4 + 0] = 0;
            posArray[i * 4 + 1] = 0;
            posArray[i * 4 + 2] = 0;
            posArray[i * 4 + 3] = 0.0; // Initialize w component (alpha/visibility) to 0
        }

        const posTexture = new THREE.DataTexture(posArray, this.numParticles, 1, THREE.RGBAFormat, THREE.FloatType);
        posTexture.needsUpdate = true;

        // Use a custom shader for a guaranteed 1:1 copy of the data
        const copyScene = new THREE.Scene();
        const copyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: posTexture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D u_texture;
                void main() {
                    gl_FragColor = texture2D(u_texture, vUv);
                }
            `
        });
        
        // The plane needs to fill the screen to cover all pixels of the render target
        const copyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial);
        copyScene.add(copyMesh);

        const currentRenderTarget = this.renderer.getRenderTarget();
        
        this.renderer.setRenderTarget(this.positionTarget1);
        this.renderer.render(copyScene, this.computeCamera);
        this.renderer.setRenderTarget(currentRenderTarget);

        copyMaterial.dispose();
        copyMesh.geometry.dispose();
        posTexture.dispose(); // We can dispose the initial data texture now
    }

    public update(deltaTime: number, emitterPosition: THREE.Vector3, emitterVelocity: THREE.Vector3): void {
        // Store the current render target so we can restore it later
        const currentRenderTarget = this.renderer.getRenderTarget();

        // 1. Set uniforms for the compute shader
        this.computeMaterial.uniforms.u_positions.value = this.positionTarget1.texture;
        this.computeMaterial.uniforms.u_deltaTime.value = deltaTime;
        this.computeMaterial.uniforms.u_emitterPos.value.copy(emitterPosition);
        this.computeMaterial.uniforms.u_emitterVel.value.copy(emitterVelocity);

        // 2. Set the render target to our output texture
        this.renderer.setRenderTarget(this.positionTarget2);

        // 3. Run the compute shader
        this.renderer.render(this.computeScene, this.computeCamera);

        // 4. Ping-pong the targets for the next frame
        const temp = this.positionTarget1;
        this.positionTarget1 = this.positionTarget2;
        this.positionTarget2 = temp;

        // 5. Restore the original render target
        this.renderer.setRenderTarget(currentRenderTarget);
    }

    /**
     * Returns the texture containing the most up-to-date particle positions.
     */
    public getPositionTexture(): THREE.Texture {
        // positionTarget1 always holds the result of the last simulation step
        return this.positionTarget1.texture;
    }
}