import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RibbonLine, FadeStyle, RenderMode } from './core/RibbonLine';
import { PathGuide } from './core/PathGuide';
import { PathFollower } from './core/PathFollower';

// --- CONFIGURACIÓN BÁSICA DE LA ESCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

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

const MAX_POINTS = 200;
const allRibbons: RibbonLine[] = []; // Array para guardar las ribbons y actualizar sus uniforms
const allFollowers: PathFollower[] = []; // Array para actualizar todos los followers

// 👇 CAMBIO: Creamos tres líneas con diferentes estilos.

// PINCEL 1: Modo Glow (energía)
const glowRibbon = new RibbonLine({
  color: new THREE.Color(0x00ffff), // Cyan
  width: 0.7,
  maxLength: MAX_POINTS,
  renderMode: RenderMode.Glow,
  fadeStyle: FadeStyle.FadeInOut,
});
scene.add(glowRibbon.mesh);
const glowGuide = new PathGuide(10, 1.2);
const glowFollower = new PathFollower({
  pathGuide: glowGuide,
  ribbon: glowRibbon,
  maxLength: MAX_POINTS,
});
allRibbons.push(glowRibbon);
allFollowers.push(glowFollower);

const TRANSITION_SIZE = 0.5;
// PINCEL 2: Modo Solid (gráfico)
const solidRibbon = new RibbonLine({
  color: new THREE.Color(0xff4400),       // Naranja (Inicio)
  colorEnd: new THREE.Color(0x8800ff),   // Morado (Fin)
  width: 1.0,
  maxLength: MAX_POINTS,
  renderMode: RenderMode.Solid,
  opacity: 1.0,                           // Opacidad completa para ver bien el degradado
  fadeStyle: FadeStyle.None,              // Sin desvanecimiento para apreciar el color
  transitionSize: TRANSITION_SIZE, // Prueba a cambiar este valor entre 0.1 y 1.0
});
solidRibbon.mesh.position.x = 5; // La movemos un poco para que no se encime
scene.add(solidRibbon.mesh);
const solidGuide = new PathGuide(8, -1.5); // Se mueve en dirección contraria
const solidFollower = new PathFollower({
  pathGuide: solidGuide,
  ribbon: solidRibbon,
  maxLength: MAX_POINTS,
});
allRibbons.push(solidRibbon);
allFollowers.push(solidFollower);



// --- BUCLE DE ANIMACIÓN ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Actualizamos todos los sistemas
  glowGuide.update(deltaTime);
  solidGuide.update(deltaTime);
  allFollowers.forEach(follower => follower.update());
  
  allRibbons.forEach(ribbon => {
    ribbon.material.uniforms.uTime.value = elapsedTime;
  });
  
  // Ejemplo de cómo animar la opacidad del listón sólido
  //solidRibbon.material.uniforms.uOpacity.value = (Math.sin(elapsedTime) + 1) / 2 * 0.7 + 0.3;

  // Animamos el "pintado progresivo" en la línea sólida.
  // Usamos una onda senoidal para que el valor de uColorMix vaya de 0 a 1 y viceversa.
  const totalRange = 1.0 + TRANSITION_SIZE;
  //Usamos tu fórmula corregida y perfeccionada
  const colorMixProgress = ((Math.sin(elapsedTime * 0.8) + 1) / 2) * totalRange - ((TRANSITION_SIZE - 0.2) / 2);
  solidRibbon.material.uniforms.uColorMix.value = colorMixProgress;

  // Animamos el ancho y la opacidad usando nuestros nuevos métodos.
  // El ancho del listón de energía palpitará.
  const newWidth = (Math.sin(elapsedTime * 3.0) + 1) / 2 * 0.8 + 0.4; // va de 0.4 a 1.2
  glowRibbon.setWidth(newWidth);

  // La opacidad del listón sólido cambiará suavemente.
  const newOpacity = (Math.cos(elapsedTime * 0.5) + 1) / 2 * 0.7 + 0.3; // va de 0.3 a 1.0
  solidRibbon.setWidth(newWidth);

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