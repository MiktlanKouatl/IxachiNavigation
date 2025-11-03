declare module 'troika-three-text' {
  import * as THREE from 'three';
  export class Text extends THREE.Object3D {
    constructor();
    font: string;
    text: string;
    fontSize: number;
    anchorX: string;
    anchorY: string;
    fillOpacity?: number;
    material?: any;
    textRenderInfo?: any;
    sync(onUpdate?: () => void, onError?: (err: any) => void): void;
  }
}
