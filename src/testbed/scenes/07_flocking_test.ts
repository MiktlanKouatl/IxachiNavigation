import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineManager } from '../../managers/LineManager';
import { RenderMode, FadeStyle, UseMode } from '../../core/RibbonLine';
import { CubicAreaConstraint } from '../../features/flocking/constraints/CubicAreaConstraint';
import { DonutAreaConstraint } from '../../features/flocking/constraints/DonutAreaConstraint';

export function runScene() {
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

  // --- CONSTRAINTS ---
  const cubicConstraint = new CubicAreaConstraint(new THREE.Vector3(180, 180, 60));
  const donutConstraint = new DonutAreaConstraint(50, 100, 30);

  // 👇 ¡LA MAGIA! Creamos un cardumen de 100 líneas.
  lineManager.createFlock(
    10,
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
  // console.log('[07_flocking_test] Flocking system created.');

  // --- UI ---
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'absolute';
  buttonContainer.style.top = '10px';
  buttonContainer.style.left = '10px';
  buttonContainer.style.zIndex = '100';
  document.body.appendChild(buttonContainer);

  const cubicButton = document.createElement('button');
  cubicButton.innerText = 'Cubic';
  cubicButton.onclick = () => lineManager.setAreaConstraint(cubicConstraint);
  buttonContainer.appendChild(cubicButton);

  const donutButton = document.createElement('button');
  donutButton.innerText = 'Donut';
  donutButton.onclick = () => lineManager.setAreaConstraint(donutConstraint);
  buttonContainer.appendChild(donutButton);

  // --- BUCLE DE ANIMACIÓN ---
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    lineManager.update(deltaTime, elapsedTime);
    // console.log('[07_flocking_test] Animate loop running.');

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