import * as THREE from 'three';
import GUI from 'lil-gui';

// This scene demonstrates a robust "chase camera" implementation for a free-moving object.
// The camera smoothly follows the player, and its look-at point is dynamically calculated
// to be in front of the player, providing a stable and cinematic feel.
// This logic is inspired by the working implementation in 15_road_follower.ts.

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 24: Chase Camera Test');

    // --- Core Scene Components ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- Starfield ---
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- Player Object ---
    const playerGeometry = new THREE.BoxGeometry(1, 1, 3); // Elongated to show orientation
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(player);

    // --- Player State & Controls ---
    const keyboardState: { [key: string]: boolean } = {};
    const playerState = {
        speed: 0,
        turnRate: 0, // Yaw
        rollRate: 0, // Roll
        maxSpeed: 30.0,
    };

    window.addEventListener('keydown', (e) => { keyboardState[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { keyboardState[e.key.toLowerCase()] = false; });

    // --- Camera Configuration ---
    const cameraConfig = {
        lookAhead: 8.0,
        cameraDistance: 10.0,
        cameraHeight: 4.0,
        positionSmooth: 0.05,
        lookAtSmooth: 0.08,
        minDistance: 5.0, 
        maxDistance: 20.0, // Increased default for a wider follow range
        accelerationZone: 0.8, // Start accelerating at 80% of maxDistance
        maxCatchUpSmooth: 0.6, // The smooth factor at maxDistance for position
        maxCatchUpLookAtSmooth: 0.8, // The smooth factor at maxDistance for lookAt
    };

    // --- GUI ---
    const gui = new GUI();
    const playerFolder = gui.addFolder('Player Settings');
    playerFolder.add(playerState, 'maxSpeed', 5, 100);

    const camFolder = gui.addFolder('Camera Settings');
    camFolder.add(cameraConfig, 'lookAhead', 1, 30);
    camFolder.add(cameraConfig, 'cameraDistance', 5, 30);
    camFolder.add(cameraConfig, 'cameraHeight', 1, 20);
    camFolder.add(cameraConfig, 'positionSmooth', 0.01, 0.2);
    camFolder.add(cameraConfig, 'lookAtSmooth', 0.01, 0.2);
    const limitsFolder = gui.addFolder('Distance Limits');
    limitsFolder.add(cameraConfig, 'minDistance', 1, 10);
    limitsFolder.add(cameraConfig, 'maxDistance', 10, 50);
    limitsFolder.add(cameraConfig, 'accelerationZone', 0.5, 1.0);
    limitsFolder.add(cameraConfig, 'maxCatchUpSmooth', 0.2, 1.0);
    limitsFolder.add(cameraConfig, 'maxCatchUpLookAtSmooth', 0.2, 1.0);


    // --- Helper objects for camera logic ---
    const smoothedLookAt = new THREE.Vector3();
    // Initialize smoothedLookAt to a point in front of the player's initial position
    player.getWorldPosition(smoothedLookAt);
    smoothedLookAt.z -= cameraConfig.lookAhead;


    function updatePlayer(deltaTime: number) {
        // --- Update Rates based on Input ---
        const turnSpeed = 2.5;
        const rollSpeed = 3.0;
        const acceleration = 50.0;
        const deceleration = 0.95;

        // Yaw (A/D)
        if (keyboardState['a']) playerState.turnRate = turnSpeed;
        else if (keyboardState['d']) playerState.turnRate = -turnSpeed;
        else playerState.turnRate = 0;

        // Roll (Q/E)
        if (keyboardState['q']) playerState.rollRate = rollSpeed;
        else if (keyboardState['e']) playerState.rollRate = -rollSpeed;
        else playerState.rollRate = 0;
        
        // Thrust (W/S)
        if (keyboardState['w']) playerState.speed += acceleration * deltaTime;
        else if (keyboardState['s']) playerState.speed -= acceleration * deltaTime * 0.5;
        else playerState.speed *= deceleration; // Apply friction if no thrust

        // Clamp speed to maxSpeed
        playerState.speed = THREE.MathUtils.clamp(playerState.speed, -playerState.maxSpeed / 2, playerState.maxSpeed);

        // --- Apply Rotations ---
        const yawDelta = playerState.turnRate * deltaTime;
        const rollDelta = playerState.rollRate * deltaTime;

        // Create quaternions for yaw and roll
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawDelta);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollDelta);

        // Combine and apply rotations
        player.quaternion.multiplyQuaternions(yawQuat, player.quaternion);
        player.quaternion.multiplyQuaternions(rollQuat, player.quaternion);

        // --- Apply Movement ---
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
        player.position.add(forwardVector.multiplyScalar(playerState.speed * deltaTime));
    }

    function updateChaseCamera() {
        // 1. Calculate the ideal LOOK-AT point (in front of the player)
        const lookAtTarget = new THREE.Vector3(0, 0, -cameraConfig.lookAhead)
            .applyQuaternion(player.quaternion)
            .add(player.position);

        // 2. Calculate the ideal CAMERA position (behind and above the player)
        const cameraTarget = new THREE.Vector3(0, cameraConfig.cameraHeight, cameraConfig.cameraDistance)
            .applyQuaternion(player.quaternion)
            .add(player.position);

        // 3. Calculate dynamic smoothing factor for forward movement
        const distance = camera.position.distanceTo(player.position);
        const warningZoneStart = cameraConfig.maxDistance * cameraConfig.accelerationZone;
        let dynamicPositionSmooth = cameraConfig.positionSmooth;
        let dynamicLookAtSmooth = cameraConfig.lookAtSmooth;

        if (distance > warningZoneStart) {
            dynamicPositionSmooth = THREE.MathUtils.mapLinear(
                distance,
                warningZoneStart,
                cameraConfig.maxDistance,
                cameraConfig.positionSmooth,
                cameraConfig.maxCatchUpSmooth
            );
            dynamicLookAtSmooth = THREE.MathUtils.mapLinear(
                distance,
                warningZoneStart,
                cameraConfig.maxDistance,
                cameraConfig.lookAtSmooth,
                cameraConfig.maxCatchUpLookAtSmooth
            );
        }

        // 4. Smoothly interpolate the camera's actual position towards the target
        camera.position.lerp(cameraTarget, dynamicPositionSmooth);

        // 5. Smoothly interpolate the actual look-at point and apply it
        smoothedLookAt.lerp(lookAtTarget, dynamicLookAtSmooth);
        camera.lookAt(smoothedLookAt);
    }

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    function animate() {
        const deltaTime = clock.getDelta();
        
        updatePlayer(deltaTime);
        updateChaseCamera();

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}
