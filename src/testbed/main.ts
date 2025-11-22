import { runScene as runScene1 } from './scenes/01_basic_ribbonline';
import { runScene as runScene2 } from './scenes/02_basic_ribbonline_gpu';
import { runScene as runScene3 } from './scenes/03_pathfollower_integration';
import { runScene as runScene4 } from './scenes/04_ribbonlinegpu_trail';
import { runScene as runScene5 } from './scenes/05_ribbonline_reveal';
import { runScene as runScene6 } from './scenes/06_ribbonlinegpu_reveal';
import { runScene as runScene7 } from './scenes/07_flocking_test';
import { runScene as runScene8 } from './scenes/08_boid_movement_test';
import { runScene as runScene9 } from './scenes/09_single_boid_flocking';
import { runScene as runScene10 } from './scenes/10_synapse_test';
import { runScene as runScene11 } from './scenes/11_flocking_calm';
import { runScene as runScene12 } from './scenes/12_asset_manager_test';
import { runScene as runScene13 } from './scenes/13_scroll_test';
import { runScene as runScene14 } from './scenes/14_camera_perspective_effect';
import { runScene as runScene15 } from './scenes/15_road_follower';
import { runScene as runScene16 } from './scenes/16_procedural_ribbons';
import { runScene as runScene17 } from './scenes/17_interactive_text_journey';
import { runScene as runScene18 } from './scenes/18_bloom_effect_test';
import { runScene as runScene19 } from './scenes/19_cinematic_text_lab';
import { runScene as runScene20 } from './scenes/20_main_journey_prototype';
import { runScene as runScene21 } from './scenes/21_direct_journey_transition';
import { runScene as runScene22 } from './scenes/22_logo_trace_loop';
import { runScene as runScene24 } from './scenes/24_chase_camera_test';
import { runScene as runScene25 } from './scenes/25_chase_camera_refactored';
// import { runScene as runScene26 } from './scenes/26_gpu_particle_trail';
import { runScene as runScene27 } from './scenes/27_creative_grid';
import { runScene as runScene33 } from './scenes/33_3d_pathfinding_grid';
import runScene35 from './scenes/35_gpu_drawing_simulation';
import runScene36 from './scenes/36_gpu_ring_landscape';
import runScene37 from './scenes/37_cylindrical_flow_field';
import runScene38 from './scenes/38_player_in_landscape';
import runScene39 from './scenes/39_dynamic_flow_field';
import { CreativeUniverseChapterTest } from './scenes/23_CreativeUniverseChapter_Test';

console.log('🚀 Ixachi Components Testbed Initialized');

const scenes: { [key: string]: () => void } = {
    '1: Basic RibbonLine': runScene1,
    '2: Basic RibbonLine GPU': runScene2,
    '3: PathFollower Integration': runScene3,
    '4: RibbonLineGPU Trail': runScene4,
    '5: RibbonLine Reveal': runScene5,
    '6: RibbonLineGPU Reveal': runScene6,
    '7: Flocking Test': runScene7,
    '8: Boid Movement Test': runScene8,
    '9: Single Boid Flocking': runScene9,
    '10: Synapse Test': runScene10,
    '11: Flocking Calm': runScene11,
    '12: Asset Manager Test': runScene12,
    '13: Scroll Test': runScene13,
    '14: Camera Perspective Effect': runScene14,
    '15: Road Follower': runScene15,
    '16: Procedural Ribbons': runScene16,
    '17: Interactive Text Journey': runScene17,
    '18: Bloom Effect Test': runScene18,
    '19: Cinematic Text Lab': runScene19,
    '20: Main Journey Prototype': runScene20,
    '21: Direct Journey Transition': runScene21,
    '22: Logo Trace Loop': runScene22,
    '23: Creative Universe Chapter': () => runChapterTest(new CreativeUniverseChapterTest()),
    '24: Chase Camera Test': runScene24,
    '25: Chase Camera (Refactored)': runScene25,
    // '26: GPU Particle Trail': runScene26,
    '27: Creative Grid': runScene27,
    '33: 3D Pathfinding Grid': runScene33,
    '35: GPGPU Drawing Simulation': runScene35,
    '36: GPU Ring Landscape': runScene36,
    '37: Cylindrical Flow Field': runScene37,
    '38: Player in Landscape': runScene38,
	 '39: Dynamic Flow Field': runScene39,
};

let currentScene: string | null = null;

// Generic chapter runner
import *as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AnimationTargets } from '../animation/AnimationTargets';
import { AssetManager } from '../managers/AssetManager';
import { ColorManager } from '../managers/ColorManager';
import { IAnimationChapter } from '../animation/IAnimationChapter';

async function runChapterTest(chapter: IAnimationChapter) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('app')?.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.z = 5;

    const assetManager = new AssetManager();
    const colorManager = new ColorManager();
    await assetManager.loadAll();

    const targets: AnimationTargets = {
        scene,
        camera,
        assetManager,
        colorManager,
        cameraTarget: new THREE.Object3D(),
        lookAtTarget: new THREE.Object3D(),
        hostFollower: null as any,
        hostRibbon: null as any,
        hostSourceObject: new THREE.Object3D(),
        movementController: null as any,
        progressCircle: null as any,
        progressUI: null as any,
        enableDrawing: () => {},
    };

    chapter.start(null as any, targets);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}


function loadScene(sceneIdentifier: string) {
    // Clean up previous scene if any
    const app = document.getElementById('app');
    if (app) {
        while (app.firstChild) {
            app.removeChild(app.firstChild);
        }
    }
    const oldGui = document.querySelector('.lil-gui');
    if (oldGui) {
        oldGui.remove();
    }

    let resolvedSceneName: string | undefined;
    // Check if the identifier is a number (e.g., "22")
    if (!isNaN(Number(sceneIdentifier))) {
        const sceneNumber = sceneIdentifier + ':';
        resolvedSceneName = Object.keys(scenes).find(key => key.startsWith(sceneNumber));
    } else {
        // Otherwise, assume it's the full scene name
        resolvedSceneName = sceneIdentifier;
    }

    const sceneFunction = resolvedSceneName ? scenes[resolvedSceneName] : undefined;

    if (sceneFunction && resolvedSceneName) {
        console.log(`Loading scene: ${resolvedSceneName}`);
        sceneFunction();
        currentScene = resolvedSceneName;
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('scene', resolvedSceneName);
        window.history.pushState({ scene: resolvedSceneName }, ``, url);
        // Also update the selector to reflect the loaded scene
        const selector = document.getElementById('scene-selector') as HTMLSelectElement;
        if (selector) {
            selector.value = resolvedSceneName;
        }
    } else {
        console.error(`Scene "${sceneIdentifier}" not found.`);
    }
}

// --- UI Creation ---
const selectorContainer = document.createElement('div');
selectorContainer.style.position = 'absolute';
selectorContainer.style.top = '10px';
selectorContainer.style.right = '10px';
selectorContainer.style.zIndex = '100';

const selector = document.createElement('select');
selector.id = 'scene-selector'; // Add an ID for easier access
Object.keys(scenes).forEach(sceneName => {
    const option = document.createElement('option');
    option.value = sceneName;
    option.innerText = sceneName;
    selector.appendChild(option);
});

selector.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    loadScene(target.value);
});

selectorContainer.appendChild(selector);
document.body.appendChild(selectorContainer);

// --- Initial Scene Load ---
const urlParams = new URLSearchParams(window.location.search);
const sceneFromUrl = urlParams.get('scene');

if (sceneFromUrl) {
    loadScene(sceneFromUrl);
} else {
    // Load a default scene if none is specified in the URL
    const defaultScene = '39: Dynamic Flow Field';
    loadScene(defaultScene);
}