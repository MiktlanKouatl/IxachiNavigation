
// flow_field_cylindrical_compute.glsl
// Creates a 3D cylindrical vector field with multiple layers and speeds.

uniform float worldSize;
uniform float numLayers;
uniform vec3 parallaxSpeeds; // (Fast, Medium, Slow)
uniform float verticalSpeed;

void main() {
    // Map the pixel coordinate to a position in our simulation world.
    vec2 worldPos = (gl_FragCoord.xy / resolution.xy - 0.5) * worldSize;
    float radius = length(worldPos);

    // --- 1. Determine Layer and Speed ---
    float layerF = floor(radius / (worldSize * 0.5) * numLayers);
    float speed = parallaxSpeeds.x; // Default to fast speed

    if (layerF >= 3.0 && layerF < 6.0) {
        speed = parallaxSpeeds.y; // Medium speed
    } else if (layerF >= 6.0) {
        speed = parallaxSpeeds.z; // Slow speed
    }

    // --- 2. Calculate Helical Flow Vector ---
    // The tangent to the circle at worldPos is (-y, x).
    vec3 tangent = vec3(-worldPos.y, worldPos.x, 0.0);
    
    // Add a vertical component to create a helix
    vec3 flowVector = normalize(tangent + vec3(0.0, 0.0, verticalSpeed));

    // Safeguard: Avoid normalizing a zero vector, which results in NaN.
    if (length(flowVector) > 0.0) {
        flowVector = normalize(flowVector);
    }

    // --- 3. Apply Speed ---
    vec3 finalVector = flowVector * speed;

    // Output the final 3D vector.
    gl_FragColor = vec4(finalVector, 1.0);
}
