// particle_render.frag.glsl
// Fragment shader to render GPGPU-driven particles.

uniform sampler2D textureFlowField;
uniform float worldSize;
uniform vec3 particleColor; // We can still use this as a base or tint

varying vec3 v_pos;

void main() {
    // --- Dynamic Color from Flow Field ---
    vec2 flowUv = v_pos.xz / worldSize + 0.5;
    vec3 flowVector = texture2D(textureFlowField, flowUv).xyz;
    vec3 flowColor = flowVector * 0.5 + 0.5; // Map [-1, 1] to [0, 1]

    // --- Soft Particle Shape ---
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.45, 0.5, dist);

    if (alpha < 0.01) {
        discard;
    }

    // Blend the flow color with a base particle color for more control
    // For now, we just use the flow color directly.
    gl_FragColor = vec4(flowColor, alpha);
}
