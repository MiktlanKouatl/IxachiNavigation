import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';

export type HarmonyType = 'monochromatic' | 'analogous';

type ColorRole = {
    type: 'fixed';
    value: THREE.Color;
} | {
    type: 'harmonic';
};

export type ColorPalette = {
    name: string; // Add a name to the palette for easier identification
    primary: ColorRole;
    accent: ColorRole;
    background: ColorRole;
    ribbonDefault: ColorRole;
    // New roles for rings
    ringEventPrimary: ColorRole;
    ringEventSecondary: ColorRole;
    ringCollectionPrimary: ColorRole;
    ringCollectionSecondary: ColorRole;
    harmonyBase: THREE.Color;
    harmonyType: HarmonyType;
}

const palettes: { [key: string]: ColorPalette } = {
    'NaranjaIxachi': {
        name: 'NaranjaIxachi',
        primary: { type: 'fixed', value: new THREE.Color('#FFFFFF') },
        accent: { type: 'fixed', value: new THREE.Color('#FFDDC1') },
        background: { type: 'fixed', value: new THREE.Color('#111111') },
        ribbonDefault: { type: 'harmonic' },
        // Ring Colors
        ringEventPrimary: { type: 'fixed', value: new THREE.Color('#FF8C00') },
        ringEventSecondary: { type: 'fixed', value: new THREE.Color('#FFDDC1') },
        ringCollectionPrimary: { type: 'fixed', value: new THREE.Color('#00FFFF') },
        ringCollectionSecondary: { type: 'fixed', value: new THREE.Color('#FFFFFF') },
        harmonyBase: new THREE.Color('#FF8C00'),
        harmonyType: 'monochromatic',
    },
    'BosqueEncantado': {
        name: 'BosqueEncantado',
        primary: { type: 'harmonic' },
        accent: { type: 'fixed', value: new THREE.Color('#F0E68C') },
        background: { type: 'fixed', value: new THREE.Color('#011C01') },
        ribbonDefault: { type: 'harmonic' },
        // Ring Colors
        ringEventPrimary: { type: 'fixed', value: new THREE.Color('#F0E68C') },
        ringEventSecondary: { type: 'fixed', value: new THREE.Color('#FFFFFF') },
        ringCollectionPrimary: { type: 'fixed', value: new THREE.Color('#2E8B57') },
        ringCollectionSecondary: { type: 'fixed', value: new THREE.Color('#98FB98') },
        harmonyBase: new THREE.Color('#2E8B57'),
        harmonyType: 'analogous',
    }
};

export class ColorManager extends EventEmitter {
    private currentPalette: ColorPalette;

    // --- Transition State ---
    private isTransitioning: boolean = false;
    private transitionProgress: number = 0;
    private transitionDuration: number = 1.5; // seconds
    private sourcePalette: ColorPalette | null = null;
    private targetPalette: ColorPalette | null = null;

    constructor(initialPalette: string = 'NaranjaIxachi') {
        super();
        this.currentPalette = palettes[initialPalette];
    }

    public setPalette(name: string): void {
        if (this.isTransitioning || !palettes[name] || this.currentPalette.name === name) {
            return;
        }

        console.log(`🎨 Iniciando transición de paleta a: ${name}`);
        this.sourcePalette = this.currentPalette;
        this.targetPalette = palettes[name];
        this.isTransitioning = true;
        this.transitionProgress = 0;
    }

    public update(deltaTime: number): void {
        if (!this.isTransitioning || !this.targetPalette) {
            return;
        }

        this.transitionProgress += deltaTime / this.transitionDuration;
        
        if (this.transitionProgress >= 1.0) {
            this.transitionProgress = 1.0;
            this.isTransitioning = false;
            this.currentPalette = this.targetPalette;
            this.sourcePalette = null;
            this.targetPalette = null;
            console.log(`✅ Transición de paleta completada.`);
        }
        
        // Emit update on every frame of the transition
        this.emit('update');
    }

    public getColor(role: keyof Omit<ColorPalette, 'harmonyBase' | 'harmonyType' | 'name'>): THREE.Color {
        if (!this.isTransitioning || !this.sourcePalette || !this.targetPalette) {
            return this.getColorFromPalette(this.currentPalette, role);
        }

        const sourceColor = this.getColorFromPalette(this.sourcePalette, role);
        const targetColor = this.getColorFromPalette(this.targetPalette, role);

        // For harmonic roles, the generated color can be different each time.
        // This can cause flickering during transitions. To make it stable, we'll
        // generate it once and cache it, but for now a direct lerp is a good first step.
        return sourceColor.clone().lerp(targetColor, this.transitionProgress);
    }
    
    private getColorFromPalette(palette: ColorPalette, role: keyof Omit<ColorPalette, 'harmonyBase' | 'harmonyType' | 'name'>): THREE.Color {
        const colorRole = palette[role];

        if (colorRole.type === 'fixed') {
            return colorRole.value;
        } else { // type === 'harmonic'
            return this.generateHarmonicColor(palette);
        }
    }

    private generateHarmonicColor(palette: ColorPalette): THREE.Color {
        const baseColor = palette.harmonyBase;
        const type = palette.harmonyType;
        const newColor = baseColor.clone();
        const hsl = { h: 0, s: 0, l: 0 };
        newColor.getHSL(hsl);

        // Use a pseudo-random but deterministic approach to avoid flickering during lerp
        const seed = hsl.h + hsl.s;
        const randomValue = Math.sin(seed) * 0.5 + 0.5; // Deterministic "random" value

        switch (type) {
            case 'monochromatic':
                const lightness = randomValue * 0.4 + 0.3; // 0.3 to 0.7
                newColor.setHSL(hsl.h, hsl.s, lightness);
                break;
            case 'analogous':
                const hueShift = (randomValue - 0.5) * 0.1; // -0.05 to +0.05
                newColor.setHSL((hsl.h + hueShift + 1) % 1, hsl.s, hsl.l);
                break;
        }
        return newColor;
    }
}
