
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineManager } from '../../managers/LineManager';
import { RenderMode, FadeStyle, UseMode } from '../../core/RibbonLine';
import { CubicAreaConstraint } from '../../features/flocking/constraints/CubicAreaConstraint';

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

  // --- ARQUITECTURA PRINCIPAL ---
  const lineManager = new LineManager(scene);

  // --- CONSTRAINTS ---
  const cubicConstraint = new CubicAreaConstraint(new THREE.Vector3(180, 180, 60));

  // 👇 Creamos un cardumen de 1 solo boid.
  lineManager.createFlock(
    1,
    { // Configuración del "Pincel" para cada miembro del cardumen
      color: new THREE.Color(0xffee88),
      width: 70,
      renderMode: RenderMode.Solid,
      fadeStyle: FadeStyle.None,
      opacity: 1,
      useMode: UseMode.Trail,
    },
    cubicConstraint // Los límites de su "pecera"
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
}
