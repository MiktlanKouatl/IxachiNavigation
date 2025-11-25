// IMPORTANTE: GPUComputationRenderer ya define automáticamente:
// uniform vec2 resolution;
// uniform sampler2D texturePosition;
// Por eso NO las escribimos aquí para evitar errores de duplicado.

// --- TUS UNIFORMS PERSONALIZADOS ---
uniform sampler2D textureFlowField; // Textura de Ruido (Esta sí la definimos nosotros)

uniform float delta;
uniform float time;
uniform float worldSize;
uniform float u_heightScale;
uniform float u_lerpFactor;

void main() {
    // Usamos 'resolution' aunque no esté escrita arriba, porque existe invisiblemente
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // 1. Leer posición actual
    // Usamos 'texturePosition' que también existe invisiblemente
    vec4 currentPosInfo = texture2D(texturePosition, uv);
    vec3 currentPos = currentPosInfo.xyz;

    // 2. Calcular coordenada en el mapa de ruido
    // Mapeamos la posición del mundo al espacio 0-1 de la textura
    vec2 flowUV = (currentPos.xz / worldSize) + 0.5;
    
    // Clamp para evitar bordes raros
    flowUV = clamp(flowUV, 0.0, 1.0);

    // 3. Muestrear el ruido
    vec4 flowData = texture2D(textureFlowField, flowUV);
    // El ruido suele venir en el canal R. Asumimos rango 0 a 1.
    float noiseValue = flowData.r; 

    // 4. Calcular altura objetivo
    // (noiseValue - 0.5) para que vaya hacia arriba y abajo
    float targetHeight = (noiseValue - 0.5) * u_heightScale;

    // 5. Moverse suavemente hacia la altura objetivo
    // Usamos 'delta' para que sea independiente de los FPS
    float newHeight = mix(currentPos.y, targetHeight, u_lerpFactor * delta * 5.0);

    // 6. Guardar resultado (X y Z no cambian)
    gl_FragColor = vec4(currentPos.x, newHeight, currentPos.z, 1.0);
}