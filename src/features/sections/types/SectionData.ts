import { ScreenData, WaypointAnimationConfig } from '../../waypoint/types/WaypointContentData';

/**
 * Defines the content of a section, independent of its location on the track.
 */
export interface SectionData {
    id: string;
    screens: ScreenData[];
    animations?: WaypointAnimationConfig;
}
