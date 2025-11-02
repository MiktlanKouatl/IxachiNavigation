import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 18: Bloom Effect Test');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping; // Important for bloom
    document.body.appendChild(renderer.domElement);
    camera.position.set(0, 2, 15);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    // --- Glowing Objects ---
    const geometry = new THREE.TorusKnotGeometry(2, 0.5, 100, 16);
    
    const glowingMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const glowingObject = new THREE.Mesh(geometry, glowingMaterial);
    glowingObject.position.set(-5, 0, 0);
    scene.add(glowingObject);

    const glowingMaterial2 = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const glowingObject2 = new THREE.Mesh(geometry, glowingMaterial2);
    glowingObject2.position.set(5, 0, 0);
    scene.add(glowingObject2);

    // --- Non-Glowing Object ---
    const nonGlowingMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
    const nonGlowingObject = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), nonGlowingMaterial);
    nonGlowingObject.position.set(0, -5, 0);
    scene.add(nonGlowingObject);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // --- Post-processing (Bloom) ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- GUI ---
    const gui = new GUI();
    const bloomParams = {
        threshold: 0.85,
        strength: 1.5,
        radius: 0.4,
    };

    gui.add(bloomParams, 'threshold', 0.0, 1.0).onChange((value) => { bloomPass.threshold = value; });
    gui.add(bloomParams, 'strength', 0.0, 3.0).onChange((value) => { bloomPass.strength = value; });
    gui.add(bloomParams, 'radius', 0.0, 1.0).onChange((value) => { bloomPass.radius = value; });

    // --- Animation Loop ---
    function animate(time: number) {
        requestAnimationFrame(animate);
        const t = time * 0.001;
        glowingObject.rotation.y = t;
        glowingObject2.rotation.y = -t;

        // Use composer to render instead of the renderer directly
        composer.render();
    }

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
    });

    animate(0);
}
