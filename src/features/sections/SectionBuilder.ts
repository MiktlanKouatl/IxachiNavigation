import { SectionData } from './types/SectionData';
import { ScreenData, SceneElementData, AnimationStep, AnimationMode } from '../../waypoint/types/WaypointContentData';
import { Vector3 } from 'three';

/**
 * Fluent API builder for creating SectionData.
 */
export class SectionBuilder {
    private section: SectionData;
    private currentScreenId: string | null = null;

    constructor(id: string) {
        this.section = {
            id,
            screens: [],
            animations: {
                mode: 'trigger', // Default
                steps: []
            }
        };
    }

    /**
     * Adds a new screen to the section and sets it as the current active screen for adding elements.
     */
    public addScreen(id: string): this {
        const screen: ScreenData = {
            id,
            elements: []
        };
        this.section.screens.push(screen);
        this.currentScreenId = id;
        return this;
    }

    /**
     * Adds a text element to the current screen.
     */
    public addText(id: string, content: string, position: { x: number, y: number, z: number }, options?: Partial<SceneElementData>): this {
        this.ensureScreen();
        const element: SceneElementData = {
            id,
            type: 'text',
            content,
            transform: {
                position,
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            ...options
        };
        this.getCurrentScreen().elements.push(element);
        return this;
    }

    /**
     * Adds a 3D model element to the current screen.
     */
    public addModel(id: string, url: string, position: { x: number, y: number, z: number }, options?: Partial<SceneElementData>): this {
        this.ensureScreen();
        const element: SceneElementData = {
            id,
            type: 'model',
            url,
            transform: {
                position,
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            ...options
        };
        this.getCurrentScreen().elements.push(element);
        return this;
    }

    /**
     * Adds an image element to the current screen.
     */
    public addImage(id: string, url: string, position: { x: number, y: number, z: number }, options?: Partial<SceneElementData>): this {
        this.ensureScreen();
        const element: SceneElementData = {
            id,
            type: 'image',
            url,
            transform: {
                position,
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            ...options
        };
        this.getCurrentScreen().elements.push(element);
        return this;
    }

    /**
     * Configures the animation mode (scrub or trigger).
     */
    public setAnimationMode(mode: AnimationMode, exitBehavior: 'reverse' | 'reset' | 'none' = 'reverse'): this {
        if (!this.section.animations) {
            this.section.animations = { mode, steps: [] };
        }
        this.section.animations.mode = mode;
        this.section.animations.exitBehavior = exitBehavior;
        return this;
    }

    /**
     * Adds an animation step.
     */
    public addAnimation(step: AnimationStep): this {
        if (!this.section.animations) {
            this.section.animations = { mode: 'trigger', steps: [] };
        }
        this.section.animations.steps.push(step);
        return this;
    }

    /**
     * Builds and returns the SectionData.
     */
    public build(): SectionData {
        return this.section;
    }

    private ensureScreen(): void {
        if (!this.currentScreenId) {
            this.addScreen('default');
        }
    }

    private getCurrentScreen(): ScreenData {
        return this.section.screens.find(s => s.id === this.currentScreenId)!;
    }
}
