varying float v_animTimer;
varying vec2 v_agent_uv;
varying float v_randomSeed;

uniform sampler2D u_textureAgentState;

// Function to convert HSL color to RGB
// H, S, L in range [0..1]
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

// Simple pseudo-random number generator
float random(float seed) {
    return fract(sin(seed) * 43758.5453);
}

void main() {
    // Read the agent's state from the texture
    vec4 agentState = texture2D(u_textureAgentState, v_agent_uv);
    float timer = agentState.y;

    // Create a per-agent random frequency for the pulse (must match vertex shader)
    float freqMultiplier = 0.5 + random(v_randomSeed) * 1.0; // Random frequency between 0.5 and 1.5

    // --- Color Calculation ---
    // Generate a random hue from the agent's unique seed
    float hue = random(v_randomSeed);
    // Use the animation timer to create a pulsing lightness
    float lightness = 0.5 + sin(timer * 3.14159265 * freqMultiplier) * 0.25; // Pulses between 0.25 and 0.75
    // Set saturation to 1.0 for vibrant colors
    float saturation = 1.0;
    
    vec3 color = hsl2rgb(vec3(hue, saturation, lightness));

    // --- Alpha Calculation ---
    // Remap sin() from [-1, 1] to [0, 1]
    float alphaPulse = sin(timer * 3.14159265 * freqMultiplier) * 0.5 + 0.5;
    // Now map [0, 1] to a min/max alpha, e.g. [0.2, 1.0]
    float alpha = 0.2 + alphaPulse * 0.8;

    gl_FragColor = vec4(color, alpha);
}