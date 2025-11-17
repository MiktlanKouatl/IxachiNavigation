// grid_state_update.frag.glsl (now Agent Influence Shader)
// This shader runs for each agent "point".
// Its job is to output an "influence" vector (r, g, b, a) that will be used
// by the grid_state_compute shader.
// r: energy to add
// a: update rule (0.0 = additive decay, 1.0 = direct write)

uniform sampler2D textureAgentState;

void main() {
    // For now, we only have one behavior: the "Glow" brush.
    // This brush adds 1.0 unit of energy and uses the additive decay rule.
    
    // In the future, we could read the agent's state and change the output:
    // vec4 agentState = texture2D(textureAgentState, gl_PointCoord);
    // float behaviorID = agentState.r;
    // if (behaviorID == 1.0) { ... }

    gl_FragColor = vec4(1.0, 0.0, 0.0, 0.0);
}
