


import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { GUI } from 'lil-gui';

import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';







// Import shaders



import agentMovementShader from '../../shaders/agent_movement_compute.glsl?raw';



import agentPositionShader from '../../shaders/agent_position_compute.glsl?raw';



import gridUpdateVertexShader from '../../shaders/grid_state_update.vert.glsl?raw';







import gridUpdateFragmentShader from '../../shaders/grid_state_update.frag.glsl?raw';







import gridStateComputeShader from '../../shaders/grid_state_compute.glsl?raw';



import gridVisualVertexShader from '../../shaders/grid_visual.vert.glsl?raw';



import gridVisualFragmentShader from '../../shaders/grid_visual.frag.glsl?raw';











export default () => {



    // --- Basic Scene Setup ---



    const scene = new THREE.Scene();



    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);



    camera.position.set(0, 0, 15);



    



    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });



    renderer.setClearColor(0x000000, 0);



    renderer.setSize(window.innerWidth, window.innerHeight);



    document.body.appendChild(renderer.domElement);



    



    const controls = new OrbitControls(camera, renderer.domElement);



    controls.enableDamping = true;







    const gui = new GUI();



    const params = {



        influence: 1.0,



        decay: 0.99,



        color: '#00ffff'



    };







    // --- Simulation Constants ---



    const GRID_SIZE = 128; // The grid will be GRID_SIZE x GRID_SIZE



    const WORLD_SIZE = 10; // The world size the grid represents



    const AGENT_COUNT = 1; // For now, we'll simulate a single agent



    const AGENT_TEXTURE_WIDTH = Math.ceil(Math.sqrt(AGENT_COUNT));



    const AGENT_TEXTURE_HEIGHT = AGENT_TEXTURE_WIDTH;











    // --- GPGPU Setup (Agent Movement) ---



    const agentCompute = new GPUComputationRenderer(AGENT_TEXTURE_WIDTH, AGENT_TEXTURE_HEIGHT, renderer);







    const posData = agentCompute.createTexture();



    const velData = agentCompute.createTexture();







    const initialSpeed = 2.0;



    const posArray = posData.image.data;



    const velArray = velData.image.data;



    for (let i = 0; i < AGENT_COUNT; i++) {



        const i4 = i * 4;



        posArray[i4 + 0] = (Math.random() - 0.5) * WORLD_SIZE * 0.5;



        posArray[i4 + 1] = (Math.random() - 0.5) * WORLD_SIZE * 0.5;



        posArray[i4 + 2] = 0;



        posArray[i4 + 3] = 1.0;







        const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0);



        if (vel.length() < 0.001) { vel.set(1, 0, 0); }



        vel.normalize().multiplyScalar(initialSpeed);



        



        velArray[i4 + 0] = vel.x;



        velArray[i4 + 1] = vel.y;



        velArray[i4 + 2] = vel.z;



        velArray[i4 + 3] = 1.0;



    }







    const agentPositionVariable = agentCompute.addVariable('texturePosition', agentPositionShader, posData);



    const agentVelocityVariable = agentCompute.addVariable('textureVelocity', agentMovementShader, velData);



    



    agentCompute.setVariableDependencies(agentVelocityVariable, [agentPositionVariable, agentVelocityVariable]);



    agentCompute.setVariableDependencies(agentPositionVariable, [agentPositionVariable, agentVelocityVariable]);







    agentPositionVariable.material.uniforms['delta'] = new THREE.Uniform(0.0);







    let error = agentCompute.init();



    if (error !== null) { console.error(error); }







    // --- GPGPU Setup (Grid Update) ---



    const gridCompute = new GPUComputationRenderer(GRID_SIZE, GRID_SIZE, renderer);



    const gridData = gridCompute.createTexture();



    const gridVariable = gridCompute.addVariable('gridState', gridStateComputeShader, gridData);



    



    gridCompute.setVariableDependencies(gridVariable, [gridVariable]);







    gridVariable.material.uniforms['agentInfluenceTexture'] = new THREE.Uniform(null);



    gridVariable.material.uniforms['decay'] = new THREE.Uniform(params.decay);



    



    error = gridCompute.init();



    if (error !== null) { console.error(error); }











    // --- Agent Influence Pass (Part 2) ---



    const agentInfluenceRenderTarget = new THREE.WebGLRenderTarget(GRID_SIZE, GRID_SIZE, {



        format: THREE.RGBAFormat,



        type: THREE.FloatType,



        minFilter: THREE.NearestFilter,



        magFilter: THREE.NearestFilter,



    });



    const influenceScene = new THREE.Scene();



    const influenceCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 100);



    influenceCamera.position.z = 1;







    const agentInfluenceMaterial = new THREE.ShaderMaterial({



        vertexShader: gridUpdateVertexShader,



        fragmentShader: gridUpdateFragmentShader,



        uniforms: {



            texturePosition: { value: null },



            worldSize: { value: new THREE.Vector2(WORLD_SIZE, WORLD_SIZE) },



            influence: { value: params.influence }



        },



        blending: THREE.AdditiveBlending,



        transparent: true,



        depthTest: false,



    });







    const agentUvs = new Float32Array(AGENT_COUNT * 2);



    for (let i = 0; i < AGENT_COUNT; i++) {



        const u = (i % AGENT_TEXTURE_WIDTH) / AGENT_TEXTURE_WIDTH;



        const v = Math.floor(i / AGENT_TEXTURE_WIDTH) / AGENT_TEXTURE_HEIGHT;



        agentUvs[i * 2 + 0] = u;



        agentUvs[i * 2 + 1] = v;



    }



    const agentInfluenceGeometry = new THREE.BufferGeometry();



    agentInfluenceGeometry.setAttribute('agentUv', new THREE.BufferAttribute(agentUvs, 2));



    const agentInfluencePoints = new THREE.Points(agentInfluenceGeometry, agentInfluenceMaterial);



    influenceScene.add(agentInfluencePoints);











    // --- Visualization (Part 4) ---



    const gridPointsGeometry = new THREE.BufferGeometry();



    const gridPointsPositions = new Float32Array(GRID_SIZE * GRID_SIZE * 3);



    const gridPointsUvs = new Float32Array(GRID_SIZE * GRID_SIZE * 2);







    for (let i = 0; i < GRID_SIZE; i++) {



        for (let j = 0; j < GRID_SIZE; j++) {



            const index = (i * GRID_SIZE + j);



            const x = (j / (GRID_SIZE - 1) - 0.5) * WORLD_SIZE;



            const y = (i / (GRID_SIZE - 1) - 0.5) * WORLD_SIZE;



            



            gridPointsPositions[index * 3 + 0] = x;



            gridPointsPositions[index * 3 + 1] = y;



            gridPointsPositions[index * 3 + 2] = 0;







            gridPointsUvs[index * 2 + 0] = j / (GRID_SIZE - 1);



            gridPointsUvs[index * 2 + 1] = i / (GRID_SIZE - 1);



        }



    }



    gridPointsGeometry.setAttribute('position', new THREE.BufferAttribute(gridPointsPositions, 3));



    gridPointsGeometry.setAttribute('uv', new THREE.BufferAttribute(gridPointsUvs, 2));







    const gridVisualMaterial = new THREE.ShaderMaterial({



        vertexShader: gridVisualVertexShader,



        fragmentShader: gridVisualFragmentShader,



        uniforms: {



            gridStateTexture: { value: null },



            color: { value: new THREE.Color(params.color) }



        },



        transparent: true,



        depthWrite: false,



    });







    const gridPoints = new THREE.Points(gridPointsGeometry, gridVisualMaterial);



    scene.add(gridPoints);











    // --- Animation Loop ---



    const clock = new THREE.Clock();



    function animate() {



        requestAnimationFrame(animate);



        const delta = clock.getDelta();







        // --- 1. Agent Movement ---



        agentCompute.compute();



        agentPositionVariable.material.uniforms['delta'].value = delta;



        const agentPosTexture = agentCompute.getCurrentRenderTarget(agentPositionVariable).texture;







        // --- 2. Agent Influence ---



        renderer.setRenderTarget(agentInfluenceRenderTarget);



        renderer.clear();



        agentInfluenceMaterial.uniforms.texturePosition.value = agentPosTexture;



        renderer.render(influenceScene, influenceCamera);



        renderer.setRenderTarget(null);







        // --- 3. Grid Update ---



        gridVariable.material.uniforms.agentInfluenceTexture.value = agentInfluenceRenderTarget.texture;



        gridCompute.compute();



        const gridStateTexture = gridCompute.getCurrentRenderTarget(gridVariable).texture;







        // --- 4. Visualization ---



        gridVisualMaterial.uniforms.gridStateTexture.value = gridStateTexture;







        controls.update();



        renderer.render(scene, camera);



    }







    animate();







    // --- UI ---



    gui.add(params, 'influence', 0, 1, 0.01).name('Influence').onChange(v => agentInfluenceMaterial.uniforms.influence.value = v);



    gui.add(params, 'decay', 0.9, 1, 0.001).name('Decay').onChange(v => gridVariable.material.uniforms.decay.value = v);



    gui.addColor(params, 'color').name('Color').onChange(v => gridVisualMaterial.uniforms.color.value.set(v));











    // --- Cleanup ---



    return () => {



        gui.destroy();



        renderer.dispose();



        document.body.removeChild(renderer.domElement);



    };



};














