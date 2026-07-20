// ============================================
// Tiny Humans - Behavioral Sink Simulation
// Standalone runtime for Standing Pillars website
// ============================================
// Will be built after map.json is created in the engine editor.
// 
// Systems needed:
//   - Tile renderer (read map.json, draw tiles by layer)
//   - Sprite animation (8-dir idle + 6-frame walk)
//   - AABB collision (respect solid tiles)
//   - NPC AI (wander, pause, face direction)
//   - Thought/speech bubbles (timer-triggered + click-triggered)
//   - Camera (fixed view, centered on map)
//
// Assets ready:
//   - assets/sprites/kid/      (56 PNGs - 8 idle, 48 walk)
//   - assets/sprites/mother/   (56 PNGs - 8 idle, 48 walk)
//   - assets/tiles/            (46 tile PNGs)
//   - map.json                 (pending - built in engine editor)
