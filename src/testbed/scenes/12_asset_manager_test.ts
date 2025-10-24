import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetManager } from '../../managers/AssetManager';
import { AnimationControlPanel } from '../../ui/AnimationControlPanel';

export function runScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const controls = new OrbitControls(camera, renderer.domElement);

    const init = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        camera.position.z = 5;

        // --- AssetManager and UI --- //
        const assetManager = new AssetManager();
        new AnimationControlPanel(assetManager);

        // Start loading assets
        assetManager.loadAll();

        // --- Scene Content --- //
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        window.addEventListener('resize', onWindowResize, false);
    };

    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
        requestAnimationFrame(animate);

        controls.update();
        renderer.render(scene, camera);
    };

    init();
    animate();
}
