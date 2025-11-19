// Vertex shader for rendering agents in a 3D grid with parallax
uniform sampler2D texturePosition;
uniform sampler2D texturePreviousPosition; // NEW: For interpolation
uniform float interpolationFactor;         // NEW: For interpolation
uniform sampler2D textureAgentState; // New: Agent's internal state

// Grid Dimensions
uniform float gridColumns;
uniform float gridRows;
uniform float gridLayers;

// Visual Mapping
uniform float cylinderRadius; // Base radius for the innermost ring
uniform float rowHeight;
uniform float layerSpacing; // Distance between each concentric layer

// Parallax Effect
uniform float cameraRotationY;
uniform float layersPerRegion;
uniform vec3 parallaxSpeeds; // Use vec3 for 3 regions

varying vec3 vColor; // NEW: Pass color to fragment shader

const float PI = 3.14159265359;

void main() {
    // Look up the grid coordinates of this particle in the texture
    // pos.xyz = (col, row, layer), pos.w = is_alive
    vec4 currentPosData = texture2D(texturePosition, uv);
    vec3 currentGridPos = currentPosData.xyz;
    float is_alive = currentPosData.w;

    // Read previous grid coordinates for interpolation
    vec4 previousPosData = texture2D(texturePreviousPosition, uv);
    vec3 previousGridPos = previousPosData.xyz;

    // Read agent state
    vec4 agentState = texture2D(textureAgentState, uv);
    float behaviorID = agentState.x; // behaviorID is in the red channel

    if (is_alive < 0.5) {
        // Hide inactive points by collapsing them to the origin in clip space
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        gl_PointSize = 0.0;
    } else {
        // --- Color based on Behavior ---
        if (behaviorID < 0.5) {
            vColor = vec3(0.0, 0.5, 0.5); // Cyan for Free Movement
        } else if (behaviorID < 1.5) {
            vColor = vec3(1.0, 0.0, 1.0); // Magenta for Pattern A (Star)
        } else {
            vColor = vec3(1.0, 1.0, 0.0); // Yellow for Pattern B
        }

        // --- Interpolate Grid Position ---
        // vec3 interpolatedGridPos = mix(previousGridPos, currentGridPos, interpolationFactor);
        // float col = interpolatedGridPos.x;
        // float row = interpolatedGridPos.y;
        // float layer = interpolatedGridPos.z;

        // --- Parallax Calculation ---
        float regionID = floor(currentGridPos.z / layersPerRegion);
        float parallaxSpeed = 0.0;
        if (regionID < 1.0) {
            parallaxSpeed = parallaxSpeeds.x;
        } else if (regionID < 2.0) {
            parallaxSpeed = parallaxSpeeds.y;
        } else {
            parallaxSpeed = parallaxSpeeds.z;
        }
        float ringAngleOffset = cameraRotationY * parallaxSpeed;

        // --- 3D Position Calculation for Previous and Current states ---
        float totalHeight = gridRows * rowHeight;

        // Previous Position
        float prev_angle = (previousGridPos.x / gridColumns) * 2.0 * PI + ringAngleOffset;
        float prev_radius = cylinderRadius + (previousGridPos.z * layerSpacing);
        float prev_height = (previousGridPos.y * rowHeight) - (totalHeight / 2.0);
        vec3 previousWorldPos = vec3(
            prev_radius * cos(prev_angle),
            prev_height,
            prev_radius * sin(prev_angle)
        );

        // Current Position
        float current_angle = (currentGridPos.x / gridColumns) * 2.0 * PI + ringAngleOffset;
        float current_radius = cylinderRadius + (currentGridPos.z * layerSpacing);
        float current_height = (currentGridPos.y * rowHeight) - (totalHeight / 2.0);
        vec3 currentWorldPos = vec3(
            current_radius * cos(current_angle),
            current_height,
            current_radius * sin(current_angle)
        );

        // --- Interpolate in World Space ---
        vec3 worldPos = mix(previousWorldPos, currentWorldPos, interpolationFactor);

        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(worldPos, 1.0);
        
        float baseSize = 15.0 - (currentGridPos.z * 1.0);
        gl_PointSize = baseSize;
    }
}
