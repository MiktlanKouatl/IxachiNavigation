import { GUI } from 'lil-gui';
import { WaypointContentData } from '../features/waypoint/types/WaypointContentData';

export class WaypointContentEditorUI {
    private gui: GUI;
    private waypointContent: WaypointContentData;

    constructor(waypointContent: WaypointContentData, onChange: (data: WaypointContentData) => void) {
        this.waypointContent = waypointContent;
        this.gui = new GUI();
        this.gui.title('Waypoint Content Editor');

        this.addControls(onChange);
    }

    private addControls(onChange: (data: WaypointContentData) => void): void {
        const folder = this.gui.addFolder('Waypoint Content');
        folder.add(this.waypointContent, 'id').disable(); // ID should not be editable

        folder.add(this.waypointContent, 'trackProgress', 0, 1, 0.01)
            .name('Track Progress')
            .onChange(() => onChange(this.waypointContent));

        // Add more controls for other properties of WaypointContentData later
        // For now, focus on trackProgress

        folder.open();
    }

    public getEditedData(): WaypointContentData {
        return this.waypointContent;
    }

    public destroy(): void {
        this.gui.destroy();
    }
}
