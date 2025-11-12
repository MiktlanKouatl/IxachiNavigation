// src/shaders/particle_compute.glsl

uniform sampler2D u_positions; // Input positions (read)
uniform vec3 u_emitterPos;     // The current position of the player

varying vec2 vUv; // UV coordinates passed from the vertex shader

void main() {
    float textureWidth = float(textureSize(u_positions, 0).x);
    
    // Calculate the U coordinate of the *previous* pixel in the texture
    float previousPixelU = vUv.x - (1.0 / textureWidth);

    vec4 newPos; // We now work with a vec4 to include the visibility flag (w)

    // Check if we are the very first particle in the trail
    if (previousPixelU < 0.0) {
        // If so, take the fresh position from the emitter and mark it as visible
        newPos = vec4(u_emitterPos, 1.0);
    } else {
        // Otherwise, take the full vec4 (position + visibility) of the particle in front of us
        newPos = texture2D(u_positions, vec2(previousPixelU, 0.5));
    }

    // --- Output ---
    // Write the calculated new position and visibility to the output texture
    gl_FragColor = newPos;
}