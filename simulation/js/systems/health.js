// ============================================
// HEALTH SYSTEM
// Manages player health, damage, death, and respawn
// ============================================

const HEALTH_CONFIG = {
  maxHealth: 100,
  regenRate: 0, // Health regenerated per frame (set to 0 for no regen)
  regenDelay: 3000, // Milliseconds to wait after taking damage before regen starts
  invincibilityDuration: 500, // Milliseconds of invincibility after taking damage
  showFloatingDamage: true, // Show damage numbers above player
  autoRespawn: true,
  respawnDelay: 2000 // Milliseconds before respawn after death
};

// Health state
let healthState = {
  enabled: true,
  currentHealth: HEALTH_CONFIG.maxHealth,
  maxHealth: HEALTH_CONFIG.maxHealth,
  isDead: false,
  isInvincible: false,
  invincibilityEndTime: 0,
  lastDamageTime: 0,
  lastDamageAmount: 0,
  lastDamageSource: 'unknown',
  deathTime: 0,
  totalDamageDealt: 0,
  totalDamageTaken: 0,
  damageHistory: [] // Track damage events for debugging
};

// Respawn point tracking
let respawnPoint = {
  x: 10,
  y: 10,
  set: false
};

// Initialize health system
function initializeHealthSystem() {
  healthState.enabled = true;
  healthState.currentHealth = HEALTH_CONFIG.maxHealth;
  healthState.maxHealth = HEALTH_CONFIG.maxHealth;
  healthState.isDead = false;
  healthState.isInvincible = false;
  console.log('[HEALTH] System initialized - Max HP:', HEALTH_CONFIG.maxHealth);
}

// Set custom max health
function setMaxHealth(maxHP) {
  HEALTH_CONFIG.maxHealth = maxHP;
  healthState.maxHealth = maxHP;
  if (healthState.currentHealth > maxHP) {
    healthState.currentHealth = maxHP;
  }
  console.log('[HEALTH] setMaxHealth() - Max health set to:', maxHP);
}

// Set respawn point
function setRespawnPoint(x, y) {
  respawnPoint.x = x;
  respawnPoint.y = y;
  respawnPoint.set = true;
  console.log('[HEALTH] setRespawnPoint() - Set to:', x, y);
}

// Apply damage to player
function takeDamage(amount, source = 'unknown') {
  if (!healthState.enabled || healthState.isDead || healthState.isInvincible) {
    return false;
  }

  const actualDamage = Math.max(0, amount);
  healthState.currentHealth = Math.max(0, healthState.currentHealth - actualDamage);
  healthState.lastDamageTime = Date.now();
  healthState.lastDamageAmount = actualDamage;
  healthState.lastDamageSource = source;
  healthState.totalDamageTaken += actualDamage;

  // Set invincibility period
  healthState.isInvincible = true;
  healthState.invincibilityEndTime = Date.now() + HEALTH_CONFIG.invincibilityDuration;

  // Record in history
  healthState.damageHistory.push({
    time: new Date().toISOString(),
    amount: actualDamage,
    source: source,
    healthAfter: healthState.currentHealth
  });

  console.log(`[HEALTH] takeDamage() - ${actualDamage}HP from ${source}. HP: ${healthState.currentHealth}/${healthState.maxHealth}`);

  // Check for death
  if (healthState.currentHealth <= 0) {
    killPlayer(source);
  }

  return true;
}

// Heal player
function heal(amount) {
  if (!healthState.enabled || healthState.isDead) {
    return false;
  }

  const oldHealth = healthState.currentHealth;
  healthState.currentHealth = Math.min(
    HEALTH_CONFIG.maxHealth,
    healthState.currentHealth + amount
  );

  const actualHealing = healthState.currentHealth - oldHealth;
  healthState.totalDamageDealt -= actualHealing; // Negative damage = healing

  if (actualHealing > 0) {
    console.log(`[HEALTH] heal() - ${actualHealing}HP restored. HP: ${healthState.currentHealth}/${healthState.maxHealth}`);
  }

  return true;
}

// Set health to specific value
function setHealth(value) {
  healthState.currentHealth = Math.max(0, Math.min(HEALTH_CONFIG.maxHealth, value));
  console.log(`[HEALTH] setHealth() - HP set to: ${healthState.currentHealth}/${healthState.maxHealth}`);
}

// Kill player
function killPlayer(source = 'unknown') {
  if (healthState.isDead) return; // Already dead

  healthState.isDead = true;
  healthState.deathTime = Date.now();
  console.log(`[HEALTH] killPlayer() - Player killed by: ${source}`);

  // Show death message
  if (typeof updateGameStatus === 'function') {
    updateGameStatus(`DEAD - Killed by ${source}`, 'error');
  }

  // Auto-respawn if enabled
  if (HEALTH_CONFIG.autoRespawn) {
    setTimeout(() => {
      respawnPlayer();
    }, HEALTH_CONFIG.respawnDelay);
  }
}

// Respawn player
function respawnPlayer() {
  if (!respawnPoint.set) {
    console.warn('[HEALTH] respawnPlayer() - Respawn point not set! Using default (10, 10)');
    respawnPoint.x = 10;
    respawnPoint.y = 10;
  }

  // Reset health
  healthState.isDead = false;
  healthState.currentHealth = HEALTH_CONFIG.maxHealth;
  healthState.isInvincible = false;
  healthState.lastDamageTime = 0;

  // Move player to respawn point
  if (typeof player !== 'undefined' && player) {
    player.x = respawnPoint.x;
    player.y = respawnPoint.y;
    player.vx = 0;
    player.vy = 0;
  }

  console.log(`[HEALTH] respawnPlayer() - Respawned at (${respawnPoint.x}, ${respawnPoint.y})`);

  if (typeof updateGameStatus === 'function') {
    updateGameStatus(`Respawned at checkpoint`, 'success');
  }
}

// Update health system each frame
function updateHealthSystem() {
  if (!healthState.enabled) return;

  // Update invincibility timer
  if (healthState.isInvincible && Date.now() > healthState.invincibilityEndTime) {
    healthState.isInvincible = false;
  }

  // Health regeneration (if configured)
  if (HEALTH_CONFIG.regenRate > 0 && !healthState.isDead) {
    const timeSinceLastDamage = Date.now() - healthState.lastDamageTime;
    if (timeSinceLastDamage > HEALTH_CONFIG.regenDelay) {
      heal(HEALTH_CONFIG.regenRate);
    }
  }
}

// Get health percentage
function getHealthPercentage() {
  return (healthState.currentHealth / healthState.maxHealth) * 100;
}

// Get health status string
function getHealthStatusString() {
  return `${healthState.currentHealth}/${healthState.maxHealth}`;
}

// Check if player is alive
function isPlayerAlive() {
  return !healthState.isDead && healthState.enabled;
}

// Draw health UI (call from draw function)
function drawHealthUI() {
  if (!healthState.enabled) return;

  // Death message overlay (screen space)
  if (healthState.isDead) {
    fill(255, 0, 0, 200);
    textSize(24);
    textAlign(CENTER, CENTER);
    text('DEAD', width / 2, height / 2);
    textSize(14);
    text('Respawning...', width / 2, height / 2 + 40);
  }

  // Invincibility flash effect (screen space)
  if (healthState.isInvincible) {
    const flashAlpha = Math.abs(Math.sin(Date.now() / 100)) * 50;
    fill(255, 255, 0, flashAlpha);
    noStroke();
    rect(0, 0, width, height);
  }
}

// Draw health bar above player in world space
function drawPlayerHealthBar() {
  if (!healthState.enabled || typeof player === 'undefined' || !player) return;
  
  // Only draw during gameplay, not in edit mode
  if (editMode) return;

  // Only draw when debug overlay is visible (HUD widget has its own health bar)
  if (!window.debugVisible) return;

  push();

  // Position above player's head
  const barX = player.x * GRID_SIZE;
  const barY = (player.y - 0.5) * GRID_SIZE; // 0.5 meters above player
  const barWidth = GRID_SIZE * 0.8; // 80% of grid size
  const barHeight = GRID_SIZE * 0.15; // 15% of grid size

  // Health bar color based on percentage
  const healthPercent = getHealthPercentage();
  let barColor;
  if (healthPercent > 50) {
    barColor = [0, 255, 0]; // Green
  } else if (healthPercent > 25) {
    barColor = [255, 165, 0]; // Orange
  } else {
    barColor = [255, 0, 0]; // Red
  }

  // Background (dark)
  fill(50);
  noStroke();
  rect(barX - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);

  // Health bar
  fill(...barColor);
  noStroke();
  rect(barX - barWidth / 2, barY, (barWidth * healthPercent) / 100, barHeight);

  // Border
  noFill();
  stroke(200, 200, 200);
  strokeWeight(1);
  rect(barX - barWidth / 2, barY, barWidth, barHeight);

  // Health text
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textFont('Arial, sans-serif');
  textSize(8);
  text(getHealthStatusString(), barX, barY + barHeight / 2);

  pop();
}

// Get health stats for debugging
function getHealthStats() {
  return {
    currentHealth: healthState.currentHealth,
    maxHealth: healthState.maxHealth,
    healthPercent: getHealthPercentage(),
    isDead: healthState.isDead,
    isInvincible: healthState.isInvincible,
    totalDamageTaken: healthState.totalDamageTaken,
    respawnPoint: respawnPoint,
    recentDamage: healthState.damageHistory.slice(-5)
  };
}

// Enable/disable health system
function setHealthSystemEnabled(enabled) {
  healthState.enabled = enabled;
  console.log('[HEALTH] setHealthSystemEnabled() - Health system', enabled ? 'ENABLED' : 'DISABLED');
}

// Reset health system
function resetHealthSystem() {
  healthState.currentHealth = HEALTH_CONFIG.maxHealth;
  healthState.isDead = false;
  healthState.isInvincible = false;
  healthState.lastDamageTime = 0;
  healthState.totalDamageTaken = 0;
  healthState.damageHistory = [];
  console.log('[HEALTH] resetHealthSystem() - Health system reset to initial state');
}
