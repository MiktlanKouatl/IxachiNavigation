import { EventEmitter } from '../../../core/EventEmitter';
import { SectionData } from '../types/SectionData';
import { SectionBuilder } from '../SectionBuilder';
import { SectionRegistry } from '../SectionRegistry';
import { SceneElementData, ScreenData } from '../../waypoint/types/WaypointContentData';

export class SectionEditorStore extends EventEmitter {
    private static instance: SectionEditorStore;

    private sections: Map<string, SectionData> = new Map();
    private activeSectionId: string | null = null;
    private activeScreenId: string | null = null;
    private activeElementId: string | null = null;

    private constructor() {
        super();
    }

    public static getInstance(): SectionEditorStore {
        if (!SectionEditorStore.instance) {
            SectionEditorStore.instance = new SectionEditorStore();
        }
        return SectionEditorStore.instance;
    }

    // --- Actions ---

    public createSection(id: string): void {
        const newSection = new SectionBuilder(id)
            .addScreen('main')
            .addText('title', 'New Section', { x: 0, y: 0, z: 0 }, { style: { color: '#00ff00', fontSize: 1 } })
            .build();
        this.sections.set(id, newSection);
        SectionRegistry.register(newSection);
        this.emit('sectionsUpdated', Array.from(this.sections.values()));
        this.selectSection(id);
    }

    public selectSection(id: string | null): void {
        this.activeSectionId = id;
        this.activeScreenId = null;
        this.activeElementId = null;

        if (id) {
            const section = this.sections.get(id);
            if (section && section.screens.length > 0) {
                this.activeScreenId = section.screens[0].id;
            }
        }

        this.emit('selectionChanged', { sectionId: id });
    }

    public selectScreen(id: string | null): void {
        this.activeScreenId = id;
        this.activeElementId = null;
        this.emit('selectionChanged', { screenId: id });
    }

    public selectElement(id: string | null): void {
        this.activeElementId = id;
        this.emit('selectionChanged', { elementId: id });
    }

    public addElementToCurrentScreen(element: SceneElementData): void {
        const screen = this.getCurrentScreen();
        if (screen) {
            screen.elements.push(element);
            this.emit('sectionUpdated', this.getCurrentSection());
            this.emit('elementAdded', element);
        }
    }

    public updateElement(elementId: string, updates: Partial<SceneElementData>): void {
        const screen = this.getCurrentScreen();
        if (!screen) return;

        const element = screen.elements.find(e => e.id === elementId);
        if (element) {
            Object.assign(element, updates);
            this.emit('sectionUpdated', this.getCurrentSection());
            this.emit('elementUpdated', element);
        }
    }

    public deleteElement(elementId: string): void {
        const screen = this.getCurrentScreen();
        if (!screen) return;

        const index = screen.elements.findIndex(e => e.id === elementId);
        if (index !== -1) {
            const element = screen.elements[index];
            screen.elements.splice(index, 1);

            if (this.activeElementId === elementId) {
                this.selectElement(null);
            }

            this.emit('sectionUpdated', this.getCurrentSection());
            // We can emit a specific event or just rely on sectionUpdated. 
            // For the factory to remove it, we might need a specific event or the factory needs to diff.
            // Let's emit 'elementDeleted' so the UI/Factory can react specifically.
            this.emit('elementDeleted', element);
        }
    }

    // --- Getters ---

    public getSections(): SectionData[] {
        return Array.from(this.sections.values());
    }

    public getCurrentSection(): SectionData | undefined {
        return this.activeSectionId ? this.sections.get(this.activeSectionId) : undefined;
    }

    public getCurrentScreen(): ScreenData | undefined {
        const section = this.getCurrentSection();
        return section?.screens.find(s => s.id === this.activeScreenId);
    }

    public getCurrentElement(): SceneElementData | undefined {
        const screen = this.getCurrentScreen();
        return screen?.elements.find(e => e.id === this.activeElementId);
    }

    public loadSection(section: SectionData): void {
        this.sections.set(section.id, section);
        SectionRegistry.register(section);
        this.emit('sectionsUpdated', Array.from(this.sections.values()));
    }
}
