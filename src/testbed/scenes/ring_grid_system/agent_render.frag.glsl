varying float v_animTimer; // This actually carries the timer value
varying vec2 v_agent_uv;
uniform sampler2D u_textureAgentState;

void main() {
    // Read the agent's state from the texture
    vec4 agentState = texture2D(u_textureAgentState, v_agent_uv);
    float timer = agentState.y;

    // Calculate alpha based on the timer for a pulse effect
    float alpha = sin(timer * 3.14159265);

    // The color is passed from the vertex shader (or set to a default)
    // For now, let's use a fixed color but with the animated alpha
    gl_FragColor = vec4(1.0, 0.0, 0.0, alpha);
}