import { GUI } from 'lil-gui';
import { WaypointContentData } from '../features/waypoint/types/WaypointContentData';
import { WaypointContentManager } from '../features/waypoint/WaypointContentManager';

export class WaypointContentEditorUI {
    private gui: GUI;
    private waypointContent: WaypointContentData;
    private waypointContentManager: WaypointContentManager;

    constructor(waypointContent: WaypointContentData, waypointContentManager: WaypointContentManager) {
        this.waypointContent = waypointContent;
        this.waypointContentManager = waypointContentManager;
        this.gui = new GUI();
        this.gui.title('Waypoint Content Editor');

        this.addControls();
    }

    private addControls(): void {
        const folder = this.gui.addFolder('Waypoint Content');
        folder.add(this.waypointContent, 'id').disable(); // ID should not be editable

        let duration = this.waypointContent.disappearProgress - this.waypointContent.trackProgress;

        const disappearProgressController = folder.add(this.waypointContent, 'disappearProgress', 0, 1, 0.01)
            .name('Disappear Progress')
            .onChange((value) => {
                duration = value - this.waypointContent.trackProgress;
                // trackProgressController.max(value); // Optional: constrain start? Let's keep it flexible.
                this.waypointContentManager.updateWaypoint(this.waypointContent);
            });

        const trackProgressController = folder.add(this.waypointContent, 'trackProgress', 0, 1, 0.01)
            .name('Track Progress')
            .onChange((value) => {
                // Maintain duration
                this.waypointContent.disappearProgress = value + duration;
                disappearProgressController.updateDisplay();

                disappearProgressController.min(value);
                this.waypointContentManager.updateWaypoint(this.waypointContent);
            });

        const textElement = this.waypointContent.screens[0].elements.find(e => e.type === 'text');
        if (textElement) {
            const textFolder = folder.addFolder('Text Element');
            textFolder.add(textElement, 'content').name('Content').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));

            const transformFolder = textFolder.addFolder('Transform');
            transformFolder.add(textElement.transform.position, 'x', -50, 50, 0.1).name('Position X').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));
            transformFolder.add(textElement.transform.position, 'y', -50, 50, 0.1).name('Position Y').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));
            transformFolder.add(textElement.transform.position, 'z', -50, 50, 0.1).name('Position Z').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));

            transformFolder.add(textElement.transform.rotation, 'x', -180, 180, 1).name('Rotation X').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));
            transformFolder.add(textElement.transform.rotation, 'y', -180, 180, 1).name('Rotation Y').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));
            transformFolder.add(textElement.transform.rotation, 'z', -180, 180, 1).name('Rotation Z').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));

            transformFolder.add(textElement.transform.scale, 'x', 0.1, 10, 0.1).name('Scale X').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));
            transformFolder.add(textElement.transform.scale, 'y', 0.1, 10, 0.1).name('Scale Y').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));
            transformFolder.add(textElement.transform.scale, 'z', 0.1, 10, 0.1).name('Scale Z').onChange(() => this.waypointContentManager.updateWaypoint(this.waypointContent));

            transformFolder.open();
            textFolder.open();
        }

        folder.open();
    }

    public getEditedData(): WaypointContentData {
        return this.waypointContent;
    }

    public destroy(): void {
        this.gui.destroy();
    }
}
