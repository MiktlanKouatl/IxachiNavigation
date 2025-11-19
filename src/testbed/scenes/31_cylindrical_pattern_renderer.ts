import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HarmonicPathGenerator } from '../../core/pathing/HarmonicPathGenerator';
import GUI from 'lil-gui';

export function runScene(app: { scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }) {
    const { scene, camera, renderer } = app;
    
    camera.position.set(0, 0, 150); // Posición de cámara frontal para ver el cilindro
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // 1. Instanciamos el "Cerebro"
    const pathGenerator = new HarmonicPathGenerator();
    let currentPoints: THREE.Points | null = null;

    // 2. Parámetros y Patrones
    const params = {
        radius: 50,
        pointSize: 3.0,
        numRepeats: 8,
        spacing: 30, // Espaciado angular entre patrones
        totalAngularSteps: 1000, // Resolución de la circunferencia
        patternScale: 2.0, // Escala de altura del patrón
    };

    // Definimos el patrón ">"
    const greaterThanPattern = [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];

    function renderCylindricalPattern() {
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
                        
                        // La 'fila' del patrón ahora se mapea a la altura 'y'
                        const height = (fila - Math.floor(patternHeight / 2)) * params.patternScale;

                        const pos = pathGenerator.getCylindricalPosition(params.radius, angle, height);
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
    const cylinderFolder = gui.addFolder('Cylindrical Pattern Renderer');
    cylinderFolder.add(params, 'radius', 20, 200, 1).name('Radio Cilindro').onChange(renderCylindricalPattern);
    cylinderFolder.add(params, 'numRepeats', 1, 50, 1).name('Repeticiones').onChange(renderCylindricalPattern);
    cylinderFolder.add(params, 'spacing', 0, 100, 1).name('Espaciado').onChange(renderCylindricalPattern);
    cylinderFolder.add(params, 'patternScale', 0.5, 10, 0.1).name('Escala de Altura').onChange(renderCylindricalPattern);
    cylinderFolder.add(params, 'pointSize', 1, 10, 0.5).name('Tamaño de Punto').onChange(() => {
        if (currentPoints) {
            (currentPoints.material as THREE.PointsMaterial).size = params.pointSize;
        }
    });
    
    // Renderizamos el patrón inicial
    renderCylindricalPattern();
    
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