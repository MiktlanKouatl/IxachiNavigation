
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'lil-gui';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';

// Player and Trail Components
import { PlayerController } from '../../controls/PlayerController';
import { ChaseCameraController } from '../../controls/ChaseCameraController';
import { GPUParticleSystem } from '../../core/GPUParticleSystem';
import { RibbonLineGPU, UseMode } from '../../core/RibbonLineGPU';
import { ColorManager } from '../../managers/ColorManager';

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
    scene.background = new THREE.Color(0x111111);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // --- Controllers ---
    const playerController = new PlayerController();
    const cameraController = new ChaseCameraController(camera, playerController);
    const colorManager = new ColorManager(); // Instantiate ColorManager earlier

    const gui = new GUI();
    const params = {
        speed: 2.0,
        particleSize: 0.5,
        palette: 'NaranjaIxachi',
    };
    // The particle color is now managed by the ColorManager and its GUI, so we remove it from here.

    // Update scene background from palette
    scene.background.copy(colorManager.getColor('background'));

    // =================================================================
    // --- LANDSCAPE PARTICLE SYSTEM (from scene 37) ---
    // =================================================================
    const LANDSCAPE_WORLD_SIZE = 80; // Make landscape bigger
    const LANDSCAPE_AGENT_COUNT = 5000; // More particles for the landscape
    const LANDSCAPE_AGENT_TEXTURE_WIDTH = Math.ceil(Math.sqrt(LANDSCAPE_AGENT_COUNT));
    const LANDSCAPE_AGENT_TEXTURE_HEIGHT = LANDSCAPE_AGENT_TEXTURE_WIDTH;

    const landscapeGpuCompute = new GPUComputationRenderer(LANDSCAPE_AGENT_TEXTURE_WIDTH, LANDSCAPE_AGENT_TEXTURE_HEIGHT, renderer);
    const flowFieldCompute = new GPUComputationRenderer(128, 128, renderer);

    // --- 1. Create Flow Field (Vector Field) ---
    const flowFieldTexture = flowFieldCompute.createTexture();
    const flowFieldVariable = flowFieldCompute.addVariable('textureFlowField', flowFieldShader, flowFieldTexture);
    
    const flowError = flowFieldCompute.init();
    if (flowError !== null) { console.error('Flow Field GPGPU Error: ' + flowError); }

    // Compute the flow field once at the beginning
    flowFieldVariable.material.uniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    flowFieldVariable.material.uniforms['numLayers'] = new THREE.Uniform(9.0);
    flowFieldVariable.material.uniforms['parallaxSpeeds'] = new THREE.Uniform(new THREE.Vector3(1.0, 0.5, 0.25)); // Fast, Medium, Slow
    flowFieldVariable.material.uniforms['verticalSpeed'] = new THREE.Uniform(0.2);

    flowFieldCompute.compute();
    const flowFieldResult = flowFieldCompute.getCurrentRenderTarget(flowFieldVariable).texture;

    // --- 2. Create Landscape Agent Simulation ---
    const landscapePosData = landscapeGpuCompute.createTexture();
    const landscapeVelData = landscapeGpuCompute.createTexture();

    const landscapePosArray = landscapePosData.image.data;
    const landscapeVelArray = landscapeVelData.image.data;
    for (let i = 0; i < LANDSCAPE_AGENT_COUNT; i++) {
        const i4 = i * 4;
        // Distribute particles on the XZ plane (the ground)
        landscapePosArray[i4 + 0] = (Math.random() - 0.5) * LANDSCAPE_WORLD_SIZE; // x
        landscapePosArray[i4 + 1] = (Math.random() - 0.5) * 20; // y (height)
        landscapePosArray[i4 + 2] = (Math.random() - 0.5) * LANDSCAPE_WORLD_SIZE; // z

        landscapeVelArray[i4 + 0] = 0.0;
        landscapeVelArray[i4 + 1] = 0.0;
        landscapeVelArray[i4 + 2] = 0.0;
        landscapeVelArray[i4 + 3] = 1.0;
    }

    const landscapeAgentPositionVariable = landscapeGpuCompute.addVariable('texturePosition', agentPositionShader, landscapePosData);
    const landscapeAgentVelocityVariable = landscapeGpuCompute.addVariable('textureVelocity', agentMovementShader, landscapeVelData);

    landscapeGpuCompute.setVariableDependencies(landscapeAgentVelocityVariable, [landscapeAgentPositionVariable, landscapeAgentVelocityVariable]);
    landscapeGpuCompute.setVariableDependencies(landscapeAgentPositionVariable, [landscapeAgentPositionVariable, landscapeAgentVelocityVariable]);

    landscapeAgentVelocityVariable.material.uniforms['textureFlowField'] = new THREE.Uniform(flowFieldResult);
    landscapeAgentVelocityVariable.material.uniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    landscapeAgentVelocityVariable.material.uniforms['speed'] = new THREE.Uniform(params.speed);
    landscapeAgentPositionVariable.material.uniforms['delta'] = new THREE.Uniform(0.0);
    landscapeAgentPositionVariable.material.uniforms['time'] = new THREE.Uniform(0.0);
    landscapeAgentPositionVariable.material.uniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    
    const landscapeAgentError = landscapeGpuCompute.init();
    if (landscapeAgentError !== null) { console.error('Landscape GPGPU Error: ' + landscapeAgentError); }

    // --- 3. Landscape Visualization ---
    const landscapeParticleGeometry = new THREE.BufferGeometry();
    const landscapeParticleUvs = new Float32Array(LANDSCAPE_AGENT_COUNT * 2);
    const landscapeParticlePositions = new Float32Array(LANDSCAPE_AGENT_COUNT * 3);

    for (let i = 0; i < LANDSCAPE_AGENT_COUNT; i++) {
        const i2 = i * 2;
        const i3 = i * 3;
        landscapeParticleUvs[i2 + 0] = (i % LANDSCAPE_AGENT_TEXTURE_WIDTH) / LANDSCAPE_AGENT_TEXTURE_WIDTH;
        landscapeParticleUvs[i2 + 1] = Math.floor(i / LANDSCAPE_AGENT_TEXTURE_WIDTH) / LANDSCAPE_AGENT_TEXTURE_HEIGHT;
        landscapeParticlePositions[i3 + 0] = 0;
        landscapeParticlePositions[i3 + 1] = 0;
        landscapeParticlePositions[i3 + 2] = 0;
    }
    landscapeParticleGeometry.setAttribute('uv', new THREE.BufferAttribute(landscapeParticleUvs, 2));
    landscapeParticleGeometry.setAttribute('position', new THREE.BufferAttribute(landscapeParticlePositions, 3));

    const landscapeParticleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleRenderVertexShader,
        fragmentShader: particleRenderFragmentShader,
        uniforms: {
            texturePosition: { value: null },
            particleSize: { value: params.particleSize },
            particleColor: { value: colorManager.getColor('ribbonDefault') }, // Use ColorManager
            cameraConstant: { value: getCameraConstant() }
        },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const landscapeParticles = new THREE.Points(landscapeParticleGeometry, landscapeParticleMaterial);
    landscapeParticles.frustumCulled = false; // Disable frustum culling
    scene.add(landscapeParticles);

    // =================================================================
    // --- PLAYER PARTICLE SYSTEM (from scene 26) ---
    // =================================================================
    const NUM_PLAYER_PARTICLES = 50;

    const playerParticleSystem = new GPUParticleSystem({
        numParticles: NUM_PLAYER_PARTICLES,
        renderer: renderer,
    });

    const playerRibbon = new RibbonLineGPU([], {
        color: colorManager.getColor('accent'),
        width: 0.75, // Make player ribbon thinner
        maxLength: NUM_PLAYER_PARTICLES,
        useMode: UseMode.Static,
    });
    playerRibbon.setPathLength(NUM_PLAYER_PARTICLES);
    scene.add(playerRibbon.mesh);

    // --- Dynamic Ribbon Width ---
    const ribbonMaxWidth = 0.75;
    const ribbonMinWidth = 0.1;

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // --- Update Controllers ---
        playerController.update(delta);
        cameraController.update();
        colorManager.update(delta); // Update color transitions

        // --- Update Landscape System ---
        landscapeGpuCompute.compute();
        landscapeAgentPositionVariable.material.uniforms['delta'].value = delta;
        landscapeAgentPositionVariable.material.uniforms['time'].value = time;
        landscapeParticleMaterial.uniforms.texturePosition.value = landscapeGpuCompute.getCurrentRenderTarget(landscapeAgentPositionVariable).texture;

        // --- Update Player System ---
        playerParticleSystem.update(delta, playerController.position, playerController.velocity);
        playerRibbon.setPathTexture(playerParticleSystem.getPositionTexture());

        // Update ribbon width based on speed
        const speedRatio = Math.min(Math.abs(playerController.speed) / playerController.maxSpeed, 1.0);
        const newWidth = THREE.MathUtils.lerp(ribbonMaxWidth, ribbonMinWidth, speedRatio);
        playerRibbon.setWidth(newWidth);

        // --- Render ---
        renderer.render(scene, camera);
    }
    animate();

    function getCameraConstant() {
        return window.innerHeight / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        landscapeParticleMaterial.uniforms.cameraConstant.value = getCameraConstant();
    });

    // --- UI ---
    gui.add(params, 'speed', 0.1, 10, 0.1).name('Agent Speed').onChange(v => { landscapeAgentVelocityVariable.material.uniforms.speed.value = v; });
    gui.add(params, 'particleSize', 0, 1, 0.01).name('Particle Size').onChange(v => { landscapeParticleMaterial.uniforms.particleSize.value = v; });
    gui.addColor(landscapeParticleMaterial.uniforms.particleColor, 'value').name('Particle Color'); // Directly control the uniform
    gui.add(params, 'palette', ['NaranjaIxachi', 'BosqueEncantado']).name('Color Palette').onChange((v: string) => {
        colorManager.setPalette(v);
    });

    // --- Color Palette Change Handler ---
    colorManager.on('update', () => {
        // Update scene background
        scene.background.copy(colorManager.getColor('background'));
        // Update landscape particle color
        landscapeParticleMaterial.uniforms.particleColor.value.copy(colorManager.getColor('ribbonDefault'));
        // Update player ribbon color
        playerRibbon.material.uniforms.uColor.value.copy(colorManager.getColor('accent'));
        // If there's a colorEnd, update it too
        if (playerRibbon.material.uniforms.uColorEnd) {
             playerRibbon.material.uniforms.uColorEnd.value.copy(colorManager.getColor('primary'));
        }
    });


    // --- Cleanup ---
    return () => {
        gui.destroy();
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
    };
};
