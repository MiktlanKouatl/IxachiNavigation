import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { gsap } from 'gsap';
import { AssetManager } from '../../managers/AssetManager';
import { PathData } from '../../core/pathing/PathData';
import { RibbonLine, UseMode, RibbonConfig, FadeStyle } from '../../core/RibbonLine';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';
import { PathFollower } from '../../core/pathing/PathFollower';

export function runScene() {
    console.log('🚀 Ixachi Components Testbed - Scene 22: Reveal + Trail Crossfade');

    // --- Basic Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 25);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('app')?.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    scene.add(new THREE.AxesHelper(5));

    // --- State and Data ---
    const revealRibbons: RibbonLine[] = [];
    const trailRibbons: RibbonLineGPU[] = [];
    const followers: PathFollower[] = [];
    let trailLoop: gsap.core.Tween | null = null;

    // --- GUI ---
    const gui = new GUI();
    const params = {
        revealDuration: 4.0,
        staticOpacity: 0.15,
        crossfadeDuration: 2.5,
        trailSpeed: 0.2,
        trailLength: 0.7,
        start: () => {
            reset();
            reveal().then(() => {
                startLoop();
            });
        },
        reset: reset,
    };
    gui.add(params, 'revealDuration', 0.1, 10);
    gui.add(params, 'staticOpacity', 0, 1);
    gui.add(params, 'crossfadeDuration', 0.1, 5);
    gui.add(params, 'trailSpeed', 0.01, 1);
    gui.add(params, 'trailLength', 0.01, 1);
    gui.add(params, 'start').name('Run Animation');
    gui.add(params, 'reset').name('Reset');


    // --- Asset Loading and Scene Init ---
    async function init() {
        const assetManager = new AssetManager();
        await assetManager.loadAll();

        const logoPathData = assetManager.getPath('ixachiLogoSVG');
        if (logoPathData.curves.length === 0) {
            console.error('No curves found in logo path data.');
            return;
        }

        for (const curve of logoPathData.curves) {
            const singlePathData = new PathData([curve.points]);
            const highResPoints = singlePathData.curves[0].getPoints(150);
            
            // 1. Create Reveal Ribbons
            const revealRibbon = new RibbonLine({
                color: new THREE.Color(0xffffff),
                width: 0.5,
                maxLength: highResPoints.length,
                useMode: UseMode.Reveal,
                fadeStyle: FadeStyle.None,
            });
            revealRibbon.setPoints(highResPoints);
            scene.add(revealRibbon.mesh);
            revealRibbons.push(revealRibbon);

            // 2. Create Trail Ribbons
            const trailConfig: RibbonConfig = {
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                width: 0.5,
                maxLength: highResPoints.length,
                useMode: UseMode.Trail,
                fadeStyle: FadeStyle.FadeInOut,
                trailLength: params.trailLength,
                opacity: 0,
            };
            const trailRibbon = new RibbonLineGPU(highResPoints, trailConfig);
            scene.add(trailRibbon.mesh);
            trailRibbons.push(trailRibbon);

            // 3. Create a follower for each path
            followers.push(new PathFollower(singlePathData, { loop: true }));
        }

        console.log(`Initialized ${revealRibbons.length} reveal and ${trailRibbons.length} trail ribbons.`);
        params.start();
    }

    // --- Animation Logic ---

    function reset() {
        gsap.globalTimeline.clear();
        if (trailLoop) trailLoop.kill();

        for (const ribbon of revealRibbons) {
            ribbon.material.uniforms.uDrawProgress.value = 0;
            ribbon.material.uniforms.uOpacity.value = 1.0;
        }
        for (const ribbon of trailRibbons) {
            ribbon.material.uniforms.uOpacity.value = 0;
        }
        for (const follower of followers) {
            follower.seek(0);
        }
        console.log('Animation Reset.');
    }

    function reveal(): Promise<void> {
        console.log('Revealing logo simultaneously...');

        return new Promise(resolve => {
            const revealTl = gsap.timeline({ onComplete: resolve });

            for (let i = 0; i < followers.length; i++) {
                const revealRibbon = revealRibbons[i];

                // Animate ribbon reveal
                revealTl.to(revealRibbon.material.uniforms.uDrawProgress, {
                    value: 1,
                    duration: params.revealDuration,
                    ease: 'power1.inOut'
                }, 0); // Start all at time 0
            }
        });
    }

    function startLoop() {
        console.log('Starting crossfade and trail loop...');

        // 1. Crossfade opacities
        const fadeTl = gsap.timeline();
        for (const ribbon of revealRibbons) {
            fadeTl.to(ribbon.material.uniforms.uOpacity, {
                value: params.staticOpacity,
                duration: params.crossfadeDuration
            }, 0);
        }
        for (const ribbon of trailRibbons) {
            fadeTl.to(ribbon.material.uniforms.uOpacity, {
                value: 1.0,
                duration: params.crossfadeDuration
            }, 0);
        }

        // 2. Start the GPU trail loop
        const progress = { value: 0 };
        trailLoop = gsap.to(progress, {
            value: 1,
            duration: 1 / params.trailSpeed,
            ease: 'none',
            repeat: -1,
            onUpdate: () => {
                for (const ribbon of trailRibbons) {
                    ribbon.setTrail(progress.value, params.trailLength);
                }
            }
        });
    }

    // --- Main Render Loop ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    init();
    animate();

    // --- Cleanup ---
    return () => {
        console.log('Cleaning up scene 22');
        gsap.globalTimeline.clear();
        if (trailLoop) trailLoop.kill();
        gui.destroy();
    };
}