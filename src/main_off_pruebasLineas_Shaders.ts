import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RenderMode, FadeStyle } from './core/RibbonLine';
import { LineManager } from './managers/LineManager';
import { PathController } from './core/PathController';
import { SVGParser } from './utils/SVGParser';

// --- CONFIGURACIÓN BÁSICA (sin cambios) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

// --- ARQUITECTURA PRINCIPAL ---
const lineManager = new LineManager(scene);
const MAX_POINTS = 250;

const glowSystem = lineManager.createFollowingLine(
  {
    color: new THREE.Color(0x00ffff),
    colorEnd: new THREE.Color(0xff00ff),
    width: 300,
    maxLength: MAX_POINTS,
    renderMode: RenderMode.Glow,
    fadeStyle: FadeStyle.FadeInOut,
    transitionSize: 0.8,
  },
  {
    radius: 10,
    speed: 1.2,
  }
);

const svgParser = new SVGParser();
svgParser.getPointsFromSVG('logo.svg', 50)
  .then(async (allPaths) => {
    const logoPoints = allPaths[0];
    const boundingBox = new THREE.Box3().setFromPoints(logoPoints);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    logoPoints.forEach(p => p.sub(center));
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z);
    const desiredSize = 50.0;
    const scaleFactor = desiredSize / maxDimension;
    logoPoints.forEach(p => p.multiplyScalar(scaleFactor));
    logoPoints.forEach(p => { p.y *= -1; });

    const shapeSystem = lineManager.createStaticShape(
      {
          color: new THREE.Color(0xffaa00),
          colorEnd: new THREE.Color(0xffff00),
          width: 200,
          maxLength: logoPoints.length,
          renderMode: RenderMode.Solid,
          fadeStyle: FadeStyle.FadeInOut,
      },
      logoPoints
    );

    if (shapeSystem.controller instanceof PathController) {
      await shapeSystem.controller.reveal(3, 1);
      shapeSystem.controller.trace(5, 0.9);
    }
  });


// --- BUCLE DE ANIMACIÓN ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  
  lineManager.update(deltaTime, elapsedTime);
  
  const glowRibbon = lineManager.getRibbons()[0];
  const solidRibbon = lineManager.getRibbons()[1]; // Asumimos que la sólida es la segunda

  // 👇 CAMBIO: Usamos una fórmula más simple y robusta para evitar el "salto".
  // 1. Creamos una oscilación perfecta que va de 0 -> 1 -> 0.
  const oscillation = (Math.sin(elapsedTime * 0.8) + 1) / 2;
  
  // 2. Mapeamos esa oscilación al rango de viaje total que necesita la transición.
  const totalTravelRange = 1.0 + (glowRibbon.material.uniforms.uTransitionSize.value as number);
  const colorMixProgress = oscillation * totalTravelRange;

  // Actualizamos el uniform en la línea que tiene el degradado.
  glowRibbon.material.uniforms.uColorMix.value = colorMixProgress;
  
  // Opcional: si quieres que la línea sólida también tenga la animación, descomenta la siguiente línea.
  solidRibbon.material.uniforms.uColorMix.value = colorMixProgress;

  controls.update();
  renderer.render(scene, camera);
}

animate();

// --- MANEJO DE REDIMENSIONAMIENTO (sin cambios) ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Actualizamos la resolución en los shaders de todas las líneas
    for (const ribbon of lineManager.getRibbons()) {
        ribbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
});