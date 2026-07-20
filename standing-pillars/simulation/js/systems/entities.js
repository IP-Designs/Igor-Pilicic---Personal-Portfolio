// Entity System for Game Objects
// Handles spawnable particles, effects, and interactive elements

// Entity system state
let entitySystem = {
  entities: [],
  maxEntities: 500,
  nextId: 1
};

// Entity types registry
const ENTITY_TYPES = {
  SPARKLE: {
    name: 'Sparkle Effect',
    icon: '✨',
    spawnable: true,
    persistent: true,
    category: 'effects'
  },
  ENVIRONMENTAL: {
    name: 'Environmental Particles',
    icon: '🌿',
    spawnable: false,
    persistent: false,
    category: 'system'
  }
  // Future entity types can be added here
  // FIREFLY: { name: 'Firefly', icon: '🟡', spawnable: true, category: 'ambient' },
  // DUST: { name: 'Dust Mote', icon: '⚪', spawnable: true, category: 'ambient' }
};

// Sparkle particle class
class SparkleEntity {
  constructor(gridX, gridY, properties = {}) {
    this.id = entitySystem.nextId++;
    this.type = 'SPARKLE';
    this.gridX = gridX;
    this.gridY = gridY;
    
    // World position (center of grid cell)
    this.worldX = (gridX + 0.5) * GRID_SIZE;
    this.worldY = (gridY + 0.5) * GRID_SIZE;
    
    // Sparkle properties
    this.particleCount = properties.particleCount || 8;
    this.spawnRadius = properties.spawnRadius || 1.0; // meters
    this.sparkleColor = properties.color || [255, 255, 200];
    this.enabled = true;
    
    // Particle pool
    this.particles = [];
    this.maxParticles = this.particleCount;
    this.spawnTimer = 0;
    this.spawnInterval = 30; // frames between spawns
    
    console.log(`Created sparkle entity at grid (${gridX}, ${gridY})`);
  }
  
  update() {
    if (!this.enabled) return;
    
    // Spawn new particles
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval && this.particles.length < this.maxParticles) {
      this.spawnParticle();
      this.spawnTimer = 0;
    }
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let particle = this.particles[i];
      this.updateParticle(particle);
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  spawnParticle() {
    // Spawn particle in a circle around the entity center
    let angle = random(0, Math.PI * 2);
    let distance = random(0, this.spawnRadius * GRID_SIZE);
    
    let particle = {
      x: this.worldX + cos(angle) * distance,
      y: this.worldY + sin(angle) * distance,
      vx: random(-0.5, 0.5),
      vy: random(-1, -0.2), // Slight upward drift
      life: 1.0,
      maxLife: random(60, 120), // frames
      size: random(2, 6),
      alpha: 0,
      phase: random(0, Math.PI * 2) // For twinkling
    };
    
    this.particles.push(particle);
  }
  
  updateParticle(particle) {
    // Physics
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.01; // Slight gravity
    
    // Life cycle
    particle.maxLife--;
    
    // Fade in/out based on life
    if (particle.maxLife > 30) {
      particle.alpha = Math.min(particle.alpha + 0.1, 1.0); // Fade in
    } else {
      particle.alpha = Math.max(particle.alpha - 0.03, 0); // Fade out
    }
    
    // Twinkling effect
    particle.phase += 0.2;
    particle.life = particle.alpha * (0.7 + 0.3 * sin(particle.phase));
    
    // Remove if fully faded
    if (particle.maxLife <= 0) {
      particle.life = 0;
    }
  }
  
  draw() {
    if (!this.enabled) return;
    
    push();
    
    // Draw each sparkle particle
    for (let particle of this.particles) {
      if (particle.life <= 0) continue;
      
      let alpha = particle.life * 255;
      fill(this.sparkleColor[0], this.sparkleColor[1], this.sparkleColor[2], alpha);
      noStroke();
      
      // Draw sparkle as small circle
      ellipse(particle.x, particle.y, particle.size * particle.life);
      
      // Add a small cross for sparkle effect
      stroke(this.sparkleColor[0], this.sparkleColor[1], this.sparkleColor[2], alpha * 0.8);
      strokeWeight(1);
      let crossSize = particle.size * particle.life * 0.8;
      line(particle.x - crossSize/2, particle.y, particle.x + crossSize/2, particle.y);
      line(particle.x, particle.y - crossSize/2, particle.x, particle.y + crossSize/2);
    }
    
    pop();
    
    // Draw spawner indicator in edit mode
    if (editMode && (typeof editorUI === 'undefined' || editorUI.showParticles)) {
      this.drawSpawnerIndicator();
    }
  }
  
  drawSpawnerIndicator() {
    push();
    
    // Draw spawn area circle
    stroke(255, 255, 100, 100);
    strokeWeight(1);
    noFill();
    ellipse(this.worldX, this.worldY, this.spawnRadius * GRID_SIZE * 2);
    
    // Draw center icon
    fill(255, 255, 100, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text('✨', this.worldX, this.worldY);
    
    pop();
  }
  
  // Cleanup method
  destroy() {
    this.particles = [];
    console.log(`Destroyed sparkle entity ${this.id}`);
  }
}

// Environmental particle system for terrain-responsive effects
class EnvironmentalParticle {
  constructor(x, y, terrainType, direction = 0) {
    this.x = x;
    this.y = y;
    this.terrainType = terrainType;
    
    // Get terrain-specific particle properties
    let config = this.getTerrainConfig(terrainType);
    
    // Physics
    let speed = random(config.minSpeed, config.maxSpeed);
    let angle = direction + random(-config.spread, config.spread);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.gravity = config.gravity;
    this.friction = config.friction;
    
    // Visual properties
    this.size = random(config.minSize, config.maxSize);
    this.color = config.colors[Math.floor(random(config.colors.length))];
    this.life = 1.0;
    this.maxLife = random(config.minLife, config.maxLife);
    this.alpha = 255;
    
    // Rotation for visual variety
    this.rotation = random(0, Math.PI * 2);
    this.rotationSpeed = random(-0.1, 0.1);
  }
  
  getTerrainConfig(terrainType) {
    const configs = {
      'grass': {
        colors: [[20, 100, 20], [30, 120, 30], [25, 110, 25], [28, 90, 28]], // Darker greens
        minSpeed: 0.3, // Reduced from 0.5 for tighter spray
        maxSpeed: 1.5, // Reduced from 2.0 for tighter spray
        spread: Math.PI / 4, // Reduced from Math.PI / 3 for more focused spray
        gravity: 0.03, // Increased for quicker settling
        friction: 0.97, // More friction for shorter travel
        minSize: 1, // Smaller particles
        maxSize: 2, // Reduced from 4 for more delicate effect
        minLife: 20, // Shorter life for performance
        maxLife: 45 // Reduced from 60
      },
      'dirt': {
        colors: [[100, 50, 15], [120, 60, 25], [140, 85, 40], [160, 120, 80]], // Darker browns
        minSpeed: 0.2, // Reduced from 0.3
        maxSpeed: 1.2, // Reduced from 1.5
        spread: Math.PI / 6, // Reduced from Math.PI / 4 for tighter spray
        gravity: 0.06, // Increased for quicker settling
        friction: 0.94, // More friction
        minSize: 1,
        maxSize: 2, // Reduced from 3
        minLife: 15, // Shorter life
        maxLife: 35 // Reduced from 45
      },
      'sand': {
        colors: [[200, 160, 120], [210, 170, 130], [190, 150, 110], [180, 140, 100]], // Darker sandy tones
        minSpeed: 0.1, // Reduced from 0.2
        maxSpeed: 1.0, // Reduced from 1.2
        spread: Math.PI / 8, // Reduced from Math.PI / 6 for very tight spray
        gravity: 0.04, // Increased from 0.03
        friction: 0.96, // More friction
        minSize: 1,
        maxSize: 2,
        minLife: 20,
        maxLife: 40 // Reduced from 50
      },
      'water': {
        colors: [[40, 100, 160], [60, 90, 180], [80, 120, 200], [100, 140, 210]], // Darker blues
        minSpeed: 0.8, // Reduced from 1.0
        maxSpeed: 2.5, // Reduced from 3.0
        spread: Math.PI / 3, // Reduced from Math.PI / 2 for tighter splash
        gravity: -0.02, // Slight upward drift, increased magnitude
        friction: 0.95, // More friction
        minSize: 1,
        maxSize: 3, // Reduced from 5
        minLife: 12, // Shorter life
        maxLife: 30 // Reduced from 40
      },
      'stone': {
        colors: [[70, 70, 70], [85, 85, 85], [100, 100, 100], [75, 85, 95]], // Darker grays
        minSpeed: 0.05, // Reduced from 0.1
        maxSpeed: 0.6, // Reduced from 0.8
        spread: Math.PI / 12, // Very tight spray from Math.PI / 8
        gravity: 0.1, // Increased for quick settling
        friction: 0.9, // High friction
        minSize: 1,
        maxSize: 1, // Very small particles
        minLife: 8, // Very short life
        maxLife: 20 // Reduced from 30
      },
      'default': {
        colors: [[140, 140, 140], [160, 160, 160], [120, 120, 120]], // Darker default grays
        minSpeed: 0.1, // Reduced from 0.2
        maxSpeed: 0.8, // Reduced from 1.0
        spread: Math.PI / 6, // Reduced from Math.PI / 4
        gravity: 0.05, // Increased from 0.04
        friction: 0.94, // More friction
        minSize: 1,
        maxSize: 2, // Reduced from 3
        minLife: 15,
        maxLife: 30 // Reduced from 40
      }
    };
    
    return configs[terrainType] || configs['default'];
  }
  
  update() {
    // Apply physics
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // Update rotation
    this.rotation += this.rotationSpeed;
    
    // Update life
    this.maxLife--;
    
    // Fade out over time
    if (this.maxLife > 10) {
      this.alpha = Math.min(this.alpha, 255); // Stay visible
    } else {
      this.alpha = (this.maxLife / 10) * 255; // Fade out
    }
    
    this.life = this.alpha / 255;
    
    return this.maxLife > 0;
  }
  
  draw() {
    if (this.life <= 0) return;
    
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    
    // Draw small square particle
    fill(this.color[0], this.color[1], this.color[2], this.alpha);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, this.size, this.size);
    
    pop();
  }
}

// Environmental particle system manager
let environmentalParticles = {
  particles: [],
  maxParticles: 300, // Increased from 200 to handle 50% more particles
  enabled: true
};

// Entity management functions
function initEntitySystem() {
  entitySystem.entities = [];
  environmentalParticles.particles = [];
  console.log('Entity system initialized');
}

// Environmental particle functions
function spawnEnvironmentalParticles(x, y, terrainType, intensity = 1, direction = 0) {
  if (!environmentalParticles.enabled) return;
  
  let count = Math.floor(intensity * random(3.6, 9)); // Increased 50% from (2.4, 6) for denser effects
  
  for (let i = 0; i < count; i++) {
    if (environmentalParticles.particles.length >= environmentalParticles.maxParticles) {
      // Remove oldest particle to make room
      environmentalParticles.particles.shift();
    }
    
    // Reduced spawn position randomness for tighter spray
    let spawnX = x + random(-4, 4); // Reduced from (-8, 8)
    let spawnY = y + random(-4, 4); // Reduced from (-8, 8)
    
    let particle = new EnvironmentalParticle(spawnX, spawnY, terrainType, direction);
    environmentalParticles.particles.push(particle);
  }
}

function updateEnvironmentalParticles() {
  if (!environmentalParticles.enabled) return;
  
  for (let i = environmentalParticles.particles.length - 1; i >= 0; i--) {
    let particle = environmentalParticles.particles[i];
    
    if (!particle.update()) {
      environmentalParticles.particles.splice(i, 1);
    }
  }
}

function drawEnvironmentalParticles() {
  if (!environmentalParticles.enabled) return;
  
  push();
  
  for (let particle of environmentalParticles.particles) {
    particle.draw();
  }
  
  pop();
}

function clearEnvironmentalParticles() {
  environmentalParticles.particles = [];
}

// Map terrain tile types to particle types
function getTerrainParticleType(tileType) {
  const terrainMap = {
    'grass': 'grass',
    'dirt': 'dirt',
    'sand': 'sand',
    'water': 'water',
    'stone': 'stone',
    'asphalt': 'stone',
    'sidewalk': 'stone',
    'brick_wall': 'stone',
    'dirt_grass': 'grass',
    'dirt_grass_corner': 'grass',
    'grass_patches': 'grass'
  };
  
  return terrainMap[tileType] || 'default';
}

function addEntity(type, gridX, gridY, properties = {}) {
  if (entitySystem.entities.length >= entitySystem.maxEntities) {
    console.warn('Maximum entities reached');
    return null;
  }
  
  let entity = null;
  
  switch (type) {
    case 'SPARKLE':
      entity = new SparkleEntity(gridX, gridY, properties);
      break;
    default:
      console.warn(`Unknown entity type: ${type}`);
      return null;
  }
  
  if (entity) {
    entitySystem.entities.push(entity);
    console.log(`Added ${type} entity at (${gridX}, ${gridY})`);
  }
  
  return entity;
}

function removeEntity(gridX, gridY) {
  for (let i = entitySystem.entities.length - 1; i >= 0; i--) {
    let entity = entitySystem.entities[i];
    if (entity.gridX === gridX && entity.gridY === gridY) {
      entity.destroy();
      entitySystem.entities.splice(i, 1);
      console.log(`Removed entity at (${gridX}, ${gridY})`);
      return true;
    }
  }
  return false;
}

function removeAllEntities() {
  for (let entity of entitySystem.entities) {
    entity.destroy();
  }
  entitySystem.entities = [];
  console.log('All entities removed');
}

function updateEntities() {
  for (let entity of entitySystem.entities) {
    entity.update();
  }
  // NOTE: Particle/weather updates are called directly by engine.js - never chain them here.
}

function drawEntities() {
  push();
  
  // NOTE: Particle/weather draws are called directly by engine.js - never chain them here.
  
  // Draw regular entities
  for (let entity of entitySystem.entities) {
    entity.draw();
  }
  
  pop();
}

// Get entity at grid position
function getEntityAt(gridX, gridY) {
  return entitySystem.entities.find(entity => 
    entity.gridX === gridX && entity.gridY === gridY
  );
}

// Entity save/load system
function getEntityData() {
  let entityData = {};
  
  for (let entity of entitySystem.entities) {
    let key = `${entity.gridX},${entity.gridY}`;
    entityData[key] = {
      type: entity.type,
      gridX: entity.gridX,
      gridY: entity.gridY,
      properties: {
        particleCount: entity.particleCount,
        spawnRadius: entity.spawnRadius,
        color: entity.sparkleColor
      }
    };
  }
  
  return entityData;
}

function loadEntityData(entityData) {
  removeAllEntities();
  
  for (let key in entityData) {
    let data = entityData[key];
    addEntity(data.type, data.gridX, data.gridY, data.properties);
  }
  
  console.log(`Loaded ${Object.keys(entityData).length} entities`);
}

// Initialize entity system when script loads
if (typeof GRID_SIZE !== 'undefined') {
  initEntitySystem();
}
