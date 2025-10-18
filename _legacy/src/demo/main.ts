import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineManager } from '../ixachi/LineManager';
//import { SVGParser } from '../ixachi/utils/SVGParser';
// ¡Importamos el nuevo extractor en lugar del SVGParser!
import { ModelPathExtractor } from '../ixachi/utils/ModelPathExtractor'; 
import { RibbonConfig, RenderMode, FadeStyle } from '../ixachi/core/RibbonLine';


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

//const svgParser = new SVGParser();
//const allLogoPaths = await svgParser.parse(await svgParser.load('/ixachiLogo0001.svg'));


// 1. Instanciamos nuestro nuevo extractor
const modelExtractor = new ModelPathExtractor();

// 2. Cargamos el .glb y extraemos los caminos
// Asegúrate de que tu archivo .glb esté en la carpeta /public/
const allModelPaths = await modelExtractor.extractPaths('/pruebaLinea3d.glb', 50);


// Configuración visual para las cintas
const ribbonConfig: RibbonConfig = {
    color: new THREE.Color(0xff0000),
    colorEnd: new THREE.Color(0xff0000),
    width: 10,
    maxLength: 20, // Puntos de resolución de la estela
    renderMode: RenderMode.Solid,
    fadeStyle: FadeStyle.None ,
};

// ¡Llamada única y limpia para crear todo!
//lineManager.createLinesFromSVG(allLogoPaths, ribbonConfig);
//lineManager.createLinesFromSVG(allModelPaths, ribbonConfig);
// Usamos solo el primer camino del modelo para crear nuestro enjambre
if (allModelPaths.length > 0) {
    const mainPath = allModelPaths[0];
    lineManager.createLineSwarm(mainPath, 10, ribbonConfig); // Crea 10 líneas en el primer camino
}

 /*
const MAX_POINTS = 270;

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
glowSystem.ribbon.pulse(true); 

const svgParser = new SVGParser();
svgParser.getPointsFromSVG('/logo.svg', 50)
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
          colorEnd: new THREE.Color(0xffaa00),
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
*/

// --- BUCLE DE ANIMACIÓN ---
function animate() {
  requestAnimationFrame(animate);

  
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  
  // Solo necesitamos actualizar el manager, él se encarga del resto.
  lineManager.update(deltaTime, elapsedTime);

  controls.update();
  renderer.render(scene, camera);
}

animate();

// --- MANEJO DE REDIMENSIONAMIENTO (sin cambios) ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Actualizamos la resolución en los shaders de todas las líneas
   /*  for (const ribbon of lineManager.getRibbons()) {
        ribbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    } */
});