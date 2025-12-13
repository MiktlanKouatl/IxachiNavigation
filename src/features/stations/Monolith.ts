import * as THREE from 'three';

export class Monolith {
    public mesh: THREE.Group;
    public socketPosition: THREE.Vector3;
    public id: string;
    public sectionId: string;
    public approachRadius: number;
    public connectRadius: number;

    private body: THREE.Mesh;
    private socket: THREE.Mesh;
    private glow: THREE.PointLight;
    private isActivated: boolean = false;
    private isConnected: boolean = false;

    constructor(config: any) {
        this.id = config.id;
        this.sectionId = config.sectionId;
        this.approachRadius = config.approachRadius || 30;
        this.connectRadius = config.connectRadius || 5;

        this.mesh = new THREE.Group();
        this.mesh.position.copy(config.position);

        // 1. Body (The Monolith)
        const geometry = new THREE.BoxGeometry(4, 12, 4);
        const material = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x001133,
            emissiveIntensity: 0.2
        });
        this.body = new THREE.Mesh(geometry, material);
        this.body.position.y = 6; // Sit on ground
        this.mesh.add(this.body);

        // 2. Socket (The Connection Point)
        const socketGeo = new THREE.SphereGeometry(1.5, 32, 32);
        const socketMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 1.0
        });
        this.socket = new THREE.Mesh(socketGeo, socketMat);

        // Position socket relative to body or absolute? 
        // Config has socketPosition relative to the station origin usually.
        if (config.socketPosition) {
            this.socket.position.copy(config.socketPosition);
        } else {
            this.socket.position.set(0, 8, 2); // Default front face
        }
        this.mesh.add(this.socket);

        // Store absolute socket position for the controller to use
        this.socketPosition = this.socket.position.clone().add(this.mesh.position);

        // 3. Glow Light
        this.glow = new THREE.PointLight(0x00ffff, 0, 20);
        this.glow.position.copy(this.socket.position);
        this.mesh.add(this.glow);
    }

    public activate(): void {
        if (this.isActivated) return;
        this.isActivated = true;

        // Animate Glow Up
        // Simple lerp in update would be better, but for now direct set or simple animation
        this.glow.intensity = 2;
        (this.socket.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;
        (this.socket.material as THREE.MeshStandardMaterial).color.setHex(0x00ffff);
    }

    public deactivate(): void {
        if (!this.isActivated) return;
        this.isActivated = false;
        this.isConnected = false;

        this.glow.intensity = 0;
        (this.socket.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
        (this.socket.material as THREE.MeshStandardMaterial).color.setHex(0x000000);
    }

    public setConnected(connected: boolean): void {
        this.isConnected = connected;
        if (connected) {
            (this.socket.material as THREE.MeshStandardMaterial).emissive.setHex(0x00ff00); // Green when connected
            this.glow.color.setHex(0x00ff00);
        } else {
            (this.socket.material as THREE.MeshStandardMaterial).emissive.setHex(0x00ffff); // Back to Blue
            this.glow.color.setHex(0x00ffff);
        }
    }

    public update(time: number): void {
        // Idle animation
        if (this.isActivated && !this.isConnected) {
            const pulse = Math.sin(time * 3) * 0.5 + 1.5;
            (this.socket.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
            this.glow.intensity = pulse * 2;
        }
    }
}
