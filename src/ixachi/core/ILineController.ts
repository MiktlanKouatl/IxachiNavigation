// src/interfaces/ILineController.ts

export interface ILineController {
  // Todas nuestras estrategias deben tener un método update.
  // Algunas lo usarán para la animación (como PathFollower),
  // y otras puede que no hagan nada (como un ShapeDrawer estático).
  update(deltaTime: number, elapsedTime: number): void;
}