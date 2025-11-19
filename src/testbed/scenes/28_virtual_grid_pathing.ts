import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HarmonicPathGenerator, GridDirection } from '../../core/pathing/HarmonicPathGenerator';
import { ProceduralRibbonLine } from '../../core/ProceduralRibbonLine';
import GUI from 'lil-gui';
import { PathData } from '../../core/pathing/PathData';
import gsap from 'gsap';

export function runScene(app: { scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }) {
    const { scene, camera, renderer } = app;
    
    camera.position.set(0, 150, 0);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // 1. Instanciamos el "Cerebro"
    const pathGenerator = new HarmonicPathGenerator();
    let ribbon: ProceduralRibbonLine | null = null;
    let revealAnimation: gsap.core.Tween | null = null;

    // 2. Parámetros y Patrones
    const params = {
        spacing: 10,
        numSteps: 20,
        useOffset: true,
        generateRight: () => generateNewPath('right'),
        generateUp: () => generateNewPath('up'),
        generateFibonacci: () => generateNewPath('fibonacci'),
    };

    const patterns: { [key: string]: GridDirection[] } = {
        zigzag: ['right', 'down', 'right', 'down', 'right', 'down', 'right', 'down'],
        square: ['right', 'right', 'down', 'down', 'left', 'left', 'up', 'up'],
        spiral: ['right', 'down', 'left', 'left', 'up', 'up', 'up', 'right', 'right', 'right']
    };

    function generateNewPath(type: 'right' | 'up' | 'fibonacci' | { pattern: GridDirection[] }) {
        if (ribbon) {
            ribbon.dispose();
            scene.remove(ribbon.mesh);
        }
        if (revealAnimation) {
            revealAnimation.kill();
        }

        let pathData: PathData;
        let ribbonColor = new THREE.Color(0x00ffff); // Default color

        if (type === 'fibonacci') {
            pathData = pathGenerator.generateFibonacciPath({
                numPoints: 500,
                radiusScale: 0.5,
            });
            ribbonColor.set(0xff00ff);
        } else if (typeof type === 'object' && type.pattern) {
            // Generación por Patrón
            pathData = pathGenerator.generatePatternPath({
                startFila: 0,
                startColumna: 0,
                pattern: type.pattern,
                spacing: params.spacing,
                useOffset: params.useOffset,
            });
            ribbonColor.set(0xffaa00); // Orange for patterns
        } else {
            // Generación por Dirección
            pathData = pathGenerator.generateGridPath({
                startFila: -10,
                startColumna: -10,
                direction: type,
                numSteps: params.numSteps,
                spacing: params.spacing,
                useOffset: params.useOffset,
            });
        }

        ribbon = new ProceduralRibbonLine(pathData, {
            color: ribbonColor,
            width: 0.5,
            maxLength: 512
        });

        scene.add(ribbon.mesh);

        revealAnimation = gsap.to({ progress: 0 }, {
            progress: 1.0,
            duration: 1.0,
            ease: 'power2.out',
            onUpdate: function() {
                ribbon?.setRevealWindow(0, this.progress());
            }
        });
    }

    // --- GUI ---
    const gui = new GUI();
    
    const gridFolder = gui.addFolder('Grid Virtual');
    gridFolder.add(params, 'spacing', 1, 20, 1);
    gridFolder.add(params, 'useOffset').name('Usar Desfase (1/2)');
    
    const lineFolder = gridFolder.addFolder('Líneas Rectas');
    lineFolder.add(params, 'numSteps', 5, 100, 1);
    lineFolder.add(params, 'generateRight').name('Generar (Derecha)');
    lineFolder.add(params, 'generateUp').name('Generar (Arriba)');

    const patternFolder = gridFolder.addFolder('Patrones');
    patternFolder.add({ drawZigzag: () => generateNewPath({ pattern: patterns.zigzag }) }, 'drawZigzag').name('Dibujar Zigzag');
    patternFolder.add({ drawSquare: () => generateNewPath({ pattern: patterns.square }) }, 'drawSquare').name('Dibujar Cuadrado');
    patternFolder.add({ drawSpiral: () => generateNewPath({ pattern: patterns.spiral }) }, 'drawSpiral').name('Dibujar "Espiral"');
    
    gui.add(params, 'generateFibonacci').name('Generar Girasol (Comparar)');
    
    // Generamos el primer camino
    generateNewPath('right');
    
    const clock = new THREE.Clock();
    
    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
    
    // Limpieza
    return () => {
        gui.destroy();
        if (ribbon) {
            ribbon.dispose();
            scene.remove(ribbon.mesh);
        }
        if (revealAnimation) {
            revealAnimation.kill();
        }
    };
}