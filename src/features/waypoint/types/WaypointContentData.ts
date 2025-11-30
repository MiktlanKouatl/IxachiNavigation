import * as THREE from 'three';

// --- Tipos Base ---
export type Vector3Data = { x: number, y: number, z: number };

// --- I. ANIMACIÓN Y TRANSICIÓN ---
export interface AnimationConfig {
    property: 'position' | 'rotation' | 'scale' | 'opacity' | 'color';
    duration: number;
    to: Vector3Data | number; // Para position, rotation, scale, o un solo número para opacity/scale uniforme
    delay?: number;
    easing?: string; // Ej: 'power2.out' (si usamos GSAP)
}

export interface TransitionConfig {
    type: 'none' | 'fade' | 'slide-up' | 'custom';
    duration: number;
    easing: string; // Ej: 'power2.inOut'
}

// --- II. ELEMENTOS DE ESCENA (VISUALES Y LÓGICA) ---
// La unión de todos los tipos de elementos posibles en una Screen
export interface SceneElementData {
    id: string;
    type: 'text' | 'image' | 'video' | 'line' | 'model' | 'logic'; // 'logic' es el nodo sin visual

    // Solo relevante para Elementos Visuales
    content?: string; // Texto, URL del recurso o preset de partículas/línea
    anchor?: { xOffset: number, yOffset: number, zOffset: number }; // Posición relativa al punto del Track
    transform?: {
        position: Vector3Data; // Posición local relativa al Anchor
        rotation: Vector3Data;
        scale: Vector3Data;
    };
    style?: any; // Propiedades específicas de estilo (color, font, etc.)

    // Solo relevante para Elementos de Lógica (type: 'logic')
    module?: string; // Nombre de la clase del módulo a cargar (Ej: 'AttractionPhysics')
    targetElementIds?: string[]; // IDs de otros elementos en esta Screen que son el objetivo
    config?: any; // Parámetros para el módulo de lógica (Ej: {forceMultiplier: 5})

    // Comportamiento de Interacción
    interaction?: {
        trigger: 'click' | 'hover';
        action: 'goto-next-screen' | 'run-custom-function';
        payload?: any;
    };

    // Animación de entrada local (sobreescribe la Screen Transition)
    enterAnimation?: AnimationConfig;
}

// --- III. LA PANTALLA (SCREEN) ---
export interface ScreenData {
    id: string;
    trigger: 'time' | 'interaction' | 'manual';
    duration?: number; // Segundos para el trigger 'time'

    elements: SceneElementData[];

    enterTransition: TransitionConfig;
    exitTransition: TransitionConfig;
}

// --- IV. CONTENIDO DE WAYPOINT (WAYPOINT CONTENT) ---
export interface WaypointContentData {
    id: string;
    // Progreso del Path (0.0 a 1.0) para activarse
    trackProgress: number;
    disappearProgress: number; // Progreso del Path (0.0 a 1.0) para desactivarse
    behavior?: 'static' | 'follow_player'; // Comportamiento de posición en el track
    screens: ScreenData[];
    animations?: WaypointAnimationConfig;
}

export type AnimationMode = 'scrub' | 'trigger';

export interface AnimationStep {
    targetId: string; // ID of the element to animate
    method?: 'to' | 'from' | 'fromTo'; // Default 'to'
    props: any; // GSAP properties (x, y, opacity, scale, etc.)
    fromProps?: any; // Only for 'fromTo' method
    duration: number; // Relative duration (0.0 to 1.0 represents 0% to 100% of the waypoint range)
    position?: number | string; // GSAP position parameter (e.g., 0 for start, ">" for sequence, or specific time 0.9)
}

export interface WaypointAnimationConfig {
    mode: AnimationMode;
    steps: AnimationStep[];
    // For 'trigger' mode:
    exitBehavior?: 'reverse' | 'reset' | 'none';
}
