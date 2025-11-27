import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
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

    // Control Points
    const controlPoints: THREE.Mesh[] = [];
    const controlPointGroup = new THREE.Group();
    scene.add(controlPointGroup);

    const transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value;
    });
    scene.add(transformControl);

    // --- State for UI ---
    const uiState = {
        nextSegmentType: 'straight', // straight, turn, ramp
        length: 50,
        angle: 90,
        radius: 30,
        roll: 0, // Banking
        heightChange: 10,
        roadWidth: 10, // New: Road Width
        mandalaMode: false, // New: Mandala Mode
        showWireframe: false, // New: Wireframe Toggle
        autoUpdate: true,
    };

    // --- Visualization Functions ---
    function updateTrackVisuals() {
        // 1. Remove old track
        if (trackMesh) {
            scene.remove(trackMesh);
            // Dispose geometry/material if needed
            if (trackMesh instanceof THREE.Mesh) {
                trackMesh.geometry.dispose();
                if (Array.isArray(trackMesh.material)) {
                    trackMesh.material.forEach(m => m.dispose());
                } else {
                    trackMesh.material.dispose();
                }
            } else if (trackMesh instanceof THREE.Group) {
                trackMesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        child.material.dispose();
                    }
                });
            }
            scene.remove(trackMesh);
        }

        // 2. Build new path
        const path = trackBuilder.build();
        const operations = trackBuilder.getOperations();
        const allPositions: number[] = [];
        const allNormals: number[] = [];
        const allUvs: number[] = [];
        const allIndices: number[] = [];
        let vertexOffset = 0;
        const curves = path.curves;

        const addSegmentMesh = (curve: THREE.Curve<THREE.Vector3>, op: TrackOperation) => {
            const divisions = Math.max(2, Math.floor(curve.getLength() / 2));
            const points = curve.getPoints(divisions);
            const frenetFrames = curve.computeFrenetFrames(divisions, false);
            const rollRad = THREE.MathUtils.DEG2RAD * (op.roll || 0);
            const width = uiState.roadWidth;
            const halfWidth = width / 2;

            for (let i = 0; i <= divisions; i++) {
                const point = points[i];
                const tangent = frenetFrames.tangents[i];
                const normal = frenetFrames.normals[i];
                const binormal = frenetFrames.binormals[i];
                const axis = tangent.clone().normalize();
                const rotatedBinormal = binormal.clone().applyAxisAngle(axis, rollRad);
                const rotatedNormal = normal.clone().applyAxisAngle(axis, rollRad);
                const left = point.clone().add(rotatedBinormal.clone().multiplyScalar(-halfWidth));
                const right = point.clone().add(rotatedBinormal.clone().multiplyScalar(halfWidth));

                allPositions.push(left.x, left.y, left.z);
                allPositions.push(right.x, right.y, right.z);
                allNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
                allNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
                const u = i / divisions;
                allUvs.push(0, u);
                allUvs.push(1, u);
                if (i < divisions) {
                    const a = vertexOffset + i * 2;
                    const b = vertexOffset + i * 2 + 1;
                    const c = vertexOffset + (i + 1) * 2;
                    const d = vertexOffset + (i + 1) * 2 + 1;
                    allIndices.push(a, b, d);
                    allIndices.push(a, d, c);
                }
            }
            vertexOffset += (divisions + 1) * 2;
        };

        for (let i = 0; i < curves.length; i++) {
            addSegmentMesh(curves[i], operations[i] || {});
        }

        if (allPositions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
            geometry.setIndex(allIndices);
            const material = new THREE.MeshStandardMaterial({
                color: 0x00ff00, side: THREE.DoubleSide, wireframe: false, roughness: 0.4, metalness: 0.1
            });
            const baseMesh = new THREE.Mesh(geometry, material);
            const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x0044aa, transparent: true, opacity: 0.5 }));
            wireframe.visible = uiState.showWireframe;

            if (uiState.mandalaMode) {
                const group = new THREE.Group();

                // Q1
                group.add(baseMesh.clone());
                const w1 = wireframe.clone(); w1.visible = uiState.showWireframe; group.add(w1);

                // Q2 (Mirror X)
                const meshX = baseMesh.clone(); meshX.scale.set(-1, 1, 1); group.add(meshX);
                const w2 = wireframe.clone(); w2.scale.set(-1, 1, 1); w2.visible = uiState.showWireframe; group.add(w2);

                // Q3 (Mirror Z)
                const meshZ = baseMesh.clone(); meshZ.scale.set(1, 1, -1); group.add(meshZ);
                const w3 = wireframe.clone(); w3.scale.set(1, 1, -1); w3.visible = uiState.showWireframe; group.add(w3);

                // Q4 (Mirror XZ)
                const meshXZ = baseMesh.clone(); meshXZ.scale.set(-1, 1, -1); group.add(meshXZ);
                const w4 = wireframe.clone(); w4.scale.set(-1, 1, -1); w4.visible = uiState.showWireframe; group.add(w4);

                trackMesh = group;
            } else {
                const group = new THREE.Group();
                group.add(baseMesh);
                group.add(wireframe);
                trackMesh = group;
            }
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
                return { type: 'turn', angle: uiState.angle, radius: uiState.radius, roll: uiState.roll };
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
            const json = JSON.stringify(trackBuilder.getOperations(), null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'track.json';
            a.click();
            URL.revokeObjectURL(url);
        },
        bakeMandala: () => {
            // 1. Get current ops
            const ops = trackBuilder.getOperations();
            if (ops.length === 0) return;

            // 2. Clear builder
            trackBuilder.clear();

            // 3. Add Q1
            ops.forEach(op => trackBuilder.addOperation(op));

            // 4. Add Q2 (Mirror X)
            // Mirror X: x' = -x. 
            // For relative moves: 
            // Straight: Length same. Direction? 
            // Turn: Angle flips sign? 
            // Ramp: Height same.

            // We need to be careful. The builder is stateful.
            // If we just add operations, they continue from where the last one left off.
            // So we need to ensure the "End of Q1" connects to "Start of Q2".
            // In a Mandala, usually Q1 ends at (X, 0, Z) and Q2 starts there?
            // Or Q2 is a separate path?
            // The user wants a "continuous path".

            // If Q1 ends at P1, Q2 must start at P1.
            // But "Mirror X" of Q1 starts at (-Start.x, Start.y, Start.z).
            // If Start is (0,0,0), then it starts at (0,0,0).
            // So Q1 and Q2 both start at origin? That's a "Flower" shape, not a continuous loop.

            // If the user wants a LOOP, then Q1 must end where Q2 starts.
            // If Q1 goes 0 -> A. Q2 should go A -> B?
            // Symmetry usually implies:
            // Q1: 0 -> A
            // Q2: A -> B (which is Mirror of Q1?)

            // Let's assume the user has drawn a path that ends on an axis or diagonal, 
            // and they want to complete the loop.
            // Or maybe they just want 4 separate paths? "reconocer los puntos de unión... para construir el path correcto"
            // This implies connecting them.

            // Let's try to append the mirrored operations.
            // To make Q2 "continue" from Q1, we might need to transform the operations relative to the NEW heading.

            // This is hard with just "Straight/Turn".
            // Easier: Just duplicate the operations 4 times?
            // If I walk Forward, Turn Right 90. I am now facing Right.
            // If I repeat: Walk Forward (now Right), Turn Right 90 (now Back).
            // Repeat: Walk Back, Turn Right 90 (Left).
            // Repeat: Walk Left, Turn Right 90 (Forward).
            // I am back at start!

            // So "Rotational Symmetry" (90 degrees) is just repeating the operations 4 times!
            // "Mirror Symmetry" is different.

            // The user asked for "Simetria de dos ejes" (2-axis symmetry).
            // But also "Mandala".
            // And "unir los puntos".

            // If I do Mirror X, I get a shape on the other side.
            // They might not touch.

            // Let's implement "Rotational Symmetry" (Repeat 4 times) as "Bake Loop".
            // And "Mirror Symmetry" (Flip) as "Bake Mirror".

            // Given the "Mandala" context, Rotational (90 deg) is often what makes a loop.
            // Let's try repeating the operations 3 more times.

            const q2 = ops.map(op => ({ ...op, id: undefined }));
            const q3 = ops.map(op => ({ ...op, id: undefined }));
            const q4 = ops.map(op => ({ ...op, id: undefined }));

            q2.forEach(op => trackBuilder.addOperation(op));
            q3.forEach(op => trackBuilder.addOperation(op));
            q4.forEach(op => trackBuilder.addOperation(op));

            updateTrackVisuals();
            updateGhostVisuals();
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
    paramsFolder.add(uiState, 'roll', -45, 45).name('Bank Angle (Roll)').onChange(updateGhostVisuals);
    paramsFolder.add(uiState, 'heightChange', -50, 50).name('Height (Ramp)').onChange(updateGhostVisuals);

    const viewFolder = gui.addFolder('Visualization');
    viewFolder.add(uiState, 'roadWidth', 1, 50).name('Road Width').onChange(updateTrackVisuals);
    viewFolder.add(uiState, 'mandalaMode').name('Mandala Mode').onChange(updateTrackVisuals);
    viewFolder.add(uiState, 'showWireframe').name('Show Wireframe').onChange(updateTrackVisuals);

    const actionFolder = gui.addFolder('Actions');
    actionFolder.add(actions, 'addSegment').name('ADD SEGMENT');
    actionFolder.add(actions, 'undo').name('Undo');
    actionFolder.add(actions, 'clear').name('Clear All');
    actionFolder.add(actions, 'addSegment').name('ADD SEGMENT');
    actionFolder.add(actions, 'undo').name('Undo');
    actionFolder.add(actions, 'clear').name('Clear All');
    actionFolder.add(actions, 'exportJson').name('Export JSON');
    actionFolder.add(actions, 'bakeMandala').name('Bake Mandala (Loop)');

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
