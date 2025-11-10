
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RibbonLine, RibbonConfig, RenderMode, FadeStyle, UseMode } from '../../core/RibbonLine';
import { PathData } from '../../core/pathing/PathData';
import { PathFollower } from '../../core/pathing/PathFollower';

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

  // --- NODOS (BILLBOARDS) ---

  function createBillboardTexture(color: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, 128, 128);

    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
  }

  const startNodeTexture = createBillboardTexture('rgba(255, 255, 255, 1)');
  const endNodeTexture = createBillboardTexture('rgba(255, 255, 255, 0.5)');

  const billboardMaterialStart = new THREE.SpriteMaterial({ map: startNodeTexture });
  const billboardMaterialEnd = new THREE.SpriteMaterial({ map: endNodeTexture });

  const startNode = new THREE.Sprite(billboardMaterialStart);
  startNode.position.set(-50, 0, 0);
  startNode.scale.set(10, 10, 10);
  scene.add(startNode);

  const endNode = new THREE.Sprite(billboardMaterialEnd);
  endNode.position.set(50, 0, 0);
  endNode.scale.set(10, 10, 10);
  scene.add(endNode);

  // --- PATH ---
  const pathPoints = [
    new THREE.Vector3(-50, 0, 0),
    new THREE.Vector3(50, 0, 0),
  ];
  const pathData = new PathData([pathPoints], false);

  // --- PATH FOLLOWER ---
  const follower = new PathFollower(pathData, { speed: 20 });

  // --- RIBBON LINE ---
  const ribbonConfig: RibbonConfig = {
    color: new THREE.Color(0xffffff),
    width: 30,
    renderMode: RenderMode.Solid,
    fadeStyle: FadeStyle.None,
    useMode: UseMode.Trail,
    maxLength: 1000,
  };
  const ribbon = new RibbonLine(ribbonConfig);
  scene.add(ribbon.mesh);

  // --- ESTADO DE LA ESCENA ---
  let hasFired = false;

  // --- BUCLE DE ANIMACIÓN ---
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Solo actualiza el follower y la línea si la animación no ha terminado
    if (!follower.isAtEnd) {
        follower.update(deltaTime);
        ribbon.addPoint(follower.position);
    }

    ribbon.update(clock.getElapsedTime());

    // Comprueba si el follower ha llegado y si el nodo no se ha disparado aún
    if (follower.isAtEnd && !hasFired) {
      hasFired = true;
      console.log("💥 Nodo Final Alcanzado!");
      // "Dispara" el nodo final cambiando su textura a una brillante
      (endNode.material as THREE.SpriteMaterial).map = createBillboardTexture('rgba(255, 255, 0, 1)');
      (endNode.material as THREE.SpriteMaterial).needsUpdate = true;
    }

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
