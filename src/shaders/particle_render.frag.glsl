// particle_render.frag.glsl

// Uniforms for height-based color gradient
uniform vec3 u_terrainLow;
uniform vec3 u_terrainMid;
uniform vec3 u_terrainHigh;
uniform float u_minHeight;
uniform float u_maxHeight;

varying vec3 v_pos;
varying float v_height;

void main() {
    // --- Height-based Color ---
    float normalizedHeight = smoothstep(u_minHeight, u_maxHeight, v_height);

    vec3 color;
    if (normalizedHeight < 0.5) {
        // From low to mid
        color = mix(u_terrainLow, u_terrainMid, normalizedHeight * 2.0);
    } else {
        // From mid to high
        color = mix(u_terrainMid, u_terrainHigh, (normalizedHeight - 0.5) * 2.0);
    }

    // --- Soft Particle Shape ---
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

    if (alpha < 0.01) {
        discard;
    }

    gl_FragColor = vec4(color, alpha);
}