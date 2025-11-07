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
};

let currentScene: string | null = null;

function loadScene(sceneName: string) {
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

    // Load new scene
    const sceneFunction = scenes[sceneName];
    if (sceneFunction) {
        console.log(`Loading scene: ${sceneName}`);
        sceneFunction();
        currentScene = sceneName;
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('scene', sceneName);
        window.history.pushState({ scene: sceneName }, ``, url);
    } else {
        console.error(`Scene "${sceneName}" not found.`);
    }
}

// --- UI Creation ---
const selectorContainer = document.createElement('div');
selectorContainer.style.position = 'absolute';
selectorContainer.style.top = '10px';
selectorContainer.style.right = '10px';
selectorContainer.style.zIndex = '100';

const selector = document.createElement('select');
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

if (sceneFromUrl && scenes[sceneFromUrl]) {
    selector.value = sceneFromUrl;
    loadScene(sceneFromUrl);
} else {
    // Load a default scene if none is specified in the URL
    const defaultScene = '21: Direct Journey Transition';
    selector.value = defaultScene;
    loadScene(defaultScene);
}
