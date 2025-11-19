import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HarmonicPathGenerator } from '../../core/pathing/HarmonicPathGenerator';
import GUI from 'lil-gui';

export function runScene(app: { scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }) {
    const { scene, camera, renderer } = app;
    
    camera.position.set(0, 200, 0);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // 1. Instanciamos el "Cerebro"
    const pathGenerator = new HarmonicPathGenerator();
    let currentPoints: THREE.Points | null = null;

    // 2. Parámetros y Patrones
    const params = {
        radius: 80,
        pointSize: 5.0,
        numRepeats: 12,
        spacing: 20, // Espaciado angular entre patrones
        totalAngularSteps: 1000, // Resolución de la circunferencia
        patternScale: 2.0, // Escala del patrón en el eje radial
    };

    // Definimos el patrón ">"
    const greaterThanPattern = [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];

    function renderRepeatingPattern() {
        if (currentPoints) {
            scene.remove(currentPoints);
            currentPoints.geometry.dispose();
            (currentPoints.material as THREE.PointsMaterial).dispose();
        }

        const points: THREE.Vector3[] = [];
        const patternHeight = greaterThanPattern.length;
        const patternWidth = greaterThanPattern[0].length;
        const totalStepsForPattern = patternWidth + params.spacing;

        for (let i = 0; i < params.numRepeats; i++) {
            const patternStartAngleStep = i * totalStepsForPattern;

            // Dibuja una instancia del patrón ">"
            for (let fila = 0; fila < patternHeight; fila++) {
                for (let col = 0; col < patternWidth; col++) {
                    if (greaterThanPattern[fila][col] === 1) {
                        const angleStep = patternStartAngleStep + col;
                        const angle = (angleStep / params.totalAngularSteps) * Math.PI * 2;
                        
                        // La 'fila' del patrón se traduce en una variación del radio
                        const radiusVariation = (fila - Math.floor(patternHeight / 2)) * params.patternScale;
                        const r = params.radius + radiusVariation;

                        const pos = pathGenerator.getPolarPosition(r, angle);
                        points.push(pos);
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.PointsMaterial({ 
            color: 0x00ffff, 
            size: params.pointSize,
            transparent: true,
        });
        currentPoints = new THREE.Points(geometry, material);
        scene.add(currentPoints);
    }

    // --- GUI ---
    const gui = new GUI();
    const polarFolder = gui.addFolder('Polar Pattern Renderer');
    polarFolder.add(params, 'radius', 20, 200, 1).name('Radio').onChange(renderRepeatingPattern);
    polarFolder.add(params, 'numRepeats', 1, 50, 1).name('Repeticiones').onChange(renderRepeatingPattern);
    polarFolder.add(params, 'spacing', 0, 100, 1).name('Espaciado').onChange(renderRepeatingPattern);
    polarFolder.add(params, 'patternScale', 0.5, 10, 0.1).name('Escala del Patrón').onChange(renderRepeatingPattern);
    polarFolder.add(params, 'pointSize', 1, 10, 0.5).name('Tamaño de Punto').onChange(() => {
        if (currentPoints) {
            (currentPoints.material as THREE.PointsMaterial).size = params.pointSize;
        }
    });
    
    // Renderizamos el patrón inicial
    renderRepeatingPattern();
    
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