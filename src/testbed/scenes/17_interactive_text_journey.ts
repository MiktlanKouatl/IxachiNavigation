import * as THREE from 'three';
import GUI from 'lil-gui';
import { PathData } from '../../core/pathing/PathData';
import { ProceduralRibbonLine, ProceduralRibbonConfig } from '../../core/ProceduralRibbonLine';
import { PathFollower } from '../../core/pathing/PathFollower';
import { Text } from 'troika-three-text';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Extend the class slightly to hold animation properties
interface AnimatingRibbonLine extends ProceduralRibbonLine {
    initialSeed?: number;
    animationSpeed?: number;
}

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 17: Interactive Text Journey');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping; // Important for bloom
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Post-processing (Bloom) ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Path and Ribbons ---
    const pathRadius = 30;
    const controlPoints = [
        new THREE.Vector3(0, 0, pathRadius),
        new THREE.Vector3(pathRadius, 5, 0),
        new THREE.Vector3(0, 0, -pathRadius),
        new THREE.Vector3(-pathRadius, -5, 0),
    ];
    const pathData = new PathData(controlPoints, true);
    const divisions = 200;
    const { normals, binormals } = pathData.curve.computeFrenetFrames(divisions, true);

    const ribbonSettings: ProceduralRibbonConfig = {
        maxLength: divisions + 1,
        width: 0.3,
        radius: 3.0,
        radiusVariation: 1.5,
        angleFrequency: 5.0,
        radiusFrequency: 3.0,
    };

    const ribbons: AnimatingRibbonLine[] = [];
    for (let i = 0; i < 15; i++) {
        const initialSeed = Math.random() * 100;
        const ribbon: AnimatingRibbonLine = new ProceduralRibbonLine(pathData, {
            ...ribbonSettings,
            seed: initialSeed,
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
            colorEnd: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
            fadeStyle: 2,
            fadeTransitionSize: 0.1,
        });
        ribbon.initialSeed = initialSeed;
        ribbon.animationSpeed = Math.random() * 0.8 + 0.6; // Random speed between 0.6 and 1.4

        scene.add(ribbon.mesh);
        ribbons.push(ribbon);
    }

    // --- Troika Text Chapters ---
    const textChapters = [
        { progress: 0.15, text: 'INICIO: El Origen' },
        { progress: 0.40, text: 'NUDO: La Complejidad' },
        { progress: 0.65, text: 'CLIMAX: La Solución Procedural' },
        { progress: 0.90, text: 'FIN: Un Nuevo Comienzo' },
    ];
    const textObjects: Text[] = [];

    textChapters.forEach(chapter => {
        const text = new Text();
        text.text = chapter.text;
        text.fontSize = 1.5;
        text.color = 0xffffff;
        text.anchorX = 'center';
        text.material.transparent = true;
        text.fillOpacity = 0;

        const point = pathData.curve.getPointAt(chapter.progress);
        text.position.copy(point);
        text.position.y += 3;

        scene.add(text);
        textObjects.push(text);
        text.sync();
    });

    // --- Interactive Camera Controls ---
    const cameraFollower = new PathFollower(pathData, { speed: 10.0 });
    const mouse = new THREE.Vector2();
    const cameraOffset = new THREE.Vector2();

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
    });

    const journeyParams = {
        speed: 10.0,
        revealDistance: 0.25,
        horizontalRange: 4.0,
        verticalRange: 2.5,
        smoothing: 0.05,
        textFadeDistance: 15.0,
        masterAnimationSpeed: 0.5,
        animationIndividuality: 1.0, // 0 = sync, 1 = full random
    };

    // --- GUI ---
    const gui = new GUI();
    const journeyFolder = gui.addFolder('Journey');
    journeyFolder.add(journeyParams, 'speed', 1, 30).onChange(v => cameraFollower.setSpeed(v));
    journeyFolder.add(journeyParams, 'revealDistance', 0.1, 0.5);
    journeyFolder.add(journeyParams, 'horizontalRange', 1, 10);
    journeyFolder.add(journeyParams, 'verticalRange', 1, 10);
    journeyFolder.add(journeyParams, 'smoothing', 0.01, 0.2);
    journeyFolder.add(journeyParams, 'textFadeDistance', 5, 30);
    
    const ribbonFolder = gui.addFolder('Ribbons');
    ribbonFolder.add(journeyParams, 'masterAnimationSpeed', 0, 2);
    ribbonFolder.add(journeyParams, 'animationIndividuality', 0, 1);
    ribbonFolder.add(ribbonSettings, 'width', 0.1, 2).onChange(v => ribbons.forEach(r => r.material.uniforms.uWidth.value = v));
    ribbonFolder.add(ribbonSettings, 'radius', 0, 10).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadius.value = v));
    ribbonFolder.add(ribbonSettings, 'radiusVariation', 0, 5).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadiusVariation.value = v));
    ribbonFolder.add(ribbonSettings, 'angleFrequency', 0.1, 3.0).onChange(v => ribbons.forEach(r => r.material.uniforms.uAngleFrequency.value = v));
    ribbonFolder.add(ribbonSettings, 'radiusFrequency', 0.1, 3.0).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadiusFrequency.value = v));

    const bloomParams = {
        threshold: 0.85,
        strength: 1.5,
        radius: 0.4,
    };

    const bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(bloomParams, 'threshold', 0.0, 1.0).onChange((value) => { bloomPass.threshold = value; });
    bloomFolder.add(bloomParams, 'strength', 0.0, 3.0).onChange((value) => { bloomPass.strength = value; });
    bloomFolder.add(bloomParams, 'radius', 0.0, 1.0).onChange((value) => { bloomPass.radius = value; });

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // --- Update followers and controls ---
        cameraFollower.update(deltaTime);
        cameraOffset.lerp(mouse, journeyParams.smoothing);

        // --- Calculate camera position and orientation ---
        const basePosition = cameraFollower.position;
        const curveIndex = Math.floor(cameraFollower.progress * divisions);
        const normal = normals[curveIndex];
        const binormal = binormals[curveIndex];

        // Correctly map mouse X/Y to the curve's coordinate system
        const rightVec = normal;
        const upVec = binormal;

        const offset = new THREE.Vector3()
            .add(rightVec.clone().multiplyScalar(cameraOffset.x * journeyParams.horizontalRange))
            .add(upVec.clone().multiplyScalar(cameraOffset.y * journeyParams.verticalRange));

        camera.position.copy(basePosition).add(offset);

        const lookAtProgress = (cameraFollower.progress + 0.01) % 1.0;
        const lookAtPosition = pathData.curve.getPointAt(lookAtProgress);
        const lookAtOffset = new THREE.Vector3()
            .add(rightVec.clone().multiplyScalar(cameraOffset.x * journeyParams.horizontalRange * 0.5))
            .add(upVec.clone().multiplyScalar(cameraOffset.y * journeyParams.verticalRange * 0.5));
        camera.lookAt(lookAtPosition.add(lookAtOffset));

        // --- Animate Ribbons ---
        const revealStart = cameraFollower.progress;
        const revealEnd = (cameraFollower.progress + journeyParams.revealDistance) % 1.0;
        ribbons.forEach(r => {
            r.setRevealWindow(revealStart, revealEnd);
            
            // Animate the seed for individual flowing motion
            const baseSpeed = 1.0;
            const effectiveSpeedMultiplier = THREE.MathUtils.lerp(baseSpeed, r.animationSpeed, journeyParams.animationIndividuality);
            r.material.uniforms.uSeed.value = r.initialSeed + elapsedTime * effectiveSpeedMultiplier * journeyParams.masterAnimationSpeed;
        });

        // --- Animate Text ---
        textObjects.forEach(text => {
            const distance = camera.position.distanceTo(text.position);
            const opacity = 1.0 - THREE.MathUtils.smoothstep(distance, journeyParams.textFadeDistance, journeyParams.textFadeDistance + 5.0);
            text.fillOpacity = opacity;
            text.lookAt(camera.position);
        });

        composer.render();
    }

    animate();
}
