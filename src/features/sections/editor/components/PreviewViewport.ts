import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SectionEditorStore } from '../SectionEditorStore';
import { ElementFactory } from '../../../waypoint/ElementFactory';
import { EventEmitter } from '../../../../core/EventEmitter';

import gsap from 'gsap';

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

    // Interaction
    private raycaster: THREE.Raycaster;
    private pointer: THREE.Vector2;

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

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

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

    private onMouseMove(event: MouseEvent) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.contentGroup.children, true);

        if (intersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    private onClick(_: MouseEvent) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.contentGroup.children, true);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            // Find element data
            const screen = this.store.getCurrentScreen();
            if (!screen) return;

            // Extract ID from name (e.g., BUTTON_btn_123 -> btn_123)
            // Or simpler: iterate elements and check names
            const element = screen.elements.find(el => {
                const mesh = this.contentGroup.getObjectByName(`${el.type.toUpperCase()}_${el.id}`);
                return mesh === object;
            });

            if (element && element.interaction && element.interaction.trigger === 'click') {
                if (element.interaction.action === 'goto-next-screen') {
                    this.goToNextScreen();
                } else if (element.interaction.action === 'goto-screen' && element.interaction.payload) {
                    this.goToScreen(element.interaction.payload);
                } else if (element.interaction.action === 'run-custom-function' && element.interaction.payload) {
                    // Assume payload is screen ID for now
                    this.store.selectScreen(element.interaction.payload);
                }
            } else if (element) {
                this.store.selectElement(element.id);
            }
        } else {
            this.store.selectElement(null);
        }
    }

    private goToScreen(targetScreenId: string) {
        const section = this.store.getCurrentSection();
        const screen = this.store.getCurrentScreen();
        if (!section || !screen) return;

        const targetScreen = section.screens.find(s => s.id === targetScreenId);
        if (targetScreen && targetScreen.id !== screen.id) {
            // Transition Logic
            const exit = screen.exitTransition;
            const enter = targetScreen.enterTransition;

            // Animate Out
            this.animateTransition(this.contentGroup, exit, 'out', () => {
                this.store.selectScreen(targetScreen.id);
                // Wait a frame for rebuild to happen
                this.animateTransition(this.contentGroup, enter, 'in');
            });
        }
    }

    private goToNextScreen() {
        const section = this.store.getCurrentSection();
        const screen = this.store.getCurrentScreen();
        if (!section || !screen) return;

        const currentIndex = section.screens.findIndex(s => s.id === screen.id);
        if (currentIndex !== -1 && currentIndex < section.screens.length - 1) {
            const nextScreen = section.screens[currentIndex + 1];

            // Transition Logic
            const exit = screen.exitTransition;
            const enter = nextScreen.enterTransition;

            // Animate Out
            this.animateTransition(this.contentGroup, exit, 'out', () => {
                this.store.selectScreen(nextScreen.id);
                // Wait a frame for rebuild to happen
                this.animateTransition(this.contentGroup, enter, 'in');
            });
        }
    }

    private animateTransition(target: THREE.Object3D, transition: any, dir: 'in' | 'out', onComplete?: () => void) {
        // Check if there are any active effects
        const hasPosition = transition.position && (transition.position.x || transition.position.y || transition.position.z);
        const hasRotation = transition.rotation && (transition.rotation.x || transition.rotation.y || transition.rotation.z);
        const hasScale = transition.scale && (transition.scale.x !== 1 || transition.scale.y !== 1 || transition.scale.z !== 1);
        const hasEffects = transition.fade || hasPosition || hasRotation || hasScale;

        if (!transition || !hasEffects) {
            if (onComplete) onComplete();
            return;
        }

        const duration = transition.duration || 0.5;
        const ease = transition.easing || "power2.inOut";

        // Kill any existing tweens on the target to prevent conflicts
        gsap.killTweensOf(target);
        gsap.killTweensOf(target.position);
        gsap.killTweensOf(target.rotation);
        gsap.killTweensOf(target.scale);
        if (transition.fade) {
            target.children.forEach((child: any) => {
                if (child.material) gsap.killTweensOf(child.material);
            });
        }

        // Main timeline to track completion
        const tl = gsap.timeline({
            onComplete: onComplete
        });

        if (dir === 'out') {
            // Animate TO the offset/fade state
            if (transition.fade) {
                // Fade out children materials
                target.children.forEach((child: any) => {
                    if (child.material) {
                        tl.to(child.material, { opacity: 0, duration, ease }, 0);
                    }
                });
            }

            const vars: any = {};
            if (transition.position) {
                vars.x = target.position.x + (transition.position.x || 0);
                vars.y = target.position.y + (transition.position.y || 0);
                vars.z = target.position.z + (transition.position.z || 0);
            }

            if (transition.rotation) {
                vars.rotationX = target.rotation.x + THREE.MathUtils.degToRad(transition.rotation.x || 0);
                vars.rotationY = target.rotation.y + THREE.MathUtils.degToRad(transition.rotation.y || 0);
                vars.rotationZ = target.rotation.z + THREE.MathUtils.degToRad(transition.rotation.z || 0);
            }

            if (transition.scale) {
                vars.scaleX = transition.scale.x !== undefined ? transition.scale.x : 1;
                vars.scaleY = transition.scale.y !== undefined ? transition.scale.y : 1;
                vars.scaleZ = transition.scale.z !== undefined ? transition.scale.z : 1;
            }

            // Apply transform tween
            if (transition.position) tl.to(target.position, { x: vars.x, y: vars.y, z: vars.z, duration, ease }, 0);
            if (transition.rotation) tl.to(target.rotation, { x: vars.rotationX, y: vars.rotationY, z: vars.rotationZ, duration, ease }, 0);
            if (transition.scale) tl.to(target.scale, { x: vars.scaleX, y: vars.scaleY, z: vars.scaleZ, duration, ease }, 0);

        } else {
            // Animate FROM the offset/fade state TO default (0,0,0 / 1,1,1 / opacity 1)

            if (transition.fade) {
                target.children.forEach((child: any) => {
                    if (child.material) {
                        child.material.opacity = 0;
                        tl.to(child.material, { opacity: 1, duration, ease }, 0);
                    }
                });
            }

            const fromVars: any = {};

            if (transition.position) {
                fromVars.x = target.position.x + (transition.position.x || 0);
                fromVars.y = target.position.y + (transition.position.y || 0);
                fromVars.z = target.position.z + (transition.position.z || 0);
            }

            if (transition.rotation) {
                fromVars.rotationX = target.rotation.x + THREE.MathUtils.degToRad(transition.rotation.x || 0);
                fromVars.rotationY = target.rotation.y + THREE.MathUtils.degToRad(transition.rotation.y || 0);
                fromVars.rotationZ = target.rotation.z + THREE.MathUtils.degToRad(transition.rotation.z || 0);
            }

            if (transition.scale) {
                fromVars.scaleX = transition.scale.x !== undefined ? transition.scale.x : 1;
                fromVars.scaleY = transition.scale.y !== undefined ? transition.scale.y : 1;
                fromVars.scaleZ = transition.scale.z !== undefined ? transition.scale.z : 1;
            }

            // Set initial state then animate to natural state
            if (transition.position) tl.fromTo(target.position, { x: fromVars.x, y: fromVars.y, z: fromVars.z }, { x: 0, y: 0, z: 0, duration, ease }, 0);
            if (transition.rotation) tl.fromTo(target.rotation, { x: fromVars.rotationX, y: fromVars.rotationY, z: fromVars.rotationZ }, { x: 0, y: 0, z: 0, duration, ease }, 0);
            if (transition.scale) tl.fromTo(target.scale, { x: fromVars.scaleX, y: fromVars.scaleY, z: fromVars.scaleZ }, { x: 1, y: 1, z: 1, duration, ease }, 0);
        }
    }

    private onResize(): void {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    private rebuildScene(): void {
        // Kill any active tweens on the group before resetting
        gsap.killTweensOf(this.contentGroup);
        gsap.killTweensOf(this.contentGroup.position);
        gsap.killTweensOf(this.contentGroup.rotation);
        gsap.killTweensOf(this.contentGroup.scale);
        this.contentGroup.children.forEach((child: any) => {
            if (child.material) gsap.killTweensOf(child.material);
        });

        // Clear existing
        while (this.contentGroup.children.length > 0) {
            this.contentGroup.remove(this.contentGroup.children[0]);
        }

        // Reset transform
        this.contentGroup.position.set(0, 0, 0);
        this.contentGroup.scale.set(1, 1, 1);
        this.contentGroup.rotation.set(0, 0, 0);

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
