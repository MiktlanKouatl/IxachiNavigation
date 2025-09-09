import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RibbonLine, FadeStyle } from './core/RibbonLine';
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

// --- CREACIÓN DE NUESTROS OBJETOS ---

const MAX_POINTS = 150;
const ribbons: RibbonLine[] = []; // Array para guardar las ribbons y actualizar sus uniforms
const followers: PathFollower[] = []; // Array para actualizar todos los followers

// 👇 CAMBIO: Creamos tres líneas con diferentes estilos.

// LÍNEA 1: Sin desvanecimiento (Sólida)
const ribbon1 = new RibbonLine({
  color: new THREE.Color(0xff00ff), // Magenta
  width: 3.5,
  maxLength: MAX_POINTS,
  fadeStyle: FadeStyle.None,
});
scene.add(ribbon1.mesh);
const guide1 = new PathGuide(8, 1.5);
const follower1 = new PathFollower({
  pathGuide: guide1,
  ribbon: ribbon1,
  maxLength: MAX_POINTS,
});
ribbons.push(ribbon1);
followers.push(follower1);

// LÍNEA 2: Desvanecimiento en la cola (FadeIn)
const ribbon2 = new RibbonLine({
  color: new THREE.Color(0x00ffff), // Cyan
  width: 3.5,
  maxLength: MAX_POINTS,
  fadeStyle: FadeStyle.FadeIn,
});
scene.add(ribbon2.mesh);
const guide2 = new PathGuide(10, 1.2);
const follower2 = new PathFollower({
  pathGuide: guide2,
  ribbon: ribbon2,
  maxLength: MAX_POINTS,
});
ribbons.push(ribbon2);
followers.push(follower2);

// LÍNEA 3: Desvanecimiento en cola y cabeza (FadeInOut)
const ribbon3 = new RibbonLine({
  color: new THREE.Color(0xffff00), // Amarillo
  width: 3.5,
  maxLength: MAX_POINTS,
  fadeStyle: FadeStyle.FadeOut,
});
scene.add(ribbon3.mesh);
const guide3 = new PathGuide(12, 0.9);
const follower3 = new PathFollower({
  pathGuide: guide3,
  ribbon: ribbon3,
  maxLength: MAX_POINTS,
});
ribbons.push(ribbon3);
followers.push(follower3);


// --- BUCLE DE ANIMACIÓN ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Actualizamos todos los guías y seguidores
  guide1.update(deltaTime);
  guide2.update(deltaTime);
  guide3.update(deltaTime);
  
  followers.forEach(follower => follower.update());
  
  // Actualizamos el tiempo en todos los shaders
  ribbons.forEach(ribbon => {
    ribbon.material.uniforms.uTime.value = elapsedTime;
  });
  
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