import * as THREE from 'three';

export interface SpatialItem<T> {
    position: THREE.Vector3;
    data: T;
}

export class SpatialGrid<T> {
    private cellSize: number;
    private grid: Map<string, SpatialItem<T>[]> = new Map();

    constructor(cellSize: number = 10) {
        this.cellSize = cellSize;
    }

    public add(position: THREE.Vector3, data: T): void {
        const key = this.getKey(position);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)!.push({ position, data });
    }

    public getNearby(position: THREE.Vector3): SpatialItem<T>[] {
        const nearby: SpatialItem<T>[] = [];
        const cx = Math.floor(position.x / this.cellSize);
        const cy = Math.floor(position.y / this.cellSize);
        const cz = Math.floor(position.z / this.cellSize);

        // Check 3x3x3 neighborhood (27 cells)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const key = `${cx + x},${cy + y},${cz + z}`;
                    const cellItems = this.grid.get(key);
                    if (cellItems) {
                        for (const item of cellItems) {
                            nearby.push(item);
                        }
                    }
                }
            }
        }
        return nearby;
    }

    public clear(): void {
        this.grid.clear();
    }

    private getKey(pos: THREE.Vector3): string {
        const x = Math.floor(pos.x / this.cellSize);
        const y = Math.floor(pos.y / this.cellSize);
        const z = Math.floor(pos.z / this.cellSize);
        return `${x},${y},${z}`;
    }
}
