import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { PathData } from '../../core/pathing/PathData';
import { ProceduralRibbonLine, ProceduralRibbonConfig } from '../../core/ProceduralRibbonLine';
import { PathFollower } from '../../core/pathing/PathFollower';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 16: Procedural Ribbons with Camera Follower');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false; // Disabled to let the camera follow the path

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    // scene.add(new THREE.AxesHelper(10));

    // --- Master Path Creation ---
    const pathRadius = 20;
    const controlPoints = [
        new THREE.Vector3(0, 0, pathRadius),
        new THREE.Vector3(pathRadius, 5, 0),
        new THREE.Vector3(0, 0, -pathRadius),
        new THREE.Vector3(-pathRadius, -5, 0),
    ];
    const pathData = new PathData(controlPoints, true);

    // Visualize the master path
    const divisions = 200;
    const visualPathPoints = pathData.curve.getPoints(divisions);
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(visualPathPoints);
    const pathMaterial = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1, gapSize: 0.5, transparent: true, opacity: 0.5 });
    const pathObject = new THREE.Line(pathGeometry, pathMaterial);
    pathObject.computeLineDistances();
    scene.add(pathObject);

    // --- Procedural Ribbons --- 
    const ribbons: ProceduralRibbonLine[] = [];
    const numRibbons = 15;
    const colors = [
        new THREE.Color(0xff00ff), new THREE.Color(0x00ffff), new THREE.Color(0xffff00),
        new THREE.Color(0xff5500), new THREE.Color(0x00ff55), new THREE.Color(0x5500ff),
    ];

    const ribbonSettings: ProceduralRibbonConfig = {
        maxLength: divisions + 1,
        width: 0.3,
        radius: 3.0,
        radiusVariation: 1.5,
        angleFrequency: 5.0,
        radiusFrequency: 3.0,
        renderMode: 1, // Solid
        fadeStyle: 2, // FadeInOut
        fadeTransitionSize: 0.1,
    };

    for (let i = 0; i < numRibbons; i++) {
        const config: ProceduralRibbonConfig = {
            ...ribbonSettings,
            seed: Math.random() * 100,
            color: colors[i % colors.length],
            colorEnd: colors[(i + 3) % colors.length],
        };
        const ribbon = new ProceduralRibbonLine(pathData, config);
        scene.add(ribbon.mesh);
        ribbons.push(ribbon);
    }

    // --- Camera Follower ---
    const cameraFollower = new PathFollower(pathData, { speed: 15.0 });
    const cameraConfig = {
        height: 1.5,
        lookAhead: 0.01, // Look ahead on the path. A small value looks forward.
        revealDistance: 0.3, // How much of the path to reveal ahead of the camera (0 to 1)
    };

    // --- GUI ---
    const gui = new GUI();
    const ribbonFolder = gui.addFolder('Ribbons');
    ribbonFolder.add(ribbonSettings, 'width', 0.1, 2).onChange(v => ribbons.forEach(r => r.material.uniforms.uWidth.value = v));
    ribbonFolder.add(ribbonSettings, 'radius', 0, 10).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadius.value = v));
    ribbonFolder.add(ribbonSettings, 'radiusVariation', 0, 5).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadiusVariation.value = v));
    ribbonFolder.add(ribbonSettings, 'angleFrequency', 1, 20).onChange(v => ribbons.forEach(r => r.material.uniforms.uAngleFrequency.value = v));
    ribbonFolder.add(ribbonSettings, 'radiusFrequency', 1, 20).onChange(v => ribbons.forEach(r => r.material.uniforms.uRadiusFrequency.value = v));

    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(cameraFollower, 'speed', 0, 50);
    cameraFolder.add(cameraConfig, 'height', 0, 10);
    cameraFolder.add(cameraConfig, 'lookAhead', 0, 0.1);
    cameraFolder.add(cameraConfig, 'revealDistance', 0.01, 0.5);

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();

        // Update camera follower
        cameraFollower.update(deltaTime);

        // Set camera position
        const cameraPosition = cameraFollower.position.clone();
        camera.position.copy(cameraPosition);
        camera.position.y += cameraConfig.height;

        // Determine the point to look at
        const lookAtProgress = (cameraFollower.progress + cameraConfig.lookAhead) % 1.0;
        const lookAtPosition = pathData.curve.getPointAt(lookAtProgress);
        lookAtPosition.y += cameraConfig.height * 0.8; // Look slightly down
        camera.lookAt(lookAtPosition);

        // Update ribbon reveal window to follow the camera
        const revealStart = cameraFollower.progress;
        const revealEnd = (cameraFollower.progress + cameraConfig.revealDistance) % 1.0;
        ribbons.forEach(r => r.setRevealWindow(revealStart, revealEnd));

        renderer.render(scene, camera);
    }

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

