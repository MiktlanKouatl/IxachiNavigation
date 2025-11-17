// Vertex Shader for Grid State Update
// This shader positions a "point" for each agent directly onto the 3D grid cell it occupies.

uniform sampler2D texturePosition; // The texture containing agent positions (col, row, layer)

// Grid dimensions needed to map 3D coords to a flattened 2D texture space
uniform float gridColumns;
uniform float gridRows;
uniform float gridLayers;
uniform vec2 resolution; // NEW: Declare resolution uniform

void main() {
    // 'uv' is the lookup coordinate for this specific agent in the texturePosition map.
    vec4 posData = texture2D(texturePosition, uv);
    vec3 gridPos = posData.xyz; // (col, row, layer)
    float is_alive = posData.w;

    if (is_alive < 0.5) {
        // Hide inactive agents by moving them off-screen.
        gl_Position = vec4(-2.0, -2.0, -2.0, 0.0);
        gl_PointSize = 0.0;
    } else {
        // Flatten the 3D grid coordinate into a 1D index.
        // This is the core of the mapping logic.
        float flatIndex = gridPos.x + gridPos.y * gridColumns + gridPos.z * (gridColumns * gridRows);

        // Convert the 1D index into a 2D coordinate that matches the texel centers of our render target.
        // 'resolution' is the dimensions of the texture we are rendering to (e.g., 96x96).
        float u = mod(flatIndex, resolution.x);
        float v = floor(flatIndex / resolution.x);
        
        // Normalize the coordinate to the range [-1.0, 1.0] for clip space.
        // We add 0.5 to center the point on the texel.
        vec2 clipSpacePos = (vec2(u, v) + 0.5) / resolution * 2.0 - 1.0;

        // Set the final position. Z and W are standard for this kind of 2D rendering.
        gl_Position = vec4(clipSpacePos, 0.0, 1.0);
        
        // The point size must be exactly 1.0 to ensure we only color one texel.
        gl_PointSize = 1.0;
    }
}
