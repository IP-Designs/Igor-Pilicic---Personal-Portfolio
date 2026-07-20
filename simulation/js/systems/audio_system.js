/**
 * audio_system.js - Engine-registered audio system
 * ==================================================
 * Complete Web Audio API engine with channels, spatial audio,
 * procedural sound generation, and file-based playback.
 *
 * Concepts:
 *   Sound       - A named definition: { src, volume, pitch, loop, category, spatial }
 *   Channel     - A category with independent volume: 'sfx', 'music', 'ambient', 'ui'
 *   Instance    - A currently-playing sound (AudioBufferSourceNode wrapper)
 *   Procedural  - Built-in 8-bit sounds generated via oscillators (no files needed)
 *
 * Engine Events:
 *   audio.soundRegistered   { id, sound }
 *   audio.soundRemoved      { id }
 *   audio.play              { id, instanceId }
 *   audio.stop              { id }
 *   audio.channelVolume     { channel, volume }
 *   audio.masterVolume      { volume }
 *   audio.definitionsLoaded {}
 *   audio.definitionsSaved  {}
 *
 * Usage:
 *   const audio = Engine.get('audio');
 *   audio.registerSound('footstep_grass', {
 *     src: 'assets/audio/sfx/footstep_grass.wav',
 *     volume: 0.6, pitch: 1.0, loop: false,
 *     category: 'sfx', spatial: true,
 *     variants: 3  // loads footstep_grass_1.wav, _2.wav, _3.wav
 *   });
 *
 *   // or procedural:
 *   audio.registerSound('click', { procedural: 'click', category: 'ui' });
 *
 *   audio.play('footstep_grass');
 *   audio.play('footstep_grass', { x: 10, y: 5 }); // spatial
 *   audio.setChannelVolume('music', 0.3);
 *   audio.setMasterVolume(0.8);
 */
(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────

  const CHANNELS = ['master', 'sfx', 'music', 'ambient', 'ui'];
  const MAX_INSTANCES = 32;       // max simultaneous sounds
  const SPATIAL_RANGE = 20;       // tiles - beyond this, sound is silent
  const CROSSFADE_TIME = 2.0;     // seconds for music crossfade

  // ── State ─────────────────────────────────────────────────────────────

  /** @type {AudioContext|null} */
  let _ctx = null;

  /** @type {Map<string, SoundDef>} */
  const _sounds = new Map();

  /** @type {Map<string, AudioBuffer>} */
  const _bufferCache = new Map();

  /** @type {Map<string, GainNode>} channel name → gain node */
  const _channelGains = new Map();

  /** @type {GainNode|null} */
  let _masterGain = null;

  /** @type {Map<number, SoundInstance>} instanceId → playing sound */
  const _instances = new Map();

  let _nextInstanceId = 1;
  let _initialized = false;
  let _suspended = true; // AudioContext starts suspended until user gesture

  /** Current music instance for crossfade */
  let _currentMusic = null;

  // Volume levels (0..1)
  const _volumes = {
    master: 0.8,
    sfx: 1.0,
    music: 0.5,
    ambient: 0.7,
    ui: 0.8
  };

  // ── Initialization ────────────────────────────────────────────────────

  function init() {
    if (_initialized) return;

    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[Audio] Web Audio API not available:', e);
      return;
    }

    // Build gain chain: source → channelGain → masterGain → destination
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = _volumes.master;
    _masterGain.connect(_ctx.destination);

    for (const ch of CHANNELS) {
      if (ch === 'master') continue;
      const gain = _ctx.createGain();
      gain.gain.value = _volumes[ch];
      gain.connect(_masterGain);
      _channelGains.set(ch, gain);
    }

    _initialized = true;
    _suspended = _ctx.state === 'suspended';

    // Resume on first user interaction
    const resumeOnGesture = () => {
      if (_ctx && _ctx.state === 'suspended') {
        _ctx.resume().then(() => {
          _suspended = false;
          console.log('[Audio] AudioContext resumed');
        });
      } else {
        _suspended = false;
      }
      document.removeEventListener('click', resumeOnGesture);
      document.removeEventListener('keydown', resumeOnGesture);
    };
    document.addEventListener('click', resumeOnGesture);
    document.addEventListener('keydown', resumeOnGesture);

    console.log('[Audio] Initialized - Web Audio API ready');
  }

  // ── Sound Registration ────────────────────────────────────────────────

  /**
   * Register a sound definition.
   * @param {string} id - Unique sound ID
   * @param {Object} def - Sound definition
   * @param {string} [def.src] - Path to audio file (relative to game root)
   * @param {string} [def.procedural] - Procedural preset name (alternative to src)
   * @param {number} [def.volume=1.0] - Volume multiplier (0..1)
   * @param {number} [def.pitch=1.0] - Playback rate
   * @param {boolean} [def.loop=false] - Loop the sound
   * @param {string} [def.category='sfx'] - Channel: sfx, music, ambient, ui
   * @param {boolean} [def.spatial=false] - Spatial audio based on world position
   * @param {number} [def.variants=0] - Number of random variants (appends _1, _2, etc.)
   * @param {number} [def.pitchVariance=0] - Random pitch variation (+/- this amount)
   * @param {number} [def.volumeVariance=0] - Random volume variation (+/- this amount)
   */
  function registerSound(id, def) {
    const sound = {
      id,
      src: def.src || null,
      procedural: def.procedural || null,
      volume: def.volume !== undefined ? def.volume : 1.0,
      pitch: def.pitch !== undefined ? def.pitch : 1.0,
      loop: def.loop || false,
      category: def.category || 'sfx',
      spatial: def.spatial || false,
      variants: def.variants || 0,
      pitchVariance: def.pitchVariance || 0,
      volumeVariance: def.volumeVariance || 0,
      maxInstances: def.maxInstances || 4
    };

    _sounds.set(id, sound);
    Engine.emit('audio.soundRegistered', { id, sound });
  }

  /**
   * Remove a sound definition.
   */
  function removeSound(id) {
    if (_sounds.has(id)) {
      stopAll(id);
      _sounds.delete(id);
      Engine.emit('audio.soundRemoved', { id });
    }
  }

  /**
   * Get sound definition.
   */
  function getSound(id) {
    return _sounds.get(id) || null;
  }

  /**
   * List all registered sound IDs.
   */
  function listSounds() {
    return Array.from(_sounds.keys());
  }

  // ── Playback ──────────────────────────────────────────────────────────

  /**
   * Play a registered sound.
   * @param {string} id - Sound ID
   * @param {Object} [opts] - Override options
   * @param {number} [opts.x] - World X position for spatial audio
   * @param {number} [opts.y] - World Y position for spatial audio
   * @param {number} [opts.volume] - Override volume
   * @param {number} [opts.pitch] - Override pitch
   * @param {boolean} [opts.loop] - Override loop
   * @returns {number|null} Instance ID or null
   */
  function play(id, opts = {}) {
    if (!_initialized || !_ctx) return null;

    const def = _sounds.get(id);
    if (!def) {
      console.warn(`[Audio] Unknown sound: "${id}"`);
      return null;
    }

    // Limit instances per sound
    let count = 0;
    for (const inst of _instances.values()) {
      if (inst.soundId === id) count++;
    }
    if (count >= def.maxInstances) return null;

    // Overall instance limit
    if (_instances.size >= MAX_INSTANCES) {
      // Stop oldest non-looping instance
      const oldest = _findOldestInstance(false);
      if (oldest) stopInstance(oldest);
    }

    // Resume context if suspended
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }

    // Determine source file (handle variants)
    let src = def.src;
    if (def.variants > 0 && src) {
      const variant = Math.floor(Math.random() * def.variants) + 1;
      const ext = src.substring(src.lastIndexOf('.'));
      const base = src.substring(0, src.lastIndexOf('.'));
      src = `${base}_${variant}${ext}`;
    }

    // Calculate final volume and pitch with variance
    let vol = (opts.volume !== undefined ? opts.volume : def.volume);
    let pitch = (opts.pitch !== undefined ? opts.pitch : def.pitch);
    const loop = (opts.loop !== undefined ? opts.loop : def.loop);

    if (def.volumeVariance > 0) {
      vol += (Math.random() * 2 - 1) * def.volumeVariance;
      vol = Math.max(0, Math.min(1, vol));
    }
    if (def.pitchVariance > 0) {
      pitch += (Math.random() * 2 - 1) * def.pitchVariance;
      pitch = Math.max(0.1, pitch);
    }

    // Spatial volume attenuation
    let spatialVol = 1.0;
    let panValue = 0;
    if (def.spatial && opts.x !== undefined && opts.y !== undefined) {
      const listener = _getListenerPosition();
      const dx = opts.x - listener.x;
      const dy = opts.y - listener.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > SPATIAL_RANGE) return null; // Too far away
      spatialVol = 1 - (dist / SPATIAL_RANGE);
      spatialVol = spatialVol * spatialVol; // Quadratic falloff

      // Simple stereo panning based on X offset
      panValue = Math.max(-1, Math.min(1, dx / (SPATIAL_RANGE * 0.5)));
    }

    const instanceId = _nextInstanceId++;

    if (def.procedural) {
      // Generate procedural sound
      _playProcedural(instanceId, def, vol * spatialVol, pitch, loop, panValue);
    } else if (src) {
      // Play file-based sound
      _playFile(instanceId, id, src, def, vol * spatialVol, pitch, loop, panValue);
    }

    Engine.emit('audio.play', { id, instanceId });
    return instanceId;
  }

  /**
   * Stop a specific instance.
   */
  function stopInstance(instanceId) {
    const inst = _instances.get(instanceId);
    if (!inst) return;

    try {
      if (inst.sourceNode) {
        inst.sourceNode.stop();
      }
      if (inst.gainNode) {
        inst.gainNode.disconnect();
      }
    } catch (e) {
      // Already stopped
    }

    _instances.delete(instanceId);
  }

  /**
   * Stop all instances of a sound.
   */
  function stopAll(id) {
    for (const [instId, inst] of _instances) {
      if (!id || inst.soundId === id) {
        stopInstance(instId);
      }
    }
  }

  /**
   * Stop all sounds globally (mute).
   */
  function stopEverything() {
    for (const instId of Array.from(_instances.keys())) {
      stopInstance(instId);
    }
    _currentMusic = null;
  }

  // ── Music ─────────────────────────────────────────────────────────────

  /**
   * Play music with crossfade from current track.
   * @param {string} id - Sound ID (must be category: 'music')
   * @param {number} [fadeDuration] - Crossfade time in seconds
   */
  function playMusic(id, fadeDuration = CROSSFADE_TIME) {
    if (!_initialized || !_ctx) return;

    // Same track already playing
    if (_currentMusic && _currentMusic.soundId === id) return;

    // Fade out current music
    if (_currentMusic) {
      const old = _instances.get(_currentMusic.instanceId);
      if (old && old.gainNode) {
        old.gainNode.gain.linearRampToValueAtTime(0, _ctx.currentTime + fadeDuration);
        const oldInstId = _currentMusic.instanceId;
        setTimeout(() => stopInstance(oldInstId), fadeDuration * 1000 + 100);
      }
    }

    // Play new track
    const instanceId = play(id, { loop: true, volume: 0 });
    if (instanceId !== null) {
      const inst = _instances.get(instanceId);
      if (inst && inst.gainNode) {
        const def = _sounds.get(id);
        const targetVol = def ? def.volume : 1.0;
        inst.gainNode.gain.linearRampToValueAtTime(targetVol, _ctx.currentTime + fadeDuration);
      }
      _currentMusic = { soundId: id, instanceId };
    }
  }

  /**
   * Stop music with fade out.
   */
  function stopMusic(fadeDuration = CROSSFADE_TIME) {
    if (!_currentMusic) return;
    const inst = _instances.get(_currentMusic.instanceId);
    if (inst && inst.gainNode && _ctx) {
      inst.gainNode.gain.linearRampToValueAtTime(0, _ctx.currentTime + fadeDuration);
      const instId = _currentMusic.instanceId;
      setTimeout(() => stopInstance(instId), fadeDuration * 1000 + 100);
    }
    _currentMusic = null;
  }

  // ── Volume Control ────────────────────────────────────────────────────

  function setMasterVolume(vol) {
    _volumes.master = Math.max(0, Math.min(1, vol));
    if (_masterGain) {
      _masterGain.gain.value = _volumes.master;
    }
    Engine.emit('audio.masterVolume', { volume: _volumes.master });
  }

  function getMasterVolume() {
    return _volumes.master;
  }

  function setChannelVolume(channel, vol) {
    if (!_volumes.hasOwnProperty(channel) || channel === 'master') return;
    _volumes[channel] = Math.max(0, Math.min(1, vol));
    const gain = _channelGains.get(channel);
    if (gain) {
      gain.gain.value = _volumes[channel];
    }
    Engine.emit('audio.channelVolume', { channel, volume: _volumes[channel] });
  }

  function getChannelVolume(channel) {
    return _volumes[channel] !== undefined ? _volumes[channel] : 1.0;
  }

  function getVolumes() {
    return { ..._volumes };
  }

  // ── Preloading ────────────────────────────────────────────────────────

  /**
   * Preload a sound file into the buffer cache.
   */
  async function preload(id) {
    const def = _sounds.get(id);
    if (!def || !def.src || def.procedural) return;

    const sources = [];
    if (def.variants > 0) {
      const ext = def.src.substring(def.src.lastIndexOf('.'));
      const base = def.src.substring(0, def.src.lastIndexOf('.'));
      for (let i = 1; i <= def.variants; i++) {
        sources.push(`${base}_${i}${ext}`);
      }
    } else {
      sources.push(def.src);
    }

    for (const src of sources) {
      await _loadBuffer(src);
    }
  }

  /**
   * Preload all registered sounds.
   */
  async function preloadAll() {
    const promises = [];
    for (const id of _sounds.keys()) {
      promises.push(preload(id));
    }
    await Promise.all(promises);
    console.log(`[Audio] Preloaded ${_sounds.size} sounds`);
  }

  // ── Persistence ───────────────────────────────────────────────────────

  /**
   * Load sound definitions from server.
   */
  async function loadDefinitions() {
    try {
      const resp = await fetch('/api/audio-definitions');
      if (!resp.ok) {
        console.warn('[Audio] Failed to load definitions:', resp.status);
        return;
      }
      const data = await resp.json();

      // Clear existing
      _sounds.clear();

      // Register all sounds from saved data
      if (data.sounds) {
        for (const [id, def] of Object.entries(data.sounds)) {
          registerSound(id, def);
        }
      }

      // Restore volume settings
      if (data.volumes) {
        for (const [ch, vol] of Object.entries(data.volumes)) {
          if (ch === 'master') setMasterVolume(vol);
          else setChannelVolume(ch, vol);
        }
      }

      console.log(`[Audio] Loaded ${_sounds.size} sound definitions`);
      Engine.emit('audio.definitionsLoaded', {});
    } catch (e) {
      console.warn('[Audio] Error loading definitions:', e);
    }
  }

  /**
   * Save sound definitions to server.
   */
  async function saveDefinitions() {
    const data = {
      sounds: {},
      volumes: { ..._volumes }
    };

    for (const [id, def] of _sounds) {
      data.sounds[id] = {
        src: def.src,
        procedural: def.procedural,
        volume: def.volume,
        pitch: def.pitch,
        loop: def.loop,
        category: def.category,
        spatial: def.spatial,
        variants: def.variants,
        pitchVariance: def.pitchVariance,
        volumeVariance: def.volumeVariance,
        maxInstances: def.maxInstances
      };
    }

    try {
      const resp = await fetch('/api/audio-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resp.ok) {
        console.log(`[Audio] Saved ${_sounds.size} sound definitions`);
        Engine.emit('audio.definitionsSaved', {});
      }
    } catch (e) {
      console.warn('[Audio] Error saving definitions:', e);
    }
  }

  /**
   * Upload an audio file to the server.
   * @param {File} file - File object from file picker
   * @param {string} [subFolder='sfx'] - Subfolder under assets/audio/
   * @returns {Promise<{path: string, filename: string}|null>}
   */
  async function uploadFile(file, subFolder = 'sfx') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subFolder', subFolder);

    try {
      const resp = await fetch('/api/audio-files/upload', {
        method: 'POST',
        body: formData
      });
      if (resp.ok) {
        const result = await resp.json();
        console.log(`[Audio] Uploaded: ${result.path}`);
        return result;
      }
    } catch (e) {
      console.warn('[Audio] Upload error:', e);
    }
    return null;
  }

  // ── Internal: File Playback ───────────────────────────────────────────

  async function _playFile(instanceId, soundId, src, def, volume, pitch, loop, pan) {
    const buffer = await _loadBuffer(src);
    if (!buffer) return;

    const channelGain = _channelGains.get(def.category) || _channelGains.get('sfx');
    if (!channelGain) return;

    // Create audio graph: source → instanceGain → panner → channelGain
    const source = _ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    source.loop = loop;

    const gainNode = _ctx.createGain();
    gainNode.gain.value = volume;

    if (pan !== 0) {
      const panner = _ctx.createStereoPanner();
      panner.pan.value = pan;
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(channelGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(channelGain);
    }

    source.start();

    const inst = {
      instanceId,
      soundId,
      sourceNode: source,
      gainNode,
      startTime: _ctx.currentTime,
      loop
    };
    _instances.set(instanceId, inst);

    // Auto-cleanup when done (non-looping)
    if (!loop) {
      source.onended = () => {
        _instances.delete(instanceId);
      };
    }
  }

  /**
   * Load an audio file into an AudioBuffer (cached).
   */
  async function _loadBuffer(src) {
    if (_bufferCache.has(src)) return _bufferCache.get(src);

    try {
      const resp = await fetch(src);
      if (!resp.ok) {
        console.warn(`[Audio] Failed to fetch: ${src} (${resp.status})`);
        return null;
      }
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await _ctx.decodeAudioData(arrayBuf);
      _bufferCache.set(src, audioBuf);
      return audioBuf;
    } catch (e) {
      console.warn(`[Audio] Failed to decode: ${src}`, e);
      return null;
    }
  }

  // ── Internal: Procedural Sound Generation ─────────────────────────────
  //
  // 8-bit inspired sounds using oscillators. No files needed.
  // Each preset creates a short AudioBuffer on first use, then caches it.
  //

  const PROCEDURAL_PRESETS = {
    // ── UI ──
    click:       { type: 'square',   freq: 800,  dur: 0.05, decay: 0.03, slide: -200 },
    hover:       { type: 'sine',     freq: 600,  dur: 0.03, decay: 0.02, slide: 100 },
    confirm:     { type: 'square',   freq: 500,  dur: 0.15, decay: 0.1,  slide: 300,  steps: [500, 700, 900] },
    cancel:      { type: 'square',   freq: 400,  dur: 0.15, decay: 0.1,  slide: -200, steps: [400, 300, 200] },
    error:       { type: 'sawtooth', freq: 200,  dur: 0.20, decay: 0.15, slide: -100 },
    select:      { type: 'square',   freq: 600,  dur: 0.08, decay: 0.05, slide: 200 },
    tab:         { type: 'sine',     freq: 1000, dur: 0.04, decay: 0.03, slide: -100 },

    // ── Environment ──
    footstep:    { type: 'noise',    freq: 0,    dur: 0.08, decay: 0.06, filter: 800 },
    door_open:   { type: 'sawtooth', freq: 150,  dur: 0.30, decay: 0.25, slide: 50,  vibrato: 5 },
    door_close:  { type: 'sawtooth', freq: 200,  dur: 0.20, decay: 0.15, slide: -80, vibrato: 3 },
    switch_on:   { type: 'square',   freq: 800,  dur: 0.06, decay: 0.04, slide: 400 },
    switch_off:  { type: 'square',   freq: 1000, dur: 0.06, decay: 0.04, slide: -400 },
    splash:      { type: 'noise',    freq: 0,    dur: 0.20, decay: 0.15, filter: 2000 },
    wind:        { type: 'noise',    freq: 0,    dur: 0.60, decay: 0.5,  filter: 600, vibrato: 2 },
    rain_drop:   { type: 'noise',    freq: 0,    dur: 0.04, decay: 0.03, filter: 4000 },
    fire:        { type: 'noise',    freq: 0,    dur: 0.40, decay: 0.35, filter: 1200, vibrato: 8 },
    thunder:     { type: 'noise',    freq: 0,    dur: 0.80, decay: 0.6,  filter: 300 },

    // ── Combat ──
    hit:         { type: 'noise',    freq: 0,    dur: 0.10, decay: 0.08, filter: 1500 },
    slash:       { type: 'noise',    freq: 0,    dur: 0.12, decay: 0.08, filter: 3000, slide: -500 },
    hurt:        { type: 'square',   freq: 300,  dur: 0.15, decay: 0.12, slide: -150 },
    death:       { type: 'square',   freq: 400,  dur: 0.40, decay: 0.35, slide: -300, steps: [400, 300, 200, 100] },
    explosion:   { type: 'noise',    freq: 0,    dur: 0.50, decay: 0.4,  filter: 500 },
    arrow:       { type: 'noise',    freq: 0,    dur: 0.08, decay: 0.05, filter: 6000, slide: -2000 },
    shield:      { type: 'sine',     freq: 400,  dur: 0.12, decay: 0.08, slide: -100, vibrato: 15 },

    // ── Items & Inventory ──
    pickup:      { type: 'square',   freq: 600,  dur: 0.12, decay: 0.08, steps: [600, 800, 1000] },
    drop:        { type: 'sine',     freq: 500,  dur: 0.08, decay: 0.06, slide: -200 },
    equip:       { type: 'square',   freq: 400,  dur: 0.10, decay: 0.08, steps: [400, 600] },
    coin:        { type: 'sine',     freq: 1200, dur: 0.15, decay: 0.10, steps: [1200, 1600] },
    potion:      { type: 'sine',     freq: 500,  dur: 0.20, decay: 0.15, slide: 400, vibrato: 6 },
    craft:       { type: 'noise',    freq: 0,    dur: 0.15, decay: 0.12, filter: 2000 },
    eat:         { type: 'noise',    freq: 0,    dur: 0.12, decay: 0.08, filter: 1800 },
    drink:       { type: 'noise',    freq: 0,    dur: 0.15, decay: 0.10, filter: 1000, slide: 200 },

    // ── Magic ──
    spell:       { type: 'sine',     freq: 300,  dur: 0.30, decay: 0.25, slide: 500, vibrato: 8 },
    heal:        { type: 'sine',     freq: 600,  dur: 0.30, decay: 0.25, steps: [600, 800, 1000, 1200] },
    teleport:    { type: 'sine',     freq: 200,  dur: 0.35, decay: 0.30, slide: 1000, vibrato: 20 },
    powerup:     { type: 'square',   freq: 400,  dur: 0.30, decay: 0.25, steps: [400, 500, 600, 800, 1000] },

    // ── Misc ──
    level_up:    { type: 'square',   freq: 500,  dur: 0.50, decay: 0.40, steps: [500, 600, 700, 800, 1000, 1200] },
    alert:       { type: 'square',   freq: 800,  dur: 0.30, decay: 0.25, steps: [800, 1000, 800, 1000] },
    notification:{ type: 'sine',     freq: 800,  dur: 0.10, decay: 0.08, steps: [800, 1000] },
    save:        { type: 'sine',     freq: 600,  dur: 0.20, decay: 0.15, steps: [600, 800, 1000] }
  };

  function _playProcedural(instanceId, def, volume, pitch, loop, pan) {
    const presetName = def.procedural;
    const preset = PROCEDURAL_PRESETS[presetName];
    if (!preset) {
      console.warn(`[Audio] Unknown procedural preset: "${presetName}"`);
      return;
    }

    const channelGain = _channelGains.get(def.category) || _channelGains.get('sfx');
    if (!channelGain) return;

    const sampleRate = _ctx.sampleRate;
    const duration = preset.dur;
    const samples = Math.ceil(sampleRate * duration);
    const buffer = _ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    if (preset.type === 'noise') {
      // White noise with optional filter envelope
      _generateNoise(data, samples, sampleRate, preset, pitch);
    } else if (preset.steps && preset.steps.length > 0) {
      // Arpeggio: step through frequencies
      _generateArpeggio(data, samples, sampleRate, preset, pitch);
    } else {
      // Single oscillator with slide
      _generateTone(data, samples, sampleRate, preset, pitch);
    }

    // Apply decay envelope
    const decaySamples = Math.ceil(sampleRate * (preset.decay || duration));
    for (let i = 0; i < samples; i++) {
      const env = i < decaySamples
        ? 1.0 - (i / decaySamples) * 0.8  // Gradual fade during decay
        : 0.2 * (1.0 - (i - decaySamples) / (samples - decaySamples)); // Quick tail fade
      data[i] *= env;
    }

    // Play the buffer
    const source = _ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = _ctx.createGain();
    gainNode.gain.value = volume;

    if (pan !== 0) {
      const panner = _ctx.createStereoPanner();
      panner.pan.value = pan;
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(channelGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(channelGain);
    }

    source.start();

    const inst = {
      instanceId,
      soundId: def.id,
      sourceNode: source,
      gainNode,
      startTime: _ctx.currentTime,
      loop
    };
    _instances.set(instanceId, inst);

    if (!loop) {
      source.onended = () => {
        _instances.delete(instanceId);
      };
    }
  }

  function _generateTone(data, samples, sampleRate, preset, pitchMul) {
    const freq = preset.freq * pitchMul;
    const slide = (preset.slide || 0) * pitchMul;
    const vibratoFreq = preset.vibrato || 0;
    const type = preset.type;

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = i / samples;
      const currentFreq = freq + slide * progress + (vibratoFreq > 0 ? Math.sin(t * vibratoFreq * Math.PI * 2) * 20 : 0);
      const phase = t * currentFreq * Math.PI * 2;

      switch (type) {
        case 'sine':
          data[i] = Math.sin(phase);
          break;
        case 'square':
          data[i] = Math.sin(phase) > 0 ? 0.5 : -0.5;
          break;
        case 'sawtooth':
          data[i] = ((t * currentFreq) % 1) * 2 - 1;
          break;
        case 'triangle':
          data[i] = Math.abs(((t * currentFreq) % 1) * 4 - 2) - 1;
          break;
        default:
          data[i] = Math.sin(phase);
      }
    }
  }

  function _generateArpeggio(data, samples, sampleRate, preset, pitchMul) {
    const steps = preset.steps;
    const stepDuration = samples / steps.length;
    const type = preset.type;

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const stepIndex = Math.min(Math.floor(i / stepDuration), steps.length - 1);
      const freq = steps[stepIndex] * pitchMul;
      const phase = t * freq * Math.PI * 2;

      switch (type) {
        case 'sine':
          data[i] = Math.sin(phase);
          break;
        case 'square':
          data[i] = Math.sin(phase) > 0 ? 0.5 : -0.5;
          break;
        case 'sawtooth':
          data[i] = ((t * freq) % 1) * 2 - 1;
          break;
        default:
          data[i] = Math.sin(phase);
      }
    }
  }

  function _generateNoise(data, samples, sampleRate, preset, pitchMul) {
    const filterFreq = (preset.filter || 4000) * pitchMul;
    const slide = (preset.slide || 0) * pitchMul;
    const vibratoFreq = preset.vibrato || 0;

    // Simple one-pole low-pass filter
    let prev = 0;
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = i / samples;
      const cutoff = filterFreq + slide * progress + (vibratoFreq > 0 ? Math.sin(t * vibratoFreq * Math.PI * 2) * 200 : 0);
      const rc = 1.0 / (cutoff * 2 * Math.PI);
      const dt = 1.0 / sampleRate;
      const alpha = dt / (rc + dt);

      const noise = Math.random() * 2 - 1;
      prev = prev + alpha * (noise - prev);
      data[i] = prev * 2; // Boost filtered noise
    }
  }

  // ── Internal: Helpers ─────────────────────────────────────────────────

  function _getListenerPosition() {
    // Use player position if available, otherwise camera center
    if (typeof player !== 'undefined') {
      return { x: player.x, y: player.y };
    }
    if (typeof camera !== 'undefined') {
      return { x: camera.x, y: camera.y };
    }
    return { x: 0, y: 0 };
  }

  function _findOldestInstance(includeLooping) {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [instId, inst] of _instances) {
      if (!includeLooping && inst.loop) continue;
      if (inst.startTime < oldestTime) {
        oldestTime = inst.startTime;
        oldest = instId;
      }
    }
    return oldest;
  }

  // ── Debug / Info ──────────────────────────────────────────────────────

  function getStatus() {
    return {
      initialized: _initialized,
      suspended: _suspended,
      contextState: _ctx ? _ctx.state : 'unavailable',
      registeredSounds: _sounds.size,
      activeInstances: _instances.size,
      cachedBuffers: _bufferCache.size,
      volumes: { ..._volumes },
      currentMusic: _currentMusic ? _currentMusic.soundId : null,
      proceduralPresets: Object.keys(PROCEDURAL_PRESETS)
    };
  }

  /**
   * List all available procedural preset names.
   */
  function listProceduralPresets() {
    return Object.keys(PROCEDURAL_PRESETS);
  }

  /**
   * Play a procedural preset directly (convenience for testing).
   */
  function playProcedural(presetName, opts = {}) {
    const tempId = `_proc_${presetName}`;
    if (!_sounds.has(tempId)) {
      registerSound(tempId, {
        procedural: presetName,
        category: opts.category || 'sfx',
        volume: opts.volume || 0.6,
        pitch: opts.pitch || 1.0
      });
    }
    return play(tempId, opts);
  }

  // ── Register Built-in Procedural Sounds ───────────────────────────────
  // Auto-register all procedural presets so they're immediately playable
  // via playSound('click'), playSound('footstep'), etc.

  function _registerBuiltinSounds() {
    for (const name of Object.keys(PROCEDURAL_PRESETS)) {
      const preset = PROCEDURAL_PRESETS[name];
      // Determine default category from preset grouping
      let category = 'sfx';
      if (['click', 'hover', 'confirm', 'cancel', 'error', 'select', 'tab'].includes(name)) {
        category = 'ui';
      }

      // Only register if not already registered (user definitions take priority)
      if (!_sounds.has(name)) {
        registerSound(name, {
          procedural: name,
          category,
          volume: 0.6,
          pitch: 1.0
        });
      }
    }
  }

  // ── Engine Registration ───────────────────────────────────────────────

  const audioAPI = {
    // Lifecycle
    init,

    // Registration
    registerSound,
    removeSound,
    getSound,
    listSounds,

    // Playback
    play,
    stopInstance,
    stopAll,
    stopEverything,

    // Music
    playMusic,
    stopMusic,

    // Volume
    setMasterVolume,
    getMasterVolume,
    setChannelVolume,
    getChannelVolume,
    getVolumes,

    // Preloading
    preload,
    preloadAll,

    // Persistence
    loadDefinitions,
    saveDefinitions,
    uploadFile,

    // Procedural
    playProcedural,
    listProceduralPresets,

    // Debug
    getStatus,

    // Instance access (for ambient sound manager)
    _getInstanceById: function(id) { return _instances.get(id) || null; },

    // Constants
    CHANNELS,
    PROCEDURAL_PRESETS
  };

  Engine.register('audio', audioAPI);

  // ── Global Convenience Function ───────────────────────────────────────
  // This is what scripts, tiles, and the rest of the codebase call.

  window.playSound = function (id, opts) {
    return audioAPI.play(id, opts);
  };

  window.stopSound = function (id) {
    return audioAPI.stopAll(id);
  };

  window.playMusic = function (id, fadeDuration) {
    return audioAPI.playMusic(id, fadeDuration);
  };

  window.stopMusic = function (fadeDuration) {
    return audioAPI.stopMusic(fadeDuration);
  };

  // Initialize immediately
  init();
  _registerBuiltinSounds();

  // Load saved definitions from server
  loadDefinitions().then(() => {
    console.log(`[Audio] System ready - ${_sounds.size} sounds, ${Object.keys(PROCEDURAL_PRESETS).length} procedural presets`);
  });

})();
