// grid_visual.frag.glsl

// This fragment shader sets the final color of a grid point
// based on its energy.

// The energy value passed from the vertex shader.
varying float vEnergy;

// A color to tint the points.
uniform vec3 color;

void main() {
    // If the energy is very low, discard the fragment to avoid
    // rendering a field of black dots.
    if (vEnergy < 0.01) {
        discard;
    }

    // Set the final color by multiplying the base color with the energy.
    // The alpha is also controlled by the energy, making low-energy
    // points more transparent.
    gl_FragColor = vec4(color * vEnergy, vEnergy);
}