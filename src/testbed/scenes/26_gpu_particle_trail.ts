import * as THREE from 'three';
import GUI from 'lil-gui';
import { PlayerController } from '../../controls/PlayerController';
import { ChaseCameraController } from '../../controls/ChaseCameraController';
import { GPUParticleSystem } from '../../core/GPUParticleSystem';
import { RibbonLineGPU, UseMode } from '../../core/RibbonLineGPU';
import { ColorManager } from '../../managers/ColorManager';
import { ParticleDebugger } from '../../debug/ParticleDebugger';

// This scene integrates the GPUParticleSystem to create a dynamic trail for the player.
// 1. PlayerController moves a virtual player.
// 2. GPUParticleSystem simulates particles, using the player's position as an emitter.
// 3. A RibbonLineGPU is used for rendering, but its path texture is dynamically updated
//    with the output from the particle simulation.
// 4. A ParticleDebugger is used to visualize the raw particle positions as a point cloud.

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 26: GPU Particle Trail');

    // --- Core Scene Components ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Lighting & Scenery ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- Player Visual Mesh (the cube) ---
    const playerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 3),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    scene.add(playerMesh);

    // --- Controllers & Systems --- 
    const playerController = new PlayerController();
    const cameraController = new ChaseCameraController(camera, playerController);
    const colorManager = new ColorManager();

    // --- GPU Particle System ---
    const NUM_PARTICLES = 1024;
    const particleSystem = new GPUParticleSystem({
        numParticles: NUM_PARTICLES,
        renderer: renderer,
    });

    // --- Ribbon for Rendering the Trail ---
    // We initialize it with a dummy path, as it will be immediately overridden.
    const dummyPoints = [new THREE.Vector3(), new THREE.Vector3(0,0,1)];
    const playerRibbon = new RibbonLineGPU(dummyPoints, {
        color: colorManager.getColor('accent'),
        width: 2.0,
        maxLength: NUM_PARTICLES,
        useMode: UseMode.Static, // We control visibility via the particle system
    });
    playerRibbon.setPathLength(NUM_PARTICLES);
    scene.add(playerRibbon.mesh);

    // --- Debugger ---
    const particleDebugger = new ParticleDebugger(particleSystem);
    scene.add(particleDebugger.points);


    // --- GUI ---
    const gui = new GUI();
    gui.add({ info: 'GPU Particle Trail' }, 'info');
    // Add folders for player and camera if needed for tweaking
    
    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {
        const deltaTime = clock.getDelta();
        
        // 1. Update controllers
        playerController.update(deltaTime);
        cameraController.update();

        // 2. Update the particle simulation
        particleSystem.update(deltaTime, playerController.position, playerController.velocity);

        // 3. Update the debugger to show the latest particle positions
        particleDebugger.update(particleSystem);

        // 4. Connect the particle system's output to the ribbon's input
        playerRibbon.setPathTexture(particleSystem.getPositionTexture());

        // 5. Sync visual mesh with controller state
        playerMesh.position.copy(playerController.position);
        playerMesh.quaternion.copy(playerController.quaternion);

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}
