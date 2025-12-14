import * as THREE from 'three';

/**
 * Manages the state and physics for a free-flying player object.
 * This implementation is based on the approved logic from '24_chase_camera_test.ts'.
 * It handles user input (keyboard) to control the player's orientation and speed.
 */
export class PlayerController {
    // --- Public State (for camera and other systems to read) ---
    public position: THREE.Vector3;
    public quaternion: THREE.Quaternion;
    public speed: number = 0;
    public turnRate: number = 0; // Yaw rate
    public pitchRate: number = 0; // Pitch rate
    public velocity: THREE.Vector3; // The direction and magnitude of movement per second

    // --- Configuration ---
    public maxSpeed: number = 30.0;
    public maxPitchAngle: number = Math.PI / 4; // 45 degrees
    public pitchCorrectionSpeed: number = 2.0;

    // --- Private Input State ---
    public keyboardState: { [key: string]: boolean } = {};

    // Mouse Control State
    private isMouseLocked: boolean = false;
    private mouseSensitivity: number = 0.002;
    private mousePitch: number = 0;
    private mouseYaw: number = 0;

    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.quaternion = new THREE.Quaternion();
        this.velocity = new THREE.Vector3(0, 0, 0);

        window.addEventListener('keydown', (e) => { this.keyboardState[e.key.toLowerCase()] = true; });
        window.addEventListener('keyup', (e) => { this.keyboardState[e.key.toLowerCase()] = false; });

        // Mouse Events
        document.addEventListener('click', () => {
            if (!this.isMouseLocked) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isMouseLocked = document.pointerLockElement === document.body;
            console.log('🔒 Mouse Lock State:', this.isMouseLocked);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isMouseLocked) {
                // Yaw (Left/Right) - affects rotation around Y axis
                this.mouseYaw -= e.movementX * this.mouseSensitivity;

                // Pitch (Up/Down) - affects rotation around X axis
                this.mousePitch -= e.movementY * this.mouseSensitivity;

                // Clamp Pitch
                this.mousePitch = Math.max(-this.maxPitchAngle, Math.min(this.maxPitchAngle, this.mousePitch));
            }
        });
    }

    public update(deltaTime: number): void {
        // --- Define constants for control responsiveness ---
        const turnSpeed = 2.5;
        const pitchSpeed = 2.0;
        const acceleration = 50.0;
        const deceleration = 0.95; // Represents friction

        // --- Update Rates based on Input ---
        // Yaw (A/D) - Keyboard is additive to mouse
        let keyboardTurnRate = 0;
        if (this.keyboardState['a']) keyboardTurnRate = turnSpeed;
        else if (this.keyboardState['d']) keyboardTurnRate = -turnSpeed;

        // Pitch (Q/E) - Keyboard is additive to mouse
        let keyboardPitchRate = 0;
        if (this.keyboardState['q']) keyboardPitchRate = pitchSpeed; // Pitch up
        else if (this.keyboardState['e']) keyboardPitchRate = -pitchSpeed; // Pitch down

        // --- Pitch Limiting and Auto-Correction ---
        // We combine mouse pitch (absolute) with keyboard pitch (rate-based)
        // Ideally, we should unify them. 
        // Strategy: Mouse sets a "Target Orientation", Keyboard modifies it?
        // Simpler Strategy: Mouse adds directly to rotation, Keyboard adds to rotation.

        // Let's apply Mouse Deltas directly to a stored Euler or Quaternion?
        // Actually, the previous logic used rates. Mouse gives us DISPLACEMENT (movementX/Y).
        // So we can just apply the displacement directly.

        // Reset rates for this frame (we calculated them above)
        this.turnRate = keyboardTurnRate;
        this.pitchRate = keyboardPitchRate;

        // --- Thrust (W/S) ---
        if (this.keyboardState['w']) this.speed += acceleration * deltaTime;
        else if (this.keyboardState['s']) this.speed -= acceleration * deltaTime * 0.5;
        else this.speed *= deceleration; // Apply friction if no thrust

        // Clamp speed
        this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed / 2, this.maxSpeed);

        // --- Apply Rotations ---
        // 1. Keyboard Rotation (Rate * DeltaTime)
        const yawDelta = this.turnRate * deltaTime;
        const pitchDelta = this.pitchRate * deltaTime;

        // 2. Apply to Accumulators
        this.mouseYaw += yawDelta;
        this.mousePitch += pitchDelta;

        // Clamp Pitch again (in case keyboard pushed it over)
        this.mousePitch = Math.max(-this.maxPitchAngle, Math.min(this.maxPitchAngle, this.mousePitch));

        // 3. Construct Quaternion from Accumulators
        // Order: Y (Yaw) then X (Pitch)
        const euler = new THREE.Euler(this.mousePitch, this.mouseYaw, 0, 'YXZ');
        this.quaternion.setFromEuler(euler);

        // --- Apply Movement ---
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
        const displacement = forwardVector.multiplyScalar(this.speed * deltaTime);
        this.position.add(displacement);

        // --- Update Velocity Vector ---
        if (deltaTime > 0) {
            this.velocity.copy(displacement).divideScalar(deltaTime);
        } else {
            this.velocity.set(0, 0, 0);
        }
    }

    public dispose(): void {
        // In a real app, you'd remove the event listeners here.
    }
}
