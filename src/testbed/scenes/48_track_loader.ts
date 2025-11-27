
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'lil-gui';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';

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
import { EnergyOrbController } from '../../features/collectables/EnergyOrbController';

// Track Builder
import { TrackBuilder, TrackOperation } from '../../core/pathing/TrackBuilder';
import trackData from '../../data/tracks/track_mandala_01.json';

// Shaders
import flowFieldShader from '../../shaders/flow_field_perlin_compute.glsl?raw';
import terrainHeightShader from '../../shaders/terrain_height_compute.glsl?raw';
import particleRenderVertexShader from '../../shaders/particle_render.vert.glsl?raw';
import particleRenderFragmentShader from '../../shaders/particle_render.frag.glsl?raw';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 48: Mandala Drive');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 100, 100);
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Audio ---
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const soundManager = new SoundManager(listener);

    soundManager.load([
        { name: 'collect', path: '/sounds/collect01.wav' },
        { name: 'event', path: '/sounds/collect.wav' }
    ]).catch(error => {
        console.warn("Could not load sounds.");
    });

    // --- Build Track from JSON ---
    const trackBuilder = new TrackBuilder();
    (trackData as TrackOperation[]).forEach(op => {
        trackBuilder.addOperation(op);
    });
    const trackPath = trackBuilder.build();
    const operations = trackBuilder.getOperations();

    // --- Controllers ---
    const playerController = new PlayerController();
    const cameraController = new ChaseCameraController(camera, playerController);
    const colorManager = new ColorManager();

    // Inject Custom Path into PathController
    const pathController = new PathController(trackPath);

    const ringController = new RingController(scene, pathController, colorManager);
    const orbController = new EnergyOrbController(scene, pathController, colorManager);

    // --- Gameplay Elements ---
    orbController.addOrbsSequence(0.0, 200, 0.005); // More orbs for longer track

    ringController.addRingAt(0.10, 'event');
    ringController.addRingAt(0.35, 'event');
    ringController.addRingAt(0.60, 'event');
    ringController.addRingAt(0.85, 'event');

    for (let i = 0; i < 1; i += 0.02) {
        if (i % 0.25 > 0.05) { // Avoid event rings
            ringController.addRingAt(i, 'collection');
        }
    }

    ringController.onRingCollected.on('collect', (data: { type: string, collectedCount: number }) => {
        if (data.type === 'event') {
            soundManager.play('event');
        } else {
            soundManager.play('collect', 0.5);
        }
    });

    orbController.onOrbCollected.on('collect', () => {
        soundManager.play('collect', 0.3);
    });

    const gui = new GUI();
    const params = {
        speed: 6.0,
        particleSize: 0.5,
        minParticleSize: 0.1,
        palette: 'NaranjaIxachi',
        // Flow Field
        noiseScale: 0.01,
        perturbStrength: 1.5,
        verticalSpeed: 0.4
    };

    scene.background.copy(colorManager.getColor('background'));

    // --- Road Visualization (Mesh Ribbon) ---
    // We use the mesh generation from Scene 46/47 instead of the lines from Scene 45
    const allPositions: number[] = [];
    const allNormals: number[] = [];
    const allUvs: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;
    const curves = trackPath.curves;
    const roadWidth = 12; // Slightly wider for gameplay

    const addSegmentMesh = (curve: THREE.Curve<THREE.Vector3>, op: TrackOperation) => {
        const divisions = Math.max(2, Math.floor(curve.getLength() / 2));
        const points = curve.getPoints(divisions);
        const frenetFrames = curve.computeFrenetFrames(divisions, false);
        const rollRad = THREE.MathUtils.DEG2RAD * (op.roll || 0);
        const halfWidth = roadWidth / 2;

        for (let i = 0; i <= divisions; i++) {
            const point = points[i];
            const tangent = frenetFrames.tangents[i];
            const normal = frenetFrames.normals[i];
            const binormal = frenetFrames.binormals[i];
            const axis = tangent.clone().normalize();
            const rotatedBinormal = binormal.clone().applyAxisAngle(axis, rollRad);
            const rotatedNormal = normal.clone().applyAxisAngle(axis, rollRad);
            const left = point.clone().add(rotatedBinormal.clone().multiplyScalar(-halfWidth));
            const right = point.clone().add(rotatedBinormal.clone().multiplyScalar(halfWidth));

            allPositions.push(left.x, left.y, left.z);
            allPositions.push(right.x, right.y, right.z);
            allNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
            allNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z); // Duplicate normal for flat shading look if needed
            const u = i / divisions;
            allUvs.push(0, u);
            allUvs.push(1, u);
            if (i < divisions) {
                const a = vertexOffset + i * 2;
                const b = vertexOffset + i * 2 + 1;
                const c = vertexOffset + (i + 1) * 2;
                const d = vertexOffset + (i + 1) * 2 + 1;
                allIndices.push(a, b, d);
                allIndices.push(a, d, c);
            }
        }
        vertexOffset += (divisions + 1) * 2;
    };

    for (let i = 0; i < curves.length; i++) {
        addSegmentMesh(curves[i], operations[i] || {});
    }

    if (allPositions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
        geometry.setIndex(allIndices);

        // Use a nice material
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222,
            emissive: 0x001133,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -0.2; // Lower slightly to avoid z-fighting with player ribbon
        scene.add(mesh);

        // Add wireframe overlay for tech look
        const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x0044aa, transparent: true, opacity: 0.3 }));
        wireframe.position.y = -0.19; // Slightly above the mesh
        scene.add(wireframe);

        // GUI for Track
        const trackFolder = gui.addFolder('Track Visuals');
        const trackParams = {
            showMesh: true,
            showWireframe: true,
            yOffset: -0.2
        };
        trackFolder.add(trackParams, 'showMesh').name('Show Road').onChange(v => mesh.visible = v);
        trackFolder.add(trackParams, 'showWireframe').name('Show Wireframe').onChange(v => wireframe.visible = v);
        trackFolder.add(trackParams, 'yOffset', -5, 5).name('Y Offset').onChange(v => {
            mesh.position.y = v;
            wireframe.position.y = v + 0.01;
        });
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);


    // =================================================================
    // --- LANDSCAPE PARTICLE SYSTEM (Simplified for this scene) ---
    // =================================================================
    const LANDSCAPE_WORLD_SIZE = 400; // Larger world
    const GRID_RESOLUTION = 64;
    const LANDSCAPE_AGENT_COUNT = GRID_RESOLUTION * GRID_RESOLUTION;
    const landscapeGpuCompute = new GPUComputationRenderer(GRID_RESOLUTION, GRID_RESOLUTION, renderer);
    landscapeGpuCompute.dataType = THREE.HalfFloatType;
    const flowFieldCompute = new GPUComputationRenderer(256, 256, renderer);
    flowFieldCompute.dataType = THREE.HalfFloatType;

    const flowFieldTexture = flowFieldCompute.createTexture();
    const flowFieldVariable = flowFieldCompute.addVariable('textureFlowField', flowFieldShader, flowFieldTexture);
    flowFieldCompute.init();

    const ffUniforms = flowFieldVariable.material.uniforms;
    ffUniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    ffUniforms['u_time'] = new THREE.Uniform(0.0);
    ffUniforms['u_noiseScale'] = new THREE.Uniform(params.noiseScale);
    ffUniforms['u_perturbStrength'] = new THREE.Uniform(params.perturbStrength);
    ffUniforms['verticalSpeed'] = new THREE.Uniform(params.verticalSpeed);

    const flowFieldResult = flowFieldCompute.getCurrentRenderTarget(flowFieldVariable).texture;

    const landscapePosData = landscapeGpuCompute.createTexture();
    const landscapePosArray = landscapePosData.image.data;
    const spacing = LANDSCAPE_WORLD_SIZE / (GRID_RESOLUTION - 1);
    const halfSize = LANDSCAPE_WORLD_SIZE / 2;

    for (let row = 0; row < GRID_RESOLUTION; row++) {
        for (let col = 0; col < GRID_RESOLUTION; col++) {
            const i = row * GRID_RESOLUTION + col;
            const i4 = i * 4;
            landscapePosArray[i4 + 0] = col * spacing - halfSize;
            landscapePosArray[i4 + 1] = 0; // Start flat
            landscapePosArray[i4 + 2] = row * spacing - halfSize;
            landscapePosArray[i4 + 3] = 1.0;
        }
    }
    landscapePosData.needsUpdate = true;
    const landscapeAgentPositionVariable = landscapeGpuCompute.addVariable('texturePosition', terrainHeightShader, landscapePosData);
    landscapeGpuCompute.setVariableDependencies(landscapeAgentPositionVariable, [landscapeAgentPositionVariable]);

    const posUniforms = landscapeAgentPositionVariable.material.uniforms;
    posUniforms['delta'] = new THREE.Uniform(0.0);
    posUniforms['time'] = new THREE.Uniform(0.0);
    posUniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    posUniforms['textureFlowField'] = new THREE.Uniform(flowFieldResult);

    // Match Scene 45 defaults
    posUniforms['u_heightScale'] = new THREE.Uniform(0.03);
    posUniforms['u_lerpFactor'] = new THREE.Uniform(2.0);
    posUniforms['u_yOffset'] = new THREE.Uniform(-10.0);

    landscapeGpuCompute.init();

    // Landscape Visuals
    const landscapeParticleGeometry = new THREE.BufferGeometry();
    const landscapeParticleUvs = new Float32Array(LANDSCAPE_AGENT_COUNT * 2);
    const landscapeParticlePositions = new Float32Array(LANDSCAPE_AGENT_COUNT * 3);

    for (let row = 0; row < GRID_RESOLUTION; row++) {
        for (let col = 0; col < GRID_RESOLUTION; col++) {
            const i = row * GRID_RESOLUTION + col;
            const i2 = i * 2;
            const i3 = i * 3;
            landscapeParticleUvs[i2 + 0] = (col + 0.5) / GRID_RESOLUTION;
            landscapeParticleUvs[i2 + 1] = (row + 0.5) / GRID_RESOLUTION;
            landscapeParticlePositions[i3 + 0] = col * spacing - halfSize;
            landscapeParticlePositions[i3 + 1] = 0;
            landscapeParticlePositions[i3 + 2] = row * spacing - halfSize;
        }
    }
    landscapeParticleGeometry.setAttribute('reference', new THREE.BufferAttribute(landscapeParticleUvs, 2));
    landscapeParticleGeometry.setAttribute('position', new THREE.BufferAttribute(landscapeParticlePositions, 3));

    const landscapeParticleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleRenderVertexShader,
        fragmentShader: particleRenderFragmentShader,
        uniforms: {
            texturePosition: { value: null },
            particleSize: { value: params.particleSize },
            cameraConstant: { value: window.innerHeight / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom) },
            u_terrainLow: { value: colorManager.getColor('terrainLow') },
            u_terrainMid: { value: colorManager.getColor('terrainMid') },
            u_terrainHigh: { value: colorManager.getColor('terrainHigh') },
            u_minHeight: { value: -50 },
            u_maxHeight: { value: 50 },
        },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const landscapeParticles = new THREE.Points(landscapeParticleGeometry, landscapeParticleMaterial);
    landscapeParticles.frustumCulled = false;
    scene.add(landscapeParticles);


    // =================================================================
    // --- PLAYER PARTICLE SYSTEM ---
    // =================================================================
    const NUM_PLAYER_PARTICLES = 50;
    const playerParticleSystem = new GPUParticleSystem({
        numParticles: NUM_PLAYER_PARTICLES,
        renderer: renderer,
    });
    const playerRibbon = new RibbonLineGPUPlayer([], {
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
    playerRibbon.setMinHeadLength(0.8);
    scene.add(playerRibbon.mesh);
    const ribbonMaxWidth = 0.75;
    const ribbonMinWidth = 0.1;

    // --- RESTORE GUI FROM SCENE 45 ---
    const worldFolder = gui.addFolder('World');
    worldFolder.add(params, 'particleSize', 0, 1, 0.01).name('Particle Size');
    worldFolder.add(params, 'minParticleSize', 0, 1, 0.01).name('Min Particle Size');

    const colorFolder = gui.addFolder('Colors');
    colorFolder.add(params, 'palette', ['NaranjaIxachi', 'BosqueEncantado', 'FondoDelMar']).name('Color Palette').onChange((v: string) => {
        colorManager.setPalette(v);
    });

    const terrainFolder = gui.addFolder('Terrain Settings');
    terrainFolder.add(posUniforms.u_heightScale, 'value', 0, 50).name('Height Scale').onChange(() => {
        landscapeParticleMaterial.uniforms.u_minHeight.value = -posUniforms.u_heightScale.value + posUniforms.u_yOffset.value;
        landscapeParticleMaterial.uniforms.u_maxHeight.value = posUniforms.u_heightScale.value + posUniforms.u_yOffset.value;
    });
    terrainFolder.add(posUniforms.u_lerpFactor, 'value', 0.01, 5.0).name('Smoothness'); // Increased max for u_lerpFactor
    terrainFolder.add(posUniforms.u_yOffset, 'value', -100, 100).name('Y Offset').onChange(() => {
        landscapeParticleMaterial.uniforms.u_minHeight.value = -posUniforms.u_heightScale.value + posUniforms.u_yOffset.value;
        landscapeParticleMaterial.uniforms.u_maxHeight.value = posUniforms.u_heightScale.value + posUniforms.u_yOffset.value;
    });

    // New Flow Field Animation Controls
    const flowFolder = gui.addFolder('Flow Field Animation');
    flowFolder.add(params, 'noiseScale', 0.001, 0.1).name('Noise Scale').onChange(v => {
        ffUniforms['u_noiseScale'].value = v;
    });
    flowFolder.add(params, 'perturbStrength', 0, 5).name('Perturb Strength').onChange(v => {
        ffUniforms['u_perturbStrength'].value = v;
    });
    flowFolder.add(params, 'verticalSpeed', 0, 2).name('Vertical Speed').onChange(v => {
        ffUniforms['verticalSpeed'].value = v;
    });

    const ribbonFolder = gui.addFolder('Player Ribbon');
    ribbonFolder.addColor(playerRibbon.material.uniforms.uColor, 'value').name('Color Start');
    ribbonFolder.addColor(playerRibbon.material.uniforms.uColorEnd, 'value').name('Color End');
    ribbonFolder.add(playerRibbon.material.uniforms.uFadeTransitionSize, 'value', 0, 1, 0.01).name('Fade Size');
    ribbonFolder.add(playerRibbon.material.uniforms.uColorMix, 'value', 0, 1, 0.01).name('Color Mix');
    ribbonFolder.add(playerRibbon.material.uniforms.uTransitionSize, 'value', 0, 1, 0.01).name('Color Transition');

    colorManager.on('update', () => {
        scene.background.copy(colorManager.getColor('background'));
        landscapeParticleMaterial.uniforms.u_terrainLow.value.copy(colorManager.getColor('terrainLow'));
        landscapeParticleMaterial.uniforms.u_terrainMid.value.copy(colorManager.getColor('terrainMid'));
        landscapeParticleMaterial.uniforms.u_terrainHigh.value.copy(colorManager.getColor('terrainHigh'));
    });

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
        orbController.update(delta, time, playerController.position);

        // Terrain Updates
        ffUniforms['u_time'].value = time;
        flowFieldCompute.compute();
        posUniforms.delta.value = delta;
        posUniforms.time.value = time;
        landscapeGpuCompute.compute();
        landscapeParticleMaterial.uniforms.texturePosition.value = landscapeGpuCompute.getCurrentRenderTarget(landscapeAgentPositionVariable).texture;

        // Player Updates
        playerParticleSystem.update(delta, playerController.position, playerController.velocity);
        playerRibbon.setPathTexture(playerParticleSystem.getPositionTexture());

        const speedRatio = Math.min(Math.abs(playerController.speed) / playerController.maxSpeed, 1.0);
        const newWidth = THREE.MathUtils.lerp(ribbonMaxWidth, ribbonMinWidth, speedRatio);
        playerRibbon.setWidth(newWidth);

        const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(playerController.quaternion);
        if (playerController.velocity.lengthSq() > 0.01) {
            forwardDir.copy(playerController.velocity).normalize();
        }
        playerRibbon.setPlayerForward(forwardDir);
        playerRibbon.updateHead();
        playerRibbon.setTime(time);

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        landscapeParticleMaterial.uniforms.cameraConstant.value = window.innerHeight / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
    });

    // Cleanup
    return () => {
        gui.destroy();
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
    };
}
