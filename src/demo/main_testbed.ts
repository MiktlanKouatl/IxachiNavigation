// src/demo/main_testbed.ts

import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RibbonLine, RibbonConfig, RenderMode, UseMode, FadeStyle } from '../ixachi/core/RibbonLine';
import { TrailController } from '../ixachi/strategies/TrailController';
import { PathData } from '../ixachi/core/PathData';
import { PathFollower } from '../ixachi/strategies/PathFollower';
import gsap from 'gsap';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

console.log("🛠️ BANCO DE PRUEBAS DE MODOS DE USO 🛠️");

// Descomenta UNO de los siguientes bloques para probar cada modo.

// =======================================================================
// MODO 1: REVEAL (Animación de dibujado)
// =======================================================================
/* 
const testPath = [
    new THREE.Vector3(-10, 2, 0), new THREE.Vector3(-5, 4, 0), new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(5, 4, 0), new THREE.Vector3(10, 2, 0)
];
const ribbonLine = new RibbonLine({
    color: new THREE.Color("tomato"),
    width: 0.5,
    maxLength: testPath.length + 1,
    renderMode: RenderMode.Solid,
    useMode: UseMode.Reveal,
});
ribbonLine.setPoints(testPath);
scene.add(ribbonLine.mesh);
ribbonLine.material.uniforms.uDrawProgress.value = 0.0;
gsap.to(ribbonLine.material.uniforms.uDrawProgress, {
    value: 1.0, duration: 3, delay: 1, ease: "power2.inOut",
    repeat: -1, yoyo: true,
});
  */
// =======================================================================
// MODO 2: TRAIL (Estela que sigue a un objeto)
// =======================================================================

/* 
const pathPoints: THREE.Vector3[] = [];
const numPoints = 200;
const radius = 10;
for (let i = 0; i < numPoints; i++) {
    const angle = (i / (numPoints - 1)) * Math.PI * 4; // Dos vueltas
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle * 1.5) * radius * 0.5; // Figura de Lissajous
    const z = Math.sin(angle) * radius;
    pathPoints.push(new THREE.Vector3(x, y, z));
}
const pathData = new PathData(pathPoints, false);
const follower = new PathFollower(pathData, { speed: 15.0 });

const ribbonConfig_2: RibbonConfig = {
    color: new THREE.Color(0x00ffff),
    colorEnd: new THREE.Color(0xff00ff),
    width: 10,
    maxLength: 150,
    opacity: 1.0,
    transitionSize: 0.5,
    renderMode: RenderMode.Solid,
    fadeStyle: FadeStyle.FadeInOut,
    fadeTransitionSize: 0.2,
};

const ribbon = new RibbonLine(ribbonConfig_2);
scene.add(ribbon.mesh);

const trailController = new TrailController(ribbon, follower, {
    trailLength: 0.4,
});
 */
// =======================================================================
// MODO 3: TRACE (Chispa que recorre una línea)
// =======================================================================
// 1. Creamos un camino circular cerrado para la prueba.
const tracePathPoints: THREE.Vector3[] = [];
const traceRadius = 5;
const traceSegments = 100;
for (let i = 0; i <= traceSegments; i++) {
    const angle = (i / traceSegments) * Math.PI * 2;
    tracePathPoints.push(new THREE.Vector3(Math.cos(angle) * traceRadius, Math.sin(angle) * traceRadius, 0));
}

const ribbonLine = new RibbonLine({
    color: new THREE.Color("lime"),
    width: 0.5,
    maxLength: tracePathPoints.length + 1,
    renderMode: RenderMode.Solid,
    useMode: UseMode.Trace,
});
ribbonLine.setPoints(tracePathPoints);
scene.add(ribbonLine.mesh);

// 2. Establecemos la longitud de la chispa.
ribbonLine.material.uniforms.uTraceSegmentLength.value = 0.15; // La chispa ocupa un 15%

// 3. Animamos el progreso de 0 a 1 en un bucle infinito.
// La nueva lógica del shader se encargará de que el loop sea perfecto.
gsap.to(ribbonLine.material.uniforms.uTraceProgress, {
    value: 1.0,
    duration: 4, // 4 segundos para dar una vuelta completa
    delay: 1,
    ease: "none",
    repeat: -1,
});
// =======================================================================
// MODO 4: STATIC (Línea estática con fades en los bordes)
// =======================================================================
/* 
const staticPathFade = [ new THREE.Vector3(-10, -6, 0), new THREE.Vector3(10, -6, 0) ];
const ribbonLine = new RibbonLine({
    color: new THREE.Color("magenta"),
    width: 10.5,
    maxLength: staticPathFade.length + 1,
    renderMode: RenderMode.Solid,
    useMode: UseMode.Static,
    fadeStyle: FadeStyle.FadeInOut, // Prueba a cambiarlo por FadeIn, FadeOut o None
    fadeTransitionSize: 0.25, // El 25% de cada extremo tendrá un fade
});
ribbonLine.setPoints(staticPathFade);
scene.add(ribbonLine.mesh);
 */

// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Descomenta el update si estás probando el modo TRAIL
    /*  if (typeof trailController !== 'undefined') {
         follower.update(deltaTime);
        trailController.update(deltaTime);
    } */

    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- MANEJO DE REDIMENSIONAMIENTO ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    ribbonLine.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});