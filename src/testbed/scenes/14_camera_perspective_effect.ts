import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { PathFollower } from '../../core/pathing/PathFollower';
import { PathData } from '../../core/pathing/PathData'; // Import PathData
import { RibbonLine, RibbonConfig } from '../../core/RibbonLine'; // Import RibbonLine

/**
 * A utility function to generate an offset path around a main path, using Frenet frames.
 * This creates the illusion of lines running parallel to the main path, but with a slight offset.
 */
function generateOffsetPath(
    mainPath: THREE.CatmullRomCurve3,
    mainPathPoints: THREE.Vector3[], // Array of points used to create the mainPath
    offsetRadius: number,
    startAngle: number, // In radians
    angleVariation: number, // Max random variation to startAngle per point
    radiusVariation: number, // Max random variation to offsetRadius per point
    divisions: number = 200 // Number of segments for Frenet frames and offset path
): THREE.CatmullRomCurve3 {
    const frenetFrames = mainPath.computeFrenetFrames(divisions, false); // Compute Frenet frames
    const offsetPoints: THREE.Vector3[] = [];

    let currentAngle = startAngle;
    let currentRadius = offsetRadius;

    for (let i = 0; i < divisions; i++) {
        const t = i / (divisions - 1);
        const pointOnMainPath = mainPath.getPointAt(t);
        const normal = frenetFrames.normals[i];
        const binormal = frenetFrames.binormals[i];

        // Apply variations
        currentAngle += (Math.random() - 0.5) * angleVariation; // Random walk for angle
        currentRadius += (Math.random() - 0.5) * radiusVariation; // Random walk for radius
        currentRadius = Math.max(0.1, currentRadius); // Ensure radius doesn't go too low

        // Calculate offset vector using normal and binormal
        const offsetVector = new THREE.Vector3()
            .addScaledVector(normal, Math.cos(currentAngle) * currentRadius)
            .addScaledVector(binormal, Math.sin(currentAngle) * currentRadius);
            
        offsetPoints.push(pointOnMainPath.clone().add(offsetVector));
    }

    return new THREE.CatmullRomCurve3(offsetPoints, false, 'catmullrom', 0.5);
}

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 14: Camera Perspective Effect');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Adjusted FOV
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    // camera.position.set(0, 5, 20); // Removed: Initial position will be set by PathFollower

    // OrbitControls are useful for debugging, but we'll disable them for camera following
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false; // Disable orbit controls as camera will follow a path

    const gui = new GUI();
    // scene.add(new THREE.AxesHelper(5)); // Removed: AxesHelper causing confusion
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Test Implementation ---

    // 1. Define the Master Path
    // Create a racetrack-like path with distinct curves and straights
    const pathScale = 10; // Increased scale for a larger track
    const trackLength = 20 * pathScale;
    const trackWidth = 10 * pathScale;
    const curveRadius = 5 * pathScale;

    const masterPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0), // Start
        new THREE.Vector3(trackLength, 0, 0), // Straight
        new THREE.Vector3(trackLength + curveRadius, 0, curveRadius), // Curve start
        new THREE.Vector3(trackLength, 0, trackWidth), // Curve end
        new THREE.Vector3(0, 0, trackWidth), // Straight
        new THREE.Vector3(-curveRadius, 0, curveRadius), // Curve start
        new THREE.Vector3(0, 0, 0), // Back to start
    ], true, 'catmullrom', 0.5);

    const points = masterPath.getPoints(200); // More points for smoother path
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const pathObject = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathObject); // Visualize the master path

    // 2. Setup Camera Movement
    const masterPathData = new PathData(points, true); // Corrected: Pass points array to PathData
    const cameraFollower = new PathFollower(masterPathData, { speed: 500.0 }); // Increased speed
    
    // Create a visible marker (red sphere) that moves ahead of the camera
    const markerGeometry = new THREE.SphereGeometry(2, 16, 16); // Larger sphere
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
    scene.add(markerMesh);
    const markerFollower = new PathFollower(masterPathData, { speed: 500.0, initialProgress: 0.05 }); // Start slightly ahead

    // Initialize camera position and orientation to the start of the path
    const initialPosition = cameraFollower.position; // PathFollower initializes at progress 0
    const initialDirection = cameraFollower.direction;
    const worldUp = new THREE.Vector3(0, 1, 0);
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(initialPosition, initialPosition.clone().add(initialDirection), worldUp);
    camera.position.copy(initialPosition.clone().add(new THREE.Vector3(0, 0.5, 0))); // Camera slightly above path
    camera.quaternion.setFromRotationMatrix(tempMatrix);

    // Pre-calculate Frenet frames for camera orientation (if banking is desired later)
    // const frameCount = masterPath.points.length * 2; // More frames for smoother interpolation
    // const frenetFrames = masterPath.computeFrenetFrames(frameCount, true);

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta(); // Get deltaTime once per frame

        cameraFollower.update(deltaTime); // Corrected: Use clock.getDelta() for deltaTime
        
        const position = cameraFollower.position;
        const direction = cameraFollower.direction; // This is the tangent

        // Update camera position and orientation
        camera.position.copy(position.clone().add(new THREE.Vector3(0, 0.5, 0))); // Camera slightly above path
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.lookAt(position, position.clone().add(direction), worldUp);
        camera.quaternion.setFromRotationMatrix(tempMatrix);

        // Update marker position and orientation
        markerFollower.seek((cameraFollower.progress + 0.05) % 1); // 0.05 is an arbitrary offset
        markerMesh.position.copy(markerFollower.position);
        // Marker also looks forward with worldUp
        const markerMatrix = new THREE.Matrix4();
        markerMatrix.lookAt(markerFollower.position, markerFollower.position.clone().add(markerFollower.direction), worldUp);
        markerMesh.quaternion.setFromRotationMatrix(markerMatrix);

        controls.update(); // Update controls even if disabled, for internal state
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
