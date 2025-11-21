
import * as THREE from 'three';

export type RingState = 'active' | 'collected';

export class Ring {
    public mesh: THREE.Mesh;
    public state: RingState = 'active';
    public type: string;
    public position: THREE.Vector3;

    private activeMaterial: THREE.Material;
    private collectedMaterial: THREE.Material;

    constructor(position: THREE.Vector3, type: string, tangent: THREE.Vector3) {
        this.position = position;
        this.type = type;

        const geometry = new THREE.TorusGeometry(3, 0.5, 16, 100);
        this.activeMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00, wireframe: true });
        this.collectedMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true, transparent: true, opacity: 0.5 });

        this.mesh = new THREE.Mesh(geometry, this.activeMaterial);
        this.mesh.position.copy(position);

        // Orient the ring to face the direction of the path
        this.mesh.lookAt(position.clone().add(tangent));
    }

    public collect() {
        if (this.state === 'active') {
            this.state = 'collected';
            this.mesh.material = this.collectedMaterial;
            // Here we could trigger more effects, like a particle burst or sound
            console.log(`Ring of type '${this.type}' collected!`);
        }
    }
}
