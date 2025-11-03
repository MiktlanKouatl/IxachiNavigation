import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { TextManager } from '../../ui/TextManager';

  export function runScene() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.getElementById('app')?.appendChild(renderer.domElement);

      camera.position.z = 8;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // 1. Crear el contenedor para los elementos HTML
      const htmlContainer = document.createElement('div');
      htmlContainer.id = 'html-overlay-container';
      htmlContainer.style.position = 'fixed';
      htmlContainer.style.top = '0';
      htmlContainer.style.left = '0';
      htmlContainer.style.width = '100%';
      htmlContainer.style.height = '100%';
          htmlContainer.style.pointerEvents = 'none';
          htmlContainer.style.zIndex = '10'; // Asegurar que esté por encima del canvas
          document.body.appendChild(htmlContainer);
      // 2. Instanciar TextManager con los nuevos parámetros
      const textManager = new TextManager(scene, camera, htmlContainer);

      // --- Ejemplos de Texto ---

      // Ejemplo 1: Texto 3D con efecto de contorno y relleno
      textManager.showText(
          'title_3d',
          'IXACHI (3D)',
          new THREE.Vector3(0, 2, 0),
          {
              type: '3D',
              fontSize: 1.0,
              color: 0xffffff,
              outlineColor: 0x00ff00,
              outlineWidth: 0.02,
              anchorX: 'center'
          }
      );

      // Ejemplo 2: Texto 2D (Billboard) que siempre mira a la cámara
      textManager.showText(
          'subtitle_2d',
          'Texto 2D (Billboard)',
          new THREE.Vector3(-3, 0, 0),
          {
              type: '2D',
              fontSize: 0.4,
              color: 0x00ffff,
              outlineColor: 0x000000,
              outlineWidth: 0.03,
              anchorX: 'center'
          }
      );

      // Ejemplo 3: Texto HTML anclado a un punto 3D
      textManager.showText(
          'info_html',
          '<div style="background: rgba(0,0,0,0.5); padding: 5px; border-radius: 3px;">Texto HTML</div>',
          new THREE.Vector3(3, 0, 0),
          {
              type: 'HTML',
              fontSize: 20, // En píxeles para HTML
              color: 0xffaa00
          }
      );

      function animate() {
          requestAnimationFrame(animate);
          controls.update();

          // 3. Llamar al método update del TextManager en cada frame
          textManager.update();

          renderer.render(scene, camera);
      }

      animate();

      // Opcional: Ocultar los textos después de un tiempo para probar el pooling
      setTimeout(() => {
          console.log('Ocultando textos...');
          textManager.hideText('title_3d');
          textManager.hideText('subtitle_2d');
          textManager.hideText('info_html');
      }, 8000);

      setTimeout(() => {
          console.log('Mostrando textos de nuevo para probar la reutilización del pool...');
          textManager.showText('title_3d', 'REUSED (3D)', new THREE.Vector3(0, 2, 0), { type: '3D', fontSize: 0.8, color: 0xff00ff });
          textManager.showText('subtitle_2d', 'REUSED (2D)', new THREE.Vector3(-3, 0, 0), { type: '2D', fontSize: 0.5, color: 0x00ff00 });
          textManager.showText('info_html', 'REUSED (HTML)', new THREE.Vector3(3, 0, 0), { type: 'HTML', color: 0xff0000 });
      }, 10000);
  }