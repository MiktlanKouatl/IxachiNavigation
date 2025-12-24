/* Compute Shader: Position */
// Uniforms
uniform sampler2D tPathPos;
uniform sampler2D tPathNorm;
uniform sampler2D tPathBinorm;
uniform float uPlayerT;
uniform float uWindowSize;

// Constants
const float PI = 3.14159265;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Read stored STATE (not position) from the texture
    // x = Longitudinal Offset (0..1) relative to window
    // y = Angle (0..2PI)
    // z = Radius Offset (0..1)
    // w = Speed/Noise
    vec4 state = texture2D(texturePosition, uv);
    
    // Calculate World T
    // uPlayerT is the center or start of the window? Let's say it's the player's current T.
    // We want the window to be [uPlayerT - window/2, uPlayerT + window/2] or similar.
    // Let's assume window starts at uPlayerT for now (forward view).
    
    float linearT = uPlayerT + (state.x * uWindowSize);
    
    // Wrap T (circular track) or Clamp?
    // Using fract() allows infinite looping on closed tracks.
    linearT = fract(linearT);
    
    // Sample Path LUT
    // LUT is 1D, so v coordinate is 0.5
    vec3 pathPos = texture2D(tPathPos, vec2(linearT, 0.5)).xyz;
    vec3 pathNorm = texture2D(tPathNorm, vec2(linearT, 0.5)).xyz;
    vec3 pathBinorm = texture2D(tPathBinorm, vec2(linearT, 0.5)).xyz;
    float sectorType = texture2D(tPathPos, vec2(linearT, 0.5)).w; // Metadata
    
    // Ring Logic
    float angle = state.y;
    float radius = 10.0 + state.z * 5.0; // Base radius 10 + var 5
    
    // Calculate Ring Position
    // Point on circle in the Normal/Binormal plane
    vec3 ringOffset = (cos(angle) * pathNorm + sin(angle) * pathBinorm) * radius;
    
    // Final Position
    vec3 finalPos = pathPos + ringOffset;
    
    // We WRITE the calculated World Position to gl_FragColor
    // This effectively "updates" the position for the renderer.
    // BUT, we lose the STATE if we overwrite it.
    // CRITICAL: We need TWO textures. 
    // 1. State Texture (Static or slowly changing)
    // 2. Position Texture (Calculated every frame)
    
    // Current setup uses "texturePosition" as the double-buffered variable.
    // If we write FinalPos to it, next frame we lose State.x (Offset).
    
    // SOLUTION:
    // We typically don't update "State" every frame unless particles move relative to the window.
    // If we want the particles to be static in T, we just read State, calculate Pos, and... wait.
    // GPUComputationRenderer "ping-pongs" the texture. Output of Frame N is Input of Frame N+1.
    
    // If we want to OUTPUT World Position for the Vertex Shader, we need to write it.
    // So "texturePosition" MUST contain World Position.
    // Then where do we store State?
    
    // WE NEED A SEPARATE STATIC TEXTURE FOR INITIAL STATE.
    // Let's call it "tInitialState".
    // We don't ping-pong it. We just read it.
    
    // BUT, if we want to animate State (e.g. speed), we need to ping-pong State.
    // And Position is just a DERIVED value, not stored.
    // Wait, the Vertex Shader reads "texturePosition".
    // So the Compute Shader MUST output Position.
    
    // Refined Architecture:
    // Texture 1 (Variable): State (Offset, Angle, Radius, etc.) -> Ping-Pongs.
    // Texture 2 (derived?): Position. 
    // Actually, we can do the Position calculation IN THE VERTEX SHADER.
    // The Compute Shader updates the State (e.g. increments T offset).
    // The Vertex Shader reads State, samples LUT, calculates Pos.
    
    // This is much better.
    // Compute Shader: Update State.x (if moving) or just pass through.
    // Vertex Shader: Read State.x, Sample LUT, Output Position.
    
    // Let's switch to this model.
    // Compute Shader just passes through State for now (or updates it).
    
    gl_FragColor = state; // Just pass through state for now
}