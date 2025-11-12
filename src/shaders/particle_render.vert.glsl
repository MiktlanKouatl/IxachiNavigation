// src/shaders/particle_render.vert.glsl

uniform sampler2D u_particlePositions; // Texture with all particle positions
uniform float u_numParticles; // Total number of particles

void main() {
    // Use gl_VertexID to figure out which particle this vertex corresponds to
    float particleIndex = floor(gl_VertexID / 2.0);
    
    // Calculate the UV coordinates to look up the particle's position in the texture
    float u = (particleIndex + 0.5) / u_numParticles; // +0.5 to sample center of texel
    float v = 0.5;

    vec3 particlePos = texture2D(u_particlePositions, vec2(u, v)).xyz;

    // Final vertex position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(particlePos, 1.0);
}