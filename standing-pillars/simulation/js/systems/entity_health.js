// ============================================
// ENTITY HEALTH SYSTEM
// Universal, data-driven health system for any entity
// NPCs, destructible objects, enemies, interactive elements, etc.
// ============================================

// Entity health registry - stores health data for all entities
const entityHealthRegistry = {};

// Entity health configuration template
const ENTITY_HEALTH_TEMPLATE = {
  maxHealth: 100,
  currentHealth: 100,
  isDead: false,
  isInvincible: false,
  invincibilityDuration: 500,
  regenRate: 0,
  regenDelay: 3000,
  lastDamageTime: 0,
  lastDamageSource: 'unknown',
  deathCallback: null, // Function to call on death
  damageCallback: null, // Function to call on damage
  healCallback: null, // Function to call on heal
  showHealthBar: true,
  damageHistory: []
};

console.log('[ENTITY_HEALTH] Entity Health System loaded');

// Add health to an entity
function addEntityHealth(entityId, config = {}) {
  const healthConfig = {
    ...JSON.parse(JSON.stringify(ENTITY_HEALTH_TEMPLATE)),
    ...config
  };
  
  healthConfig.currentHealth = healthConfig.maxHealth;
  
  entityHealthRegistry[entityId] = healthConfig;
  
  console.log(`[ENTITY_HEALTH] addEntityHealth() - Added health to entity ${entityId}. Max HP: ${healthConfig.maxHealth}`);
  
  return entityHealthRegistry[entityId];
}

// Get entity health data
function getEntityHealth(entityId) {
  if (!entityHealthRegistry[entityId]) {
    console.warn(`[ENTITY_HEALTH] getEntityHealth() - Entity ${entityId} not found in registry`);
    return null;
  }
  return entityHealthRegistry[entityId];
}

// Check if entity exists and has health
function hasEntityHealth(entityId) {
  return entityHealthRegistry[entityId] !== undefined;
}

// Apply damage to entity
function damageEntity(entityId, amount, source = 'unknown') {
  const health = getEntityHealth(entityId);
  if (!health) return false;
  
  if (health.isDead || health.isInvincible) {
    return false;
  }
  
  const actualDamage = Math.max(0, amount);
  health.currentHealth = Math.max(0, health.currentHealth - actualDamage);
  health.lastDamageTime = Date.now();
  health.lastDamageSource = source;
  
  // Set invincibility
  health.isInvincible = true;
  setTimeout(() => {
    if (health) health.isInvincible = false;
  }, health.invincibilityDuration);
  
  // Record damage
  health.damageHistory.push({
    time: new Date().toISOString(),
    amount: actualDamage,
    source: source,
    healthAfter: health.currentHealth
  });
  
  console.log(`[ENTITY_HEALTH] damageEntity() - ${entityId} took ${actualDamage}HP from ${source}. HP: ${health.currentHealth}/${health.maxHealth}`);
  
  // Call damage callback
  if (health.damageCallback && typeof health.damageCallback === 'function') {
    health.damageCallback(entityId, actualDamage, source);
  }
  
  // Check for death
  if (health.currentHealth <= 0) {
    killEntity(entityId, source);
  }
  
  return true;
}

// Heal entity
function healEntity(entityId, amount) {
  const health = getEntityHealth(entityId);
  if (!health || health.isDead) return false;
  
  const oldHealth = health.currentHealth;
  health.currentHealth = Math.min(health.maxHealth, health.currentHealth + amount);
  
  const actualHealing = health.currentHealth - oldHealth;
  
  if (actualHealing > 0) {
    console.log(`[ENTITY_HEALTH] healEntity() - ${entityId} healed ${actualHealing}HP. HP: ${health.currentHealth}/${health.maxHealth}`);
    
    // Call heal callback
    if (health.healCallback && typeof health.healCallback === 'function') {
      health.healCallback(entityId, actualHealing);
    }
  }
  
  return true;
}

// Set entity health to specific value
function setEntityHealth(entityId, value) {
  const health = getEntityHealth(entityId);
  if (!health) return false;
  
  health.currentHealth = Math.max(0, Math.min(health.maxHealth, value));
  console.log(`[ENTITY_HEALTH] setEntityHealth() - ${entityId} health set to: ${health.currentHealth}/${health.maxHealth}`);
  
  return true;
}

// Kill entity
function killEntity(entityId, source = 'unknown') {
  const health = getEntityHealth(entityId);
  if (!health || health.isDead) return false;
  
  health.isDead = true;
  
  console.log(`[ENTITY_HEALTH] killEntity() - ${entityId} killed by ${source}`);
  
  // Call death callback
  if (health.deathCallback && typeof health.deathCallback === 'function') {
    health.deathCallback(entityId, source);
  }
  
  return true;
}

// Resurrect entity
function resurrectEntity(entityId) {
  const health = getEntityHealth(entityId);
  if (!health) return false;
  
  health.isDead = false;
  health.currentHealth = health.maxHealth;
  health.isInvincible = false;
  
  console.log(`[ENTITY_HEALTH] resurrectEntity() - ${entityId} resurrected`);
  
  return true;
}

// Get entity health percentage
function getEntityHealthPercent(entityId) {
  const health = getEntityHealth(entityId);
  if (!health) return 0;
  return (health.currentHealth / health.maxHealth) * 100;
}

// Get entity health status string
function getEntityHealthStatus(entityId) {
  const health = getEntityHealth(entityId);
  if (!health) return 'N/A';
  return `${health.currentHealth}/${health.maxHealth}`;
}

// Check if entity is alive
function isEntityAlive(entityId) {
  const health = getEntityHealth(entityId);
  if (!health) return false;
  return !health.isDead;
}

// Update all entities (regeneration, invincibility timers, etc.)
function updateEntityHealthSystem() {
  for (let entityId in entityHealthRegistry) {
    const health = entityHealthRegistry[entityId];
    
    if (!health) continue;
    
    // Update invincibility
    if (health.isInvincible && Date.now() - health.lastDamageTime > health.invincibilityDuration) {
      health.isInvincible = false;
    }
    
    // Health regeneration
    if (health.regenRate > 0 && !health.isDead && health.currentHealth < health.maxHealth) {
      const timeSinceLastDamage = Date.now() - health.lastDamageTime;
      if (timeSinceLastDamage > health.regenDelay) {
        health.currentHealth = Math.min(health.maxHealth, health.currentHealth + health.regenRate);
      }
    }
  }
}

// Draw health bar for entity in world space
function drawEntityHealthBar(entityId, x, y, barWidth = 1.0, barHeight = 0.15) {
  const health = getEntityHealth(entityId);
  if (!health || !health.showHealthBar) return;
  
  // Only draw if not in edit mode
  if (editMode) return;
  
  push();
  
  // Convert to pixel coordinates
  const barX = x * GRID_SIZE;
  const barY = (y - 0.5) * GRID_SIZE;
  const pixelBarWidth = barWidth * GRID_SIZE;
  const pixelBarHeight = barHeight * GRID_SIZE;
  
  // Color based on health
  const healthPercent = getEntityHealthPercent(entityId);
  let barColor;
  if (healthPercent > 50) {
    barColor = [0, 255, 0]; // Green
  } else if (healthPercent > 25) {
    barColor = [255, 165, 0]; // Orange
  } else {
    barColor = [255, 0, 0]; // Red
  }
  
  // Background
  fill(50);
  noStroke();
  rect(barX - pixelBarWidth / 2 - 1, barY - 1, pixelBarWidth + 2, pixelBarHeight + 2);
  
  // Health bar
  fill(...barColor);
  noStroke();
  rect(barX - pixelBarWidth / 2, barY, (pixelBarWidth * healthPercent) / 100, pixelBarHeight);
  
  // Border
  noFill();
  stroke(200, 200, 200);
  strokeWeight(1);
  rect(barX - pixelBarWidth / 2, barY, pixelBarWidth, pixelBarHeight);
  
  // Health text
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textFont('Arial, sans-serif');
  textSize(8);
  text(getEntityHealthStatus(entityId), barX, barY + pixelBarHeight / 2);
  
  pop();
}

// Remove entity health
function removeEntityHealth(entityId) {
  if (entityHealthRegistry[entityId]) {
    delete entityHealthRegistry[entityId];
    console.log(`[ENTITY_HEALTH] removeEntityHealth() - Removed health data for ${entityId}`);
    return true;
  }
  return false;
}

// Get all entities with health
function getAllEntitiesWithHealth() {
  return Object.keys(entityHealthRegistry);
}

// Get health stats for debugging
function getEntityHealthStats(entityId) {
  const health = getEntityHealth(entityId);
  if (!health) return null;
  
  return {
    entityId: entityId,
    currentHealth: health.currentHealth,
    maxHealth: health.maxHealth,
    healthPercent: getEntityHealthPercent(entityId),
    isDead: health.isDead,
    isInvincible: health.isInvincible,
    lastDamageSource: health.lastDamageSource,
    recentDamage: health.damageHistory.slice(-5)
  };
}

// Clear all entity health data
function clearAllEntityHealth() {
  const count = Object.keys(entityHealthRegistry).length;
  for (let entityId in entityHealthRegistry) {
    delete entityHealthRegistry[entityId];
  }
  console.log(`[ENTITY_HEALTH] clearAllEntityHealth() - Cleared health data for ${count} entities`);
}

console.log('[ENTITY_HEALTH] Entity Health System initialized');
