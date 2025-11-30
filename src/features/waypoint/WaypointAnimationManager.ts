import gsap from 'gsap';
import * as THREE from 'three';
import { WaypointAnimationConfig, AnimationStep } from './types/WaypointContentData';

export class WaypointAnimationManager {
    private timeline: gsap.core.Timeline;
    private config: WaypointAnimationConfig;
    private objects: Map<string, THREE.Object3D>;

    constructor(config: WaypointAnimationConfig, objects: Map<string, THREE.Object3D>) {
        this.config = config;
        this.objects = objects;
        this.timeline = gsap.timeline({ paused: true });
        this.buildTimeline();
    }

    private buildTimeline(): void {
        this.config.steps.forEach((step: AnimationStep) => {
            const target = this.objects.get(step.targetId);
            if (!target) {
                console.warn(`[WaypointAnimationManager] Target '${step.targetId}' not found for animation.`);
                return;
            }

            const duration = step.duration;
            const position = step.position !== undefined ? step.position : '>';

            if (step.method === 'fromTo') {
                if (!step.fromProps) {
                    console.warn(`[WaypointAnimationManager] 'fromTo' method requires 'fromProps'.`);
                    return;
                }
                const toConfigs = this.getTweenConfigs(target, step.props);
                const fromConfigs = this.getTweenConfigs(target, step.fromProps);

                // Match 'to' configs with 'from' configs based on target object
                toConfigs.forEach(toCfg => {
                    // Find matching from config
                    // Note: This simple matching assumes one config per target object, which is true for our logic
                    const fromCfg = fromConfigs.find(fc => fc.target === toCfg.target);
                    if (fromCfg) {
                        this.timeline.fromTo(toCfg.target, fromCfg.props, { ...toCfg.props, duration: duration }, position);
                    } else {
                        // If no matching from props for this target, just use 'to' (or warn?)
                        // Fallback to 'to' behavior or just ignore? 
                        // GSAP fromTo requires both. Let's assume user provided symmetric props.
                        // If not, we can't really do a fromTo properly for this sub-object.
                        console.warn(`[WaypointAnimationManager] Missing 'from' props for target`, toCfg.target);
                    }
                });
            } else {
                // 'to' or 'from'
                const configs = this.getTweenConfigs(target, step.props);
                configs.forEach(cfg => {
                    if (step.method === 'from') {
                        this.timeline.from(cfg.target, { ...cfg.props, duration: duration }, position);
                    } else {
                        this.timeline.to(cfg.target, { ...cfg.props, duration: duration }, position);
                    }
                });
            }
        });
    }

    /**
     * Splits properties into separate configs for different target objects (position, scale, material, etc.)
     */
    private getTweenConfigs(target: THREE.Object3D, props: any): { target: any, props: any }[] {
        const configs: Map<any, any> = new Map();

        const getPropsFor = (obj: any) => {
            if (!configs.has(obj)) configs.set(obj, {});
            return configs.get(obj);
        };

        for (const key in props) {
            const value = props[key];

            if (key === 'x' || key === 'y' || key === 'z') {
                const p = getPropsFor(target.position);
                p[key] = value;
            }
            else if (key === 'scale') {
                const p = getPropsFor(target.scale);
                if (typeof value === 'number') {
                    p.x = value; p.y = value; p.z = value;
                } else {
                    // If complex object, maybe copy props?
                    // For now assume number
                }
            }
            else if (key === 'opacity') {
                if ('fillOpacity' in target) {
                    // Troika Text
                    const p = getPropsFor(target);
                    p['fillOpacity'] = value;
                } else if ((target as any).material) {
                    // Mesh
                    const mat = (target as any).material;
                    if (Array.isArray(mat)) {
                        mat.forEach(m => {
                            const p = getPropsFor(m);
                            p.opacity = value;
                            p.transparent = true;
                        });
                    } else {
                        const p = getPropsFor(mat);
                        p.opacity = value;
                        p.transparent = true;
                    }
                }
            }
            else {
                // Default to root target
                const p = getPropsFor(target);
                p[key] = value;
            }
        }

        const result: { target: any, props: any }[] = [];
        configs.forEach((p, t) => result.push({ target: t, props: p }));
        return result;
    }

    /**
     * Updates the timeline progress based on local waypoint progress (0.0 to 1.0).
     * Used for 'scrub' mode.
     */
    public update(localProgress: number): void {
        if (this.config.mode === 'scrub') {
            // Clamp progress between 0 and 1
            const progress = Math.max(0, Math.min(1, localProgress));
            this.timeline.progress(progress);
        }
    }

    /**
     * Plays the timeline.
     * Used for 'trigger' mode on enter.
     */
    public enter(): void {
        if (this.config.mode === 'trigger') {
            this.timeline.play();
        }
    }

    /**
     * Reverses or resets the timeline.
     * Used for 'trigger' mode on exit.
     */
    public exit(): void {
        if (this.config.mode === 'trigger') {
            if (this.config.exitBehavior === 'reset') {
                this.timeline.pause(0);
            } else if (this.config.exitBehavior === 'none') {
                // Do nothing
            } else {
                // Default 'reverse'
                this.timeline.reverse();
            }
        }
    }

    public dispose(): void {
        this.timeline.kill();
    }
}
