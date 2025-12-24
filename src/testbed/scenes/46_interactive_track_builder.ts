import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GUI } from 'lil-gui';
import { TrackBuilder, TrackOperation } from '../../core/pathing/TrackBuilder';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 46: Visual Track Editor');

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

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // --- Track Builder Setup ---
    const trackBuilder = new TrackBuilder();
    let trackMesh: THREE.Object3D | null = null;
    let ghostMesh: THREE.Object3D | null = null;

    // Control Points (Nodes)
    const controlPoints: THREE.Mesh[] = [];
    const controlPointGroup = new THREE.Group();
    scene.add(controlPointGroup);

    // Selection
    const raycaster = new THREE.Raycaster();
    const pointerPos = new THREE.Vector2();
    let selectedNodeIndex: number = -1;

    const transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value;
    });
    transformControl.addEventListener('change', function () {
        // When dragging, update the track data
        if (selectedNodeIndex !== -1 && transformControl.object) {
            updateTrackFromNodeMove(selectedNodeIndex, transformControl.object.position);
        }
    });
    scene.add(transformControl);

    // --- State for UI ---
    const builderState = {
        nextSegmentType: 'straight', // straight, turn, ramp
        length: 50,
        angle: 90,
        radius: 30,
        roll: 0, // Banking
        heightChange: 0, // Default 0 for 2D layout
        roadWidth: 10,
        mandalaMode: false,
        showWireframe: false,
        lockYAxis: true, // 2D Layout Mode
        editorMode: 'layout', // layout, sculpt
        particleSector: 'full' // full, bed, roof
    };

    // --- Core Logic ---

    function updateTrackFromNodeMove(index: number, newPos: THREE.Vector3) {
        // Index 0 corresponds to the START position?
        // Let's define: Node 0 is Start. Node i is end of Op i-1.

        // If we move Node 0 (Start):
        // Update startPosition.

        // If we move Node i (End of Op i-1):
        // Op[i-1].heightChange += deltaY
        // Op[i].heightChange -= deltaY (to keep next node fixed)

        // We need to calculate delta from the PREVIOUS position of this node.
        // But TransformControls gives us absolute position.
        // Easier: Re-calculate heightChange based on absolute Y.

        // 1. Get current absolute positions of all nodes (before move)
        // Actually, we can just get the previous node's Y and next node's Y.

        // Wait, `trackBuilder` builds sequentially.
        // Node i position depends on all previous ops.
        // If we change Op[i-1], all subsequent nodes move.
        // But we want "Sculpt" behavior: Move Node i, keep Node i+1 fixed.

        // Let's get the operations.
        const ops = trackBuilder.getOperations();

        if (index === 0) {
            // Moving Start Point
            // We update startState
            startState.x = newPos.x;
            startState.y = newPos.y;
            startState.z = newPos.z;
            trackBuilder.setStart(newPos, new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.DEG2RAD * startState.heading));
            // This moves the WHOLE track. That's fine.
        } else {
            const opIndex = index - 1;
            // We are modifying ops[opIndex].
            // We want the END of ops[opIndex] to be at `newPos`.

            // But `newPos` is absolute.
            // The START of ops[opIndex] is at Node[index-1].
            // We need the position of Node[index-1].

            // Let's rebuild the track virtually to get positions.
            // Or just use the `controlPoints` meshes (assuming they were correct before drag started).
            // But `transformControl` moves the mesh LIVE.
            // So `controlPoints[index-1]` is still at its old position (unless we moved it too).

            const prevNodePos = controlPoints[index - 1].position;

            // Calculate required height change for Op[opIndex]
            // The horizontal distance is fixed (we only edit Y for now).
            // So newHeightChange = newPos.y - prevNodePos.y

            const newHeightChange = newPos.y - prevNodePos.y;

            // Update Op[opIndex]
            const op = ops[opIndex];
            // Only update if it supports heightChange
            if (op.type === 'ramp' || op.type === 'turn' || op.type === 'straight') {
                // Straight usually doesn't have heightChange in our interface, but we can add it?
                // Or we convert 'straight' to 'ramp' if height changes?
                // For now, let's assume we can add heightChange to anything or convert it.

                if (op.type === 'straight' && Math.abs(newHeightChange) > 0.01) {
                    op.type = 'ramp'; // Auto-convert
                }

                op.heightChange = newHeightChange;
            }

            // Counter-adjust Op[opIndex+1] to keep Node[index+1] fixed
            if (opIndex + 1 < ops.length) {
                const nextOp = ops[opIndex + 1];
                // We want Node[index+1] to stay at `controlPoints[index+1].position.y`.
                // Its new start is `newPos.y`.
                // So nextHeightChange = OldNextNodeY - NewPosY

                const oldNextNodeY = controlPoints[index + 1].position.y; // This might be drifting if we are in the middle of a drag?
                // TransformControls updates the object position.
                // But controlPoints[index+1] hasn't been moved by the user.

                const requiredNextHeightChange = oldNextNodeY - newPos.y;

                if (nextOp.type === 'straight' && Math.abs(requiredNextHeightChange) > 0.01) {
                    nextOp.type = 'ramp';
                }
                nextOp.heightChange = requiredNextHeightChange;
            }
        }

        // Re-render track (but don't destroy control points, just update them?)
        // If we destroy/recreate control points every frame, we lose selection.
        updateTrackVisuals(true);
    }

    function updateControlPoints(path: THREE.CurvePath<THREE.Vector3>) {
        // We need points at: Start, and end of every curve.
        // Actually, `path.curves` corresponds to operations?
        // Not 1:1 if we have 'move' ops or compound curves.
        // But `TrackBuilder` returns a CurvePath where curves roughly match ops.

        // Let's use the builder's state tracking if possible.
        // Or just place points at the end of each curve in the path.

        const curves = path.curves;
        const pointsToVisualize: THREE.Vector3[] = [];

        // Start Point
        const startPoint = path.getPoint(0);
        if (startPoint) {
            pointsToVisualize.push(startPoint);
        }

        // End of each curve
        // Note: If curves are disconnected (Move op), getPoint(1) of curve i might not be getPoint(0) of curve i+1.

        curves.forEach(curve => {
            const endPoint = curve.getPoint(1);
            if (endPoint) {
                pointsToVisualize.push(endPoint);
            }
        });

        // Sync with meshes
        // If count differs, rebuild.
        if (controlPoints.length !== pointsToVisualize.length) {
            // Clear old
            controlPoints.forEach(p => controlPointGroup.remove(p));
            controlPoints.length = 0;

            // Create new
            pointsToVisualize.forEach((pos, i) => {
                const geometry = new THREE.SphereGeometry(2, 16, 16);
                const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.copy(pos);
                mesh.userData = { index: i }; // Store index
                controlPointGroup.add(mesh);
                controlPoints.push(mesh);
            });
        } else {
            // Just update positions
            pointsToVisualize.forEach((pos, i) => {
                // If this is the selected node being dragged, don't overwrite its position from the track
                // (because the track update lags or is circular).
                // BUT, we need the visual track to follow the node.
                // Actually, TransformControls moves the node. We update the track.
                // Then we re-calculate track. The track end point SHOULD match the node position.
                // So we can overwrite.

                // Exception: Floating point errors might cause jitter.
                // Let's only update if distance is significant?
                if (selectedNodeIndex !== i) {
                    controlPoints[i].position.copy(pos);
                }
            });
        }
    }

    function updateTrackVisuals(preserveSelection = false) {
        // 1. Remove old track
        if (trackMesh) {
            scene.remove(trackMesh);
            // Dispose... (simplified for brevity)
        }

        // 2. Build new path
        const path = trackBuilder.build();

        // 3. Update Control Points
        updateControlPoints(path);

        // 4. Build Mesh
        const allPositions: number[] = [];
        // ... (Mesh generation logic same as before) ...
        // Re-using the mesh generation code from previous version

        const curves = path.curves;
        const operations = trackBuilder.getOperations();
        let vertexOffset = 0;
        const allNormals: number[] = [];
        const allUvs: number[] = [];
        const allIndices: number[] = [];

        const addSegmentMesh = (curve: THREE.Curve<THREE.Vector3>, op: TrackOperation) => {
            const divisions = Math.max(2, Math.floor(curve.getLength() / 2));
            const points = curve.getPoints(divisions);
            const frenetFrames = curve.computeFrenetFrames(divisions, false);
            const rollRad = THREE.MathUtils.DEG2RAD * (op.roll || 0);
            const width = builderState.roadWidth;
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
            // Map curve to operation? 
            // Ops might be fewer than curves if some ops generate multiple curves?
            // Or if 'move' ops generate no curves.
            // TrackBuilder.build() returns curves only for visible segments.
            // We need to match them.
            // Simplified: Assume 1:1 for straight/turn/ramp.
            // 'move' ops are skipped in build().
            // This is tricky.
            // Let's just use empty op if mismatch.
            // Or better: TrackBuilder should return metadata.
            addSegmentMesh(curves[i], {});
        }

        if (allPositions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
            geometry.setIndex(allIndices);

            const material = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide, wireframe: false });
            const baseMesh = new THREE.Mesh(geometry, material);

            if (builderState.mandalaMode) {
                const mandalaGroup = new THREE.Group();

                // Q1 (Original)
                mandalaGroup.add(baseMesh);

                // Pivot is the start position
                const pivot = new THREE.Vector3(0, 0, 0);

                // Helper to clone and rotate
                const addRotated = (angleDeg: number) => {
                    const clone = baseMesh.clone();
                    // To rotate around pivot:
                    // 1. Translate to origin (relative to pivot)
                    // 2. Rotate
                    // 3. Translate back
                    // But Mesh.geometry is baked in world coords.
                    // Easiest way: Put it in a parent, rotate parent?
                    // No, we want to add to scene.
                    // Let's use a wrapper object for rotation?
                    // Or just modify the matrix.

                    // Actually, let's just use a Group for each quadrant, set position to pivot, 
                    // add mesh (offset by -pivot), rotate group, then... wait.
                    // The mesh vertices are already in World Space.

                    // Simpler:
                    // Clone geometry, apply matrix.
                    const geo = geometry.clone();
                    geo.translate(-pivot.x, -pivot.y, -pivot.z);
                    geo.rotateY(THREE.MathUtils.DEG2RAD * angleDeg);
                    geo.translate(pivot.x, pivot.y, pivot.z);
                    const m = new THREE.Mesh(geo, material);
                    mandalaGroup.add(m);
                };

                addRotated(90);
                addRotated(180);
                addRotated(270);

                trackMesh = mandalaGroup;
            } else {
                trackMesh = baseMesh;
            }

            scene.add(trackMesh);
        }
    }

    // --- Visualization Functions ---
    function updateGhostVisuals() {
        if (ghostMesh) {
            scene.remove(ghostMesh);
            if (ghostMesh instanceof THREE.Mesh || ghostMesh instanceof THREE.Line) {
                ghostMesh.geometry.dispose();
                if (Array.isArray(ghostMesh.material)) {
                    ghostMesh.material.forEach(m => m.dispose());
                } else {
                    ghostMesh.material.dispose();
                }
            }
            ghostMesh = null;
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

        // Build the path
        const fullPath = ghostBuilder.build();
        const curves = fullPath.curves;

        if (curves.length > 0) {
            // Visualize only the LAST curve (the new one)
            const lastCurve = curves[curves.length - 1];
            // If the last op was a 'move', there might be no curve? 
            const points = lastCurve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2, transparent: true, opacity: 0.7 });
            ghostMesh = new THREE.Line(geometry, material);
            scene.add(ghostMesh);
        }
    }



    // --- Core Logic ---

    // ... (rest of functions)

    function createOperationFromUI(): TrackOperation {
        const height = builderState.lockYAxis ? 0 : builderState.heightChange;
        const config: TrackOperation = {
            type: 'straight',
            length: 10,
            particleSector: builderState.particleSector
        };

        switch (builderState.nextSegmentType) {
            case 'straight':
                config.type = 'straight';
                config.length = builderState.length;
                config.heightChange = height;
                break;
            case 'turn':
                config.type = 'turn';
                config.angle = builderState.angle;
                config.radius = builderState.radius;
                config.roll = builderState.roll;
                config.heightChange = height;
                break;
            case 'ramp':
                config.type = 'ramp';
                config.length = builderState.length;
                config.heightChange = builderState.heightChange;
                break;
        }
        return config;
    }

    // --- Interaction ---
    // Multi-selection state
    const selectedNodeIndices: Set<number> = new Set();

    const onPointerDown = (event: PointerEvent) => {
        // Calculate mouse position
        pointerPos.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointerPos.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointerPos, camera);
        const intersects = raycaster.intersectObjects(controlPoints);

        const isShift = event.shiftKey;

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            const index = selectedObject.userData.index;

            if (isShift) {
                // Toggle selection
                if (selectedNodeIndices.has(index)) {
                    selectedNodeIndices.delete(index);
                    if (selectedNodeIndex === index) {
                        transformControl.detach();
                        selectedNodeIndex = -1;
                    }
                } else {
                    selectedNodeIndices.add(index);
                    // If we select a new one, make it the "primary" for transform?
                    selectedNodeIndex = index;
                    transformControl.attach(selectedObject);
                }
            } else {
                // Single selection
                selectedNodeIndices.clear();
                selectedNodeIndices.add(index);
                selectedNodeIndex = index;
                transformControl.attach(selectedObject);
            }

            transformControl.setMode('translate');
            transformControl.showX = false; // Only Y editing for now
            transformControl.showZ = false;

        } else {
            if (!transformControl.dragging) {
                transformControl.detach();
                selectedNodeIndex = -1;
                selectedNodeIndices.clear();
            }
        }

        updateSelectionVisuals();
    };

    window.addEventListener('pointerdown', onPointerDown);

    function updateSelectionVisuals() {
        controlPoints.forEach(p => {
            const mesh = p as THREE.Mesh;
            const index = mesh.userData.index;
            if (selectedNodeIndices.has(index)) {
                // Highlight
                if (index === selectedNodeIndex) {
                    mesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Primary
                } else {
                    mesh.material = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); // Secondary
                }
            } else {
                mesh.material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Default
            }
        });
    }

    // --- Join Logic ---
    function joinSelectedNodes() {
        if (selectedNodeIndices.size !== 2) {
            console.warn("Select exactly 2 nodes to join.");
            return;
        }

        const indices = Array.from(selectedNodeIndices).sort((a, b) => a - b);
        const i = indices[0];
        const j = indices[1];

        // We expect them to be adjacent in the node list (i and i+1)
        // Node i is the End of Op i-1.
        // Node i+1 is the End of Op i.
        // Wait, Node 0 is Start. Node 1 is End of Op 0.
        // So Node i corresponds to End of Op i-1.
        // Node j (i+1) corresponds to End of Op i.

        // The "Gap" is usually caused by a 'move' operation at Op i.
        // If Op i is 'move', then Node i is the start of the gap (End of Op i-1),
        // and Node i+1 is the end of the gap (End of Op i / Start of Op i+1).

        // So we check Op[i].
        // But wait, Node indices map to:
        // 0: Start
        // 1: End of Op 0
        // 2: End of Op 1
        // ...
        // k: End of Op k-1

        // So if we select Node k and Node k+1:
        // The operation connecting them is Op k.

        if (j !== i + 1) {
            console.warn("Selected nodes must be adjacent to join.");
            return;
        }

        const opIndex = i; // Op connecting Node i and Node i+1
        const ops = trackBuilder.getOperations();

        if (opIndex >= ops.length) return;

        const op = ops[opIndex];

        if (op.type !== 'move') {
            console.warn("Selected nodes are already connected (not a 'move' operation).");
            // Optional: Allow replacing existing segments too?
            // For now, only fix gaps.
            return;
        }

        // It is a move!
        // We want to replace it with a Ramp/Straight that spans the gap.
        // The gap is from Node i to Node i+1.
        // BUT, Node i+1's position is defined by the 'move' op.
        // If we replace the 'move' with a 'ramp', the 'ramp' will start at Node i
        // and go in the current direction.
        // It will NOT necessarily end at Node i+1's current position.
        // Instead, it will create a NEW position for Node i+1.
        // And all subsequent nodes will shift to attach to this new position.
        // This effectively "pulls" the rest of the track to the join point.

        // We need to determine the Length and HeightChange of this new ramp.
        // We want the new ramp to have the SAME length/height as the gap?
        // Or do we want to just bridge it?

        // Calculate the vector of the gap
        const p1 = controlPoints[i].position;
        const p2 = controlPoints[j].position;
        const diff = new THREE.Vector3().subVectors(p2, p1);

        // Horizontal length
        const horizLen = new THREE.Vector2(diff.x, diff.z).length();
        const heightChange = diff.y;

        // Replace Op
        ops[opIndex] = {
            type: 'ramp',
            length: horizLen,
            heightChange: heightChange,
            // We can't easily set direction unless we add a Turn before it.
            // For now, we assume the direction is roughly correct or user accepts the shift.
        };

        // Refresh
        trackBuilder.clear();
        ops.forEach(o => trackBuilder.addOperation(o));
        updateTrackVisuals();
        updateGhostVisuals();

        // Clear selection
        selectedNodeIndices.clear();
        selectedNodeIndex = -1;
        transformControl.detach();
        updateSelectionVisuals();
    }

    // --- GUI ---
    const gui = new GUI({ title: 'Visual Track Editor' });

    const actions = {
        addSegment: () => {
            trackBuilder.addOperation(createOperationFromUI());
            updateTrackVisuals();
            updateGhostVisuals();
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
        joinNodes: () => {
            joinSelectedNodes();
        },
        bakeMandala: () => {
            const ops = trackBuilder.getOperations();
            if (ops.length === 0) return;

            // We assume the user designed ONE quadrant (90 degrees total turn).
            // We just repeat it 3 more times.

            // Q2
            ops.forEach(op => trackBuilder.addOperation({ ...op, id: undefined }));
            // Q3
            ops.forEach(op => trackBuilder.addOperation({ ...op, id: undefined }));
            // Q4
            ops.forEach(op => trackBuilder.addOperation({ ...op, id: undefined }));

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
        }
    };

    // --- Start Position UI ---
    const startFolder = gui.addFolder('Start Configuration');
    const startState = { x: 0, y: 0, z: 0, heading: 0 };
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
    startFolder.add(startState, 'heading', -180, 180).onChange(updateStart);

    const editorFolder = gui.addFolder('Editor Settings');
    editorFolder.add(builderState, 'lockYAxis').name('Lock Y (2D Mode)');
    editorFolder.add(builderState, 'mandalaMode').name('Mandala Mode (Visual)').onChange(() => updateTrackVisuals());
    editorFolder.add(actions, 'bakeMandala').name('BAKE MANDALA (4x Loop)');
    editorFolder.add(builderState, 'roadWidth', 1, 50).onChange(() => updateTrackVisuals());
    editorFolder.add(actions, 'joinNodes').name('Join Selected Nodes (Shift+Click)');

    const typeFolder = gui.addFolder('Add Segment');
    typeFolder.add(builderState, 'nextSegmentType', ['straight', 'turn', 'ramp']).onChange(updateGhostVisuals);
    typeFolder.add(builderState, 'length', 10, 200).onChange(updateGhostVisuals);
    typeFolder.add(builderState, 'angle', -180, 180).onChange(updateGhostVisuals);
    typeFolder.add(builderState, 'radius', 10, 100).onChange(updateGhostVisuals);
    typeFolder.add(builderState, 'heightChange', -50, 50).name('Height Delta').onChange(updateGhostVisuals);
    typeFolder.add(actions, 'addSegment').name('ADD SEGMENT');
    typeFolder.add(actions, 'undo').name('Undo Last');
    typeFolder.add(actions, 'clear').name('Clear All');
    typeFolder.add(actions, 'exportJson').name('Export JSON');

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
}