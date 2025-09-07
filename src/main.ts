import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RibbonLine } from './core/RibbonLine';
import { PathGuide } from './core/PathGuide';
import { PathFollower } from './core/PathFollower';

// --- CONFIGURACIÓN BÁSICA DE LA ESCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Movimiento suave
controls.dampingFactor = 0.05;
const clock = new THREE.Clock(); // Necesitamos un reloj para un movimiento consistente.  

// --- CREACIÓN DE NUESTROS OBJETOS ---

const MAX_POINTS = 150; // Definimos la longitud máxima en una constante

const ribbon = new RibbonLine({
  color: new THREE.Color(0x00ffff),
  width: 0.5,
  maxLength: MAX_POINTS, // Le pasamos la longitud máxima
});
scene.add(ribbon.mesh);

// 2. Creamos nuestro guía que se moverá en un círculo de radio 8.
const pathGuide = new PathGuide(8, 1.5);

// 3. Creamos el seguidor que conectará el guía con el listón.
// Le decimos que la estela tendrá una longitud máxima de 150 puntos.
const follower = new PathFollower({
  pathGuide: pathGuide,
  ribbon: ribbon,
  maxLength: MAX_POINTS,
});

// --- BUCLE DE ANIMACIÓN ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta(); // Tiempo desde el último frame

  // 1. Actualizamos la posición del guía.
  pathGuide.update(deltaTime);

  // 2. El seguidor actualiza la estela basándose en la nueva posición del guía.
  follower.update();
  
  controls.update();
  renderer.render(scene, camera);
}

animate();

// --- MANEJO DE REDIMENSIONAMIENTO ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});