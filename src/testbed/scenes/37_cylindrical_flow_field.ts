
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'lil-gui';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';

// We will create all these shaders from scratch.
// The '?raw' import syntax is from Vite and loads the file as a string.
import flowFieldShader from '../../shaders/flow_field_cylindrical_compute.glsl?raw';
import agentMovementShader from '../../shaders/agent_movement_flow_compute.glsl?raw';
import agentPositionShader from '../../shaders/agent_position_compute.glsl?raw';
import particleRenderVertexShader from '../../shaders/particle_render.vert.glsl?raw';
import particleRenderFragmentShader from '../../shaders/particle_render.frag.glsl?raw';

export default () => {
    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const gui = new GUI();
    const params = {
        speed: 2.0,
        particleSize: 0.5,
        particleColor: '#00ffff',
    };

    // --- Simulation Constants ---
    const WORLD_SIZE = 20;
    const AGENT_COUNT = 2000; // Reduced number of agents
    const AGENT_TEXTURE_WIDTH = Math.ceil(Math.sqrt(AGENT_COUNT));
    const AGENT_TEXTURE_HEIGHT = AGENT_TEXTURE_WIDTH;

    // --- GPGPU Setup ---
    // This renderer is for the agents
    const gpuCompute = new GPUComputationRenderer(AGENT_TEXTURE_WIDTH, AGENT_TEXTURE_HEIGHT, renderer);

    // This second renderer is for the flow field, which has a different resolution
    const flowFieldCompute = new GPUComputationRenderer(128, 128, renderer);

    // --- 1. Create Flow Field (Vector Field) ---
    const flowFieldTexture = flowFieldCompute.createTexture();
    const flowFieldVariable = flowFieldCompute.addVariable('textureFlowField', flowFieldShader, flowFieldTexture);
    
    const flowError = flowFieldCompute.init();
    if (flowError !== null) { console.error('Flow Field GPGPU Error: ' + flowError); }

    // Compute the flow field once at the beginning
    flowFieldVariable.material.uniforms['worldSize'] = new THREE.Uniform(WORLD_SIZE);
    flowFieldVariable.material.uniforms['numLayers'] = new THREE.Uniform(9.0);
    flowFieldVariable.material.uniforms['parallaxSpeeds'] = new THREE.Uniform(new THREE.Vector3(1.0, 0.5, 0.25)); // Fast, Medium, Slow
    flowFieldVariable.material.uniforms['verticalSpeed'] = new THREE.Uniform(0.1);

    flowFieldCompute.compute();
    const flowFieldResult = flowFieldCompute.getCurrentRenderTarget(flowFieldVariable).texture;

        // --- 2. Create Agent Simulation ---
        const posData = gpuCompute.createTexture();
        const velData = gpuCompute.createTexture();
    
        // Initialize agent positions and velocities on the CPU
        const posArray = posData.image.data;
        const velArray = velData.image.data;
        for (let i = 0; i < AGENT_COUNT; i++) {
            const i4 = i * 4;
            posArray[i4 + 0] = (Math.random() - 0.5) * WORLD_SIZE;
            posArray[i4 + 1] = (Math.random() - 0.5) * WORLD_SIZE;
            posArray[i4 + 2] = (Math.random() - 0.5) * WORLD_SIZE * 0.1;
            posArray[i4 + 3] = Math.random(); // life
    
            velArray[i4 + 0] = (Math.random() - 0.5) * 0.1;
            velArray[i4 + 1] = (Math.random() - 0.5) * 0.1;
            velArray[i4 + 2] = 0;
            velArray[i4 + 3] = 1.0;
        }
    
        const agentPositionVariable = gpuCompute.addVariable('texturePosition', agentPositionShader, posData);
        const agentVelocityVariable = gpuCompute.addVariable('textureVelocity', agentMovementShader, velData);
    
        gpuCompute.setVariableDependencies(agentVelocityVariable, [agentPositionVariable, agentVelocityVariable]);
        gpuCompute.setVariableDependencies(agentPositionVariable, [agentPositionVariable, agentVelocityVariable]);
    
        // Add uniforms
        agentVelocityVariable.material.uniforms['textureFlowField'] = new THREE.Uniform(flowFieldResult);
        agentVelocityVariable.material.uniforms['worldSize'] = new THREE.Uniform(WORLD_SIZE);
        agentVelocityVariable.material.uniforms['speed'] = new THREE.Uniform(params.speed);
        
        agentPositionVariable.material.uniforms['delta'] = new THREE.Uniform(0.0);
        agentPositionVariable.material.uniforms['time'] = new THREE.Uniform(0.0);
        agentPositionVariable.material.uniforms['worldSize'] = new THREE.Uniform(WORLD_SIZE);
    const agentError = gpuCompute.init();
    if (agentError !== null) { console.error('Agent GPGPU Error: ' + agentError); }

    // --- 3. Visualization ---
    const particleGeometry = new THREE.BufferGeometry();
    const particleUvs = new Float32Array(AGENT_COUNT * 2);
    const particlePositions = new Float32Array(AGENT_COUNT * 3); // This is the missing attribute

    for (let i = 0; i < AGENT_COUNT; i++) {
        const i2 = i * 2;
        const i3 = i * 3;

        const u = (i % AGENT_TEXTURE_WIDTH) / AGENT_TEXTURE_WIDTH;
        const v = Math.floor(i / AGENT_TEXTURE_WIDTH) / AGENT_TEXTURE_HEIGHT;
        particleUvs[i2 + 0] = u;
        particleUvs[i2 + 1] = v;

        // The actual values don't matter for now, but the attribute must exist.
        particlePositions[i3 + 0] = 0;
        particlePositions[i3 + 1] = 0;
        particlePositions[i3 + 2] = 0;
    }
    particleGeometry.setAttribute('uv', new THREE.BufferAttribute(particleUvs, 2));
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleRenderVertexShader,
        fragmentShader: particleRenderFragmentShader,
        uniforms: {
            texturePosition: { value: null }, // Will be updated in the animation loop
            particleSize: { value: params.particleSize },
            particleColor: { value: new THREE.Color(params.particleColor) },
            cameraConstant: { value: getCameraConstant() }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    function getCameraConstant() {
        return window.innerHeight / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
    }
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        particleMaterial.uniforms.cameraConstant.value = getCameraConstant();
    });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        gpuCompute.compute(); // Reactivate simulation
        agentPositionVariable.material.uniforms['delta'].value = delta;
        agentPositionVariable.material.uniforms['time'].value = time;
        particleMaterial.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(agentPositionVariable).texture; // Update with current simulation output

        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // --- UI ---
    gui.add(params, 'speed', 0.1, 10, 0.1).name('Agent Speed').onChange(v => { agentVelocityVariable.material.uniforms.speed.value = v; });
    gui.add(params, 'particleSize', 0, 1, 0.01).name('Particle Size').onChange(v => { particleMaterial.uniforms.particleSize.value = v; });
    gui.addColor(params, 'particleColor').name('Particle Color').onChange(v => { particleMaterial.uniforms.particleColor.value.set(v); });


    // --- Cleanup ---
    return () => {
        gui.destroy();
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
    };
};
