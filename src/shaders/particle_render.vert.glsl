// particle_render.vert.glsl
// Vertex shader to render GPGPU-driven particles.

uniform sampler2D texturePosition; // The texture containing all agent positions
uniform float particleSize;
uniform float cameraConstant; // Used for perspective-correct particle size

varying vec3 v_pos; // Pass world position to fragment shader

void main() {
    // Look up the world position of this particle from the texture.
    vec3 pos = texture2D(texturePosition, uv).xyz;
    v_pos = pos; // Store it for the fragment shader

    // Project the world position to screen space.
    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // Calculate particle size so it's consistent regardless of distance.
    gl_PointSize = particleSize * (cameraConstant / -modelViewPosition.z);
}
