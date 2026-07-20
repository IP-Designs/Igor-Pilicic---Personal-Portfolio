// ============================================
// PARTICLE EFFECTS SYSTEM
// Expanded particle system for various visual effects
// Built on top of the existing environmental particle system
// ============================================

// Particle effect presets
const PARTICLE_PRESETS = {
  // === ENVIRONMENTAL ===
  rain: {
    colors: [[80, 100, 160, 200], [60, 80, 140, 180], [70, 90, 150, 190], [50, 70, 130, 170]],
    minSpeed: 8, maxSpeed: 12,
    spread: 0.1, // Very vertical
    gravity: 0.5,
    friction: 0.99,
    minSize: 1, maxSize: 4,
    minLife: 30, maxLife: 50,
    shape: 'line', // 1px wide vertical streak
    spawnArea: 'screen',
    continuous: true
  },
  
  snow: {
    colors: [[255, 255, 255, 200], [240, 245, 255, 180], [230, 240, 250, 160]],
    minSpeed: 0.5, maxSpeed: 1.5,
    spread: Math.PI / 4, // Gentle drift
    gravity: 0.02,
    friction: 0.98,
    minSize: 2, maxSize: 4,
    minLife: 100, maxLife: 200,
    shape: 'circle',
    wobble: true, // Side-to-side drift
    spawnArea: 'screen',
    continuous: true
  },
  
  leaves: {
    colors: [[100, 150, 50], [120, 160, 40], [80, 130, 30], [140, 120, 30]],
    minSpeed: 0.3, maxSpeed: 1.0,
    spread: Math.PI / 3,
    gravity: 0.015,
    friction: 0.97,
    minSize: 3, maxSize: 5,
    minLife: 150, maxLife: 300,
    shape: 'rect',
    wobble: true,
    spin: true,
    spawnArea: 'screen',
    continuous: true
  },
  
  // === FIRE & HEAT ===
  fire: {
    colors: [[255, 100, 0], [255, 150, 0], [255, 200, 50], [255, 80, 0]],
    minSpeed: 1.5, maxSpeed: 3.0,
    spread: Math.PI / 6,
    gravity: -0.08, // Float upward
    friction: 0.96,
    minSize: 3, maxSize: 6,
    minLife: 20, maxLife: 40,
    shape: 'circle',
    glow: true,
    fadeColor: [100, 30, 0] // Fade to ember color
  },
  
  smoke: {
    colors: [[80, 80, 80, 150], [100, 100, 100, 120], [60, 60, 60, 100]],
    minSpeed: 0.3, maxSpeed: 0.8,
    spread: Math.PI / 4,
    gravity: -0.02, // Slow rise
    friction: 0.98,
    minSize: 4, maxSize: 10,
    minLife: 60, maxLife: 120,
    shape: 'circle',
    grow: true // Particles grow over time
  },
  
  ember: {
    colors: [[255, 100, 0], [255, 150, 50], [255, 80, 0]],
    minSpeed: 0.5, maxSpeed: 2.0,
    spread: Math.PI / 2,
    gravity: -0.03,
    friction: 0.97,
    minSize: 1, maxSize: 3,
    minLife: 40, maxLife: 80,
    shape: 'circle',
    glow: true,
    flicker: true
  },
  
  // === WATER ===
  splash: {
    colors: [[100, 150, 255, 200], [80, 130, 220, 180], [120, 170, 255, 160]],
    minSpeed: 2.0, maxSpeed: 4.0,
    spread: Math.PI / 2, // Wide arc upward
    gravity: 0.15,
    friction: 0.95,
    minSize: 2, maxSize: 4,
    minLife: 20, maxLife: 35,
    shape: 'circle',
    burst: true // All at once
  },
  
  ripple: {
    colors: [[150, 200, 255, 100], [130, 180, 240, 80]],
    minSpeed: 0.5, maxSpeed: 1.5,
    spread: Math.PI * 2, // Full circle
    gravity: 0,
    friction: 0.96,
    minSize: 2, maxSize: 6,
    minLife: 30, maxLife: 50,
    shape: 'ring', // Expanding ring
    grow: true
  },
  
  bubbles: {
    colors: [[200, 230, 255, 150], [180, 220, 250, 120], [220, 240, 255, 100]],
    minSpeed: 0.3, maxSpeed: 0.8,
    spread: Math.PI / 8,
    gravity: -0.05, // Float up
    friction: 0.98,
    minSize: 2, maxSize: 5,
    minLife: 40, maxLife: 80,
    shape: 'circle',
    wobble: true
  },
  
  // === MAGIC & EFFECTS ===
  sparkle: {
    colors: [[255, 255, 200], [255, 220, 100], [200, 255, 255], [255, 200, 255]],
    minSpeed: 0.5, maxSpeed: 2.0,
    spread: Math.PI * 2,
    gravity: 0,
    friction: 0.95,
    minSize: 1, maxSize: 3,
    minLife: 15, maxLife: 30,
    shape: 'star',
    glow: true,
    flicker: true,
    burst: true
  },
  
  magic: {
    colors: [[150, 100, 255], [200, 150, 255], [100, 200, 255], [255, 150, 200]],
    minSpeed: 1.0, maxSpeed: 2.5,
    spread: Math.PI * 2,
    gravity: 0,
    friction: 0.94,
    minSize: 2, maxSize: 4,
    minLife: 25, maxLife: 50,
    shape: 'circle',
    glow: true,
    orbit: true // Spiral motion
  },
  
  heal: {
    colors: [[100, 255, 100], [150, 255, 150], [200, 255, 200]],
    minSpeed: 0.5, maxSpeed: 1.5,
    spread: Math.PI * 2,
    gravity: -0.03,
    friction: 0.96,
    minSize: 2, maxSize: 4,
    minLife: 30, maxLife: 60,
    shape: 'cross',
    glow: true
  },
  
  damage: {
    colors: [[255, 50, 50], [255, 100, 50], [200, 0, 0]],
    minSpeed: 2.0, maxSpeed: 4.0,
    spread: Math.PI * 2,
    gravity: 0.1,
    friction: 0.92,
    minSize: 2, maxSize: 5,
    minLife: 15, maxLife: 30,
    shape: 'rect',
    burst: true
  },
  
  // === IMPACT & ACTION ===
  dust_poof: {
    colors: [[180, 160, 140, 150], [200, 180, 160, 120], [160, 140, 120, 100]],
    minSpeed: 1.0, maxSpeed: 3.0,
    spread: Math.PI * 2,
    gravity: 0.02,
    friction: 0.92,
    minSize: 3, maxSize: 8,
    minLife: 20, maxLife: 40,
    shape: 'circle',
    burst: true,
    grow: true
  },
  
  impact: {
    colors: [[255, 255, 255], [200, 200, 200], [150, 150, 150]],
    minSpeed: 3.0, maxSpeed: 6.0,
    spread: Math.PI * 2,
    gravity: 0.1,
    friction: 0.90,
    minSize: 2, maxSize: 4,
    minLife: 10, maxLife: 20,
    shape: 'rect',
    burst: true
  },
  
  confetti: {
    colors: [[255, 100, 100], [100, 255, 100], [100, 100, 255], [255, 255, 100], [255, 100, 255]],
    minSpeed: 1.0, maxSpeed: 3.0,
    spread: Math.PI / 2,
    gravity: 0.04,
    friction: 0.97,
    minSize: 3, maxSize: 6,
    minLife: 60, maxLife: 120,
    shape: 'rect',
    spin: true,
    wobble: true,
    burst: true
  }
};

// Effect particle class (more advanced than EnvironmentalParticle)
class EffectParticle {
  constructor(x, y, preset, direction = -Math.PI / 2) {
    this.x = x;
    this.y = y;
    
    let config = typeof preset === 'string' ? PARTICLE_PRESETS[preset] : preset;
    if (!config) config = PARTICLE_PRESETS.sparkle;
    
    this.config = config;
    
    // Physics
    let speed = random(config.minSpeed, config.maxSpeed);
    let angle = direction + random(-config.spread / 2, config.spread / 2);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.gravity = config.gravity || 0;
    this.friction = config.friction || 0.98;
    
    // Visual
    this.baseSize = random(config.minSize, config.maxSize);
    this.size = this.baseSize;
    this.color = config.colors[Math.floor(random(config.colors.length))];
    this.fadeColor = config.fadeColor || null;
    this.shape = config.shape || 'rect';
    
    // Lifecycle
    this.life = 1.0;
    this.maxLife = random(config.minLife, config.maxLife);
    this.age = 0;
    
    // Special effects
    this.rotation = random(0, Math.PI * 2);
    this.rotationSpeed = config.spin ? random(-0.2, 0.2) : 0;
    this.wobbleOffset = random(0, Math.PI * 2);
    this.wobbleSpeed = config.wobble ? random(0.05, 0.15) : 0;
    this.orbitAngle = random(0, Math.PI * 2);
    this.orbitSpeed = config.orbit ? random(0.05, 0.1) : 0;
    this.flickerPhase = random(0, Math.PI * 2);
    this.glow = config.glow || false;
    this.grow = config.grow || false;
  }
  
  update() {
    this.age++;
    this.life = 1 - (this.age / this.maxLife);
    
    if (this.life <= 0) return false;
    
    // Apply physics
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // Wobble effect
    if (this.wobbleSpeed > 0) {
      this.vx += sin(this.age * this.wobbleSpeed + this.wobbleOffset) * 0.1;
    }
    
    // Orbit effect
    if (this.orbitSpeed > 0) {
      this.orbitAngle += this.orbitSpeed;
      this.vx += cos(this.orbitAngle) * 0.3;
      this.vy += sin(this.orbitAngle) * 0.3;
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Rotation
    this.rotation += this.rotationSpeed;
    
    // Size changes
    if (this.grow) {
      this.size = this.baseSize * (1 + (1 - this.life) * 2);
    }
    
    return true;
  }
  
  draw() {
    push();
    
    // Calculate alpha
    let alpha = this.life * 255;
    if (this.config.flicker) {
      alpha *= 0.5 + 0.5 * sin(this.age * 0.5 + this.flickerPhase);
    }
    
    // Color interpolation if fadeColor exists
    let r, g, b, a;
    if (this.fadeColor && this.life < 0.5) {
      let t = 1 - this.life * 2;
      r = lerp(this.color[0], this.fadeColor[0], t);
      g = lerp(this.color[1], this.fadeColor[1], t);
      b = lerp(this.color[2], this.fadeColor[2], t);
    } else {
      r = this.color[0];
      g = this.color[1];
      b = this.color[2];
    }
    a = this.color[3] !== undefined ? this.color[3] * this.life : alpha;
    
    // Glow effect
    if (this.glow) {
      noStroke();
      fill(r, g, b, a * 0.3);
      ellipse(this.x, this.y, this.size * 3, this.size * 3);
    }
    
    // Draw shape
    translate(this.x, this.y);
    rotate(this.rotation);
    noStroke();
    fill(r, g, b, a);
    
    switch (this.shape) {
      case 'circle':
        ellipse(0, 0, this.size, this.size);
        break;
      case 'rect':
        rectMode(CENTER);
        rect(0, 0, this.size, this.size * 0.6);
        break;
      case 'line':
        rectMode(CENTER);
        rect(0, 0, 1, this.size);
        break;
      case 'star':
        this.drawStar(0, 0, this.size * 0.5, this.size, 4);
        break;
      case 'cross':
        rectMode(CENTER);
        rect(0, 0, this.size, this.size * 0.3);
        rect(0, 0, this.size * 0.3, this.size);
        break;
      case 'ring':
        noFill();
        stroke(r, g, b, a);
        strokeWeight(1);
        ellipse(0, 0, this.size, this.size);
        break;
      default:
        rectMode(CENTER);
        rect(0, 0, this.size, this.size);
    }
    
    pop();
  }
  
  drawStar(cx, cy, innerR, outerR, points) {
    beginShape();
    for (let i = 0; i < points * 2; i++) {
      let angle = (i * Math.PI) / points - Math.PI / 2;
      let r = i % 2 === 0 ? outerR : innerR;
      vertex(cx + cos(angle) * r, cy + sin(angle) * r);
    }
    endShape(CLOSE);
  }
}

// Particle effect manager
var particleEffects = {
  particles: [],
  weatherParticles: [],  // Separate array for screen-space weather
  rainSplashes: [],      // Expanding impact circles
  maxParticles: 500,
  maxWeatherParticles: 600,
  enabled: true,
  weatherIntensity: 1.0,  // Multiplier for spawn rates
  
  // Rain tuning parameters
  rainConfig: {
    opacity: 255,        // 0-255 alpha
    minLength: 7,        // min drop length in px
    maxLength: 16,       // max drop length in px
    minSpeed: 17,        // min fall speed
    maxSpeed: 30,        // max fall speed
    density: 12,         // drops per frame (multiplied by weatherIntensity)
    thickness: 2          // stroke weight in px
  },
  
  // Rain splash parameters
  splashConfig: {
    enabled: true,
    density: 5,           // splashes per frame
    minSize: 2,           // min max radius
    maxSize: 8,           // max max radius
    opacity: 180,         // base alpha 0-255
    expandSpeed: 0.4,     // how fast they grow
    fadeSpeed: 8           // how fast alpha drops per frame
  },
  
  // Active continuous effects
  weatherEffects: {
    rain: false,
    snow: false,
    leaves: false
  }
};

/**
 * Spawn a particle effect at a position
 * @param {number} x - Screen X position
 * @param {number} y - Screen Y position
 * @param {string} presetName - Name of preset from PARTICLE_PRESETS
 * @param {number} count - Number of particles to spawn
 * @param {number} direction - Direction in radians (default: upward)
 */
function spawnParticleEffect(x, y, presetName, count = 10, direction = -Math.PI / 2) {
  if (!particleEffects.enabled) return;
  
  let preset = PARTICLE_PRESETS[presetName];
  if (!preset) {
    console.warn(`Unknown particle preset: ${presetName}`);
    return;
  }
  
  for (let i = 0; i < count; i++) {
    if (particleEffects.particles.length >= particleEffects.maxParticles) {
      particleEffects.particles.shift();
    }
    
    let spawnX = x + random(-5, 5);
    let spawnY = y + random(-5, 5);
    
    particleEffects.particles.push(new EffectParticle(spawnX, spawnY, presetName, direction));
  }
}

/**
 * Spawn effect at a world/grid position (converts to screen coords)
 * @param {number} gridX - Grid X position (meters)
 * @param {number} gridY - Grid Y position (meters)
 * @param {string} presetName - Preset name
 * @param {number} count - Particle count
 */
function spawnEffectAtGrid(gridX, gridY, presetName, count = 10) {
  if (typeof gridToScreen !== 'function') {
    console.warn('gridToScreen not available');
    return;
  }
  
  let screenPos = gridToScreen(gridX, gridY);
  spawnParticleEffect(screenPos.x, screenPos.y, presetName, count);
}

/**
 * Spawn a weather particle in screen space
 * Uses lightweight plain objects instead of EffectParticle class
 */
function spawnWeatherParticle(type) {
  if (!particleEffects.enabled) return;
  
  let drop;
  
  if (type === 'rain') {
    let rc = particleEffects.rainConfig;
    // Dark blue elongated pixels
    let shade = Math.floor(random(40, 100));
    drop = {
      type: 'rain',
      x: random(0, width),
      y: random(-20, -5),
      len: Math.floor(random(rc.minLength, rc.maxLength + 1)),
      speed: random(rc.minSpeed, rc.maxSpeed),
      drift: random(-0.3, 0.3),
      thickness: rc.thickness,
      r: shade * 0.6,
      g: shade * 0.8,
      b: shade + random(60, 100),
      a: rc.opacity + random(-20, 20)
    };
  } else if (type === 'snow') {
    drop = {
      type: 'snow',
      x: random(0, width),
      y: random(-20, -5),
      size: random(1, 3),
      speed: random(0.5, 1.5),
      drift: random(-0.5, 0.5),
      wobble: random(0, Math.PI * 2),
      wobbleSpeed: random(0.02, 0.06),
      r: random(220, 255),
      g: random(230, 255),
      b: 255,
      a: random(150, 220)
    };
  } else if (type === 'leaves') {
    let leafColors = [
      [100, 150, 50], [120, 160, 40], [80, 130, 30],
      [140, 120, 30], [160, 100, 20]
    ];
    let c = leafColors[Math.floor(random(leafColors.length))];
    drop = {
      type: 'leaves',
      x: random(0, width),
      y: random(-20, -5),
      size: random(2, 4),
      speed: random(0.4, 1.0),
      drift: random(-1, 1),
      wobble: random(0, Math.PI * 2),
      wobbleSpeed: random(0.03, 0.08),
      rot: random(0, Math.PI * 2),
      rotSpeed: random(-0.05, 0.05),
      r: c[0], g: c[1], b: c[2],
      a: random(180, 240)
    };
  }
  
  if (drop) {
    if (particleEffects.weatherParticles.length >= particleEffects.maxWeatherParticles) {
      particleEffects.weatherParticles.shift();
    }
    particleEffects.weatherParticles.push(drop);
  }
}

/**
 * Toggle weather effect
 * @param {string} type - 'rain', 'snow', or 'leaves'
 * @param {boolean} enabled - On/off
 */
function setWeatherEffect(type, enabled) {
  if (particleEffects.weatherEffects.hasOwnProperty(type)) {
    particleEffects.weatherEffects[type] = enabled;
    console.log(`Weather effect '${type}': ${enabled ? 'ON' : 'OFF'}`);
  }
}

/**
 * Update weather drops each frame (screen-space)
 */
function updateWeatherParticles() {
  if (!particleEffects.enabled) return;
  
  let intensity = particleEffects.weatherIntensity || 1.0;
  
  // Spawn rain drops
  if (particleEffects.weatherEffects.rain) {
    // Check if player is under a BLOCKS_RAIN tile (roofs) - reduce rain intensity
    let rainBlocked = false;
    if (typeof player !== 'undefined' && typeof getTileAt === 'function' && typeof tileHasFlag === 'function') {
      let pgx = Math.floor(player.x);
      let pgy = Math.floor(player.y);
      let tilesAtPlayer = getTileAt(pgx, pgy, true); // Get all tiles at position
      if (tilesAtPlayer) {
        for (let t of tilesAtPlayer) {
          if (tileHasFlag(t, 'BLOCKS_RAIN')) {
            rainBlocked = true;
            break;
          }
        }
      }
    }
    let spawnCount = Math.floor(particleEffects.rainConfig.density * intensity);
    if (rainBlocked) spawnCount = Math.floor(spawnCount * 0.1); // 90% reduction under cover
    for (let i = 0; i < spawnCount; i++) {
      if (random() < 0.5) {
        spawnWeatherParticle('rain');
      }
    }
    
    // Spawn random ground splashes across the screen
    if (particleEffects.splashConfig.enabled) {
      let sc = particleEffects.splashConfig;
      let splashCount = Math.floor(sc.density * intensity);
      for (let i = 0; i < splashCount; i++) {
        if (random() < 0.5) {
          let shade = Math.floor(random(40, 100));
          particleEffects.rainSplashes.push({
            x: random(0, width),
            y: random(60, height),
            radius: 1,
            maxRadius: random(sc.minSize, sc.maxSize),
            expandSpeed: sc.expandSpeed + random(-0.1, 0.1),
            alpha: sc.opacity + random(-20, 20),
            fadeSpeed: sc.fadeSpeed,
            r: shade * 0.6, g: shade * 0.8, b: shade + random(60, 100)
          });
        }
      }
    }
  }
  
  // Spawn snowflakes
  if (particleEffects.weatherEffects.snow) {
    if (random() < 0.2 * intensity) {
      spawnWeatherParticle('snow');
    }
  }
  
  // Spawn leaves
  if (particleEffects.weatherEffects.leaves) {
    if (random() < 0.06 * intensity) {
      spawnWeatherParticle('leaves');
    }
  }
  
  // Update all weather drops
  for (let i = particleEffects.weatherParticles.length - 1; i >= 0; i--) {
    let d = particleEffects.weatherParticles[i];
    
    d.y += d.speed;
    d.x += d.drift;
    
    // Wobble for snow and leaves
    if (d.wobble !== undefined) {
      d.wobble += d.wobbleSpeed;
      d.x += Math.sin(d.wobble) * 0.5;
    }
    
    // Rotation for leaves
    if (d.rot !== undefined) {
      d.rot += d.rotSpeed;
    }
    
    // Remove if off screen
    if (d.y > height + 20 || d.x < -20 || d.x > width + 20) {
      particleEffects.weatherParticles.splice(i, 1);
    }
  }
  
  // Update rain splashes
  for (let i = particleEffects.rainSplashes.length - 1; i >= 0; i--) {
    let s = particleEffects.rainSplashes[i];
    s.radius += s.expandSpeed;
    s.alpha -= (s.fadeSpeed || 8);
    if (s.alpha <= 0 || s.radius >= s.maxRadius) {
      particleEffects.rainSplashes.splice(i, 1);
    }
  }
}

/**
 * Update all effect particles
 */
function updateParticleEffects() {
  if (!particleEffects.enabled) return;
  
  // Update weather
  updateWeatherParticles();
  
  // Update placeable emitters
  if (typeof updateParticleEmitters === 'function') {
    updateParticleEmitters();
  }
  
  // Update particles
  for (let i = particleEffects.particles.length - 1; i >= 0; i--) {
    if (!particleEffects.particles[i].update()) {
      particleEffects.particles.splice(i, 1);
    }
  }
}

/**
 * Draw world-space effect particles (inside camera transform)
 */
function drawParticleEffects() {
  if (!particleEffects.enabled) return;
  
  push();
  for (let particle of particleEffects.particles) {
    particle.draw();
  }
  pop();
}

/**
 * Draw screen-space weather (outside camera transform)
 * Uses raw p5.js drawing for maximum visibility and performance
 */
function drawWeatherOverlay() {
  if (!particleEffects.enabled) return;
  if (particleEffects.weatherParticles.length === 0 && particleEffects.rainSplashes.length === 0) return;
  
  push();
  noSmooth();
  
  for (let d of particleEffects.weatherParticles) {
    if (d.type === 'rain') {
      // Simple vertical pixel streak
      stroke(d.r, d.g, d.b, d.a);
      strokeWeight(d.thickness || 1);
      line(d.x, d.y, d.x + d.drift * 0.5, d.y + d.len);
    } else if (d.type === 'snow') {
      // Small dot
      noStroke();
      fill(d.r, d.g, d.b, d.a);
      rect(Math.floor(d.x), Math.floor(d.y), d.size, d.size);
    } else if (d.type === 'leaves') {
      // Small rotated rectangle
      push();
      translate(d.x, d.y);
      rotate(d.rot);
      noStroke();
      fill(d.r, d.g, d.b, d.a);
      rectMode(CENTER);
      rect(0, 0, d.size, d.size * 0.6);
      pop();
    }
  }
  
  // Draw rain impact splashes
  for (let s of particleEffects.rainSplashes) {
    noFill();
    stroke(s.r, s.g, s.b, s.alpha);
    strokeWeight(1);
    ellipse(s.x, s.y, s.radius * 2, s.radius);
  }
  
  pop();
}

/**
 * Clear all effect particles
 */
function clearParticleEffects() {
  particleEffects.particles = [];
  particleEffects.weatherParticles = [];
  particleEffects.rainSplashes = [];
}

/**
 * Get list of available presets
 */
function getParticlePresets() {
  return Object.keys(PARTICLE_PRESETS);
}

// Convenience functions for common effects
function spawnFireEffect(x, y, intensity = 1) {
  spawnParticleEffect(x, y, 'fire', Math.floor(5 * intensity));
  if (random() < 0.3) {
    spawnParticleEffect(x, y - 10, 'smoke', Math.floor(2 * intensity));
  }
  if (random() < 0.2) {
    spawnParticleEffect(x, y, 'ember', Math.floor(3 * intensity));
  }
}

function spawnSplashEffect(x, y, intensity = 1) {
  spawnParticleEffect(x, y, 'splash', Math.floor(8 * intensity), -Math.PI / 2);
  spawnParticleEffect(x, y, 'ripple', Math.floor(3 * intensity));
}

function spawnMagicEffect(x, y, intensity = 1) {
  spawnParticleEffect(x, y, 'magic', Math.floor(10 * intensity));
  spawnParticleEffect(x, y, 'sparkle', Math.floor(5 * intensity));
}

function spawnHitEffect(x, y) {
  spawnParticleEffect(x, y, 'impact', 8);
  spawnParticleEffect(x, y, 'dust_poof', 5);
}

function spawnHealEffect(x, y) {
  spawnParticleEffect(x, y, 'heal', 12);
  spawnParticleEffect(x, y, 'sparkle', 8);
}

function spawnDamageEffect(x, y) {
  spawnParticleEffect(x, y, 'damage', 10);
}

/**
 * Toggle all particle effects on/off
 */
function toggleParticleEffects() {
  particleEffects.enabled = !particleEffects.enabled;
  console.log(`Particle effects: ${particleEffects.enabled ? 'ON' : 'OFF'}`);
  
  if (!particleEffects.enabled) {
    // Clear existing particles when disabled
    clearParticleEffects();
  }
  
  return particleEffects.enabled;
}

// ============================================
// PLACEABLE PARTICLE EMITTERS
// Tiles that continuously emit particles
// ============================================

let particleEmitters = {
  emitters: [], // Array of {gridX, gridY, type, rate, lastSpawn}
};

/**
 * Add a particle emitter at a grid position
 */
function addParticleEmitter(gridX, gridY, type, rate = 0.1) {
  // Check if emitter already exists at this position
  let existing = particleEmitters.emitters.find(e => e.gridX === gridX && e.gridY === gridY);
  if (existing) {
    existing.type = type;
    existing.rate = rate;
    console.log(`Updated emitter at (${gridX}, ${gridY}) to ${type}`);
  } else {
    particleEmitters.emitters.push({
      gridX: gridX,
      gridY: gridY,
      type: type,
      rate: rate,
      lastSpawn: 0
    });
    console.log(`Added ${type} emitter at (${gridX}, ${gridY})`);
  }
}

/**
 * Remove a particle emitter at a grid position
 */
function removeParticleEmitter(gridX, gridY) {
  let index = particleEmitters.emitters.findIndex(e => e.gridX === gridX && e.gridY === gridY);
  if (index >= 0) {
    particleEmitters.emitters.splice(index, 1);
    console.log(`Removed emitter at (${gridX}, ${gridY})`);
    return true;
  }
  return false;
}

/**
 * Get emitter at position
 */
function getParticleEmitterAt(gridX, gridY) {
  return particleEmitters.emitters.find(e => e.gridX === gridX && e.gridY === gridY);
}

/**
 * Update all emitters - spawn particles
 */
function updateParticleEmitters() {
  if (!particleEffects.enabled) return;
  if (typeof gridToScreen !== 'function') return;
  
  for (let emitter of particleEmitters.emitters) {
    if (random() < emitter.rate) {
      let screenPos = gridToScreen(emitter.gridX + 0.5, emitter.gridY + 0.5);
      
      // Spawn based on type
      switch (emitter.type) {
        case 'fire':
          spawnFireEffect(screenPos.x, screenPos.y, 0.5);
          break;
        case 'sparkle':
          spawnParticleEffect(screenPos.x, screenPos.y, 'sparkle', 2);
          break;
        case 'magic':
          spawnParticleEffect(screenPos.x, screenPos.y, 'magic', 2);
          break;
        case 'bubbles':
          spawnParticleEffect(screenPos.x, screenPos.y, 'bubbles', 1);
          break;
        case 'smoke':
          spawnParticleEffect(screenPos.x, screenPos.y, 'smoke', 1);
          break;
        case 'heal':
          spawnParticleEffect(screenPos.x, screenPos.y, 'heal', 1);
          break;
        default:
          spawnParticleEffect(screenPos.x, screenPos.y, emitter.type, 2);
      }
    }
  }
}

/**
 * Get emitter data for saving
 */
function getParticleEmitterData() {
  return particleEmitters.emitters.map(e => ({
    gridX: e.gridX,
    gridY: e.gridY,
    type: e.type,
    rate: e.rate
  }));
}

/**
 * Load emitter data
 */
function loadParticleEmitterData(data) {
  particleEmitters.emitters = [];
  if (Array.isArray(data)) {
    for (let e of data) {
      particleEmitters.emitters.push({
        gridX: e.gridX,
        gridY: e.gridY,
        type: e.type,
        rate: e.rate || 0.1,
        lastSpawn: 0
      });
    }
    console.log(`[ParticleEmitters] Loaded ${particleEmitters.emitters.length} emitters`);
  }
}

/**
 * Clear all emitters
 */
function clearParticleEmitters() {
  particleEmitters.emitters = [];
}

// ============================================
// WEATHER TILES
// Tiles that trigger global weather effects when placed
// ============================================

let weatherTiles = {
  activeTiles: {}, // Key: "x,y" -> {type: 'rain'|'snow'|'leaves', intensity, config}
};

/**
 * Add a weather tile at a grid position
 */
function addWeatherTile(gridX, gridY, weatherType, config = {}) {
  let key = `${gridX},${gridY}`;
  
  weatherTiles.activeTiles[key] = {
    gridX: gridX,
    gridY: gridY,
    type: weatherType,
    intensity: config.intensity || 1.0,
    config: config
  };
  
  // Immediately enable the weather effect
  updateActiveWeather();
  
  console.log(`Added ${weatherType} weather tile at (${gridX}, ${gridY})`);
}

/**
 * Remove a weather tile at a grid position
 */
function removeWeatherTile(gridX, gridY) {
  let key = `${gridX},${gridY}`;
  
  if (weatherTiles.activeTiles[key]) {
    delete weatherTiles.activeTiles[key];
    
    // Update active weather based on remaining tiles
    updateActiveWeather();
    
    console.log(`Removed weather tile at (${gridX}, ${gridY})`);
    return true;
  }
  return false;
}

/**
 * Get weather tile at position
 */
function getWeatherTileAt(gridX, gridY) {
  let key = `${gridX},${gridY}`;
  return weatherTiles.activeTiles[key];
}

/**
 * Update active weather based on placed weather tiles
 */
function updateActiveWeather() {
  // Reset all weather
  particleEffects.weatherEffects.rain = false;
  particleEffects.weatherEffects.snow = false;
  particleEffects.weatherEffects.leaves = false;
  
  // Enable weather for each placed tile
  for (let key in weatherTiles.activeTiles) {
    let tile = weatherTiles.activeTiles[key];
    if (tile.type === 'rain') {
      particleEffects.weatherEffects.rain = true;
    } else if (tile.type === 'snow') {
      particleEffects.weatherEffects.snow = true;
    } else if (tile.type === 'leaves') {
      particleEffects.weatherEffects.leaves = true;
    }
  }
  
  // Log active weather
  let active = [];
  if (particleEffects.weatherEffects.rain) active.push('rain');
  if (particleEffects.weatherEffects.snow) active.push('snow');
  if (particleEffects.weatherEffects.leaves) active.push('leaves');
  
  if (active.length > 0) {
    console.log(`[Weather] Active: ${active.join(', ')}`);
  } else {
    console.log('[Weather] No active weather');
  }
}

/**
 * Get weather tile data for saving
 */
function getWeatherTileData() {
  let data = [];
  for (let key in weatherTiles.activeTiles) {
    let tile = weatherTiles.activeTiles[key];
    data.push({
      gridX: tile.gridX,
      gridY: tile.gridY,
      type: tile.type,
      intensity: tile.intensity,
      config: tile.config
    });
  }
  return data;
}

/**
 * Load weather tile data
 */
function loadWeatherTileData(data) {
  weatherTiles.activeTiles = {};
  if (Array.isArray(data)) {
    for (let tile of data) {
      let key = `${tile.gridX},${tile.gridY}`;
      weatherTiles.activeTiles[key] = {
        gridX: tile.gridX,
        gridY: tile.gridY,
        type: tile.type,
        intensity: tile.intensity || 1.0,
        config: tile.config || {}
      };
    }
    updateActiveWeather();
    console.log(`[WeatherTiles] Loaded ${data.length} weather tiles`);
  }
}

/**
 * Clear all weather tiles
 */
function clearWeatherTiles() {
  weatherTiles.activeTiles = {};
  updateActiveWeather();
}

/**
 * Get count of active weather tiles by type
 */
function getWeatherTileCounts() {
  let counts = { rain: 0, snow: 0, leaves: 0 };
  for (let key in weatherTiles.activeTiles) {
    let tile = weatherTiles.activeTiles[key];
    if (counts.hasOwnProperty(tile.type)) {
      counts[tile.type]++;
    }
  }
  return counts;
}

console.log('[ParticleEffects] Loaded. Available presets:', Object.keys(PARTICLE_PRESETS).join(', '));
