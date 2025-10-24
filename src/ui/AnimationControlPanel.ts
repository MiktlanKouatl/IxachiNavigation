import GUI from 'lil-gui';
import { AssetManager } from '../managers/AssetManager';
import { AnimationDirector } from '../animation/AnimationDirector';

/**
 * @class AnimationControlPanel
 * @description Creates a UI panel by dynamically and recursively reading the master config from the AnimationDirector.
 * It is built to be robust, handling nested objects and logging unsupported types.
 */
export class AnimationControlPanel {
  private gui: GUI;

  constructor(assetManager: AssetManager, director: AnimationDirector) {
    this.gui = new GUI();
    this.gui.title('Ixachi Controls');

    const loadingController = this.gui.add({ loading: true }, 'loading').name('Loading Assets...').disable();

    assetManager.on('loaded', () => {
      loadingController.destroy();
      this.setupControls(director.masterConfig, this.gui);
    });
  }

  /**
   * Recursively builds the lil-gui panel from a configuration object.
   * @param configObject The object to build the GUI from.
   * @param parentFolder The parent GUI or folder to attach controls to.
   * @param depth The current recursion depth, to prevent infinite loops.
   */
  private setupControls(configObject: { [key: string]: any }, parentFolder: GUI, depth: number = 0): void {
    if (depth > 5) {
      console.warn('[AnimationControlPanel] Max recursion depth reached. Stopping GUI creation for this branch.', parentFolder);
      return; // Safety break
    }

    for (const key in configObject) {
      if (key.startsWith('_')) continue; // Skip private-like properties

      const value = configObject[key];

      // If it's a nested object, recurse into it by creating a sub-folder
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const subFolder = parentFolder.addFolder(key);
        this.setupControls(value, subFolder, depth + 1);
      } else {
        // Otherwise, try to add a control for simple types
        const controller = parentFolder.add(configObject, key);

        // lil-gui returns undefined if it can't handle the type. Log this case.
        if (controller === undefined) {
          console.log(`[AnimationControlPanel] Skipping parameter '${key}': lil-gui does not support this type ('${typeof value}').`);
        }
      }
    }
  }
}