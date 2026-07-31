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
    'avatarPreview', 'avatarCanvas', 'themeGrid', 'createBossButton', 'quickPlayButton',
    'shareLinkButton', 'creatorStatus', 'loadoutScreen', 'fighterGrid', 'launchButton',
    'backHomeButton', 'gameScreen', 'bossNameHud', 'bossTitleHud', 'bossHpFill',
    'playerHpFill', 'shieldFill', 'comboValue', 'scoreValue', 'timerValue', 'phaseLabel',
    'tauntToast', 'pauseButton', 'dashButton', 'ultimateButton', 'upgradeScreen',
    'upgradeChoices', 'resultScreen', 'resultStamp', 'resultTitle', 'resultSummary',
    'resultStats', 'shareResultButton', 'rematchButton', 'createAnotherButton',
    'soundButton', 'reduceMotionButton', 'introOverlay', 'upgradeTitle', 'upgradeSubtitle',
    'mobileUploadButton', 'mobileQuickPlayButton'
  ];

  const dom = {};
  const CONFIG_PREFIX = '#br=';
  const FIGHTERS = {
    ray: { name: '曜光', hp: 100, speed: 340, rate: 0.115, damage: 18, color: '#5cf6ff', desc: '稳定激光 · 精准续航' },
    falcon: { name: '赤隼', hp: 82, speed: 400, rate: 0.26, damage: 13, color: '#ff8066', desc: '近战散射 · 高风险爆发' },
    turtle: { name: '玄武', hp: 132, speed: 275, rate: 0.22, damage: 23, color: '#72ffac', desc: '护盾反伤 · 稳健推进' },
    ghost: { name: '幽灵', hp: 88, speed: 440, rate: 0.09, damage: 15, color: '#c08cff', desc: '相位穿透 · 隐藏战机' }
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

  const LINES = {
    entrance: ['检测到菜鸟。火控系统上线。', '今天必须留下——至少留下你的战绩。', '警告：这里没有新手保护。', '老板很满意，但你今天的工资没了。', '听说你的操作很强？我已经开始笑了。'],
    phase2: ['不错，第二层装甲为你打开。', '战术升级。你的路线已经被记录。', '热身结束，现在才是正题。'],
    phase3: ['核心过载！最终协议启动！', '很好，你逼出了我的底牌。', '最后阶段——别在终点前失误。'],
    counter: ['你的习惯太明显了。', '路线已识别，正在实施反制。', '同一招，不会永远有效。'],
    playerHit: ['菜就多练。', '你已坚持了几秒，值得表扬。', '建议卸载。', '老板很满意，但你的工资没了。', '重开吧，这波我当没看见。', '继续送，我的战绩就快凑够了。'],
    critical: ['命中核心！漂亮的一击。', '装甲破裂，继续压制！', '好准，但别忘了走位。'],
    victory: ['协议终止。你赢得很漂亮。', '核心离线……胜者已记录。'],
    defeat: ['挑战结束。调整构筑，再来。', '这次我守住了。下一局见。']
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
      this.muted = false;
      this.timer = 0;
      this.step = 0;
      this.phase = 1;
      this.nextNote = 0;
      this.lastFire = 0;
    }
    unlock() {
      if (this.muted) return;
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
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
      osc.connect(gain).connect(this.master);
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
      source.connect(filter).connect(gain).connect(this.master);
      source.start();
    }
    sfx(name) {
      if (!this.ctx || this.muted) return;
      const now = performance.now();
      if (name === 'fire') {
        if (now - this.lastFire < 85) return;
        this.lastFire = now;
        this.tone(330, 0.035, 'square', 0.035, 170);
      } else if (name === 'hit') this.tone(150, 0.05, 'triangle', 0.05, 110);
      else if (name === 'crit') { this.tone(720, 0.11, 'sawtooth', 0.09, 520); this.tone(1040, 0.08, 'sine', 0.05); }
      else if (name === 'hurt') { this.noise(0.16, 0.13); this.tone(110, 0.18, 'sawtooth', 0.08, -45); }
      else if (name === 'dash') this.tone(190, 0.13, 'sawtooth', 0.08, 620);
      else if (name === 'warning') this.tone(830, 0.16, 'square', 0.07, -180);
      else if (name === 'upgrade') { this.tone(440, 0.12, 'sine', 0.08, 220); setTimeout(() => this.tone(660, 0.16, 'sine', 0.07, 220), 90); }
      else if (name === 'boom') { this.noise(0.34, 0.2); this.tone(70, 0.3, 'sawtooth', 0.1, -28); }
      else if (name === 'win') [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.24, 'triangle', 0.09), i * 120));
    }
    startBgm(phase = 1) {
      this.phase = phase;
      this.unlock();
      if (this.timer) return;
      this.nextNote = this.ctx ? this.ctx.currentTime : 0;
      this.timer = setInterval(() => this.schedule(), 80);
    }
    setPhase(phase) {
      this.phase = phase;
      this.step = 0;
    }
    schedule() {
      if (!this.ctx) return;
      if (this.muted || this.ctx.state !== 'running') {
        this.nextNote = this.ctx.currentTime;
        return;
      }
      if (this.nextNote < this.ctx.currentTime - 0.5) this.nextNote = this.ctx.currentTime;
      const scale = this.phase === 1 ? [55, 65.4, 73.4, 82.4] : this.phase === 2 ? [55, 69.3, 77.8, 98] : [49, 58.3, 73.4, 87.3];
      while (this.nextNote < this.ctx.currentTime + 0.15) {
        const beat = this.phase === 3 ? 0.16 : this.phase === 2 ? 0.2 : 0.24;
        const root = scale[this.step % scale.length];
        this.tone(root, beat * 0.9, 'sawtooth', 0.045);
        if (this.step % 2 === 0) this.tone(root * 4, 0.055, 'square', 0.018);
        this.step++;
        this.nextNote += beat;
      }
    }
    stop() {
      clearInterval(this.timer);
      this.timer = 0;
    }
    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.16;
      if (!this.muted && this.ctx) this.nextNote = this.ctx.currentTime;
      if (this.muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      return this.muted;
    }
  }

  const audio = new SoundEngine();
  const bullets = new Pool(160, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, owner: 'player', damage: 1, life: 0, color: '#fff', pierce: 0, homing: false, kind: 'shot' }));
  const particles = new Pool(isTouch ? 55 : 130, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', alpha: 1, gravity: 0 }));

  const state = {
    screen: 'home', mode: 'idle', w: 900, h: 900, dpr: 1, ctx: null,
    config: { name: '终焉机甲', title: '自适应战术核心', theme: 'cyber', avatar: '' },
    fighter: 'ray', theme: 'cyber', avatarImage: null, raf: 0, last: 0, elapsed: 0,
    countdown: 120, phase: 1, score: 0, combo: 0, comboClock: 0, shake: 0,
    hitStop: 0, fps: 60, fpsTime: 0, fpsFrames: 0, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    keys: new Set(), pointer: { active: false, x: 0, y: 0, lastX: 0, lastY: 0, type: '' },
    player: null, boss: null, hazards: [], drones: [], texts: [], bgNodes: [],
    attackClock: 0, attackIndex: 0, counterClock: 0, historyClock: 0, history: [], dashTimes: [],
    modulesUsed: [], upgradesTaken: 0, pendingUpgrade: false, introStart: 0, introTimer: 0, pausedFrom: '', gameStart: 0,
    bags: {}, fired: 0, hits: 0, damageTaken: 0, ghostUnlocked: storageGet('bossRushGhost') === '1',
    resultWon: false, rating: 'C'
  };

  function init() {
    ids.forEach((id) => { dom[id] = $(id); });
    if (!dom.gameCanvas) return;
    state.ctx = dom.gameCanvas.getContext('2d', { alpha: false });
    state.ctx.imageSmoothingEnabled = true;
    bindUi();
    resizeCanvas();
    loadHashConfig();
    updateUnlockUi();
    updateSoundUi();
    updateMotionUi();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && ['active', 'intro'].includes(state.mode)) pauseGame(true);
    });
    state.raf = requestAnimationFrame(loop);
  }

  function bindUi() {
    document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
    dom.avatarInput?.addEventListener('change', handleAvatar);
    dom.createBossButton?.addEventListener('click', createBoss);
    dom.quickPlayButton?.addEventListener('click', quickPlay);
    dom.mobileQuickPlayButton?.addEventListener('click', quickPlay);
    dom.mobileUploadButton?.addEventListener('click', () => dom.avatarInput?.click());
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

    const bossBay = dom.app?.querySelector('.boss-bay[role="button"]');
    bossBay?.addEventListener('click', () => dom.avatarInput?.click());
    bossBay?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      dom.avatarInput?.click();
    });

    dom.themeGrid?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-theme]');
      if (!card || !THEMES[card.dataset.theme]) return;
      state.theme = card.dataset.theme;
      selectCard(dom.themeGrid, card, '[data-theme]');
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
    if (!dom.creatorStatus) return;
    dom.creatorStatus.textContent = message;
    dom.creatorStatus.classList.toggle('error', error);
  }

  function quickPlay() {
    state.config = { name: '终焉机甲', title: '自适应战术核心', theme: state.theme || 'cyber', avatar: '' };
    state.avatarImage = null;
    enterLoadout();
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      creatorMessage('请选择不超过6MB的 JPG、PNG 或 WebP 图片', true);
      event.target.value = '';
      return;
    }
    creatorMessage('正在生成机械核心…');
    let url = '';
    try {
      url = URL.createObjectURL(file);
      const image = await loadImage(url);
      if (image.naturalWidth * image.naturalHeight > 36_000_000) throw new Error('图片像素过大');
      const result = processAvatar(image);
      state.config.avatar = result;
      state.avatarImage = await loadImage(result);
      showAvatarPreview(result);
      creatorMessage('头像已本地处理，不会上传原图');
    } catch (error) {
      creatorMessage('图片处理失败，请换一张重试', true);
    } finally {
      if (url) URL.revokeObjectURL(url);
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

  function processAvatar(image) {
    const size = 96;
    const work = document.createElement('canvas');
    work.width = work.height = size;
    const ctx = work.getContext('2d', { willReadFrequently: true });
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const sw = size / scale;
    const sh = size / scale;
    const sx = (image.naturalWidth - sw) / 2;
    const sy = (image.naturalHeight - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size);
    const samples = [];
    const points = [[2, 2], [93, 2], [2, 93], [93, 93]];
    for (const [x, y] of points) {
      const index = (y * size + x) * 4;
      samples.push([pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]]);
    }
    const bg = [0, 1, 2].map((channel) => samples.reduce((sum, value) => sum + value[channel], 0) / samples.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const dr = pixels.data[index] - bg[0];
        const dg = pixels.data[index + 1] - bg[1];
        const db = pixels.data[index + 2] - bg[2];
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        const colorAlpha = smoothstep(20, 78, distance);
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
        const edgeAlpha = smoothstep(0, 8, edge);
        pixels.data[index + 3] = Math.round(pixels.data[index + 3] * Math.min(colorAlpha, edgeAlpha));
      }
    }
    ctx.putImageData(pixels, 0, 0);

    const output = document.createElement('canvas');
    output.width = output.height = 64;
    const out = output.getContext('2d');
    out.save();
    out.beginPath();
    out.arc(32, 32, 30, 0, TAU);
    out.clip();
    out.drawImage(work, 0, 0, 64, 64);
    const shade = out.createRadialGradient(32, 29, 13, 32, 32, 34);
    shade.addColorStop(0.5, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,10,24,.55)');
    out.fillStyle = shade;
    out.fillRect(0, 0, 64, 64);
    out.restore();
    return output.toDataURL('image/webp', 0.58);
  }

  function smoothstep(a, b, value) {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
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
        dom.avatarCanvas.width = dom.avatarCanvas.height = 96;
        ctx.clearRect(0, 0, 96, 96);
        ctx.drawImage(state.avatarImage, 0, 0, 96, 96);
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
      const clean = { v: 1, n: safeText(config.name, '终焉机甲', 12), t: safeText(config.title, '自适应战术核心', 20), m: THEMES[config.theme] ? config.theme : 'cyber', a: /^data:image\/webp;base64,/.test(config.avatar || '') ? config.avatar : '' };
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
      const avatar = typeof data.a === 'string' && data.a.length < 50000 && /^data:image\/webp;base64,/.test(data.a) ? data.a : '';
      return { name: safeText(data.n, '终焉机甲', 12), title: safeText(data.t, '自适应战术核心', 20), theme: THEMES[data.m] ? data.m : 'cyber', avatar };
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
    showScreen('loadout');
    if (dom.bossNameHud) dom.bossNameHud.textContent = state.config.name;
    if (dom.bossTitleHud) dom.bossTitleHud.textContent = state.config.title;
    const hudAvatar = dom.app?.querySelector('.hud-avatar');
    if (hudAvatar) hudAvatar.style.backgroundImage = state.config.avatar ? `url(${JSON.stringify(state.config.avatar)})` : '';
    const themeCard = dom.themeGrid?.querySelector(`[data-theme="${state.theme}"]`);
    if (themeCard) selectCard(dom.themeGrid, themeCard, '[data-theme]');
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
    audio.unlock();
    const base = FIGHTERS[state.fighter] || FIGHTERS.ray;
    state.player = {
      x: state.w * 0.5, y: state.h * 0.82, vx: 0, vy: 0, r: 18, maxHp: base.hp, hp: base.hp,
      speed: base.speed, damage: base.damage, rate: base.rate, fireClock: 0, damageMul: 1, rateMul: 1,
      shieldMax: state.fighter === 'turtle' ? 42 : 0, shield: state.fighter === 'turtle' ? 42 : 0,
      shieldRegen: 0, reflect: state.fighter === 'turtle' ? 0.25 : 0, enemySlow: 1, crit: 0.08,
      pierce: state.fighter === 'ghost' ? 1 : 0, twin: false, scatter: false, drone: 0, missile: false,
      homing: state.fighter === 'ghost', dashMul: 1, dashCd: 0, dashTime: 0, invuln: 0,
      ultimate: 35, vampire: false, hitCounter: 0, color: base.color
    };
    state.boss = { x: state.w * 0.5, y: state.h * (isTouch ? 0.25 : 0.2), r: clamp(state.w * 0.075, 48, 72), maxHp: 9800, hp: 9800, angle: 0, flash: 0 };
    state.elapsed = 0;
    state.countdown = 120;
    state.phase = 1;
    state.score = 0;
    state.combo = 0;
    state.comboClock = 0;
    state.attackClock = 1.2;
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
    state.bags = {};
    bullets.clear();
    particles.clear();
    makeBackground();
    showScreen('game');
    resizeCanvas();
    updateHud();
    startIntro();
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
    taunt('entrance');
    state.shake = state.reduced ? 0 : 16;
    audio.startBgm(1);
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
      audio.ctx?.suspend();
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
    state.countdown = Math.max(0, 120 - state.elapsed);
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
    Object.assign(bullet, { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: radius, owner: 'enemy', damage, life: 7, color, pierce: 0, homing: false, kind: 'enemy' });
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
    boss.angle += dt * (0.7 + state.phase * 0.28);
    boss.x = state.w * 0.5 + Math.sin(state.elapsed * (0.52 + state.phase * 0.08)) * state.w * 0.18;
    boss.y = state.h * (isTouch ? 0.25 : 0.19) + Math.sin(state.elapsed * 0.9) * 12;
    state.attackClock -= dt;
    if (state.phase >= 2) state.counterClock -= dt;
    if (state.attackClock <= 0) {
      performPattern();
      state.attackClock = Math.max(0.85, 2.25 - state.phase * 0.32) + rand(0.1, 0.45);
    }
    if (state.counterClock <= 0) {
      counterPlayer();
      state.counterClock = 12;
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
    for (let wave = 0; wave < waves; wave++) {
      setTimeout(() => {
        if (state.mode !== 'active') return;
        for (let arm = 0; arm < 3; arm++) {
          const angle = boss.angle + arm * TAU / 3 + wave * 0.22;
          spawnEnemyShot(boss.x, boss.y, angle, (165 + state.phase * 24) * state.player.enemySlow, 9 + state.phase, 5, '#ff72d2');
        }
      }, wave * 120);
    }
  }

  function lockedAttack(targetX = state.player.x, targetY = state.player.y, label = '预判锁定') {
    const warning = 0.78;
    state.hazards.push({ type: 'lock', x: targetX, y: targetY, warn: warning, active: 0.24, damage: 20, label, triggered: false });
    audio.sfx('warning');
  }

  function sweepAttack(reverse) {
    const from = reverse ? state.w + 40 : -40;
    const to = reverse ? -40 : state.w + 40;
    state.hazards.push({ type: 'sweep', x: from, to, warn: 0.95, active: 0.42, damage: 24, width: 30, triggered: false });
    audio.sfx('warning');
  }

  function feintAttack() {
    const reverse = Math.random() > 0.5;
    state.hazards.push({ type: 'feint', x: reverse ? state.w : 0, warn: 0.68, active: 0.1, damage: 0, reverse, triggered: false });
    audio.sfx('warning');
  }

  function summonDrones() {
    const count = 2 + state.phase;
    for (let i = 0; i < count; i++) {
      state.hazards.push({ type: 'drone', x: state.w * (i + 1) / (count + 1), y: state.h * 0.28, warn: 0.7, active: 5.5, damage: 8, fire: rand(0.4, 1), hp: 3, triggered: false });
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
    if (dashCount >= 3) {
      explanation = '你连续冲刺的落点，我记住了。';
      const latest = recent[recent.length - 1];
      const older = recent[Math.max(0, recent.length - 5)];
      lockedAttack(clamp(latest.x + (latest.x - older.x) * 1.8, 30, state.w - 30), clamp(latest.y + (latest.y - older.y) * 1.8, state.h * 0.35, state.h - 30), '冲刺落点');
    } else if (avgY > 0.76) {
      explanation = '一直缩在底线？那里现在归我了。';
      state.hazards.push({ type: 'bottom', y: state.h * 0.78, warn: 0.88, active: 0.44, damage: 22, triggered: false });
      audio.sfx('warning');
    } else if (avgX < 0.38 || avgX > 0.62) {
      const right = avgX > 0.62;
      explanation = `你总爱往${right ? '右' : '左'}躲，侧翼已封锁。`;
      sweepAttack(right);
    } else {
      explanation = '中路盘旋太久，扇区开始收缩。';
      fanAttack();
    }
    sayLine(`${state.config.name}：${explanation}`);
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
          hazard.fire = rand(0.9, 1.4);
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
    state.score += Math.round(amount * (1 + Math.min(2, state.combo / 30)));
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
    if (phase === 2) state.counterClock = 6;
    audio.setPhase(phase);
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
    let remaining = amount;
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, remaining);
      p.shield -= absorbed;
      remaining -= absorbed;
      if (p.reflect) damageBoss(absorbed * p.reflect, false, state.boss.x, state.boss.y);
    }
    if (remaining > 0) p.hp = Math.max(0, p.hp - remaining);
    p.shieldRegen = 0;
    p.invuln = 0.6;
    state.damageTaken += amount;
    state.combo = 0;
    state.shake = state.reduced ? 0 : 13;
    state.hitStop = state.reduced ? 0 : 0.06;
    floatingText(p.x, p.y - 20, `受击 -${Math.round(amount)}`, '#ff668d', 16);
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
    let rating = 'C';
    if (won && hpRatio > 0.72 && state.elapsed < 70) rating = 'SSS';
    else if (won && hpRatio > 0.45 && state.elapsed < 90) rating = 'S';
    else if (won && hpRatio > 0.2) rating = 'A';
    else if (won) rating = 'B';
    state.rating = rating;
    if (dom.resultStamp) { dom.resultStamp.textContent = won ? rating : 'RETRY'; dom.resultStamp.classList.toggle('defeat', !won); }
    if (dom.resultTitle) dom.resultTitle.textContent = won ? `${state.config.name} 已击破` : '挑战未完成';
    if (dom.resultSummary) dom.resultSummary.textContent = `${reason} · ${FIGHTERS[state.fighter].name} · ${THEMES[state.theme].name}`;
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
    const text = `${state.resultWon ? '我击破了' : '我挑战了'}「${state.config.name}」！得分${state.score}，命中${accuracy}%，用时${formatTime(state.elapsed)}。你敢来吗？`;
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
    ctx.rotate(Math.sin(now * 0.001) * 0.025);
    const color = state.phase === 1 ? '#44ecff' : state.phase === 2 ? '#ffb347' : '#ff386c';
    ctx.shadowBlur = 28; ctx.shadowColor = color;
    ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, boss.r, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 6; i++) {
      const a = boss.angle + i * TAU / 6;
      ctx.save(); ctx.rotate(a); ctx.fillStyle = i % 2 ? '#26374d' : '#384e64';
      ctx.beginPath(); ctx.moveTo(boss.r * 0.72, -9); ctx.lineTo(boss.r * 1.42, -15); ctx.lineTo(boss.r * 1.62, 0); ctx.lineTo(boss.r * 1.42, 15); ctx.lineTo(boss.r * 0.72, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, boss.r * 0.72, 0, TAU); ctx.clip();
    if (state.avatarImage) ctx.drawImage(state.avatarImage, -boss.r * 0.72, -boss.r * 0.72, boss.r * 1.44, boss.r * 1.44);
    else {
      const core = ctx.createRadialGradient(0, 0, 3, 0, 0, boss.r * 0.72);
      core.addColorStop(0, '#fff'); core.addColorStop(0.16, color); core.addColorStop(0.55, '#172237'); core.addColorStop(1, '#050810');
      ctx.fillStyle = core; ctx.fillRect(-boss.r, -boss.r, boss.r * 2, boss.r * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, boss.r * (0.2 + i * 0.14), boss.angle * (i % 2 ? -1 : 1), boss.angle + Math.PI * 1.2); ctx.stroke(); }
    }
    if (boss.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(-boss.r, -boss.r, boss.r * 2, boss.r * 2); }
    ctx.restore();
    if (state.phase >= 2) drawCracks(ctx, boss.r, state.phase);
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
    ctx.shadowColor = p.color; ctx.shadowBlur = 16;
    ctx.fillStyle = p.color;
    if (state.fighter === 'turtle') {
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(21, -7); ctx.lineTo(17, 17); ctx.lineTo(0, 11); ctx.lineTo(-17, 17); ctx.lineTo(-21, -7); ctx.closePath(); ctx.fill();
    } else if (state.fighter === 'falcon') {
      ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(29, 15); ctx.lineTo(8, 8); ctx.lineTo(0, 21); ctx.lineTo(-8, 8); ctx.lineTo(-29, 15); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(14, 7); ctx.lineTo(23, 15); ctx.lineTo(7, 12); ctx.lineTo(0, 23); ctx.lineTo(-7, 12); ctx.lineTo(-23, 15); ctx.lineTo(-14, 7); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.fillStyle = '#ecfeff'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(-7, 15); ctx.lineTo(0, 29 + Math.sin(now * 0.02) * 4); ctx.lineTo(7, 15); ctx.closePath(); ctx.fill();
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
    const list = LINES[category];
    if (!list?.length) return;
    if (!state.bags[category]?.length) state.bags[category] = shuffle(list.map((_, index) => index));
    const line = list[state.bags[category].pop()];
    sayLine(line);
  }

  function sayLine(line) {
    toast(line);
    if (!audio.muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(line);
      speech.lang = 'zh-CN';
      speech.rate = state.phase === 3 ? 1.15 : 1.04;
      speech.pitch = 0.72;
      speech.volume = 0.72;
      window.speechSynthesis.speak(speech);
    }
  }

  let toastTimer = 0;
  function toast(message) {
    const target = dom.tauntToast || dom.creatorStatus;
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
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
