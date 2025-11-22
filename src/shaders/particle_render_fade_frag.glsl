// particle_render_fade_frag.glsl
// Fragment shader to render GPGPU-driven particles with a fade effect based on life.

uniform vec3 particleColor;
varying float vLife; // Received from vertex shader

void main() {
    // Create a soft, circular shape for the particle.
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.45, 0.5, dist);

    if (alpha < 0.01) {
        discard;
    }

    // Modulate the particle's alpha by its life.
    // The smoothstep creates a gentle fade-in as the particle is born.
    float lifeAlpha = smoothstep(0.0, 0.1, vLife);
    
    gl_FragColor = vec4(particleColor, alpha * lifeAlpha);
}
