import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';

export type HarmonyType = 'monochromatic' | 'analogous';

// Un "Rol de Color" ahora define su tipo y, si es fijo, su valor.
type ColorRole = {
    type: 'fixed';
    value: THREE.Color;
} | {
    type: 'harmonic'; // No necesita valor, se genera al momento.
};

export interface ColorPalette {
    // Roles de color. Cada uno define su propio comportamiento.
    primary: ColorRole;
    accent: ColorRole;
    background: ColorRole; // El fondo casi siempre será fijo.
    ribbonDefault: ColorRole; // Un nuevo rol para cintas genéricas.

    // Reglas de armonía que se aplican a los roles 'harmonic'.
    harmonyBase: THREE.Color;
    harmonyType: HarmonyType;
}

const palettes: { [key: string]: ColorPalette } = {
    'NaranjaIxachi': {
        primary: { type: 'fixed', value: new THREE.Color('#FFFFFF') }, // Logo siempre blanco
        accent: { type: 'fixed', value: new THREE.Color('#FFDDC1') },
        background: { type: 'fixed', value: new THREE.Color('#111111') },
        ribbonDefault: { type: 'harmonic' }, // Las cintas genéricas serán armónicas
        harmonyBase: new THREE.Color('#FF8C00'),
        harmonyType: 'monochromatic',
    },
    'BosqueEncantado': {
        primary: { type: 'harmonic' }, // ¡El logo ahora tendrá colores dinámicos!
        accent: { type: 'fixed', value: new THREE.Color('#F0E68C') }, // Acento dorado
        background: { type: 'fixed', value: new THREE.Color('#011C01') }, // Verde muy oscuro
        ribbonDefault: { type: 'harmonic' },
        harmonyBase: new THREE.Color('#2E8B57'), // Verde mar como base
        harmonyType: 'analogous',
    }
};

export class ColorManager extends EventEmitter {
    private currentPalette: ColorPalette;

    constructor(initialPalette: string = 'NaranjaIxachi') {
        super();
        this.currentPalette = palettes[initialPalette];
    }

    public setPalette(name: string): void {
        if (palettes[name]) {
            console.log(`🎨 Cambiando paleta de color a: ${name}`);
            this.currentPalette = palettes[name];
            this.emit('update', this.currentPalette);
        }
    }

    /**
     * API Unificada: Obtiene el color para un rol, aplicando la lógica
     * definida en la paleta (fijo o armónico).
     */
    public getColor(role: keyof Omit<ColorPalette, 'harmonyBase' | 'harmonyType'>): THREE.Color {
        const colorRole = this.currentPalette[role];

        if (colorRole.type === 'fixed') {
            return colorRole.value;
        } else { // type === 'harmonic'
            return this.generateHarmonicColor();
        }
    }

    private generateHarmonicColor(): THREE.Color {
        const baseColor = this.currentPalette.harmonyBase;
        const type = this.currentPalette.harmonyType;
        const newColor = baseColor.clone();
        const hsl = { h: 0, s: 0, l: 0 };
        newColor.getHSL(hsl);

        switch (type) {
            case 'monochromatic':
                const lightness = Math.random() * 0.4 + 0.3;
                newColor.setHSL(hsl.h, hsl.s, lightness);
                break;
            case 'analogous':
                const hueShift = (Math.random() - 0.5) * 0.1;
                newColor.setHSL((hsl.h + hueShift + 1) % 1, hsl.s, hsl.l);
                break;
        }
        return newColor;
    }
}
