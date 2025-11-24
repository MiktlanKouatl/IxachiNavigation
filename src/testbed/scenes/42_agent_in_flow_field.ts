
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'lil-gui';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';

// From 41
import { GPUComputationRenderer as AgentGPUComputationRenderer } from './ring_grid_system/GPUComputationRenderer';

// Player and Trail Components
import { PlayerController } from '../../controls/PlayerController';
import { ChaseCameraController } from '../../controls/ChaseCameraController';
import { GPUParticleSystem } from '../../core/GPUParticleSystem';
import { RibbonLineGPUPlayer, UseMode } from '../../core/RibbonLineGPUPlayer';
import { FadeStyle } from '../../core/RibbonLine';
import { ColorManager } from '../../managers/ColorManager';
import { PathController } from '../../core/pathing/PathController';
import { RingController } from '../../features/rings/RingController';
import { SoundManager } from '../../managers/SoundManager';

// We will create all these shaders from scratch.
// The '?raw' import syntax is from Vite and loads the file as a string.
import flowFieldShader from '../../shaders/flow_field_perlin_compute.glsl?raw';
import agentMovementShader from '../../shaders/agent_movement_flow_compute.glsl?raw';
import agentPositionShader from '../../shaders/agent_position_compute.glsl?raw';
import particleRenderVertexShader from '../../shaders/particle_render.vert.glsl?raw';
import particleRenderFragmentShader from '../../shaders/particle_render.frag.glsl?raw';
import cursorVertexShader from '../../shaders/cursor.vert.glsl?raw';
import cursorFragmentShader from '../../shaders/cursor.frag.glsl?raw';

// Shaders from 41
import agentStateShader from './ring_grid_system/agent_state_compute.glsl?raw';
import agentPositionShader41 from './ring_grid_system/agent_position_compute.glsl?raw'; // aliased
import agentRenderVertexShader from './ring_grid_system/agent_render.vert.glsl?raw';
import agentRenderFragmentShader from './ring_grid_system/agent_render.frag.glsl?raw';


// A new class for the pulsing cursor
class PulsingCursor {
    public mesh: THREE.Mesh;
    public light: THREE.PointLight;
    private material: THREE.ShaderMaterial;
    private currentRoll: number = 0; // For smoothing the banking rotation

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.PlaneGeometry(0.2, 1.5); // Thin line
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 1.0 }, // Always fully opaque for base pulse
                uColor: { value: new THREE.Color(0x00eeff) }
            },
            vertexShader: cursorVertexShader,
            fragmentShader: cursorFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.visible = true; // Always visible
        scene.add(this.mesh);

        this.light = new THREE.PointLight(0x00eeff, 0, 20); // Color, Intensity, Distance
        this.light.visible = true; // Always visible
        scene.add(this.light);
    }

    setVisible(visible: boolean) {
        // Now always visible, this method is no longer used for visibility toggling
    }

    update(time: number, position: THREE.Vector3, direction: THREE.Vector3, ribbonWidth: number, turnRate: number, isMoving: boolean) {
        this.material.uniforms.uTime.value = time;
        
        // Set position and orientation
        this.mesh.position.copy(position);
        if (direction.lengthSq() > 0.0001) {
            const forward = direction.clone().normalize();
            // This results in a vertical bar whose width is perpendicular to the path.
            this.mesh.lookAt(position.clone().add(forward));

            // Calculate dynamic roll based on turn rate, with smoothing
            const targetRoll = -turnRate * 0.6; // User has adjusted this multiplier

            // Use different lerp factors for banking, returning while moving, and returning while stopped
            let lerpFactor;
            if (turnRate !== 0) {
                // 1. Actively turning
                lerpFactor = 0.12;
            } else {
                // Not actively turning, so returning to neutral
                if (isMoving) {
                    // 2. Returning to neutral while still moving forward
                    lerpFactor = 0.02;
                } else {
                    // 3. Returning to neutral when completely stopped (slowest)
                    lerpFactor = 0.025;
                }
            }
            this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, lerpFactor); // Smoothly interpolate

            // Create a single quaternion for the combined horizontal + roll rotation
            const totalZRotation = (Math.PI / 2) + this.currentRoll;
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), totalZRotation);

            // Multiply the lookAt quaternion by the roll quaternion to apply the banking correctly
            this.mesh.quaternion.multiply(rollQuat);
        }

        // Adjust scale to match ribbon width
        this.mesh.scale.x = ribbonWidth;

        const pulse = (Math.sin(time * 5.0) * 0.5 + 0.5); // range [0, 1]
        this.light.intensity = pulse * 1.5; // Pulsing intensity for the light
        this.light.position.copy(position);
    }
    
    setOpacity(opacity: number) {
        this.material.uniforms.uOpacity.value = opacity;
    }
}

export default () => {
    // let stationaryTime = 0; // Removed

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.far = 5000; // Increase far clipping plane for larger world
    camera.updateProjectionMatrix();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    new OrbitControls(camera, renderer.domElement);
    camera.position.z = 250;

    // --- Audio ---
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const soundManager = new SoundManager(listener);

    // Load sounds - NOTE: You need to place these sound files in the /public/sounds/ directory
    console.log("INFO: Attempting to load placeholder sounds from /sounds/collect.mp3 and /sounds/event.mp3");
    soundManager.load([
        { name: 'collect', path: '/sounds/collect01.wav' },
        { name: 'event', path: '/sounds/collect.wav' }
    ]).catch(error => {
        console.warn("Could not load sounds. Make sure they are in the /public/sounds/ directory.");
    });

    // --- Controllers ---
    const playerController = new PlayerController();
    const cameraController = new ChaseCameraController(camera, playerController);
    const colorManager = new ColorManager(); // Instantiate ColorManager earlier
    const pathController = new PathController();
    const ringController = new RingController(scene, pathController, colorManager);

    // Add test rings
    // Big "event" rings
    ringController.addRingAt(0.25, 'event');
    ringController.addRingAt(0.50, 'event');
    ringController.addRingAt(0.75, 'event');

    // Smaller "collection" rings
    for (let i = 0; i < 1; i += 0.05) {
        if (i !== 0.25 && i !== 0.50 && i !== 0.75) { // Avoid placing on top of event rings
            ringController.addRingAt(i, 'collection');
        }
    }

    // Listen for ring collections
    ringController.onRingCollected.on('collect', (data: { type: string, collectedCount: number }) => {
        console.log(`Collected ring of type: "${data.type}". Total collected: ${data.collectedCount}.`);
        if (data.type === 'event') {
            soundManager.play('event');
        } else {
            soundManager.play('collect', 0.5); // Play collection sound at a lower volume
        }
    });




    const gui = new GUI();
    const params = {
        speed: 6.0,
        particleSize: 0.5,
        minParticleSize: 0.1,
        minSegmentLengthThreshold: 0.01, // New parameter
        palette: 'NaranjaIxachi',
        repulsionStrength: 5.0,
        repulsionRadius: 10.0,
        // New Flow Field Params
        noiseScale: 0.01,
        perturbStrength: 1.5,
        verticalSpeed: 0.4
    };

    // Update scene background from palette
    scene.background.copy(colorManager.getColor('background'));

    // --- Road Visualization (from PathController) ---
    const roadLineMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const pathCurve = pathController.getCurve();
    const divisions = 200;
    const pathPoints = pathCurve.getPoints(divisions);
    const roadWidth = 10; 

    const leftRoadPoints: THREE.Vector3[] = [];
    const rightRoadPoints: THREE.Vector3[] = [];
    const frenetFrames = pathCurve.computeFrenetFrames(divisions, true);

    for (let i = 0; i <= divisions; i++) {
        const point = pathPoints[i];
        const binormal = frenetFrames.binormals[i];
        const offsetVector = binormal.clone().multiplyScalar(roadWidth / 2);
        leftRoadPoints.push(point.clone().sub(offsetVector));
        rightRoadPoints.push(point.clone().add(offsetVector));
    }

    const leftRoadLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftRoadPoints), roadLineMaterial);
    const rightRoadLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightRoadPoints), roadLineMaterial);
    scene.add(leftRoadLine, rightRoadLine);

    const cameraPathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const cameraPathMaterial = new THREE.LineDashedMaterial({ color: 0xff0000, dashSize: 1, gapSize: 0.5 });
    const cameraPathObject = new THREE.Line(cameraPathGeometry, cameraPathMaterial);
    cameraPathObject.computeLineDistances();
    scene.add(cameraPathObject);

    // =================================================================
    // --- LANDSCAPE PARTICLE SYSTEM ---
    // =================================================================
    const LANDSCAPE_WORLD_SIZE = 240;
    const LANDSCAPE_AGENT_COUNT = 500;
    const LANDSCAPE_AGENT_TEXTURE_WIDTH = Math.ceil(Math.sqrt(LANDSCAPE_AGENT_COUNT));
    const LANDSCAPE_AGENT_TEXTURE_HEIGHT = LANDSCAPE_AGENT_TEXTURE_WIDTH;

    const landscapeGpuCompute = new GPUComputationRenderer(LANDSCAPE_AGENT_TEXTURE_WIDTH, LANDSCAPE_AGENT_TEXTURE_HEIGHT, renderer);
    const flowFieldCompute = new GPUComputationRenderer(128, 128, renderer);

    // --- 1. Create Flow Field (Vector Field) ---
    const flowFieldTexture = flowFieldCompute.createTexture();
    const flowFieldVariable = flowFieldCompute.addVariable('textureFlowField', flowFieldShader, flowFieldTexture);
    
    const flowError = flowFieldCompute.init();
    if (flowError !== null) { console.error('Flow Field GPGPU Error: ' + flowError); }

    // --- Set Flow Field Uniforms ---
    const ffUniforms = flowFieldVariable.material.uniforms;
    ffUniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    ffUniforms['u_time'] = new THREE.Uniform(0.0);
    ffUniforms['u_noiseScale'] = new THREE.Uniform(params.noiseScale);
    ffUniforms['u_perturbStrength'] = new THREE.Uniform(params.perturbStrength);
    ffUniforms['verticalSpeed'] = new THREE.Uniform(params.verticalSpeed);

    const flowFieldResult = flowFieldCompute.getCurrentRenderTarget(flowFieldVariable).texture;

    // --- 2. Create Landscape Agent Simulation ---
    const landscapePosData = landscapeGpuCompute.createTexture();
    const landscapeVelData = landscapeGpuCompute.createTexture();

    const landscapePosArray = landscapePosData.image.data;
    for (let i = 0; i < LANDSCAPE_AGENT_COUNT; i++) {
        const i4 = i * 4;
        landscapePosArray[i4 + 0] = (Math.random() - 0.5) * LANDSCAPE_WORLD_SIZE; // x
        landscapePosArray[i4 + 1] = (Math.random() - 0.5) * 20; // y (height)
        landscapePosArray[i4 + 2] = (Math.random() - 0.5) * LANDSCAPE_WORLD_SIZE; // z
    }

    const landscapeAgentPositionVariable = landscapeGpuCompute.addVariable('texturePosition', agentPositionShader, landscapePosData);
    const landscapeAgentVelocityVariable = landscapeGpuCompute.addVariable('textureVelocity', agentMovementShader, landscapeVelData);

    landscapeGpuCompute.setVariableDependencies(landscapeAgentVelocityVariable, [landscapeAgentPositionVariable, landscapeAgentVelocityVariable]);
    landscapeGpuCompute.setVariableDependencies(landscapeAgentPositionVariable, [landscapeAgentPositionVariable, landscapeAgentVelocityVariable]);

    // --- Set velocity shader uniforms ---
    const velUniforms = landscapeAgentVelocityVariable.material.uniforms;
    velUniforms['textureFlowField'] = new THREE.Uniform(flowFieldResult);
    velUniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    velUniforms['speed'] = new THREE.Uniform(params.speed);
    velUniforms['u_playerPosition'] = new THREE.Uniform(new THREE.Vector3());
    velUniforms['u_repulsionStrength'] = new THREE.Uniform(params.repulsionStrength);
    velUniforms['u_repulsionRadius'] = new THREE.Uniform(params.repulsionRadius);

    const posUniforms = landscapeAgentPositionVariable.material.uniforms;
    posUniforms['delta'] = new THREE.Uniform(0.0);
    posUniforms['time'] = new THREE.Uniform(0.0);
    posUniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    
    const landscapeAgentError = landscapeGpuCompute.init();
    if (landscapeAgentError !== null) { console.error('Landscape GPGPU Error: ' + landscapeAgentError); }

    // --- 3. Landscape Visualization ---
    const landscapeParticleGeometry = new THREE.BufferGeometry();
    const landscapeParticleUvs = new Float32Array(LANDSCAPE_AGENT_COUNT * 2);
    const landscapeParticlePositions = new Float32Array(LANDSCAPE_AGENT_COUNT * 3);

    for (let i = 0; i < LANDSCAPE_AGENT_COUNT; i++) {
        const i2 = i * 2;
        landscapeParticleUvs[i2 + 0] = (i % LANDSCAPE_AGENT_TEXTURE_WIDTH) / LANDSCAPE_AGENT_TEXTURE_WIDTH;
        landscapeParticleUvs[i2 + 1] = Math.floor(i / LANDSCAPE_AGENT_TEXTURE_WIDTH) / LANDSCAPE_AGENT_TEXTURE_HEIGHT;
    }
    landscapeParticleGeometry.setAttribute('uv', new THREE.BufferAttribute(landscapeParticleUvs, 2));
    landscapeParticleGeometry.setAttribute('position', new THREE.BufferAttribute(landscapeParticlePositions, 3));

    const landscapeParticleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleRenderVertexShader,
        fragmentShader: particleRenderFragmentShader,
        uniforms: {
            texturePosition: { value: null },
            particleSize: { value: params.particleSize },
            particleColor: { value: colorManager.getColor('ribbonDefault') },
            cameraConstant: { value: getCameraConstant() },
            // DEBUG UNIFORMS
            textureFlowField: { value: flowFieldResult },
            worldSize: { value: LANDSCAPE_WORLD_SIZE },
        },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const landscapeParticles = new THREE.Points(landscapeParticleGeometry, landscapeParticleMaterial);
    landscapeParticles.frustumCulled = false;
    scene.add(landscapeParticles);

    // =================================================================
    // --- GPGPU AGENT SYSTEM (from 41) ---
    // =================================================================
    const AGENT_COUNT = 512;
    const PARTICLES_PER_AGENT = 5;
    const TOTAL_PARTICLES = AGENT_COUNT * PARTICLES_PER_AGENT;

    const AGENT_TEXTURE_WIDTH = Math.ceil(Math.sqrt(AGENT_COUNT));
    const AGENT_TEXTURE_HEIGHT = AGENT_TEXTURE_WIDTH;

    const cylinderRadius = LANDSCAPE_WORLD_SIZE / 2;
    const virtualGrids = [
        { radius: cylinderRadius, rows: 16, columns: 256, height: 50 },
        { radius: cylinderRadius + 30, rows: 16, columns: 256, height: 50 },
        { radius: cylinderRadius + 60, rows: 16, columns: 256, height: 50 },
    ];

    // --- 1. Agent Logic GPGPU ---
    const agentGpuCompute = new AgentGPUComputationRenderer(AGENT_TEXTURE_WIDTH, AGENT_TEXTURE_HEIGHT, renderer);

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
    const agentPositionVariable = agentGpuCompute.addVariable('textureAgentPosition', agentPositionShader41, agentPositionData);
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
    agentParticles.frustumCulled = false;
    scene.add(agentParticles);

    // =================================================================
    // --- PLAYER PARTICLE SYSTEM ---
    // =================================================================
    const NUM_PLAYER_PARTICLES = 50;
    const playerParticleSystem = new GPUParticleSystem({
        numParticles: NUM_PLAYER_PARTICLES,
        renderer: renderer,
    });
    const initialPoints = Array.from({ length: NUM_PLAYER_PARTICLES }, () => new THREE.Vector3(0, 0, 0));
    const playerRibbon = new RibbonLineGPUPlayer(initialPoints, {
        color: new THREE.Color(0x00eeff),
        colorEnd: new THREE.Color(0x0062ff),
        width: 0.75,
        maxLength: NUM_PLAYER_PARTICLES,
        fadeStyle: FadeStyle.FadeOut,
        useMode: UseMode.Static,
        fadeTransitionSize: 1,
        colorMix: 0.1,
        transitionSize: 0.1,
    });
    playerRibbon.setPathLength(NUM_PLAYER_PARTICLES);
    scene.add(playerRibbon.mesh);
    const ribbonMaxWidth = 0.75;
    const ribbonMinWidth = 0.1;

    const pulsingCursor = new PulsingCursor(scene);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {

        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        playerController.update(delta);
        cameraController.update();
        colorManager.update(delta);
        ringController.update(delta, playerController.position);

        ffUniforms['u_time'].value = time;
        flowFieldCompute.compute();
        velUniforms.textureFlowField.value = flowFieldCompute.getCurrentRenderTarget(flowFieldVariable).texture;

        landscapeGpuCompute.compute();
        posUniforms.delta.value = delta;
        posUniforms.time.value = time;
        velUniforms.u_playerPosition.value.copy(playerController.position);
        landscapeParticleMaterial.uniforms.texturePosition.value = landscapeGpuCompute.getCurrentRenderTarget(landscapeAgentPositionVariable).texture;

        playerParticleSystem.update(delta, playerController.position, playerController.velocity);
        playerRibbon.setPathTexture(playerParticleSystem.getPositionTexture());

        const speedRatio = Math.min(Math.abs(playerController.speed) / playerController.maxSpeed, 1.0);
        const newWidth = THREE.MathUtils.lerp(ribbonMaxWidth, ribbonMinWidth, speedRatio);
        playerRibbon.setWidth(newWidth);
        const newParticleSize = THREE.MathUtils.lerp(params.particleSize, params.minParticleSize, speedRatio);
        landscapeParticleMaterial.uniforms.particleSize.value = newParticleSize;

        // --- Pulsing Cursor Logic (Always Visible) ---
        const ribbonCurrentWidth = THREE.MathUtils.lerp(ribbonMaxWidth, ribbonMinWidth, speedRatio);
        
        const isMoving = playerController.keyboardState['w'] || playerController.keyboardState['s'];
        pulsingCursor.update(time, playerController.position, playerController.velocity, ribbonCurrentWidth, playerController.turnRate, isMoving);
        pulsingCursor.setOpacity(1.0); // Ensure full base opacity for continuous pulse

        // Update agent simulation
        agentStateVariable.material.uniforms.u_delta.value = delta;
        agentStateVariable.material.uniforms.u_time.value = time;
        agentPositionVariable.material.uniforms.u_time.value = time;
        agentGpuCompute.compute();

        // Update the render material with the new agent positions
        agentParticleMaterial.uniforms.u_textureAgentPosition.value = agentGpuCompute.getCurrentRenderTarget(agentPositionVariable).texture;
        agentParticleMaterial.uniforms.u_textureAgentState.value = agentGpuCompute.getCurrentRenderTarget(agentStateVariable).texture;

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
    const worldFolder = gui.addFolder('World');
    worldFolder.add(params, 'speed', 0.1, 20, 0.1).name('Agent Speed').onChange(v => { velUniforms.speed.value = v; });
    worldFolder.add(params, 'particleSize', 0, 1, 0.01).name('Particle Size');
    worldFolder.add(params, 'minParticleSize', 0, 1, 0.01).name('Min Particle Size');

    const flowFolder = gui.addFolder('Flow Field');
    flowFolder.add(params, 'noiseScale', 0, 0.1, 0.001).name('Noise Scale').onChange(v => { ffUniforms.u_noiseScale.value = v; });
    flowFolder.add(params, 'perturbStrength', 0, 5, 0.01).name('Perturb Strength').onChange(v => { ffUniforms.u_perturbStrength.value = v; });
    flowFolder.add(params, 'verticalSpeed', 0, 2, 0.01).name('Vertical Speed').onChange(v => { ffUniforms.verticalSpeed.value = v; });
    
    const interactionFolder = gui.addFolder('Interaction');
    interactionFolder.add(params, 'repulsionStrength', 0, 20, 0.1).name('Repulsion Strength').onChange(v => { velUniforms.u_repulsionStrength.value = v; });
    interactionFolder.add(params, 'repulsionRadius', 0, 50, 0.1).name('Repulsion Radius').onChange(v => { velUniforms.u_repulsionRadius.value = v; });

    const colorFolder = gui.addFolder('Colors');
    colorFolder.addColor(landscapeParticleMaterial.uniforms.particleColor, 'value').name('Particle Color');
    colorFolder.add(params, 'palette', ['NaranjaIxachi', 'BosqueEncantado']).name('Color Palette').onChange((v: string) => {
        colorManager.setPalette(v);
    });

    // --- Ribbon GUI ---
    const ribbonFolder = gui.addFolder('Player Ribbon');
    ribbonFolder.addColor(playerRibbon.material.uniforms.uColor, 'value').name('Color Start');
    ribbonFolder.addColor(playerRibbon.material.uniforms.uColorEnd, 'value').name('Color End');
    ribbonFolder.add(playerRibbon.material.uniforms.uFadeTransitionSize, 'value', 0, 1, 0.01).name('Fade Size');
    ribbonFolder.add(playerRibbon.material.uniforms.uColorMix, 'value', 0, 1, 0.01).name('Color Mix');
    ribbonFolder.add(playerRibbon.material.uniforms.uTransitionSize, 'value', 0, 1, 0.01).name('Color Transition');
    ribbonFolder.add(params, 'minSegmentLengthThreshold', 0.0, 0.1, 0.001).name('Min Segment Length').onChange(v => {
        playerRibbon.material.uniforms.uMinSegmentLengthThreshold.value = v;
    });

    colorManager.on('update', () => {
        scene.background.copy(colorManager.getColor('background'));
        landscapeParticleMaterial.uniforms.particleColor.value.copy(colorManager.getColor('ribbonDefault'));
        // We are now controlling ribbon color with the GUI, so we comment this out
        // playerRibbon.material.uniforms.uColor.value.copy(colorManager.getColor('accent'));
        // if (playerRibbon.material.uniforms.uColorEnd) {
        //      playerRibbon.material.uniforms.uColorEnd.value.copy(colorManager.getColor('primary'));
        // }
    });

    // --- Cleanup ---
    return () => {
        gui.destroy();
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
    };
};
