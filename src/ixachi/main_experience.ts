// src/ixachi/main_experience.ts
import './style.css'; // Reutilizamos los estilos base
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Importamos los componentes de nuestro motor cinemático
import { RibbonLine, RibbonConfig, RenderMode, FadeStyle } from './core/RibbonLine';
import { TrailController } from './strategies/TrailController';
import { IMotionSource } from './core/IMotionSource';

// --- CONFIGURACIÓN DE LA ESCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Fondo totalmente oscuro para el microcosmos

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5); // Empezamos ligeramente detrás del centro

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement); // Mantener controles para depuración
const clock = new THREE.Clock();

// --- GESTOR DE ACTIVOS (Assets) ---
// Es una buena práctica tener un loader central
const gltfLoader = new GLTFLoader();
let eyeModel: THREE.Group;

// --- EL PROTAGONISTA: LA CHISPA DE LUZ ---
// Para crear un punto que no se mueve, creamos una MotionSource estática.
const staticSource: IMotionSource = {
    position: new THREE.Vector3(0, 0, 0),
    update: () => {} // No hace nada
};

// Configuramos la RibbonLine para que parezca una partícula brillante
const particleConfig: RibbonConfig = {
    color: new THREE.Color(0xffffff),
    width: 0.65, // Un ancho generoso para que sea visible
    maxLength: 3, // Longitud mínima para formar un punto
    renderMode: RenderMode.Solid,
    fadeStyle: FadeStyle.None,
    fadeTransitionSize: 0.0 // El fade abarca toda la "línea"
};

const particleLine = new RibbonLine(particleConfig);
scene.add(particleLine.mesh);

// --- CAMBIO CLAVE: Inicialización Directa ---
// En lugar de un controlador, creamos un segmento de línea diminuto pero visible.
// Esto le da al shader dos puntos DISTINTOS para trabajar.
const particlePoints = [
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(0, 0.1, 0)
];
particleLine.setPoints(particlePoints);

// --- FUNCIÓN DE INICIALIZACIÓN ASÍNCRONA ---
async function initializeScene() {
    try {
        // Cargamos el modelo del ojo que has creado
        const gltf = await gltfLoader.loadAsync('/ixachiLogo_ixtioli.glb'); // Asegúrate de que tu archivo se llame 'ojo.glb' y esté en la carpeta /public
        eyeModel = gltf.scene;
        eyeModel.visible = false; // Lo mantenemos invisible por ahora
        scene.add(eyeModel);
        console.log('✅ [Main] Modelo del ojo cargado.');

        // Una vez cargado, iniciamos la animación
        animate();
    } catch (error) {
        console.error('❌ [Main] Error al cargar los activos:', error);
    }
}

// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

        // Ya no necesitamos actualizar un controlador, solo la línea para el pulso.
    particleLine.update(elapsedTime);

    controls.update();
    renderer.render(scene, camera);
}

// --- INICIO ---
initializeScene();


// --- MANEJO DE REDIMENSIONAMIENTO (sin cambios) ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    particleLine.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});