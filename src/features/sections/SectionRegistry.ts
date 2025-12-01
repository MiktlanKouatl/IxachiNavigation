import { SectionData } from './types/SectionData';

/**
 * Global registry for Section definitions.
 * Allows Waypoints to reference sections by ID.
 */
export class SectionRegistry {
    private static sections: Map<string, SectionData> = new Map();

    /**
     * Registers a new section definition.
     * @param section The section data to register.
     */
    public static register(section: SectionData): void {
        if (this.sections.has(section.id)) {
            console.warn(`[SectionRegistry] Overwriting existing section with id: ${section.id}`);
        }
        this.sections.set(section.id, section);
    }

    /**
     * Retrieves a section definition by ID.
     * @param id The ID of the section to retrieve.
     * @returns The SectionData or undefined if not found.
     */
    public static get(id: string): SectionData | undefined {
        return this.sections.get(id);
    }

    /**
     * Clears all registered sections.
     */
    public static clear(): void {
        this.sections.clear();
    }
}
