// Ruta: src/ixachi/main_experience.ts

import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneDirector } from './managers/SceneDirector';

// --- CONFIGURACIÓN DE LA ESCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

// --- EL DIRECTOR TOMA EL CONTROL ---
// 1. Creamos el director que orquestará toda la experiencia.
const director = new SceneDirector(scene, camera);

// 2. Iniciamos el proceso (mostrar loader, cargar assets, etc.).
director.init();


// --- BUCLE DE ANIMACIÓN PRINCIPAL ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // 3. En cada fotograma, simplemente le decimos al director que se actualice.
  // Él se encargará de actualizar los managers correspondientes según el estado actual.
  director.update(deltaTime, elapsedTime);

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