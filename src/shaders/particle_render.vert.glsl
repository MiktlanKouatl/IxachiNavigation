
// particle_render.vert.glsl
// Vertex shader to render GPGPU-driven particles.

uniform sampler2D texturePosition; // The texture containing all agent positions
uniform float particleSize;
uniform float cameraConstant; // Used for perspective-correct particle size

// The 'uv' attribute is passed from our BufferGeometry. It tells this vertex
// which agent's data to look up in the position texture.
// It is automatically provided by Three.js, so we don't declare it here.

void main() {
    // Look up the world position of this particle from the texture.
    vec3 pos = texture2D(texturePosition, uv).xyz;

    // Project the world position to screen space.
    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // Calculate particle size so it's consistent regardless of distance.
    gl_PointSize = particleSize * (cameraConstant / -modelViewPosition.z);
}


