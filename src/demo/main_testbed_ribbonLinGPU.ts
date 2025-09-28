// src/demo/main_testbed.ts
import '../demo/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// [!code ++] Importamos el nuevo componente GPU
import { RibbonLineGPU } from '../ixachi/core/RibbonLineGPU';
// [!code ++] Todavía necesitamos la configuración y los enums
import { RibbonConfig, RenderMode, FadeStyle } from '../ixachi/core/RibbonLine';

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
const ribbonConfig: RibbonConfig = {
    color: new THREE.Color(0x00ffff),
    colorEnd: new THREE.Color(0xff00ff),
    width: 1.0,
    maxLength: 150, // La resolución de la estela
    opacity: 1.0,
    renderMode: RenderMode.Solid,
    fadeStyle: FadeStyle.FadeInOut,
    fadeTransitionSize: 0.1,
};

// [!code ++] Instanciamos nuestro nuevo componente GPU
const ribbonGPU = new RibbonLineGPU(pathPoints, ribbonConfig);
scene.add(ribbonGPU.mesh);


// --- INTERFAZ DE USUARIO ---
const ui = {
    speed: 0.1,
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

// [!code ++] Nuevos controles para velocidad y longitud
createSlider('speed', 'Velocidad', 0.01, 0.5, 0.01, ui.speed, (val) => { ui.speed = val; });
createSlider('trailLength', 'Longitud Estela', 0.01, 1.0, 0.01, ui.trailLength, (val) => { 
    ribbonGPU.material.uniforms.uTrailLength.value = val; 
});
createSlider('width', 'Ancho', 1.0, 50.0, 2.0, ui.width, (val) => { 
    ribbonGPU.material.uniforms.uWidth.value = val;
});
createSlider('opacity', 'Opacidad', 0, 1, 0.01, ui.opacity, (val) => {
    ribbonGPU.material.uniforms.uOpacity.value = val;
});
createSlider('colorMix', 'Color Mix', 0.0, 1.0, 0.01, ui.colorMix, (val) => {
    ribbonGPU.material.uniforms.uColorMix.value = val;
});
createSlider('transitionSize', 'Tamaño Transición', 0.01, 1, 0.01, ui.transitionSize, (val) => {
    ribbonGPU.material.uniforms.uTransitionSize.value = val;
});
createColorPicker('color', 'Color Inicio', ui.color, (val) => {
    ribbonGPU.material.uniforms.uColor.value = val;
});
createColorPicker('colorEnd', 'Color Fin', ui.colorEnd, (val) => {
    ribbonGPU.material.uniforms.uColorEnd.value = val;
});
createSelect('renderMode', 'Modo Render', RenderMode, ui.renderMode!, (val) => {
    ribbonGPU.material.uniforms.uRenderMode.value = val;
});
createSelect('fadeStyle', 'Estilo Fade', FadeStyle, ui.fadeStyle!, (val) => {
    ribbonGPU.material.uniforms.uFadeStyle.value = val;
});
createSlider('fadeTransitionSize', 'Tamaño Fade', 0.01, 1, 0.01, ui.fadeTransitionSize, (val) => { 
    ribbonGPU.material.uniforms.uFadeTransitionSize.value = val; 
});





// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // [!code ++] Toda la lógica compleja se reduce a esto:
    const progress = (elapsedTime * ui.speed) % 1.0;
    ribbonGPU.update(progress); // Solo actualizamos el progreso
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- MANEJO DE REDIMENSIONAMIENTO ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    ribbonGPU.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});