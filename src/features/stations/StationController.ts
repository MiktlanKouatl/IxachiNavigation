import * as THREE from 'three';
import { Monolith } from './Monolith';
import { SectionRegistry } from '../sections/SectionRegistry';
import { WaypointRuntime } from '../waypoint/WaypointRuntime';
import { PathController } from '../../core/pathing/PathController'; // Not strictly needed if we don't use path progress
import stationData from '../../data/tracks/mandala_stations.json';
import sectionData from '../../data/sections/prescenica_sections.json';

export class StationController {
    private scene: THREE.Scene;
    private stations: Monolith[] = [];
    private activeStation: Monolith | null = null;
    private activeRuntime: WaypointRuntime | null = null;

    // Interaction State
    private isConnected: boolean = false;

    private disconnectCooldown: number = 0;

    public get isConnectedToStation(): boolean {
        return this.isConnected;
    }

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.init();
    }

    private init(): void {
        // 1. Register Sections
        sectionData.forEach((section: any) => {
            SectionRegistry.register(section);
        });

        // 2. Create Stations
        stationData.forEach((config: any) => {
            const station = new Monolith(config);
            this.scene.add(station.mesh);
            this.stations.push(station);
        });
    }

    public update(playerPos: THREE.Vector3, time: number): { connected: boolean, targetPos?: THREE.Vector3 } {
        let connectionState = { connected: false, targetPos: undefined as THREE.Vector3 | undefined };

        // Update cooldown
        if (this.disconnectCooldown > 0) {
            this.disconnectCooldown -= 0.016; // Approx delta
            if (this.disconnectCooldown < 0) this.disconnectCooldown = 0;
        }

        // Update all stations visuals
        this.stations.forEach(s => s.update(time));

        // Find closest station
        let closestStation: Monolith | null = null;
        let minDist = Infinity;

        for (const station of this.stations) {
            const dist = playerPos.distanceTo(station.mesh.position);
            if (dist < minDist) {
                minDist = dist;
                closestStation = station;
            }
        }

        if (closestStation) {
            // Approach Logic
            if (minDist < closestStation.approachRadius) {
                closestStation.activate();

                // Connection Logic
                // Only connect if cooldown is 0
                if (minDist < closestStation.connectRadius && this.disconnectCooldown <= 0) {
                    if (!this.isConnected || this.activeStation !== closestStation) {
                        this.connectTo(closestStation);
                    }
                    connectionState.connected = true;
                    connectionState.targetPos = closestStation.socketPosition;
                } else {
                    // In approach range but not connected
                    if (this.isConnected && this.activeStation === closestStation) {
                        this.disconnect();
                    }
                }
            } else {
                // Out of range
                closestStation.deactivate();
                if (this.isConnected && this.activeStation === closestStation) {
                    this.disconnect();
                }
            }
        }

        // Update active runtime (content)
        if (this.activeRuntime) {
            // We can pass dummy values since we are static
            this.activeRuntime.update(0.016, time, 0);
        }

        return connectionState;
    }

    private connectTo(station: Monolith): void {
        console.log(`🔌 Connected to ${station.id}`);
        this.isConnected = true;
        this.activeStation = station;
        station.setConnected(true);

        // Launch Content
        // We create a temporary WaypointRuntime to handle the screen display
        // We need a dummy PathController since WaypointRuntime expects one, 
        // but for static content it shouldn't matter much if we don't use track progress.
        // We can pass null or a dummy if strictly typed? It expects PathController.
        // Let's assume we can pass a dummy or we need to refactor WaypointRuntime.
        // For now, let's try to pass a dummy object cast as any if needed, or fix WaypointRuntime.
        // Actually, WaypointRuntime uses pathController to place the anchor. 
        // But here we want the anchor at the Station!

        // TODO: We might need to modify WaypointRuntime to accept a fixed position 
        // OR we just manually position its anchor after creation.

        // Let's create a dummy data object for WaypointRuntime
        const wpData = {
            id: `wp_${station.id}`,
            trackProgress: 0,
            disappearProgress: 1,
            sectionId: station.sectionId
        };

        // Hack: We need a PathController. 
        // We can pass the one from MandalaChapter if we had reference, 
        // but StationController doesn't have it.
        // Let's ask for it in update or constructor? 
        // For now, let's just NOT use WaypointRuntime for positioning, only for content.
        // We'll pass a mock.
        const mockPathController = {
            getPointAt: () => station.mesh.position,
            getTangentAt: () => new THREE.Vector3(0, 0, 1)
        } as any;

        this.activeRuntime = new WaypointRuntime(
            this.scene,
            mockPathController,
            wpData,
            { emit: () => { } } as any // Mock EventEmitter
        );

        // Force anchor position to station (though mockPathController does this)
        // The WaypointRuntime constructor calls activate() -> showScreen()
    }

    public disconnect(): void {
        if (!this.activeStation) return;
        console.log(`🔌 Disconnected from ${this.activeStation.id}`);

        this.activeStation.setConnected(false);
        this.activeStation = null;
        this.isConnected = false;

        // Set Cooldown to prevent immediate reconnection
        this.disconnectCooldown = 3.0;

        if (this.activeRuntime) {
            this.activeRuntime.dispose();
            this.activeRuntime = null;
        }
    }
}
