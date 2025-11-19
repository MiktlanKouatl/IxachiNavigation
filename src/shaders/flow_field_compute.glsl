
// flow_field_compute.glsl
// Creates a 2D vector field where vectors point in concentric circles.

uniform float worldSize;

void main() {
    // gl_FragCoord.xy gives us the pixel coordinate we are writing to.
    // resolution.xy is the size of the texture (e.g., 128x128).
    // We map this pixel coordinate to a position in our simulation world.
    vec2 worldPos = (gl_FragCoord.xy / resolution.xy - 0.5) * worldSize;

    // Calculate the direction vector for a circular path.
    // This is the tangent to the circle at worldPos.
    // The vector perpendicular to the vector from the center (worldPos) is (-y, x).
    vec3 flowVector = vec3(-worldPos.y, worldPos.x, 0.0);

    // Safeguard: Avoid normalizing a zero vector, which results in NaN.
    if (length(flowVector) > 0.0) {
        flowVector = normalize(flowVector);
    }

    // Output the vector. This will be stored in the flow field texture.
    // The w component can be used for other data, but we'll leave it at 1.0 for now.
    gl_FragColor = vec4(flowVector, 1.0);
}
