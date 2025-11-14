import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CreativeGrid } from '../../core/CreativeGrid';
import GUI from 'lil-gui';

export function runScene() {
    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('app')?.appendChild(renderer.domElement);

    camera.position.set(0, 80, 150); // Adjusted camera position
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // 1. Configurar la Grid (con nueva visión de "red dispersa")
    const params = {
        numLayers: 7,      // Menos capas por plano
        maxRadius: 80,     
        fibStartLayer: 3,   // Empezar con Fib(3) = 2 puntos
        pointSize: 1.5,
        color: new THREE.Color(0x00ffff),
        numPlanes: 10,      // ¡Nuestro nuevo cilindro!
        planeSpacing: 6.5,    // Espacio entre planos
    };
    
    let grid = new CreativeGrid({
        scene: scene,
        ...params
    });

    // 2. GUI para jugar con los parámetros
    const gui = new GUI();
    gui.add(params, 'numLayers', 5, 50, 1).name('Layers per Plane').onFinishChange(recreateGrid);
    gui.add(params, 'maxRadius', 50, 300, 1).name('Max Radius').onFinishChange(recreateGrid);
    gui.add(params, 'fibStartLayer', 2, 10, 1).name('Fib Start Layer').onFinishChange(recreateGrid);
    gui.add(params, 'numPlanes', 1, 100, 1).name('Num Planes').onFinishChange(recreateGrid);
    gui.add(params, 'planeSpacing', 1, 20, 0.5).name('Plane Spacing').onFinishChange(recreateGrid);
    gui.add(params, 'pointSize', 0.1, 10, 0.1).name('Point Size').onChange((v: number) => {
        grid.setPointSize(v);
    });

    function recreateGrid() {
        grid.dispose();
        grid = new CreativeGrid({
            scene: scene,
            ...params
        });
    }

    const clock = new THREE.Clock();
    
    const animate = () => {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        
        controls.update();
        
        grid.update(deltaTime); 

        renderer.render(scene, camera);
    };

    // --- Window Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}