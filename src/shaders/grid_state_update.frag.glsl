// grid_state_update.frag.glsl

// This fragment shader outputs the "color" of the agent's brush.
// This color represents the "energy" or "influence" that the agent
// adds to the grid.

uniform float influence;

void main() {
    // Output a constant value. We use the red channel for energy.
    // The other channels could be used for other properties in the future.
    gl_FragColor = vec4(influence, 0.0, 0.0, 1.0);
}
