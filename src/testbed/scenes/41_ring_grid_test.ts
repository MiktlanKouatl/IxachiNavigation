import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GPUComputationRenderer } from './ring_grid_system/GPUComputationRenderer';

// Shaders
import agentStateShader from './ring_grid_system/agent_state_compute.glsl?raw';
import agentPositionShader from './ring_grid_system/agent_position_compute.glsl?raw';
import agentRenderVertexShader from './ring_grid_system/agent_render.vert.glsl?raw';
import agentRenderFragmentShader from './ring_grid_system/agent_render.frag.glsl?raw';

export default () => {
    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.z = 350; // Set camera far away to see everything
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    const controls = new OrbitControls(camera, renderer.domElement);

    // =================================================================
    // --- GPGPU AGENT SYSTEM ---
    // =================================================================
    const AGENT_COUNT = 512;
    const PARTICLES_PER_AGENT = 5;
    const TOTAL_PARTICLES = AGENT_COUNT * PARTICLES_PER_AGENT;

    const AGENT_TEXTURE_WIDTH = Math.ceil(Math.sqrt(AGENT_COUNT));
    const AGENT_TEXTURE_HEIGHT = AGENT_TEXTURE_WIDTH;

    const virtualGrids = [
        { radius: 120, rows: 16, columns: 256, height: 50 },
        { radius: 150, rows: 16, columns: 256, height: 50 },
        { radius: 180, rows: 16, columns: 256, height: 50 },
    ];

    // --- 1. Agent Logic GPGPU ---
    const agentGpuCompute = new GPUComputationRenderer(AGENT_TEXTURE_WIDTH, AGENT_TEXTURE_HEIGHT, renderer);

    const agentStateData = agentGpuCompute.createTexture();
    const stateArray = agentStateData.image.data;
    for (let i = 0; i < AGENT_COUNT * 4; i += 4) {
        stateArray[i + 0] = 1.0; // behaviorType
        stateArray[i + 1] = Math.random(); // animationTimer (random start)
        stateArray[i + 2] = 0.0; // state (searching)
        stateArray[i + 3] = Math.random() * 1000; // randomSeed
    }

    const agentPositionData = agentGpuCompute.createTexture();

    const agentStateVariable = agentGpuCompute.addVariable('textureAgentState', agentStateShader, agentStateData);
    const agentPositionVariable = agentGpuCompute.addVariable('textureAgentPosition', agentPositionShader, agentPositionData);
    agentGpuCompute.setVariableDependencies(agentStateVariable, [agentStateVariable]);
    agentGpuCompute.setVariableDependencies(agentPositionVariable, [agentPositionVariable, agentStateVariable]);

    agentStateVariable.material.uniforms['u_time'] = new THREE.Uniform(0.0);
    agentStateVariable.material.uniforms['u_delta'] = new THREE.Uniform(0.0);
    agentPositionVariable.material.uniforms['u_time'] = new THREE.Uniform(0.0);

    const agentError = agentGpuCompute.init();
    if (agentError !== null) { console.error('Agent GPGPU Error: ' + agentError); }

    // --- 2. Agent Particle Rendering ---
    const agentParticleGeometry = new THREE.BufferGeometry();
    const agentUVs = new Float32Array(TOTAL_PARTICLES * 2);
    
    for (let i = 0; i < AGENT_COUNT; i++) {
        const u = (i % AGENT_TEXTURE_WIDTH) / (AGENT_TEXTURE_WIDTH - 1);
        const v = Math.floor(i / AGENT_TEXTURE_WIDTH) / (AGENT_TEXTURE_HEIGHT - 1);
        for (let j = 0; j < PARTICLES_PER_AGENT; j++) {
            const index = i * PARTICLES_PER_AGENT + j;
            agentUVs[index * 2] = u;
            agentUVs[index * 2 + 1] = v;
        }
    }

    agentParticleGeometry.setAttribute('a_agent_uv', new THREE.BufferAttribute(agentUVs, 2));
    agentParticleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TOTAL_PARTICLES * 3), 3));

    const agentParticleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_textureAgentPosition: { value: null },
            u_textureAgentState: { value: null },
            u_gridRadii: { value: virtualGrids.map(g => g.radius) },
            u_gridHeights: { value: virtualGrids.map(g => g.height) },
            u_gridDimensions: { value: virtualGrids.map(g => new THREE.Vector2(g.columns, g.rows)) },
        },
        vertexShader: agentRenderVertexShader, fragmentShader: agentRenderFragmentShader,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const agentParticles = new THREE.Points(agentParticleGeometry, agentParticleMaterial);
    scene.add(agentParticles);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Update agent simulation
        agentStateVariable.material.uniforms.u_delta.value = delta;
        agentStateVariable.material.uniforms.u_time.value = time;
        agentPositionVariable.material.uniforms.u_time.value = time;
        agentGpuCompute.compute();

        // Update the render material with the new agent positions
        agentParticleMaterial.uniforms.u_textureAgentPosition.value = agentGpuCompute.getCurrentRenderTarget(agentPositionVariable).texture;
        agentParticleMaterial.uniforms.u_textureAgentState.value = agentGpuCompute.getCurrentRenderTarget(agentStateVariable).texture;

        renderer.render(scene, camera);
        controls.update();
    }
    animate();

    // --- UI and Cleanup ---
    return () => {
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
    };
};