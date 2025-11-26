import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'lil-gui';
import { TrackBuilder, TrackOperation } from '../../core/pathing/TrackBuilder';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 46: Interactive Track Builder');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(500, 50);
    scene.add(gridHelper);

    // --- Track Builder Setup ---
    const trackBuilder = new TrackBuilder();
    let trackMesh: THREE.Object3D | null = null;
    let ghostMesh: THREE.Object3D | null = null;

    // --- State for UI ---
    const uiState = {
        nextSegmentType: 'straight', // straight, turn, ramp
        length: 50,
        angle: 90,
        radius: 30,
        heightChange: 10,
        autoUpdate: true,
    };

    // --- Visualization Functions ---
    function updateTrackVisuals() {
        // 1. Remove old track
        if (trackMesh) {
            scene.remove(trackMesh);
            // Dispose geometry/material if needed
        }

        // 2. Build new path
        const path = trackBuilder.build();
        const points = path.getPoints(200);

        if (points.length > 0) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
            trackMesh = new THREE.Line(geometry, material);
            scene.add(trackMesh);
        }
    }

    function updateGhostVisuals() {
        if (ghostMesh) {
            scene.remove(ghostMesh);
        }

        // Create a temporary builder to simulate the next step
        const ghostBuilder = new TrackBuilder();

        // Sync start configuration
        const pos = new THREE.Vector3(startState.x, startState.y, startState.z);
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.DEG2RAD * startState.heading);
        ghostBuilder.setStart(pos, dir);

        // Replay existing operations
        trackBuilder.getOperations().forEach(op => ghostBuilder.addOperation(op));

        // Add the potential next operation
        const nextOp = createOperationFromUI();
        ghostBuilder.addOperation(nextOp);

        // Build just the last segment? Or the whole thing?
        // Let's build the whole thing but color the last part differently?
        // Easier: Get the path, take the last curve.

        const fullPath = ghostBuilder.build();
        const curves = fullPath.curves;
        if (curves.length > 0) {
            const lastCurve = curves[curves.length - 1];
            const points = lastCurve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2, transparent: true, opacity: 0.5 });
            ghostMesh = new THREE.Line(geometry, material);
            scene.add(ghostMesh);
        }
    }

    function createOperationFromUI(): TrackOperation {
        switch (uiState.nextSegmentType) {
            case 'straight':
                return { type: 'straight', length: uiState.length };
            case 'turn':
                return { type: 'turn', angle: uiState.angle, radius: uiState.radius };
            case 'ramp':
                return { type: 'ramp', length: uiState.length, heightChange: uiState.heightChange };
            default:
                return { type: 'straight', length: 10 };
        }
    }

    // --- GUI ---
    const gui = new GUI({ title: 'Track Builder' });

    const actions = {
        addSegment: () => {
            trackBuilder.addOperation(createOperationFromUI());
            updateTrackVisuals();
            updateGhostVisuals(); // Update ghost to show NEXT next
        },
        undo: () => {
            trackBuilder.undo();
            updateTrackVisuals();
            updateGhostVisuals();
        },
        clear: () => {
            trackBuilder.clear();
            updateTrackVisuals();
            updateGhostVisuals();
        },
        exportJson: () => {
            console.log(JSON.stringify(trackBuilder.getOperations(), null, 2));
            alert('Track JSON exported to console!');
        }
    };

    // --- Start Position UI ---
    const startFolder = gui.addFolder('Start Configuration');
    const startState = {
        x: 0, y: 0, z: 0,
        heading: 0 // Degrees, 0 = North (-Z)
    };

    function updateStart() {
        const pos = new THREE.Vector3(startState.x, startState.y, startState.z);
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.DEG2RAD * startState.heading);

        trackBuilder.setStart(pos, dir);
        updateTrackVisuals();
        updateGhostVisuals();
    }

    startFolder.add(startState, 'x', -200, 200).onChange(updateStart);
    startFolder.add(startState, 'y', -50, 50).onChange(updateStart);
    startFolder.add(startState, 'z', -200, 200).onChange(updateStart);
    startFolder.add(startState, 'heading', -180, 180).name('Heading (Deg)').onChange(updateStart);

    const typeFolder = gui.addFolder('Next Segment');
    typeFolder.add(uiState, 'nextSegmentType', ['straight', 'turn', 'ramp']).onChange(updateGhostVisuals);

    // Dynamic params based on type? For now just show all.
    const paramsFolder = gui.addFolder('Parameters');
    paramsFolder.add(uiState, 'length', 10, 200).name('Length (Str/Ramp)').onChange(updateGhostVisuals);
    paramsFolder.add(uiState, 'angle', -180, 180).name('Angle (Turn)').onChange(updateGhostVisuals);
    paramsFolder.add(uiState, 'radius', 10, 100).name('Radius (Turn)').onChange(updateGhostVisuals);
    paramsFolder.add(uiState, 'heightChange', -50, 50).name('Height (Ramp)').onChange(updateGhostVisuals);

    const actionFolder = gui.addFolder('Actions');
    actionFolder.add(actions, 'addSegment').name('ADD SEGMENT');
    actionFolder.add(actions, 'undo').name('Undo');
    actionFolder.add(actions, 'clear').name('Clear All');
    actionFolder.add(actions, 'exportJson').name('Export JSON');

    // Initial Visuals
    updateTrackVisuals();
    updateGhostVisuals();

    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // --- Cleanup ---
    // (Optional, if we had a proper cleanup system)
}
