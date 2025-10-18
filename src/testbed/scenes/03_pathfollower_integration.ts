import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { RibbonLine, RibbonConfig, UseMode } from '../../core/RibbonLine';
import { PathData } from '../../core/pathing/PathData';
import { PathFollower } from '../../core/pathing/PathFollower';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 03: PathFollower Integration');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.set(0, 5, 15);

    const controls = new OrbitControls(camera, renderer.domElement);
    const gui = new GUI();
    scene.add(new THREE.AxesHelper(5));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // --- Test Setup ---

    // 1. Create the PathData (the "blueprint" for the path)
    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        pathPoints.push(new THREE.Vector3(
            Math.cos(angle) * 10,
            Math.sin(angle * 2) * 2,
            Math.sin(angle) * 10
        ));
    }
    const pathData = new PathData(pathPoints, true); // true for closed loop

    // Optional: Visualize the path for debugging
    const pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathData.curve.getPoints(100)), new THREE.LineBasicMaterial({ color: 0x444444 }));
    scene.add(pathLine);

    // 2. Create the PathFollower
    const follower = new PathFollower(pathData, { speed: 5.0 });

    // 3. Create the RibbonLine that will be drawn by the follower
    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0x00ffaa),
        width: 0.3,
        maxLength: 200, // Max length of the trail
        useMode: UseMode.Trail, // Use Trail mode
    };
    const ribbon = new RibbonLine(ribbonConfig);
    scene.add(ribbon.mesh);

    // 4. Create an array to store the points of the trail
    const trailPoints: THREE.Vector3[] = [];

    // --- GUI ---
    const guiParams = {
        speed: follower.getSpeed(),
        trailLength: ribbon.getMaxPoints(),
    };
    const folder = gui.addFolder('PathFollower Control');
    folder.add(guiParams, 'speed', 0.1, 20).name('Speed').onChange(speed => {
        follower.setSpeed(speed);
    });
    folder.add(guiParams, 'trailLength', 10, ribbon.getMaxPoints()).name('Trail Length');

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();

        // Update the follower's position along the path
        follower.update(deltaTime);

        // Add the follower's new position to our trail
        trailPoints.push(follower.position.clone());

        // If the trail is too long, remove the oldest point
        while (trailPoints.length > guiParams.trailLength) {
            trailPoints.shift();
        }

        // Update the ribbon with the new set of points
        ribbon.setPoints(trailPoints);

        controls.update();
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}
