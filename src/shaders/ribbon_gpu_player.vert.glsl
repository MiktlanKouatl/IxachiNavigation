attribute float a_index;
attribute float side;
attribute float a_isHead;

varying vec2 vUv;
varying float vTrailUv;
varying float v_visibility;
varying float v_isDegenerateSegment;
varying float v_isHead;

uniform vec2 uResolution;
uniform float uWidth;
uniform sampler2D uPathTexture;
uniform float uPathLength;
uniform int uUseMode;
uniform float uRevealProgress;
uniform float uTrailHead;
uniform float uTrailLength;

uniform float uMinSegmentLengthThreshold;

// --- NUEVOS UNIFORMS (Intent Injection) ---
uniform vec3 uPlayerForward;  // Dirección intencional del jugador
uniform float uMinHeadLength; // Longitud mínima forzada para la cabeza

vec4 getPoint(float progress) {
    if (progress < 0.0 || progress > 1.0) {
        return vec4(0.0/0.0);
    }
    vec4 pointData = texture2D(uPathTexture, vec2(progress, 0.0));
    if (pointData.w < 0.5) {
        return vec4(0.0/0.0);
    }
    return pointData;
}

vec2 safeNormalize(vec2 v) {
    float len = length(v);
    if (len > 0.0) {
        return v / len;
    }
    return vec2(0.0);
}

void main() {
    vUv = uv;
    vTrailUv = a_index;
    v_isHead = a_isHead;
    v_isDegenerateSegment = 0.0; 

    float pointProgress = a_index;
    
    // Lógica de Modos (Reveal / Trail)
    if (uUseMode == 1) {
        pointProgress = a_index;
        if (a_index > uRevealProgress) {
            gl_Position = vec4(0.0/0.0);
            return;
        }
        vTrailUv = a_index / max(0.001, uRevealProgress);
    } else if (uUseMode == 2) {
        pointProgress = uTrailHead - a_index * uTrailLength;
        vTrailUv = a_index;
    }

    vec4 currentPointData = getPoint(pointProgress);
    if (isnan(currentPointData.x)) {
        gl_Position = vec4(0.0/0.0);
        return;
    }
    v_visibility = currentPointData.w;

    // --- LÓGICA DE PROTECCIÓN DE CABEZA (Head Protection) ---
    // Obtenemos el siguiente punto para medir distancia
    vec4 nextPointData = getPoint(pointProgress + 1.0 / uPathLength);
    vec3 worldPos = currentPointData.rgb;
    bool hasNext = !isnan(nextPointData.x);

    // Si somos la cabeza y el segmento es demasiado corto (colapsado por inmovilidad)
    if (v_isHead > 0.5 && hasNext) {
        float dist = distance(worldPos, nextPointData.rgb);
        
        if (dist < uMinHeadLength) {
            // "Inyectamos intención": Proyectamos la cabeza hacia adelante artificialmente
            worldPos = nextPointData.rgb + normalize(uPlayerForward) * uMinHeadLength;
            // Garantizamos que no se marque como degenerado
            v_isDegenerateSegment = 0.0;
        }
    }

    // --- GEOMETRÍA ---
    vec4 currentView = modelViewMatrix * vec4(worldPos, 1.0);
    vec4 prevPointData = getPoint(pointProgress - 1.0 / uPathLength);
    vec4 nextView = modelViewMatrix * vec4(nextPointData.rgb, 1.0);
    vec4 prevView = modelViewMatrix * vec4(prevPointData.rgb, 1.0);

    bool hasPrev = !isnan(prevPointData.x);

    // Check para segmentos normales (no cabeza)
    if (hasNext && v_isHead < 0.5) {
        float segmentLength = distance(worldPos, nextPointData.rgb);
        if (segmentLength < uMinSegmentLengthThreshold) {
            v_isDegenerateSegment = 1.0;
        }
    }

    vec2 dir;
    vec2 currentScreen = currentView.xy / currentView.w;
    vec2 prevScreen = prevView.xy / prevView.w;
    vec2 nextScreen = nextView.xy / nextView.w;

    if (hasPrev && hasNext) {
        vec2 dir1 = safeNormalize(currentScreen - prevScreen);
        vec2 dir2 = safeNormalize(nextScreen - currentScreen);
        dir = safeNormalize(dir1 + dir2);
    } else if (hasPrev) {
        dir = safeNormalize(currentScreen - prevScreen);
    } else if (hasNext) {
        // En caso de cabeza corregida, la distancia está garantizada aquí
        dir = safeNormalize(nextScreen - currentScreen);
    } else {
        dir = vec2(1.0, 0.0);
    }
    
    vec2 normal = vec2(-dir.y, dir.x);
    float aspect = uResolution.x / uResolution.y;
    normal.x /= aspect;
    normal *= uWidth;

    vec4 offset = vec4(normal * currentView.w, 0.0, 0.0);
    gl_Position = projectionMatrix * (currentView + offset * side);
}