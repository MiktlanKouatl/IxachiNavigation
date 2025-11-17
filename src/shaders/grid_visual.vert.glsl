// grid_visual.vert.glsl

#define PI 3.14159265359

// Uniforms and attributes provided by Three.js
// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;
// attribute vec3 position;
// attribute vec2 uv;

// Grid dimensions for coordinate conversion
uniform float gridColumns;
uniform float gridRows;
uniform float gridLayers;

// Cylindrical projection uniforms
uniform float cylinderRadius; // Base radius
uniform float rowHeight;
uniform float layerSpacing; // Spacing between concentric rings
uniform float layersPerRegion;
uniform vec3 parallaxSpeeds;
uniform float cameraRotationY;

varying vec2 vUv;

// Function to convert grid coordinates to 3D concentric ring position
vec3 gridToConcentricRings(vec3 gridPos) {
    float column = gridPos.x;
    float row = gridPos.y;
    float layer = gridPos.z;

    // --- Parallax Logic ---
    float regionID = floor(layer / layersPerRegion);
    float parallaxOffset = cameraRotationY * parallaxSpeeds[int(regionID)];

    // --- Angle (from column) ---
    float angle = (column / gridColumns) * 2.0 * PI + parallaxOffset;

    // --- Radius (from layer) ---
    float radius = cylinderRadius + layer * layerSpacing;

    // --- X and Z (from angle and radius) ---
    float x = radius * cos(angle);
    float z = radius * sin(angle);
    
    // --- Y (from row) ---
    float y = (row - gridRows / 2.0) * rowHeight;
    
    return vec3(x, y, z);
}

void main() {
    vUv = uv;

    // Convert grid cell coordinate to 3D world position
    vec3 worldPosition = gridToConcentricRings(position);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
    gl_PointSize = 2.0; // Reset to a smaller size
}
