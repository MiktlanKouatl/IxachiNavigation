import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackBuilder, TrackOperation } from '../../core/pathing/TrackBuilder';
import trackData from '../../data/tracks/track_mandala_01.json';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 47: Track Loader');

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

    // --- Load Track ---
    console.log('Loading track data:', trackData);

    const trackBuilder = new TrackBuilder();

    // Add operations from JSON
    (trackData as TrackOperation[]).forEach(op => {
        trackBuilder.addOperation(op);
    });

    // Build Path
    const path = trackBuilder.build();
    const operations = trackBuilder.getOperations();

    // --- Visualize (Copied from Scene 46) ---
    // In a real app, this visualization logic should be in a reusable class (e.g., TrackVisualizer).

    const allPositions: number[] = [];
    const allNormals: number[] = [];
    const allUvs: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;
    const curves = path.curves;

    const roadWidth = 10; // Default width

    const addSegmentMesh = (curve: THREE.Curve<THREE.Vector3>, op: TrackOperation) => {
        const divisions = Math.max(2, Math.floor(curve.getLength() / 2));
        const points = curve.getPoints(divisions);
        const frenetFrames = curve.computeFrenetFrames(divisions, false);
        const rollRad = THREE.MathUtils.DEG2RAD * (op.roll || 0);
        const width = roadWidth;
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
            color: 0x00aaff, // Different color for loader
            side: THREE.DoubleSide,
            wireframe: false,
            roughness: 0.4,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Add lights to see the material
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        scene.add(dirLight);
    }

    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}
