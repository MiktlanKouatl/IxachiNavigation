// particle_render_fade_vert.glsl
// Vertex shader to render GPGPU-driven particles, passing life to fragment shader.

uniform sampler2D texturePosition;
uniform float particleSize;
uniform float cameraConstant;

varying float vLife; // Varying to pass life to the fragment shader

void main() {
    // Look up the world position and life of this particle from the texture.
    vec4 posData = texture2D(texturePosition, uv);
    vec3 pos = posData.xyz;
    vLife = posData.w; // The 'w' component holds the particle's life

    // Project the world position to screen space.
    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // Calculate particle size so it's consistent regardless of distance.
    gl_PointSize = particleSize * (cameraConstant / -modelViewPosition.z);
}
