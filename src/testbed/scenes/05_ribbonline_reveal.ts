import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import gsap from 'gsap';
import { RibbonLine, RibbonConfig, UseMode } from '../../core/RibbonLine';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 05: RibbonLine Reveal Mode');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.set(0, 0, 15);

    const controls = new OrbitControls(camera, renderer.domElement);
    const gui = new GUI();
    scene.add(new THREE.AxesHelper(5));
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Test Implementation ---

    // 1. Define the static path for the ribbon.
    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 20; i++) {
        pathPoints.push(new THREE.Vector3(
            i - 10, // x
            Math.sin(i * 0.5) * 4 - 2, // y
            0 // z
        ));
    }

    // 2. Configure and create the RibbonLine with UseMode.Reveal.
    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0xff55a3),
        width: 0.5,
        maxLength: pathPoints.length,
        useMode: UseMode.Reveal,
    };
    const ribbon = new RibbonLine(ribbonConfig);
    ribbon.setPoints(pathPoints);
    scene.add(ribbon.mesh);

    // 3. Set the initial progress to 0, so it starts hidden.
    ribbon.material.uniforms.uDrawProgress.value = 0.0;

    // 4. Setup GSAP animation and GUI.
    const animation = gsap.to(ribbon.material.uniforms.uDrawProgress, {
        value: 1.0,
        duration: 3,
        ease: 'power2.inOut',
        paused: true, // Start paused
        onComplete: () => console.log('Reveal animation complete!'),
    });

    const guiParams = {
        play: () => {
            animation.restart();
        },
        reverse: () => {
            animation.reverse();
        }
    };

    const folder = gui.addFolder('Reveal Control');
    folder.add(guiParams, 'play').name('▶️ Play/Restart');
    folder.add(guiParams, 'reverse').name('◀️ Reverse');
    folder.add(animation, 'duration', 1, 10).name('Duration');
    folder.add(animation, 'timeScale', 0.1, 2).name('Speed');

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
        ribbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });

    animate();
}
