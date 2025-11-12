// src/shaders/particle_render.frag.glsl

varying float v_visibility; // Received from the vertex shader

void main() {
    if (v_visibility > 0.5) {
        // Green for visible particles
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
    } else {
        // Red for invisible particles (at origin)
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
}