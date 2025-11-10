import * as THREE from 'three';
import { AssetManager } from './managers/AssetManager';
import { AnimationControlPanel } from './ui/AnimationControlPanel';
import { RibbonLine, RibbonConfig, UseMode, FadeStyle, RenderMode } from './core/RibbonLine';
import { PathData } from './core/pathing/PathData';
import { PathFollower } from './core/pathing/PathFollower';
import { ProgressUI } from './ui/ProgressUI';

// Core Systems
import { MovementController } from './core/movement/MovementController';
import { AnimationDirector } from './animation/AnimationDirector';
import { NavigationController, NavigationState } from './core/navigation/NavigationController';
import { ScrollManager, ScrollData } from './managers/ScrollManager';
import { NavigationIntersection, NavigationChoice } from './core/navigation/NavigationModel';

// UI
import { IntersectionUIController } from './ui/IntersectionUIController';

// Animation Chapters
import { AnimationTargets } from './animation/AnimationTargets';
import { IntroChapter } from './animation/chapters/IntroChapter';
import { LoadingChapter } from './animation/chapters/LoadingChapter';
import { InnerUniverseChapter } from './animation/chapters/InnerUniverseChapter';
import { FadeInChapter } from './animation/chapters/FadeInChapter';
import { TransitionToCirclePath } from './animation/chapters/TransitionToCirclePath';
import { JourneyChapter } from './animation/chapters/JourneyChapter';
import { TraceLogoChapter } from './animation/chapters/TraceLogoChapter';

console.log('🚀 Ixachi Experience Initialized');

enum ExperienceMode {
  Navigation,
  Cinematic,
}

export class IxachiExperience {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Controllers
  private movementController: MovementController;
  private director: AnimationDirector;
  private navigationController: NavigationController;
  private scrollManager: ScrollManager;
  private intersectionUI: IntersectionUIController;

  // State & Camera
  private currentMode: ExperienceMode;
  private cameraTarget: THREE.Object3D;
  private lookAtTarget: THREE.Object3D;
  private smoothLookAtTarget: THREE.Object3D;
  private cameraSmoothing: number = 0.05;

  // Animatable Objects
  private hostRibbon: RibbonLine;
  private hostFollower: PathFollower;
  private hostSourceObject: THREE.Object3D;
  private progressCircle: RibbonLine;
  private progressUI: ProgressUI;
  private isDrawingEnabled: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.clock = new THREE.Clock();

    this.cameraTarget = new THREE.Object3D();
    this.lookAtTarget = new THREE.Object3D();
    this.smoothLookAtTarget = new THREE.Object3D();
    //this.camera.position.set(0, 0, 40);
    this.scene.add(this.cameraTarget);
    this.scene.add(this.lookAtTarget);
    this.scene.add(this.smoothLookAtTarget);

    this.movementController = new MovementController();
    this.scrollManager = new ScrollManager();
    this.navigationController = new NavigationController(this.cameraTarget, this.lookAtTarget);
    this.intersectionUI = new IntersectionUIController(this.camera, this.scene);
    // Director is initialized in init() after targets are created

    this.init();
    this.animate();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    // --- Create all animatable objects ---
    this.hostSourceObject = new THREE.Object3D();
    this.scene.add(this.hostSourceObject);
    const dummyPath = new PathData([new THREE.Vector3(0,0,35), new THREE.Vector3(0,0,30)]);
    this.hostFollower = new PathFollower(dummyPath, { speed: 0 });
    this.hostRibbon = this.createHostRibbon();
    this.progressUI = new ProgressUI();
    this.progressCircle = this.createProgressCircle();
    this.scene.add(this.progressCircle.mesh);

    const assetManager = new AssetManager();

    // --- Initialize Cinematic System (AnimationDirector) ---
    const targets: AnimationTargets = {
        camera: this.camera,
        cameraTarget: this.cameraTarget,
        lookAtTarget: this.lookAtTarget,
        hostFollower: this.hostFollower,
        hostSourceObject: this.hostSourceObject,
        hostRibbon: this.hostRibbon,
        progressCircle: this.progressCircle,
        progressUI: this.progressUI,
        movementController: this.movementController,
        enableDrawing: () => { this.isDrawingEnabled = true; },
        scene: this.scene,
        assetManager: assetManager,
    };
    this.director = new AnimationDirector(targets, this);
    new AnimationControlPanel(assetManager, this.director);
    this.director.addChapter('FadeIn', new FadeInChapter());
    this.director.addChapter('Intro', new IntroChapter());
    this.director.addChapter('Loading', new LoadingChapter(assetManager));
    this.director.addChapter('Journey', new JourneyChapter());
    this.director.addChapter('TraceLogo', new TraceLogoChapter());

    // --- Initialize Navigation System ---
    this.setupNavigationPaths();
    this.navigationController.on('transitionRequested', (chapterId: string, targetPathId: string) => {
      this.handleTransition(chapterId, targetPathId);
    });
    this.navigationController.on('intersectionReached', (intersection: NavigationIntersection) => {
      this.intersectionUI.show(intersection);
    });
    this.navigationController.on('intersectionExited', () => {
      this.intersectionUI.hide();
    });

    // --- Final Setup ---
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // --- Start Experience ---
    this.setMode(ExperienceMode.Cinematic);
    this.director.play().then(() => {
        console.log('🎬 Cinematic intro finished. Switching to Navigation mode.');
        this.navigationController.setPath('pathB'); // Set the initial path for navigation
        this.setMode(ExperienceMode.Navigation);
    });
  }

  private setupNavigationPaths(): void {
    // Path A: A straight line from front to center
    const pathA = new PathData([new THREE.Vector3(0, 5, 20), new THREE.Vector3(0, 5, 0)]);

    // Path B: A circle in the XZ plane (our main navigation path for now)
    const circleRadius = 10;
    const circleShape = new THREE.EllipseCurve(0, 0, circleRadius, circleRadius, 0, 2 * Math.PI, false, 0);
    const pathBPoints = circleShape.getPoints(128).map(p => new THREE.Vector3(p.x, 5, p.y));
    const pathB = new PathData(pathBPoints, true);

    // Intersection at the end of Path A
    const intersection: NavigationIntersection = {
      progress: 1,
      choices: [
        { direction: 'right', targetPathId: 'pathB', transitionChapterId: 'transitionToCircle' }
      ]
    };

    this.navigationController.addPath('pathA', pathA, [intersection]);
    this.navigationController.addPath('pathB', pathB, []);
  }

  private handleTransition(chapterId: string, targetPathId: string): void {
    this.intersectionUI.hide();
    this.setMode(ExperienceMode.Cinematic);
    this.director.playChapter(chapterId).then(() => {
      this.navigationController.setPath(targetPathId);
      this.setMode(ExperienceMode.Navigation);
    });
  }

  public setMode(mode: ExperienceMode): void {
    if (this.currentMode === mode && this.currentMode !== undefined) return;

    console.log(`🔄 [Experience] Switching mode to ${ExperienceMode[mode]}`);
    this.currentMode = mode;

    if (mode === ExperienceMode.Navigation) {
      this.director.stop();
      this.scrollManager.connect();
      this.scrollManager.on('scroll', this.navigationController.handleScroll.bind(this.navigationController));
    } else { // Cinematic
      this.scrollManager.off('scroll', this.navigationController.handleScroll.bind(this.navigationController));
      this.scrollManager.disconnect();
    }
  }

  private createHostRibbon(): RibbonLine {
    const config: RibbonConfig = {
        color: new THREE.Color(0x00ffdd),
        width: 3.2,
        maxLength: 150,
        useMode: UseMode.Trail,
        fadeStyle: FadeStyle.FadeInOut,
        renderMode: RenderMode.Solid,
        fadeTransitionSize: 0.4,
    };
    return new RibbonLine(config);
  }

  private createProgressCircle(): RibbonLine {
    const ellipse = new THREE.EllipseCurve(0, 0, 1.5, 1.5, 0, 2 * Math.PI, false, 0);
    const circlePoints = ellipse.getPoints(128).map(p => new THREE.Vector3(p.x, p.y, 0));
    const config: RibbonConfig = {
        color: new THREE.Color(0xffffff),
        width: 3.0,
        maxLength: circlePoints.length,
        useMode: UseMode.Reveal,
    };
    const circle = new RibbonLine(config);
    circle.setPoints(circlePoints);
    circle.material.uniforms.uDrawProgress.value = 0;
    circle.material.uniforms.uWipeProgress.value = 0;
    circle.mesh.visible = false;
    return circle;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.intersectionUI.updateResolution(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = this.clock.getDelta();

    // Only update navigation controls when in navigation mode
    if (this.currentMode === ExperienceMode.Navigation) {
      this.navigationController.update();
    }
    
    this.intersectionUI.update();

    // Smooth camera movement is always on
    this.smoothLookAtTarget.position.lerp(this.lookAtTarget.position, this.cameraSmoothing);
    this.camera.position.lerp(this.cameraTarget.position, this.cameraSmoothing);
    this.camera.lookAt(this.smoothLookAtTarget.position);

    this.movementController.update(this.hostSourceObject, deltaTime, elapsedTime);
    if (this.isDrawingEnabled) {
      this.hostRibbon.addPoint(this.hostSourceObject.position);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new IxachiExperience();
