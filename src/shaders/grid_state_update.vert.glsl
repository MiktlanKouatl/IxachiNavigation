// grid_state_update.vert.glsl

// This vertex shader is used to draw the agent's influence "stamp".
// It reads an agent's position from a texture and places a point
// at the corresponding location on the grid's render target.

// The texture containing all agent positions
uniform sampler2D texturePosition; 

// The UV coordinate for which agent we are currently drawing.
attribute vec2 agentUv;

// The size of the world the grid occupies.
uniform vec2 worldSize;

void main() {
    // Fetch the agent's 3D position from the GPGPU texture.
    vec3 pos = texture2D(texturePosition, agentUv).xyz;

    // --- Map 3D world position to 2D grid UV ---
    // Normalize the agent's XY position from world space [-worldSize/2, +worldSize/2]
    // to grid UV space [0, 1].
    vec2 gridUv = (pos.xy / worldSize) + 0.5;

    // --- Map grid UV to clip space ---
    // We are rendering to a render target that covers the whole screen.
    // We transform our [0, 1] UV to clip space [-1, 1].
    gl_Position = vec4(gridUv * 2.0 - 1.0, 0.0, 1.0);
    
    // Set the point size. This could be a uniform to control brush size.
    gl_PointSize = 2.0; 
}
