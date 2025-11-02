import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { RibbonLineGPU, UseMode } from '../../core/RibbonLineGPU'; // Import UseMode
import { RibbonConfig } from '../../core/RibbonLine';
import { PathData } from '../../core/pathing/PathData';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 04: RibbonLineGPU Trail');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.set(0, 5, 20);

    const controls = new OrbitControls(camera, renderer.domElement);
    const gui = new GUI();
    scene.add(new THREE.AxesHelper(5));
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Test Implementation ---

    // 1. Define the path that the GPU ribbon will follow.
    const pathPoints: THREE.Vector3[] = [];
    const pathRadius = 10;
    for (let i = 0; i <= 200; i++) {
        const angle = (i / 200) * Math.PI * 2;
        pathPoints.push(new THREE.Vector3(
            Math.cos(angle) * pathRadius,
            Math.sin(angle * 3) * 1.5, // A more interesting shape
            Math.sin(angle) * pathRadius
        ));
    }
    const pathData = new PathData(pathPoints, true);

    // Optional: Visualize the path for debugging
    const pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathData.curve.getPoints(200)), new THREE.LineBasicMaterial({ color: 0x444444 }));
    scene.add(pathLine);

    // 2. Configure and create the RibbonLineGPU instance.
    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0xffCC00),
        colorEnd: new THREE.Color(0xff0000),
        transitionSize: 0.0,
        width: 0.4,
        maxLength: pathPoints.length, // maxLength should match the path points for the GPU version

        useMode: UseMode.Trail, // Explicitly set to Trail mode
    };
    const gpuRibbon = new RibbonLineGPU(pathPoints, ribbonConfig);
    scene.add(gpuRibbon.mesh);

    // 3. Setup GUI for interactive control.
    const guiParams = {
        speed: 0.1,
        trailLength: 0.25,
        width: ribbonConfig.width,
        color: ribbonConfig.color.getHex(),
    };

    const folder = gui.addFolder('GPU Trail Control');
    folder.add(guiParams, 'speed', 0.01, 1.0, 0.01).name('Speed');
    folder.add(guiParams, 'trailLength', 0.01, 1.0, 0.01).name('Trail Length');
    folder.add(guiParams, 'width', 0.1, 2.0).name('Width').onChange(w => {
        gpuRibbon.setWidth(w);
    });
    folder.addColor(guiParams, 'color').name('Color').onChange(c => {
        gpuRibbon.material.uniforms.uColor.value.set(c);
    });

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Calculate the progress along the path (0 to 1)
        const progress = (elapsedTime * guiParams.speed) % 1.0;

        // Update the GPU ribbon with the new progress and trail length
        gpuRibbon.setTrail(progress, guiParams.trailLength);

        controls.update();
        renderer.render(scene, camera);
    }

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        gpuRibbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });

    animate();
}
