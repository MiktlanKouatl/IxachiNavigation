import * as THREE from 'three';
import { ScrollController } from '../shared/ScrollController';

export function runScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // Basic setup
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.z = 5;

    // Add a simple cube to see something
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // --- ScrollController Setup ---
    const scrollController = new ScrollController();

    scrollController.on('scroll', (controlledScroll: number) => {
        console.log(`Controlled Scroll: ${controlledScroll.toFixed(2)}`);
        // Example: move the cube based on scroll
        cube.position.y = controlledScroll * 0.01;
    });

    scrollController.on('rawScroll', (delta: number, targetScroll: number) => {
        // console.log(`Raw Scroll Delta: ${delta}, Target: ${targetScroll}`);
    });

    scrollController.connect();

    // Disconnect after 10 seconds for demonstration
    setTimeout(() => {
        scrollController.disconnect();
        console.log('📜 [ScrollController] Disconnected automatically after 10 seconds.');
    }, 10000);

    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    console.log('🧪 [Testbed] 13_scroll_test loaded.');
}