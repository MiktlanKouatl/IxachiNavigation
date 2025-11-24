import * as THREE from 'three';
import { PlayerController } from './PlayerController';

/**
 * A robust "chase camera" controller.
 * This implementation is based on the approved logic from '24_chase_camera_test.ts'.
 * It follows a target (PlayerController) with smooth, cinematic motion,
 * allowing for horizontal drift during turns and dynamically adjusting smoothness
 * based on distance.
 */
export class ChaseCameraController {
    private camera: THREE.PerspectiveCamera;
    private player: PlayerController;

    // --- Configuration ---
    public config = {
        lookAhead: 8.0,
        cameraDistance: 10.0,
        cameraHeight: 4.0,
        positionSmooth: 0.05,
        lookAtSmooth: 0.08,
        rotationSmooth: 0.05,
        minDistance: 5.0,
        maxDistance: 20.0,
        accelerationZone: 0.8,
        maxCatchUpSmooth: 0.6,
        maxCatchUpLookAtSmooth: 0.8,
        maxCatchUpRotationSmooth: 0.8,
        horizontalDriftFactor: 0.5,
    };

    // --- Private State ---
    private smoothedLookAt: THREE.Vector3;
    private smoothedPlayerQuaternion: THREE.Quaternion;

    constructor(camera: THREE.PerspectiveCamera, player: PlayerController) {
        this.camera = camera;
        this.player = player;

        this.smoothedLookAt = new THREE.Vector3();
        this.smoothedPlayerQuaternion = new THREE.Quaternion();

        // Initialize to player's starting state
        this.smoothedPlayerQuaternion.copy(this.player.quaternion);
        this.smoothedLookAt.copy(this.player.position).add(new THREE.Vector3(0, 0, -this.config.lookAhead));
    }

    public update(): void {
        // Calculate dynamic smoothing factors based on distance
        const distance = this.camera.position.distanceTo(this.player.position);
        const warningZoneStart = this.config.maxDistance * this.config.accelerationZone;

        let dynamicPositionSmooth = this.config.positionSmooth;
        let dynamicLookAtSmooth = this.config.lookAtSmooth;
        let dynamicRotationSmooth = this.config.rotationSmooth;

        if (distance > warningZoneStart) {
            const factor = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(
                distance,
                warningZoneStart,
                this.config.maxDistance,
                0, 1 // 0% to 100% of the way through the warning zone
            ), 0, 1);

            dynamicPositionSmooth = THREE.MathUtils.lerp(this.config.positionSmooth, this.config.maxCatchUpSmooth, factor);
            dynamicLookAtSmooth = THREE.MathUtils.lerp(this.config.lookAtSmooth, this.config.maxCatchUpLookAtSmooth, factor);
            dynamicRotationSmooth = THREE.MathUtils.lerp(this.config.rotationSmooth, this.config.maxCatchUpRotationSmooth, factor);
        }

        // 1. Smoothly slerp the camera's rotational frame of reference
        this.smoothedPlayerQuaternion.slerp(this.player.quaternion, dynamicRotationSmooth);

        // 2. Calculate the ideal LOOK-AT point
        const lookAtTarget = new THREE.Vector3(0, 0, -this.config.lookAhead)
            .applyQuaternion(this.smoothedPlayerQuaternion)
            .add(this.player.position);

        // 3. Calculate the ideal CAMERA position
        const cameraTarget = new THREE.Vector3(0, this.config.cameraHeight, this.config.cameraDistance)
            .applyQuaternion(this.smoothedPlayerQuaternion)
            .add(this.player.position);

        // Apply horizontal drift to the cameraTarget
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.smoothedPlayerQuaternion);
        const horizontalOffsetAmount = -this.player.turnRate * this.config.horizontalDriftFactor;
        cameraTarget.add(rightVector.multiplyScalar(horizontalOffsetAmount));

        // 4. Smoothly interpolate the camera's actual position towards the target
        this.camera.position.lerp(cameraTarget, dynamicPositionSmooth);

        // 5. Smoothly interpolate the actual look-at point and apply it
        this.smoothedLookAt.lerp(lookAtTarget, dynamicLookAtSmooth);
        this.camera.lookAt(this.smoothedLookAt);
    }
}
