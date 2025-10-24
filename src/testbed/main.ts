1/**
 * @file Ixachi Components Testbed - Main Entry Point
 * @description
 * This file is the main entry point for the testbed.
 * It is responsible for loading and running the selected test scene.
 *
 * To change the scene, import the desired scene and call its `runScene` function.
 */

console.log('🚀 Ixachi Components Testbed Initialized');

// --- Scene Loader ---
// To change the scene, comment out the current line and uncomment the desired scene.
//import { runScene } from './scenes/01_basic_ribbonline.ts';
//import { runScene } from './scenes/02_basic_ribbonline_gpu.ts';
//import { runScene } from './scenes/03_pathfollower_integration.ts';
//import { runScene } from './scenes/04_ribbonlinegpu_trail.ts';
//import { runScene } from './scenes/05_ribbonline_reveal.ts';
//import { runScene } from './scenes/06_ribbonlinegpu_reveal.ts';
//import { runScene } from './scenes/07_flocking_test.ts';
//import { runScene } from './scenes/08_boid_movement_test.ts';
//import { runScene } from './scenes/09_single_boid_flocking.ts';
//import { runScene } from './scenes/10_synapse_test.ts';
//import { runScene } from './scenes/11_flocking_calm.ts';
//import { runScene } from './scenes/12_asset_manager_test.ts';
import { runScene } from './scenes/13_scroll_test.ts'; // Load the new scroll test scene

// Run the selected scene
runScene();
