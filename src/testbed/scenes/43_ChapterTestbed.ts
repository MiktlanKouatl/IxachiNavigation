import * as THREE from 'three';
import { PlayerController } from '../../controls/PlayerController';
import { RibbonLine, RibbonConfig, UseMode, RenderMode, FadeStyle } from '../../core/RibbonLine';
import { ColorManager } from '../../managers/ColorManager';
import { ChaseCameraController } from '../../controls/ChaseCameraController';

/**
 * A testbed scene for a controllable player with a ribbon trail and a chase camera.
 */
export function runScene() {
    const container = document.getElementById('app');
    if (!container) {
        console.error('Container element #app not found');
        return;
    }

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    const clock = new THREE.Clock();

    scene.add(new THREE.AxesHelper(5));
    scene.add(new THREE.GridHelper(100, 100));

    // --- Player, Ribbon, and Camera Setup ---
    const playerController = new PlayerController();
    const chaseCamera = new ChaseCameraController(camera, playerController);
    const colorManager = new ColorManager(); // Use a color manager for consistent colors

    // This object represents the player in the scene
    const playerObject = new THREE.Object3D();
    scene.add(playerObject);

    // A small sphere to visualize the player's position
    const playerMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.5),
        new THREE.MeshBasicMaterial({ color: 'white' })
    );
    playerObject.add(playerMarker);


    const ribbonConfig: RibbonConfig = {
        color: colorManager.getColor('accent'),
        width: 1.5,
        maxLength: 400, // The number of points in the trail
        useMode: UseMode.Trail, // Use Trail mode for a dynamic ribbon
        fadeStyle: FadeStyle.FadeInOut,
        renderMode: RenderMode.Solid,
        fadeTransitionSize: 0.2
    };

    const ribbon = new RibbonLine(ribbonConfig);
    scene.add(ribbon.mesh);

    // --- Animation Loop ---
    const animate = () => {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();

        // 1. Update the player controller based on keyboard input
        playerController.update(deltaTime);

        // 2. Update the chase camera
        chaseCamera.update();

        // 3. Update the visual player object's position and rotation from the controller
        playerObject.position.copy(playerController.position);
        playerObject.quaternion.copy(playerController.quaternion);

        // 4. Add the player's current position to the ribbon trail
        ribbon.addPoint(playerObject.position);

        renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    const cleanup = () => {
        playerController.dispose();
        ribbon.dispose();
        renderer.dispose();
        // No need to dispose OrbitControls anymore
        if (container && renderer.domElement) {
            try {
                container.removeChild(renderer.domElement);
            }
            catch (e) {
                console.error('Could not remove renderer dom element', e)
            }
        }
    };
    
    // Re-assign the cleanup function to the Restart button that is part of the testbed
    const restartButton = document.getElementById('startButton');
    if (restartButton) {
        restartButton.onclick = () => {
            cleanup();
            runScene();
        }
    }

    return cleanup;
}