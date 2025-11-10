import * as THREE from 'three';
import GUI from 'lil-gui';
import { PathData } from '../../core/pathing/PathData';
import { ProceduralRibbonLine, ProceduralRibbonConfig } from '../../core/ProceduralRibbonLine';
import { PathFollower } from '../../core/pathing/PathFollower';
import { Text } from 'troika-three-text';
import { RibbonLine, RibbonConfig, UseMode } from '../../core/RibbonLine';

// Extend the class slightly to hold animation properties
interface AnimatingRibbonLine extends ProceduralRibbonLine {
    initialSeed?: number;
    animationSpeed?: number;
}

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 20: Main Journey Prototype');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Path and Ribbons ---
    const controlPoints = [
                    new THREE.Vector3(0, 0, 80),
                    new THREE.Vector3(0, 0, 0),    ];
    const pathData = new PathData([controlPoints], false);
    const divisions = 200;
    const { normals, binormals } = pathData.curves[0].computeFrenetFrames(divisions, false);

    // --- Parameters & GUI ---
    const journeyParams = {
        speed: 5.9004,
        revealDistance: 0.2212,
        horizontalRange: 0.82,
        verticalRange: 0.5,
        smoothing: 0.03496,
        textFadeDistance: 8.6,
        masterAnimationSpeed: 0.06,
        animationIndividuality: 1,
        wordStartProgress: 0.217,
        wordEndProgress: 0.906,
        textVerticalOffset: 1.48,
        textFadeDuration: 5.0, // New parameter
    };

    const ribbonSettings: ProceduralRibbonConfig = {
        maxLength: divisions + 1,
        width: 0.1,
        radius: 3,
        radiusVariation: 0.2,
        angleFrequency: 0.1,
        radiusFrequency: 0.1,
    };

    const cameraFollower = new PathFollower(pathData, { speed: journeyParams.speed });

    const gui = new GUI();
    const journeyFolder = gui.addFolder('Journey');
    journeyFolder.add(journeyParams, 'speed', 0.1, 10).onChange(v => cameraFollower.setSpeed(v));
    journeyFolder.add(journeyParams, 'revealDistance', 0.1, 0.5);
    journeyFolder.add(journeyParams, 'horizontalRange', 0, 10);
    journeyFolder.add(journeyParams, 'verticalRange', 0, 10);
    journeyFolder.add(journeyParams, 'smoothing', 0.01, 0.2);
    
    const textFolder = gui.addFolder('Text');
    textFolder.add(journeyParams, 'textFadeDistance', 5, 30);
    textFolder.add(journeyParams, 'wordStartProgress', 0.0, 1.0);
    textFolder.add(journeyParams, 'wordEndProgress', 0.0, 1.0);
    textFolder.add(journeyParams, 'textVerticalOffset', -10, 10);
    textFolder.add(journeyParams, 'textFadeDuration', 0.1, 20); // New slider
    
    const ribbonFolder = gui.addFolder('Ribbons');
    ribbonFolder.add(journeyParams, 'masterAnimationSpeed', 0, 2);
    ribbonFolder.add(journeyParams, 'animationIndividuality', 0, 1);
    ribbonFolder.add(ribbonSettings, 'width', 0.1, 2).onChange(v => ribbons.forEach(r => r.material.uniforms.uWidth.value = v));
    ribbonFolder.add(ribbonSettings, 'radius', 0, 10).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadius.value = v));
    ribbonFolder.add(ribbonSettings, 'radiusVariation', 0, 5).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadiusVariation.value = v));
    ribbonFolder.add(ribbonSettings, 'angleFrequency', 0.1, 3.0).onChange(v => ribbons.forEach(r => r.material.uniforms.uAngleFrequency.value = v));
    ribbonFolder.add(ribbonSettings, 'radiusFrequency', 0.1, 3.0).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadiusFrequency.value = v));

    // --- Scene Objects ---
    const ribbons: AnimatingRibbonLine[] = [];
    for (let i = 0; i < 4; i++) {
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
        ribbon.animationSpeed = Math.random() * 0.8 + 0.6;
        scene.add(ribbon.mesh);
        ribbons.push(ribbon);
    }
    
    const hostRibbonConfig: RibbonConfig = {
        maxLength: 200,
        width: 0.8,
        color: new THREE.Color(0x00ffdd),
        useMode: UseMode.Trail,
    };
    const hostRibbon = new RibbonLine(hostRibbonConfig);
    scene.add(hostRibbon.mesh);

    const textObjects: Text[] = [];
    const words = [
        "Igual",
        "de",
        "importante",
        "que el",
        "mensaje",
        "es la",
        "forma en",
        "que lo",
        "transmites"
    ];

    function updateText() {
        textObjects.forEach(text => {
            scene.remove(text);
            text.dispose();
        });
        textObjects.length = 0;

        const start = journeyParams.wordStartProgress;
        const end = journeyParams.wordEndProgress;
        const range = end - start;

        const textChapters = words.map((word, index) => {
            const progress = start + (index / (words.length - 1)) * range;
            return { progress, text: word };
        });

        textChapters.forEach(chapter => {
            const text = new Text();
            text.text = chapter.text;
            text.fontSize = 1.5;
            text.color = 0xffffff;
            text.anchorX = 'center';
            text.material.transparent = true;
            text.fillOpacity = 0;
            const point = pathData.curves[0].getPointAt(chapter.progress);
            text.position.copy(point);
            text.position.y += journeyParams.textVerticalOffset;
            scene.add(text);
            textObjects.push(text);
            text.sync();
        });
    }
    updateText();

    // --- Controls & Listeners ---
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
    });

    // --- Animation Loop ---
    let clock = new THREE.Clock();
    let animationFrameId: number | null = null;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        cameraFollower.update(deltaTime);
        cameraOffset.lerp(mouse, journeyParams.smoothing);

        const basePosition = cameraFollower.position;
        const curveIndex = Math.floor(cameraFollower.progress * divisions);
        const normal = normals[curveIndex];
        const binormal = binormals[curveIndex];
        const rightVec = normal;
        const upVec = binormal;

        const offset = new THREE.Vector3()
            .add(rightVec.clone().multiplyScalar(cameraOffset.x * journeyParams.horizontalRange))
            .add(upVec.clone().multiplyScalar(cameraOffset.y * journeyParams.verticalRange));
        camera.position.copy(basePosition).add(offset);

        const lookAtProgress = (cameraFollower.progress + 0.05) % 1.0;
        const lookAtPosition = pathData.curves[0].getPointAt(lookAtProgress);
        const lookAtOffset = new THREE.Vector3()
            .add(rightVec.clone().multiplyScalar(cameraOffset.x * journeyParams.horizontalRange * 0.2))
            .add(upVec.clone().multiplyScalar(cameraOffset.y * journeyParams.verticalRange * 0.2));
        camera.lookAt(lookAtPosition.add(lookAtOffset));

        const revealStart = cameraFollower.progress;
        const revealEnd = (cameraFollower.progress + journeyParams.revealDistance) % 1.0;
        ribbons.forEach(r => {
            r.setRevealWindow(revealStart, revealEnd);
            const baseSpeed = 1.0;
            const effectiveSpeedMultiplier = THREE.MathUtils.lerp(baseSpeed, r.animationSpeed, journeyParams.animationIndividuality);
            r.material.uniforms.uSeed.value = r.initialSeed + elapsedTime * effectiveSpeedMultiplier * journeyParams.masterAnimationSpeed;
        });

        hostRibbon.addPoint(cameraFollower.position);

        textObjects.forEach(text => {
            const distance = camera.position.distanceTo(text.position);
            const opacity = 1.0 - THREE.MathUtils.smoothstep(distance, journeyParams.textFadeDistance, journeyParams.textFadeDistance + journeyParams.textFadeDuration);
            text.fillOpacity = opacity;
            text.lookAt(camera.position);
        });

        renderer.render(scene, camera);
    }

    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.textContent = 'Restart Animation';
        startButton.addEventListener('click', () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            updateText();
            cameraFollower.seek(0);
            hostRibbon.reset();
            clock = new THREE.Clock();
            animate();
        });
    }

    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const settingsToExport = {
                journey: journeyParams,
                ribbon: {
                    width: ribbonSettings.width,
                    radius: ribbonSettings.radius,
                    radiusVariation: ribbonSettings.radiusVariation,
                    angleFrequency: ribbonSettings.angleFrequency,
                    radiusFrequency: ribbonSettings.radiusFrequency,
                }
            };
            const settingsString = JSON.stringify(settingsToExport, null, 2);
            navigator.clipboard.writeText(settingsString).then(() => {
                console.log('Settings copied to clipboard:', settingsString);
                exportButton.textContent = 'Copied!';
                setTimeout(() => { exportButton.textContent = 'Export Settings'; }, 2000);
            }).catch(err => {
                console.error('Failed to copy settings:', err);
                exportButton.textContent = 'Error!';
                setTimeout(() => { exportButton.textContent = 'Export Settings'; }, 2000);
            });
        });
    }
}