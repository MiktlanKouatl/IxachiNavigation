import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { PathFollower } from '../../core/pathing/PathFollower';
import { PathData } from '../../core/pathing/PathData';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 15: Road Follower');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // OrbitControls are disabled, but kept for easy debugging if needed
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;

    const gui = new GUI();
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // --- Path and Road Creation ---

    const roadLength = 100;
    const roadWidth = 10;
    // A square path
    const masterPathPoints: THREE.Vector3[] = [
        new THREE.Vector3(-roadLength / 2, 0, -roadLength / 2),
        new THREE.Vector3( roadLength / 2, 0, -roadLength / 2),
        new THREE.Vector3( roadLength / 2, 0,  roadLength / 2),
        new THREE.Vector3(-roadLength / 2, 0,  roadLength / 2),
    ];
    const masterPath = new THREE.CatmullRomCurve3(masterPathPoints, true, 'catmullrom', 0.5);
    const divisions = 200;
    const pathPoints = masterPath.getPoints(divisions);
    const masterPathData = new PathData(pathPoints, true);

    // Create visual road lines
    const roadLineMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const leftRoadPoints: THREE.Vector3[] = [];
    const rightRoadPoints: THREE.Vector3[] = [];
    const frenetFrames = masterPath.computeFrenetFrames(divisions, true); // Closed loop

    for (let i = 0; i <= divisions; i++) {
        const point = pathPoints[i];
        const binormal = frenetFrames.binormals[i];
        const offsetVector = binormal.clone().multiplyScalar(roadWidth / 2);
        leftRoadPoints.push(point.clone().sub(offsetVector));
        rightRoadPoints.push(point.clone().add(offsetVector));
    }

    const leftRoadLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftRoadPoints), roadLineMaterial);
    const rightRoadLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightRoadPoints), roadLineMaterial);
    scene.add(leftRoadLine, rightRoadLine);

    // Visualize camera path as a dotted line
    const cameraPathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const cameraPathMaterial = new THREE.LineDashedMaterial({ color: 0xff0000, dashSize: 1, gapSize: 0.5 });
    const cameraPathObject = new THREE.Line(cameraPathGeometry, cameraPathMaterial);
    cameraPathObject.computeLineDistances();
    scene.add(cameraPathObject);

    // --- Path Follower for the Camera ---
    const cameraFollower = new PathFollower(masterPathData, { speed: 20.0 });

    const cameraConfig = {
        height: 5,
        lookAhead: 1.0 // How far ahead the camera looks
    };

    gui.add(cameraConfig, 'height', 1, 20);
    gui.add(cameraConfig, 'lookAhead', 0.1, 5.0);
    gui.add(cameraFollower, 'speed', 0, 50);


    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();

        // Update the follower
        cameraFollower.update(deltaTime);

        // Set camera position
        camera.position.copy(cameraFollower.position);
        camera.position.y = cameraConfig.height;

        // Determine the point to look at
        const lookAtPosition = cameraFollower.position.clone().add(
            cameraFollower.direction.clone().multiplyScalar(cameraConfig.lookAhead)
        );
        lookAtPosition.y = cameraConfig.height * 0.8; // Look slightly down

        camera.lookAt(lookAtPosition);

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