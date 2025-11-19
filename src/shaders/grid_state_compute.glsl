// grid_state_compute.glsl

// This shader updates the state of the main grid.
// It reads the previous grid state and the agent influence "stamp",
// combines them, and applies a decay factor.

// The texture containing the agent influence for this frame.
uniform sampler2D agentInfluenceTexture;

// The decay factor to make old drawings fade.
uniform float decay;

// The previous state of the grid, passed automatically by GPUComputationRenderer
uniform sampler2D gridState;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // Read the previous state of this grid pixel.
    // The 'gridState' name is a placeholder; the GPUComputationRenderer
    // will automatically pass its own output texture as the input here.
    vec4 previousState = texture2D(gridState, uv);

    // Read the agent influence at this pixel.
    vec4 influence = texture2D(agentInfluenceTexture, uv);

    // --- Update Logic ---
    // Add the new influence and apply decay to the old state.
    // We are only using the 'r' channel for energy.
    float newEnergy = previousState.r * decay + influence.r;

    // Clamp the energy to a [0, 1] range to prevent it from blowing out.
    newEnergy = clamp(newEnergy, 0.0, 1.0);

    gl_FragColor = vec4(newEnergy, 0.0, 0.0, 1.0);
}
