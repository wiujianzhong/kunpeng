(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const devMode = new URLSearchParams(location.search).get('dev') === '1';
  const storageGet = (key) => { try { return localStorage.getItem(key); } catch (error) { return null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch (error) { /* 隐私模式下仅本次解锁 */ } };

  const ids = [
    'app', 'gameCanvas', 'homeScreen', 'bossNameInput', 'bossTitleInput', 'avatarInput',
    'avatarPreview', 'avatarCanvas', 'themeGrid', 'voiceGrid', 'createBossButton', 'quickPlayButton',
    'shareLinkButton', 'creatorStatus', 'loadoutScreen', 'fighterGrid', 'difficultyGrid', 'launchButton',
    'backHomeButton', 'gameScreen', 'bossNameHud', 'bossTitleHud', 'bossHpFill',
    'playerHpFill', 'shieldFill', 'comboValue', 'scoreValue', 'timerValue', 'phaseLabel',
    'tauntToast', 'pauseButton', 'dashButton', 'ultimateButton', 'upgradeScreen',
    'upgradeChoices', 'resultScreen', 'resultStamp', 'resultTitle', 'resultSummary',
    'resultStats', 'shareResultButton', 'rematchButton', 'createAnotherButton',
    'soundButton', 'reduceMotionButton', 'introOverlay', 'upgradeTitle', 'upgradeSubtitle',
    'mobileUploadButton', 'mobileQuickPlayButton', 'mobileUploadStatus'
  ];

  const dom = {};
  const CONFIG_PREFIX = '#br=';
  const FIGHTERS = {
    ray: { name: '电鳐', hp: 100, speed: 340, rate: 0.115, damage: 18, color: '#5cf6ff', desc: '稳定激光 · 精准续航' },
    falcon: { name: '猎隼', hp: 82, speed: 400, rate: 0.26, damage: 13, color: '#ff8066', desc: '近战散射 · 高风险爆发' },
    turtle: { name: '玄甲', hp: 132, speed: 275, rate: 0.22, damage: 23, color: '#72ffac', desc: '护盾反伤 · 稳健推进' },
    ghost: { name: '幽灵', hp: 88, speed: 440, rate: 0.09, damage: 15, color: '#c08cff', desc: '相位穿透 · 隐藏战机' }
  };

  const DIFFICULTIES = {
    easy: { name: '轻松', bossHp: 9000, playerHp: 1.15, enemyDamage: 0.72, enemySpeed: 0.84, attackInterval: 1.18, warning: 1.25, invuln: 0.75, countdown: 150, firstCounter: 10, repeatCounter: 16, score: 0.8, sssTime: 100, sTime: 125 },
    normal: { name: '标准', bossHp: 9800, playerHp: 1, enemyDamage: 1, enemySpeed: 1, attackInterval: 1, warning: 1, invuln: 0.6, countdown: 120, firstCounter: 6, repeatCounter: 12, score: 1, sssTime: 70, sTime: 90 },
    hard: { name: '疯狂', bossHp: 10600, playerHp: 1, enemyDamage: 1.2, enemySpeed: 1.12, attackInterval: 0.88, warning: 0.85, invuln: 0.5, countdown: 105, firstCounter: 4, repeatCounter: 10, score: 1.3, sssTime: 82, sTime: 100 }
  };

  const FACE_VISION_URL = './assets/boss-rush/vendor/mediapipe-face/vision_bundle.mjs';
  const FACE_WASM_ROOT = './assets/boss-rush/vendor/mediapipe-face/wasm';
  const FACE_MODEL_URL = './assets/boss-rush/vendor/mediapipe-face/blaze_face_short_range.tflite';
  let faceDetectorPromise = null;

  const SFX_PATHS = {
    fire: 'assets/boss-rush/audio/sfx/click-soft.mp3',
    hit: 'assets/boss-rush/audio/sfx/pop.mp3',
    crit: 'assets/boss-rush/audio/sfx/ping.mp3',
    hurt: 'assets/boss-rush/audio/sfx/error.mp3',
    dash: 'assets/boss-rush/audio/sfx/whoosh-short.mp3',
    warning: 'assets/boss-rush/audio/sfx/notification.mp3',
    upgrade: 'assets/boss-rush/audio/sfx/chime.mp3',
    boom: 'assets/boss-rush/audio/sfx/impact-bass-1.mp3',
    win: 'assets/boss-rush/audio/sfx/sparkle.mp3'
  };

  const BOSS_VOICES = {
    buddy: { name: '嘴硬损友' },
    queen: { name: '冷面女王' },
    veteran: { name: '机械老炮' }
  };

  const VOICE_CUES = [
    'entrance-1', 'entrance-2', 'entrance-3',
    'phase2-1', 'phase2-2', 'phase2-3',
    'phase3-1', 'phase3-2',
    'playerHit-1', 'playerHit-2', 'playerHit-3',
    'critical-1', 'critical-2', 'critical-3',
    'victory-1', 'defeat-1',
    'counter-dash', 'counter-bottom', 'counter-left', 'counter-right', 'counter-center'
  ];

  const BGM_PATHS = {
    1: 'assets/boss-rush/audio/bgm/phase-1.mp3',
    2: 'assets/boss-rush/audio/bgm/phase-2.mp3',
    3: 'assets/boss-rush/audio/bgm/phase-3.mp3'
  };

  const SPRITE_PATHS = {
    ray: 'assets/boss-rush/sprites/ray.png',
    falcon: 'assets/boss-rush/sprites/falcon.png',
    turtle: 'assets/boss-rush/sprites/turtle.png',
    ghost: 'assets/boss-rush/sprites/ray.png',
    boss: 'assets/boss-rush/sprites/boss.png'
  };

  const THEMES = {
    cyber: { name: '赛博城', top: '#07102d', bottom: '#160829', glow: '#00eaff', accent: '#ff36d8', weather: 'rain' },
    factory: { name: '熔钢工厂', top: '#181b22', bottom: '#321812', glow: '#ffb347', accent: '#ff5a36', weather: 'ash' },
    forest: { name: '翡翠密林', top: '#061a18', bottom: '#102f20', glow: '#65ff9a', accent: '#ffe16b', weather: 'leaf' },
    desert: { name: '赤沙遗迹', top: '#321812', bottom: '#704124', glow: '#ffd07d', accent: '#ff785a', weather: 'sand' },
    space: { name: '深空星云', top: '#05071d', bottom: '#171048', glow: '#8ac7ff', accent: '#ce72ff', weather: 'star' },
    station: { name: '轨道空间站', top: '#07121d', bottom: '#112737', glow: '#7de8ff', accent: '#f5f7ff', weather: 'debris' },
    deepsea: { name: '深海裂谷', top: '#021620', bottom: '#00334b', glow: '#43e8da', accent: '#5c8cff', weather: 'bubble' },
    volcano: { name: '火山核心', top: '#1b0705', bottom: '#4b1008', glow: '#ff6b29', accent: '#ffd166', weather: 'ember' },
    tokyo: { name: '霓虹东京', top: '#100828', bottom: '#251044', glow: '#45e9ff', accent: '#ff4fb8', weather: 'petal' }
  };

  const MODULES = [
    { id: 'twin', icon: 'Ⅱ', name: '双流炮', desc: '额外发射一条平行弹道', apply: (p) => { p.twin = true; } },
    { id: 'scatter', icon: '✦', name: '扩散棱镜', desc: '主炮增加两枚斜射弹', apply: (p) => { p.scatter = true; } },
    { id: 'drone', icon: '◇', name: '护航无人机', desc: '部署自动攻击僚机', apply: (p) => { p.drone = (p.drone || 0) + 1; } },
    { id: 'missile', icon: '➤', name: '追猎导弹', desc: '僚机周期发射追踪导弹', apply: (p) => { p.missile = true; } },
    { id: 'shield', icon: '⬡', name: '量子护盾', desc: '获得35点可恢复护盾', apply: (p) => { p.shieldMax += 35; p.shield += 35; } },
    { id: 'reflect', icon: '↯', name: '镜面反伤', desc: '护盾受击时反射部分伤害', apply: (p) => { p.reflect = 0.48; } },
    { id: 'rapid', icon: '»', name: '超频扳机', desc: '射速提高15%', apply: (p) => { p.rateMul *= 0.85; } },
    { id: 'power', icon: '◆', name: '聚变弹芯', desc: '主炮伤害提高22%', apply: (p) => { p.damageMul *= 1.22; } },
    { id: 'critical', icon: '!', name: '弱点扫描', desc: '暴击率提高18%', apply: (p) => { p.crit += 0.18; } },
    { id: 'pierce', icon: '⇧', name: '相位穿透', desc: '子弹可额外穿透一次', apply: (p) => { p.pierce += 1; } },
    { id: 'repair', icon: '+', name: '纳米维修', desc: '立刻恢复30%耐久', apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); } },
    { id: 'time', icon: '◴', name: '迟滞力场', desc: '敌弹速度降低16%', apply: (p) => { p.enemySlow *= 0.84; } },
    { id: 'homing', icon: '⌁', name: '矢量制导', desc: '主炮轻微追踪Boss核心', apply: (p) => { p.homing = true; } },
    { id: 'dash', icon: '⌁', name: '冲刺回充', desc: '冲刺冷却缩短35%', apply: (p) => { p.dashMul *= 0.65; } },
    { id: 'vampire', icon: '♥', name: '能量虹吸', desc: '每30次命中恢复2点耐久', apply: (p) => { p.vampire = true; } }
  ];

  const VOICE_LINES = {
    buddy: {
      entrance: ['本人已上线，友情已下线。', '别盯着头像看，打坏了你赔。', '先说好，打赢只代表我今天网卡。'],
      phase2: ['热身结束，刚才那段我就当没看见。', '第二层装甲开了，你的第二个借口呢？', '有点东西，先别急着截图。'],
      phase3: ['最后一层了，咱俩至少有一个要丢脸。', '核心过热，友情也差不多了。'],
      playerHit: ['这一发不疼，主要伤自尊。', '别慌，慌了看起来更像节目。', '走位不错，刚好走进来了。'],
      critical: ['哦？这一下算你蒙对。', '装甲掉了，嘴还硬着。', '等一下，我检查你是不是偷偷练过。'],
      victory: ['行，今天算你有操作，明天我不认。'],
      defeat: ['再来一局，我保证还是这张脸。']
    },
    queen: {
      entrance: ['挑战权限已开放。失败权限，默认开启。', '抬头。看清楚是谁让你重开。', '开始吧。别把运气误认为实力。'],
      phase2: ['第一层只是礼貌。现在，认真躲。', '装甲已切换。你的表情，也该变了。', '不错。值得我把难度调高一点。'],
      phase3: ['最终阶段。允许你开始后悔。', '核心解锁。你的胜率，归零。'],
      playerHit: ['失误已记录。继续。', '别解释。弹幕不听。', '你的路线，过于诚实。'],
      critical: ['有效命中。仅此一次。', '碰到装甲，不等于看懂弱点。', '值得表扬。可惜没有奖励。'],
      victory: ['这局归你。下次，我会收回。'],
      defeat: ['挑战结束。你的操作，已归档。']
    },
    veteran: {
      entrance: ['目标进入射界。老伙计，别让我等太久。', '核心上线。全频道注意，菜鸟要起飞了。', '引擎声不错。希望驾驶员也配得上。'],
      phase2: ['二级装甲脱锁。火力管制，解除。', '热身弹药打完了。现在上真家伙。', '能撑到这里，准你报个呼号。'],
      phase3: ['核心红温。全炮门，最后齐射。', '终局警报。不是你返航，就是我熄火。'],
      playerHit: ['中弹确认。别愣着，修正航向。', '装甲替你扛了，脑子别再省着。', '航线太直。靶场都没这么配合。'],
      critical: ['命中核心。漂亮，别得意。', '这一炮有老兵的味道。', '穿甲有效。继续压住扳机。'],
      victory: ['干得漂亮。今天这片空域归你。'],
      defeat: ['返航吧，菜鸟。修好飞机再来。']
    }
  };

  const COUNTER_LINES = {
    buddy: {
      'counter-dash': '你连续冲刺的落点，我记住了。', 'counter-bottom': '一直缩在底线？那里现在归我了。',
      'counter-left': '你总爱往左躲，侧翼已封锁。', 'counter-right': '你总爱往右躲，侧翼已封锁。', 'counter-center': '中路盘旋太久，扇区开始收缩。'
    },
    queen: {
      'counter-dash': '冲刺落点已预测。', 'counter-bottom': '底线不是避难所。',
      'counter-left': '左翼封锁。请继续犯错。', 'counter-right': '右翼封锁。请继续犯错。', 'counter-center': '中路权限，已回收。'
    },
    veteran: {
      'counter-dash': '连续冲刺已标记。预判落点，开火。', 'counter-bottom': '底线滞留。投放封锁火力。',
      'counter-left': '左翼活动频繁。侧炮封锁。', 'counter-right': '右翼活动频繁。侧炮封锁。', 'counter-center': '中轴盘旋。扇区收紧。'
    }
  };

  class Pool {
    constructor(size, factory) {
      this.items = Array.from({ length: size }, factory);
    }
    get() {
      const item = this.items.find((entry) => !entry.active);
      if (!item) return null;
      item.active = true;
      return item;
    }
    each(fn) {
      for (const item of this.items) if (item.active) fn(item);
    }
    clear() {
      for (const item of this.items) item.active = false;
    }
  }

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxBus = null;
      this.musicBus = null;
      this.voiceBus = null;
      this.muted = false;
      this.phase = 1;
      this.samples = new Map();
      this.sampleLoading = new Map();
      this.lastSfx = new Map();
      this.voiceBuffers = new Map();
      this.voiceLoading = new Map();
      this.musicBuffers = new Map();
      this.musicLoading = new Map();
      this.musicSource = null;
      this.currentVoice = null;
      this.pendingVoice = null;
      this.voiceQueue = [];
      this.queuedVoiceJob = null;
      this.activeVoice = 'buddy';
      this.musicRequest = 0;
      this.musicCacheToken = 0;
      this.voiceRequest = 0;
      this.resumeToken = 0;
      this.wasInterrupted = false;
      this.generation = 0;
      this.fetchControllers = new Set();
    }
    unlock() {
      if (this.muted) return;
      if (this.wasInterrupted && this.ctx) {
        this.rebuildContext();
        return;
      }
      if (!this.ctx) this.createContext();
      this.resumeContext();
    }
    createContext() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.voiceBus = this.ctx.createGain();
      this.master.gain.value = 0.88;
      this.sfxBus.gain.value = 0.26;
      this.musicBus.gain.value = 0.34;
      this.voiceBus.gain.value = 0.84;
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.voiceBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.generation++;
    }
    resumeContext(allowRebuild = true) {
      const context = this.ctx;
      if (!context || context.state === 'running') return;
      const token = ++this.resumeToken;
      let resumeResult;
      try { resumeResult = context.resume(); } catch (error) {
        if (allowRebuild) this.rebuildContext();
        return;
      }
      Promise.resolve(resumeResult).catch(() => {
        if (allowRebuild && token === this.resumeToken && this.ctx === context && state.mode !== 'paused') this.rebuildContext();
      });
      setTimeout(() => {
        if (allowRebuild && token === this.resumeToken && this.ctx === context && context.state !== 'running' && state.mode !== 'paused') this.rebuildContext();
      }, 700);
    }
    suspend() {
      this.wasInterrupted = true;
      this.resumeToken++;
      if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => { /* 恢复时重建 */ });
    }
    rebuildContext() {
      if (state.mode === 'paused') return;
      const previous = this.ctx;
      this.wasInterrupted = false;
      this.resumeToken++;
      this.ctx = null;
      this.master = null;
      this.sfxBus = null;
      this.musicBus = null;
      this.voiceBus = null;
      this.musicSource = null;
      this.currentVoice = null;
      this.pendingVoice = null;
      this.voiceQueue = [];
      this.queuedVoiceJob = null;
      for (const controller of this.fetchControllers) controller.abort();
      this.fetchControllers.clear();
      this.samples.clear();
      this.sampleLoading.clear();
      this.voiceBuffers.clear();
      this.voiceLoading.clear();
      this.musicBuffers.clear();
      this.musicLoading.clear();
      try { previous?.close().catch(() => {}); } catch (error) { /* 旧上下文交给浏览器回收 */ }
      this.createContext();
      this.resumeContext(false);
      void this.loadSamples(['fire', 'hit', 'hurt', 'dash', 'warning']);
      void this.prepareVoice(this.activeVoice);
      void this.prepareBgm(this.phase < 3 ? [this.phase, this.phase + 1] : [3]);
      if (['intro', 'active', 'upgrade'].includes(state.mode)) void this.playBgmPhase(this.phase);
      const context = this.ctx;
      setTimeout(() => {
        if (this.ctx !== context) return;
        void this.loadSamples();
        void this.prepareVoice(this.activeVoice, VOICE_CUES);
      }, 1200);
    }
    async loadBuffer(path) {
      const context = this.ctx;
      const generation = this.generation;
      if (!context) return null;
      const controller = new AbortController();
      this.fetchControllers.add(controller);
      try {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error(`音频加载失败：${response.status}`);
        const data = await response.arrayBuffer();
        if (generation !== this.generation || context !== this.ctx) return null;
        const buffer = await new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject));
        return generation === this.generation && context === this.ctx ? buffer : null;
      } finally {
        this.fetchControllers.delete(controller);
      }
    }
    async loadLimited(items, loader, limit = 3) {
      let cursor = 0;
      const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
          const item = items[cursor++];
          await loader(item);
        }
      });
      await Promise.allSettled(workers);
    }
    loadSample(name) {
      if (!this.ctx || !SFX_PATHS[name]) return Promise.resolve(null);
      if (this.samples.has(name)) return Promise.resolve(this.samples.get(name));
      if (this.sampleLoading.has(name)) return this.sampleLoading.get(name);
      const pending = this.loadBuffer(SFX_PATHS[name])
        .then((buffer) => { if (buffer && this.sampleLoading.get(name) === pending) this.samples.set(name, buffer); return buffer; })
        .catch(() => null)
        .finally(() => { if (this.sampleLoading.get(name) === pending) this.sampleLoading.delete(name); });
      this.sampleLoading.set(name, pending);
      return pending;
    }
    loadSamples(names = Object.keys(SFX_PATHS)) {
      if (!this.ctx) return Promise.resolve();
      return this.loadLimited(names.filter((name) => SFX_PATHS[name]), (name) => this.loadSample(name), 3);
    }
    loadVoiceCue(voice, cue) {
      if (!this.ctx || !BOSS_VOICES[voice] || !VOICE_CUES.includes(cue)) return Promise.resolve(null);
      const key = `${voice}/${cue}`;
      if (this.voiceBuffers.has(key)) return Promise.resolve(this.voiceBuffers.get(key));
      if (this.voiceLoading.has(key)) return this.voiceLoading.get(key);
      const pending = this.loadBuffer(`assets/boss-rush/audio/voice/${key}.mp3`)
        .then((buffer) => {
          if (buffer && this.activeVoice === voice && this.voiceLoading.get(key) === pending) this.voiceBuffers.set(key, buffer);
          return buffer;
        })
        .catch(() => null)
        .finally(() => { if (this.voiceLoading.get(key) === pending) this.voiceLoading.delete(key); });
      this.voiceLoading.set(key, pending);
      return pending;
    }
    prepareVoice(voice, cues = ['entrance-1', 'entrance-2', 'entrance-3']) {
      if (!BOSS_VOICES[voice]) return Promise.resolve();
      this.activeVoice = voice;
      for (const key of this.voiceBuffers.keys()) {
        if (!key.startsWith(`${voice}/`)) this.voiceBuffers.delete(key);
      }
      if (!this.ctx) return Promise.resolve();
      return this.loadLimited(cues.filter((cue) => VOICE_CUES.includes(cue)), (cue) => this.loadVoiceCue(voice, cue), 3);
    }
    loadBgmPhase(phase) {
      if (!this.ctx || !BGM_PATHS[phase]) return Promise.resolve(null);
      if (this.musicBuffers.has(phase)) return Promise.resolve(this.musicBuffers.get(phase));
      if (this.musicLoading.has(phase)) return this.musicLoading.get(phase);
      const cacheToken = this.musicCacheToken;
      const pending = this.loadBuffer(BGM_PATHS[phase])
        .then((buffer) => { if (buffer && cacheToken === this.musicCacheToken && this.musicLoading.get(phase) === pending) this.musicBuffers.set(phase, buffer); return buffer; })
        .catch(() => null)
        .finally(() => { if (this.musicLoading.get(phase) === pending) this.musicLoading.delete(phase); });
      this.musicLoading.set(phase, pending);
      return pending;
    }
    prepareBgm(phases = [1, 2, 3]) {
      if (!this.ctx) return Promise.resolve();
      return this.loadLimited(phases.filter((phase) => BGM_PATHS[phase]), (phase) => this.loadBgmPhase(phase), 2);
    }
    sample(name, volume = 0.35, rate = 1) {
      if (!this.ctx || this.muted) return false;
      const buffer = this.samples.get(name);
      if (!buffer) return false;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      gain.gain.value = volume;
      source.connect(gain).connect(this.sfxBus);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start();
      return true;
    }
    tone(freq, duration = 0.08, type = 'sine', volume = 0.12, slide = 0) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freq), now);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
    noise(duration = 0.12, volume = 0.1) {
      if (!this.ctx || this.muted) return;
      const length = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = 700;
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(this.sfxBus);
      source.start();
    }
    sfx(name) {
      if (!this.ctx || this.muted) return;
      const now = performance.now();
      const cooldown = { fire: 85, hit: 70, crit: 140, hurt: 180, dash: 120, warning: 360, upgrade: 240, boom: 500, win: 900 }[name] || 80;
      if (now - (this.lastSfx.get(name) || 0) < cooldown) return;
      this.lastSfx.set(name, now);
      if (name === 'fire') this.sample('fire', 0.24, 1.7);
      else if (name === 'hit') this.sample('hit', 0.28, 1.5);
      else if (name === 'crit') this.sample('crit', 0.42, 1.05);
      else if (name === 'hurt') this.sample('hurt', 0.34, 1.15);
      else if (name === 'dash') this.sample('dash', 0.38, 1.08);
      else if (name === 'warning') this.sample('warning', 0.3, 1.25);
      else if (name === 'upgrade') this.sample('upgrade', 0.36, 1.08);
      else if (name === 'boom') this.sample('boom', 0.48, 0.95);
      else if (name === 'win') this.sample('win', 0.42, 1.04);
    }
    radio(line) {
      if (!this.ctx || this.muted) return;
      this.noise(0.055, 0.09);
      const glyphs = Array.from(String(line || ''));
      const syllables = clamp(Math.ceil(glyphs.length / 4), 4, 8);
      const base = this.phase === 3 ? 118 : 92;
      for (let i = 0; i < syllables; i++) {
        const code = glyphs[i * 3]?.charCodeAt(0) || i * 17;
        const frequency = base + code % 72 + (i % 2 ? 38 : 0);
        setTimeout(() => this.tone(frequency, 0.065, i % 3 ? 'square' : 'sawtooth', 0.045, i % 2 ? 18 : -12), 70 + i * (this.phase === 3 ? 72 : 88));
      }
      setTimeout(() => this.noise(0.045, 0.07), 100 + syllables * (this.phase === 3 ? 72 : 88));
    }
    canAnnounce(priority) {
      const queuedPriority = this.voiceQueue.reduce((max, job) => Math.max(max, job.priority), this.queuedVoiceJob?.priority || 0);
      return !(this.currentVoice?.priority > priority || this.pendingVoice?.priority > priority || queuedPriority > priority);
    }
    async voice(voice, cue, priority = 1, onStart = null, onFail = null, onEnd = null) {
      this.unlock();
      if (!this.ctx || this.muted) return 'skipped';
      if (!this.canAnnounce(priority)) return 'skipped';
      const importantBusy = priority >= 3 && (this.currentVoice?.priority >= 3 || this.pendingVoice?.priority >= 3 || this.queuedVoiceJob || this.voiceQueue.length);
      if (importantBusy) {
        const job = { voice, cue, priority, onStart, onFail, onEnd, generation: this.generation, promise: this.loadVoiceCue(voice, cue) };
        this.voiceQueue.push(job);
        void this.playQueuedVoice();
        return 'queued';
      }
      const request = { id: ++this.voiceRequest, priority };
      this.pendingVoice = request;
      const buffer = await this.loadVoiceCue(voice, cue);
      if (this.pendingVoice !== request || this.muted) return 'skipped';
      if (!buffer) {
        this.pendingVoice = null;
        if (onFail) onFail();
        void this.playQueuedVoice();
        return 'failed';
      }
      if (this.currentVoice?.priority > priority) {
        this.pendingVoice = null;
        return 'skipped';
      }
      this.pendingVoice = null;
      this.playVoiceBuffer(buffer, priority, onStart, onEnd);
      return 'played';
    }
    async playQueuedVoice() {
      if (this.currentVoice || this.pendingVoice || this.queuedVoiceJob || !this.voiceQueue.length || this.muted) return;
      const job = this.voiceQueue.shift();
      this.queuedVoiceJob = job;
      const buffer = await job.promise;
      if (this.queuedVoiceJob !== job || job.generation !== this.generation) return;
      if (this.muted) {
        this.queuedVoiceJob = null;
        this.restoreMix();
        return;
      }
      this.queuedVoiceJob = null;
      if (!buffer) {
        if (job.onFail) job.onFail();
        if (this.voiceQueue.length) void this.playQueuedVoice();
        else this.restoreMix();
        return;
      }
      this.playVoiceBuffer(buffer, job.priority, job.onStart, job.onEnd);
    }
    resetVoice() {
      this.voiceRequest++;
      this.pendingVoice = null;
      this.voiceQueue = [];
      this.queuedVoiceJob = null;
      const previous = this.currentVoice;
      this.currentVoice = null;
      if (previous && this.ctx) {
        const now = this.ctx.currentTime;
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(Math.max(0.001, previous.gain.gain.value), now);
        previous.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        try { previous.source.stop(now + 0.09); } catch (error) { /* 已结束 */ }
      }
      this.restoreMix();
    }
    resetMusicCache(phase = 1) {
      this.phase = phase;
      this.musicCacheToken++;
      this.musicLoading.clear();
      for (const cachedPhase of this.musicBuffers.keys()) {
        if (cachedPhase !== phase) this.musicBuffers.delete(cachedPhase);
      }
    }
    restoreMix() {
      if (!this.ctx || !this.musicBus || !this.sfxBus) return;
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(0.34, now, 0.2);
      this.sfxBus.gain.cancelScheduledValues(now);
      this.sfxBus.gain.setTargetAtTime(0.26, now, 0.15);
    }
    playVoiceBuffer(buffer, priority, onStart, onEnd) {
      if (this.currentVoice) {
        const previous = this.currentVoice;
        const now = this.ctx.currentTime;
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(Math.max(0.001, previous.gain.gain.value), now);
        previous.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        try { previous.source.stop(now + 0.08); } catch (error) { /* 已结束 */ }
      }
      this.noise(0.045, 0.055);
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      const entry = { source, gain, priority };
      source.buffer = buffer;
      gain.gain.value = 0.96;
      source.connect(gain).connect(this.voiceBus);
      this.currentVoice = entry;
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(0.12, now, 0.055);
      this.sfxBus.gain.cancelScheduledValues(now);
      this.sfxBus.gain.setTargetAtTime(0.11, now, 0.04);
      if (onStart) onStart();
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.currentVoice !== entry) return;
        this.currentVoice = null;
        if (onEnd) onEnd();
        if (this.voiceQueue.length) void this.playQueuedVoice();
        else this.restoreMix();
      };
      source.start();
    }
    startBgm(phase = 1) {
      this.phase = phase;
      this.unlock();
      void this.playBgmPhase(phase);
    }
    setPhase(phase) {
      this.phase = phase;
      void this.playBgmPhase(phase);
    }
    async playBgmPhase(phase) {
      if (!this.ctx || this.muted || !BGM_PATHS[phase]) return;
      if (this.musicSource?.phase === phase) return;
      const request = ++this.musicRequest;
      const buffer = await this.loadBgmPhase(phase);
      if (!buffer || this.muted || request !== this.musicRequest || this.phase !== phase) return;
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(1, now + 0.6);
      source.connect(gain).connect(this.musicBus);
      const entry = { source, gain, phase };
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.musicSource === entry) this.musicSource = null;
        if (entry.phase !== this.phase) this.musicBuffers.delete(entry.phase);
      };
      source.start(now);
      const previous = this.musicSource;
      this.musicSource = entry;
      if (previous) {
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(Math.max(0.001, previous.gain.gain.value), now);
        previous.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        try { previous.source.stop(now + 0.62); } catch (error) { /* 已结束 */ }
      }
    }
    stop() {
      this.musicRequest++;
      if (!this.musicSource || !this.ctx) return;
      const previous = this.musicSource;
      this.musicSource = null;
      const now = this.ctx.currentTime;
      previous.gain.gain.cancelScheduledValues(now);
      previous.gain.gain.setValueAtTime(Math.max(0.001, previous.gain.gain.value), now);
      previous.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      try { previous.source.stop(now + 0.2); } catch (error) { /* 已结束 */ }
    }
    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.88;
      if (!this.muted) {
        this.unlock();
        if (['intro', 'active'].includes(state.mode)) void this.playBgmPhase(this.phase);
      }
      return this.muted;
    }
  }

  const audio = new SoundEngine();
  const bullets = new Pool(160, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, owner: 'player', damage: 1, life: 0, color: '#fff', pierce: 0, homing: false, kind: 'shot' }));
  const particles = new Pool(isTouch ? 55 : 130, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', alpha: 1, gravity: 0 }));

  const state = {
    screen: 'home', mode: 'idle', w: 900, h: 900, dpr: 1, ctx: null,
    config: { name: '终焉机甲', title: '自适应战术核心', theme: 'cyber', voice: 'buddy', avatar: '' },
    fighter: 'ray', difficulty: 'easy', theme: 'cyber', avatarImage: null, sprites: {}, raf: 0, last: 0, elapsed: 0,
    countdown: 120, phase: 1, score: 0, combo: 0, comboClock: 0, shake: 0,
    hitStop: 0, fps: 60, fpsTime: 0, fpsFrames: 0, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    keys: new Set(), pointer: { active: false, x: 0, y: 0, lastX: 0, lastY: 0, type: '' },
    player: null, boss: null, hazards: [], drones: [], texts: [], bgNodes: [],
    attackClock: 0, attackIndex: 0, counterClock: 0, historyClock: 0, history: [], dashTimes: [],
    modulesUsed: [], upgradesTaken: 0, pendingUpgrade: false, introStart: 0, introTimer: 0, audioWarmTimer: 0, pausedFrom: '', gameStart: 0,
    bags: {}, fired: 0, hits: 0, damageTaken: 0, ghostUnlocked: storageGet('bossRushGhost') === '1',
    resultWon: false, rating: 'C', lastTauntAt: -99, lastCue: ''
  };

  function init() {
    ids.forEach((id) => { dom[id] = $(id); });
    if (!dom.gameCanvas) return;
    state.ctx = dom.gameCanvas.getContext('2d', { alpha: false });
    state.ctx.imageSmoothingEnabled = true;
    bindUi();
    loadSprites();
    resizeCanvas();
    loadHashConfig();
    updateUnlockUi();
    updateSoundUi();
    updateMotionUi();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (['active', 'intro'].includes(state.mode)) pauseGame(true);
        else if (audio.ctx && state.mode !== 'paused') audio.suspend();
      } else if (state.mode !== 'paused' && !audio.wasInterrupted) audio.unlock();
    });
    state.raf = requestAnimationFrame(loop);
  }

  function bindUi() {
    document.addEventListener('pointerdown', () => { if (state.mode !== 'paused') audio.unlock(); }, { passive: true });
    dom.avatarInput?.addEventListener('change', handleAvatar);
    dom.createBossButton?.addEventListener('click', createBoss);
    dom.quickPlayButton?.addEventListener('click', quickPlay);
    dom.mobileQuickPlayButton?.addEventListener('click', quickPlay);
    dom.shareLinkButton?.addEventListener('click', () => {
      if (!syncConfigFromForm(true)) return;
      const encoded = encodeConfig(state.config);
      history.replaceState(null, '', `${location.pathname}${location.search}${CONFIG_PREFIX}${encoded}`);
      shareLink(buildChallengeUrl(), `我把「${state.config.name}」改造成了Boss，来挑战！`);
    });
    dom.launchButton?.addEventListener('click', prepareGame);
    dom.backHomeButton?.addEventListener('click', () => showScreen('home'));
    dom.pauseButton?.addEventListener('click', () => pauseGame(false));
    dom.dashButton?.addEventListener('pointerdown', (event) => { event.preventDefault(); dash(); });
    dom.ultimateButton?.addEventListener('pointerdown', (event) => { event.preventDefault(); ultimate(); });
    dom.shareResultButton?.addEventListener('click', shareResult);
    dom.rematchButton?.addEventListener('click', prepareGame);
    dom.createAnotherButton?.addEventListener('click', () => showScreen('home'));
    dom.soundButton?.addEventListener('click', () => { audio.toggle(); updateSoundUi(); });
    dom.reduceMotionButton?.addEventListener('click', () => { state.reduced = !state.reduced; updateMotionUi(); });

    const uploadLabels = [dom.mobileUploadButton, dom.app?.querySelector('.boss-bay[for="avatarInput"]')].filter(Boolean);
    uploadLabels.forEach((label) => label.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      label.click();
    }));

    dom.themeGrid?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-theme]');
      if (!card || !THEMES[card.dataset.theme]) return;
      state.theme = card.dataset.theme;
      selectCard(dom.themeGrid, card, '[data-theme]');
    });
    dom.voiceGrid?.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-voice]');
      if (!chip || !BOSS_VOICES[chip.dataset.voice]) return;
      const selectedVoice = chip.dataset.voice;
      state.config.voice = selectedVoice;
      selectCard(dom.voiceGrid, chip, '[data-voice]');
      audio.unlock();
      dom.voiceGrid.querySelectorAll('[data-voice]').forEach((item) => item.classList.remove('is-loading', 'is-playing', 'is-error'));
      chip.classList.add('is-loading');
      chip.setAttribute('aria-busy', 'true');
      void audio.prepareVoice(selectedVoice);
      void audio.voice(
        selectedVoice,
        'entrance-2',
        1,
        () => {
          chip.classList.remove('is-loading');
          chip.classList.add('is-playing');
          chip.setAttribute('aria-busy', 'false');
          creatorMessage(`正在试听「${BOSS_VOICES[selectedVoice].name}」`);
        },
        () => {
          chip.classList.remove('is-loading');
          chip.classList.add('is-error');
          chip.setAttribute('aria-busy', 'false');
          creatorMessage('试听加载失败，战斗中将使用电子音兜底', true);
          if (!audio.muted) audio.radio(VOICE_LINES[selectedVoice].entrance[1]);
        },
        () => {
          chip.classList.remove('is-playing');
          if (state.config.voice === selectedVoice) creatorMessage(`已选择「${BOSS_VOICES[selectedVoice].name}」`);
        }
      ).then((result) => {
        if (result === 'skipped') {
          chip.classList.remove('is-loading');
          chip.setAttribute('aria-busy', 'false');
        }
      });
      creatorMessage(`已选择「${BOSS_VOICES[selectedVoice].name}」`);
    });
    dom.fighterGrid?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-fighter]');
      if (!card || !FIGHTERS[card.dataset.fighter]) return;
      if (card.dataset.fighter === 'ghost' && !state.ghostUnlocked) {
        toast('隐藏战机：输入经典方向指令解锁');
        return;
      }
      state.fighter = card.dataset.fighter;
      selectCard(dom.fighterGrid, card, '[data-fighter]');
    });
    dom.difficultyGrid?.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-difficulty]');
      if (!chip || !DIFFICULTIES[chip.dataset.difficulty]) return;
      state.difficulty = chip.dataset.difficulty;
      selectCard(dom.difficultyGrid, chip, '[data-difficulty]');
      const label = dom.launchButton?.querySelector('span');
      if (label) label.textContent = `${DIFFICULTIES[state.difficulty].name} · 启动战机`;
      audio.sfx('upgrade');
    });

    const canvas = dom.gameCanvas;
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    let konamiAt = 0;
    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === konami[konamiAt]) konamiAt++;
      else konamiAt = key === konami[0] ? 1 : 0;
      if (konamiAt === konami.length) { unlockGhost(); konamiAt = 0; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key) && state.screen === 'game') event.preventDefault();
      state.keys.add(key);
      if (!event.repeat && key === 'shift') dash();
      if (!event.repeat && key === ' ') ultimate();
      if (!event.repeat && key === 'escape' && state.screen === 'game') pauseGame(false);
      if (devMode && !event.repeat && key === 'u' && state.mode === 'active' && state.phase < 3) phaseChange(state.phase + 1);
    });
    document.addEventListener('keyup', (event) => state.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => {
      state.keys.clear();
      state.pointer.active = false;
    });

    let logoClicks = 0;
    let logoTimer = 0;
    dom.app?.addEventListener('click', (event) => {
      if (!event.target.closest('.brand,.brand__mark,[data-dev-logo]')) return;
      logoClicks++;
      clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { logoClicks = 0; }, 1800);
      if (logoClicks >= 7) { unlockGhost(); logoClicks = 0; }
    });
  }

  function selectCard(root, selected, selector) {
    root?.querySelectorAll(selector).forEach((card) => {
      const active = card === selected;
      card.classList.toggle('is-selected', active);
      if (card.getAttribute('role') === 'radio') card.setAttribute('aria-checked', String(active));
      else card.setAttribute('aria-pressed', String(active));
    });
  }

  function showScreen(name) {
    const map = { home: dom.homeScreen, loadout: dom.loadoutScreen, game: dom.gameScreen, result: dom.resultScreen };
    for (const [key, screen] of Object.entries(map)) {
      if (!screen) continue;
      const active = key === name;
      screen.hidden = !active;
      screen.classList.toggle('active', active);
      screen.classList.toggle('is-active', active);
      screen.setAttribute('aria-hidden', String(!active));
    }
    state.screen = name;
    if (name !== 'game' && ['active', 'intro', 'paused'].includes(state.mode)) state.mode = 'idle';
  }

  function creatorMessage(message, error = false) {
    if (dom.creatorStatus) {
      dom.creatorStatus.textContent = message;
      dom.creatorStatus.classList.toggle('error', error);
    }
    if (dom.mobileUploadStatus) {
      dom.mobileUploadStatus.textContent = message;
      dom.mobileUploadStatus.classList.toggle('error', error);
    }
  }

  function quickPlay() {
    state.config = {
      name: safeText(dom.bossNameInput?.value, '终焉机甲', 12),
      title: safeText(dom.bossTitleInput?.value, '自适应战术核心', 20),
      theme: THEMES[state.theme] ? state.theme : 'cyber',
      voice: BOSS_VOICES[state.config.voice] ? state.config.voice : 'buddy',
      avatar: state.config.avatar || ''
    };
    enterLoadout();
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const supportedExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension);
    const supportedMime = file.type.startsWith('image/') || (!file.type && supportedExtension);
    if (!supportedMime) {
      creatorMessage('这不是可识别的照片，请从照片库重新选择', true);
      event.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      creatorMessage('照片超过20MB，请选原图以外的普通版本', true);
      event.target.value = '';
      return;
    }
    creatorMessage(`已选择 ${file.name || 'iPhone 照片'}，正在本机识别人脸…`);
    dom.avatarInput.disabled = true;
    dom.mobileUploadButton?.setAttribute('aria-busy', 'true');
    let url = '';
    try {
      url = URL.createObjectURL(file);
      const image = await loadImage(url);
      if (image.naturalWidth * image.naturalHeight > 60_000_000) throw new Error('像素过大');
      const result = await processAvatar(image);
      state.config.avatar = result.src;
      state.avatarImage = await loadImage(result.src);
      showAvatarPreview(result.src);
      const uploadState = dom.avatarInput.closest('.avatar-upload-row')?.querySelector('.upload-state');
      if (uploadState) uploadState.innerHTML = 'CORE<br>LOCKED';
      navigator.vibrate?.(35);
      creatorMessage(result.faceFound
        ? '识别到人脸，已自动对准机械核心（原图不会上传）'
        : result.detectorUnavailable
          ? '识别模块未正常加载，已按画面中心构图；可以重新选择再试'
          : '没有识别到清晰正脸，已按画面中心构图；换张正脸会更准');
    } catch (error) {
      const reason = error?.message === '像素过大'
        ? '照片超过6000万像素，请关闭原始格式后重试'
        : 'Safari 无法解码这张照片，请截图后再选一次';
      creatorMessage(reason, true);
    } finally {
      if (url) URL.revokeObjectURL(url);
      dom.avatarInput.disabled = false;
      dom.mobileUploadButton?.removeAttribute('aria-busy');
      event.target.value = '';
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function loadSprites() {
    Object.entries(SPRITE_PATHS).forEach(([key, src]) => {
      loadImage(src).then((image) => { state.sprites[key] = image; }).catch(() => { /* 保留 Canvas 降级绘制 */ });
    });
  }

  function loadFaceDetector() {
    if (!faceDetectorPromise) {
      faceDetectorPromise = (async () => {
        const vision = await import(FACE_VISION_URL);
        const fileset = await vision.FilesetResolver.forVisionTasks(FACE_WASM_ROOT);
        return vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'CPU' },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.45
        });
      })();
    }
    return faceDetectorPromise;
  }

  async function findPrimaryFace(image) {
    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const detectionCanvas = document.createElement('canvas');
    detectionCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    detectionCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    detectionCanvas.getContext('2d').drawImage(image, 0, 0, detectionCanvas.width, detectionCanvas.height);
    const pendingDetector = loadFaceDetector();
    let timedOut = false;
    let timeoutId = 0;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        if (faceDetectorPromise === pendingDetector) faceDetectorPromise = null;
        reject(new Error('人脸检测加载超时'));
      }, 12000);
    });
    pendingDetector.then((lateDetector) => { if (timedOut) lateDetector.close?.(); }).catch(() => {});
    let detector;
    try {
      detector = await Promise.race([pendingDetector, timeout]);
    } catch (error) {
      if (faceDetectorPromise === pendingDetector) faceDetectorPromise = null;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    let detections = [];
    try {
      detections = detector.detect(detectionCanvas)?.detections || [];
    } finally {
      detector.close?.();
      if (faceDetectorPromise === pendingDetector) faceDetectorPromise = null;
    }
    const ranked = detections.map((detection) => {
      const box = detection.boundingBox;
      if (!box || box.width <= 0 || box.height <= 0) return null;
      return { box, area: box.width * box.height, confidence: detection.categories?.[0]?.score || 0 };
    }).filter(Boolean).sort((a, b) => b.area - a.area || b.confidence - a.confidence);
    if (!ranked.length) return null;
    const box = ranked[0].box;
    return {
      x: box.originX / scale,
      y: box.originY / scale,
      width: box.width / scale,
      height: box.height / scale
    };
  }

  async function processAvatar(image) {
    const size = 256;
    const work = document.createElement('canvas');
    work.width = work.height = size;
    const ctx = work.getContext('2d');
    let face = null;
    let detectorUnavailable = false;
    try {
      face = await findPrimaryFace(image);
    } catch (error) {
      detectorUnavailable = true;
    }
    let sw = Math.min(image.naturalWidth, image.naturalHeight);
    let sh = sw;
    let sx = (image.naturalWidth - sw) / 2;
    let sy = (image.naturalHeight - sh) / 2;
    if (face) {
      sw = Math.min(Math.max(face.width / 0.55, face.height / 0.68), image.naturalWidth, image.naturalHeight);
      sh = sw;
      const centerX = face.x + face.width / 2;
      const centerY = face.y + face.height / 2 + sw * 0.02;
      sx = clamp(centerX - sw / 2, 0, image.naturalWidth - sw);
      sy = clamp(centerY - sh / 2, 0, image.naturalHeight - sh);
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);

    const output = document.createElement('canvas');
    output.width = output.height = 192;
    const out = output.getContext('2d');
    out.save();
    out.beginPath();
    out.arc(96, 96, 94, 0, TAU);
    out.clip();
    out.filter = 'saturate(.78) contrast(1.06) brightness(.94)';
    out.drawImage(work, 0, 0, 192, 192);
    out.filter = 'none';
    out.fillStyle = 'rgba(57, 219, 222, .11)';
    out.globalCompositeOperation = 'source-atop';
    out.fillRect(0, 0, 192, 192);
    out.globalCompositeOperation = 'source-over';
    const shade = out.createRadialGradient(96, 87, 39, 96, 96, 102);
    shade.addColorStop(0.58, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,10,24,.46)');
    out.fillStyle = shade;
    out.fillRect(0, 0, 192, 192);
    out.fillStyle = 'rgba(110, 248, 255, .08)';
    for (let y = 3; y < 192; y += 5) out.fillRect(0, y, 192, 1);
    out.restore();
    out.globalCompositeOperation = 'destination-in';
    const feather = out.createRadialGradient(96, 96, 76, 96, 96, 96);
    feather.addColorStop(0, 'rgba(0,0,0,1)');
    feather.addColorStop(0.78, 'rgba(0,0,0,1)');
    feather.addColorStop(1, 'rgba(0,0,0,0)');
    out.fillStyle = feather;
    out.fillRect(0, 0, 192, 192);
    out.globalCompositeOperation = 'source-over';
    out.beginPath();
    out.arc(96, 96, 89, 0, TAU);
    out.strokeStyle = 'rgba(0, 8, 18, .78)';
    out.lineWidth = 7;
    out.stroke();
    out.beginPath();
    out.arc(96, 96, 92, Math.PI * 1.03, Math.PI * 1.48);
    out.strokeStyle = 'rgba(91, 247, 255, .68)';
    out.lineWidth = 2;
    out.stroke();
    const webp = output.toDataURL('image/webp', 0.8);
    return { src: webp.startsWith('data:image/webp') ? webp : output.toDataURL('image/png'), faceFound: Boolean(face), detectorUnavailable };
  }

  function showAvatarPreview(src) {
    if (dom.avatarPreview) {
      dom.avatarPreview.hidden = false;
      if (dom.avatarPreview.tagName === 'IMG') dom.avatarPreview.src = src;
      else dom.avatarPreview.style.backgroundImage = `url(${src})`;
      dom.avatarPreview.classList.add('has-avatar');
    }
    if (dom.avatarCanvas) {
      const ctx = dom.avatarCanvas.getContext?.('2d');
      if (ctx && state.avatarImage) {
        dom.avatarCanvas.width = dom.avatarCanvas.height = 192;
        ctx.clearRect(0, 0, 192, 192);
        ctx.drawImage(state.avatarImage, 0, 0, 192, 192);
      }
    }
  }

  function safeText(value, fallback, max) {
    const text = String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim();
    return Array.from(text).slice(0, max).join('') || fallback;
  }

  function syncConfigFromForm(requireName = true) {
    const rawName = dom.bossNameInput?.value.trim() || '';
    const length = Array.from(rawName).length;
    if (length < 2 || length > 12) {
      if (requireName) {
        creatorMessage('Boss名称需为2—12个字', true);
        dom.bossNameInput?.focus();
      }
      return false;
    }
    state.config.name = safeText(rawName, '终焉机甲', 12);
    state.config.title = safeText(dom.bossTitleInput?.value, '自适应战术核心', 20);
    state.config.theme = THEMES[state.theme] ? state.theme : 'cyber';
    state.config.voice = BOSS_VOICES[state.config.voice] ? state.config.voice : 'buddy';
    return true;
  }

  async function createBoss() {
    if (!syncConfigFromForm(true)) return;
    const encoded = encodeConfig(state.config);
    if (!encoded) {
      creatorMessage('配置生成失败，请重试', true);
      return;
    }
    history.replaceState(null, '', `${location.pathname}${location.search}${CONFIG_PREFIX}${encoded}`);
    creatorMessage('Boss已生成，可复制链接邀请朋友');
    enterLoadout();
  }

  function encodeConfig(config) {
    try {
      const clean = { v: 1, n: safeText(config.name, '终焉机甲', 12), t: safeText(config.title, '自适应战术核心', 20), m: THEMES[config.theme] ? config.theme : 'cyber', o: BOSS_VOICES[config.voice] ? config.voice : 'buddy', a: /^data:image\/(webp|png|jpeg);base64,/.test(config.avatar || '') ? config.avatar : '' };
      const bytes = new TextEncoder().encode(JSON.stringify(clean));
      let binary = '';
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (error) {
      return '';
    }
  }

  function decodeConfig(value) {
    try {
      if (!value || value.length > 60000 || !/^[\w-]+$/.test(value)) return null;
      const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || data.v !== 1) return null;
      const avatar = typeof data.a === 'string' && data.a.length < 60000 && /^data:image\/(webp|png|jpeg);base64,/.test(data.a) ? data.a : '';
      return { name: safeText(data.n, '终焉机甲', 12), title: safeText(data.t, '自适应战术核心', 20), theme: THEMES[data.m] ? data.m : 'cyber', voice: BOSS_VOICES[data.o] ? data.o : 'buddy', avatar };
    } catch (error) {
      return null;
    }
  }

  async function loadHashConfig() {
    if (!location.hash.startsWith(CONFIG_PREFIX)) return;
    const config = decodeConfig(location.hash.slice(CONFIG_PREFIX.length));
    if (!config) {
      creatorMessage('挑战链接已损坏，已进入快速创建', true);
      return;
    }
    state.config = config;
    state.theme = config.theme;
    if (config.avatar) {
      try {
        state.avatarImage = await loadImage(config.avatar);
        showAvatarPreview(config.avatar);
      } catch (error) {
        state.avatarImage = null;
      }
    }
    enterLoadout();
    toast(`朋友向你发起挑战：${config.name}`);
  }

  function enterLoadout() {
    state.theme = state.config.theme;
    state.config.voice = BOSS_VOICES[state.config.voice] ? state.config.voice : 'buddy';
    showScreen('loadout');
    if (dom.bossNameHud) dom.bossNameHud.textContent = state.config.name;
    if (dom.bossTitleHud) dom.bossTitleHud.textContent = state.config.title;
    const hudAvatar = dom.app?.querySelector('.hud-avatar');
    if (hudAvatar) hudAvatar.style.backgroundImage = state.config.avatar ? `url(${JSON.stringify(state.config.avatar)})` : '';
    const themeCard = dom.themeGrid?.querySelector(`[data-theme="${state.theme}"]`);
    if (themeCard) selectCard(dom.themeGrid, themeCard, '[data-theme]');
    const voiceChip = dom.voiceGrid?.querySelector(`[data-voice="${state.config.voice}"]`);
    if (voiceChip) selectCard(dom.voiceGrid, voiceChip, '[data-voice]');
    void audio.prepareVoice(state.config.voice);
    let fighterCard = dom.fighterGrid?.querySelector(`[data-fighter="${state.fighter}"]`);
    if (!fighterCard || (state.fighter === 'ghost' && !state.ghostUnlocked)) {
      state.fighter = 'ray';
      fighterCard = dom.fighterGrid?.querySelector('[data-fighter="ray"]');
    }
    if (fighterCard) selectCard(dom.fighterGrid, fighterCard, '[data-fighter]');
  }

  function buildChallengeUrl() {
    const encoded = encodeConfig(state.config);
    return `${location.origin}${location.pathname}${location.search}${CONFIG_PREFIX}${encoded}`;
  }

  async function shareLink(url, text) {
    try {
      if (navigator.share) await navigator.share({ title: `${state.config.name} · Boss Rush`, text, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast('挑战链接已复制'); }
      else { window.prompt('复制挑战链接', url); }
    } catch (error) {
      if (error.name !== 'AbortError') toast('分享失败，请手动复制地址栏链接');
    }
  }

  function unlockGhost() {
    if (state.ghostUnlocked) return;
    state.ghostUnlocked = true;
    storageSet('bossRushGhost', '1');
    updateUnlockUi();
    toast('开发者协议通过：幽灵战机已解锁');
    audio.sfx('upgrade');
  }

  function updateUnlockUi() {
    const ghost = dom.fighterGrid?.querySelector('[data-fighter="ghost"]');
    if (!ghost) return;
    ghost.classList.toggle('is-locked', !state.ghostUnlocked);
    ghost.disabled = !state.ghostUnlocked;
    ghost.setAttribute('aria-disabled', String(!state.ghostUnlocked));
    const lock = ghost.querySelector('[data-lock-label]');
    if (lock) lock.textContent = state.ghostUnlocked ? '已解锁' : '开发者协议';
  }

  function prepareGame() {
    audio.resetVoice();
    audio.resetMusicCache(1);
    audio.unlock();
    void audio.loadSamples(['fire', 'hit', 'hurt', 'dash', 'warning']);
    void audio.prepareVoice(state.config.voice);
    void audio.prepareBgm([1]);
    const base = FIGHTERS[state.fighter] || FIGHTERS.ray;
    const difficulty = DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy;
    const maxHp = Math.round(base.hp * difficulty.playerHp);
    state.player = {
      x: state.w * 0.5, y: state.h * 0.82, vx: 0, vy: 0, r: 18, maxHp, hp: maxHp,
      speed: base.speed, damage: base.damage, rate: base.rate, fireClock: 0, damageMul: 1, rateMul: 1,
      shieldMax: state.fighter === 'turtle' ? 42 : 0, shield: state.fighter === 'turtle' ? 42 : 0,
      shieldRegen: 0, reflect: state.fighter === 'turtle' ? 0.25 : 0, enemySlow: 1, crit: 0.08,
      pierce: state.fighter === 'ghost' ? 1 : 0, twin: false, scatter: false, drone: 0, missile: false,
      homing: state.fighter === 'ghost', dashMul: 1, dashCd: 0, dashTime: 0, invuln: 0,
      ultimate: 35, vampire: false, hitCounter: 0, color: base.color
    };
    state.boss = { x: state.w * 0.5, y: state.h * (isTouch ? 0.25 : 0.2), r: clamp(state.w * 0.075, 48, 72), maxHp: difficulty.bossHp, hp: difficulty.bossHp, angle: 0, flash: 0 };
    state.elapsed = 0;
    state.countdown = difficulty.countdown;
    state.phase = 1;
    state.score = 0;
    state.combo = 0;
    state.comboClock = 0;
    state.attackClock = 1.2 * difficulty.attackInterval;
    state.attackIndex = 0;
    state.counterClock = Number.POSITIVE_INFINITY;
    state.historyClock = 0;
    state.history = [];
    state.dashTimes = [];
    state.modulesUsed = [];
    state.upgradesTaken = 0;
    state.pendingUpgrade = false;
    state.hazards = [];
    state.drones = [];
    state.texts = [];
    state.fired = 0;
    state.hits = 0;
    state.damageTaken = 0;
    state.lastTauntAt = -99;
    state.lastCue = '';
    state.bags = {};
    bullets.clear();
    particles.clear();
    makeBackground();
    showScreen('game');
    resizeCanvas();
    updateHud();
    startIntro();
    clearTimeout(state.audioWarmTimer);
    state.audioWarmTimer = setTimeout(() => {
      if (state.screen !== 'game') return;
      void audio.loadSamples();
      void audio.prepareVoice(state.config.voice, VOICE_CUES);
      void audio.prepareBgm([2]);
    }, 2200);
  }

  function moduleAvailable(module) {
    const p = state.player;
    if (!p || state.modulesUsed.includes(module.id)) return false;
    if (module.id === 'missile' && !p.drone) return false;
    if (module.id === 'reflect' && p.shieldMax <= 0) return false;
    if (module.id === 'repair' && p.hp > p.maxHp * 0.85) return false;
    if (module.id === 'scatter' && state.fighter === 'falcon') return false;
    return true;
  }

  function pickUpgradeChoices(available) {
    const groups = [
      ['twin', 'scatter', 'rapid', 'power', 'critical', 'pierce', 'homing'],
      ['shield', 'repair', 'time', 'dash', 'vampire', 'reflect'],
      ['drone', 'missile']
    ];
    const chosen = [];
    groups.forEach((idsInGroup) => {
      const candidates = available.filter((module) => idsInGroup.includes(module.id) && !chosen.includes(module));
      if (candidates.length) chosen.push(candidates[Math.floor(Math.random() * candidates.length)]);
    });
    shuffle(available).forEach((module) => {
      if (chosen.length < 3 && !chosen.includes(module)) chosen.push(module);
    });
    return chosen.slice(0, 3);
  }

  function showUpgrade() {
    if (!dom.upgradeScreen || !dom.upgradeChoices) {
      state.mode = 'active';
      return;
    }
    state.mode = 'upgrade';
    state.pendingUpgrade = false;
    if (dom.upgradeTitle) dom.upgradeTitle.textContent = '拆一件 Boss 零件，装到自己身上。';
    if (dom.upgradeSubtitle) dom.upgradeSubtitle.textContent = `第 ${state.phase - 1} 层装甲已破裂，三选一。`;
    dom.upgradeScreen.hidden = false;
    dom.upgradeScreen.classList.add('active', 'is-active');
    dom.upgradeChoices.textContent = '';
    const available = MODULES.filter(moduleAvailable);
    pickUpgradeChoices(available).forEach((module) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-card';
      button.dataset.module = module.id;
      const icon = document.createElement('span');
      icon.className = 'upgrade-icon'; icon.textContent = module.icon;
      const name = document.createElement('strong'); name.textContent = module.name;
      const desc = document.createElement('small'); desc.textContent = module.desc;
      button.append(icon, name, desc);
      button.addEventListener('click', () => chooseUpgrade(module), { once: true });
      dom.upgradeChoices.appendChild(button);
    });
  }

  function chooseUpgrade(module) {
    if (state.mode !== 'upgrade') return;
    module.apply(state.player);
    state.modulesUsed.push(module.id);
    state.upgradesTaken++;
    dom.upgradeScreen.hidden = true;
    dom.upgradeScreen.classList.remove('active', 'is-active');
    audio.sfx('upgrade');
    toast(`模块装载：${module.name}`);
    state.mode = 'active';
  }

  function startIntro() {
    clearTimeout(state.introTimer);
    state.pendingUpgrade = false;
    state.pausedFrom = '';
    state.mode = 'intro';
    state.introStart = performance.now();
    state.last = performance.now();
    if (dom.introOverlay) {
      dom.introOverlay.hidden = false;
      dom.introOverlay.classList.add('active', 'is-active');
      const title = dom.introOverlay.querySelector('[data-intro-title]');
      if (title) title.textContent = state.config.name;
    }
    audio.startBgm(1);
    taunt('entrance');
    state.shake = state.reduced ? 0 : 16;
    state.introTimer = setTimeout(finishIntro, 1800);
  }

  function finishIntro() {
    state.introTimer = 0;
    if (state.mode !== 'intro') return;
    if (dom.introOverlay) { dom.introOverlay.hidden = true; dom.introOverlay.classList.remove('active', 'is-active'); }
    state.mode = 'active';
    state.gameStart = performance.now();
    state.last = performance.now();
  }

  function resizeCanvas() {
    if (!dom.gameCanvas) return;
    const rect = dom.gameCanvas.getBoundingClientRect();
    state.w = Math.max(320, rect.width || innerWidth);
    state.h = Math.max(480, rect.height || innerHeight);
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    dom.gameCanvas.width = Math.round(state.w * state.dpr);
    dom.gameCanvas.height = Math.round(state.h * state.dpr);
    state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    makeBackground();
    if (state.player) { state.player.x = clamp(state.player.x, 24, state.w - 24); state.player.y = clamp(state.player.y, state.h * 0.32, state.h - 28); }
    if (state.boss) { state.boss.x = state.w * 0.5; state.boss.y = state.h * (isTouch ? 0.25 : 0.2); }
  }

  function pointerDown(event) {
    if (state.screen !== 'game') return;
    const point = canvasPoint(event);
    state.pointer = { active: true, x: point.x, y: point.y, lastX: point.x, lastY: point.y, type: event.pointerType };
    dom.gameCanvas.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (!state.player || state.screen !== 'game') return;
    const point = canvasPoint(event);
    if (event.pointerType === 'mouse' && !state.pointer.active) {
      state.pointer.x = point.x; state.pointer.y = point.y; state.pointer.type = 'mouse';
      return;
    }
    if (!state.pointer.active) return;
    if (isTouch || event.pointerType !== 'mouse') {
      const dx = point.x - state.pointer.lastX;
      const dy = point.y - state.pointer.lastY;
      state.player.x = clamp(state.player.x + dx, 24, state.w - 24);
      state.player.y = clamp(state.player.y + dy, state.h * 0.32, state.h - 28);
    }
    state.pointer.x = point.x; state.pointer.y = point.y; state.pointer.lastX = point.x; state.pointer.lastY = point.y;
  }
  function pointerUp(event) {
    state.pointer.active = false;
    dom.gameCanvas.releasePointerCapture?.(event.pointerId);
  }
  function canvasPoint(event) {
    const rect = dom.gameCanvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function dash() {
    const p = state.player;
    if (!p || state.mode !== 'active' || p.dashCd > 0) return;
    let dx = 0, dy = 0;
    if (state.keys.has('a') || state.keys.has('arrowleft')) dx--;
    if (state.keys.has('d') || state.keys.has('arrowright')) dx++;
    if (state.keys.has('w') || state.keys.has('arrowup')) dy--;
    if (state.keys.has('s') || state.keys.has('arrowdown')) dy++;
    if (state.pointer.active) { dx = state.pointer.x - p.x; dy = state.pointer.y - p.y; }
    if (!dx && !dy) dy = -1;
    const length = Math.hypot(dx, dy) || 1;
    p.vx = dx / length * 1050;
    p.vy = dy / length * 1050;
    p.dashTime = 0.18;
    p.invuln = 0.32;
    p.dashCd = 2.6 * p.dashMul;
    state.dashTimes.push(state.elapsed);
    burst(p.x, p.y, p.color, 14, 330);
    audio.sfx('dash');
  }

  function ultimate() {
    const p = state.player;
    if (!p || state.mode !== 'active' || p.ultimate < 100) return;
    p.ultimate = 0;
    state.hitStop = state.reduced ? 0 : 0.12;
    state.shake = state.reduced ? 0 : 18;
    bullets.each((bullet) => {
      if (bullet.owner === 'enemy') {
        bullet.owner = 'player';
        bullet.damage = p.damage * 1.5;
        bullet.vy = -Math.abs(bullet.vy) - 120;
        bullet.vx *= -0.35;
        bullet.color = p.color;
      }
    });
    damageBoss(260, true, state.boss.x, state.boss.y);
    ringBurst(p.x, p.y, p.color, 28);
    audio.sfx('boom');
  }

  function pauseGame(fromVisibility) {
    if (state.mode === 'active' || state.mode === 'intro') {
      state.pausedFrom = state.mode;
      if (state.mode === 'intro') clearTimeout(state.introTimer);
      state.mode = 'paused';
      audio.suspend();
      toast(fromVisibility ? '切到后台，战斗已自动暂停' : '战斗暂停');
      if (dom.pauseButton) dom.pauseButton.textContent = '继续';
    } else if (state.mode === 'paused' && !fromVisibility) {
      if (state.pausedFrom === 'intro') {
        startIntro();
        if (dom.pauseButton) dom.pauseButton.textContent = '暂停';
        return;
      }
      state.mode = 'active';
      state.pausedFrom = '';
      state.last = performance.now();
      audio.unlock();
      if (dom.pauseButton) dom.pauseButton.textContent = '暂停';
      toast('战斗继续');
    }
  }

  function loop(now) {
    const rawDt = Math.min(0.033, Math.max(0, (now - (state.last || now)) / 1000));
    state.last = now;
    if (state.screen === 'game') {
      if (state.hitStop > 0) state.hitStop -= rawDt;
      else if (state.mode === 'active') update(rawDt);
      render(now);
      measureFps(now);
    }
    state.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    const p = state.player;
    const boss = state.boss;
    if (!p || !boss) return;
    state.elapsed += dt;
    state.countdown = Math.max(0, (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).countdown - state.elapsed);
    if (state.countdown <= 0) return endGame(false, '时间耗尽');
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    boss.flash = Math.max(0, boss.flash - dt);
    state.shake = Math.max(0, state.shake - dt * 30);
    if (p.shieldMax > 0 && p.shield < p.shieldMax) {
      p.shieldRegen += dt;
      if (p.shieldRegen > 4) p.shield = Math.min(p.shieldMax, p.shield + dt * 2.5);
    }

    updatePlayer(dt);
    autoFire(dt);
    updateDrones(dt);
    updateBoss(dt);
    updateHazards(dt);
    updateBullets(dt);
    updateParticles(dt);
    updateTexts(dt);
    recordHistory(dt);
    if (state.comboClock > 0) state.comboClock -= dt;
    else state.combo = 0;
    updateHud();
  }

  function updatePlayer(dt) {
    const p = state.player;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else {
      let dx = 0, dy = 0;
      if (state.keys.has('a') || state.keys.has('arrowleft')) dx--;
      if (state.keys.has('d') || state.keys.has('arrowright')) dx++;
      if (state.keys.has('w') || state.keys.has('arrowup')) dy--;
      if (state.keys.has('s') || state.keys.has('arrowdown')) dy++;
      const length = Math.hypot(dx, dy) || 1;
      if (dx || dy) { p.x += dx / length * p.speed * dt; p.y += dy / length * p.speed * dt; }
      if (state.pointer.type === 'mouse' && !isTouch && state.pointer.x && state.pointer.y && state.pointer.active) {
        p.x = lerp(p.x, state.pointer.x, Math.min(1, dt * 12));
        p.y = lerp(p.y, state.pointer.y, Math.min(1, dt * 12));
      }
    }
    p.x = clamp(p.x, 22, state.w - 22);
    p.y = clamp(p.y, state.h * 0.32, state.h - 26);
  }

  function autoFire(dt) {
    const p = state.player;
    p.fireClock -= dt;
    if (p.fireClock > 0) return;
    p.fireClock = p.rate * p.rateMul;
    const baseDamage = p.damage * p.damageMul;
    if (state.fighter === 'falcon') {
      [-0.22, 0, 0.22].forEach((angle) => spawnPlayerShot(p.x, p.y - 18, angle, 650, baseDamage, 5));
    } else if (state.fighter === 'ray') {
      spawnPlayerShot(p.x, p.y - 20, 0, 920, baseDamage, 3, 'laser');
    } else {
      spawnPlayerShot(p.x, p.y - 18, 0, state.fighter === 'ghost' ? 930 : 700, baseDamage, state.fighter === 'turtle' ? 6 : 4);
    }
    if (p.twin) {
      spawnPlayerShot(p.x - 11, p.y - 12, 0, 790, baseDamage * 0.15, 3);
      spawnPlayerShot(p.x + 11, p.y - 12, 0, 790, baseDamage * 0.15, 3);
    }
    if (p.scatter && state.fighter !== 'falcon') {
      spawnPlayerShot(p.x, p.y - 15, -0.18, 720, baseDamage * 0.15, 3);
      spawnPlayerShot(p.x, p.y - 15, 0.18, 720, baseDamage * 0.15, 3);
    }
    audio.sfx('fire');
  }

  function spawnPlayerShot(x, y, angle, speed, damage, radius, kind = 'shot') {
    const bullet = bullets.get();
    if (!bullet) return;
    Object.assign(bullet, { x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, r: radius, owner: 'player', damage, life: 2.2, color: state.player.color, pierce: state.player.pierce, homing: state.player.homing, kind });
    state.fired++;
  }

  function spawnEnemyShot(x, y, angle, speed, damage = 11, radius = 6, color = '#ff4c8b') {
    const bullet = bullets.get();
    if (!bullet) return null;
    const difficulty = DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy;
    const adjustedSpeed = speed * difficulty.enemySpeed;
    Object.assign(bullet, { x, y, vx: Math.cos(angle) * adjustedSpeed, vy: Math.sin(angle) * adjustedSpeed, r: radius, owner: 'enemy', damage, life: 7, color, pierce: 0, homing: false, kind: 'enemy' });
    return bullet;
  }

  function updateDrones(dt) {
    const p = state.player;
    while (state.drones.length < p.drone) state.drones.push({ angle: state.drones.length * Math.PI, fire: rand(0, 0.4) });
    state.drones.forEach((drone, index) => {
      drone.angle += dt * (1.8 + index * 0.1);
      drone.x = p.x + Math.cos(drone.angle) * 34;
      drone.y = p.y + Math.sin(drone.angle) * 18;
      drone.fire -= dt;
      if (drone.fire <= 0) {
        drone.fire = p.missile ? 0.7 : 0.95;
        const bullet = bullets.get();
        if (bullet) {
          Object.assign(bullet, { active: true, x: drone.x, y: drone.y, vx: 0, vy: p.missile ? -480 : -650, r: p.missile ? 6 : 3, owner: 'player', damage: p.damage * (p.missile ? 1.35 : 0.62), life: 3, color: p.color, pierce: 0, homing: p.missile, kind: p.missile ? 'missile' : 'shot' });
          state.fired++;
        }
      }
    });
  }

  function updateBoss(dt) {
    const boss = state.boss;
    const difficulty = DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy;
    boss.angle += dt * (0.7 + state.phase * 0.28);
    boss.x = state.w * 0.5 + Math.sin(state.elapsed * (0.52 + state.phase * 0.08)) * state.w * 0.18;
    boss.y = state.h * (isTouch ? 0.25 : 0.19) + Math.sin(state.elapsed * 0.9) * 12;
    state.attackClock -= dt;
    if (state.phase >= 2) state.counterClock -= dt;
    if (state.attackClock <= 0) {
      performPattern();
      state.attackClock = (Math.max(0.85, 2.25 - state.phase * 0.32) + rand(0.1, 0.45)) * difficulty.attackInterval;
    }
    if (state.counterClock <= 0) {
      counterPlayer();
      state.counterClock = difficulty.repeatCounter;
    }
  }

  function performPattern() {
    const sets = state.phase === 1 ? ['fan', 'spiral', 'lock'] : state.phase === 2 ? ['fan', 'spiral', 'lock', 'sweep', 'drone'] : ['spiral', 'sweep', 'feint', 'lock', 'drone'];
    const pattern = sets[state.attackIndex++ % sets.length];
    if (pattern === 'fan') fanAttack();
    else if (pattern === 'spiral') spiralAttack();
    else if (pattern === 'lock') lockedAttack();
    else if (pattern === 'sweep') sweepAttack(false);
    else if (pattern === 'feint') feintAttack();
    else summonDrones();
  }

  function fanAttack() {
    const boss = state.boss;
    const aim = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
    const count = 5 + state.phase * 2;
    for (let i = 0; i < count; i++) {
      const spread = (i / (count - 1) - 0.5) * (0.85 + state.phase * 0.08);
      spawnEnemyShot(boss.x, boss.y + boss.r * 0.5, aim + spread, (205 + state.phase * 28) * state.player.enemySlow, 9 + state.phase * 2, 5);
    }
  }

  function spiralAttack() {
    const boss = state.boss;
    const waves = 4 + state.phase;
    const interval = (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).attackInterval;
    for (let wave = 0; wave < waves; wave++) {
      setTimeout(() => {
        if (state.mode !== 'active') return;
        for (let arm = 0; arm < 3; arm++) {
          const angle = boss.angle + arm * TAU / 3 + wave * 0.22;
          spawnEnemyShot(boss.x, boss.y, angle, (165 + state.phase * 24) * state.player.enemySlow, 9 + state.phase, 5, '#ff72d2');
        }
      }, wave * 120 * interval);
    }
  }

  function lockedAttack(targetX = state.player.x, targetY = state.player.y, label = '预判锁定') {
    const warning = 0.78 * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).warning;
    state.hazards.push({ type: 'lock', x: targetX, y: targetY, warn: warning, active: 0.24, damage: 20, label, triggered: false });
    audio.sfx('warning');
  }

  function sweepAttack(reverse) {
    const from = reverse ? state.w + 40 : -40;
    const to = reverse ? -40 : state.w + 40;
    state.hazards.push({ type: 'sweep', x: from, to, warn: 0.95 * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).warning, active: 0.42, damage: 24, width: 30, triggered: false });
    audio.sfx('warning');
  }

  function feintAttack() {
    const reverse = Math.random() > 0.5;
    state.hazards.push({ type: 'feint', x: reverse ? state.w : 0, warn: 0.68 * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).warning, active: 0.1, damage: 0, reverse, triggered: false });
    audio.sfx('warning');
  }

  function summonDrones() {
    const count = 2 + state.phase;
    const interval = (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).attackInterval;
    for (let i = 0; i < count; i++) {
      state.hazards.push({ type: 'drone', x: state.w * (i + 1) / (count + 1), y: state.h * 0.28, warn: 0.7 * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).warning, active: 5.5, damage: 8, fire: rand(0.4, 1) * interval, hp: 3, triggered: false });
    }
    audio.sfx('warning');
  }

  function counterPlayer() {
    if (!state.history.length) return;
    const recent = state.history.filter((sample) => state.elapsed - sample.t <= 8);
    if (!recent.length) return;
    const avgX = recent.reduce((sum, sample) => sum + sample.x, 0) / recent.length / state.w;
    const avgY = recent.reduce((sum, sample) => sum + sample.y, 0) / recent.length / state.h;
    const dashCount = state.dashTimes.filter((time) => state.elapsed - time <= 8).length;
    let explanation = '';
    let cue = 'counter-center';
    if (dashCount >= 3) {
      explanation = '你连续冲刺的落点，我记住了。';
      cue = 'counter-dash';
      const latest = recent[recent.length - 1];
      const older = recent[Math.max(0, recent.length - 5)];
      lockedAttack(clamp(latest.x + (latest.x - older.x) * 1.8, 30, state.w - 30), clamp(latest.y + (latest.y - older.y) * 1.8, state.h * 0.35, state.h - 30), '冲刺落点');
    } else if (avgY > 0.76) {
      explanation = '一直缩在底线？那里现在归我了。';
      cue = 'counter-bottom';
      state.hazards.push({ type: 'bottom', y: state.h * 0.78, warn: 0.88 * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).warning, active: 0.44, damage: 22, triggered: false });
      audio.sfx('warning');
    } else if (avgX < 0.38 || avgX > 0.62) {
      const right = avgX > 0.62;
      explanation = `你总爱往${right ? '右' : '左'}躲，侧翼已封锁。`;
      cue = right ? 'counter-right' : 'counter-left';
      sweepAttack(right);
    } else {
      explanation = '中路盘旋太久，扇区开始收缩。';
      fanAttack();
    }
    explanation = COUNTER_LINES[state.config.voice]?.[cue] || explanation;
    sayLine(explanation, cue, 2);
  }

  function recordHistory(dt) {
    state.historyClock -= dt;
    if (state.historyClock > 0) return;
    state.historyClock = 0.1;
    state.history.push({ t: state.elapsed, x: state.player.x, y: state.player.y });
    while (state.history.length && state.elapsed - state.history[0].t > 8) state.history.shift();
    state.dashTimes = state.dashTimes.filter((time) => state.elapsed - time <= 8);
  }

  function updateHazards(dt) {
    const p = state.player;
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const hazard = state.hazards[i];
      if (hazard.warn > 0) {
        hazard.warn -= dt;
        if (hazard.warn <= 0 && hazard.type === 'feint') {
          setTimeout(() => { if (state.mode === 'active') sweepAttack(!hazard.reverse); }, 160);
          state.hazards.splice(i, 1);
        }
        continue;
      }
      hazard.active -= dt;
      if (hazard.type === 'lock' && !hazard.triggered) {
        hazard.triggered = true;
        ringBurst(hazard.x, hazard.y, '#ff3b69', 18);
        if (Math.hypot(p.x - hazard.x, p.y - hazard.y) < 54 + p.r) damagePlayer(hazard.damage);
      } else if (hazard.type === 'sweep') {
        const progress = 1 - clamp(hazard.active / 0.42, 0, 1);
        hazard.currentX = lerp(hazard.x, hazard.to, progress);
        if (Math.abs(p.x - hazard.currentX) < hazard.width + p.r) damagePlayer(hazard.damage);
      } else if (hazard.type === 'bottom') {
        if (p.y > hazard.y - p.r) damagePlayer(hazard.damage);
      } else if (hazard.type === 'drone') {
        hazard.fire -= dt;
        hazard.y += Math.sin(state.elapsed * 3 + hazard.x) * dt * 8;
        if (hazard.fire <= 0) {
          hazard.fire = rand(0.9, 1.4) * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).attackInterval;
          const angle = Math.atan2(p.y - hazard.y, p.x - hazard.x);
          spawnEnemyShot(hazard.x, hazard.y, angle, 250 * p.enemySlow, hazard.damage, 5, '#ffc456');
        }
      }
      if (hazard.active <= 0) state.hazards.splice(i, 1);
    }
  }

  function updateBullets(dt) {
    const p = state.player;
    const boss = state.boss;
    bullets.each((bullet) => {
      bullet.life -= dt;
      if (bullet.life <= 0) { bullet.active = false; return; }
      if (bullet.homing && bullet.owner === 'player') {
        const speed = Math.hypot(bullet.vx, bullet.vy);
        const target = Math.atan2(boss.y - bullet.y, boss.x - bullet.x);
        const current = Math.atan2(bullet.vy, bullet.vx);
        const angle = current + angleDelta(current, target) * Math.min(1, dt * 4.5);
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -60 || bullet.x > state.w + 60 || bullet.y < -80 || bullet.y > state.h + 80) { bullet.active = false; return; }
      if (bullet.owner === 'player' && circleHit(bullet.x, bullet.y, bullet.r, boss.x, boss.y, boss.r * 0.74)) {
        const critical = Math.random() < p.crit;
        damageBoss(bullet.damage * (critical ? 2 : 1), critical, bullet.x, bullet.y);
        state.hits++;
        p.hitCounter++;
        if (p.vampire && p.hitCounter % 30 === 0) p.hp = Math.min(p.maxHp, p.hp + 2);
        if (bullet.pierce > 0) bullet.pierce--;
        else bullet.active = false;
      } else if (bullet.owner === 'enemy' && circleHit(bullet.x, bullet.y, bullet.r, p.x, p.y, p.r)) {
        bullet.active = false;
        damagePlayer(bullet.damage);
      }
    });
  }

  function angleDelta(from, to) {
    let delta = (to - from + Math.PI) % TAU - Math.PI;
    if (delta < -Math.PI) delta += TAU;
    return delta;
  }

  function circleHit(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy <= (r1 + r2) * (r1 + r2);
  }

  function damageBoss(amount, critical, x, y) {
    const boss = state.boss;
    if (!boss || state.mode !== 'active') return;
    boss.hp = Math.max(0, boss.hp - amount);
    boss.flash = 0.055;
    state.combo++;
    state.comboClock = 1.8;
    state.score += Math.round(amount * (1 + Math.min(2, state.combo / 30)) * (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).score);
    state.player.ultimate = Math.min(100, state.player.ultimate + (critical ? 2.8 : 0.72));
    floatingText(x, y, critical ? `暴击 ${Math.round(amount)}` : `${Math.round(amount)}`, critical ? '#fff06b' : '#8ef9ff', critical ? 18 : 13);
    spark(x, y, critical ? '#fff06b' : state.player.color, critical ? 7 : 2);
    if (critical) {
      state.hitStop = state.reduced ? 0 : 0.035;
      state.shake = state.reduced ? 0 : 3;
      audio.sfx('crit');
      if (Math.random() < 0.08) taunt('critical');
    } else audio.sfx('hit');
    const ratio = boss.hp / boss.maxHp;
    if (state.phase === 1 && ratio <= 0.65) phaseChange(2);
    else if (state.phase === 2 && ratio <= 0.30) phaseChange(3);
    if (boss.hp <= 0) endGame(true, '核心击破');
  }

  function phaseChange(phase) {
    state.phase = phase;
    if (phase === 2) state.counterClock = (DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy).firstCounter;
    audio.setPhase(phase);
    if (phase === 2) void audio.prepareBgm([3]);
    updateHud();
    state.shake = state.reduced ? 0 : 20;
    ringBurst(state.boss.x, state.boss.y, phase === 2 ? '#ffb347' : '#ff315f', 32);
    for (let i = 0; i < 4 + phase; i++) spark(state.boss.x + rand(-30, 30), state.boss.y + rand(-25, 25), '#ffad52', 5);
    taunt(phase === 2 ? 'phase2' : 'phase3');
    showUpgrade();
  }

  function damagePlayer(amount) {
    const p = state.player;
    if (!p || p.invuln > 0 || state.mode !== 'active') return;
    const difficulty = DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy;
    const actualDamage = amount * difficulty.enemyDamage;
    let remaining = actualDamage;
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, remaining);
      p.shield -= absorbed;
      remaining -= absorbed;
      if (p.reflect) damageBoss(absorbed * p.reflect, false, state.boss.x, state.boss.y);
    }
    if (remaining > 0) p.hp = Math.max(0, p.hp - remaining);
    p.shieldRegen = 0;
    p.invuln = difficulty.invuln;
    state.damageTaken += actualDamage;
    state.combo = 0;
    state.shake = state.reduced ? 0 : 13;
    state.hitStop = state.reduced ? 0 : 0.06;
    floatingText(p.x, p.y - 20, `受击 -${Math.round(actualDamage)}`, '#ff668d', 16);
    burst(p.x, p.y, '#ff496f', 12, 250);
    audio.sfx('hurt');
    if (Math.random() < 0.28) taunt('playerHit');
    if (p.hp <= 0) endGame(false, '战机失去响应');
  }

  function endGame(won, reason) {
    if (state.mode === 'ended') return;
    clearTimeout(state.introTimer);
    state.introTimer = 0;
    state.mode = 'ended';
    state.resultWon = won;
    audio.stop();
    if (won) { audio.sfx('win'); taunt('victory'); }
    else { audio.sfx('boom'); taunt('defeat'); }
    state.shake = state.reduced ? 0 : 24;
    burst(won ? state.boss.x : state.player.x, won ? state.boss.y : state.player.y, won ? '#ffb74d' : '#ff426c', state.reduced ? 16 : 42, 420);
    setTimeout(() => showResult(won, reason), state.reduced ? 250 : 900);
  }

  function showResult(won, reason) {
    showScreen('result');
    const accuracy = state.fired ? Math.round(state.hits / state.fired * 100) : 0;
    const hpRatio = state.player ? state.player.hp / state.player.maxHp : 0;
    const time = formatTime(state.elapsed);
    const difficulty = DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy;
    let rating = 'C';
    if (won && hpRatio > 0.72 && state.elapsed < difficulty.sssTime) rating = 'SSS';
    else if (won && hpRatio > 0.45 && state.elapsed < difficulty.sTime) rating = 'S';
    else if (won && hpRatio > 0.2) rating = 'A';
    else if (won) rating = 'B';
    state.rating = rating;
    if (dom.resultStamp) { dom.resultStamp.textContent = won ? rating : 'RETRY'; dom.resultStamp.classList.toggle('defeat', !won); }
    if (dom.resultTitle) dom.resultTitle.textContent = won ? `${state.config.name} 已击破` : '挑战未完成';
    if (dom.resultSummary) dom.resultSummary.textContent = `${reason} · ${DIFFICULTIES[state.difficulty].name}难度 · ${FIGHTERS[state.fighter].name} · ${THEMES[state.theme].name}`;
    if (dom.resultStats) {
      dom.resultStats.textContent = '';
      [['用时', time], ['命中率', `${accuracy}%`], ['得分', String(state.score)], ['承伤', String(Math.round(state.damageTaken))]].forEach(([key, value]) => {
        const item = document.createElement('div');
        const label = document.createElement('span'); label.textContent = key;
        const data = document.createElement('strong'); data.textContent = value;
        item.append(label, data); dom.resultStats.appendChild(item);
      });
      const build = document.createElement('p');
      build.className = 'result-build';
      build.textContent = `Build：${state.modulesUsed.map((id) => MODULES.find((module) => module.id === id)?.name).filter(Boolean).join(' + ') || '标准武装'}`;
      dom.resultStats.appendChild(build);
    }
  }

  async function shareResult() {
    const accuracy = state.fired ? Math.round(state.hits / state.fired * 100) : 0;
    const text = `${state.resultWon ? '我击破了' : '我挑战了'}「${state.config.name}」！${DIFFICULTIES[state.difficulty].name}难度，得分${state.score}，命中${accuracy}%，用时${formatTime(state.elapsed)}。你敢来吗？`;
    try {
      const blob = await makeResultCard();
      const file = new File([blob], `boss-rush-${state.config.name}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${state.config.name} · Boss Rush`, text, url: buildChallengeUrl(), files: [file] });
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    shareLink(buildChallengeUrl(), text);
  }

  function makeResultCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    const theme = THEMES[state.theme] || THEMES.cyber;
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, '#090b10');
    gradient.addColorStop(0.58, theme.top);
    gradient.addColorStop(1, '#160b0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = 'rgba(246,201,69,.18)';
    ctx.lineWidth = 2;
    for (let x = -1200; x < 1200; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 1350);
      ctx.lineTo(x + 780, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#f6c945';
    ctx.fillRect(54, 54, 972, 12);
    ctx.fillStyle = '#e8e1d0';
    ctx.font = '900 76px system-ui';
    ctx.fillText('损友 BOSS RUSH', 72, 158);
    ctx.fillStyle = '#4dd6c7';
    ctx.font = '700 28px ui-monospace, monospace';
    ctx.fillText('FRIENDSHIP DAMAGE REPORT', 76, 206);

    const cx = 540, cy = 520, radius = 210;
    ctx.save();
    ctx.shadowBlur = 56;
    ctx.shadowColor = theme.glow;
    ctx.strokeStyle = theme.glow;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 24, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 10; i++) {
      const angle = i * TAU / 10;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * (radius + 55), cy + Math.sin(angle) * (radius + 55));
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 ? '#f6c945' : '#ff4d3d';
      ctx.fillRect(-24, -8, 48, 16);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.clip();
    if (state.avatarImage) ctx.drawImage(state.avatarImage, cx - radius, cy - radius, radius * 2, radius * 2);
    else {
      const core = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      core.addColorStop(0, '#fff');
      core.addColorStop(0.18, theme.glow);
      core.addColorStop(0.55, '#172237');
      core.addColorStop(1, '#050810');
      ctx.fillStyle = core;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e1d0';
    ctx.font = '900 82px system-ui';
    ctx.fillText(state.config.name, 540, 830);
    ctx.fillStyle = '#a9a59d';
    ctx.font = '600 30px system-ui';
    ctx.fillText(state.config.title, 540, 882);
    ctx.fillStyle = '#f6c945';
    ctx.font = '800 26px system-ui';
    ctx.fillText(`${DIFFICULTIES[state.difficulty].name}难度 · 得分倍率 ×${DIFFICULTIES[state.difficulty].score}`, 540, 928);
    ctx.fillStyle = state.resultWon ? '#4dd6c7' : '#ff4d3d';
    ctx.font = '900 122px ui-monospace, monospace';
    ctx.fillText(state.resultWon ? state.rating : 'RETRY', 540, 1040);

    const accuracy = state.fired ? Math.round(state.hits / state.fired * 100) : 0;
    const stats = [['得分', String(state.score)], ['命中', `${accuracy}%`], ['用时', formatTime(state.elapsed)]];
    ctx.textAlign = 'left';
    stats.forEach(([label, value], index) => {
      const x = 78 + index * 330;
      ctx.fillStyle = '#85827c';
      ctx.font = '700 24px system-ui';
      ctx.fillText(label, x, 1152);
      ctx.fillStyle = '#e8e1d0';
      ctx.font = '900 42px ui-monospace, monospace';
      ctx.fillText(value, x, 1208);
    });
    ctx.fillStyle = '#f6c945';
    ctx.fillRect(54, 1280, 972, 12);
    ctx.fillStyle = '#e8e1d0';
    ctx.font = '700 26px system-ui';
    ctx.fillText('把你做成 Boss，才是真友情。', 72, 1260);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('战报生成失败')), 'image/png'));
  }

  function updateHud() {
    if (!state.player || !state.boss) return;
    setBar(dom.bossHpFill, state.boss.hp / state.boss.maxHp);
    setBar(dom.playerHpFill, state.player.hp / state.player.maxHp);
    setBar(dom.shieldFill, state.player.shieldMax ? state.player.shield / state.player.shieldMax : state.player.ultimate / 100);
    if (dom.comboValue) dom.comboValue.textContent = `×${state.combo}`;
    if (dom.scoreValue) dom.scoreValue.textContent = String(state.score).padStart(6, '0');
    if (dom.timerValue) dom.timerValue.textContent = formatTime(state.countdown);
    if (dom.phaseLabel) dom.phaseLabel.textContent = `PHASE 0${state.phase}`;
    if (dom.dashButton) {
      const ready = state.player.dashCd <= 0;
      dom.dashButton.classList.toggle('ready', ready);
      dom.dashButton.dataset.cooldown = ready ? 'READY' : state.player.dashCd.toFixed(1);
    }
    if (dom.ultimateButton) {
      dom.ultimateButton.classList.toggle('ready', state.player.ultimate >= 100);
      dom.ultimateButton.style.setProperty('--charge', `${state.player.ultimate}%`);
    }
  }

  function setBar(element, ratio) {
    if (!element) return;
    const value = `${clamp(ratio, 0, 1) * 100}%`;
    element.style.width = value;
    element.style.setProperty('--value', value);
    element.setAttribute('aria-valuenow', String(Math.round(clamp(ratio, 0, 1) * 100)));
  }

  function render(now) {
    const ctx = state.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    drawBackground(ctx, now);
    const shakeX = state.reduced ? 0 : rand(-state.shake, state.shake);
    const shakeY = state.reduced ? 0 : rand(-state.shake, state.shake);
    ctx.translate(shakeX, shakeY);
    drawHazards(ctx, now);
    drawBoss(ctx, now);
    drawBullets(ctx);
    drawDrones(ctx);
    drawPlayer(ctx, now);
    drawParticles(ctx);
    drawTexts(ctx);
    ctx.restore();
    if (state.mode === 'paused') drawPause(ctx);
    if (devMode) drawFps(ctx);
  }

  function makeBackground() {
    state.bgNodes = [];
    const count = isTouch ? 34 : 62;
    for (let i = 0; i < count; i++) state.bgNodes.push({ x: Math.random(), y: Math.random(), size: rand(0.6, 3.4), speed: rand(0.3, 1.25), phase: rand(0, TAU) });
  }

  function drawBackground(ctx, now) {
    const theme = THEMES[state.theme] || THEMES.cyber;
    const t = now / 1000;
    const gradient = ctx.createLinearGradient(0, 0, 0, state.h);
    gradient.addColorStop(0, theme.top);
    gradient.addColorStop(1, theme.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.w, state.h);
    const halo = ctx.createRadialGradient(state.w * 0.5, state.h * 0.22, 0, state.w * 0.5, state.h * 0.22, state.w * 0.58);
    halo.addColorStop(0, hexAlpha(theme.glow, 0.18));
    halo.addColorStop(1, hexAlpha(theme.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, state.w, state.h * 0.8);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = theme.glow;
    ctx.lineWidth = 1;
    const horizon = state.h * 0.32;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(state.w * 0.5, horizon); ctx.lineTo(state.w * 0.5 + i * state.w * 0.18, state.h); ctx.stroke();
    }
    for (let y = horizon; y < state.h; y += Math.max(25, (y - horizon) * 0.16)) {
      ctx.globalAlpha = clamp((y - horizon) / state.h * 0.35, 0.04, 0.18);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(state.w, y); ctx.stroke();
    }
    ctx.restore();

    drawThemeDetails(ctx, theme, t);
  }

  function drawThemeDetails(ctx, theme, t) {
    ctx.save();
    for (const node of state.bgNodes) {
      let x = node.x * state.w;
      let y = node.y * state.h;
      const weather = theme.weather;
      if (weather === 'rain') { y = ((node.y + t * node.speed * 0.18) % 1) * state.h; x += Math.sin(t + node.phase) * 8; ctx.strokeStyle = hexAlpha(theme.glow, 0.28); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 22); ctx.stroke(); continue; }
      if (weather === 'sand' || weather === 'ash' || weather === 'ember') {
        x = ((node.x + t * node.speed * (weather === 'sand' ? 0.09 : 0.025)) % 1) * state.w;
        y = ((node.y + t * node.speed * (weather === 'ember' ? -0.07 : 0.035) + 1) % 1) * state.h;
      } else if (weather === 'bubble') y = ((node.y - t * node.speed * 0.045 + 1) % 1) * state.h;
      else if (weather === 'petal' || weather === 'leaf') { y = ((node.y + t * node.speed * 0.035) % 1) * state.h; x += Math.sin(t * node.speed + node.phase) * 28; }
      else if (weather === 'debris') { x += Math.sin(t * 0.25 + node.phase) * 18; y += Math.cos(t * 0.3 + node.phase) * 12; }
      else y = ((node.y + t * node.speed * 0.01) % 1) * state.h;
      ctx.globalAlpha = 0.2 + 0.35 * (0.5 + Math.sin(t * 2 + node.phase) * 0.5);
      ctx.fillStyle = weather === 'ember' ? '#ff7a2f' : weather === 'ash' ? '#beb4aa' : weather === 'petal' ? '#ff86d2' : theme.accent;
      ctx.beginPath();
      if (weather === 'bubble') { ctx.strokeStyle = theme.glow; ctx.arc(x, y, node.size * 1.5, 0, TAU); ctx.stroke(); }
      else if (weather === 'petal' || weather === 'leaf') { ctx.ellipse(x, y, node.size * 1.8, node.size * 0.7, t + node.phase, 0, TAU); ctx.fill(); }
      else { ctx.arc(x, y, node.size, 0, TAU); ctx.fill(); }
    }
    if (theme.weather === 'factory') {}
    if (theme.weather === 'bubble') {
      ctx.globalAlpha = 0.1; ctx.fillStyle = theme.glow;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(state.w * (0.12 + i * 0.26), state.h * 0.68, 50, 160, 0, 0, TAU); ctx.fill(); }
    }
    if (theme.weather === 'star') {
      ctx.globalAlpha = 0.15; ctx.strokeStyle = theme.accent; ctx.lineWidth = 18;
      ctx.beginPath(); ctx.arc(state.w * 0.5, state.h * 0.25, state.w * 0.42, t * 0.05, t * 0.05 + Math.PI * 1.3); ctx.stroke();
    }
    ctx.restore();
  }

  function hexAlpha(hex, alpha) {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
    const number = parseInt(full, 16);
    return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${alpha})`;
  }

  function drawBoss(ctx, now) {
    const boss = state.boss;
    if (!boss) return;
    let scale = 1;
    let yOffset = 0;
    if (state.mode === 'intro') {
      const progress = clamp((now - state.introStart) / 1800, 0, 1);
      scale = 0.35 + easeOutBack(progress) * 0.65;
      yOffset = lerp(-state.h * 0.35, 0, easeOutCubic(progress));
    }
    ctx.save();
    ctx.translate(boss.x, boss.y + yOffset);
    ctx.scale(scale, scale);
    ctx.rotate(state.reduced ? 0 : Math.sin(now * 0.001) * 0.018);
    const color = state.phase === 1 ? '#44ecff' : state.phase === 2 ? '#ffb347' : '#ff386c';
    const pulse = state.reduced ? 1 : 1 + Math.sin(now * 0.004) * 0.035;
    ctx.scale(pulse, pulse);
    const aura = ctx.createRadialGradient(0, 0, boss.r * 0.35, 0, 0, boss.r * 2.3);
    aura.addColorStop(0, hexAlpha(color, 0.24));
    aura.addColorStop(0.46, hexAlpha(color, 0.09));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-boss.r * 2.4, -boss.r * 2.4, boss.r * 4.8, boss.r * 4.8);
    ctx.shadowBlur = state.phase === 3 ? 42 : 28;
    ctx.shadowColor = color;
    ctx.strokeStyle = hexAlpha(color, 0.8);
    ctx.lineWidth = state.phase === 3 ? 8 : 5;
    ctx.beginPath();
    ctx.arc(0, 0, boss.r * 0.78, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, boss.r * 0.63, 0, TAU);
    ctx.clip();
    if (state.avatarImage) ctx.drawImage(state.avatarImage, -boss.r * 0.66, -boss.r * 0.66, boss.r * 1.32, boss.r * 1.32);
    else {
      const core = ctx.createRadialGradient(0, 0, 3, 0, 0, boss.r * 0.68);
      core.addColorStop(0, '#fff'); core.addColorStop(0.16, color); core.addColorStop(0.55, '#172237'); core.addColorStop(1, '#050810');
      ctx.fillStyle = core; ctx.fillRect(-boss.r, -boss.r, boss.r * 2, boss.r * 2);
    }
    if (state.phase >= 2) {
      ctx.fillStyle = state.phase === 3 ? 'rgba(255,28,36,.25)' : 'rgba(255,145,45,.13)';
      ctx.fillRect(-boss.r, -boss.r, boss.r * 2, boss.r * 2);
    }
    ctx.restore();

    const sprite = state.sprites.boss;
    const spriteSize = boss.r * (isTouch ? 4.35 : 4.65);
    if (sprite) {
      ctx.save();
      ctx.filter = 'brightness(1.16) contrast(1.06)';
      if (state.phase === 2) ctx.filter = 'saturate(1.18) brightness(1.14) contrast(1.06)';
      else if (state.phase === 3) ctx.filter = `saturate(1.5) brightness(${1.14 + Math.sin(now * 0.012) * 0.08}) contrast(1.08)`;
      ctx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      if (boss.flash > 0) {
        ctx.globalAlpha = clamp(boss.flash * 5, 0, 0.72);
        ctx.filter = 'brightness(5) grayscale(1)';
        ctx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      for (let i = 0; i < 8; i++) {
        const angle = i * TAU / 8;
        ctx.save(); ctx.rotate(angle); ctx.strokeRect(boss.r * 0.72, -10, boss.r * 1.15, 20); ctx.restore();
      }
    }
    if (state.phase >= 2) drawCracks(ctx, boss.r * 0.72, state.phase);
    ctx.restore();
  }

  function drawCracks(ctx, radius, phase) {
    ctx.strokeStyle = phase === 3 ? '#ffdf67' : '#ff795f';
    ctx.lineWidth = 2;
    const cracks = phase === 3 ? 6 : 3;
    for (let i = 0; i < cracks; i++) {
      const angle = i * 2.23 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.18, Math.sin(angle) * radius * 0.18);
      ctx.lineTo(Math.cos(angle + 0.12) * radius * 0.45, Math.sin(angle + 0.12) * radius * 0.45);
      ctx.lineTo(Math.cos(angle - 0.08) * radius * 0.72, Math.sin(angle - 0.08) * radius * 0.72);
      ctx.stroke();
    }
  }

  function drawPlayer(ctx, now) {
    const p = state.player;
    if (!p) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invuln > 0 && Math.floor(now / 55) % 2) ctx.globalAlpha = 0.35;
    const flame = state.reduced ? 5 : 8 + Math.sin(now * 0.024) * 4;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(-7, 18);
    ctx.lineTo(0, 28 + flame);
    ctx.lineTo(7, 18);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    const sprite = state.sprites[state.fighter] || state.sprites.ray;
    const size = state.fighter === 'turtle' ? 88 : state.fighter === 'falcon' ? 82 : 78;
    if (sprite) {
      ctx.save();
      if (state.fighter === 'ghost') {
        ctx.globalAlpha *= 0.72;
        ctx.filter = 'grayscale(1) hue-rotate(230deg) brightness(1.35)';
      }
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -28); ctx.lineTo(24, 15); ctx.lineTo(7, 10); ctx.lineTo(0, 24); ctx.lineTo(-7, 10); ctx.lineTo(-24, 15); ctx.closePath();
      ctx.fill();
    }
    if (p.shield > 0) { ctx.strokeStyle = hexAlpha('#75efff', 0.32 + p.shield / p.shieldMax * 0.45); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  function drawDrones(ctx) {
    ctx.fillStyle = state.player?.color || '#fff';
    state.drones.forEach((drone) => {
      ctx.save(); ctx.translate(drone.x, drone.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    });
  }

  function drawBullets(ctx) {
    bullets.each((bullet) => {
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.shadowBlur = bullet.kind === 'laser' ? 16 : 8;
      ctx.shadowColor = bullet.color;
      ctx.fillStyle = bullet.color;
      if (bullet.kind === 'laser') ctx.fillRect(-bullet.r, -18, bullet.r * 2, 36);
      else if (bullet.kind === 'missile') { ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, bullet.r, 0, TAU); ctx.fill(); }
      ctx.restore();
    });
  }

  function drawHazards(ctx, now) {
    const pulse = 0.5 + Math.sin(now * 0.018) * 0.25;
    state.hazards.forEach((hazard) => {
      ctx.save();
      if (hazard.warn > 0) {
        ctx.strokeStyle = `rgba(255,59,105,${pulse})`;
        ctx.fillStyle = `rgba(255,30,70,${pulse * 0.2})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        if (hazard.type === 'lock') { ctx.beginPath(); ctx.arc(hazard.x, hazard.y, 48 - hazard.warn * 14, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hazard.x - 58, hazard.y); ctx.lineTo(hazard.x + 58, hazard.y); ctx.moveTo(hazard.x, hazard.y - 58); ctx.lineTo(hazard.x, hazard.y + 58); ctx.stroke(); }
        else if (hazard.type === 'bottom') { ctx.fillRect(0, hazard.y, state.w, state.h - hazard.y); ctx.beginPath(); ctx.moveTo(0, hazard.y); ctx.lineTo(state.w, hazard.y); ctx.stroke(); }
        else if (hazard.type === 'drone') { ctx.beginPath(); ctx.arc(hazard.x, hazard.y, 22, 0, TAU); ctx.stroke(); }
        else { const x = hazard.x; ctx.fillRect(Math.max(0, x - 42), 0, 84, state.h); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.h); ctx.stroke(); }
      } else if (hazard.type === 'sweep') {
        ctx.shadowBlur = 26; ctx.shadowColor = '#ff315e'; ctx.fillStyle = 'rgba(255,49,94,.72)'; ctx.fillRect(hazard.currentX - hazard.width * 0.5, 0, hazard.width, state.h);
      } else if (hazard.type === 'bottom') { ctx.fillStyle = 'rgba(255,49,94,.5)'; ctx.fillRect(0, hazard.y, state.w, state.h - hazard.y); }
      else if (hazard.type === 'drone') { ctx.fillStyle = '#ffc456'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffc456'; ctx.fillRect(hazard.x - 10, hazard.y - 7, 20, 14); }
      ctx.restore();
    });
  }

  function spark(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const particle = particles.get();
      if (!particle) return;
      const angle = rand(0, TAU), speed = rand(50, 230);
      Object.assign(particle, { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(0.18, 0.45), maxLife: 0.45, size: rand(1, 3.5), color, alpha: 1, gravity: 120 });
    }
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const particle = particles.get();
      if (!particle) break;
      const angle = rand(0, TAU), velocity = rand(speed * 0.3, speed);
      Object.assign(particle, { x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: rand(0.25, 0.75), maxLife: 0.75, size: rand(1.5, 5), color, alpha: 1, gravity: 80 });
    }
  }

  function ringBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = i * TAU / count;
      const particle = particles.get();
      if (!particle) break;
      Object.assign(particle, { x, y, vx: Math.cos(angle) * 260, vy: Math.sin(angle) * 260, life: 0.5, maxLife: 0.5, size: 3, color, alpha: 1, gravity: 0 });
    }
  }

  function updateParticles(dt) {
    particles.each((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) { particle.active = false; return; }
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.alpha = particle.life / particle.maxLife;
    });
  }

  function drawParticles(ctx) {
    particles.each((particle) => {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
  }

  function floatingText(x, y, text, color, size) {
    if (state.texts.length > 28) state.texts.shift();
    state.texts.push({ x, y, text, color, size, life: 0.65, maxLife: 0.65 });
  }
  function updateTexts(dt) {
    state.texts.forEach((item) => { item.life -= dt; item.y -= dt * 45; });
    state.texts = state.texts.filter((item) => item.life > 0);
  }
  function drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.font = '700 14px system-ui';
    state.texts.forEach((item) => {
      ctx.globalAlpha = item.life / item.maxLife;
      ctx.fillStyle = item.color;
      ctx.font = `800 ${item.size}px system-ui`;
      ctx.fillText(item.text, item.x, item.y);
    });
    ctx.globalAlpha = 1;
  }

  function drawPause(ctx) {
    ctx.save();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.fillStyle = 'rgba(2,6,18,.64)'; ctx.fillRect(0, 0, state.w, state.h);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 30px system-ui'; ctx.fillText('战斗暂停', state.w / 2, state.h / 2);
    ctx.font = '14px system-ui'; ctx.fillStyle = '#9cdfff'; ctx.fillText('点击暂停按钮继续', state.w / 2, state.h / 2 + 30);
    ctx.restore();
  }

  function drawFps(ctx) {
    ctx.save();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(8, state.h - 31, 84, 23);
    ctx.fillStyle = state.fps > 48 ? '#7cffaa' : '#ffda68'; ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.fillText(`FPS ${state.fps}`, 15, state.h - 15);
    ctx.restore();
  }

  function measureFps(now) {
    state.fpsFrames++;
    if (now - state.fpsTime >= 500) {
      state.fps = Math.round(state.fpsFrames * 1000 / Math.max(1, now - state.fpsTime));
      state.fpsTime = now;
      state.fpsFrames = 0;
    }
  }

  function taunt(category) {
    const list = (VOICE_LINES[state.config.voice] || VOICE_LINES.buddy)[category];
    if (!list?.length) return;
    const forced = ['entrance', 'phase2', 'phase3', 'victory', 'defeat'].includes(category);
    if (!forced && state.elapsed - state.lastTauntAt < 4.5) return;
    state.lastTauntAt = state.elapsed;
    if (!state.bags[category]?.length) state.bags[category] = shuffle(list.map((_, index) => index));
    let index = state.bags[category].pop();
    let cue = `${category}-${index + 1}`;
    if (cue === state.lastCue && state.bags[category].length) {
      const alternative = state.bags[category].pop();
      state.bags[category].unshift(index);
      index = alternative;
      cue = `${category}-${index + 1}`;
    }
    const line = list[index];
    const priority = ['victory', 'defeat'].includes(category) ? 4 : ['entrance', 'phase2', 'phase3'].includes(category) ? 3 : 1;
    sayLine(line, cue, priority);
  }

  function sayLine(line, cue, priority = 1) {
    if (!audio.canAnnounce(priority)) return;
    if (cue && cue === state.lastCue) {
      radioToast(line);
      return;
    }
    if (audio.muted || !audio.ctx) {
      state.lastCue = cue || '';
      radioToast(line);
      return;
    }
    void audio.voice(
      state.config.voice,
      cue,
      priority,
      () => { state.lastCue = cue || ''; radioToast(line); },
      () => { state.lastCue = cue || ''; radioToast(line); if (!audio.muted) audio.radio(line); }
    );
  }

  let toastTimer = 0;
  let toastTypeTimer = 0;
  function radioToast(message) {
    const target = dom.tauntToast || dom.creatorStatus;
    if (!target) return;
    const prefix = `[${state.config.name} // 公共频道] `;
    const glyphs = Array.from(message);
    let shown = 0;
    target.textContent = prefix;
    target.hidden = false;
    target.classList.add('show', 'active', 'radio');
    clearInterval(toastTypeTimer);
    clearTimeout(toastTimer);
    toastTypeTimer = setInterval(() => {
      shown = Math.min(glyphs.length, shown + 2);
      target.textContent = prefix + glyphs.slice(0, shown).join('');
      if (shown >= glyphs.length) clearInterval(toastTypeTimer);
    }, state.phase === 3 ? 48 : 62);
    toastTimer = setTimeout(() => target.classList.remove('show', 'active', 'radio'), 2800);
  }

  function toast(message) {
    const target = dom.tauntToast || dom.creatorStatus;
    if (!target) return;
    clearInterval(toastTypeTimer);
    target.textContent = message;
    target.hidden = false;
    target.classList.remove('radio');
    target.classList.add('show', 'active');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove('show', 'active'), 2600);
  }

  function updateSoundUi() {
    if (!dom.soundButton) return;
    dom.soundButton.classList.toggle('muted', audio.muted);
    dom.soundButton.setAttribute('aria-pressed', String(audio.muted));
    dom.soundButton.setAttribute('aria-label', audio.muted ? '开启声音' : '静音');
  }
  function updateMotionUi() {
    document.documentElement.classList.toggle('reduce-motion', state.reduced);
    if (!dom.reduceMotionButton) return;
    dom.reduceMotionButton.classList.toggle('active', state.reduced);
    dom.reduceMotionButton.setAttribute('aria-pressed', String(state.reduced));
    dom.reduceMotionButton.setAttribute('aria-label', state.reduced ? '恢复动效' : '减少动效');
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    const tenths = Math.floor((safe % 1) * 10);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
