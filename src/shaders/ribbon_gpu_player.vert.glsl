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

// Intent Injection Uniforms
uniform vec3 uPlayerForward; 
uniform float uMinHeadLength;

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
    
    // 1. Lógica de Modos
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
    
    if (isnan(currentPointData.x) && v_isHead < 0.5) {
        gl_Position = vec4(0.0/0.0);
        return;
    }
    v_visibility = isnan(currentPointData.w) ? 1.0 : currentPointData.w;

    vec3 worldPos;
    vec4 nextPointData = getPoint(pointProgress + 1.0 / uPathLength);
    bool hasNext = !isnan(nextPointData.x);

    // Datos del Ancla (Cuello Real)
    vec4 neckAnchorData = getPoint(1.0 / uPathLength);
    vec3 neckAnchorPos = neckAnchorData.rgb;

    // Posición forzada de la cabeza
    vec3 forcedHeadPosFromNeck = vec3(0.0);
    if (hasNext) {
         forcedHeadPosFromNeck = nextPointData.rgb + normalize(uPlayerForward) * uMinHeadLength;
    }

    // Índice numérico aproximado del vértice (0, 1, 2, 3...)
    float indexVal = pointProgress * (uPathLength - 1.0);

    if (v_isHead > 0.5 && hasNext) {
        // [CABEZA]: Siempre visible y proyectada
        worldPos = forcedHeadPosFromNeck;
        v_isDegenerateSegment = 0.0;
        
    } else {
        // [CUERPO]: Posición física
        worldPos = currentPointData.rgb;
        
        if (hasNext) {
            // A. Check de Longitud Local
            float segmentLength = distance(worldPos, nextPointData.rgb);
            if (segmentLength < uMinSegmentLengthThreshold) {
                v_isDegenerateSegment = 1.0;
            }
            
            // B. Check de Singularidad (Global) con PROTECCIÓN DE CUELLO
            if (!isnan(neckAnchorData.x)) {
                float distToSingularity = distance(worldPos, neckAnchorPos);
                
                // Si la distancia al ancla es despreciable, es basura acumulada.
                // Usamos 2.0 veces el umbral para ser agresivos con la limpieza cerca de la cabeza.
                if (distToSingularity < uMinSegmentLengthThreshold * 2.0) {
                    v_isDegenerateSegment = 1.0;
                }
            }
        }
    }

    // --- GEOMETRÍA VIEW SPACE ---
    vec4 currentView = modelViewMatrix * vec4(worldPos, 1.0);
    vec4 nextView = modelViewMatrix * vec4(nextPointData.rgb, 1.0);
    
    // --- CORRECCIÓN DE TANGENTE (Para que el cuello mire a la cabeza) ---
    vec4 prevPointData = getPoint(pointProgress - 1.0 / uPathLength);
    
    if (indexVal < 1.5 && indexVal > 0.5) {
        vec3 fixedPrevPos = worldPos + normalize(uPlayerForward) * uMinHeadLength;
        prevPointData = vec4(fixedPrevPos, 1.0);
    }

    vec4 prevView = modelViewMatrix * vec4(prevPointData.rgb, 1.0);
    bool hasPrev = !isnan(prevPointData.x);

    // --- DIRECCIÓN ---
    vec2 dir;
    vec2 currentScreen = currentView.xy / currentView.w;
    vec2 nextScreen = nextView.xy / nextView.w;
    vec2 prevScreen = prevView.xy / prevView.w;

    if (v_isHead > 0.5) {
        dir = safeNormalize(nextScreen - currentScreen);
    } else {
        if (hasPrev && hasNext) {
            vec2 dir1 = safeNormalize(currentScreen - prevScreen);
            vec2 dir2 = safeNormalize(nextScreen - currentScreen);
            dir = safeNormalize(dir1 + dir2);
        } else if (hasPrev) {
            dir = safeNormalize(currentScreen - prevScreen);
        } else if (hasNext) {
            dir = safeNormalize(nextScreen - currentScreen);
        } else {
            dir = vec2(1.0, 0.0);
        }
    }
    
    vec2 normal = vec2(-dir.y, dir.x);
    float aspect = uResolution.x / uResolution.y;
    normal.x /= aspect;
    normal *= uWidth;

    vec4 offset = vec4(normal * currentView.w, 0.0, 0.0);
    gl_Position = projectionMatrix * (currentView + offset * side);
}