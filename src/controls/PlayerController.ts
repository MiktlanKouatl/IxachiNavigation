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
    private keyboardState: { [key:string]: boolean } = {};

    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.quaternion = new THREE.Quaternion();
        this.velocity = new THREE.Vector3(0, 0, 0);

        window.addEventListener('keydown', (e) => { this.keyboardState[e.key.toLowerCase()] = true; });
        window.addEventListener('keyup', (e) => { this.keyboardState[e.key.toLowerCase()] = false; });
    }

    public update(deltaTime: number): void {
        // --- Define constants for control responsiveness ---
        const turnSpeed = 2.5;
        const pitchSpeed = 2.0;
        const acceleration = 50.0;
        const deceleration = 0.95; // Represents friction

        // --- Update Rates based on Input ---
        // Yaw (A/D)
        if (this.keyboardState['a']) this.turnRate = turnSpeed;
        else if (this.keyboardState['d']) this.turnRate = -turnSpeed;
        else this.turnRate = 0;

        // Pitch (Q/E)
        if (this.keyboardState['q']) this.pitchRate = pitchSpeed; // Pitch up
        else if (this.keyboardState['e']) this.pitchRate = -pitchSpeed; // Pitch down
        else this.pitchRate = 0;
        
        // --- Pitch Limiting and Auto-Correction ---
        const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
        const currentPitch = euler.x;

        if (this.pitchRate === 0) { // If no user input for pitch, auto-correct to level
            if (Math.abs(currentPitch) > 0.01) {
                this.pitchRate = -currentPitch * this.pitchCorrectionSpeed;
            }
        } else { // If user is trying to pitch, check against limits
            if ((currentPitch > this.maxPitchAngle && this.pitchRate > 0) || (currentPitch < -this.maxPitchAngle && this.pitchRate < 0)) {
                this.pitchRate = 0; // Stop pitching further
            }
        }

        // --- Thrust (W/S) ---
        if (this.keyboardState['w']) this.speed += acceleration * deltaTime;
        else if (this.keyboardState['s']) this.speed -= acceleration * deltaTime * 0.5;
        else this.speed *= deceleration; // Apply friction if no thrust

        // Clamp speed
        this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed / 2, this.maxSpeed);

        // --- Apply Rotations ---
        const yawDelta = this.turnRate * deltaTime;
        const pitchDelta = this.pitchRate * deltaTime;

        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawDelta);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchDelta);

        // Combine and apply rotations
        this.quaternion.multiply(pitchQuat); // Apply pitch locally
        this.quaternion.premultiply(yawQuat); // Apply yaw in world space

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
