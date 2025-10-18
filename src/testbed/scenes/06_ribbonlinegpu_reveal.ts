import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import gsap from 'gsap';
import { RibbonLineGPU, UseMode } from '../../core/RibbonLineGPU'; // Import UseMode
import { RibbonConfig } from '../../core/RibbonLine';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 06: RibbonLineGPU Reveal Mode');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.set(0, 0, 20);

    const controls = new OrbitControls(camera, renderer.domElement);
    const gui = new GUI();
    scene.add(new THREE.AxesHelper(5));
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Test Implementation ---

    // 1. Define the static path for the ribbon.
    const pathPoints: THREE.Vector3[] = [];
    const pathRadius = 8;
    for (let i = 0; i <= 100; i++) {
        const angle = (i / 100) * Math.PI * 4; // Two loops
        pathPoints.push(new THREE.Vector3(
            Math.cos(angle) * pathRadius,
            Math.sin(angle * 1.5) * 3, // Lissajous figure,
            Math.sin(angle) * pathRadius
        ));
    }

    // 2. Configure and create the RibbonLineGPU.
    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0x8844ff),
        width: 0.3,
        maxLength: pathPoints.length,
        useMode: UseMode.Reveal, // Set the use mode explicitly
    };
    const gpuRibbon = new RibbonLineGPU(pathPoints, ribbonConfig);
    scene.add(gpuRibbon.mesh);

    // 3. Setup GSAP animation and GUI.
    const animation = gsap.to({ progress: 0 }, {
        progress: 1.0,
        duration: 4,
        ease: 'power2.inOut',
        paused: true,
        onUpdate: function() {
            gpuRibbon.setRevealProgress(this.progress());
        },
        onReverseComplete: function() {
            gpuRibbon.setRevealProgress(0);
        }
    });

    const guiParams = {
        play: () => animation.restart(),
        reverse: () => animation.reverse(),
    };

    const folder = gui.addFolder('GPU Reveal Control');
    folder.add(guiParams, 'play').name('▶️ Play/Restart');
    folder.add(guiParams, 'reverse').name('◀️ Reverse');
    folder.add(animation, 'duration', 1, 10).name('Duration');
    folder.add(animation, 'timeScale', 0.1, 2).name('Speed');
    folder.add(gpuRibbon.material.uniforms.uWidth, 'value', 0.1, 2.0).name('Width'); // Access directly for now
    const colorParam = { color: ribbonConfig.color.getHex() };
    folder.addColor(colorParam, 'color').name('Color').onChange(c => {
        gpuRibbon.material.uniforms.uColor.value.set(c);
    });

    // --- Animation Loop (only for controls) ---
    function animate() {
        requestAnimationFrame(animate);
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
