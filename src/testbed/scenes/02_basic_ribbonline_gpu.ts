import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';
import { RibbonConfig, UseMode, RenderMode, FadeStyle } from '../../core/RibbonLine';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 02: Basic RibbonLineGPU');

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.z = 10;

    // --- Controls & Helpers ---
    const controls = new OrbitControls(camera, renderer.domElement);
    const gui = new GUI();
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // --- RibbonLineGPU Test Case ---
    console.log('🎨 Creating RibbonLineGPU');

    // 1. Define the path for the line (required for constructor)
    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
        pathPoints.push(new THREE.Vector3(
            i / 2 - 12.5, // x
            Math.sin(i * 0.4) * 3, // y
            Math.cos(i * 0.4) * 3  // z
        ));
    }

    // 2. Define the configuration for our line
    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0x00ffff),
        width: 0.25,
        maxLength: 50, // Must match the number of points in the path for this basic test
        useMode: UseMode.Static, // Explicitly set to Static mode
    };

    // 3. Create the RibbonLineGPU instance
    const gpuRibbon = new RibbonLineGPU(pathPoints, ribbonConfig);
    scene.add(gpuRibbon.mesh);

    // --- GUI Controls for the Test Case ---
    const folder = gui.addFolder('RibbonLine - GPU');
    folder.add(gpuRibbon.mesh, 'visible').name('Visible');
    
    const guiParams = {
        color: ribbonConfig.color.getHex(),
        width: ribbonConfig.width,
    };

    folder.addColor(guiParams, 'color').name('Color').onChange((value: number) => {
        gpuRibbon.material.uniforms.uColor.value.set(value);
    });

    folder.add(guiParams, 'width', 0.01, 2.0).name('Width').onChange((value: number) => {
        gpuRibbon.setWidth(value);
    });

    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();

        renderer.render(scene, camera);
    }

    // --- Window Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        gpuRibbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });

    animate();
}
