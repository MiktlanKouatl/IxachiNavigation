# Ixachi Navigation

Un proyecto de visualización 3D interactiva que simula líneas auto-generativas con comportamiento de cardumen/parvada utilizando Three.js.

## 🌟 Concepto

Ixachi Navigation presenta líneas que crecen hacia adelante mientras se contraen por detrás, manteniendo una longitud constante. Estas líneas exhiben comportamientos de flocking (cardumen) similares a peces o aves, creando patrones orgánicos que recuerdan el movimiento de datos en un microchip.

## 🚀 Características Principales

- **Líneas Auto-generativas**: Las líneas crecen continuamente hacia adelante y se contraen por detrás
- **Comportamiento de Cardumen**: Implementa algoritmos de flocking con separación, alineación y cohesión
- **Estética de Microchip**: Patrones organizados que simulan el flujo de datos
- **Arquitectura OOP**: Diseño orientado a objetos con clases especializadas
- **Performance Optimizada**: Utiliza BufferGeometry para máximo rendimiento

## 🛠️ Tecnologías

- **TypeScript**: Lenguaje principal con tipado estricto
- **Three.js**: Motor 3D para renderizado
- **Vite**: Herramienta de desarrollo rápida
- **ES6 Modules**: Estructura modular moderna

## 📁 Estructura del Proyecto

```
src/
├── core/
│   ├── IxachiNavigationScene.ts  # Controlador principal de la escena
│   ├── Line3d.ts                 # Clase principal de línea con lógica completa
│   └── FlockingSystem.ts         # Sistema de comportamiento de cardumen
├── main.ts                       # Punto de entrada
└── style.css                     # Estilos base
```

## 🎯 Clases Principales

### Line3d
- **Generación**: Crea puntos hacia adelante basado en velocidad y dirección
- **Mantenimiento**: Elimina puntos antiguos para conservar longitud constante
- **Flocking**: Implementa separación, alineación y cohesión
- **Wandering**: Movimiento aleatorio sutil para naturalidad

### FlockingSystem
- **Coordinación**: Gestiona comportamiento colectivo entre líneas
- **Patrones**: Permite crear formaciones específicas (modo microchip)
- **Fuerzas**: Maneja atracción/repulsión hacia objetivos específicos

### IxachiNavigationScene
- **Renderizado**: Controla cámara, escena y ciclo de animación
- **Inicialización**: Configura líneas iniciales y sistema de flocking
- **Gestión**: Maneja eventos de ventana y limpieza de recursos

## 🚀 Instalación y Uso

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```

3. **Construir para producción**:
   ```bash
   npm run build
   ```

## 🎨 Configuración Visual

Las líneas pueden personalizarse con:
- **Color**: Valores hexadecimales
- **Grosor**: Ancho de línea
- **Longitud**: Longitud máxima constante
- **Velocidad**: Velocidad de crecimiento
- **Opacidad**: Transparencia

## 🧠 Algoritmos de Flocking

1. **Separación**: Evita colisiones manteniéndose alejado de vecinos cercanos
2. **Alineación**: Sincroniza dirección con líneas vecinas
3. **Cohesión**: Se mueve hacia el centro del grupo local
4. **Wandering**: Añade variación aleatoria para movimiento natural

## 🔧 Próximas Mejoras

- [ ] Implementar Line2 de Three.js para mejor calidad visual
- [ ] Añadir controles interactivos de parámetros
- [ ] Crear patrones de movimiento predefinidos
- [ ] Optimizar para móviles
- [ ] Añadir efectos de post-procesamiento
- [ ] Implementar sonido reactivo

## 🎮 Controles

- La simulación inicia automáticamente
- Las líneas se auto-organizan usando algoritmos de flocking
- El comportamiento emerge naturalmente de las reglas simples

## 📊 Performance

- Objetivo: 60 FPS estables
- Optimizado con BufferGeometry
- Gestión eficiente de memoria
- Límites configurables para escalabilidad

## 🤝 Contribución

Este proyecto está en desarrollo activo. Las mejoras y sugerencias son bienvenidas.

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles.
