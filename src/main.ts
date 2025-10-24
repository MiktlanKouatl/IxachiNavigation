import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Removed for cinematic animation
import { AssetManager } from './managers/AssetManager';
import { AnimationControlPanel } from './ui/AnimationControlPanel';
import { RibbonLine, RibbonConfig, UseMode, FadeStyle, RenderMode } from './core/RibbonLine';
import { PathData } from './core/pathing/PathData';
import { PathFollower } from './core/pathing/PathFollower';
import { randomInRange } from './utils/random';
import { ProgressUI } from './ui/ProgressUI';

// Animation System
import { AnimationDirector } from './animation/AnimationDirector';
import { AnimationTargets } from './animation/AnimationTargets';
import { IntroChapter } from './animation/chapters/IntroChapter';
import { LoadingChapter } from './animation/chapters/LoadingChapter';
import { FadeInChapter } from './animation/chapters/FadeInChapter';

console.log('🚀 Ixachi Experience Initialized');

export class IxachiExperience {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  // private controls: OrbitControls; // Removed for cinematic animation
  private clock: THREE.Clock;

  // Animatable Objects
  private hostRibbon: RibbonLine;
  private hostFollower: PathFollower;
  private hostSourceObject: THREE.Object3D;
  private progressCircle: RibbonLine;
  private progressUI: ProgressUI;

  // State & Parameters
  private hostState: 'intro' | 'orbiting' = 'intro';
  private readonly idleParams = {
    speed: 6.0,
    radius: 0.5,
    freqX: 1.1, freqY: 1.2, freqZ: 1.5,
    phaseX: 1.3, phaseY: 1.7, phaseZ: 1.0,
  };

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement); // Removed for cinematic animation
    this.clock = new THREE.Clock();

    this.init();
    this.animate();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 20);
    // this.controls.enableDamping = true; // Removed for cinematic animation

    // --- Create all animatable objects ---
    this.hostSourceObject = new THREE.Object3D();
    this.scene.add(this.hostSourceObject);
    const dummyPath = new PathData([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
    this.hostFollower = new PathFollower(dummyPath, { speed: 0 });
    this.hostRibbon = this.createHostRibbon();
    this.scene.add(this.hostRibbon.mesh);
    this.progressUI = new ProgressUI();
    this.progressCircle = this.createProgressCircle();
    this.scene.add(this.progressCircle.mesh);

    // --- AssetManager & UI ---
    const assetManager = new AssetManager(); // Instantiate AssetManager earlier

    // --- Build Animation Sequence using Chapter System ---
    const targets: AnimationTargets = {
        camera: this.camera,
        hostFollower: this.hostFollower,
        hostSourceObject: this.hostSourceObject,
        hostRibbon: this.hostRibbon,
        // Note: hostRibbon is duplicated in original, keeping for now
        progressCircle: this.progressCircle,
        progressUI: this.progressUI,
    };
    const director = new AnimationDirector(targets, this); // Pass IxachiExperience instance // Moved director declaration here

    new AnimationControlPanel(assetManager, director); // Now director is initialized

    director.addChapter('FadeIn', new FadeInChapter());
    director.addChapter('Intro', new IntroChapter());
    director.addChapter('Loading', new LoadingChapter(assetManager)); // Pass assetManager to LoadingChapter

    // assetManager.loadAll() is now called by LoadingChapter itself

    // --- Start Experience ---
    // Play the director and await its completion to set the hostState
    director.play().then(() => {
        this.hostState = 'orbiting';
        console.log('🌀 Host state switched to ORBITING');
    });

    window.addEventListener('resize', () => this.onWindowResize(), false);
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
  }

  public setHostState(state: 'intro' | 'orbiting'): void {
    this.hostState = state;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const elapsedTime = this.clock.getElapsedTime();

    if (this.hostState === 'intro') {
        this.hostFollower.update(0);
        this.hostSourceObject.position.copy(this.hostFollower.position);
    } else { // 'orbiting'
        const { speed, radius, freqX, freqY, freqZ, phaseX, phaseY, phaseZ } = this.idleParams;
        const time = elapsedTime * speed;
        const x = radius * Math.cos(time * freqX) * Math.sin(time * phaseX);
        const y = radius * Math.sin(time * freqY) * Math.cos(time * phaseY);
        const z = radius * Math.sin(time * freqZ) * Math.cos(time * phaseZ);
        this.hostSourceObject.position.set(x, y, z);
    }
    
    this.hostRibbon.addPoint(this.hostSourceObject.position);

    // this.controls.update(); // Removed for cinematic animation
    this.renderer.render(this.scene, this.camera);
  }
}

new IxachiExperience();

