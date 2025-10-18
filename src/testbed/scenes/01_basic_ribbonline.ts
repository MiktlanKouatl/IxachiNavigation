import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { RibbonLine, RibbonConfig, UseMode } from '../../core/RibbonLine';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 01: Basic RibbonLine');

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

    // --- RibbonLine Test Case 1: Static Path ---
    console.log('🎨 Creating RibbonLine for Test Case 1: Static Path');

    // 1. Define the configuration for our line
    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0xff00ff),
        width: 0.2,
        maxLength: 50, // Max points this line can have
        useMode: UseMode.Static,
    };

    // 2. Create the RibbonLine instance
    const staticRibbon = new RibbonLine(ribbonConfig);
    scene.add(staticRibbon.mesh);

    // 3. Define the path for the line
    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 20; i++) {
        pathPoints.push(new THREE.Vector3(
            i - 10, // x
            Math.sin(i * 0.5) * 2, // y
            0 // z
        ));
    }

    // 4. Set the points to the ribbon
    staticRibbon.setPoints(pathPoints);

    // --- GUI Controls for the Test Case ---
    const folder = gui.addFolder('RibbonLine - Static');
    folder.add(staticRibbon.mesh, 'visible').name('Visible');
    folder.add(staticRibbon, 'setWidth', 0.01, 1.0).name('Width');
    const guiParams = { color: ribbonConfig.color.getHex() };
    folder.addColor(guiParams, 'color').name('Color').onChange((value: number) => {
        staticRibbon.material.uniforms.uColor.value.set(value);
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
    });

    animate();
}
