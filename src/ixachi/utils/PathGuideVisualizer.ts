// src/ixachi/utils/PathGuideVisualizer.ts

import * as THREE from 'three';
import { PathGuide } from '../core/PathGuide';

export class PathGuideVisualizer {
  private guide: PathGuide;
  private scene: THREE.Scene;
  
  private pathMesh: THREE.Line | null = null;
  private positionMesh: THREE.Mesh | null = null;
  private directionArrow: THREE.ArrowHelper | null = null;

  constructor(guideToVisualize: PathGuide, scene: THREE.Scene) {
    this.guide = guideToVisualize;
    this.scene = scene;

    this.createPathLine();
    this.createPositionSphere();
    this.createDirectionArrow();
  }

  private createPathLine(): void {
    const points = this.guide.curve.getPoints(100); // 100 segmentos para una línea suave
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x888888 });
    this.pathMesh = new THREE.Line(geometry, material);
    this.scene.add(this.pathMesh);
  }

  private createPositionSphere(): void {
    const geometry = new THREE.SphereGeometry(0.3, 3, 3);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.positionMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.positionMesh);
  }

  private createDirectionArrow(): void {
    this.directionArrow = new THREE.ArrowHelper(this.guide.direction, this.guide.position, 3, 0xff6600);
    this.scene.add(this.directionArrow);
  }

  public update(): void {
    // En cada fotograma, simplemente leemos los datos públicos del PathGuide y actualizamos los helpers.
    if (this.positionMesh) {
      this.positionMesh.position.copy(this.guide.position);
    }
    if (this.directionArrow) {
      this.directionArrow.position.copy(this.guide.position);
      this.directionArrow.setDirection(this.guide.direction);
    }
  }

  public dispose(): void {
    // Limpia todos los objetos de la escena cuando ya no se necesiten.
    if (this.pathMesh) this.scene.remove(this.pathMesh);
    if (this.positionMesh) this.scene.remove(this.positionMesh);
    if (this.directionArrow) this.scene.remove(this.directionArrow);
  }
}