import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HarmonicPathGenerator } from '../../core/pathing/HarmonicPathGenerator';
import GUI from 'lil-gui';

export function runScene(app: { scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }) {
    const { scene, camera, renderer } = app;
    
    camera.position.set(0, 150, 0);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // 1. Instanciamos el "Cerebro"
    const pathGenerator = new HarmonicPathGenerator();
    let currentPoints: THREE.Points | null = null;

    // 2. Parámetros y Patrones
    const params = {
        spacing: 10,
        pointSize: 5.0,
        useOffset: true,
    };

    const patterns = {
        checkerboard: [
            [1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1],
        ],
        face: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        letter_I: [
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1],
        ],
        letter_X: [
            [1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 1, 0],
            [1, 0, 0, 0, 1],
        ]
    };

    function renderPattern(pattern: number[][]) {
        if (currentPoints) {
            scene.remove(currentPoints);
            currentPoints.geometry.dispose();
            (currentPoints.material as THREE.PointsMaterial).dispose();
        }

        const points: THREE.Vector3[] = [];
        // Adjust startFila/Columna to center the pattern
        const patternHeight = pattern.length;
        const patternWidth = pattern[0].length;
        const startFilaOffset = -Math.floor(patternHeight / 2);
        const startColumnaOffset = -Math.floor(patternWidth / 2);

        for (let fila = 0; fila < patternHeight; fila++) {
            for (let columna = 0; columna < patternWidth; columna++) {
                if (pattern[fila][columna] === 1) {
                    const pos = pathGenerator.getGridPosition(
                        fila + startFilaOffset, 
                        columna + startColumnaOffset, 
                        params.spacing, 
                        params.useOffset
                    );
                    points.push(pos);
                }
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.PointsMaterial({ 
            color: 0x00ffff, 
            size: params.pointSize,
            transparent: true,
            opacity: 1.0
        });
        currentPoints = new THREE.Points(geometry, material);
        scene.add(currentPoints);
    }

    // --- GUI ---
    const gui = new GUI();
    
    const gridFolder = gui.addFolder('Grid Pattern Renderer');
    gridFolder.add(params, 'spacing', 1, 20, 1).name('Espaciado').onChange(() => renderPattern(patterns.checkerboard));
    gridFolder.add(params, 'pointSize', 1, 10, 0.5).name('Tamaño de Punto').onChange(() => {
        if (currentPoints) {
            (currentPoints.material as THREE.PointsMaterial).size = params.pointSize;
        }
    });
    gridFolder.add(params, 'useOffset').name('Usar Desfase (1/2)').onChange(() => renderPattern(patterns.checkerboard));

    const patternFolder = gui.addFolder('Patrones Estáticos');
    patternFolder.add({ renderCheckerboard: () => renderPattern(patterns.checkerboard) }, 'renderCheckerboard').name('Damero');
    patternFolder.add({ renderFace: () => renderPattern(patterns.face) }, 'renderFace').name('Cara');
    patternFolder.add({ renderLetterI: () => renderPattern(patterns.letter_I) }, 'renderLetterI').name('Letra I');
    patternFolder.add({ renderLetterX: () => renderPattern(patterns.letter_X) }, 'renderLetterX').name('Letra X');
    
    // Renderizamos un patrón inicial
    renderPattern(patterns.checkerboard);
    
    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
    
    // Limpieza
    return () => {
        gui.destroy();
        if (currentPoints) {
            scene.remove(currentPoints);
            currentPoints.geometry.dispose();
            (currentPoints.material as THREE.PointsMaterial).dispose();
        }
    };
}