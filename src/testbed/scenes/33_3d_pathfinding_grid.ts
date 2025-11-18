import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';

// Import shaders
import vertexShader from '../../shaders/walker_render.vert.glsl?raw';
import fragmentShader from '../../shaders/particle_render.frag.glsl?raw';
import computeShaderPosition from '../../shaders/walker_position_compute.glsl?raw';
import computeShaderVelocity from '../../shaders/walker_velocity_compute.glsl?raw';
import gridStateUpdateVertexShader from '../../shaders/grid_state_update.vert.glsl?raw';
import gridStateUpdateFragmentShader from '../../shaders/grid_state_update.frag.glsl?raw';
import computeShaderAgentState from '../../shaders/agent_state_compute.glsl?raw';
import computeShaderGridState from '../../shaders/grid_state_compute.glsl?raw';
import gridVisualVertexShader from '../../shaders/grid_visual.vert.glsl?raw';
import gridVisualFragmentShader from '../../shaders/grid_visual.frag.glsl?raw';

export function runScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.setClearColor(0x000000, 1); // Set background to black

    // 1. Setup
    camera.position.set(0, 0, 450); // Zoom out a bit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- Grid & Agent Configuration ---
    const GRID_COLUMNS = 64;
    const GRID_ROWS = 16;
    const GRID_LAYERS = 9;
    const NUM_REGIONS = 3;
    const LAYERS_PER_REGION = GRID_LAYERS / NUM_REGIONS;

    const TOTAL_AGENTS = GRID_COLUMNS * GRID_ROWS * GRID_LAYERS; // 9216
    const TEXTURE_WIDTH = Math.sqrt(TOTAL_AGENTS); // 96

    const NUM_ACTIVE_WALKERS = 0; // Activate 0% of walkers to focus on the new 'Star' pattern

    // 2. GPUComputationRenderer Setup
    // The texture for the grid state needs to be the same size as the agent textures
    const gpuCompute = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_WIDTH, renderer);

    // --- Texture Initialization ---
    const initialPositionTexture = gpuCompute.createTexture();
    const posArray = initialPositionTexture.image.data;

    const initialVelocityTexture = gpuCompute.createTexture();
    const velArray = initialVelocityTexture.image.data;

    const initialAgentStateTexture = gpuCompute.createTexture();
    const agentStateArray = initialAgentStateTexture.image.data;

    // --- Grid State Texture ---
    const initialGridStateTexture = gpuCompute.createTexture();
    const gridStateArray = initialGridStateTexture.image.data;
    for (let i = 0; i < TOTAL_AGENTS * 4; i++) {
        gridStateArray[i] = 0.0;
    }

    // --- Agent Initialization Logic ---

    // 1. Initialize ALL agents with default values
    for (let i = 0; i < TOTAL_AGENTS; i++) {
        const i4 = i * 4;
        const regionID = Math.floor(i / (TOTAL_AGENTS / NUM_REGIONS));

        // Default Position (inactive)
        posArray[i4] = 0.0;
        posArray[i4 + 1] = 0.0;
        posArray[i4 + 2] = 0.0;
        posArray[i4 + 3] = 0.0; // is_alive = false

        // Default Velocity/Anchor Data
        velArray[i4] = 0.0;
        velArray[i4 + 1] = 0.0;
        velArray[i4 + 2] = 0.0;
        velArray[i4 + 3] = regionID; // Store permanent regionID

        // Default Agent State
        agentStateArray[i4] = 0.0; // behaviorID: 0.0 for Walker
        agentStateArray[i4 + 1] = 0.0; // stepCounter
        agentStateArray[i4 + 2] = Math.random() * 10.0; // decisionTimer
        agentStateArray[i4 + 3] = 0.0; // unused
    }

    // 2. Manually override and activate the 3 'Star' agents
    const agentsToActivate = [
        { region: 0, agentIndex: 100 },
        { region: 1, agentIndex: 200 },
        { region: 2, agentIndex: 300 }
    ];

    agentsToActivate.forEach(({ region, agentIndex }) => {
        const i4 = agentIndex * 4;

        const anchorCol = Math.floor(GRID_COLUMNS / 2);
        const anchorRow = Math.floor(GRID_ROWS / 2);
        const anchorLayer = region * LAYERS_PER_REGION + Math.floor(LAYERS_PER_REGION / 2);

        // Set initial position to the anchor point
        posArray[i4] = anchorCol;
        posArray[i4 + 1] = anchorRow;
        posArray[i4 + 2] = anchorLayer;
        posArray[i4 + 3] = 1.0; // is_alive = true

        // Store the anchor point in the 'velocity' texture
        velArray[i4] = anchorCol;
        velArray[i4 + 1] = anchorRow;
        velArray[i4 + 2] = anchorLayer;

        // Assign the 'Star' behavior
        agentStateArray[i4] = 1.0; // behaviorID: 1.0 for Star
        agentStateArray[i4 + 1] = 0.0; // stepCounter
        agentStateArray[i4 + 2] = 0.0; // decisionTimer
    });

    initialPositionTexture.needsUpdate = true;
    initialVelocityTexture.needsUpdate = true;
    initialAgentStateTexture.needsUpdate = true;
    initialGridStateTexture.needsUpdate = true;

    // --- GPU Compute Variable Setup ---
    const positionVariable = gpuCompute.addVariable('texturePosition', computeShaderPosition, initialPositionTexture);
    const velocityVariable = gpuCompute.addVariable('textureVelocity', computeShaderVelocity, initialVelocityTexture);
    const agentStateVariable = gpuCompute.addVariable('textureAgentState', computeShaderAgentState, initialAgentStateTexture);
    
    // --- Manual Grid State Setup ---
    const rtOptions = {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        stencilBuffer: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
    };
    let gridStateA = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_WIDTH, rtOptions);
    let gridStateB = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_WIDTH, rtOptions);
    // You can initialize gridStateA with initialGridStateTexture if needed, but starting at 0 is fine.

    const gridStateMaterial = new THREE.ShaderMaterial({
        uniforms: {
            textureGridState: { value: null },
            textureAgentInfluence: { value: null },
            time: { value: 0.0 },
            resolution: { value: new THREE.Vector2(TEXTURE_WIDTH, TEXTURE_WIDTH) },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: computeShaderGridState,
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
    });
    const gridStateQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridStateMaterial);


    // --- Agent Influence Render Target Setup ---
    const agentInfluenceRenderTarget = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_WIDTH, rtOptions);
    const agentInfluenceMaterial = new THREE.ShaderMaterial({
        uniforms: {
            texturePosition: { value: null },
            textureAgentState: { value: null },
            resolution: { value: new THREE.Vector2(TEXTURE_WIDTH, TEXTURE_WIDTH) },
        },
        vertexShader: gridStateUpdateVertexShader,
        fragmentShader: gridStateUpdateFragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
    });

    const agentPointGeometry = new THREE.BufferGeometry();
    const agentUVs = new Float32Array(TOTAL_AGENTS * 2);
    for (let i = 0; i < TOTAL_AGENTS; i++) {
        agentUVs[i * 2] = (i % TEXTURE_WIDTH) / (TEXTURE_WIDTH - 1);
        agentUVs[i * 2 + 1] = Math.floor(i / TEXTURE_WIDTH) / (TEXTURE_WIDTH - 1);
    }
    agentPointGeometry.setAttribute('uv', new THREE.BufferAttribute(agentUVs, 2));
    const agentInfluenceMesh = new THREE.Points(agentPointGeometry, agentInfluenceMaterial);
    agentInfluenceMesh.frustumCulled = false;


    // --- Set Dependencies ---
    gpuCompute.setVariableDependencies(agentStateVariable, [agentStateVariable, positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [velocityVariable, positionVariable, agentStateVariable]);
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    
    // --- Uniforms ---
    velocityVariable.material.uniforms['textureGridState'] = { value: null };
    agentStateVariable.material.uniforms['textureGridState'] = { value: null };
    // ... other uniforms ...
    velocityVariable.material.uniforms['time'] = { value: 0.0 };
    agentStateVariable.material.uniforms['time'] = { value: 0.0 };


    const error = gpuCompute.init();
    if (error !== null) {
        console.error('GPUComputationRenderer Error: ' + error);
    }

    // 3. Geometry (for rendering)
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(TOTAL_AGENTS * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(agentUVs, 2));


    // 4. Material (for rendering)
    const material = new THREE.ShaderMaterial({
        uniforms: {
            texturePosition: { value: null },
            texturePreviousPosition: { value: null },
            interpolationFactor: { value: 0.0 },
            textureAgentState: { value: null },
            textureGridState: { value: null }, // For visualizing the grid
            gridColumns: { value: GRID_COLUMNS },
            gridRows: { value: GRID_ROWS },
            gridLayers: { value: GRID_LAYERS },
            cylinderRadius: { value: 150.0 },
            rowHeight: { value: 10.0 },
            layerSpacing: { value: 20.0 },
            layersPerRegion: { value: LAYERS_PER_REGION },
            parallaxSpeeds: { value: new THREE.Vector3(0.4, 0.2, 0.1) },
            cameraRotationY: { value: 0.0 },
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
    });
    
    // 5. Object
    const points = new THREE.Points(geometry, material);
    // scene.add(points); // DEBUG: Disable agent rendering

    // --- Grid Visualization ---
    const gridVisGeometry = new THREE.BufferGeometry();
    const gridVisPositions = new Float32Array(TOTAL_AGENTS * 3);
    const gridVisUvs = new Float32Array(TOTAL_AGENTS * 2);
    const cellsPerLayer = GRID_COLUMNS * GRID_ROWS;

    for (let l = 0; l < GRID_LAYERS; l++) {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLUMNS; c++) {
                const index = l * cellsPerLayer + r * GRID_COLUMNS + c;
                
                // Store the 3D grid coordinate
                gridVisPositions[index * 3] = c;
                gridVisPositions[index * 3 + 1] = r;
                gridVisPositions[index * 3 + 2] = l;

                // Store the 2D texture coordinate
                gridVisUvs[index * 2] = (index % TEXTURE_WIDTH) / (TEXTURE_WIDTH - 1);
                gridVisUvs[index * 2 + 1] = Math.floor(index / TEXTURE_WIDTH) / (TEXTURE_WIDTH - 1);
            }
        }
    }
    gridVisGeometry.setAttribute('position', new THREE.BufferAttribute(gridVisPositions, 3));
    gridVisGeometry.setAttribute('uv', new THREE.BufferAttribute(gridVisUvs, 2));

    const gridVisMaterial = new THREE.ShaderMaterial({
        uniforms: {
            gridColumns: { value: GRID_COLUMNS },
            gridRows: { value: GRID_ROWS },
            gridLayers: { value: GRID_LAYERS },
            cylinderRadius: { value: 150.0 }, // This will be the base radius
            rowHeight: { value: 10.0 },
            layerSpacing: { value: 20.0 }, // This will be the spacing between concentric rings
            layersPerRegion: { value: LAYERS_PER_REGION },
            parallaxSpeeds: { value: new THREE.Vector3(2.0, 1.0, 0.5) }, // Increased for visibility
            cameraRotationY: { value: 0.0 },
        },
        vertexShader: gridVisualVertexShader,
        fragmentShader: 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }', // Hardcoded white
        blending: THREE.NormalBlending,
        transparent: false,
        depthWrite: true,
    });

    const gridVisPoints = new THREE.Points(gridVisGeometry, gridVisMaterial);
    scene.add(gridVisPoints);


    // 6. Render Loop with Time Control
    const clock = new THREE.Clock();
    let timeSinceLastUpdate = 0;
    const updateIntervalSeconds = 0.1;
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const animate = () => {
        const delta = clock.getDelta();
        timeSinceLastUpdate += delta;

        material.uniforms.interpolationFactor.value = timeSinceLastUpdate / updateIntervalSeconds;

        if (timeSinceLastUpdate >= updateIntervalSeconds) {
            // DEBUG: Disable all compute passes
            /*
            const elapsedTime = clock.elapsedTime;

            // === PASS 1: AGENT COMPUTE ===
            // Agents decide their next move based on the grid state from the PREVIOUS frame.
            velocityVariable.material.uniforms['textureGridState'].value = gridStateA.texture;
            agentStateVariable.material.uniforms['textureGridState'].value = gridStateA.texture;
            velocityVariable.material.uniforms['time'].value = elapsedTime;
            agentStateVariable.material.uniforms['time'].value = elapsedTime;
            
            gpuCompute.compute();

            // === PASS 2: AGENT INFLUENCE ===
            // Agents "draw" their influence into a temporary texture based on their NEW positions.
            renderer.setRenderTarget(agentInfluenceRenderTarget);
            renderer.clear();
            agentInfluenceMaterial.uniforms['texturePosition'].value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
            agentInfluenceMaterial.uniforms['textureAgentState'].value = gpuCompute.getCurrentRenderTarget(agentStateVariable).texture;
            renderer.render(agentInfluenceMesh, orthoCamera);
            renderer.setRenderTarget(null);

            // === PASS 3: GRID STATE UPDATE ===
            // The grid updates itself based on its previous state and the new agent influence.
            renderer.setRenderTarget(gridStateB); // Render to the 'new' buffer
            gridStateMaterial.uniforms['textureGridState'].value = gridStateA.texture; // Read from the 'old' buffer
            gridStateMaterial.uniforms['textureAgentInfluence'].value = agentInfluenceRenderTarget.texture;
            gridStateMaterial.uniforms['time'].value = elapsedTime;
            renderer.render(gridStateQuad, orthoCamera);
            renderer.setRenderTarget(null);

            // === PING-PONG ===
            // Swap the grid state buffers for the next frame.
            [gridStateA, gridStateB] = [gridStateB, gridStateA];

            // === FINAL RENDER UNIFORMS ===
            material.uniforms.texturePreviousPosition.value = gpuCompute.getAlternateRenderTarget(positionVariable).texture;
            material.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
            material.uniforms.textureAgentState.value = gpuCompute.getCurrentRenderTarget(agentStateVariable).texture;
            material.uniforms.textureGridState.value = gridStateA.texture; // Use the newest grid state for rendering
            
            gridVisMaterial.uniforms.textureGridState.value = gridStateA.texture; // Update grid visualization as well

            timeSinceLastUpdate %= updateIntervalSeconds;
            */
        }
        
        controls.update();
        const cameraRotation = controls.getAzimuthalAngle();
        // material.uniforms.cameraRotationY.value = cameraRotation; // DEBUG: Agent material is not in use
        gridVisMaterial.uniforms.cameraRotationY.value = cameraRotation;
        renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);
}
