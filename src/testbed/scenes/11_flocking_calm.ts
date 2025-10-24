
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boid } from '../../features/flocking/Boid';
import { CubicAreaConstraint } from '../../features/flocking/constraints/CubicAreaConstraint';
import { RibbonLine, RibbonConfig, RenderMode, FadeStyle, UseMode } from '../../core/RibbonLine';

export function runScene() {
  // --- BASIC SETUP ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 50, 150);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app')?.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  const clock = new THREE.Clock();

  // --- FLOCKING SETUP ---
  const boids: Boid[] = [];
  const ribbonLines: RibbonLine[] = [];
  const numBoids = 50;
  const areaSize = 80;

  // Create a bounding box for visualization
  const boxGeometry = new THREE.BoxGeometry(areaSize * 2, areaSize * 2, areaSize * 2);
  const boxEdges = new THREE.EdgesGeometry(boxGeometry);
  const boxMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
  const boxMesh = new THREE.LineSegments(boxEdges, boxMaterial);
  scene.add(boxMesh);

  // Create the area constraint
  const areaConstraint = new CubicAreaConstraint({ x: areaSize, y: areaSize, z: areaSize }, 0.1);

  // Create Boids and their corresponding RibbonLines
  for (let i = 0; i < numBoids; i++) {
    const boid = new Boid(
      Math.random() * 20 - 10,
      Math.random() * 20 - 10,
      Math.random() * 20 - 10,
      areaConstraint
    );
    
    // Calm Boid Parameters
    boid.maxSpeed = 1;
    boid.maxForce = 0.02;
    
    boids.push(boid);

    const ribbonConfig: RibbonConfig = {
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      width: 30,
      renderMode: RenderMode.Solid,
      fadeStyle: FadeStyle.Length,
      useMode: UseMode.Trail,
      maxLength: 150, // Shorter trail for performance
    };
    const ribbon = new RibbonLine(ribbonConfig);
    ribbonLines.push(ribbon);
    scene.add(ribbon.mesh);
  }

  // --- ANIMATION LOOP ---
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Update each boid
    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];
      const ribbon = ribbonLines[i];

      // 1. Calculate flocking forces
      boid.flock(boids, 20); // 20 is the perception radius

      // 2. Update boid physics (applies forces and constraints)
      boid.update();

      // 3. Update the ribbon trail
      ribbon.addPoint(boid.position);
      ribbon.update(elapsedTime);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // --- RESIZE HANDLING ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
