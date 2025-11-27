uniform sampler2D texturePosition;
uniform float particleSize;
uniform float minParticleSize;
uniform float cameraConstant;

// AÑADIMOS ESTO: Recibimos el atributo personalizado que acabamos de renombrar
attribute vec2 reference; 

varying vec3 v_pos;
varying float v_height;

void main() {
    // USAMOS 'reference' EN LUGAR DE 'uv'
    // Esto asegura que cada partícula lea SU propio píxel de posición
    vec3 pos = texture2D(texturePosition, reference).xyz;

    v_pos = pos;
    v_height = pos.y;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = max(minParticleSize, particleSize * cameraConstant / (-mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
}