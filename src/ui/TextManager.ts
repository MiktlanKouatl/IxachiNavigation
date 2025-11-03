import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { gsap } from 'gsap';

// --- Interfaces y Tipos ---

type TextType = '3D' | '2D' | 'HTML';

interface ITextOptions {
    type?: TextType;
    fontSize?: number;
    color?: number | string;
    anchorX?: 'left' | 'center' | 'right';
    anchorY?: 'top' | 'middle' | 'bottom' | 'baseline';
}

interface IPool {
    inactive: (Text | HTMLElement)[];
    active: Map<string, Text | HTMLElement>;
}

// --- Clase TextManager ---

export class TextManager {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private htmlContainer: HTMLElement;

    private pools: Record<TextType, IPool> = {
        '3D': { inactive: [], active: new Map() },
        '2D': { inactive: [], active: new Map() },
        'HTML': { inactive: [], active: new Map() },
    };

    private defaultFont: string = '/fonts/Roboto-Regular.ttf';
    private fontPromise: Promise<void>;

    constructor(scene: THREE.Scene, camera: THREE.Camera, htmlContainer: HTMLElement) {
        this.scene = scene;
        this.camera = camera;
        this.htmlContainer = htmlContainer;
        this.fontPromise = this.preloadFont(this.defaultFont);
    }

    private preloadFont(fontUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const text = new Text();
            text.font = fontUrl;
            text.text = ' ';
            text.sync(() => {
                console.log(`✅ Font ${fontUrl} preloaded.`);
                resolve();
            });
        });
    }

    public async showText(id: string, text: string, position: THREE.Vector3, options: ITextOptions = {}) {
        await this.fontPromise;

        const type = options.type || '3D';
        const instance = this._requestInstance(id, type);

        if (instance instanceof Text) {
            this.scene.add(instance);
            this._configureTroikaText(instance, text, position, options, () => {
                this._animateIn(instance);
            });
        } else if (instance instanceof HTMLElement) {
            this._configureHtmlText(instance, text, position, options);
            this.htmlContainer.appendChild(instance);
            gsap.to(instance, { opacity: 1, duration: 1.0 });
        }
    }

    public hideText(id: string) {
        for (const type in this.pools) {
            const pool = this.pools[type as TextType];
            if (pool.active.has(id)) {
                const instance = pool.active.get(id);
                console.log(`Hiding text with id: ${id}`);
                if (instance instanceof Text) {
                    gsap.to(instance, {
                        fillOpacity: 0.0,
                        duration: 1.0,
                        ease: 'power2.out',
                        onComplete: () => {
                            console.log(`✅ onComplete: Releasing Troika text: ${id}`);
                            this._releaseInstance(id, type as TextType);
                        }
                    });
                } else if (instance instanceof HTMLElement) {
                    gsap.to(instance, {
                        opacity: 0.0,
                        duration: 1.0,
                        ease: 'power2.out',
                        onComplete: () => {
                            console.log(`✅ onComplete: Releasing HTML text: ${id}`);
                            this._releaseInstance(id, type as TextType);
                        }
                    });
                }
                break;
            }
        }
    }

    public update() {
        this.pools['2D'].active.forEach(instance => {
            if (instance instanceof Text && (instance.userData as any).isBillboard) {
                instance.quaternion.copy(this.camera.quaternion);
            }
        });

        this.pools['HTML'].active.forEach(instance => {
            if (instance instanceof HTMLElement) {
                const position3D = (instance as any).userData.position as THREE.Vector3;
                const screenPosition = position3D.clone().project(this.camera);

                const x = (screenPosition.x * 0.5 + 0.5) * this.htmlContainer.clientWidth;
                const y = (-screenPosition.y * 0.5 + 0.5) * this.htmlContainer.clientHeight;

                instance.style.transform = `translate(${x}px, ${y}px)`;
            }
        });
    }

    private _requestInstance(id: string, type: TextType): Text | HTMLElement {
        const pool = this.pools[type];
        let instance: Text | HTMLElement | undefined = pool.inactive.pop();

        if (instance) {
            console.log(`♻️ Reusing instance for id:${id}`);
        } else {
            console.log(`✨ Creating new instance for id: ${id}`);
            instance = (type === 'HTML') ? this._createHtmlInstance() : this._createTroikaInstance();
        }

        (instance as any).userData = (instance as any).userData || {};
        (instance as any).userData.type = type;
        pool.active.set(id, instance);
        return instance;
    }

    private _releaseInstance(id: string, type: TextType) {
        const pool = this.pools[type];
        const instance = pool.active.get(id);

        if (instance) {
            console.log(`🔙 Returning instance ${id} to inactive pool.`);
            if (instance instanceof Text) {
                this.scene.remove(instance);
            } else if (instance instanceof HTMLElement) {
                (instance as HTMLElement).style.opacity = '0';
                if (instance.parentNode === this.htmlContainer) {
                    this.htmlContainer.removeChild(instance);
                }
            }
            pool.active.delete(id);
            pool.inactive.push(instance);
        }
    }

    private _createTroikaInstance(): Text {
        const text = new Text();
        text.font = this.defaultFont;
        text.material = new THREE.MeshBasicMaterial({ transparent: true });
        (text as any).fillOpacity = 0;
        return text;
    }

    private _createHtmlInstance(): HTMLElement {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        div.style.opacity = '0';
        return div;
    }

    private _configureTroikaText(instance: Text, text: string, position: THREE.Vector3, options: ITextOptions, onSync: () => void) {
        instance.text = text;
        instance.position.copy(position);
        instance.fontSize = options.fontSize || 0.5;
        (instance as any).color = options.color || 0xffffff;
        instance.anchorX = options.anchorX || 'center';
        instance.anchorY = options.anchorY || 'middle';
        (instance.userData as any).isBillboard = options.type === '2D';

        instance.sync(onSync);
    }

    private _configureHtmlText(instance: HTMLElement, text: string, position: THREE.Vector3, options: ITextOptions) {
        instance.innerHTML = text;
        instance.style.color = new THREE.Color(options.color || 0xffffff).getStyle();
        instance.style.fontSize = (options.fontSize || 16) + 'px';
        (instance as any).userData = (instance as any).userData || {};
        (instance as any).userData.position = position.clone();
    }

    private _animateIn(textInstance: Text) {
        gsap.to(textInstance as any, {
            fillOpacity: 1.0,
            duration: 1.0,
            ease: 'power2.inOut'
        });
    }

    public dispose(): void {
    }
}
