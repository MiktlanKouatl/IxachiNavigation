import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SectionEditorStore } from '../SectionEditorStore';
import { ElementFactory } from '../../../waypoint/ElementFactory';
import { EventEmitter } from '../../../../core/EventEmitter';

export class PreviewViewport {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private grid: THREE.GridHelper;
    private axes: THREE.AxesHelper;

    private elementFactory: ElementFactory;
    private contentGroup: THREE.Group;
    private logicEventBus: EventEmitter; // Dummy for now

    private store: SectionEditorStore;
    private animationId: number | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.store = SectionEditorStore.getInstance();

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Helpers
        this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(this.grid);

        this.axes = new THREE.AxesHelper(2);
        this.scene.add(this.axes);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1);
        dir.position.set(5, 10, 5);
        this.scene.add(dir);

        // Content
        this.contentGroup = new THREE.Group();
        this.scene.add(this.contentGroup);

        this.logicEventBus = new EventEmitter();
        this.elementFactory = new ElementFactory(this.contentGroup, this.logicEventBus);

        // Events
        window.addEventListener('resize', () => this.onResize());
        this.store.on('selectionChanged', (e: any) => {
            // Only rebuild if we switched screens or sections
            if (e.sectionId || e.screenId) {
                this.rebuildScene();
            }
        });

        // Granular updates
        this.store.on('elementAdded', (el: any) => this.elementFactory.createElement(el));
        this.store.on('elementUpdated', (el: any) => this.elementFactory.updateElement(el));
        this.store.on('elementDeleted', (el: any) => this.elementFactory.disposeElements([el]));

        // We ignore 'sectionUpdated' to avoid full rebuilds on property changes

        this.animate();
    }

    private onResize(): void {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    private rebuildScene(): void {
        // Clear existing
        while (this.contentGroup.children.length > 0) {
            this.contentGroup.remove(this.contentGroup.children[0]);
        }
        // Dispose logic if needed (ElementFactory has disposeElements but we are clearing group directly for speed, 
        // ideally we should use factory to dispose properly)

        const screen = this.store.getCurrentScreen();
        if (screen) {
            screen.elements.forEach(el => {
                this.elementFactory.createElement(el);
            });
        }
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    public dispose(): void {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.renderer.dispose();
        // Dispose other three.js resources
    }
}
