// Compute shader for updating agent positions in a 3D grid.

uniform sampler2D textureAgentState; // Agent's internal state

uniform float gridColumns;
uniform float gridRows;
uniform float gridLayers;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Read current state
    vec4 posData = texture2D(texturePosition, uv);
    vec3 currentPos = posData.xyz;
    float is_alive = posData.w;

    vec4 agentState = texture2D(textureAgentState, uv);
    float behaviorID = agentState.x;
    float stepCounter = agentState.y;

    if (is_alive > 0.5) {
        if (behaviorID == 1.0) { // --- 'Star' Behavior ---
            // For this behavior, 'textureVelocity' stores the anchor point
            vec3 anchorPos = texture2D(textureVelocity, uv).xyz;
            vec3 newPos = anchorPos;

            // Determine offset based on the animation step to form a simple cross pattern
            if (stepCounter == 0.0) { // Center
                // No offset
            } else if (stepCounter == 1.0) { // Top
                newPos.y += 1.0; 
            } else if (stepCounter == 2.0) { // Right
                newPos.x += 1.0;
            } else if (stepCounter == 3.0) { // Bottom
                newPos.y -= 1.0;
            } else if (stepCounter == 4.0) { // Left
                newPos.x -= 1.0;
            }
            
            currentPos = newPos;

        } else { // --- Default 'Walker' Behavior ---
            // For this behavior, 'textureVelocity' stores the step vector
            vec3 step = texture2D(textureVelocity, uv).xyz;
            currentPos += step;
        }

        // --- Boundary Handling (applies to all behaviors) ---
        currentPos.x = mod(currentPos.x, gridColumns);
        currentPos.y = clamp(currentPos.y, 0.0, gridRows - 1.0);
        currentPos.z = clamp(currentPos.z, 0.0, gridLayers - 1.0);
    }

    gl_FragColor = vec4(currentPos, is_alive);
}
