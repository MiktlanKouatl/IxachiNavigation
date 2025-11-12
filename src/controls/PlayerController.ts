import * as THREE from 'three';

export class PlayerController {
    // --- Public properties for camera and trail to follow ---
    public position: THREE.Vector3;
    public orientation: THREE.Quaternion;

    // --- Physics properties ---
    public velocity: THREE.Vector3;
    private acceleration: number = 80.0;
    private drag: number = 1.5;
    private turnSpeed: number = 2.5; // Radians per second for yaw
    private rollSpeed: number = 3.0; // Radians per second for roll

    // --- Input state ---
    private keys: { [key: string]: boolean } = {
        w: false, s: false, a: false, d: false, q: false, e: false,
    };

    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.orientation = new THREE.Quaternion();
        this.velocity = new THREE.Vector3(0, 0, 0);

        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    private onKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
        }
    }

    private onKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
    }

    public getForwardVector(): THREE.Vector3 {
        // The default forward vector in Three.js is (0, 0, -1)
        return new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
    }

    public update(deltaTime: number): void {
        // --- Rotation ---
        const yawDelta = (this.keys.a ? 1 : 0) - (this.keys.d ? 1 : 0);
        const rollDelta = (this.keys.q ? 1 : 0) - (this.keys.e ? 1 : 0);

        // Create rotation quaternions based on input
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), // World Y axis for yaw
            yawDelta * this.turnSpeed * deltaTime
        );
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1), // Local Z axis for roll
            rollDelta * this.rollSpeed * deltaTime
        );

        // Apply rotations: yaw is applied globally, roll is applied locally
        this.orientation.premultiply(yawQuat);
        this.orientation.multiply(rollQuat);
        this.orientation.normalize();

        // --- Translation ---
        const thrust = (this.keys.w ? 1 : 0) - (this.keys.s ? 1 : 0);
        const forwardVector = this.getForwardVector();
        const thrustForce = forwardVector.multiplyScalar(thrust * this.acceleration * deltaTime);

        // Apply thrust and drag
        this.velocity.add(thrustForce);
        this.velocity.multiplyScalar(1 - this.drag * deltaTime); // Apply drag

        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    }

    public dispose(): void {
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
    }
}