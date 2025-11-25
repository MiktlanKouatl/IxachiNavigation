
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

// We will create all these shaders from scratch.
// The '?raw' import syntax is from Vite and loads the file as a string.
import flowFieldShader from '../../shaders/flow_field_perlin_compute.glsl?raw';
import terrainHeightShader from '../../shaders/terrain_height_compute.glsl?raw';
import particleRenderVertexShader from '../../shaders/particle_render.vert.glsl?raw';
import particleRenderFragmentShader from '../../shaders/particle_render.frag.glsl?raw';
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
    const orbController = new EnergyOrbController(scene, pathController, colorManager);

    // Agregamos una línea de 100 orbes a lo largo de todo el camino
    orbController.addOrbsSequence(0.0, 100, 0.01);


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

    orbController.onOrbCollected.on('collect', () => {
        soundManager.play('collect', 0.5);
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
    // scene.add(leftRoadLine, rightRoadLine);

    const cameraPathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const cameraPathMaterial = new THREE.LineDashedMaterial({ color: 0xff0000, dashSize: 1, gapSize: 0.5 });
    const cameraPathObject = new THREE.Line(cameraPathGeometry, cameraPathMaterial);
    cameraPathObject.computeLineDistances();
    // scene.add(cameraPathObject);

    // =================================================================
    // --- LANDSCAPE PARTICLE SYSTEM (MODIFICADO PARA TERRENO) ---
    // =================================================================
    const LANDSCAPE_WORLD_SIZE = 240;
    // Definimos la resolución del grid (ej. 128x128 puntos)
    const GRID_RESOLUTION = 128; 
    const LANDSCAPE_AGENT_COUNT = GRID_RESOLUTION * GRID_RESOLUTION;
    const LANDSCAPE_AGENT_TEXTURE_WIDTH = GRID_RESOLUTION;
    const LANDSCAPE_AGENT_TEXTURE_HEIGHT = GRID_RESOLUTION;
    const landscapeGpuCompute = new GPUComputationRenderer(LANDSCAPE_AGENT_TEXTURE_WIDTH, LANDSCAPE_AGENT_TEXTURE_HEIGHT, renderer);
    // --- NUEVO: Usar HalfFloat siempre si sigues viendo bloques ---
    landscapeGpuCompute.dataType = THREE.HalfFloatType;
    // AHORA: Más resolución para suavizar el terreno
    const flowFieldCompute = new GPUComputationRenderer(512, 512, renderer);
    // --- NUEVO: Usar HalfFloat aquí es CRÍTICO para el ruido suave ---
    flowFieldCompute.dataType = THREE.HalfFloatType;

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
    // Ya no necesitamos landscapeVelData porque las partículas no tendrán velocidad propia.

    const landscapePosArray = landscapePosData.image.data;
    
    // Calculamos el espaciado entre puntos del grid
    const spacing = LANDSCAPE_WORLD_SIZE / (GRID_RESOLUTION - 1);
    const halfSize = LANDSCAPE_WORLD_SIZE / 2;

    // CONSTRUCCIÓN ORDENADA: Iterar por FILAS (como se hace en la geometría)
    for (let row = 0; row < GRID_RESOLUTION; row++) {
        for (let col = 0; col < GRID_RESOLUTION; col++) {
            // Índice lineal: row * width + col
            const i = row * GRID_RESOLUTION + col;
            const i4 = i * 4;

            // Posición en el grid (centrada en 0,0)
            landscapePosArray[i4 + 0] = col * spacing - halfSize; // x
            landscapePosArray[i4 + 1] = 0;                        // y (altura inicial)
            landscapePosArray[i4 + 2] = row * spacing - halfSize; // z
            landscapePosArray[i4 + 3] = 1.0;                      // w (no usado por ahora)
        }
    }

    // Marcar que la textura fue actualizada
    landscapePosData.needsUpdate = true;

    // Solo necesitamos una variable: la posición, controlada por nuestro nuevo shader de altura.
    const landscapeAgentPositionVariable = landscapeGpuCompute.addVariable('texturePosition', terrainHeightShader, landscapePosData);

    // La única dependencia es ella misma (para leer la posición anterior y hacer el lerp)
    landscapeGpuCompute.setVariableDependencies(landscapeAgentPositionVariable, [landscapeAgentPositionVariable]);

    // --- Set terrain height shader uniforms ---
    const posUniforms = landscapeAgentPositionVariable.material.uniforms;
    posUniforms['delta'] = new THREE.Uniform(0.0);
    posUniforms['time'] = new THREE.Uniform(0.0);
    posUniforms['worldSize'] = new THREE.Uniform(LANDSCAPE_WORLD_SIZE);
    
    // ¡IMPORTANTE! Pasamos el campo de flujo como input
    posUniforms['textureFlowField'] = new THREE.Uniform(flowFieldResult);
    
    // Nuevos parámetros para controlar el terreno
    posUniforms['u_heightScale'] = new THREE.Uniform(0.03); // Altura máxima
    posUniforms['u_lerpFactor'] = new THREE.Uniform(2.0);   // Suavidad (0 a 1) - aumentado para más suavidad
    posUniforms['u_yOffset'] = new THREE.Uniform(-9.0);     // Nuevo uniform para el offset en Y
    
    const landscapeAgentError = landscapeGpuCompute.init();
    if (landscapeAgentError !== null) { console.error('Landscape GPGPU Error: ' + landscapeAgentError); }

    // --- CORRECCIÓN DE FILTROS ROBUSTA ---

    // 1. Suavizar el RUIDO (FlowField) -> ESTO ELIMINA LOS BLOQUES
    flowFieldVariable.renderTargets.forEach(rt => {
        rt.texture.minFilter = THREE.LinearFilter;
        rt.texture.magFilter = THREE.LinearFilter;
        rt.texture.type = THREE.HalfFloatType; // Aseguramos el tipo
        rt.texture.needsUpdate = true;
    });

    // 2. Posiciones de partículas -> MANTENER NEAREST
    // (Si suavizas esto, el grid se desmorona, así que déjalo en Nearest)
    landscapeAgentPositionVariable.renderTargets.forEach(rt => {
        rt.texture.minFilter = THREE.NearestFilter;
        rt.texture.magFilter = THREE.NearestFilter;
        rt.texture.type = THREE.HalfFloatType; // Aseguramos el tipo
        rt.texture.needsUpdate = true;
    });

    // --- 3. Landscape Visualization ---
    const landscapeParticleGeometry = new THREE.BufferGeometry();
    const landscapeParticleUvs = new Float32Array(LANDSCAPE_AGENT_COUNT * 2);
    const landscapeParticlePositions = new Float32Array(LANDSCAPE_AGENT_COUNT * 3);

    // CONSTRUCCIÓN ORDENADA: Iterar por FILAS (MISMO ORDEN QUE LA TEXTURA GPU)
    for (let row = 0; row < GRID_RESOLUTION; row++) {
        for (let col = 0; col < GRID_RESOLUTION; col++) {
            // Índice lineal: row * width + col (COINCIDE CON LA TEXTURA)
            const i = row * GRID_RESOLUTION + col;
            const i2 = i * 2;
            const i3 = i * 3;
            
            // UVs: muestrear desde el CENTRO del píxel
            // En texturas GPU de GRID_RESOLUTION x GRID_RESOLUTION:
            // Cada pixel ocupa 1/GRID_RESOLUTION del espacio
            landscapeParticleUvs[i2 + 0] = (col + 0.5) / GRID_RESOLUTION;
            landscapeParticleUvs[i2 + 1] = (row + 0.5) / GRID_RESOLUTION;
            
            // Posiciones iniciales en el grid
            landscapeParticlePositions[i3 + 0] = col * spacing - halfSize;  // X
            landscapeParticlePositions[i3 + 1] = 0;                         // Y (será actualizado por GPU)
            landscapeParticlePositions[i3 + 2] = row * spacing - halfSize;  // Z
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
    // Establecer una longitud mínima de cabeza (ajustar a gusto visual)
    playerRibbon.setMinHeadLength(0.8); 
    scene.add(playerRibbon.mesh);
    const ribbonMaxWidth = 0.75;
    const ribbonMinWidth = 0.1;



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

        ffUniforms['u_time'].value = time;
        flowFieldCompute.compute();

        posUniforms.delta.value = delta;
        posUniforms.time.value = time;
        landscapeGpuCompute.compute();
        landscapeParticleMaterial.uniforms.texturePosition.value = landscapeGpuCompute.getCurrentRenderTarget(landscapeAgentPositionVariable).texture;
        playerParticleSystem.update(delta, playerController.position, playerController.velocity);
        playerRibbon.setPathTexture(playerParticleSystem.getPositionTexture());

        const speedRatio = Math.min(Math.abs(playerController.speed) / playerController.maxSpeed, 1.0);
        const newWidth = THREE.MathUtils.lerp(ribbonMaxWidth, ribbonMinWidth, speedRatio);
        playerRibbon.setWidth(newWidth);
        const newParticleSize = THREE.MathUtils.lerp(params.particleSize, params.minParticleSize, speedRatio);
        landscapeParticleMaterial.uniforms.particleSize.value = newParticleSize;

        // Lógica de Inyección de Intención
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
    worldFolder.add(params, 'particleSize', 0, 1, 0.01).name('Particle Size');
    worldFolder.add(params, 'minParticleSize', 0, 1, 0.01).name('Min Particle Size');

    const colorFolder = gui.addFolder('Colors');
    colorFolder.addColor(landscapeParticleMaterial.uniforms.particleColor, 'value').name('Particle Color');
    colorFolder.add(params, 'palette', ['NaranjaIxachi', 'BosqueEncantado']).name('Color Palette').onChange((v: string) => {
        colorManager.setPalette(v);
    });

    const terrainFolder = gui.addFolder('Terrain Settings');
    terrainFolder.add(posUniforms.u_heightScale, 'value', 0, 50).name('Height Scale');
    terrainFolder.add(posUniforms.u_lerpFactor, 'value', 0.01, 1.0).name('Smoothness');
    terrainFolder.add(posUniforms.u_yOffset, 'value', -100, 100).name('Y Offset');

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