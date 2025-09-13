import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RenderMode, FadeStyle } from '../ixachi/core/RibbonLine';
import { LineManager } from '../ixachi/LineManager';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Fondo negro para máximo impacto
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 75; // Alejamos la cámara para ver el cardumen
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

// --- ARQUITECTURA PRINCIPAL ---
const lineManager = new LineManager(scene);

// 👇 ¡LA MAGIA! Creamos un cardumen de 100 líneas.
lineManager.createFlock(
  100,
  { // Configuración del "Pincel" para cada miembro del cardumen
    color: new THREE.Color(0xffee88),
    width: 15,
    renderMode: RenderMode.Glow,
    fadeStyle: FadeStyle.FadeInOut,
    opacity: 1,
  },
  { x:60, y: 60, z: 60 } // Los límites de su "pecera"
);


// --- BUCLE DE ANIMACIÓN ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  
  lineManager.update(deltaTime, elapsedTime);

  controls.update();
  renderer.render(scene, camera);
}

animate();

// --- MANEJO DE REDIMENSIONAMIENTO ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    for (const ribbon of lineManager.getRibbons()) {
        ribbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
});