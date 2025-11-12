// src/shaders/particle_debug.vert.glsl

uniform sampler2D u_positions; // The texture with all particle positions
attribute float a_particleIndex; // An attribute to identify each particle

varying float v_visibility; // Pass visibility to fragment shader

void main() {
    // The texture is a 1D array of pixels, so we only need the U coordinate.
    // We calculate the U coordinate for the center of the pixel for this particle.
    float u = (a_particleIndex + 0.5) / float(textureSize(u_positions, 0).x);
    
    vec4 posData = texture2D(u_positions, vec2(u, 0.5));
    vec3 pos = posData.xyz;
    v_visibility = posData.w; // Pass the visibility flag

    // Set the final position of the point
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    
    // Make the points a fixed size so we can see them
    gl_PointSize = 5.0;
}

