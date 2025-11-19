import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';

// Import shaders
import vertexShader from '../../shaders/walker_render.vert.glsl?raw';
import fragmentShader from '../../shaders/particle_render.frag.glsl?raw';
import computeShaderPosition from '../../shaders/walker_position_compute.glsl?raw'; // Renamed
import computeShaderVelocity from '../../shaders/walker_velocity_compute.glsl?raw'; // New

export function runScene(app: { scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }) {
    const { scene, camera, renderer } = app;

    // 1. Setup
    camera.position.set(0, 0, 350);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- Paso 3: "La Caminata Inteligente" ---
    const WIDTH = 64; // 64x64 = 4096 walkers
    const GRID_ROWS = 32; // Fixed number of rows
    const GRID_COLUMNS = WIDTH * WIDTH / GRID_ROWS; // 4096 / 32 = 128 columns
    const NUM_ACTIVE_WALKERS = Math.floor(WIDTH * WIDTH * 0.1); // Activate 10% of walkers

    // 2. GPUComputationRenderer Setup
    const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

    // Initial Position Texture (now storing discrete grid coordinates)
    const initialPositionTexture = gpuCompute.createTexture();
    const posArray = initialPositionTexture.image.data;
    const activeIndices: number[] = [];
    for (let i = 0; i < WIDTH * WIDTH; i++) {
        activeIndices.push(i);
    }
    // Shuffle indices and pick NUM_ACTIVE_WALKERS
    for (let i = activeIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeIndices[i], activeIndices[j]] = [activeIndices[j], activeIndices[i]];
    }

    for (let i = 0; i < posArray.length; i += 4) {
        posArray[i + 3] = 0.0; // Deactivate all walkers by default
    }

    for (let k = 0; k < NUM_ACTIVE_WALKERS; k++) {
        const walkerIndex = activeIndices[k];
        const i = walkerIndex * 4;
        posArray[i] = Math.floor(Math.random() * GRID_COLUMNS); // Random start column
        posArray[i + 1] = Math.floor(Math.random() * GRID_ROWS); // Random start row
        posArray[i + 2] = 0; // Unused
        posArray[i + 3] = 1.0; // Activate this walker
    }
    initialPositionTexture.needsUpdate = true;

    // Initial Velocity/State Texture
    const initialVelocityTexture = gpuCompute.createTexture();
    const velArray = initialVelocityTexture.image.data;
    // The first step of pattern 1 is (1, 0)
    const initialStep = [1.0, 0.0]; 
    for (let i = 0; i < velArray.length; i += 4) {
        velArray[i] = initialStep[0]; // Initial col_step
        velArray[i + 1] = initialStep[1]; // Initial row_step
        velArray[i + 2] = 0.0;            // Initial stepIndex
        velArray[i + 3] = 1.0;            // Assign all to patternID = 1
    }
    initialVelocityTexture.needsUpdate = true;

    // Add variables and dependencies
    const velocityVariable = gpuCompute.addVariable('textureVelocity', computeShaderVelocity, initialVelocityTexture);
    const positionVariable = gpuCompute.addVariable('texturePosition', computeShaderPosition, initialPositionTexture);
    gpuCompute.setVariableDependencies(velocityVariable, [velocityVariable]);
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    
    // Add uniforms to compute shaders
    positionVariable.material.uniforms['gridColumns'] = { value: GRID_COLUMNS };
    positionVariable.material.uniforms['gridRows'] = { value: GRID_ROWS };

    const error = gpuCompute.init();
    if (error !== null) {
        console.error('GPUComputationRenderer Error: ' + error);
    }

    // 3. Geometry (remains the same)
    const geometry = new THREE.BufferGeometry();
    // ... (geometry setup is unchanged)

    // 4. Material
    const material = new THREE.ShaderMaterial({
        uniforms: {
            texturePosition: { value: null }, // Will be updated by gpuCompute
            gridColumns: { value: GRID_COLUMNS },
            cylinderRadius: { value: 200.0 }, // Increased radius
            rowHeight: { value: 10.0 } // Increased row height
        },
        vertexShader,
        fragmentShader,
    });
    
    // ... (rest of the scene setup)
    const totalParticles = WIDTH * WIDTH;
    const positions = new Float32Array(totalParticles * 3);
    const uvs = new Float32Array(totalParticles * 2);
    for (let p = 0; p < totalParticles; p++) {
        positions[p * 3] = 0;
        uvs[p * 2] = (p % WIDTH) / (WIDTH - 1);
        uvs[p * 2 + 1] = Math.floor(p / WIDTH) / (WIDTH - 1);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // 5. Object
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // 6. Debug Function (optional, can be removed)
    // ...

    // 7. Render Loop
    const animate = () => {
        // Slow down the computation to make the steps visible
        if (renderer.info.render.frame % 5 === 0) {
            gpuCompute.compute();
            material.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
        }
        
        controls.update();
        renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    // 8. Cleanup
    return () => {
        renderer.setAnimationLoop(null);
        // ... (cleanup logic)
    };
}
