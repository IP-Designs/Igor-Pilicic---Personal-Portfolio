// ============================================
// ITEM DEFINITION VALIDATOR
// Validates item definitions structure & fields
// ============================================

const VALID_ITEM_FLAGS = [
  // Usage
  'CONSUMABLE',
  'EQUIPPABLE',
  'THROWABLE',
  'PLANTABLE',
  'PLACEABLE',
  // Type
  'WEAPON',
  'ARMOR',
  'TOOL',
  'LIGHT_SOURCE',
  'MEDICAL',
  'FOOD',
  'DRINK',
  'MATERIAL',
  'BUILDING',
  'KEY_ITEM',
  'QUEST',
  // Properties
  'STACKABLE',
  'UNIQUE',
  'FRAGILE',
  'HEAVY',
  'RAW',
  'CRAFTABLE',
  'TRADEABLE'
];

const VALID_EQUIP_SLOTS = ['head', 'body', 'hands', 'feet', 'weapon', 'offhand'];

const VALID_ITEM_CATEGORIES = ['MEDICAL', 'FOOD', 'TOOLS', 'WEAPONS', 'ARMOR', 'MATERIALS', 'MISC', 'KEY_ITEMS'];

const REQUIRED_ITEM_PROPS = ['displayName', 'description', 'icon'];

/**
 * Validate a single item definition
 */
function validateItemDefinition(itemId, item, categoryName) {
  const errors = [];
  const warnings = [];

  if (!itemId || typeof itemId !== 'string') {
    errors.push('Item ID must be a non-empty string');
    return { errors, warnings };
  }

  // Required fields
  REQUIRED_ITEM_PROPS.forEach(function (prop) {
    if (!item[prop]) {
      errors.push(itemId + ': Missing required property "' + prop + '"');
    }
  });

  // Type checks
  if (item.displayName && typeof item.displayName !== 'string') errors.push(itemId + ': displayName must be a string');
  if (item.description && typeof item.description !== 'string') errors.push(itemId + ': description must be a string');
  if (item.icon && typeof item.icon !== 'string') errors.push(itemId + ': icon must be a string');
  if (item.weight != null && typeof item.weight !== 'number') errors.push(itemId + ': weight must be a number');
  if (item.maxStack != null && (typeof item.maxStack !== 'number' || item.maxStack < 1)) errors.push(itemId + ': maxStack must be a positive number');
  if (item.equipSlot && VALID_EQUIP_SLOTS.indexOf(item.equipSlot) === -1) errors.push(itemId + ': Invalid equipSlot "' + item.equipSlot + '" - valid: ' + VALID_EQUIP_SLOTS.join(', '));

  // Flag validation
  if (item.flags && Array.isArray(item.flags)) {
    item.flags.forEach(function (flag) {
      if (VALID_ITEM_FLAGS.indexOf(flag) === -1) {
        warnings.push(itemId + ': Unknown flag "' + flag + '"');
      }
    });
  }

  // Logical consistency
  if (item.equippable && !item.equipSlot) {
    warnings.push(itemId + ': equippable=true but no equipSlot set');
  }
  if (item.stackable && item.maxStack === 1) {
    warnings.push(itemId + ': stackable=true but maxStack=1 - will behave as non-stackable');
  }
  if (!item.stackable && item.maxStack > 1) {
    warnings.push(itemId + ': stackable=false but maxStack > 1 - maxStack will be ignored');
  }

  return { errors: errors, warnings: warnings };
}

/**
 * Validate the entire item definitions structure
 */
function validateItemDefinitions(definitions) {
  var allErrors = { items: [], categories: [], general: [] };
  var stats = { totalItems: 0, totalCategories: 0, flagCounts: {} };

  if (!definitions || typeof definitions !== 'object') {
    allErrors.general.push('Definitions must be an object');
    return { isValid: false, allErrors: allErrors, stats: stats };
  }
  if (!definitions.categories) {
    allErrors.general.push('Missing "categories" key');
    return { isValid: false, allErrors: allErrors, stats: stats };
  }

  var catNames = Object.keys(definitions.categories);
  stats.totalCategories = catNames.length;

  catNames.forEach(function (catName) {
    var cat = definitions.categories[catName];
    if (!cat.displayName) allErrors.categories.push(catName + ': Missing displayName');
    if (!cat.items || typeof cat.items !== 'object') {
      allErrors.categories.push(catName + ': Missing or invalid "items" object');
      return;
    }

    var itemIds = Object.keys(cat.items);
    stats.totalItems += itemIds.length;

    itemIds.forEach(function (itemId) {
      var result = validateItemDefinition(itemId, cat.items[itemId], catName);
      allErrors.items = allErrors.items.concat(result.errors);
      // Warnings are non-blocking, log them
      result.warnings.forEach(function (w) { console.warn('[ItemValidator]', w); });

      // Count flags
      var flags = cat.items[itemId].flags || [];
      flags.forEach(function (f) {
        stats.flagCounts[f] = (stats.flagCounts[f] || 0) + 1;
      });
    });
  });

  var isValid = allErrors.items.length === 0 && allErrors.categories.length === 0 && allErrors.general.length === 0;

  return { isValid: isValid, allErrors: allErrors, stats: stats };
}

/**
 * Get validation rules (for UI display)
 */
function getItemValidationRules() {
  return {
    validFlags: VALID_ITEM_FLAGS.slice(),
    validEquipSlots: VALID_EQUIP_SLOTS.slice(),
    validCategories: VALID_ITEM_CATEGORIES.slice(),
    requiredProps: REQUIRED_ITEM_PROPS.slice()
  };
}

// Expose globally
window.validateItemDefinition = validateItemDefinition;
window.validateItemDefinitions = validateItemDefinitions;
window.getItemValidationRules = getItemValidationRules;
window.VALID_ITEM_FLAGS = VALID_ITEM_FLAGS;
window.VALID_EQUIP_SLOTS = VALID_EQUIP_SLOTS;

console.log('[ItemValidator] ✓ Item validator loaded - ' + VALID_ITEM_FLAGS.length + ' valid flags');
