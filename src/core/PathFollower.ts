import * as THREE from 'three';
import { RibbonLine } from './RibbonLine';
import { PathGuide } from './PathGuide';

// Interfaz para la configuración del seguidor
export interface FollowerConfig {
  pathGuide: PathGuide;      // El objeto guía que seguiremos.
  ribbon: RibbonLine;        // La RibbonLine que vamos a dibujar/actualizar.
  maxLength: number;         // La longitud máxima de la estela en número de puntos.
}

export class PathFollower {
  private pathGuide: PathGuide;
  private ribbon: RibbonLine;
  private maxLength: number;

  // El "Buffer Circular" de puntos que forman la estela.
  // Lo inicializamos vacío.
  private points: THREE.Vector3[] = [];

  constructor(config: FollowerConfig) {
    this.pathGuide = config.pathGuide;
    this.ribbon = config.ribbon;
    this.maxLength = config.maxLength;

    // 🧠 Optimización: Pre-populamos nuestro array con instancias de Vector3.
    // Así, en lugar de crear un `new THREE.Vector3()` en cada fotograma (lo cual genera
    // basura y pausas en la animación), reutilizaremos estos objetos.
    for (let i = 0; i < this.maxLength; i++) {
      this.points.push(new THREE.Vector3());
    }
    
    // Al inicio, la estela no existe, así que le pasamos un array vacío
    // a la RibbonLine para que no dibuje nada.
    this.ribbon.update([]); 
  }

  /**
   * Este método se llamará en cada fotograma desde nuestro bucle de animación.
   */
  public update(): void {
    // 1. Obtenemos la posición más reciente de nuestro guía.
    const newHeadPosition = this.pathGuide.getPosition();

    // 2. Aplicamos la técnica de "Buffer Circular" para la estela.
    // Tomamos el último punto de la cola...
    const lastPoint = this.points.pop()!; 
    
    // ...lo movemos al principio del array...
    this.points.unshift(lastPoint);
    
    // ...y actualizamos su posición para que sea la nueva "cabeza" de la serpiente.
    lastPoint.copy(newHeadPosition);
    
    // 3. Le decimos a nuestra RibbonLine que se redibuje con la lista de puntos actualizada.
    this.ribbon.update(this.points);
  }
}