// src/ixachi/utils/SVGParser.ts

import * as THREE from 'three';
import { SVGLoader, SVGResultPaths } from 'three/examples/jsm/loaders/SVGLoader.js';

export class SVGParser {
  private loader = new SVGLoader();

  /**
   * Carga un archivo SVG y extrae los puntos de sus trazados.
   * @param url La ruta al archivo .svg
   * @param divisions El número de puntos en que se dividirá cada curva. Más divisiones = más suave.
   * @returns Una promesa que se resuelve con un array de arrays de Vector3. Cada array interno es un trazado.
   */
  public async getPointsFromSVG(url: string, divisions: number = 20): Promise<THREE.Vector3[][]> {
    console.log(`⏳ Cargando SVG desde: ${url}`);
    
    // El proceso de carga es asíncrono, por eso usamos async/await.
    const data = await this.loader.loadAsync(url);
    
    const allPathsPoints: THREE.Vector3[][] = [];

    // Un SVG puede tener múltiples trazados (paths).
    for (const path of data.paths) {
      const shapes = SVGLoader.createShapes(path as unknown as SVGResultPaths);

      // Cada trazado puede tener múltiples formas (shapes).
      for (const shape of shapes) {
        // Obtenemos los puntos de la forma. La geometría se genera a partir de las curvas.
        const pointsGeometry = new THREE.ShapeGeometry(shape);
        // Desafortunadamente, la geometría no nos da los puntos en orden.
        // Así que usamos las curvas originales de la forma.
        const pathPoints: THREE.Vector3[] = [];
        for (const curve of shape.curves) {
          // Obtenemos los puntos 2D de la curva.
          const points2D = curve.getPoints(divisions);
          
          // 👇 CAMBIO: Convertimos cada Vector2 a Vector3.
          // Hacemos un bucle sobre los puntos 2D y creamos un nuevo Vector3
          // para cada uno, con z=0.
          for (const point2d of points2D) {
            pathPoints.push(new THREE.Vector3(point2d.x, point2d.y, 0));
          }
        }
        allPathsPoints.push(pathPoints);
      }
    }
    
    console.log(`✅ SVG cargado. ${allPathsPoints.length} trazados encontrados.`);
    return allPathsPoints;
  }
}