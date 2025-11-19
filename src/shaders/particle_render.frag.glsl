
// particle_render.frag.glsl
// Fragment shader to render GPGPU-driven particles.

uniform vec3 particleColor;

void main() {
    // Create a soft, circular shape for the particle.
    // 'gl_PointCoord' is a special variable for points that goes from 0.0 to 1.0
    // across the point.
    float dist = length(gl_PointCoord - vec2(0.5));
    
    // Smoothly fade out the edge of the circle.
    float alpha = 1.0 - smoothstep(0.45, 0.5, dist);

    if (alpha < 0.01) {
        discard; // Don't render pixels that are fully transparent
    }

    // Output the final color with the calculated alpha.
    gl_FragColor = vec4(particleColor, alpha);
}
