// IMPORTANTE: GPUComputationRenderer define automáticamente resolution y texturePosition

// --- UNIFORMS ---
// Ya no necesitamos textureFlowField porque calcularemos el ruido aquí mismo
uniform float delta;
uniform float time;
uniform float worldSize;
uniform float u_heightScale;
uniform float u_lerpFactor;
uniform float u_yOffset; // Nueva uniform para el offset en Y

// =========================================================================
// --- SIMPLEX NOISE 3D (Ashima Arts / Ian McEwan) ---
// Copiado directamente para no depender de texturas externas
// =========================================================================
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  return 105.0 * ( dot(p0, x0) 
                 + 0.5 * dot(p1, x1) 
                 + dot(p2, x2) 
                 + dot(p3, x3) );
}
// =========================================================================

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // 1. Leer posición actual
    vec4 currentPosInfo = texture2D(texturePosition, uv);
    vec3 currentPos = currentPosInfo.xyz;

    // 2. Calcular coordenada UV basada en el Grid (Más estable que leer texturePosition)
    // Esto recalcula X y Z perfectamente alineados al grid cada frame
    // Asumiendo que resolution es cuadrada (ej. 128x128)
    // Mapeamos UV (0..1) a World (-worldSize/2 .. worldSize/2)
    vec2 gridPos = (uv - 0.5) * worldSize;

    // 3. GENERAR RUIDO MATEMÁTICO
    // noisePos: Escala del ruido (dividir por un número grande hace el ruido "más grande")
    // time: Mueve el ruido en el eje Z para simular que avanzamos o que el terreno fluye
    // snoise devuelve entre -1 y 1
    
    // Capa 1: Montañas grandes
    float noise1 = snoise(vec3(gridPos.x * 0.02, gridPos.y * 0.02, time * 0.1));
    
    // Capa 2: Detalles pequeños (opcional)
    float noise2 = snoise(vec3(gridPos.x * 0.05, gridPos.y * 0.05, time * 0.2)) * 0.25;

    float combinedNoise = noise1 + noise2;

    // 4. Calcular altura objetivo
    float targetHeight = (combinedNoise * u_heightScale) + u_yOffset;

    // 5. Interpolación (Lerp) para suavidad temporal
    float newHeight = mix(currentPos.y, targetHeight, u_lerpFactor * delta * 5.0);

    // 6. Escribir resultado
    // Importante: Usamos gridPos.x y gridPos.y (que es Z del mundo) para asegurar que X y Z 
    // nunca se muevan de su grilla perfecta.
    gl_FragColor = vec4(gridPos.x, newHeight, gridPos.y, 1.0);
}