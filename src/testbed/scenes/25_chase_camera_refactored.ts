import * as THREE from 'three';
import GUI from 'lil-gui';
import { PlayerController } from '../../controls/PlayerController';
import { ChaseCameraController } from '../../controls/ChaseCameraController';

// This scene has been refactored to use the modular PlayerController and ChaseCameraController.
// All movement and camera logic is now encapsulated in those classes.
// This file is now only responsible for scene setup, instantiation, and the animation loop.

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 25: Chase Camera (Refactored)');

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

    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        starVertices.push(THREE.MathUtils.randFloatSpread(2000));
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 }));
    scene.add(stars);

    // --- Player Visual Mesh ---
    const playerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 3),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    scene.add(playerMesh);

    // --- Controllers ---
    const playerController = new PlayerController();
    const cameraController = new ChaseCameraController(camera, playerController);

    // --- GUI ---
    const gui = new GUI();
    const playerFolder = gui.addFolder('Player Settings');
    playerFolder.add(playerController, 'maxSpeed', 5, 100);
    playerFolder.add(playerController, 'maxPitchAngle', 0, Math.PI / 2).name('Max Pitch Angle');
    playerFolder.add(playerController, 'pitchCorrectionSpeed', 0, 5).name('Pitch Correction');

    const camFolder = gui.addFolder('Camera Settings');
    camFolder.add(cameraController.config, 'lookAhead', 1, 30);
    camFolder.add(cameraController.config, 'cameraDistance', 5, 30);
    camFolder.add(cameraController.config, 'cameraHeight', 1, 20);
    camFolder.add(cameraController.config, 'positionSmooth', 0.01, 0.2);
    camFolder.add(cameraController.config, 'lookAtSmooth', 0.01, 0.2);
    camFolder.add(cameraController.config, 'rotationSmooth', 0.01, 0.2);
    camFolder.add(cameraController.config, 'horizontalDriftFactor', 0, 2);
    
    const limitsFolder = camFolder.addFolder('Distance Catch-Up');
    limitsFolder.add(cameraController.config, 'minDistance', 1, 10);
    limitsFolder.add(cameraController.config, 'maxDistance', 10, 50);
    limitsFolder.add(cameraController.config, 'accelerationZone', 0.5, 1.0);
    limitsFolder.add(cameraController.config, 'maxCatchUpSmooth', 0.2, 1.0);
    limitsFolder.add(cameraController.config, 'maxCatchUpLookAtSmooth', 0.2, 1.0);
    limitsFolder.add(cameraController.config, 'maxCatchUpRotationSmooth', 0.2, 1.0);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {
        const deltaTime = clock.getDelta();
        
        // Update controllers
        playerController.update(deltaTime);
        cameraController.update();

        // Sync visual mesh with controller state
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
