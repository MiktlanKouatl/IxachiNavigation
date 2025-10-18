// Ruta Propuesta: src/ixachi/managers/SceneDirector.ts

import * as THREE from 'three';
import gsap from 'gsap';
import { AssetManager } from './AssetManager';
import { LoadingController } from './LoadingController';
import { LineManager } from '../LineManager';
import { SVGParser } from '../utils/SVGParser';
import { RibbonConfig, RenderMode, RibbonLine, UseMode } from '../core/RibbonLine';

// --- ESTADOS DE LA APLICACIÓN ---
// Usar un enum para los estados hace el código más legible y menos propenso a errores.
enum AppState {
  INITIALIZING, // La aplicación se está configurando.
  LOADING,      // Los assets se están cargando.
  READY,        // Todo está cargado, esperando la interacción del usuario.
  INTRO,        // La cinemática de introducción está en curso.
  // Aquí añadiremos más estados para los actos 2, 3, etc.
}
interface GroupedRibbonSystems {
    [key: string]: { ribbon: RibbonLine, progress: { value: number } }[];
}

/**
 * @class SceneDirector
 * @description Orquesta toda la experiencia cinemática, gestionando los estados
 * de la aplicación, la carga de assets y la secuencia de eventos. Es el cerebro
 * principal de la aplicación.
 */
export class SceneDirector {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera; // La necesitaremos para las animaciones
  private state: AppState;

  // Managers que el director controlará
  private assetManager: AssetManager;
  private loadingController: LoadingController;
  private lineManager: LineManager;
  private svgParser: SVGParser;

  private readonly _logoPathGroups = {
    // Ojo: circulo central, parpado, esclera
    ojo: [6, 7, 9], 
    // Manos: Las dos manos que identificaste
    manos: [3, 10], 
    // Estructura: El resto de los componentes principales del logo
    estructura: [0, 1, 2, 4, 5, 14]
  };

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    console.log('🎬 [SceneDirector] Creado.');
    this.scene = scene;
    this.camera = camera;
    this.state = AppState.INITIALIZING;

    // --- INICIALIZACIÓN DE MANAGERS ---
    this.loadingController = new LoadingController();
    this.lineManager = new LineManager(this.scene); // Creamos el line manager
    this.svgParser = new SVGParser();
    
    // Conectamos los eventos del AssetManager a los métodos de nuestro Director.
    this.assetManager = new AssetManager({
      onProgress: this.handleLoadingProgress.bind(this),
      onLoad: this.handleLoadingComplete.bind(this),
      onError: this.handleLoadingError.bind(this),
    });

    // Añadimos el contenedor del loader a la escena principal.
    this.scene.add(this.loadingController.container);
  }

  /**
   * Inicia todo el proceso de la experiencia.
   */
  public async init(): Promise<void> {
    console.log('▶️ [SceneDirector] Iniciando experiencia...');
    this.state = AppState.LOADING;

    // Mostramos el loader con su animación de entrada.
    await this.loadingController.show();
    
    // Comenzamos a cargar los recursos.
    this.assetManager.loadAll();
  }

  /**
   * Se llama en cada fotograma del bucle de animación.
   */
  public update(deltaTime: number, elapsedTime: number): void {
    // Por ahora, solo actualizamos el LineManager.
    // En el futuro, aquí se manejarán las actualizaciones específicas de cada estado.
    this.lineManager.update(deltaTime, elapsedTime);
  }

  // --- MANEJADORES DE EVENTOS DE CARGA ---

  private handleLoadingProgress(progress: number): void {
    this.loadingController.setProgress(progress);
  }

  private async handleLoadingComplete(): Promise<void> {
    console.log('🏁 [SceneDirector] Carga completa. Listo para empezar.');
    
    // Ocultamos el loader con su animación de salida.
    await this.loadingController.hide();
    
    // Liberamos los recursos del loader que ya no necesitamos.
    this.loadingController.dispose();

    // Cambiamos el estado y estamos listos para la acción.
    this.state = AppState.READY;

    // ✨ ¡AQUÍ ES DONDE LA MAGIA COMENZARÁ! ✨
    // Por ahora, iniciamos la experiencia automáticamente.
    // En el futuro, podríamos esperar un clic del usuario.
    this.startExperience();
  }

  private handleLoadingError(url: string): void {
    console.error(`❌ [SceneDirector] No se pudo cargar el recurso: ${url}. La experiencia no puede continuar.`);
    // Aquí podríamos mostrar un mensaje de error en la pantalla.
  }

  // --- CONTROL DE LA CINEMÁTICA ---

  /**
   * Da comienzo a la secuencia de actos.
   */
  public startExperience(): void {
    if (this.state !== AppState.READY) return;

    //console.log('🌌 [SceneDirector] Comenzando Acto 1: El Microcosmos.');
    //this.state = AppState.INTRO;
    console.log('🌌 [SceneDirector] Comenzando Acto 0: La Revelación.');
    this.state = AppState.INTRO;
    
    // En lugar de mostrar el modelo, llamamos a nuestra nueva función de animación.
    this._playLogoRevealAnimation();
    //this._debugPathIndicesStepByStep(); 
    //this._setupTestBench()
    
    // Aquí es donde llamaremos a la lógica del Acto 1.
    // Por ejemplo:
    // this.timelineManager.playAct1();
    // this.lineManager.createLineSwarm(...)
    // etc.
    
    // --- DEMO TEMPORAL: Crear una forma estática para verificar que todo funciona. ---
    /* const eyeModel = this.assetManager.getModel('ixachiLogo');
    eyeModel.scale.set(0.01, 0.01, 0.01); // Hacemos el modelo visible
    this.scene.add(eyeModel);
    console.log('👁️ Modelo del ojo añadido a la escena.'); */
  }
  /**
   * Orquesta y ejecuta la animación de revelación del logo.
   * @private
   */
  // Ruta: src/ixachi/managers/SceneDirector.ts
// Reemplaza este método en tu archivo

private async _playLogoRevealAnimation(): Promise<void> {
    // --- 1. Parsear y Agrupar los Trazados ---
    const svgData = this.assetManager.getSVGData('ixachiLogoPaths');
    const allLogoPaths = this.svgParser.parse(svgData);

    const groupedRibbonSystems: GroupedRibbonSystems = {
        ojo: [],
        manos: [],
        estructura: []
    };
    const allRibbons: RibbonLine[] = [];

    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0xffffff),
        width: 0.05, // Un ancho más fino y elegante para el logo
        maxLength: 800, // Un valor seguro para los trazados largos
        renderMode: RenderMode.Solid,
        useMode: UseMode.Reveal, // ¡Modo explícito para la animación de dibujado!
    };

    // --- LÓGICA DE AGRUPACIÓN ---
    Object.entries(this._logoPathGroups).forEach(([groupName, indices]) => {
        indices.forEach(pathIndex => {
            const path = allLogoPaths[pathIndex];
            if (!path) {
                console.warn(`Advertencia: Trazado con índice ${pathIndex} no encontrado.`);
                return;
            }

            // Creamos las 5 capas de extrusión
            for (let i = 0; i < 5; i++) {
                const zOffsetPath = path.map(p => p.clone().setZ(p.z + i * 0.05));
                
                const lineSystem = this.lineManager.createStaticShape(
                    { ...ribbonConfig, maxLength: path.length + 1 },
                    zOffsetPath
                );

                const ribbon = lineSystem.ribbon;
                ribbon.material.uniforms.uDrawProgress.value = 0.0;
                
                groupedRibbonSystems[groupName].push({ ribbon, progress: ribbon.material.uniforms.uDrawProgress });
                allRibbons.push(ribbon);
            }
        });
    });

    // --- 2. Coreografía por Fases con GSAP (Proxy Pattern) ---
    const tl = gsap.timeline();
    const proxyProgress = { ojo: 0, estructura: 0, manos: 0 };

    // FASE 1: Se dibuja el OJO
    tl.to(proxyProgress, {
        ojo: 1,
        duration: 2.5,
        ease: "sine.inOut",
        onUpdate: () => {
            groupedRibbonSystems.ojo.forEach(system => {
                system.ribbon.material.uniforms.uDrawProgress.value = proxyProgress.ojo;
            });
        },
    }, "start");

    // FASE 2: La ESTRUCTURA emerge
    tl.to(proxyProgress, {
        estructura: 1,
        duration: 2.5,
        ease: "power2.out",
        onUpdate: () => {
            groupedRibbonSystems.estructura.forEach(system => {
                system.ribbon.material.uniforms.uDrawProgress.value = proxyProgress.estructura;
            });
        },
    }, "start+=0.8");

    // FASE 3: Las MANOS completan la creación
    tl.to(proxyProgress, {
        manos: 1,
        duration: 2.0,
        ease: "power3.out",
        onUpdate: () => {
            groupedRibbonSystems.manos.forEach(system => {
                system.ribbon.material.uniforms.uDrawProgress.value = proxyProgress.manos;
            });
        },
    }, "start+=1.5");

    // --- 3. Materialización del Modelo 3D ---
    const logoModel = this.assetManager.getModel('ixachiLogo');
    logoModel.scale.set(0.01, 0.01, 0.01);
    this.scene.add(logoModel);

    logoModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0 });
            // Hacemos que el modelo aparezca una vez que las líneas están casi completas
            tl.to(child.material, { 
                opacity: 1, 
                duration: 2.0, 
                ease: "power2.inOut" 
            }, "start+=2.0");
        }
    });

    tl.eventCallback("onComplete", () => {
        console.log("✅ [SceneDirector] Acto 0 completado. Logo revelado.");
        // Aquí es donde, en el futuro, activaremos el listener de scroll.
    });
}

// Nota: GSAP no puede animar directamente propiedades de un objeto THREE.Color (como .r, .g, .b).
// El `_background` es un pequeño truco para darle a GSAP un objeto que sí puede animar,
// y luego usamos onUpdate para aplicar ese valor al background real de la escena.



/*
 * MODO DIRECTOR DE ARTE:
 * Dibuja cada trazado del SVG con un color único y muestra su índice en la consola.
 * Esto te permite identificar qué índice corresponde a cada parte del logo.
 * @private
 */

// --- PROPIEDADES PARA EL MODO DEPURACIÓN ---
private _debugPathIndex: number = -1;
private _allLogoPathsForDebug: THREE.Vector3[][] = [];
private _debugRibbons: RibbonLine[] = [];


/**
 * MODO DIRECTOR DE ARTE INTERACTIVO (INICIO):
 * Prepara la escena para la depuración de trazados paso a paso.
 * @private
 */
private _debugPathIndicesStepByStep(): void {
    console.log("🎨 MODO DIRECTOR DE ARTE INTERACTIVO 🎨");
    console.log("Presiona la tecla de flecha derecha (→) para avanzar al siguiente trazado.");

    const svgData = this.assetManager.getSVGData('ixachiLogoPaths');
    this._allLogoPathsForDebug = this.svgParser.parse(svgData);

    // Bindeamos la función del teclado para poder añadirla y quitarla correctamente
    this._handleDebugKeyDown = this._handleDebugKeyDown.bind(this);
    window.addEventListener('keydown', this._handleDebugKeyDown);

    // Iniciamos mostrando el primer trazado
    this._advanceDebugStep();
}

/**
 * Maneja los eventos de teclado para el modo de depuración.
 * @private
 */
private _handleDebugKeyDown(event: KeyboardEvent): void {
  console.log("tecla presionada " + event.key);
    if (event.key === 'ArrowRight') {
        this._advanceDebugStep();
    }
}

/**
 * Avanza al siguiente paso de la depuración, dibujando el siguiente trazado.
 * @private
 */
private _advanceDebugStep(): void {
    this._debugPathIndex++;

    if (this._debugPathIndex >= this._allLogoPathsForDebug.length) {
        console.log("🎉 Fin de los trazados. Has recorrido los 38. Recarga para empezar de nuevo.");
        window.removeEventListener('keydown', this._handleDebugKeyDown); // Limpiamos el listener
        return;
    }

    console.log(`Trazado Índice: %c${this._debugPathIndex}`, `color: white; background: #007acc; padding: 2px 6px; border-radius: 3px;`);

    // Hacemos que los trazados anteriores se vean en un color atenuado
    if (this._debugRibbons.length > 0) {
        this._debugRibbons[this._debugRibbons.length - 1].material.uniforms.uColor.value.set(0x444444); // Gris
    }

    const path = this._allLogoPathsForDebug[this._debugPathIndex];
    if (!path) return;

    const ribbonConfig: RibbonConfig = {
        color: new THREE.Color(0xffffff), // El trazado actual siempre es blanco brillante
        width: 3.05,
        maxLength: path.length + 1,
        renderMode: RenderMode.Solid,
    };

    const ribbon = new RibbonLine(ribbonConfig);
    ribbon.setPoints(path);
    ribbon.material.uniforms.uDrawProgress.value = 1.0;
    
    this.scene.add(ribbon.mesh);
    this._debugRibbons.push(ribbon);
}




}