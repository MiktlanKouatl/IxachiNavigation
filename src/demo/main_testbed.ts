// src/demo/main_testbed.ts
import '../demo/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RibbonLine, RibbonConfig, RenderMode, FadeStyle } from '../ixachi/core/RibbonLine';
import { TrailController } from '../ixachi/strategies/TrailController';
import { PathData } from '../ixachi/core/PathData';
import { PathFollower } from '../ixachi/strategies/PathFollower';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

// --- CREACIÓN DEL CAMINO DE PRUEBA ---
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

// --- ARQUITECTURA DE PRUEBA ---
const pathData = new PathData(pathPoints, false);
const follower = new PathFollower(pathData, { speed: 15.0 });

const ribbonConfig: RibbonConfig = {
    color: new THREE.Color(0x00ffff),
    colorEnd: new THREE.Color(0xff00ff),
    width: 10,
    maxLength: 150,
    opacity: 1.0,
    transitionSize: 0.2,
    renderMode: RenderMode.Solid,
    fadeStyle: FadeStyle.None,
    fadeTransitionSize: 0.1,
};

const ribbon = new RibbonLine(ribbonConfig);
scene.add(ribbon.mesh);

const trailController = new TrailController(ribbon, follower, {
    trailLength: 0.4,
});

// --- INTERFAZ DE USUARIO ---
const ui = {
    speed: follower.getSpeed(),
    trailLength: 0.4,
    colorMix: 0.5,
    ...ribbonConfig,
};
const controlsContainer = document.getElementById('controls')!;

function createSlider(id: string, label: string, min: number, max: number, step: number, value: number, callback: (value: number) => void) {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.addEventListener('input', (e) => callback(parseFloat((e.target as HTMLInputElement).value)));
    controlsContainer.appendChild(labelEl);
    controlsContainer.appendChild(slider);
}

function createSelect(id: string, label: string, options: { [key: string]: number }, value: number, callback: (value: number) => void) {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    const select = document.createElement('select');
    select.id = id;
    for (const key in options) {
        const option = document.createElement('option');
        option.value = String(options[key]);
        option.textContent = key;
        if (options[key] === value) option.selected = true;
        select.appendChild(option);
    }
    select.addEventListener('change', (e) => callback(parseInt((e.target as HTMLInputElement).value, 10)));
    controlsContainer.appendChild(labelEl);
    controlsContainer.appendChild(select);
}

function createColorPicker(id: string, label: string, value: THREE.Color, callback: (value: THREE.Color) => void) {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.id = id;
    picker.value = '#' + value.getHexString();
    picker.addEventListener('input', (e) => callback(new THREE.Color((e.target as HTMLInputElement).value)));
    controlsContainer.appendChild(labelEl);
    controlsContainer.appendChild(picker);
}

createSlider('speed', 'Velocidad', 1, 50, 0.5, ui.speed, (val) => { follower['speed'] = val; });
createSlider('trailLength', 'Longitud Estela', 0.01, 1, 0.01, ui.trailLength, (val) => { trailController['trailLengthRatio'] = val; });
createSlider('width', 'Ancho', 1.0, 50.0, 2.0, ui.width, (val) => { ribbon.material.uniforms.uWidth.value = val; });
createSlider('opacity', 'Opacidad', 0, 1, 0.01, ui.opacity, (val) => { ribbon.material.uniforms.uOpacity.value = val; });
createSlider('colorMix', 'Color Mix', 0.0, 1.0, 0.01, ui.colorMix, (val) => { ribbon.material.uniforms.uColorMix.value = val; });
createSlider('transitionSize', 'Tamaño Transición', 0.01, 1, 0.01, ui.transitionSize, (val) => { ribbon.material.uniforms.uTransitionSize.value = val; });
createColorPicker('color', 'Color Inicio', ui.color, (val) => { ribbon.material.uniforms.uColor.value = val; });
createColorPicker('colorEnd', 'Color Fin', ui.colorEnd, (val) => { ribbon.material.uniforms.uColorEnd.value = val; });
createSelect('renderMode', 'Modo Render', RenderMode, ui.renderMode!, (val) => { ribbon.material.uniforms.uRenderMode.value = val; });
createSelect('fadeStyle', 'Estilo Fade', FadeStyle, ui.fadeStyle!, (val) => { ribbon.material.uniforms.uFadeStyle.value = val; });
createSlider('transitionSize', 'Tamaño Fade', 0.01, 1, 0.01, ui.fadeTransitionSize, (val) => { 
    ribbon.material.uniforms.uFadeTransitionSize.value = val; 
});





// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    follower.update(deltaTime);
    trailController.update(deltaTime);
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- MANEJO DE REDIMENSIONAMIENTO ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    ribbon.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});