import * as THREE from 'three';

export class PathGuide {
  private position: THREE.Vector3;
  private angle: number = 0;
  private radius: number;
  private speed: number;

  constructor(radius: number = 10, speed: number = 1) {
    this.radius = radius;
    this.speed = speed;
    this.position = new THREE.Vector3(this.radius, 0, 0);
  }

  /**
   * Actualiza la posición del guía en cada fotograma.
   * @param {number} deltaTime El tiempo transcurrido desde el último fotograma.
   */
  public update(deltaTime: number): void {
    this.angle += this.speed * deltaTime;
    
    this.position.x = Math.cos(this.angle) * this.radius;
    this.position.y = Math.sin(this.angle) * this.radius;
    // Mantenemos Z en 0 por simplicidad.
  }

  public getPosition(): THREE.Vector3 {
    return this.position;
  }
}