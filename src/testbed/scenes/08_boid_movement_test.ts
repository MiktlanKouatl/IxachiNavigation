import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boid } from '../../features/flocking/Boid';

export function runScene() {
  // --- CONFIGURACIÓN BÁSICA ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 100;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app')?.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  const clock = new THREE.Clock();

  // --- AYUDANTE DE REJILLA ---
  const gridHelper = new THREE.GridHelper(200, 50);
  scene.add(gridHelper);

  // --- VISUALIZADOR DEL BOID ---
  const boidGeometry = new THREE.SphereGeometry(2, 16, 16);
  const boidMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const boidMesh = new THREE.Mesh(boidGeometry, boidMaterial);
  scene.add(boidMesh);

  // --- CREACIÓN DEL BOID ---
  // Lo creamos sin ninguna restricción de área por ahora.
  const boid = new Boid(0, 0, 0, null);
  boid.maxSpeed = 0.2;
  boid.velocity.set(0.1, 0, 0); // Le damos una velocidad inicial para que se mueva.

  console.log('Boid created:', boid);

  // --- BUCLE DE ANIMACIÓN ---
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // 1. Actualizamos la física del boid.
    boid.update();

    // 2. Actualizamos la posición de la esfera para que coincida con el boid.
    boidMesh.position.copy(boid.position);

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
}