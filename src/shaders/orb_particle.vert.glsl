uniform float uTime;
uniform float uSize;
uniform float uFadeDuration;

attribute float a_scale;
attribute vec3 a_colorStart;
attribute vec3 a_colorCollected;
attribute float a_isCollected;     // 0.0 = No, 1.0 = Sí
attribute float a_collectionTime;  // Timestamp de cuándo fue recolectado

varying vec3 vColor;
varying float vAlpha;

void main() {
    vec3 pos = position;

    // --- LÓGICA DE FADE IN (GPU) ---
    // Si ha sido recolectado, calculamos la opacidad basada en el tiempo transcurrido
    float alpha = 1.0;
    vec3 finalColor = a_colorStart;

    if (a_isCollected > 0.5) {
        finalColor = a_colorCollected;
        
        // Calculamos cuánto tiempo ha pasado desde la recolección
        float timeDelta = uTime - a_collectionTime;
        
        // Fade In: de 0.0 a 1.0 en 'uFadeDuration' segundos
        alpha = smoothstep(0.0, uFadeDuration, timeDelta);
    }

    // Un pequeño movimiento de flotación si NO está siendo atraído (esto lo maneja CPU por posición, 
    // pero podemos añadir "ruido" visual aquí)
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Tamaño del punto (afectado por la perspectiva)
    gl_PointSize = uSize * a_scale * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vColor = finalColor;
    vAlpha = alpha;
}