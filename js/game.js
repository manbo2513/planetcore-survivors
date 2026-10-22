import {
  BOSS_TIME,
  BREAKTHROUGHS,
  BREAKTHROUGH_BY_ID,
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  ENEMY_LORE,
  ENEMY_TYPES,
  EVENTS,
  EVENT_BY_ID,
  MAX_DAMAGE_TEXTS,
  MAX_ENEMIES,
  MAX_GEMS,
  MAX_PARTICLES,
  PLANETS,
  PLANET_BY_ID,
  PLAYER_BASE,
  UPGRADES,
  clamp,
  dist2,
  formatTime,
  lerp,
  pick,
  rand,
  randInt,
  waveLabel,
} from "./config.js";
import { AudioEngine } from "./audio.js";

const TAU = Math.PI * 2;
const LASER_RANGE = 1120;
const SOLAR_MIN_RELEASE = 0.5;
const RESULT_INPUT_LOCK_MS = 1600;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const audio = new AudioEngine();

const el = {
  hud: document.getElementById("hud"),
  hpFill: document.getElementById("hpFill"),
  shieldFill: document.getElementById("shieldFill"),
  hpText: document.getElementById("hpText"),
  xpFill: document.getElementById("xpFill"),
  gravityFill: document.getElementById("gravityFill"),
  gravityRow: document.querySelector(".gravity-row"),
  gravityKey: document.querySelector(".gravity-key"),
  abilityLabel: document.getElementById("abilityLabel"),
  levelText: document.getElementById("levelText"),
  timer: document.getElementById("timer"),
  waveLabel: document.getElementById("waveLabel"),
  killText: document.getElementById("killText"),
  bossWrap: document.getElementById("bossWrap"),
  bossFill: document.getElementById("bossFill"),
  bossPhase: document.getElementById("bossPhase"),
  eventText: document.getElementById("eventText"),
  toast: document.getElementById("toast"),
  tips: document.getElementById("tips"),
  menu: document.getElementById("menu"),
  startBtn: document.getElementById("startBtn"),
  recordText: document.getElementById("recordText"),
  menuSoundBtn: document.getElementById("menuSoundBtn"),
  menuMusicBtn: document.getElementById("menuMusicBtn"),
  codexBtn: document.getElementById("codexBtn"),
  loadout: document.getElementById("loadout"),
  planetChoices: document.getElementById("planetChoices"),
  difficultyChoices: document.getElementById("difficultyChoices"),
  difficultyDesc: document.getElementById("difficultyDesc"),
  sunAutoOption: document.getElementById("sunAutoOption"),
  sunAutoBtn: document.getElementById("sunAutoBtn"),
  sunAutoState: document.getElementById("sunAutoState"),
  sunAutoDescription: document.getElementById("sunAutoDescription"),
  launchBtn: document.getElementById("launchBtn"),
  loadoutBackBtn: document.getElementById("loadoutBackBtn"),
  codex: document.getElementById("codex"),
  codexTabs: document.getElementById("codexTabs"),
  codexBody: document.getElementById("codexBody"),
  codexCloseBtn: document.getElementById("codexCloseBtn"),
  levelup: document.getElementById("levelup"),
  levelupSub: document.getElementById("levelupSub"),
  upgradeCategoryBar: document.getElementById("upgradeCategoryBar"),
  cards: document.getElementById("cards"),
  rerollBtn: document.getElementById("rerollBtn"),
  pause: document.getElementById("pause"),
  resumeBtn: document.getElementById("resumeBtn"),
  pauseSoundBtn: document.getElementById("pauseSoundBtn"),
  pauseMusicBtn: document.getElementById("pauseMusicBtn"),
  pauseCodexBtn: document.getElementById("pauseCodexBtn"),
  pauseRestartBtn: document.getElementById("pauseRestartBtn"),
  pauseMenuBtn: document.getElementById("pauseMenuBtn"),
  gameover: document.getElementById("gameover"),
  gameoverCopy: document.getElementById("gameoverCopy"),
  goTime: document.getElementById("goTime"),
  goLevel: document.getElementById("goLevel"),
  goKills: document.getElementById("goKills"),
  retryBtn: document.getElementById("retryBtn"),
  goMenuBtn: document.getElementById("goMenuBtn"),
  victory: document.getElementById("victory"),
  unlockNote: document.getElementById("unlockNote"),
  winTime: document.getElementById("winTime"),
  winLevel: document.getElementById("winLevel"),
  winKills: document.getElementById("winKills"),
  againBtn: document.getElementById("againBtn"),
  winMenuBtn: document.getElementById("winMenuBtn"),
  muteBtn: document.getElementById("muteBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  gravityBtn: document.getElementById("gravityBtn"),
  abilityBtnLabel: document.getElementById("abilityBtnLabel"),
  abilityBtnHint: document.getElementById("abilityBtnHint"),
  pauseBtn: document.getElementById("pauseBtn"),
};

let W = 0;
let H = 0;
let DPR = 1;
let state = "menu";
let G = null;
let menuTime = 0;
let lastFrame = performance.now();
let hudTimer = 0;
let toastTimeout = 0;
let record = loadRecord();
let gravityHeld = false;
let lastKey = "";
let lastError = "";
let rerollAvailable = true;
let upgradeCategoryFilter = "all";
let selectedPlanetId = readStorage("planetcore-last-planet", "earth");
let selectedDifficultyId = readStorage("planetcore-last-difficulty", "cruise");
let sunAutoAttack = readStorage("planetcore-sun-auto-attack", "0") === "1";
let resultLockedUntil = 0;
let resultLockTimeout = 0;
let endlessUnlocked = readStorage("planetcore-endless-unlocked", "") === "1";
let endlessBest = Number(readStorage("planetcore-endless-best", "0")) || 0;
let codexProgress = loadCodexProgress();
let codexReturn = "menu";
let codexTab = "planets";
let codexUpgradeFilter = "all";
if (selectedDifficultyId === "endless" && !endlessUnlocked) selectedDifficultyId = "cruise";
const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

window.addEventListener("error", (event) => {
  lastError = `${event.message} @${event.filename || "?"}:${event.lineno || 0}`;
});
window.addEventListener("unhandledrejection", (event) => {
  lastError = String(event.reason || "unhandled rejection");
});

const keys = new Set();
const pointer = {
  active: false,
  id: null,
  touch: false,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
};
const mouseScreen = { x: 0, y: 0 };

const STAR_LAYERS = [
  { count: 150, zMin: 0.012, zMax: 0.04, rMin: 0.3, rMax: 0.8, aMin: 0.12, aMax: 0.4, cross: 0.01 },
  { count: 100, zMin: 0.07, zMax: 0.16, rMin: 0.5, rMax: 1.1, aMin: 0.22, aMax: 0.62, cross: 0.03 },
  { count: 54, zMin: 0.25, zMax: 0.45, rMin: 0.8, rMax: 1.6, aMin: 0.4, aMax: 0.82, cross: 0.08 },
  { count: 20, zMin: 0.62, zMax: 0.9, rMin: 1.2, rMax: 2.2, aMin: 0.55, aMax: 0.95, cross: 0.16 },
].map((layer) => ({
  ...layer,
  stars: Array.from({ length: layer.count }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: rand(layer.zMin, layer.zMax),
    r: rand(layer.rMin, layer.rMax),
    a: rand(layer.aMin, layer.aMax),
    tw: rand(0.3, 1.7),
    phase: rand(0, TAU),
    cross: Math.random() < layer.cross,
  })),
}));

const dustMotes = Array.from({ length: 34 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: rand(0.95, 1.45),
  r: rand(1.4, 4.8),
  a: rand(0.03, 0.11),
  drift: rand(-7, 7),
}));

const backgroundDebris = Array.from({ length: 16 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: rand(0.5, 0.86),
  r: rand(5, 15),
  a: rand(0.1, 0.24),
  rot: rand(0, TAU),
  spin: rand(-0.18, 0.18),
}));

const foregroundMotes = Array.from({ length: 14 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: rand(1.25, 1.8),
  r: rand(2.5, 6.5),
  a: rand(0.035, 0.1),
  drift: rand(-12, 12),
  warm: Math.random() < 0.3,
}));

const REPAIR = {
  id: "repair",
  name: "紧急修复",
  icon: "✚",
  desc: "立刻恢复 35 点生命。",
  max: 99,
  fallback: true,
  apply(p) {
    p.hp = Math.min(p.maxHp, p.hp + 35);
  },
};

function loadRecord() {
  try {
    return JSON.parse(localStorage.getItem("planetcore-best") || "null");
  } catch {
    return null;
  }
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

function loadCodexProgress() {
  const empty = { planets: {}, enemies: {}, upgrades: {}, events: {}, breakthroughs: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem("planetcore-codex") || "null");
    return parsed ? { ...empty, ...parsed } : empty;
  } catch {
    return empty;
  }
}

function markCodex(category, id) {
  if (!codexProgress[category]) codexProgress[category] = {};
  if (codexProgress[category][id]) return;
  codexProgress[category][id] = true;
  writeStorage("planetcore-codex", JSON.stringify(codexProgress));
}

function saveRecord(won) {
  const next = {
    time: G ? G.time : 0,
    level: G ? G.level : 1,
    kills: G ? G.kills : 0,
    won: Boolean(won),
  };
  let better = false;
  if (!record) {
    better = true;
  } else if (won && !record.won) {
    better = true;
  } else if (won && record.won) {
    better =
      next.time < record.time ||
      (next.time === record.time && next.kills > record.kills) ||
      (next.time === record.time && next.kills === record.kills && next.level > record.level);
  } else if (!won && !record.won) {
    better =
      next.time > record.time ||
      (next.time === record.time && next.kills > record.kills) ||
      (next.time === record.time && next.kills === record.kills && next.level > record.level);
  }
  if (better) {
    record = next;
    try {
      localStorage.setItem("planetcore-best", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  updateRecordText();
}

function updateRecordText() {
  if (!record) {
    el.recordText.textContent =
      endlessBest > 0 ? `最佳记录：无尽 ${formatTime(endlessBest)}` : "最佳记录：尚无";
    return;
  }
  if (record.won) {
    el.recordText.textContent = `最佳记录：通关 ${formatTime(record.time)} · Lv.${record.level} · ${record.kills} 击杀`;
  } else {
    el.recordText.textContent = `最佳记录：存活 ${formatTime(record.time)} · Lv.${record.level} · ${record.kills} 击杀`;
  }
  if (endlessBest > 0) {
    el.recordText.textContent += ` · 无尽 ${formatTime(endlessBest)}`;
  }
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(320, window.innerWidth);
  H = Math.max(320, window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
}

window.addEventListener("resize", resize);
resize();
mouseScreen.x = W / 2;
mouseScreen.y = H / 2;
updateRecordText();

function makePlayer(planet) {
  const mods = planet?.modifiers || {};
  const p = {
    ...PLAYER_BASE,
    radius: PLAYER_BASE.radius * (mods.radius || 1),
    maxHp: Math.round(PLAYER_BASE.maxHp * (mods.maxHp || 1)),
    speed: PLAYER_BASE.speed * (mods.speed || 1),
    damage: PLAYER_BASE.damage * (mods.damage || 1),
    fireInterval: PLAYER_BASE.fireInterval * (mods.fireInterval || 1),
    magnet: PLAYER_BASE.magnet * (mods.magnet || 1),
    regen: PLAYER_BASE.regen + (mods.regen || 0),
    gravityMax: PLAYER_BASE.gravityMax * (mods.gravityMax || 1),
    gravityDrain: mods.gravityDrain || PLAYER_BASE.gravityDrain,
    gravityRecharge: mods.gravityRecharge || PLAYER_BASE.gravityRecharge,
    gravityRadiusMult: PLAYER_BASE.gravityRadiusMult * (mods.gravityRadiusMult || 1),
    gravityDamageMult: PLAYER_BASE.gravityDamageMult * (mods.gravityDamageMult || 1),
    gravityPullMult: PLAYER_BASE.gravityPullMult * (mods.gravityPullMult || 1),
    gravityReleaseCdMax: 0.7 * (mods.gravityReleaseCdMult || 1),
    weapon: planet?.weapon || "bullets",
    summons: [],
    satelliteMax: mods.satelliteMax || 0,
    satelliteInterval: mods.satelliteInterval || 65,
    satelliteTimer: mods.satelliteMax ? mods.satelliteInterval || 65 : Infinity,
    satelliteBombDamageMult: mods.satelliteBombDamageMult || 1,
    satelliteBombRadiusMult: mods.satelliteBombRadiusMult || 1,
    satelliteBombIntervalMult: mods.satelliteBombIntervalMult || 1,
    satelliteBombsLaunched: 0,
    summonShots: 0,
    summonDamageMult: mods.summonDamageMult || 1,
    summonFireMult: 1,
    laserWidth: PLAYER_BASE.laserWidth,
    laserChargeTime: PLAYER_BASE.laserChargeTime,
    laserDamageMult: PLAYER_BASE.laserDamageMult,
    laserBurnLevel: 0,
    laserProgress: 0,
    laserProgressMax: 5,
    laserSalvoBonus: 0,
    laserFiringAngles: [],
    laserSalvoActive: false,
    laserShotIndex: 0,
    laserShotTimer: 0,
    laserShotPower: 0,
    laserVisuals: [],
    laserState: "idle",
    laserCharge: 0,
    laserTimer: 0,
    laserAngle: 0,
    laserTarget: null,
    laserHit: new Set(),
    warpGuard: 0,
    warpChargesMax: mods.warpChargesMax || 3,
    warpCharges: mods.warpChargesMax || 3,
    warpRechargeTime: mods.warpRechargeTime || 3,
    warpRecharge: 0,
    warpDamageMult: mods.warpDamageMult || 1,
    eventHorizonMult: mods.eventHorizonMult || 1,
    horizonTimer: 0,
    hp: 0,
    shield: 0,
    gravityEnergy: PLAYER_BASE.gravityMax * (mods.gravityMax || 1),
    gravityActive: false,
    gravityRechargeDelay: 0,
    gravityLock: false,
    gravityMinTimer: 0,
    gravityCharge: 0,
    gravityChargeTime: 0,
    gravityReleaseCd: 0,
    gravityHoldTime: 0,
    gravityCaptured: 0,
    gravityPerfect: false,
    earthOverdriveActive: false,
    earthOverdriveDrain: 25,
    voidCollapseActive: false,
    voidCollapseDrain: (PLAYER_BASE.gravityMax * (mods.gravityMax || 1)) / 3,
    voidCollapseTick: 0,
    voidCollapsePull: 0,
    gravityMitigation: mods.gravityMitigation || 0,
    planetId: planet?.id || "earth",
    coronaTimer: 0,
    stormInterval: mods.stormInterval || 6.5,
    stormRadius: mods.stormRadius || 225,
    stormTimer: planet?.id === "jupiter" ? mods.stormInterval || 6.5 : 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fireTimer: 0.15,
    invuln: 0,
    shieldTimer: 8,
    angle: -Math.PI / 2,
    trailTimer: 0,
  };
  p.hp = p.maxHp;
  if (planet?.id === "earth") {
    p.summons.push({ type: "moon", angle: 0, orbit: 100, fireCd: 0.8, spin: 0 });
  }
  return p;
}

function freshGame(planet, difficulty) {
  return {
    time: 0,
    planet,
    difficulty,
    endless: Boolean(difficulty.endless),
    player: makePlayer(planet),
    cam: { x: 0, y: 0 },
    shake: 0,
    flash: 0,
    hurtFlash: 0,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    gems: [],
    particles: [],
    texts: [],
    shockwaves: [],
    kills: 0,
    level: 1,
    xp: 0,
    xpNext: 7,
    pendingLevels: 0,
    upgradeLevels: {},
    breakthroughs: {},
    novaTimer: 5.5,
    spawnTimer: 0.9,
    eliteTimer: 55 / (difficulty.eliteRate || 1),
    bossSpawned: false,
    bossWarned: false,
    bossDefeated: false,
    boss: null,
    victoryTimer: 0,
    lastWave: "",
    gravityTipShown: false,
    toastUntil: 0,
    eventTimer:
      rand(36, 48) * (difficulty.eventIntervalMult || 1),
    meteorWave: 0,
    meteorWaveTimer: 0,
    meteorWaveTarget: 0,
    lineHazards: [],
    safeZones: [],
    safeZoneWavesRemaining: 0,
    safeZoneNextTimer: 0,
    safeZoneWaveNumber: 0,
    safeZoneTotalWaves: 0,
    safeZoneWarningDuration: 0,
    deadlineSpawnTimer: 0,
    hazards: [],
    tideTimer: 0,
    activeEvent: null,
    lastEventId: null,
    riftEnemies: [],
    satelliteBombs: [],
    flarePulsesRemaining: 0,
    flarePulseTimer: 0,
    warpTrails: [],
    warpGhosts: [],
    satelliteLaserVisuals: [],
    laserScars: [],
    singularities: [],
    endlessBossKills: 0,
    nextBossIn: 0,
  };
}

function startGame(planetId = selectedPlanetId, difficultyId = selectedDifficultyId) {
  clearResultLock();
  let planet = PLANET_BY_ID[planetId] || PLANETS[0];
  let difficulty = DIFFICULTY_BY_ID[difficultyId] || DIFFICULTIES[0];
  if (difficulty.endless && !endlessUnlocked) difficulty = DIFFICULTIES[0];
  selectedPlanetId = planet.id;
  selectedDifficultyId = difficulty.id;
  writeStorage("planetcore-last-planet", planet.id);
  writeStorage("planetcore-last-difficulty", difficulty.id);
  audio.unlock();
  cancelGravity();
  G = freshGame(planet, difficulty);
  G.sunAutoAttack = planet.id === "sun" && sunAutoAttack;
  markCodex("planets", planet.id);
  state = "playing";
  keys.clear();
  pointer.active = false;
  el.menu.classList.add("hidden");
  el.loadout.classList.add("hidden");
  el.codex.classList.add("hidden");
  el.levelup.classList.add("hidden");
  el.pause.classList.add("hidden");
  el.gameover.classList.add("hidden");
  el.victory.classList.add("hidden");
  el.unlockNote.classList.add("hidden");
  el.hud.classList.remove("hidden");
  el.bossWrap.classList.add("hidden");
  el.cards.replaceChildren();
  el.tips.style.opacity = "1";
  audio.startAmbient();
  audio.startMusic();
  audio.setMusicIntensity("normal");
  showToast(
    `${planet.name} · ${difficulty.name} · ${
      planet.id === "voidstar"
        ? "点击跃迁 · 空格满充能塌缩"
        : `${coarsePointer ? "右下角按钮" : "空格 / 右键"}：${planet.abilityAction}${
            planet.id === "sun"
              ? ` · 自动攻击${G.sunAutoAttack ? "开" : "关"}`
              : ""
          }`
    }`,
    "good",
    3200,
  );
  lastFrame = performance.now();
  updateHUD(true);
  focusGame();
}

function goMenu() {
  clearResultLock();
  state = "menu";
  cancelGravity();
  G = null;
  keys.clear();
  pointer.active = false;
  audio.stopAmbient();
  audio.stopMusic();
  el.hud.classList.add("hidden");
  el.loadout.classList.add("hidden");
  el.codex.classList.add("hidden");
  el.levelup.classList.add("hidden");
  el.pause.classList.add("hidden");
  el.gameover.classList.add("hidden");
  el.victory.classList.add("hidden");
  el.bossWrap.classList.add("hidden");
  el.menu.classList.remove("hidden");
}

function openLoadout() {
  audio.unlock();
  cancelGravity();
  state = "loadout";
  el.menu.classList.add("hidden");
  el.codex.classList.add("hidden");
  el.loadout.classList.remove("hidden");
  renderLoadout();
}

function renderLoadout() {
  el.planetChoices.replaceChildren();
  for (const planet of PLANETS) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `planet-card${planet.id === selectedPlanetId ? " selected" : ""}`;
    card.setAttribute("aria-label", `${planet.name}，${planet.tag}`);

    const orb = document.createElement("div");
    orb.className = "planet-orb";
    orb.style.background = `radial-gradient(circle at 34% 28%, ${planet.colors[0]}, ${planet.colors[1]} 32%, ${planet.colors[2]} 64%, ${planet.colors[3]} 100%)`;
    orb.style.boxShadow = `0 0 0 1px rgba(255,255,255,.22) inset, 0 0 36px ${planet.colors[1]}55`;

    const name = document.createElement("h3");
    name.textContent = planet.name;
    const en = document.createElement("div");
    en.className = "planet-en";
    en.textContent = planet.en;
    const tag = document.createElement("div");
    tag.className = "planet-tag";
    tag.textContent = planet.tag;
    const desc = document.createElement("p");
    desc.className = "planet-desc";
    desc.textContent = planet.desc;
    const passive = document.createElement("div");
    passive.className = "planet-passive";
    const passiveName = document.createElement("b");
    passiveName.textContent = planet.passive;
    passive.append(passiveName, document.createTextNode(planet.passiveDesc));
    card.append(orb, name, en, tag, desc, passive);
    card.addEventListener("click", () => {
      selectedPlanetId = planet.id;
      writeStorage("planetcore-last-planet", planet.id);
      renderLoadout();
      audio.ui();
    });
    el.planetChoices.append(card);
  }

  el.difficultyChoices.replaceChildren();
  for (const difficulty of DIFFICULTIES) {
    const locked = difficulty.endless && !endlessUnlocked;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `diff-chip${difficulty.id === selectedDifficultyId ? " selected" : ""}`;
    chip.disabled = locked;
    chip.textContent = locked ? `${difficulty.name} · 通关解锁` : difficulty.name;
    chip.title = difficulty.desc;
    chip.addEventListener("click", () => {
      if (locked) return;
      selectedDifficultyId = difficulty.id;
      writeStorage("planetcore-last-difficulty", difficulty.id);
      renderLoadout();
      audio.ui();
    });
    el.difficultyChoices.append(chip);
  }

  const planet = PLANET_BY_ID[selectedPlanetId] || PLANETS[0];
  const difficulty = DIFFICULTY_BY_ID[selectedDifficultyId] || DIFFICULTIES[0];
  el.difficultyDesc.textContent = difficulty.desc;
  el.launchBtn.textContent = `驾驶${planet.name}进入深空`;
  renderSunAutoOption();
}

function renderSunAutoOption() {
  const isSun = selectedPlanetId === "sun";
  el.sunAutoOption.classList.toggle("hidden", !isSun);
  el.sunAutoBtn.classList.toggle("active", isSun && sunAutoAttack);
  el.sunAutoBtn.setAttribute("aria-checked", String(isSun && sunAutoAttack));
  el.sunAutoBtn.setAttribute("aria-label", `太阳自动攻击：${sunAutoAttack ? "开启" : "关闭"}`);
  el.sunAutoState.textContent = sunAutoAttack ? "开启" : "关闭";
  el.sunAutoDescription.textContent = sunAutoAttack
    ? "日冕蓄满后会立即自动发射激光"
    : "关闭时自动蓄力，需要按空格发射";
}

function openCodex(returnTo = "menu") {
  codexReturn = returnTo;
  if (returnTo === "pause") {
    el.pause.classList.add("hidden");
  } else {
    el.menu.classList.add("hidden");
  }
  state = "codex";
  el.codex.classList.remove("hidden");
  renderCodex();
  audio.ui();
}

function closeCodex() {
  el.codex.classList.add("hidden");
  if (codexReturn === "pause") {
    state = "paused";
    el.pause.classList.remove("hidden");
  } else {
    state = "menu";
    el.menu.classList.remove("hidden");
  }
  audio.ui();
}

function renderCodex() {
  const tabs = [
    ["planets", "星球"],
    ["enemies", "敌人"],
    ["upgrades", "强化"],
    ["breakthroughs", "突破"],
    ["events", "事件"],
  ];
  el.codexTabs.replaceChildren();
  for (const [id, label] of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `codex-tab${codexTab === id ? " active" : ""}`;
    button.textContent = label;
    button.addEventListener("click", () => {
      codexTab = id;
      renderCodex();
      audio.ui();
    });
    el.codexTabs.append(button);
  }

  el.codexBody.replaceChildren();
  if (codexTab === "planets") {
    for (const planet of PLANETS) {
      addCodexCard({
        icon: planet.icon,
        name: planet.name,
        meta: `${planet.en} · ${planet.tag}`,
        desc: planet.desc,
        tip: planet.passiveDesc,
        recorded: Boolean(codexProgress.planets?.[planet.id]),
      });
    }
  } else if (codexTab === "enemies") {
    for (const [id, type] of Object.entries(ENEMY_TYPES)) {
      if (id === "mini") continue;
      const lore = ENEMY_LORE[id] || { name: id, threat: "?", desc: "", tip: "" };
      addCodexCard({
        icon: id === "boss" ? "☠" : id === "rift" ? "◉" : "✹",
        name: lore.name,
        meta: `威胁 ${lore.threat} · ${type.hp} 基础生命`,
        desc: lore.desc,
        owner: id === "elite" ? "精英单位" : id === "boss" ? "Boss单位" : "",
        ownerKind: id === "elite" ? "elite" : id === "boss" ? "boss" : "",
        tip: lore.tip,
        recorded: Boolean(codexProgress.enemies?.[id]),
      });
    }
  } else if (codexTab === "upgrades") {
    const filters = [
      ["all", "全部"],
      ["general", "通用"],
      ...PLANETS.map((planet) => [planet.id, `${planet.name}专属`]),
    ];
    const filterBar = document.createElement("div");
    filterBar.className = "codex-upgrade-filters";
    for (const [id, label] of filters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `codex-filter${codexUpgradeFilter === id ? " active" : ""}`;
      button.textContent = label;
      button.addEventListener("click", () => {
        codexUpgradeFilter = id;
        renderCodex();
        audio.ui();
      });
      filterBar.append(button);
    }
    el.codexBody.append(filterBar);

    const filteredUpgrades = UPGRADES.filter((upgrade) => {
      if (codexUpgradeFilter === "all") return true;
      if (codexUpgradeFilter === "general") return !upgrade.planets;
      return upgrade.planets?.includes(codexUpgradeFilter);
    });
    for (const upgrade of filteredUpgrades) {
      const owner = upgrade.planets
        ? `${upgrade.planets.map((id) => PLANET_BY_ID[id]?.name || id).join(" / ")}专属`
        : "通用";
      addCodexCard({
        icon: upgrade.icon,
        name: upgrade.name,
        meta: `${upgrade.rare ? "稀有" : "常规"} · 最多 ${upgrade.max} 级`,
        desc: upgrade.desc,
        scope: upgrade.scope,
        owner,
        ownerKind: upgrade.planets ? "exclusive" : "general",
        tip: "升级时在三个随机强化中选择；未满级的强化才会再次出现。",
        recorded: Boolean(codexProgress.upgrades?.[upgrade.id]),
      });
    }
  } else if (codexTab === "breakthroughs") {
    for (const breakthrough of BREAKTHROUGHS) {
      const planetTag = breakthrough.planets
        .map((id) => PLANET_BY_ID[id]?.name || id)
        .join(" / ");
      addCodexCard({
        icon: breakthrough.icon,
        name: breakthrough.name,
        meta: "唯一突破",
        desc: breakthrough.desc,
        scope: breakthrough.scope,
        owner: `${planetTag}专属`,
        ownerKind: "exclusive",
        tip: `需要：${breakthrough.requirementText}。${breakthrough.tip}`,
        recorded: Boolean(codexProgress.breakthroughs?.[breakthrough.id]),
      });
    }
  } else {
    for (const event of EVENTS) {
      addCodexCard({
        icon: event.icon,
        name: event.name,
        meta: "特殊事件",
        desc: event.desc,
        tip: event.tip,
        recorded: Boolean(codexProgress.events?.[event.id]),
      });
    }
  }
}

function addCodexCard({ icon, name, meta, desc, scope, owner, ownerKind, tip, recorded }) {
  const card = document.createElement("article");
  card.className = "codex-card";
  const head = document.createElement("div");
  head.className = "codex-card-head";
  const iconBox = document.createElement("div");
  iconBox.className = "codex-icon";
  iconBox.textContent = icon;
  const titleBox = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = name;
  const metaText = document.createElement("div");
  metaText.className = "codex-meta";
  metaText.textContent = meta;
  const ownerBadge = document.createElement("span");
  ownerBadge.className = `codex-owner ${ownerKind || ""}`;
  ownerBadge.textContent = owner || "";
  titleBox.append(title, metaText, ownerBadge);
  head.append(iconBox, titleBox);
  const descEl = document.createElement("p");
  descEl.className = "codex-desc";
  descEl.textContent = desc;
  const scopeEl = document.createElement("div");
  scopeEl.className = "codex-scope";
  scopeEl.textContent = scope ? `作用：${scope}` : "";
  const tipEl = document.createElement("p");
  tipEl.className = "codex-tip";
  tipEl.textContent = tip;
  const badge = document.createElement("span");
  badge.className = `codex-recorded${recorded ? "" : " undiscovered"}`;
  badge.textContent = recorded ? "已记录" : "未记录";
  card.append(head, descEl, scopeEl, tipEl, badge);
  el.codexBody.append(card);
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    cancelGravity();
    keys.clear();
    pointer.active = false;
    el.pause.classList.remove("hidden");
    audio.ui();
  } else if (state === "paused") {
    state = "playing";
    el.pause.classList.add("hidden");
    audio.ui();
    lastFrame = performance.now();
    focusGame();
  }
}

function toggleMute() {
  audio.unlock();
  const muted = audio.toggle();
  refreshSoundLabels(muted);
  if (!muted) audio.ui();
}

function toggleMusic() {
  audio.unlock();
  audio.toggleMusic();
  refreshSoundLabels();
  if (!audio.musicMuted && state === "playing") audio.startMusic();
}

function setGravityHeld(value) {
  const held = Boolean(value);
  const canAct = G && G.player && state === "playing";
  gravityHeld = held;

  if (held && canAct) {
    const p = G.player;
    if (p.planetId === "earth") {
      toggleEarthOverdrive();
    } else if (p.planetId === "voidstar") {
      startVoidCollapse();
    } else if (p.planetId === "sun") {
      releaseSolarCharge();
    } else {
      p.gravityMinTimer = Math.max(p.gravityMinTimer, 0.16);
    }
  }

  refreshAbilityUI();
}

function focusGame() {
  try {
    canvas.focus({ preventScroll: true });
  } catch {
    /* ignore */
  }
}

function cancelGravity() {
  if (G && G.player) {
    G.player.gravityActive = false;
    G.player.gravityMinTimer = 0;
    G.player.gravityCharge = 0;
    G.player.gravityChargeTime = 0;
    G.player.gravityHoldTime = 0;
    G.player.gravityPerfect = false;
    G.player.gravityRechargeDelay = Math.max(G.player.gravityRechargeDelay, 0.5);
    for (const b of G.enemyBullets || []) {
      if (b.captured) {
        b.captured = false;
        b.captureTimer = 0;
        b.vx = rand(-150, 150);
        b.vy = rand(-150, 150);
      }
    }
  }
  setGravityHeld(false);
  if (el.gravityRow) el.gravityRow.classList.remove("active");
  if (el.gravityRow) el.gravityRow.classList.remove("full");
  if (el.gravityKey) el.gravityKey.textContent = "空格";
}

function refreshAbilityUI() {
  const p = G?.player;
  const planet = p ? PLANET_BY_ID[p.planetId] : null;
  const abilityActive =
    Boolean(
      p &&
        (p.gravityActive ||
          p.earthOverdriveActive ||
          p.voidCollapseActive ||
          (p.planetId === "sun" && p.laserState === "firing")),
    );
  if (el.gravityBtn) {
    el.gravityBtn.classList.toggle("active", abilityActive);
    el.gravityBtn.setAttribute(
      "aria-label",
      planet ? `${planet.abilityAction}：${planet.abilityLabel}` : "发动星球能力",
    );
  }
  if (el.abilityBtnLabel) el.abilityBtnLabel.textContent = planet?.abilityLabel || "能力";
  if (el.abilityBtnHint) {
    el.abilityBtnHint.textContent =
      p?.planetId === "sun"
        ? "FIRE"
        : p?.planetId === "earth"
          ? "TOGGLE"
          : p?.planetId === "voidstar"
            ? "FULL"
            : "HOLD";
  }
  if (el.abilityLabel) el.abilityLabel.textContent = planet?.abilityLabel || "能力";
}

function toggleEarthOverdrive() {
  const p = G?.player;
  if (!p || p.planetId !== "earth") return;
  if (p.earthOverdriveActive) {
    p.earthOverdriveActive = false;
    p.gravityRechargeDelay = 0.65;
    addText(p.x, p.y - p.radius - 18, "星轨减速", {
      color: "#9beeff",
      size: 13,
      life: 0.75,
    });
    audio.ui();
    return;
  }
  if (p.gravityEnergy < 10) {
    showToast("星轨充能不足", "", 1300);
    return;
  }
  p.earthOverdriveActive = true;
  p.gravityRechargeDelay = 0.65;
  burst(p.x, p.y, "#9beeff", 26, 180, 3.2, 0.65);
  showToast("星轨过载 · 移动与召唤攻速提升", "good", 1600);
  audio.gravityOn();
}

function releaseSolarCharge() {
  const p = G?.player;
  if (!p || p.planetId !== "sun" || p.laserState !== "charging") return;
  if (p.laserCharge < SOLAR_MIN_RELEASE) {
    showToast("日冕蓄力不足 · 至少达到 50%", "", 1100);
    addText(p.x, p.y - p.radius - 16, "蓄力不足", {
      color: "#9db4d8",
      size: 12,
      life: 0.65,
    });
    return;
  }
  const salvo = p.laserProgress >= p.laserProgressMax;
  startLaserSequence(salvo, p.laserCharge);
}

function startVoidCollapse() {
  const p = G?.player;
  if (!p || p.planetId !== "voidstar") return;
  if (p.voidCollapseActive) {
    showToast("黑洞一旦展开便无法主动结束", "", 1500);
    return;
  }
  if (p.gravityEnergy < p.gravityMax - 0.1) {
    showToast(
      `奇点尚未充满 · ${Math.ceil(p.gravityEnergy)}/${Math.ceil(p.gravityMax)}`,
      "",
      1400,
    );
    return;
  }
  p.voidCollapseActive = true;
  p.voidCollapseTick = 0;
  p.voidCollapsePull = 0;
  p.voidCollapseScaleBonus = 0;
  p.voidCollapseExtension = 0;
  p.voidCollapseKills = 0;
  p.gravityRechargeDelay = 0.8;
  p.invuln = Math.max(p.invuln, 0.2);
  showToast("绝对塌缩 · 黑洞展开", "good", 1800);
  burst(p.x, p.y, "#e7dcff", 48, 260, 4.4, 0.8);
  G.flash = Math.max(G.flash, 0.35);
  G.shake = Math.max(G.shake, 10);
  audio.gravityBurst();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  } catch {
    showToast("当前浏览器不支持全屏", "", 1800);
  }
}

document.addEventListener("fullscreenchange", () => {
  el.fullscreenBtn.textContent = document.fullscreenElement ? "⤢" : "⛶";
  el.fullscreenBtn.setAttribute("aria-label", document.fullscreenElement ? "退出全屏" : "进入全屏");
});

function refreshSoundLabels(muted = audio.muted) {
  const text = muted ? "声音：关" : "声音：开";
  el.menuSoundBtn.textContent = text;
  el.pauseSoundBtn.textContent = text;
  el.muteBtn.textContent = muted ? "🔇" : "🔊";
  el.muteBtn.setAttribute("aria-label", muted ? "打开声音" : "关闭声音");
  const musicText = audio.musicMuted ? "音乐：关" : "音乐：开";
  el.menuMusicBtn.textContent = musicText;
  el.pauseMusicBtn.textContent = musicText;
}

refreshSoundLabels();

el.startBtn.addEventListener("click", openLoadout);
el.launchBtn.addEventListener("click", () => startGame(selectedPlanetId, selectedDifficultyId));
el.loadoutBackBtn.addEventListener("click", () => {
  state = "menu";
  el.loadout.classList.add("hidden");
  el.menu.classList.remove("hidden");
});
el.sunAutoBtn.addEventListener("click", () => {
  sunAutoAttack = !sunAutoAttack;
  writeStorage("planetcore-sun-auto-attack", sunAutoAttack ? "1" : "0");
  renderSunAutoOption();
  audio.ui();
});
el.resumeBtn.addEventListener("click", togglePause);
el.pauseRestartBtn.addEventListener("click", () => startGame(selectedPlanetId, selectedDifficultyId));
el.pauseMenuBtn.addEventListener("click", goMenu);
el.retryBtn.addEventListener("click", () => {
  if (resultActionsReady()) startGame(selectedPlanetId, selectedDifficultyId);
});
el.goMenuBtn.addEventListener("click", () => {
  if (resultActionsReady()) goMenu();
});
el.againBtn.addEventListener("click", () => {
  if (resultActionsReady()) startGame(selectedPlanetId, selectedDifficultyId);
});
el.winMenuBtn.addEventListener("click", () => {
  if (resultActionsReady()) goMenu();
});
el.pauseBtn.addEventListener("click", togglePause);
el.fullscreenBtn.addEventListener("click", toggleFullscreen);
el.muteBtn.addEventListener("click", toggleMute);
el.menuSoundBtn.addEventListener("click", toggleMute);
el.pauseSoundBtn.addEventListener("click", toggleMute);
el.menuMusicBtn.addEventListener("click", toggleMusic);
el.pauseMusicBtn.addEventListener("click", toggleMusic);
el.codexBtn.addEventListener("click", () => openCodex("menu"));
el.pauseCodexBtn.addEventListener("click", () => openCodex("pause"));
el.codexCloseBtn.addEventListener("click", closeCodex);
el.rerollBtn.addEventListener("click", rerollCards);

window.addEventListener("keydown", (event) => {
  const code = event.code;
  lastKey = code;
  if (
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight" ||
    code === "Space"
  ) {
    event.preventDefault();
  }

  if (code === "Enter" || code === "Space") {
    if (state === "menu") {
      audio.unlock();
      openLoadout();
      return;
    }
    if (state === "loadout") {
      audio.unlock();
      startGame(selectedPlanetId, selectedDifficultyId);
      return;
    }
    if (state === "gameover" || state === "victory") {
      if (!resultActionsReady()) return;
      audio.unlock();
      startGame();
      return;
    }
  }

  if (code === "Space" && state === "playing") {
    event.preventDefault();
    if (event.repeat) return;
    setGravityHeld(true);
    return;
  }

  if (code === "KeyQ" && state === "playing" && G.player.planetId === "voidstar") {
    event.preventDefault();
    warpTo(mouseScreen.x || W / 2, mouseScreen.y || H / 2);
    return;
  }

  if (code === "Escape" || code === "KeyP") {
    if (state === "codex") {
      closeCodex();
      return;
    }
    if (state === "loadout") {
      state = "menu";
      el.loadout.classList.add("hidden");
      el.menu.classList.remove("hidden");
      return;
    }
    if (state === "playing" || state === "paused") {
      event.preventDefault();
      togglePause();
      return;
    }
  }

  if (code === "KeyM") {
    toggleMute();
    return;
  }

  if (code === "KeyF") {
    toggleFullscreen();
    return;
  }

  if (state === "levelup") {
    if (code === "KeyR") {
      event.preventDefault();
      rerollCards();
      return;
    }
    const match = /^(?:Digit|Numpad)([1-3])$/.exec(code);
    if (match) {
      event.preventDefault();
      chooseUpgradeByIndex(Number(match[1]) - 1);
    }
    return;
  }

  if (state === "playing") keys.add(code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Space") setGravityHeld(false);
});

window.addEventListener("blur", () => {
  keys.clear();
  setGravityHeld(false);
  pointer.active = false;
  if (state === "playing") togglePause();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setGravityHeld(false);
    if (state === "playing") togglePause();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (state !== "playing") return;
  audio.unlock();
  canvas.focus({ preventScroll: true });
  mouseScreen.x = event.clientX;
  mouseScreen.y = event.clientY;
  if (event.button === 2) {
    event.preventDefault();
    setGravityHeld(true);
    return;
  }
  if (G.player.planetId === "voidstar" && event.button === 0) {
    warpTo(event.clientX, event.clientY);
    return;
  }
  pointer.active = true;
  pointer.id = event.pointerId;
  pointer.touch = event.pointerType !== "mouse";
  pointer.startX = event.clientX;
  pointer.startY = event.clientY;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  mouseScreen.x = event.clientX;
  mouseScreen.y = event.clientY;
  if (!pointer.active || event.pointerId !== pointer.id) return;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

function endPointer(event) {
  if (event.button === 2) {
    setGravityHeld(false);
    return;
  }
  if (event.pointerId !== pointer.id) return;
  pointer.active = false;
  pointer.id = null;
}

canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

window.addEventListener("pointerup", (event) => {
  if (event.button === 2) setGravityHeld(false);
});
window.addEventListener("pointercancel", (event) => {
  if (event.button === 2) setGravityHeld(false);
});

el.gravityBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  audio.unlock();
  el.gravityBtn.setPointerCapture?.(event.pointerId);
  setGravityHeld(true);
});

for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
  el.gravityBtn.addEventListener(eventName, (event) => {
    event.preventDefault();
    setGravityHeld(false);
  });
}

function getMoveVector() {
  if (G && G.player && G.player.planetId === "voidstar") {
    return { x: 0, y: 0, length: 0 };
  }
  let x = 0;
  let y = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;

  if (pointer.active) {
    let dx = pointer.x - pointer.startX;
    let dy = pointer.y - pointer.startY;
    if (!pointer.touch) {
      dx = pointer.x - W / 2;
      dy = pointer.y - H / 2;
      if (Math.hypot(dx, dy) < 24) {
        dx = 0;
        dy = 0;
      }
    } else if (Math.hypot(dx, dy) < 9) {
      dx = 0;
      dy = 0;
    }
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      x += dx / length;
      y += dy / length;
    }
  }

  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  return { x, y, length: Math.min(1, length) };
}

function updateGame(dt) {
  const p = G.player;
  G.time += dt;
  G.flash = Math.max(0, G.flash - dt * 2.4);
  G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.2);
  G.shake = Math.max(0, G.shake - dt * 26);
  p.invuln = Math.max(0, p.invuln - dt);
  p.shieldTimer += dt;

  if (p.shieldMax > 0 && p.shieldTimer > 5) {
    p.shield = Math.min(p.shieldMax, p.shield + 16 * dt);
  }
  if (p.regen > 0 && p.hp > 0) {
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  }

  const move = getMoveVector();
  const moveSpeed =
    p.speed *
    (p.planetId === "jupiter" && p.gravityActive
      ? 0.78
      : p.planetId === "earth" && p.earthOverdriveActive
        ? 1.3
        : 1);
  p.vx = move.x * moveSpeed;
  p.vy = move.y * moveSpeed;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.trailTimer -= dt;
  if (move.length > 0.1 && p.trailTimer <= 0) {
    p.trailTimer = 0.045;
    addParticle(p.x - p.vx * 0.02, p.y - p.vy * 0.02, {
      color: "#6ff7ff",
      size: rand(2, 4.5),
      life: rand(0.25, 0.5),
      vx: rand(-16, 16),
      vy: rand(-16, 16),
      glow: true,
    });
  }

  const camEase = 1 - Math.exp(-9 * dt);
  G.cam.x = lerp(G.cam.x, p.x + p.vx * 0.08, camEase);
  G.cam.y = lerp(G.cam.y, p.y + p.vy * 0.08, camEase);

  updateGravity(dt);
  updateEvents(dt);
  updatePlanetPassive(dt);
  updateWarpEffects(dt);
  updateLaserScars(dt);
  updateSingularities(dt);
  updateSpawning(dt);
  updateEnemies(dt);
  updatePlayerWeapons(dt);
  updateSummons(dt);
  updateSatelliteBombs(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updateGems(dt);
  updateMoons(dt);
  updateNova(dt);
  updateShockwaves(dt);
  updateParticles(dt);
  updateTexts(dt);
  cleanup();

  if (G.bossDefeated && G.victoryTimer > 0) {
    G.victoryTimer -= dt;
    if (G.victoryTimer <= 0) {
      winGame();
      return;
    }
  }

  if (p.hp <= 0) {
    gameOver();
    return;
  }

  if (G.time > 11) el.tips.style.opacity = "0";

  if (G.time > 8 && !G.gravityTipShown) {
    G.gravityTipShown = true;
    showToast(
      G.player.planetId === "earth"
        ? "空格切换星轨过载；再次按下或耗尽充能后退出"
        : G.player.planetId === "sun"
          ? "日冕自动蓄力；按下空格释放激光"
          : G.player.planetId === "voidstar"
            ? "点击跃迁；充能全满后按空格展开黑洞"
            : "按住空格 / 右键展开引力；松手释放斥力",
      "good",
      3800,
    );
  }

  const label = waveLabel(G.time);
  if (label !== G.lastWave) {
    G.lastWave = label;
    el.waveLabel.textContent = label;
  }
}

function updateSpawning(dt) {
  if (G.bossSpawned) return;

  if (G.time >= BOSS_TIME - 10 && !G.bossWarned) {
    G.bossWarned = true;
    showToast("警告：虚空信号正在靠近", "", 3600);
    audio.bossWarn();
    G.shake = 12;
  }

  if (G.endless && G.endlessBossKills > 0) {
    G.nextBossIn = Math.max(0, G.nextBossIn - dt);
    if (G.nextBossIn <= 0) {
      spawnBoss();
      return;
    }
  } else if (G.time >= BOSS_TIME) {
    spawnBoss();
    return;
  }

  G.spawnTimer -= dt;
  if (G.spawnTimer <= 0) {
    const interval =
      Math.max(0.4, 0.95 - G.time * 0.00095) / (G.difficulty.spawnRate || 1);
    G.spawnTimer = interval * rand(0.82, 1.14);
    const count = 1 + Math.floor(G.time / 240);
    for (let i = 0; i < count && G.enemies.length < MAX_ENEMIES; i += 1) {
      spawnEnemy(pickEnemyType());
    }
  }

  if (G.time >= G.eliteTimer) {
    G.eliteTimer += 55 / (G.difficulty.eliteRate || 1);
    spawnElite();
  }
}

function pickEnemyType() {
  const t = G.time;
  const table = [["asteroid", 10]];
  if (t > 22) table.push(["comet", 4 + t / 70]);
  if (t > 70) table.push(["drone", 2 + t / 120]);
  if (t > 135) table.push(["splitter", 3 + t / 130]);
  if (t > 105) table.push(["shield", 2.4 + t / 190]);
  if (t > 165) table.push(["bomber", 2.2 + t / 210]);
  if (t > 230) table.push(["priest", 1.6 + t / 260]);
  let total = 0;
  for (const [, weight] of table) total += weight;
  let roll = Math.random() * total;
  for (const [type, weight] of table) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return "asteroid";
}

function spawnPoint() {
  const margin = 70;
  const p = G.player;
  if (Math.random() < W / (W + H)) {
    const side = Math.random() < 0.5 ? -1 : 1;
    return {
      x: p.x + side * (W / 2 + margin),
      y: p.y + rand(-H / 2 - margin, H / 2 + margin),
    };
  }
  const side = Math.random() < 0.5 ? -1 : 1;
  return {
    x: p.x + rand(-W / 2 - margin, W / 2 + margin),
    y: p.y + side * (H / 2 + margin),
  };
}

function spawnEnemy(type, x = null, y = null, options = {}) {
  if (G.enemies.length >= MAX_ENEMIES && type !== "boss" && type !== "rift") return null;
  const def = ENEMY_TYPES[type];
  if (!def) return null;
  const t = G.time;
  const hpScale = 1 + t * 0.004 + Math.pow(t / 120, 1.1) * 0.12;
  const dmgScale = 1 + t * 0.0025;
  const difficulty = G.difficulty || DIFFICULTIES[0];
  let sx = x;
  let sy = y;
  if (sx == null || sy == null) {
    const point = spawnPoint();
    sx = point.x;
    sy = point.y;
  }
  const shape = [];
  const points = randInt(8, 12);
  for (let i = 0; i < points; i += 1) {
    shape.push(rand(0.78, 1.16));
  }
  const e = {
    type,
    x: sx,
    y: sy,
    vx: 0,
    vy: 0,
    r: def.radius,
    hp: def.hp * hpScale * difficulty.enemyHp,
    maxHp: def.hp * hpScale * difficulty.enemyHp,
    speed:
      def.speed *
      (1 + Math.min(0.18, t * 0.00035)) *
      (difficulty.enemySpeed || 1) *
      rand(0.9, 1.1),
    damage: def.damage * dmgScale * difficulty.enemyDamage,
    xp: def.xp * (difficulty.xpMult || 1),
    color: def.color,
    accent: def.accent,
    mass: def.mass,
    elite: Boolean(def.elite),
    boss: Boolean(def.boss),
    splitter: Boolean(def.split),
    shooter: Boolean(def.shooter),
    shielded: Boolean(def.shielded),
    facing: 0,
    bomber: Boolean(def.bomber),
    priest: Boolean(def.priest),
    portal: Boolean(def.portal),
    station: Boolean(def.station),
    shape,
    rotation: rand(0, TAU),
    rotSpeed: rand(-1.4, 1.4),
    seed: rand(0, TAU),
    hitFlash: 0,
    moonCd: rand(0, 0.4),
    shootCd: rand(1.4, 3.1),
    summonCd: 6,
    slow: 0,
    phase: 1,
    fusing: false,
    fuse: 0,
    healCd: rand(2.5, 4),
    spawnCd: 1.2,
    burn: 0,
    burnDps: 0,
    burnTick: 0,
    dead: false,
    ...options,
  };
  if (options.hpMult) {
    e.hp *= options.hpMult;
    e.maxHp *= options.hpMult;
  }
  if (e.shielded) {
    e.facing = Math.atan2(G.player.y - e.y, G.player.x - e.x);
  }
  G.enemies.push(e);
  return e;
}

function spawnElite() {
  if (G.enemies.length >= MAX_ENEMIES - 4) return;
  const e = spawnEnemy("elite");
  if (!e) return;
  e.hp *= 1.8;
  e.maxHp = e.hp;
  e.r = 36;
  showToast("陨星领主进入战场", "good", 2400);
  G.shake = 8;
  audio.bossWarn();
}

function spawnBoss() {
  if (G.bossSpawned) return;
  G.bossSpawned = true;
  G.nextBossIn = 0;
  let keptAdds = 0;
  G.enemies = G.enemies.filter((e) => {
    if (e.boss || e.elite) return true;
    if (keptAdds < 28) {
      keptAdds += 1;
      return true;
    }
    burst(e.x, e.y, e.color, 8, 90, 3, 0.5);
    e.dead = true;
    return false;
  });
  const entrance = H * 0.5 + 90;
  const boss = spawnEnemy("boss", G.player.x, G.player.y - entrance);
  if (!boss) return;
  const difficultyScale = G.difficulty?.bossHp || 1;
  const endlessScale = 1 + (G.endlessBossKills || 0) * 0.55;
  boss.hp = (1600 + G.level * 80) * difficultyScale * endlessScale;
  boss.maxHp = boss.hp;
  boss.r = 64;
  boss.speed = 54 * (G.difficulty?.enemySpeed || 1);
  G.boss = boss;
  el.bossWrap.classList.remove("hidden");
  el.bossPhase.textContent = "第一阶段";
  showToast("虚空吞噬者苏醒", "", 3600);
  G.shake = 22;
  G.flash = 0.7;
  audio.bossWarn();
  audio.setMusicIntensity("boss");
}

function updateEnemies(dt) {
  const p = G.player;

  for (let i = 0; i < G.enemies.length; i += 1) {
    const e = G.enemies[i];
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.moonCd = Math.max(0, e.moonCd - dt);
    e.rotation += e.rotSpeed * dt;
    e.slow = Math.max(0, e.slow - dt * 0.75);
    if (e.shielded) {
      const targetFacing = Math.atan2(p.y - e.y, p.x - e.x);
      const facingDiff =
        ((targetFacing - e.facing + Math.PI) % TAU + TAU) % TAU - Math.PI;
      e.facing += clamp(facingDiff, -1.8 * dt, 1.8 * dt);
    }
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.25;
        damageEnemy(e, e.burnDps * 0.25, {
          color: "#ff8a3d",
          ignoreShield: true,
          knockback: 0,
        });
        if (e.dead) continue;
      }
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const speed = e.speed * (1 - e.slow * 0.55);

    if (e.portal) {
      e.spawnCd -= dt;
      e.rotation += dt * 0.8;
      if (e.spawnCd <= 0) {
        const power = G.difficulty.eventPower || 1;
        e.spawnCd = Math.max(1.15, 1.5 - (power - 1) * 0.5);
        const type = Math.random() < 0.58 ? "comet" : "drone";
        spawnEnemy(
          type,
          e.x + rand(-26, 26),
          e.y + rand(-26, 26),
          { summoned: true },
        );
        burst(e.x, e.y, "#a77bff", 10, 80, 2.6, 0.4);
      }
      continue;
    }

    if (e.bomber && !e.fusing && d < 128) {
      e.fusing = true;
      e.fuse = 1.05;
    }
    if (e.bomber && e.fusing) {
      e.fuse -= dt;
      e.vx *= 0.12;
      e.vy *= 0.12;
      if (e.fuse <= 0) {
        explodeBomber(e);
        continue;
      }
    }

    if (e.boss) {
      updateBoss(e, dt, d, nx, ny, speed);
    } else if (e.type === "drone") {
      const strafe = Math.sin(G.time * 1.7 + e.seed) > 0 ? 1 : -1;
      if (d > 340) {
        e.vx = nx * speed;
        e.vy = ny * speed;
      } else if (d < 235) {
        e.vx = -nx * speed * 0.8 - ny * speed * 0.55 * strafe;
        e.vy = -ny * speed * 0.8 + nx * speed * 0.55 * strafe;
      } else {
        e.vx = -ny * speed * 0.8 * strafe + nx * speed * 0.12;
        e.vy = nx * speed * 0.8 * strafe + ny * speed * 0.12;
      }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 720) {
        e.shootCd = rand(3.0, 4.2);
        spawnEnemyBullet(e.x, e.y, Math.atan2(dy, dx), 210, e.damage * 0.9, 5.2, "#ff7ba8");
        burst(e.x, e.y, "#ff9bbd", 3, 40, 2, 0.25);
      }
    } else if (e.priest) {
      const strafe = Math.sin(G.time * 1.3 + e.seed) > 0 ? 1 : -1;
      if (d > 350) {
        e.vx = nx * speed;
        e.vy = ny * speed;
      } else if (d < 245) {
        e.vx = -nx * speed * 0.9 - ny * speed * 0.45 * strafe;
        e.vy = -ny * speed * 0.9 + nx * speed * 0.45 * strafe;
      } else {
        e.vx = -ny * speed * 0.65 * strafe + nx * speed * 0.1;
        e.vy = nx * speed * 0.65 * strafe + ny * speed * 0.1;
      }
      e.healCd -= dt;
      if (e.healCd <= 0) {
        e.healCd = 4.6;
        for (const other of G.enemies) {
          if (other.dead || other === e || other.portal) continue;
          if (dist2(other.x, other.y, e.x, e.y) > 205 * 205) continue;
          other.hp = Math.min(other.maxHp, other.hp + other.maxHp * 0.07);
          addParticle(other.x, other.y, {
            color: "#c39bff",
            size: rand(2, 4),
            life: 0.55,
            vx: rand(-25, 25),
            vy: rand(-45, -10),
            glow: true,
          });
        }
        burst(e.x, e.y, "#c39bff", 10, 95, 2.6, 0.5);
      }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 650) {
        e.shootCd = rand(3.1, 4.1);
        spawnEnemyBullet(e.x, e.y, Math.atan2(dy, dx), 165, e.damage * 0.8, 6.5, "#c39bff");
      }
    } else if (e.type === "comet") {
      const wobble = Math.sin(G.time * 5.5 + e.seed) * 0.52;
      e.vx = nx * speed - ny * speed * wobble;
      e.vy = ny * speed + nx * speed * wobble;
    } else {
      e.vx = nx * speed;
      e.vy = ny * speed;
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    if (p.gravityActive) {
      const gdx = p.x - e.x;
      const gdy = p.y - e.y;
      const gd = Math.hypot(gdx, gdy) || 1;
      const field = gravityRadius();
      if (gd < field && gd > 2) {
        const strength =
          (1 - gd / field) *
          (e.boss ? 95 : e.elite ? 170 : 330) *
          (0.55 + 0.75 * p.gravityCharge) *
          p.gravityPullMult;
        e.x += (gdx / gd) * strength * dt;
        e.y += (gdy / gd) * strength * dt;
      }
    }

    if (e.type === "comet" && Math.random() < dt * 18) {
      addParticle(e.x - e.vx * 0.02, e.y - e.vy * 0.02, {
        color: "#48c9ff",
        size: rand(1.5, 3),
        life: rand(0.2, 0.4),
        vx: rand(-8, 8),
        vy: rand(-8, 8),
        glow: true,
      });
    }

    const hitDist = e.r + p.radius * 0.82;
    if (dist2(e.x, e.y, p.x, p.y) < hitDist * hitDist) {
      damagePlayer(e.damage, e.x, e.y);
      const push = e.boss ? 4 : 18;
      e.x -= nx * push;
      e.y -= ny * push;
      e.hitFlash = 0.12;
    }
  }
}

function explodeBomber(e) {
  if (e.dead) return;
  const radius = 100;
  const p = G.player;
  if (dist2(e.x, e.y, p.x, p.y) < (radius + p.radius * 0.6) ** 2) {
    damagePlayer(e.damage * 1.75, e.x, e.y);
  }
  burst(e.x, e.y, "#ff9b5c", 42, 260, 4.5, 0.8);
  burst(e.x, e.y, "#ff5f6d", 18, 190, 3.2, 0.55);
  G.shake = Math.max(G.shake, 11);
  G.flash = Math.max(G.flash, 0.2);
  audio.explode(1.2);
  killEnemy(e);
}

function updateBoss(e, dt, d, nx, ny, speed) {
  if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
    e.phase = 2;
    el.bossPhase.textContent = "第二阶段";
    showToast("吞噬者进入狂暴形态", "", 2200);
    G.shake = 18;
    G.flash = 0.5;
    audio.bossWarn();
  }

  if (d > 300) {
    e.vx = nx * speed;
    e.vy = ny * speed;
  } else {
    const side = Math.sin(G.time * 0.7 + e.seed) > 0 ? 1 : -1;
    e.vx = -ny * speed * 1.15 * side + nx * speed * 0.18;
    e.vy = nx * speed * 1.15 * side + ny * speed * 0.18;
  }

  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    const count = e.phase === 2 ? 24 : 14;
    const base = G.time * 0.55;
    for (let i = 0; i < count; i += 1) {
      const angle = base + (i * TAU) / count;
      spawnEnemyBullet(
        e.x,
        e.y,
        angle,
        e.phase === 2 ? 205 : 168,
        e.damage * 0.55,
        7.5,
        "#ff5d9e",
      );
    }
    e.shootCd = e.phase === 2 ? 1.5 : 2.15;
    G.shake = Math.max(G.shake, 5);
  }

  e.summonCd -= dt;
  if (e.summonCd <= 0) {
    e.summonCd = e.phase === 2 ? 5.2 : 7.4;
    const count = e.phase === 2 ? 6 : 4;
    for (let i = 0; i < count; i += 1) {
      const angle = (i * TAU) / count + rand(-0.2, 0.2);
      spawnEnemy(
        "comet",
        e.x + Math.cos(angle) * (e.r + 26),
        e.y + Math.sin(angle) * (e.r + 26),
      );
    }
    burst(e.x, e.y, "#ff5d9e", 24, 130, 4, 0.6);
  }
}

function updatePlayerWeapons(dt) {
  const p = G.player;
  if (p.weapon === "laser") {
    updateLaserWeapon(dt);
    return;
  }
  p.fireTimer -= dt;
  if (p.fireTimer > 0) return;
  const bossInRange =
    G.boss && !G.boss.dead && dist2(G.boss.x, G.boss.y, p.x, p.y) < 1100 * 1100
      ? G.boss
      : null;
  const target = bossInRange || nearestEnemy(p.x, p.y, 700);
  if (!target) return;
  p.fireTimer = p.fireInterval;
  p.angle = Math.atan2(target.y - p.y, target.x - p.x);
  const count = p.bulletCount;
  const spread = count > 1 ? 0.15 : 0;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    const angle = p.angle + offset + rand(-0.012, 0.012);
    const startX = p.x + Math.cos(angle) * (p.radius + 10);
    const startY = p.y + Math.sin(angle) * (p.radius + 10);
    G.bullets.push({
      x: startX,
      y: startY,
      px: startX,
      py: startY,
      vx: Math.cos(angle) * p.bulletSpeed,
      vy: Math.sin(angle) * p.bulletSpeed,
      r: p.bulletRadius,
      damage: p.damage,
      pierce: p.pierce,
      hits: 0,
      life: 1.55,
      dead: false,
      angle,
    });
  }
  burst(
    p.x + Math.cos(p.angle) * (p.radius + 8),
    p.y + Math.sin(p.angle) * (p.radius + 8),
    "#aefcff",
    3,
    55,
    2.2,
    0.2,
  );
  audio.shoot();
}

function updateLaserWeapon(dt) {
  const p = G.player;
  for (const visual of p.laserVisuals) visual.life -= dt;
  p.laserVisuals = p.laserVisuals.filter((visual) => visual.life > 0);

  if (p.laserState === "firing") {
    updateLaserSalvo(dt);
    return;
  }
  if (p.laserState === "recover") {
    p.laserTimer -= dt;
    if (p.laserTimer <= 0) {
      p.laserState = "idle";
      p.laserCharge = 0;
    }
    return;
  }

  const bossTarget =
    G.boss &&
    !G.boss.dead &&
    dist2(G.boss.x, G.boss.y, p.x, p.y) < LASER_RANGE * LASER_RANGE
      ? G.boss
      : null;
  const target = bossTarget || nearestEnemy(p.x, p.y, LASER_RANGE);
  if (p.laserState === "idle") {
    p.laserState = "charging";
    p.laserCharge = 0;
    p.laserHit = new Set();
    audio.laserCharge();
  }
  if (p.laserState === "charging") {
    if (target) {
      p.laserAngle = Math.atan2(target.y - p.y, target.x - p.x);
    } else {
      const aimX = G.cam.x + (mouseScreen.x - W / 2);
      const aimY = G.cam.y + (mouseScreen.y - H / 2);
      p.laserAngle = Math.atan2(aimY - p.y, aimX - p.x);
    }
    p.laserTarget = target;
    const stationary = Math.hypot(p.vx, p.vy) < 6;
    const chargeSpeed = stationary ? p.solarStillChargeMult : 1;
    p.laserCharge = Math.min(
      1,
      p.laserCharge + (dt * chargeSpeed) / Math.max(0.35, p.laserChargeTime),
    );
    if (Math.random() < dt * 34) {
      const along = rand(80, 620);
      const side = rand(-p.laserWidth, p.laserWidth);
      addParticle(
        p.x + Math.cos(p.laserAngle) * along - Math.sin(p.laserAngle) * side,
        p.y + Math.sin(p.laserAngle) * along + Math.cos(p.laserAngle) * side,
        {
          color: "#ffcf6b",
          size: rand(1.2, 2.6),
          life: rand(0.18, 0.35),
          vx: -Math.cos(p.laserAngle) * 160,
          vy: -Math.sin(p.laserAngle) * 160,
          glow: true,
        },
      );
    }
    if (G.sunAutoAttack && p.laserCharge >= 1) {
      releaseSolarCharge();
    }
    refreshAbilityUI();
  }
}

function clearBulletsAlongLaser(x1, y1, x2, y2, width) {
  let cleared = 0;
  for (const bullet of G.enemyBullets) {
    if (bullet.dead) continue;
    if (
      distanceToSegment(bullet.x, bullet.y, x1, y1, x2, y2) >
      width + bullet.r
    ) {
      continue;
    }
    bullet.dead = true;
    cleared += 1;
    if (cleared <= 24) {
      addParticle(bullet.x, bullet.y, {
        color: "#fff2b0",
        size: rand(1.4, 2.8),
        life: rand(0.25, 0.5),
        vx: rand(-70, 70),
        vy: rand(-70, 70),
        glow: true,
      });
    }
  }
  return cleared;
}

function startLaserSequence(salvo, chargePower = 1) {
  const p = G.player;
  const salvoCount = 6 + p.laserSalvoBonus;
  const angles = salvo
    ? Array.from(
        { length: salvoCount },
        () =>
          p.solarRadialSalvo
            ? rand(0, TAU)
            : p.laserAngle + rand(-Math.PI / 12, Math.PI / 12),
      )
    : [p.laserAngle];
  p.laserState = "firing";
  p.laserSalvoActive = salvo;
  p.laserFiringAngles = angles;
  p.laserShotIndex = 0;
  p.laserShotTimer = 0;
  p.laserTimer = (angles.length - 1) * 0.09 + 0.3;
  p.laserShotPower = clamp(chargePower, 0.08, 1);
  p.laserCharge = 1;
  if (salvo) {
    p.laserProgress = 0;
    audio.laserSalvo();
    addText(p.x, p.y - p.radius - 24, `过载齐射 · ${angles.length} 连`, {
      color: "#ffd166",
      size: 16,
      life: 0.9,
    });
    if (p.solarFlareImpact) {
      flarePulse();
      addText(p.x, p.y - p.radius - 42, "耀核冲击", {
        color: "#fff3c4",
        size: 17,
        life: 1.1,
      });
    }
  } else {
    p.laserProgress += 1;
  }
}

function updateLaserSalvo(dt) {
  const p = G.player;
  p.laserShotTimer -= dt;
  const angles = p.laserFiringAngles;
  if (p.laserShotIndex < angles.length && p.laserShotTimer <= 0) {
    const angle = angles[p.laserShotIndex];
    fireLaserBeam(angle, p.laserSalvoActive, p.laserShotIndex);
    p.laserShotIndex += 1;
    p.laserShotTimer = 0.09;
  }
  p.laserTimer -= dt;
  if (p.laserTimer <= 0 && p.laserShotIndex >= angles.length) {
    p.laserState = "recover";
    p.laserTimer = 0.22;
  }
}

function fireLaserBeam(beamAngle, salvo = false, index = 0) {
  const p = G.player;
  const range = LASER_RANGE;
  const power = clamp(p.laserShotPower || 1, 0.08, 1);
  const beamWidth = p.laserWidth * (0.58 + power * 1.72);
  const beamStrength = 0.5 + power * 1.7;
  const dx = Math.cos(beamAngle);
  const dy = Math.sin(beamAngle);
  const clearedBullets =
    p.solarBulletClear && power >= 0.97
      ? clearBulletsAlongLaser(
          p.x,
          p.y,
          p.x + dx * range,
          p.y + dy * range,
          beamWidth,
        )
      : 0;
  let hits = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const ex = e.x - p.x;
    const ey = e.y - p.y;
    const along = ex * dx + ey * dy;
    if (along < 0 || along > range) continue;
    const perp = Math.abs(ex * dy - ey * dx);
    if (perp > beamWidth + e.r) continue;
    hits += 1;
    const crit = Math.random() < p.crit;
    const damage =
      p.damage *
      p.laserDamageMult *
      beamStrength *
      (salvo ? 0.45 : 1) *
      (crit ? p.critMult : 1);
    damageEnemy(e, damage, {
      crit,
      color: "#ffd166",
      sourceX: p.x,
      sourceY: p.y,
    });
    if (p.laserBurnLevel > 0) {
      e.burn = Math.max(e.burn || 0, 2.4);
      e.burnDps = Math.max(
        e.burnDps || 0,
        p.damage * (0.2 + p.laserBurnLevel * 0.16),
      );
    }
  }
  if (clearedBullets > 0 && (!salvo || index === 0)) {
    addText(p.x, p.y - p.radius - 18, `日冕净界 · 清弹 ${clearedBullets}`, {
      color: "#ffe6a8",
      size: 13,
      life: 0.9,
    });
  }
  G.shake = Math.max(G.shake, salvo ? 4 : 8);
  G.flash = Math.max(G.flash, salvo ? 0.12 : 0.26);
  for (let i = 0; i < 10; i += 1) {
    const along = rand(40, range);
    const side = rand(-beamWidth, beamWidth);
    addParticle(
      p.x + dx * along - dy * side,
      p.y + dy * along + dx * side,
      {
        color: i % 3 ? "#ffcf6b" : "#fffbe2",
        size: rand(1.4, 3.4),
        life: rand(0.2, 0.5),
        vx: rand(-60, 60),
        vy: rand(-60, 60),
        glow: true,
      },
    );
  }
  p.laserVisuals.push({
    angle: beamAngle,
    life: 0.16,
    maxLife: 0.16,
    salvo,
    width: beamWidth,
  });
  if (p.laserVisuals.length > 18) p.laserVisuals.shift();
  if (G.breakthroughs.solarScar) {
    G.laserScars.push({
      x1: p.x,
      y1: p.y,
      x2: p.x + dx * range,
      y2: p.y + dy * range,
      width: beamWidth * 1.35,
      life: 2.2,
      maxLife: 2.2,
      tick: 0,
      dps: p.damage * beamStrength * 0.65,
    });
  }
  if (salvo) audio.laserBurstShot(index);
  else audio.laserFire();
  if (!salvo && hits > 0) {
    addText(p.x, p.y - p.radius - 22, `贯穿 ×${hits}`, {
      color: "#ffd166",
      size: 14,
      life: 0.8,
    });
  }
}

function nearestEnemy(x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function updateBullets(dt) {
  const p = G.player;
  for (const b of G.bullets) {
    if (b.dead) continue;
    if (b.missile) {
      if (!b.target || b.target.dead) {
        b.target = nearestEnemy(b.x, b.y, 900);
      }
      if (b.target && !b.target.dead) {
      const speed = Math.min(
        b.maxSpeed || 480,
        Math.max(390, Math.hypot(b.vx, b.vy)) + 210 * dt,
      );
      const lead = Math.min(0.28, Math.hypot(b.x - b.target.x, b.y - b.target.y) / 1400);
      const desired = Math.atan2(
        b.target.y + (b.target.vy || 0) * lead - b.y,
        b.target.x + (b.target.vx || 0) * lead - b.x,
      );
      let diff = ((desired - b.angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
      const turn = (b.turnRate || 6.2) * dt;
      b.angle += clamp(diff, -turn, turn);
      b.vx = Math.cos(b.angle) * speed;
      b.vy = Math.sin(b.angle) * speed;
      }
      b.trailTimer = (b.trailTimer || 0) - dt;
      if (b.trailTimer <= 0) {
        b.trailTimer = 0.035;
        addParticle(b.x, b.y, {
          color: Math.random() < 0.45 ? "#ffd166" : "#ff9b5c",
          size: rand(1.4, 2.8),
          life: rand(0.24, 0.42),
          vx: -b.vx * 0.05 + rand(-12, 12),
          vy: -b.vy * 0.05 + rand(-12, 12),
          glow: true,
        });
      }
    }
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || dist2(b.x, b.y, p.x, p.y) > 1500 * 1500) {
      b.dead = true;
      continue;
    }

    for (let j = 0; j < G.enemies.length; j += 1) {
      const e = G.enemies[j];
      if (e.dead) continue;
      if (b.hitSet?.has(e)) continue;
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;
      if (b.missile) {
        explodeSummonMissile(b);
        b.dead = true;
        break;
      }

      const crit = Math.random() < p.crit;
      const dmg = b.damage * (crit ? p.critMult : 1);
      damageEnemy(e, dmg, {
        crit,
        color: crit ? "#ffd166" : "#8ffbff",
        knockback: e.boss ? 0 : 16 / e.mass,
        sourceX: b.x,
        sourceY: b.y,
      });
      if (b.gravityWave) {
        b.hitSet.add(e);
        e.slow = Math.max(e.slow, 0.32);
        burst(e.x, e.y, "#bff6ff", 5, 90, 2.2, 0.3);
      }
      b.hits += 1;
      if (b.hits > b.pierce) {
        b.dead = true;
        break;
      }
    }
  }
}

function explodeSummonMissile(missile) {
  const radius = missile.blastRadius || 72;
  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
    if (dist2(missile.x, missile.y, enemy.x, enemy.y) > (radius + enemy.r * 0.35) ** 2) {
      continue;
    }
    damageEnemy(enemy, missile.damage, {
      color: "#ffd166",
      sourceX: missile.x,
      sourceY: missile.y,
      knockback: enemy.boss ? 0 : 24 / Math.max(0.5, enemy.mass),
    });
  }
  G.shockwaves.push({
    x: missile.x,
    y: missile.y,
    r: 8,
    maxR: radius,
    life: 0.38,
    maxLife: 0.38,
    damage: 0,
    hit: new Set(),
    color: [255, 209, 102],
  });
  burst(missile.x, missile.y, "#ffd166", 18, 150, 3, 0.5);
  G.shake = Math.max(G.shake, 4);
  audio.explode(0.6);
}

function damageEnemy(e, amount, opts = {}) {
  if (e.dead) return;
  let finalAmount = amount;
  if (e.shielded && !opts.ignoreShield && opts.sourceX != null) {
    const fx = Math.cos(e.facing);
    const fy = Math.sin(e.facing);
    const sx = opts.sourceX - e.x;
    const sy = opts.sourceY - e.y;
    const sl = Math.hypot(sx, sy) || 1;
    const facing = (fx * sx + fy * sy) / sl;
    if (facing > 0.5) {
      finalAmount *= 0.45;
      addText(e.x + rand(-4, 4), e.y - e.r - 5, "偏转", {
        color: "#8fd6ff",
        size: 11,
        life: 0.55,
      });
      burst(e.x, e.y, "#8fd6ff", 5, 70, 1.8, 0.25);
    }
  }
  if ((e.elite || e.boss) && G?.player?.heavyDamageMult) {
    finalAmount *= G.player.heavyDamageMult;
  }
  e.hp -= finalAmount;
  e.hitFlash = 0.12;
  if (opts.knockback && !e.boss && !e.elite) {
    const angle = Math.atan2(e.y - G.player.y, e.x - G.player.x);
    e.x += Math.cos(angle) * opts.knockback;
    e.y += Math.sin(angle) * opts.knockback;
  }
  const color = opts.color || "#8ffbff";
  burst(e.x, e.y, color, opts.crit ? 6 : 2, opts.crit ? 95 : 45, opts.crit ? 3 : 1.8, 0.28);

  if (opts.crit || e.boss || e.elite || Math.random() < 0.14) {
    addText(e.x + rand(-6, 6), e.y - e.r - 4, `${Math.round(finalAmount)}`, {
      color: opts.crit ? "#ffd166" : "#d9f8ff",
      size: opts.crit ? 17 : e.boss ? 14 : 12,
      crit: opts.crit,
    });
  }
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  G.kills += 1;
  const p = G.player;
  if (p?.voidCollapseActive && p.voidKillExtend) {
    p.voidCollapseKills += 1;
    const addedTime = Math.min(
      0.18,
      Math.max(0, 3 - p.voidCollapseExtension),
    );
    if (addedTime > 0) {
      p.voidCollapseExtension += addedTime;
      p.gravityEnergy = Math.min(
        p.gravityMax + p.voidCollapseDrain * 3,
        p.gravityEnergy + p.voidCollapseDrain * addedTime,
      );
    }
    p.voidCollapseScaleBonus = Math.min(
      0.45,
      p.voidCollapseScaleBonus + 0.015,
    );
    if (Math.random() < 0.35) {
      burst(e.x, e.y, "#e7dcff", 8, 85, 2.4, 0.4);
    }
  }
  markCodex("enemies", e.type);
  G.shake = Math.min(28, G.shake + (e.boss ? 26 : e.elite ? 9 : 1.1));
  const size = e.boss ? 4 : e.elite ? 2.2 : e.r / 16;
  burst(e.x, e.y, e.color, e.boss ? 90 : e.elite ? 34 : 10, e.boss ? 300 : 120, e.boss ? 7 : 3.4, 0.9);
  burst(e.x, e.y, "#ffffff", e.boss ? 28 : 5, e.boss ? 220 : 80, 2.2, 0.45);
  if (e.boss || e.elite || Math.random() < 0.16) audio.explode(size);

  if (e.portal) {
    G.riftEnemies = G.riftEnemies.filter((rift) => rift !== e && !rift.dead);
    const remaining = G.riftEnemies.length;
    if (G.activeEvent?.id === "rift" && remaining === 0) G.activeEvent = null;
    for (let i = 0; i < 12; i += 1) {
      dropGem(e.x + rand(-32, 32), e.y + rand(-32, 32), 3);
    }
    showToast(
      remaining === 0 ? "所有虚空裂隙关闭" : `裂隙关闭 · 剩余 ${remaining}`,
      "good",
      2000,
    );
  }

  if (e.splitter) {
    for (let i = 0; i < 3; i += 1) {
      const angle = rand(0, TAU);
      const mini = spawnEnemy(
        "mini",
        e.x + Math.cos(angle) * 18,
        e.y + Math.sin(angle) * 18,
      );
      if (mini) {
        mini.vx = Math.cos(angle) * 90;
        mini.vy = Math.sin(angle) * 90;
      }
    }
  }

  if (e.elite) {
    for (let i = 0; i < 8; i += 1) dropGem(e.x + rand(-22, 22), e.y + rand(-22, 22), 2);
    dropGem(e.x, e.y, 1, "heart");
  } else if (e.boss) {
    for (let i = 0; i < 26; i += 1) dropGem(e.x + rand(-50, 50), e.y + rand(-50, 50), 8);
    for (let i = 0; i < 3; i += 1) {
      dropGem(e.x + rand(-40, 40), e.y + rand(-40, 40), 1, "heart");
    }
    onBossDefeated(e);
  } else if (e.type === "mini") {
    if (Math.random() < 0.65) dropGem(e.x, e.y, 1);
  } else {
    dropGem(e.x, e.y, e.xp);
    if (Math.random() < 0.018) dropGem(e.x + 8, e.y, 1, "heart");
  }
}

function onBossDefeated(e) {
  if (G.endless) {
    G.endlessBossKills += 1;
    G.boss = null;
    G.bossSpawned = false;
    G.bossDefeated = false;
    G.nextBossIn = 45;
    G.player.invuln = 3;
    G.enemyBullets.length = 0;
    G.flash = 0.9;
    G.shake = 28;
    el.bossWrap.classList.add("hidden");
    showToast(`吞噬者崩解 · ${G.endlessBossKills} 只已击碎 · 下一只 45 秒后`, "good", 4200);
    burst(e.x, e.y, "#ffd166", 120, 420, 8, 1.5);
    burst(e.x, e.y, "#ff5d9e", 80, 330, 6, 1.2);
    audio.explode(3.5);
    audio.setMusicIntensity("normal");
    return;
  }
  G.boss = null;
  G.bossDefeated = true;
  G.victoryTimer = 2.7;
  G.player.invuln = 999;
  G.enemyBullets.length = 0;
  G.flash = 0.9;
  G.shake = 28;
  el.bossWrap.classList.add("hidden");
  showToast("吞噬者正在崩解", "good", 3000);
  burst(e.x, e.y, "#ffd166", 120, 420, 8, 1.5);
  burst(e.x, e.y, "#ff5d9e", 80, 330, 6, 1.2);
  audio.explode(3.5);
}

function spawnEnemyBullet(x, y, angle, speed, damage, r, color) {
  G.enemyBullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    damage,
    color: color || "#ff5d9e",
    life: 5,
    rotation: angle,
    captureTimer: 0,
    captured: false,
    orbitAngle: 0,
    dead: false,
  });
}

function updateEnemyBullets(dt) {
  const p = G.player;
  for (const b of G.enemyBullets) {
    if (b.dead) continue;
    b.life -= dt;
    b.rotation += dt * 2;
    if (b.life <= 0 || dist2(b.x, b.y, p.x, p.y) > 1800 * 1800) {
      b.dead = true;
      continue;
    }

    if (p.gravityActive) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const field = gravityRadius();
      if (d < field) {
        const pull = ((1 - d / field) * 720 + 120) * p.gravityPullMult;
        b.vx += (dx / d) * pull * dt;
        b.vy += (dy / d) * pull * dt;
        b.vx *= Math.pow(0.55, dt);
        b.vy *= Math.pow(0.55, dt);
        if (d < field * 0.44) {
          b.captureTimer += dt;
        } else {
          b.captureTimer = Math.max(0, b.captureTimer - dt * 0.6);
        }
        if (b.captureTimer > 0.18) {
          b.captured = true;
          b.orbitAngle = Math.atan2(b.y - p.y, b.x - p.x);
          b.vx = 0;
          b.vy = 0;
        }
      }
    }

    if (b.captured) {
      if (!p.gravityActive) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        b.captured = false;
        b.captureTimer = 0;
        b.vx = (dx / d) * 185;
        b.vy = (dy / d) * 185;
      } else {
        b.orbitAngle += dt * 2.9;
        const orbit = 48 + Math.min(26, b.captureTimer * 34);
        b.x = p.x + Math.cos(b.orbitAngle) * orbit;
        b.y = p.y + Math.sin(b.orbitAngle) * orbit;
        continue;
      }
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (
      p.gravityActive &&
      b.captureTimer > 0.02 &&
      dist2(b.x, b.y, p.x, p.y) < (gravityRadius() * 0.55) ** 2
    ) {
      continue;
    }
    const rr = b.r + p.radius * 0.78;
    if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
      b.dead = true;
      damagePlayer(b.damage, b.x, b.y);
      burst(b.x, b.y, b.color, 8, 80, 2.4, 0.35);
    }
  }
}

function damagePlayer(amount, sourceX, sourceY) {
  const p = G.player;
  if (p.invuln > 0 || state !== "playing") return;
  let remaining = amount;
  if (p.planetId === "jupiter" && p.gravityActive && p.gravityMitigation > 0) {
    remaining *= 1 - p.gravityMitigation;
    burst(p.x, p.y, "#ffd166", 4, 70, 2, 0.25);
  }
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, remaining);
    p.shield -= absorbed;
    remaining -= absorbed;
    burst(p.x, p.y, "#a77bff", 10, 100, 3, 0.4);
  }
  if (remaining > 0) {
    p.hp -= remaining;
    addText(p.x + rand(-10, 10), p.y - p.radius - 10, `-${Math.round(remaining)}`, {
      color: "#ff8fa3",
      size: 15,
    });
  }
  p.invuln = 0.78;
  p.shieldTimer = 0;
  G.shake = Math.max(G.shake, 9);
  G.hurtFlash = 0.65;
  audio.hurt();

  const angle = Math.atan2(sourceY - p.y, sourceX - p.x);
  for (let i = 0; i < 8; i += 1) {
    addParticle(p.x, p.y, {
      color: i % 2 ? "#ff5f6d" : "#ffd166",
      size: rand(2, 4),
      life: rand(0.3, 0.6),
      vx: Math.cos(angle + rand(-1, 1)) * rand(40, 120),
      vy: Math.sin(angle + rand(-1, 1)) * rand(40, 120),
    });
  }

  if (p.hp <= 0) gameOver();
}

function updateGems(dt) {
  const p = G.player;
  for (const g of G.gems) {
    if (g.dead) continue;
    g.age += dt;
    g.rotation += dt * 2.6;
    if (!g.pulling) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= Math.pow(0.06, dt);
      g.vy *= Math.pow(0.06, dt);
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (
        (g.age > 0.28 && d2 < p.magnet * p.magnet) ||
        (g.age > 4.2 && d2 < 190 * 190) ||
        G.tideTimer > 0
      ) {
        g.pulling = true;
      }
    } else {
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = Math.min(820, (180 + g.age * 330) * p.magnetSpeedMult);
      g.x += (dx / d) * speed * dt;
      g.y += (dy / d) * speed * dt;
    }
    if (dist2(g.x, g.y, p.x, p.y) < (p.radius + 14) * (p.radius + 14)) {
      collectGem(g);
    }
  }
}

function dropGem(x, y, value, type = "xp") {
  if (G.gems.length >= MAX_GEMS) {
    const oldest = G.gems.shift();
    if (oldest && !oldest.dead) collectGem(oldest, true);
  }
  G.gems.push({
    x,
    y,
    vx: rand(-70, 70),
    vy: rand(-70, 70),
    value,
    type,
    age: 0,
    rotation: rand(0, TAU),
    pulling: false,
    dead: false,
  });
}

function collectGem(g, silent = false) {
  if (g.dead) return;
  g.dead = true;
  const p = G.player;
  if (g.type === "heart") {
    p.hp = Math.min(p.maxHp, p.hp + 20);
    addText(g.x, g.y - 8, "+20", { color: "#ff9bbb", size: 15 });
    burst(g.x, g.y, "#ff5d9e", 10, 90, 2.6, 0.5);
    if (!silent) audio.pickup(8);
  } else {
    addXp(g.value);
    if (!silent) audio.pickup(Math.min(6, G.level));
    burst(g.x, g.y, "#ffd166", 3, 55, 1.7, 0.25);
  }
}

function addXp(amount) {
  G.xp += amount;
  while (G.xp >= G.xpNext) {
    G.xp -= G.xpNext;
    G.level += 1;
    G.xpNext = Math.ceil(G.xpNext * 1.18 + 4);
    G.pendingLevels += 1;
  }
  if (G.pendingLevels > 0 && state === "playing") {
    showLevelUp();
  }
}

function updateSummons(dt) {
  const p = G.player;
  for (const visual of G.satelliteLaserVisuals) visual.life -= dt;
  G.satelliteLaserVisuals = G.satelliteLaserVisuals.filter(
    (visual) => visual.life > 0,
  );
  if (p.summons.length === 0 && p.satelliteMax <= 0) return;

  const satellites = p.summons.filter((summon) => summon.type === "satellite").length;
  if (p.satelliteMax > 0) {
    p.satelliteTimer -= dt;
    if (p.satelliteTimer <= 0) {
      if (satellites < p.satelliteMax) {
        p.satelliteTimer = p.satelliteInterval;
        addSatellite();
      } else {
        p.satelliteTimer = p.satelliteInterval * p.satelliteBombIntervalMult;
        launchSatelliteBomb();
      }
    }
  }

  for (const summon of p.summons) {
    const speed = summon.type === "moon" ? 0.72 : 1.05;
    summon.angle += dt * speed;
    const sx = p.x + Math.cos(summon.angle) * summon.orbit;
    const sy = p.y + Math.sin(summon.angle) * summon.orbit;
    if (summon.type === "satellite" && summon.beamCharge > 0) {
      const beamTarget = summonTarget(sx, sy, 650);
      if (beamTarget) {
        summon.beamAngle = Math.atan2(beamTarget.y - sy, beamTarget.x - sx);
      }
      summon.beamCharge -= dt;
      if (summon.beamCharge <= 0) {
        fireSatelliteLaser(sx, sy, summon);
        summon.beamCharge = 0;
      }
      continue;
    }
    summon.fireCd -= dt;
    if (summon.fireCd > 0) continue;
    const target = summonTarget(sx, sy, summon.type === "moon" ? 680 : 600);
    if (!target) continue;
    const angle = Math.atan2(target.y - sy, target.x - sx);
    const overdriveRate = p.earthOverdriveActive ? 2 : 1;
    if (summon.type === "moon") {
      const moonShots =
        p.summonBulletCount * (G.breakthroughs.earthArray ? 2 : 1);
      const moonDamageScale = moonShots > 1 ? 1 / Math.sqrt(moonShots) : 1;
      for (let shot = 0; shot < moonShots; shot += 1) {
        const shotAngle =
          angle + (moonShots > 1 ? (shot - (moonShots - 1) / 2) * 0.075 : 0);
        G.bullets.push({
          x: sx,
          y: sy,
          px: sx,
          py: sy,
          vx: Math.cos(shotAngle) * 410,
          vy: Math.sin(shotAngle) * 410,
          r: Math.max(10, p.bulletRadius * 3.6),
          damage:
            p.damage *
            p.summonDamageMult *
            0.72 *
            moonDamageScale,
          pierce: moonShots > 1 ? 6 : 5,
          hits: 0,
          hitSet: new Set(),
          life: 0.95,
          dead: false,
          angle: shotAngle,
          summon: true,
          gravityWave: true,
        });
      }
      summon.fireCd =
        (1.75 / (p.summonFireMult * overdriveRate)) * rand(0.9, 1.1);
      burst(sx, sy, "#bff6ff", 7, 85, 2.5, 0.34);
      p.summonShots += 1;
      continue;
    }
    const stationRate = p.spaceStationLevel > 0 ? 1.25 : 1;
    const stationDamage = p.spaceStationLevel > 0 ? 1.2 : 1;
    const arrayBreak = Boolean(G.breakthroughs.earthArray);
    if (p.satelliteArsenal) {
      summon.weaponCycle = Math.floor(Math.random() * 3);
      if (summon.weaponCycle === 1) {
        const missileShots =
          p.summonBulletCount * (arrayBreak ? 2 : 1);
        const missileDamageScale =
          missileShots > 1 ? 1 / Math.sqrt(missileShots) : 1;
        for (let shot = 0; shot < missileShots; shot += 1) {
          const shotAngle =
            angle +
            (missileShots > 1
              ? (shot - (missileShots - 1) / 2) * 0.11
              : 0);
          G.bullets.push({
            x: sx,
            y: sy,
            px: sx,
            py: sy,
            vx: Math.cos(shotAngle) * 390,
            vy: Math.sin(shotAngle) * 390,
            r: Math.max(4.4, p.bulletRadius * 1.05),
            damage:
              p.damage *
              p.summonDamageMult *
              stationDamage *
              0.9 *
              missileDamageScale,
            pierce: 0,
            hits: 0,
            life: 2.8,
            dead: false,
            angle: shotAngle,
            target,
            missile: true,
            turnRate: 6.2,
            maxSpeed: 480,
            blastRadius: 72,
            trailTimer: 0,
            summon: true,
          });
        }
        summon.fireCd =
          (2.25 /
            (p.summonFireMult * overdriveRate * stationRate)) *
          rand(0.9, 1.1);
        p.summonShots += missileShots;
        p.satelliteMissiles += missileShots;
        burst(sx, sy, "#ffd166", 4, 65, 2, 0.28);
        continue;
      }
      if (summon.weaponCycle === 2) {
        summon.beamCharge = Math.max(0.24, 0.42 / p.summonFireMult);
        summon.beamChargeMax = summon.beamCharge;
        summon.beamAngle = angle;
        summon.fireCd =
          (2.4 /
            (p.summonFireMult * overdriveRate * stationRate)) *
          rand(0.92, 1.08);
        burst(sx, sy, "#9beeff", 6, 55, 1.8, 0.3);
        continue;
      }
    }
    const shots = p.summonBulletCount * (arrayBreak ? 2 : 1);
    const shotDamageScale = shots > 1 ? 1 / Math.sqrt(shots) : 1;
    const damage =
      p.damage *
      p.summonDamageMult *
      stationDamage *
      0.4 *
      shotDamageScale;
    for (let shot = 0; shot < shots; shot += 1) {
      const shotAngle = angle + (shots > 1 ? (shot - (shots - 1) / 2) * 0.055 : 0);
      G.bullets.push({
        x: sx,
        y: sy,
        px: sx,
        py: sy,
        vx: Math.cos(shotAngle) * 690,
        vy: Math.sin(shotAngle) * 690,
        r: Math.max(2.2, p.bulletRadius * (summon.type === "moon" ? 0.86 : 0.72)),
        damage,
        pierce: arrayBreak ? 1 : 0,
        hits: 0,
        life: 1.3,
        dead: false,
        angle: shotAngle,
        summon: true,
      });
      p.summonShots += 1;
    }
    summon.fireCd =
      (1.65 / (p.summonFireMult * overdriveRate * stationRate)) *
      rand(0.9, 1.1);
    burst(sx, sy, summon.type === "moon" ? "#e7f4ff" : "#9beeff", 2, 40, 1.6, 0.22);
  }
}

function fireSatelliteLaser(sx, sy, summon) {
  const p = G.player;
  const target = summonTarget(sx, sy, 680);
  const angle = target
    ? Math.atan2(target.y - sy, target.x - sx)
    : summon.beamAngle || 0;
  const range = 680;
  const width = Math.max(7, p.laserWidth * 0.36);
  const stationDamage = p.spaceStationLevel > 0 ? 1.2 : 1;
  const damage = p.damage * p.summonDamageMult * stationDamage * 0.78;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
    const ex = enemy.x - sx;
    const ey = enemy.y - sy;
    const along = ex * dx + ey * dy;
    if (along < 0 || along > range) continue;
    const perpendicular = Math.abs(ex * dy - ey * dx);
    if (perpendicular > width + enemy.r) continue;
    const crit = Math.random() < p.crit;
    damageEnemy(enemy, damage * (crit ? p.critMult : 1), {
      crit,
      color: "#9beeff",
      sourceX: sx,
      sourceY: sy,
      ignoreShield: false,
    });
  }
  G.satelliteLaserVisuals.push({
    x1: sx,
    y1: sy,
    x2: sx + dx * range,
    y2: sy + dy * range,
    width,
    life: 0.18,
    maxLife: 0.18,
  });
  burst(sx, sy, "#bff6ff", 8, 95, 2.2, 0.34);
  p.summonShots += 1;
  p.satelliteLaserShots += 1;
}

function addSatellite() {
  const p = G.player;
  const count = p.summons.filter((summon) => summon.type === "satellite").length;
  p.summons.push({
    type: "satellite",
    angle: rand(0, TAU),
    orbit: 55 + count * 13,
    fireCd: rand(0.4, 1.1),
    weaponCycle: 0,
    beamCharge: 0,
    beamAngle: 0,
  });
  showToast(`人造卫星 ${count + 1} 号入轨`, "good", 2000);
  burst(p.x, p.y, "#9beeff", 24, 160, 3, 0.65);
  audio.event();
}

function launchSatelliteBomb() {
  const p = G.player;
  const satellites = p.summons.filter((summon) => summon.type === "satellite");
  const source = satellites[satellites.length - 1];
  if (!source) return;
  const sx = p.x + Math.cos(source.angle) * source.orbit;
  const sy = p.y + Math.sin(source.angle) * source.orbit;
  p.summons = p.summons.filter((summon) => summon !== source);
  const replacementCount = p.summons.filter((summon) => summon.type === "satellite").length;
  p.summons.push({
    type: "satellite",
    angle: source.angle + Math.PI + rand(-0.25, 0.25),
    orbit: 55 + replacementCount * 13,
    fireCd: rand(0.5, 1.2),
    weaponCycle: 0,
    beamCharge: 0,
    beamAngle: 0,
  });
  burst(sx, sy, "#9beeff", 16, 120, 2.6, 0.5);
  const target = summonTarget(sx, sy, 780);
  const angle = target ? Math.atan2(target.y - sy, target.x - sx) : p.angle;
  G.satelliteBombs.push({
    x: sx,
    y: sy,
    angle,
    vx: Math.cos(angle) * 430,
    vy: Math.sin(angle) * 430,
    life: 2.2,
    maxLife: 2.2,
    radius: 95 * p.satelliteBombRadiusMult,
    damage: p.damage * 3.2 * p.summonDamageMult * p.satelliteBombDamageMult,
    target,
    trail: 0,
    dead: false,
  });
  p.satelliteBombsLaunched += 1;
  showToast("卫星脱离轨道 · 自毁冲击", "good", 1600);
  audio.event();
}

function updateSatelliteBombs(dt) {
  for (const bomb of G.satelliteBombs) {
    if (bomb.dead) continue;
    bomb.life -= dt;
    bomb.trail -= dt;
    if (bomb.target && !bomb.target.dead) {
      const desired = Math.atan2(bomb.target.y - bomb.y, bomb.target.x - bomb.x);
      let diff = ((desired - bomb.angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
      bomb.angle += clamp(diff, -3.2 * dt, 3.2 * dt);
      bomb.vx = Math.cos(bomb.angle) * 430;
      bomb.vy = Math.sin(bomb.angle) * 430;
    }
    bomb.x += bomb.vx * dt;
    bomb.y += bomb.vy * dt;
    if (bomb.trail <= 0) {
      bomb.trail = 0.03;
      addParticle(bomb.x, bomb.y, {
        color: "#9beeff",
        size: rand(1.4, 2.8),
        life: rand(0.2, 0.4),
        vx: rand(-25, 25),
        vy: rand(-25, 25),
        glow: true,
      });
    }
    if (bomb.life <= 0) {
      explodeSatelliteBomb(bomb);
      continue;
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(bomb.x, bomb.y, e.x, e.y) <= (e.r + 10) ** 2) {
        explodeSatelliteBomb(bomb);
        break;
      }
    }
  }
  G.satelliteBombs = G.satelliteBombs.filter((bomb) => !bomb.dead);
}

function explodeSatelliteBomb(bomb) {
  if (bomb.dead) return;
  bomb.dead = true;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist2(bomb.x, bomb.y, e.x, e.y) <= (bomb.radius + e.r * 0.4) ** 2) {
      damageEnemy(e, bomb.damage, {
        color: "#9beeff",
        ignoreShield: true,
        knockback: e.boss ? 0 : 55 / e.mass,
      });
    }
  }
  G.shockwaves.push({
    x: bomb.x,
    y: bomb.y,
    r: 16,
    maxR: bomb.radius * 1.1,
    life: 0.45,
    maxLife: 0.45,
    damage: 0,
    hit: new Set(),
    color: [143, 214, 255],
  });
  burst(bomb.x, bomb.y, "#9beeff", 30, 220, 4, 0.65);
  burst(bomb.x, bomb.y, "#ffffff", 12, 150, 2.4, 0.4);
  G.shake = Math.max(G.shake, 6);
  audio.explode(0.9);
}

function summonTarget(x, y, maxDist) {
  if (
    G.boss &&
    !G.boss.dead &&
    dist2(x, y, G.boss.x, G.boss.y) < Math.min(900, maxDist + 180) ** 2
  ) {
    return G.boss;
  }
  return nearestEnemy(x, y, maxDist);
}

function updateMoons(dt) {
  const p = G.player;
  if (p.moons <= 0) return;
  for (let i = 0; i < p.moons; i += 1) {
    const angle = G.time * 2.35 + (i * TAU) / p.moons;
    const orbit = 76 + i * 17;
    const mx = p.x + Math.cos(angle) * orbit;
    const my = p.y + Math.sin(angle) * orbit;
    const moonR = 10 + i * 2;
    for (const e of G.enemies) {
      if (e.dead || e.moonCd > 0) continue;
      const rr = moonR + e.r;
      if (dist2(mx, my, e.x, e.y) < rr * rr) {
        e.moonCd = 0.38;
        damageEnemy(e, p.damage * 0.85, {
          color: "#a77bff",
          knockback: e.boss ? 0 : 12,
          ignoreShield: true,
        });
        burst(mx, my, "#a77bff", 4, 65, 2.2, 0.3);
      }
    }
  }
}

function gravityRadiusFor(charge = 0) {
  const p = G.player;
  const tide = G.tideTimer > 0 ? 1.25 : 1;
  return p.gravityRadius * p.gravityRadiusMult * (0.75 + 0.5 * charge) * tide;
}

function gravityRadius() {
  return gravityRadiusFor(G.player.gravityActive ? G.player.gravityCharge : 0);
}

function updateGravity(dt) {
  const p = G.player;
  if (p.planetId !== "jupiter") {
    updatePlanetAbilityState(dt);
    return;
  }
  p.gravityReleaseCd = Math.max(0, p.gravityReleaseCd - dt);
  if (!gravityHeld) p.gravityLock = false;
  p.gravityMinTimer = Math.max(0, p.gravityMinTimer - dt);

  const wanted =
    (gravityHeld || p.gravityMinTimer > 0) &&
    !p.gravityLock &&
    p.gravityEnergy > 0.6 &&
    p.gravityReleaseCd <= 0;
  if (wanted) {
    if (!p.gravityActive) {
      p.gravityActive = true;
      p.gravityCharge = 0;
      p.gravityChargeTime = 0;
      p.gravityHoldTime = 0;
      p.gravityCaptured = 0;
      p.gravityPerfect = false;
      p.gravityMinTimer = 0.16;
      audio.gravityOn();
      G.shake = Math.max(G.shake, 3);
    }
    p.gravityHoldTime += dt;
    p.gravityChargeTime += dt * p.gravityChargeSpeed;
    p.gravityCharge = Math.min(1, p.gravityChargeTime / 1.2);
    p.gravityPerfect = p.gravityCharge >= 0.97;
    p.gravityEnergy = Math.max(
      0,
      p.gravityEnergy - p.gravityDrain * dt * (G.tideTimer > 0 ? 0.72 : 1),
    );
    p.gravityRechargeDelay = 0.7;

    if (Math.random() < dt * 70) {
      const angle = rand(0, TAU);
      const radius = gravityRadius() * rand(0.72, 1.02);
      const px = p.x + Math.cos(angle) * radius;
      const py = p.y + Math.sin(angle) * radius;
      addParticle(px, py, {
        color: p.gravityPerfect
          ? "#ffd166"
          : Math.random() < 0.5
            ? "#a77bff"
            : "#6ff7ff",
        size: rand(1.4, 3),
        life: rand(0.28, 0.5),
        vx: -Math.cos(angle) * rand(240, 460),
        vy: -Math.sin(angle) * rand(240, 460),
        glow: true,
      });
    }

    if (p.gravityEnergy <= 0) releaseGravity(true);
  } else if (p.gravityActive) {
    releaseGravity(false);
  }

  if (!p.gravityActive) {
    p.gravityRechargeDelay = Math.max(0, p.gravityRechargeDelay - dt);
    if (p.gravityRechargeDelay <= 0) {
      const tideBoost = G.tideTimer > 0 ? 1.5 : 1;
      p.gravityEnergy = Math.min(
        p.gravityMax,
        p.gravityEnergy + p.gravityRecharge * tideBoost * dt,
      );
    }
    p.gravityCharge = Math.max(0, p.gravityCharge - dt * 3);
    p.gravityPerfect = false;
  }

  el.gravityRow.classList.toggle("active", p.gravityActive);
  el.gravityRow.classList.toggle("full", p.gravityActive && p.gravityPerfect);
  if (el.gravityKey) {
    if (p.gravityReleaseCd > 0.02) {
      el.gravityKey.textContent = "冷却";
    } else if (p.gravityActive) {
      el.gravityKey.textContent = p.gravityPerfect ? "满" : `${Math.round(p.gravityCharge * 100)}%`;
    } else {
      el.gravityKey.textContent = "空格";
    }
  }
  refreshAbilityUI();
}

function updatePlanetAbilityState(dt) {
  const p = G.player;
  p.gravityReleaseCd = Math.max(0, p.gravityReleaseCd - dt);
  p.gravityRechargeDelay = Math.max(0, p.gravityRechargeDelay - dt);
  const tideBoost = G.tideTimer > 0 ? 1.5 : 1;
  const recharge = () => {
    if (p.gravityRechargeDelay <= 0) {
      p.gravityEnergy = Math.min(
        p.gravityMax,
        p.gravityEnergy + p.gravityRecharge * tideBoost * dt,
      );
    }
  };

  if (p.planetId === "earth") {
    if (p.earthOverdriveActive) {
      p.gravityEnergy = Math.max(0, p.gravityEnergy - p.earthOverdriveDrain * dt);
      if (Math.random() < dt * 28) {
        const angle = rand(0, TAU);
        const radius = rand(58, 108);
        addParticle(p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius, {
          color: Math.random() < 0.5 ? "#9beeff" : "#ffd166",
          size: rand(1.5, 3.2),
          life: rand(0.25, 0.5),
          vx: -Math.cos(angle) * rand(80, 180),
          vy: -Math.sin(angle) * rand(80, 180),
          glow: true,
        });
      }
      if (p.gravityEnergy <= 0) {
        p.earthOverdriveActive = false;
        p.gravityRechargeDelay = 0.9;
        showToast("星轨过载结束 · 轨道正在充能", "", 1500);
      }
    } else {
      recharge();
    }
  } else if (p.planetId === "voidstar") {
    if (p.voidCollapseActive) {
      updateVoidCollapse(dt);
    } else {
      recharge();
    }
  } else if (p.planetId === "sun") {
    if (p.laserState !== "charging") {
      p.gravityEnergy = p.gravityMax;
    }
  }

  const abilityActive =
    p.earthOverdriveActive ||
    p.voidCollapseActive ||
    p.laserState === "charging" ||
    p.laserState === "firing";
  const abilityFull =
    (p.planetId === "voidstar" && p.gravityEnergy >= p.gravityMax - 0.1) ||
    (p.planetId === "earth" && p.earthOverdriveActive) ||
    (p.planetId === "sun" &&
      (p.laserCharge >= 0.97 || p.laserProgress >= p.laserProgressMax));
  el.gravityRow.classList.toggle("active", abilityActive);
  el.gravityRow.classList.toggle("full", abilityFull);
  if (el.gravityKey) {
    if (p.planetId === "earth") {
      el.gravityKey.textContent = p.earthOverdriveActive
        ? `${Math.ceil((p.gravityEnergy / p.gravityMax) * 100)}%`
        : p.gravityEnergy >= 10
          ? "就绪"
          : "充能";
    } else if (p.planetId === "sun") {
      const chargePercent = Math.round(p.laserCharge * 100);
      el.gravityKey.textContent = p.laserState === "charging"
        ? `${chargePercent}%${
            chargePercent < SOLAR_MIN_RELEASE * 100
              ? " · 锁定"
              : p.laserProgress >= p.laserProgressMax
                ? " · 齐射"
                : " · 可发射"
          }`
        : p.laserProgress >= p.laserProgressMax
          ? "过载"
          : "发射";
    } else if (p.planetId === "voidstar") {
      el.gravityKey.textContent = p.voidCollapseActive
        ? `${Math.ceil((p.gravityEnergy / p.gravityMax) * 100)}%`
        : p.gravityEnergy >= p.gravityMax - 0.1
          ? "就绪"
          : `${Math.floor((p.gravityEnergy / p.gravityMax) * 100)}%`;
    }
  }
  refreshAbilityUI();
}

function updateVoidCollapse(dt) {
  const p = G.player;
  const radius = 230 * p.eventHorizonMult * (1 + p.voidCollapseScaleBonus);
  p.gravityEnergy = Math.max(0, p.gravityEnergy - p.voidCollapseDrain * dt);
  p.invuln = Math.max(p.invuln, 0.16);
  p.voidCollapseTick -= dt;

  for (const b of G.enemyBullets) {
    if (b.dead) continue;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < radius * 1.25) {
      const pull = 420 + (1 - Math.min(1, d / (radius * 1.25))) * 860;
      b.x += (dx / d) * pull * dt;
      b.y += (dy / d) * pull * dt;
    }
    if (d < p.radius + 18) {
      b.dead = true;
      burst(b.x, b.y, "#e7dcff", 3, 70, 1.8, 0.25);
    }
  }

  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > radius + e.r || d < 2) continue;
    const weight = e.boss ? 0.12 : e.elite ? 0.42 : 1;
    const pull = (105 + (1 - d / (radius + e.r)) * 260) * weight * p.eventHorizonMult;
    e.x += (dx / d) * pull * dt;
    e.y += (dy / d) * pull * dt;
    e.slow = Math.max(e.slow, e.boss ? 0.12 : e.elite ? 0.3 : 0.55);
  }

  if (p.voidCollapseTick <= 0) {
    p.voidCollapseTick = 0.28;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(e.x, e.y, p.x, p.y) > (radius * 0.68 + e.r * 0.35) ** 2) continue;
      const heavyScale = e.boss ? 0.45 : e.elite ? 0.8 : 1;
      damageEnemy(e, p.damage * 0.72 * p.eventHorizonMult * heavyScale, {
        color: "#d8c5ff",
        ignoreShield: true,
        knockback: 0,
      });
    }
  }

  if (p.gravityEnergy <= 0) finishVoidCollapse();
}

function finishVoidCollapse() {
  const p = G.player;
  if (!p.voidCollapseActive) return;
  p.voidCollapseActive = false;
  p.gravityEnergy = 0;
  p.gravityRechargeDelay = 1.1;
  p.invuln = Math.max(p.invuln, 0.8);
  const radius = 300 * p.eventHorizonMult * (1 + p.voidCollapseScaleBonus);
  let survivors = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist2(e.x, e.y, p.x, p.y) > (radius + e.r * 0.45) ** 2) continue;
    survivors += 1;
    damageEnemy(e, p.damage * 5.2 * p.eventHorizonMult, {
      color: "#fff1b8",
      ignoreShield: true,
    });
    if (!e.dead && !e.boss) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const push = e.elite ? 170 : 280 / Math.max(0.5, e.mass);
      e.x += (dx / d) * push;
      e.y += (dy / d) * push;
    }
  }
  for (const b of G.enemyBullets) {
    if (!b.dead && dist2(b.x, b.y, p.x, p.y) < radius * radius) b.dead = true;
  }
  G.shockwaves.push({
    x: p.x,
    y: p.y,
    r: 30,
    maxR: radius,
    life: 0.72,
    maxLife: 0.72,
    damage: 0,
    hit: new Set(),
    color: [255, 233, 166],
  });
  burst(p.x, p.y, "#fff1b8", 72, 420, 5.5, 1);
  burst(p.x, p.y, "#9b7bff", 48, 320, 4, 0.8);
  G.flash = Math.max(G.flash, 0.72);
  G.shake = Math.max(G.shake, 20);
  showToast(`视界释放 · 击退 ${survivors} 个目标`, "good", 1800);
  audio.gravityBurst();
  audio.perfectRelease();
}

function releaseGravity(exhausted) {
  const p = G.player;
  if (!p.gravityActive) return;
  const charge = p.gravityCharge;
  const hold = p.gravityHoldTime;
  const strong = hold >= 0.35;
  const perfect = charge >= 0.97;
  const radius = gravityRadiusFor(charge);
  let captured = 0;

  p.gravityActive = false;
  p.gravityRechargeDelay = 0.7;
  p.gravityReleaseCd = p.gravityReleaseCdMax;
  p.gravityEnergy = Math.max(0, p.gravityEnergy - 6);
  if (exhausted) p.gravityLock = true;

  for (const b of G.enemyBullets) {
    if (b.dead) continue;
    const d2 = dist2(b.x, b.y, p.x, p.y);
    if (b.captured) {
      b.dead = true;
      captured += 1;
      burst(b.x, b.y, "#ffd166", 5, 95, 2.4, 0.3);
      continue;
    }
    if (strong && d2 < radius * radius) {
      const d = Math.sqrt(d2) || 1;
      b.vx += ((b.x - p.x) / d) * 260;
      b.vy += ((b.y - p.y) / d) * 260;
      b.captureTimer = 0;
    }
  }

  if (captured > 0) {
    p.gravityEnergy = Math.min(p.gravityMax, p.gravityEnergy + Math.min(28, captured * 2.5));
  }

  let hits = 0;
  for (let i = G.enemies.length - 1; i >= 0; i -= 1) {
    const e = G.enemies[i];
    if (e.dead) continue;
    const reach = radius + e.r * 0.45;
    if (dist2(e.x, e.y, p.x, p.y) > reach * reach) continue;
    hits += 1;
    const baseScale = strong ? 0.55 + 0.65 * charge : 0.28;
    const bulletBonus = 1 + Math.min(1.5, captured * 0.08);
    const dmg =
      p.damage *
      baseScale *
      p.gravityDamageMult *
      bulletBonus *
      (perfect ? 1.3 : 1) *
      (1 + Math.min(1.8, hits * 0.06));
    damageEnemy(e, dmg, {
      color: perfect ? "#ffd166" : "#c39bff",
      knockback: e.boss ? 0 : (150 + Math.min(90, hits * 4)) / e.mass,
      ignoreShield: true,
    });
  }

  G.shockwaves.push({
    x: p.x,
    y: p.y,
    r: 30,
    maxR: radius * (perfect ? 1.2 : 1.08),
    life: 0.5,
    maxLife: 0.5,
    damage: 0,
    hit: new Set(),
    color: perfect ? [255, 209, 102] : [167, 123, 255],
  });
  G.shake = Math.max(G.shake, 7 + Math.min(12, hits * 0.35) + (perfect ? 4 : 0));
  G.flash = Math.max(G.flash, perfect ? 0.42 : strong ? 0.3 : 0.16);
  burst(
    p.x,
    p.y,
    perfect ? "#ffd166" : "#a77bff",
    18 + Math.min(26, hits * 2) + captured * 2,
    230,
    3.4,
    0.55,
  );
  audio.gravityBurst();
  if (perfect) audio.perfectRelease();

  if (G.breakthroughs.tidalSingularity) {
    G.singularities.push({
      x: p.x,
      y: p.y,
      radius: 210,
      life: 2.5,
      maxLife: 2.5,
      tick: 0,
      damage: p.damage * 0.55,
      explodeDamage: p.damage * 3.4 * p.gravityDamageMult,
      dead: false,
    });
  }

  if (!strong) {
    addText(p.x, p.y - p.radius - 16, "微力释放", { color: "#9db4d8", size: 12, life: 0.7 });
  } else if (hits >= 6 || captured >= 3) {
    addText(
      p.x,
      p.y - p.radius - 18,
      `${perfect ? "完美引力" : "引力释放"} ×${hits}${captured ? ` · 吸弹 ${captured}` : ""}`,
      { color: perfect ? "#ffd166" : "#d8c5ff", size: perfect ? 16 : 14, life: 1 },
    );
  }

  p.gravityCharge = 0;
  p.gravityChargeTime = 0;
  p.gravityHoldTime = 0;
  p.gravityCaptured = 0;
  p.gravityPerfect = false;
}

function updatePlanetPassive(dt) {
  const p = G.player;
  if (p.planetId === "earth") {
    updateSpaceStation(dt);
  } else if (p.planetId === "jupiter") {
    p.stormTimer -= dt;
    if (p.stormTimer <= 0) {
      p.stormTimer = p.stormInterval;
      const radius = p.stormRadius;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist2(e.x, e.y, p.x, p.y) <= (radius + e.r * 0.4) ** 2) {
          damageEnemy(e, p.damage * 1.35, {
            color: "#ffd166",
            ignoreShield: true,
            knockback: e.boss ? 0 : 170 / e.mass,
          });
        }
      }
      for (const gem of G.gems) {
        if (dist2(gem.x, gem.y, p.x, p.y) < 380 * 380) gem.pulling = true;
      }
      G.shockwaves.push({
        x: p.x,
        y: p.y,
        r: 30,
        maxR: radius * 1.1,
        life: 0.55,
        maxLife: 0.55,
        damage: 0,
        hit: new Set(),
        color: [255, 209, 102],
      });
      G.shake = Math.max(G.shake, 8);
      burst(p.x, p.y, "#ffd166", 30, 260, 4, 0.7);
      audio.explode(0.7);
    }
  } else if (p.planetId === "voidstar") {
    updateEventHorizon(dt);
  }
}

function updateSpaceStation(dt) {
  const p = G.player;
  if (p.spaceStationLevel <= 0) return;
  p.spaceStationAngle += dt * 0.48;
  p.spaceStationDropCd -= dt;
  if (p.spaceStationDropCd > 0) return;
  p.spaceStationDropCd = 9;
  const sx = p.x + Math.cos(p.spaceStationAngle) * 148;
  const sy = p.y + Math.sin(p.spaceStationAngle) * 148;
  dropGem(sx, sy, 1, "heart");
  for (let i = 0; i < 4; i += 1) {
    dropGem(sx + rand(-14, 14), sy + rand(-14, 14), 1);
  }
  addText(sx, sy - 18, "空间站补给", {
    color: "#bff6ff",
    size: 12,
    life: 0.9,
  });
  burst(sx, sy, "#9beeff", 16, 105, 2.6, 0.5);
}

function updateEventHorizon(dt) {
  const p = G.player;
  if (p.warpCharges < p.warpChargesMax) {
    p.warpRecharge += dt;
    while (
      p.warpRecharge >= p.warpRechargeTime &&
      p.warpCharges < p.warpChargesMax
    ) {
      p.warpRecharge -= p.warpRechargeTime;
      p.warpCharges += 1;
    }
    if (p.warpCharges >= p.warpChargesMax) p.warpRecharge = 0;
  } else {
    p.warpRecharge = 0;
  }
  p.warpGuard = Math.max(0, p.warpGuard - dt);
  p.horizonTimer -= dt;
  const radius = 132 * p.eventHorizonMult;
  let closeHits = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const heavy = e.boss || e.elite;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < radius && d > 4) {
      if (heavy) {
        e.slow = Math.max(e.slow, 0.25);
      } else {
        const pull = (1 - d / radius) * 145 * p.eventHorizonMult;
        e.x += (dx / d) * pull * dt;
        e.y += (dy / d) * pull * dt;
        if (Math.random() < dt * 10) {
          addParticle(e.x, e.y, {
            color: "#b895ff",
            size: rand(1, 2.4),
            life: rand(0.2, 0.4),
            vx: (dx / d) * 80,
            vy: (dy / d) * 80,
            glow: true,
          });
        }
      }
    }
    if (d < 64 * p.eventHorizonMult) closeHits += 1;
  }
  if (p.horizonTimer <= 0) {
    p.horizonTimer = 0.34;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const heavy = e.boss || e.elite;
      const range = heavy ? radius * 1.55 : 64 * p.eventHorizonMult;
      if (dist2(e.x, e.y, p.x, p.y) <= (range + e.r * 0.4) ** 2) {
        const shear = heavy
          ? e.maxHp * (e.boss ? 0.0025 : 0.006) * p.eventHorizonMult
          : p.damage * 0.58 * p.eventHorizonMult;
        damageEnemy(e, shear, {
          color: heavy ? "#8fd6ff" : "#b895ff",
          ignoreShield: true,
          knockback: 0,
        });
        if (heavy) {
          e.slow = Math.max(e.slow, 0.35);
        }
      }
    }
  }

  for (const gem of G.gems) {
    if (dist2(gem.x, gem.y, p.x, p.y) < 270 * 270) gem.pulling = true;
  }
  if (closeHits > 0 && Math.random() < dt * 26) {
    const angle = rand(0, TAU);
    addParticle(
      p.x + Math.cos(angle) * 52,
      p.y + Math.sin(angle) * 52,
      {
        color: "#8b6bff",
        size: rand(1.4, 3),
        life: rand(0.25, 0.45),
        vx: -Math.cos(angle) * 150,
        vy: -Math.sin(angle) * 150,
        glow: true,
      },
    );
  }
}

function warpTo(screenX, screenY) {
  const p = G.player;
  if (
    state !== "playing" ||
    p.planetId !== "voidstar" ||
    p.voidCollapseActive ||
    p.warpCharges <= 0
  ) {
    return;
  }

  let tx = G.cam.x + (screenX - W / 2);
  let ty = G.cam.y + (screenY - H / 2);
  const dx = tx - p.x;
  const dy = ty - p.y;
  const distance = Math.hypot(dx, dy) || 1;
  const maxRange = 560;
  if (distance > maxRange) {
    tx = p.x + (dx / distance) * maxRange;
    ty = p.y + (dy / distance) * maxRange;
  }
  performWarp(tx, ty);
}

function performWarp(tx, ty) {
  const p = G.player;
  if (state !== "playing" || p.planetId !== "voidstar" || p.voidCollapseActive) return;
  const fromX = p.x;
  const fromY = p.y;
  const damage = p.damage * 1.95 * p.warpDamageMult;
  warpBurst(p.x, p.y, damage * 0.65, 118);
  p.x = tx;
  p.y = ty;
  G.cam.x = tx;
  G.cam.y = ty;
  if (p.warpCharges > 0) p.warpCharges -= 1;
  p.invuln = Math.max(p.invuln, 0.85);
  p.warpGuard = 1;
  p.horizonTimer = 0;
  warpBurst(tx, ty, damage, 132);
  damageAlongWarpPath(fromX, fromY, tx, ty, damage * 1.2, 42);
  G.warpTrails.push({
    x1: fromX,
    y1: fromY,
    x2: tx,
    y2: ty,
    width: 44,
    life: 2.4,
    maxLife: 2.4,
    tick: 0,
    dps: p.damage * 1.0 * p.warpDamageMult,
    collapseTimer: G.breakthroughs.foldedHorizon ? 1.2 : 0,
    collapsed: false,
  });
  G.warpGhosts.push({ x: fromX, y: fromY, life: 0.55, maxLife: 0.55 });
  G.warpGhosts.push({ x: tx, y: ty, life: 0.4, maxLife: 0.4, arrival: true });

  for (const b of G.enemyBullets) {
    if (!b.dead && dist2(b.x, b.y, tx, ty) < 145 * 145) {
      b.dead = true;
      burst(b.x, b.y, b.color, 3, 60, 2, 0.25);
    }
  }

  G.shake = Math.max(G.shake, 17);
  G.flash = Math.max(G.flash, 0.55);
  audio.gravityBurst();
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function damageAlongWarpPath(x1, y1, x2, y2, damage, width) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (distanceToSegment(e.x, e.y, x1, y1, x2, y2) > width + e.r) continue;
    damageEnemy(e, e.elite || e.boss ? damage * 1.25 : damage, {
      color: "#8fd6ff",
      ignoreShield: true,
      knockback: e.boss ? 0 : 65 / e.mass,
    });
    e.slow = Math.max(e.slow, 0.35);
  }
}

function updateWarpEffects(dt) {
  for (const ghost of G.warpGhosts) ghost.life -= dt;
  G.warpGhosts = G.warpGhosts.filter((ghost) => ghost.life > 0);

  for (const trail of G.warpTrails) {
    trail.life -= dt;
    trail.tick -= dt;
    if (trail.collapseTimer > 0) {
      trail.collapseTimer -= dt;
      if (trail.collapseTimer <= 0 && !trail.collapsed) {
        trail.collapsed = true;
        collapseWarpTrail(trail);
      }
    }
    if (trail.tick <= 0) {
      trail.tick = 0.28;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (distanceToSegment(e.x, e.y, trail.x1, trail.y1, trail.x2, trail.y2) > trail.width + e.r) {
          continue;
        }
        damageEnemy(e, trail.dps * 0.28 * (e.elite || e.boss ? 1.25 : 1), {
          color: "#8fd6ff",
          ignoreShield: true,
          knockback: 0,
        });
        e.slow = Math.max(e.slow, 0.45);
      }
    }
  }
  G.warpTrails = G.warpTrails.filter((trail) => trail.life > 0);
}

function collapseWarpTrail(trail) {
  const p = G.player;
  damageAlongWarpPath(
    trail.x1,
    trail.y1,
    trail.x2,
    trail.y2,
    p.damage * 2.0 * p.warpDamageMult,
    trail.width,
  );
  const mx = (trail.x1 + trail.x2) / 2;
  const my = (trail.y1 + trail.y2) / 2;
  G.shockwaves.push({
    x: mx,
    y: my,
    r: 20,
    maxR: trail.width * 3.2,
    life: 0.45,
    maxLife: 0.45,
    damage: 0,
    hit: new Set(),
    color: [220, 205, 255],
  });
  burst(mx, my, "#e7dcff", 26, 220, 3.5, 0.65);
  G.shake = Math.max(G.shake, 8);
  audio.explode(1);
}

function updateLaserScars(dt) {
  for (const scar of G.laserScars) {
    scar.life -= dt;
    scar.tick -= dt;
    if (scar.tick <= 0) {
      scar.tick = 0.3;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (distanceToSegment(e.x, e.y, scar.x1, scar.y1, scar.x2, scar.y2) > scar.width + e.r) {
          continue;
        }
        damageEnemy(e, scar.dps * 0.3, {
          color: "#ffb35c",
          ignoreShield: true,
          knockback: 0,
        });
        e.burn = Math.max(e.burn || 0, 1.6);
        e.burnDps = Math.max(e.burnDps || 0, scar.dps * 0.35);
      }
    }
  }
  G.laserScars = G.laserScars.filter((scar) => scar.life > 0);
}

function updateSingularities(dt) {
  for (const singularity of G.singularities) {
    if (singularity.dead) continue;
    singularity.life -= dt;
    singularity.tick -= dt;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = singularity.x - e.x;
      const dy = singularity.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < singularity.radius) {
        const pull = (1 - d / singularity.radius) * 170;
        e.x += (dx / d) * pull * dt;
        e.y += (dy / d) * pull * dt;
        e.slow = Math.max(e.slow, 0.3);
      }
    }
    if (singularity.tick <= 0) {
      singularity.tick = 0.3;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist2(e.x, e.y, singularity.x, singularity.y) <= singularity.radius ** 2) {
          damageEnemy(e, singularity.damage * 0.3, {
            color: "#b895ff",
            ignoreShield: true,
            knockback: 0,
          });
        }
      }
    }
    if (singularity.life <= 0) {
      singularity.dead = true;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (
          dist2(e.x, e.y, singularity.x, singularity.y) <=
          (singularity.radius + 42 + e.r * 0.4) ** 2
        ) {
          damageEnemy(e, singularity.explodeDamage, {
            color: "#ffd166",
            ignoreShield: true,
            knockback: e.boss ? 0 : 120 / e.mass,
          });
        }
      }
      G.shockwaves.push({
        x: singularity.x,
        y: singularity.y,
        r: 20,
        maxR: singularity.radius * 1.35,
        life: 0.6,
        maxLife: 0.6,
        damage: 0,
        hit: new Set(),
        color: [255, 190, 100],
      });
      burst(singularity.x, singularity.y, "#ffd166", 46, 330, 5, 0.9);
      burst(singularity.x, singularity.y, "#b895ff", 30, 220, 4, 0.8);
      G.shake = Math.max(G.shake, 12);
      audio.explode(1.4);
    }
  }
  G.singularities = G.singularities.filter((singularity) => !singularity.dead);
}

function warpBurst(x, y, damage, radius) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist2(e.x, e.y, x, y) <= (radius + e.r * 0.4) ** 2) {
      damageEnemy(e, e.elite || e.boss ? damage * 1.25 : damage, {
        color: "#b895ff",
        ignoreShield: true,
        knockback: e.boss ? 0 : 180 / e.mass,
      });
    }
  }
  G.shockwaves.push({
    x,
    y,
    r: 22,
    maxR: radius * 1.15,
    life: 0.5,
    maxLife: 0.5,
    damage: 0,
    hit: new Set(),
    color: [185, 149, 255],
  });
  burst(x, y, "#b895ff", 32, 260, 4, 0.65);
}

function updateEvents(dt) {
  if (G.tideTimer > 0) {
    G.tideTimer -= dt;
    if (G.tideTimer <= 0) {
      showToast("星尘潮汐退去", "good", 1800);
    }
  }

  if (G.activeEvent) {
    if (G.activeEvent.id === "rift") {
      if (!G.riftEnemies.some((rift) => !rift.dead)) {
        G.activeEvent = null;
        G.riftEnemies = [];
      }
    } else if (G.activeEvent.id === "safeZone") {
      updateSafeZoneEvent(dt);
    } else {
      G.activeEvent.time -= dt;
      if (G.activeEvent.time <= 0) G.activeEvent = null;
    }
  }

  if (G.activeEvent?.id === "meteor") {
    G.meteorWaveTimer -= dt;
    if (G.meteorWave < G.meteorWaveTarget && G.meteorWaveTimer <= 0) {
      G.meteorWave += 1;
      spawnMeteorWave(G.meteorWave);
      G.meteorWaveTimer = 2.1;
    }
  }

  if (G.activeEvent?.id === "deadline") {
    G.deadlineSpawnTimer -= dt;
    if (G.deadlineSpawnTimer <= 0 && G.activeEvent.time > 0.5) {
      spawnDeadlineLines();
      const power = G.difficulty.eventPower || 1;
      G.deadlineSpawnTimer = Math.max(0.3, 0.58 / power);
    }
  }

  if (G.activeEvent?.id === "flare" && G.flarePulsesRemaining > 0) {
    G.flarePulseTimer -= dt;
    if (G.flarePulseTimer <= 0) {
      G.flarePulsesRemaining -= 1;
      G.flarePulseTimer = 0.85;
      flarePulse();
    }
  }

  updateLineHazards(dt);
  updateHazards(dt);
  G.eventTimer -= dt;
  const canTriggerEvent = !G.activeEvent || G.activeEvent.id === "rift";
  if (G.eventTimer <= 0 && G.time > 38 && canTriggerEvent) triggerEvent();
}

function triggerEvent(forceId = null) {
  const pool = EVENTS.filter((event) => event.id !== G.lastEventId);
  const power = G.difficulty.eventPower || 1;
  let event;
  if (forceId && EVENT_BY_ID[forceId]) {
    event = EVENT_BY_ID[forceId];
  } else {
    const weighted = (pool.length ? pool : EVENTS).map((entry) => ({
      event: entry,
      weight: G.difficulty.eventWeights?.[entry.id] || 1,
    }));
    let roll = Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
    event = weighted[0].event;
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        event = item.event;
        break;
      }
    }
  }
  G.lastEventId = event.id;
  G.eventTimer = rand(50, 66) * (G.difficulty.eventIntervalMult || 1);
  markCodex("events", event.id);
  showToast(`特殊事件 · ${event.name}`, "good", 3400);
  audio.event();

  if (event.id === "meteor") {
    G.meteorWaveTarget = 3 + (G.difficulty.id === "void" ? 1 : 0);
    G.meteorWave = 1;
    G.meteorWaveTimer = 2.1;
    G.activeEvent = {
      id: event.id,
      name: event.name,
      time: 3.6 + G.meteorWaveTarget * 2.2,
    };
    spawnMeteorWave(1);
  } else if (event.id === "rift") {
    const count = G.difficulty.riftCount || 1;
    const baseAngle = rand(0, TAU);
    G.riftEnemies = G.riftEnemies.filter((rift) => !rift.dead);
    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + (i * TAU) / count + rand(-0.18, 0.18);
      const distance = rand(330, 420);
      const rift = spawnEnemy(
        "rift",
        G.player.x + Math.cos(angle) * distance,
        G.player.y + Math.sin(angle) * distance,
      );
      if (rift) {
        rift.spawnCd = 1;
        G.riftEnemies.push(rift);
        spawned += 1;
      }
    }
    if (spawned > 0) {
      G.activeEvent = { id: event.id, name: event.name, time: 999 };
      showToast(
        spawned === 1
          ? "虚空裂隙已开启 · 找到并击碎它"
          : `${spawned} 道虚空裂隙已开启`,
        "",
        3200,
      );
    }
  } else if (event.id === "tide") {
    G.tideTimer = 12;
    G.activeEvent = { id: event.id, name: event.name, time: 12 };
    G.player.gravityEnergy = Math.min(G.player.gravityMax, G.player.gravityEnergy + 25);
    showToast("星尘潮汐 · 全图星尘正在流向你", "good", 3000);
  } else if (event.id === "flare") {
    G.activeEvent = { id: event.id, name: event.name, time: 2.2 };
    G.flarePulsesRemaining = 2;
    G.flarePulseTimer = 0.85;
    G.player.gravityEnergy = Math.min(G.player.gravityMax, G.player.gravityEnergy + 28);
    flarePulse();
    showToast("太阳耀斑 · 连续三次爆发", "good", 2600);
  } else if (event.id === "deadline") {
    G.lineHazards = [];
    G.deadlineSpawnTimer = 0;
    G.activeEvent = {
      id: event.id,
      name: event.name,
      time: 7.2 + power * 1.1,
    };
    spawnDeadlineLines();
    showToast("赤线封锁 · 观察暗红线预警", "", 2800);
  } else if (event.id === "safeZone") {
    const waves = G.difficulty.safeZoneWaves || 2;
    const warning = G.difficulty.safeZoneWarning || 2.2;
    G.safeZones = [];
    G.safeZoneWavesRemaining = waves - 1;
    G.safeZoneNextTimer = 0;
    G.safeZoneWaveNumber = 1;
    G.safeZoneTotalWaves = waves;
    G.safeZoneWarningDuration = warning;
    G.activeEvent = {
      id: event.id,
      name: event.name,
      time: waves * (warning + 1.1),
    };
    spawnSafeZoneWave();
  }
}

function spawnSafeZoneWave() {
  const p = G.player;
  const count = G.difficulty.safeZoneCount || 2;
  const warning = G.difficulty.safeZoneWarning || 2.2;
  const radius = G.difficulty.safeZoneRadius || 145;
  const spread = G.difficulty.safeZoneSpread || 240;
  const baseAngle = rand(0, TAU);
  G.safeZones = [];
  for (let i = 0; i < count; i += 1) {
    const angle =
      baseAngle + (i * TAU) / count + rand(-0.28, 0.28);
    const distance =
      count === 1
        ? Math.min(spread, radius * 1.25)
        : rand(radius * 1.15, Math.max(radius * 1.3, spread));
    const zoneRadius = radius * rand(0.92, 1.08);
    const x = clamp(
      p.x + Math.cos(angle) * distance,
      p.x - W * 0.36,
      p.x + W * 0.36,
    );
    const y = clamp(
      p.y + Math.sin(angle) * distance,
      p.y - H * 0.33,
      p.y + H * 0.33,
    );
    G.safeZones.push({
      x,
      y,
      radius: zoneRadius,
      warning,
      elapsed: 0,
      resolved: false,
      life: warning + 1.2,
      result: "",
    });
  }
  audio.event();
  showToast(
    `星域裁决 · 第 ${G.safeZoneWaveNumber}/${G.safeZoneTotalWaves} 波 · ${warning.toFixed(1)} 秒后裁定`,
    "",
    2100,
  );
}

function updateSafeZoneEvent(dt) {
  const p = G.player;
  if (G.activeEvent) G.activeEvent.time = Math.max(0, G.activeEvent.time - dt);
  for (const zone of G.safeZones) {
    zone.elapsed += dt;
    zone.life -= dt;
  }

  const warningZone = G.safeZones.find(
    (zone) => !zone.resolved && zone.elapsed >= zone.warning,
  );
  if (warningZone) {
    const safe = G.safeZones.some(
      (zone) =>
        dist2(p.x, p.y, zone.x, zone.y) <= zone.radius * zone.radius,
    );
    for (const zone of G.safeZones) {
      zone.resolved = true;
      zone.result = safe ? "safe" : "hit";
      zone.life = Math.min(zone.life, 0.7);
      G.shockwaves.push({
        x: zone.x,
        y: zone.y,
        r: zone.radius * 0.45,
        maxR: zone.radius,
        life: 0.48,
        maxLife: 0.48,
        damage: 0,
        hit: new Set(),
        color: safe ? [111, 247, 255] : [255, 84, 102],
      });
    }
    if (safe) {
      addText(p.x, p.y - p.radius - 18, "安全区庇护", {
        color: "#bffcff",
        size: 14,
        life: 1,
      });
      G.flash = Math.max(G.flash, 0.18);
    } else {
      damagePlayer(
        70 * (G.difficulty.eventPower || 1),
        p.x + rand(-40, 40),
        p.y + rand(-40, 40),
      );
      G.hurtFlash = Math.max(G.hurtFlash, 0.85);
      G.shake = Math.max(G.shake, 16);
      addText(p.x, p.y - p.radius - 18, "裁决命中", {
        color: "#ff8fa3",
        size: 17,
        life: 1.1,
      });
    }
    G.safeZoneNextTimer = 1.08;
  }

  if (G.safeZones.length > 0 && G.safeZones.every((zone) => zone.resolved)) {
    G.safeZoneNextTimer -= dt;
    if (G.safeZoneNextTimer <= 0 && G.safeZoneWavesRemaining > 0) {
      G.safeZoneWavesRemaining -= 1;
      G.safeZoneWaveNumber += 1;
      spawnSafeZoneWave();
      G.safeZoneNextTimer = 0;
    }
  }

  if (G.activeEvent?.time <= 0) {
    G.activeEvent = null;
    G.safeZones = [];
    G.safeZoneWavesRemaining = 0;
  }
}

function flarePulse() {
  const p = G.player;
  const power = G.difficulty.eventPower || 1;
  G.enemyBullets.length = 0;
  G.flash = Math.max(G.flash, 0.8);
  G.shake = Math.max(G.shake, 16);
  const damagePct = 0.055 + power * 0.012;
  for (const e of G.enemies) {
    if (e.dead) continue;
    damageEnemy(e, Math.max(35, e.maxHp * damagePct), {
      color: "#ff8a3d",
      ignoreShield: true,
      knockback: e.boss ? 0 : 55 / e.mass,
    });
    e.burn = Math.max(e.burn || 0, 2.6);
    e.burnDps = Math.max(e.burnDps || 0, p.damage * 0.55);
  }
  G.shockwaves.push({
    x: p.x,
    y: p.y,
    r: 40,
    maxR: Math.max(W, H) * 0.72,
    life: 0.7,
    maxLife: 0.7,
    damage: 0,
    hit: new Set(),
    color: [255, 198, 96],
  });
  burst(p.x, p.y, "#ffd166", 58, 460, 5.5, 0.9);
  audio.explode(1.6);
}

function spawnMeteorWave(wave) {
  const power = G.difficulty.eventPower || 1;
  const count = 10 + wave * 3 + Math.round(power * 2);
  for (let i = 0; i < count; i += 1) {
    G.hazards.push({
      x: G.player.x + rand(-W * 0.44, W * 0.44),
      y: G.player.y + rand(-H * 0.44, H * 0.44),
      radius: 72,
      delay: 0.55 + i * 0.075,
      life: 0.5,
      exploded: false,
    });
  }
}

function spawnDeadlineLines() {
  const power = G.difficulty.eventPower || 1;
  const count = power >= 1.3 ? 2 : power >= 1.12 && Math.random() < 0.55 ? 2 : 1;
  for (let i = 0; i < count; i += 1) {
    const mode = pick(["h", "v", "d"]);
    let x1;
    let y1;
    let x2;
    let y2;
    if (mode === "h") {
      const y = G.player.y + rand(-H * 0.44, H * 0.44);
      x1 = G.player.x - W * 0.72;
      x2 = G.player.x + W * 0.72;
      y1 = y;
      y2 = y;
    } else if (mode === "v") {
      const x = G.player.x + rand(-W * 0.44, W * 0.44);
      x1 = x;
      x2 = x;
      y1 = G.player.y - H * 0.72;
      y2 = G.player.y + H * 0.72;
    } else {
      const angle = rand(0, TAU);
      const length = Math.max(W, H) * 1.45;
      const cx = G.player.x + rand(-W * 0.18, W * 0.18);
      const cy = G.player.y + rand(-H * 0.18, H * 0.18);
      x1 = cx - Math.cos(angle) * length * 0.5;
      y1 = cy - Math.sin(angle) * length * 0.5;
      x2 = cx + Math.cos(angle) * length * 0.5;
      y2 = cy + Math.sin(angle) * length * 0.5;
    }
    G.lineHazards.push({
      x1,
      y1,
      x2,
      y2,
      width: 16 + power * 5,
      delay: 0.72,
      active: false,
      life: 0,
      hit: false,
    });
  }
}

function updateLineHazards(dt) {
  const p = G.player;
  for (const line of G.lineHazards) {
    if (!line.active) {
      line.delay -= dt;
      if (line.delay <= 0) {
        line.active = true;
        line.life = 0.5;
        line.hit = false;
        const mx = (line.x1 + line.x2) / 2;
        const my = (line.y1 + line.y2) / 2;
        burst(mx, my, "#d04455", 18, 190, 3.2, 0.5);
        G.shake = Math.max(G.shake, 3);
        if (Math.random() < 0.35) audio.explode(0.5);
      }
    } else {
      line.life -= dt;
    }
    if (line.active && !line.hit && p.invuln <= 0) {
      const distance = distanceToSegment(p.x, p.y, line.x1, line.y1, line.x2, line.y2);
      if (distance < line.width + p.radius * 0.55) {
        line.hit = true;
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = clamp(
          ((p.x - line.x1) * dx + (p.y - line.y1) * dy) / lengthSq,
          0,
          1,
        );
        damagePlayer(
          13 * (G.difficulty.eventPower || 1),
          line.x1 + dx * t,
          line.y1 + dy * t,
        );
        G.shake = Math.max(G.shake, 8);
      }
    }
  }
  G.lineHazards = G.lineHazards.filter((line) => !line.active || line.life > 0);
}

function updateHazards(dt) {
  for (const hazard of G.hazards) {
    if (!hazard.exploded) {
      hazard.delay -= dt;
      if (hazard.delay <= 0) {
        hazard.exploded = true;
        hazard.life = 0.55;
        explodeHazard(hazard);
      }
    } else {
      hazard.life -= dt;
    }
  }
  G.hazards = G.hazards.filter((hazard) => !hazard.exploded || hazard.life > 0);
}

function explodeHazard(hazard) {
  const p = G.player;
  const damage = Math.max(45, p.damage * 3.4);
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist2(e.x, e.y, hazard.x, hazard.y) <= (hazard.radius + e.r * 0.4) ** 2) {
      damageEnemy(e, damage, {
        color: "#ffb35c",
        ignoreShield: true,
        knockback: e.boss ? 0 : 48 / e.mass,
      });
    }
  }
  if (dist2(p.x, p.y, hazard.x, hazard.y) <= (hazard.radius * 0.88) ** 2) {
    damagePlayer(11 * (G.difficulty.enemyDamage || 1), hazard.x, hazard.y);
  }
  burst(hazard.x, hazard.y, "#ffb35c", 28, 220, 4.5, 0.7);
  burst(hazard.x, hazard.y, "#ff5f6d", 14, 150, 3, 0.5);
  G.shake = Math.max(G.shake, 8);
  audio.explode(1);
}

function updateNova(dt) {
  const p = G.player;
  if (p.novaLevel <= 0) return;
  G.novaTimer -= dt;
  if (G.novaTimer > 0) return;
  G.novaTimer = Math.max(3.7, 6.5 - p.novaLevel * 0.55);
  const radius = 175 + p.novaLevel * 28;
  G.shockwaves.push({
    x: p.x,
    y: p.y,
    r: 26,
    maxR: radius,
    life: 0.58,
    maxLife: 0.58,
    damage: p.damage * (1.15 + p.novaLevel * 0.45),
    hit: new Set(),
  });
  G.shake = Math.max(G.shake, 6);
  burst(p.x, p.y, "#6ff7ff", 26, 160, 3.4, 0.55);
  audio.explode(0.8);
}

function updateShockwaves(dt) {
  for (const sw of G.shockwaves) {
    sw.life -= dt;
    const progress = 1 - sw.life / sw.maxLife;
    sw.r = lerp(26, sw.maxR, Math.min(1, progress * 1.35));
    if (sw.damage > 0) {
      for (const e of G.enemies) {
        if (e.dead || sw.hit.has(e)) continue;
        const rr = sw.r + e.r * 0.4;
        if (dist2(sw.x, sw.y, e.x, e.y) < rr * rr) {
          sw.hit.add(e);
          damageEnemy(e, sw.damage, {
            color: "#6ff7ff",
            knockback: e.boss ? 0 : 42 / e.mass,
            ignoreShield: true,
          });
        }
      }
    }
    if (sw.life <= 0) sw.dead = true;
  }
}

function addParticle(x, y, options) {
  if (G.particles.length >= MAX_PARTICLES) {
    G.particles.splice(0, 8);
  }
  G.particles.push({
    x,
    y,
    vx: options.vx || 0,
    vy: options.vy || 0,
    size: options.size || 2,
    color: options.color || "#ffffff",
    life: options.life || 0.4,
    maxLife: options.life || 0.4,
    drag: options.drag ?? 0.12,
    glow: options.glow ?? false,
  });
}

function burst(x, y, color, count, speed, size, life) {
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, TAU);
    const velocity = rand(speed * 0.2, speed);
    addParticle(x, y, {
      color,
      size: rand(size * 0.5, size),
      life: rand(life * 0.45, life),
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      glow: Math.random() < 0.55,
    });
  }
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.1, dt);
    p.vy *= Math.pow(0.1, dt);
  }
}

function addText(x, y, text, options = {}) {
  if (G.texts.length >= MAX_DAMAGE_TEXTS) G.texts.shift();
  G.texts.push({
    x,
    y,
    text,
    color: options.color || "#ffffff",
    size: options.size || 13,
    crit: Boolean(options.crit),
    life: options.life || 0.75,
    maxLife: options.life || 0.75,
  });
}

function updateTexts(dt) {
  for (const t of G.texts) {
    t.life -= dt;
    t.y -= 34 * dt;
  }
}

function cleanup() {
  G.enemies = G.enemies.filter((e) => !e.dead);
  G.bullets = G.bullets.filter((b) => !b.dead);
  G.enemyBullets = G.enemyBullets.filter((b) => !b.dead);
  G.gems = G.gems.filter((g) => !g.dead);
  G.particles = G.particles.filter((p) => p.life > 0);
  G.texts = G.texts.filter((t) => t.life > 0);
  G.shockwaves = G.shockwaves.filter((s) => !s.dead);
}

function showLevelUp() {
  if (!G || G.pendingLevels <= 0) return;
  state = "levelup";
  cancelGravity();
  keys.clear();
  pointer.active = false;
  G.flash = Math.max(G.flash, 0.45);
  audio.levelup();
  el.levelup.classList.remove("hidden");
  rerollAvailable = true;
  upgradeCategoryFilter = "all";
  renderCards();
}

function chooseUpgradePool(count) {
  const pool = UPGRADES.filter(
    (u) =>
      (G.upgradeLevels[u.id] || 0) < u.max &&
      (!u.planets || u.planets.includes(G.planet.id)),
  ).map((u) => ({
    upgrade: u,
    weight: u.rare ? 1.05 : 2.45,
  }));
  const choices = [];
  const drawFrom = (items) => {
    if (items.length === 0) return false;
    let total = 0;
    for (const item of items) total += item.weight;
    let roll = Math.random() * total;
    let index = items.length - 1;
    for (let i = 0; i < items.length; i += 1) {
      roll -= items[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    const [item] = items.splice(index, 1);
    const poolIndex = pool.indexOf(item);
    if (poolIndex >= 0) pool.splice(poolIndex, 1);
    choices.push(item.upgrade);
    return true;
  };
  const generalPool = pool.filter((item) => !item.upgrade.planets);
  const planetPool = pool.filter((item) =>
    item.upgrade.planets?.includes(G.planet.id),
  );
  if (count >= 2 && generalPool.length > 0) drawFrom(generalPool);
  if (count >= 2 && planetPool.length > 0) drawFrom(planetPool);
  while (choices.length < count && pool.length > 0) {
    drawFrom(pool);
  }
  while (choices.length < count) choices.push(REPAIR);
  const breakthrough = BREAKTHROUGHS.find(
    (entry) =>
      entry.planets.includes(G.planet.id) &&
      !G.breakthroughs[entry.id] &&
      Object.entries(entry.requirement).every(
        ([upgradeId, level]) => (G.upgradeLevels[upgradeId] || 0) >= level,
      ),
  );
  if (breakthrough && choices.length > 0) {
    const planetIndex = choices.findIndex((choice) =>
      choice.planets?.includes(G.planet.id),
    );
    choices[planetIndex >= 0 ? planetIndex : choices.length - 1] = breakthrough;
  }
  return choices;
}

function upgradeOwner(upgrade) {
  if (!upgrade.planets) return "通用";
  return `${upgrade.planets.map((id) => PLANET_BY_ID[id]?.name || id).join(" / ")}专属`;
}

let currentChoices = [];

function renderCards() {
  currentChoices = chooseUpgradePool(3);
  el.cards.replaceChildren();
  const planet = G.planet;
  el.levelupSub.textContent = `本轮包含通用强化与${planet.name}专属强化 · 选择一项继续`;
  const groups = new Map([
    ["general", { title: "通用强化", hint: "所有星核均可获得", icon: "✦", items: [] }],
    [
      planet.id,
      {
        title: `${planet.name}专属强化`,
        hint: `${planet.abilityLabel}构筑`,
        icon: planet.icon,
        items: [],
      },
    ],
  ]);
  currentChoices.forEach((upgrade, index) => {
    const key = upgrade.planets ? upgrade.planets[0] : "general";
    groups.get(key)?.items.push({ upgrade, index });
  });

  const categoryCounts = {
    all: currentChoices.length,
    general: groups.get("general").items.length,
    [planet.id]: groups.get(planet.id).items.length,
  };
  const categoryButtons = [];
  const groupSections = [];
  const categoryOptions = [
    ["all", "全部可选"],
    ["general", "通用"],
    [planet.id, `${planet.name}专属`],
  ];
  el.upgradeCategoryBar.replaceChildren();
  for (const [id, label] of categoryOptions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `upgrade-category${upgradeCategoryFilter === id ? " active" : ""}`;
    button.dataset.category = id;
    button.textContent = `${label} ${categoryCounts[id]}`;
    button.setAttribute(
      "aria-pressed",
      String(upgradeCategoryFilter === id),
    );
    button.addEventListener("click", () => {
      upgradeCategoryFilter = id;
      applyUpgradeCategoryFilter(categoryButtons, groupSections);
      audio.ui();
    });
    categoryButtons.push(button);
    el.upgradeCategoryBar.append(button);
  }

  for (const group of groups.values()) {
    const section = document.createElement("section");
    section.className = "upgrade-choice-group";
    section.dataset.category =
      group.title === "通用强化" ? "general" : planet.id;
    const head = document.createElement("div");
    head.className = "upgrade-group-head";
    const badge = document.createElement("span");
    badge.className = "upgrade-group-icon";
    badge.textContent = group.icon;
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = group.title;
    const hint = document.createElement("span");
    hint.textContent = group.hint;
    copy.append(title, hint);
    head.append(badge, copy);
    const grid = document.createElement("div");
    grid.className = "upgrade-group-cards";

    if (group.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "upgrade-group-empty";
      empty.textContent = "本轮未出现此类强化";
      grid.append(empty);
    }

    for (const { upgrade, index } of group.items) {
    const level = G.upgradeLevels[upgrade.id] || 0;
    const owner = upgradeOwner(upgrade);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `card${upgrade.rare || upgrade.breakthrough ? " rare" : ""}${
      upgrade.breakthrough ? " breakthrough" : ""
    }`;
    card.setAttribute(
      "aria-label",
      `${owner}${upgrade.breakthrough ? "突破" : ""} ${upgrade.name}：${upgrade.desc}${
        upgrade.scope ? `，作用：${upgrade.scope}` : ""
      }${upgrade.requirementText ? `，需要：${upgrade.requirementText}` : ""}`,
    );

    const top = document.createElement("div");
    top.className = "card-top";
    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.textContent = upgrade.icon;
    const number = document.createElement("div");
    number.className = "card-number";
    number.textContent = `0${index + 1}`;
    top.append(icon, number);

    const title = document.createElement("h3");
    title.textContent = upgrade.name;
    const desc = document.createElement("p");
    desc.textContent = upgrade.desc;
    const scope = document.createElement("div");
    scope.className = "card-scope";
    scope.textContent = upgrade.scope ? `作用：${upgrade.scope}` : "";
    const requirement = document.createElement("div");
    requirement.className = "card-req";
    requirement.textContent = upgrade.requirementText
      ? `需要：${upgrade.requirementText}`
      : "";
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const tag = document.createElement("span");
    if (upgrade.fallback) {
      tag.textContent = "补给";
    } else if (upgrade.breakthrough) {
      tag.textContent = "突破 · 唯一";
    } else if (level === 0) {
      tag.textContent = `${owner} · ${upgrade.rare ? "稀有新能力" : "新强化"}`;
    } else {
      tag.textContent = `${owner} · Lv.${level} → ${level + 1}`;
    }
    meta.append(tag);

    if (!upgrade.fallback && !upgrade.breakthrough) {
      const pips = document.createElement("div");
      pips.className = "pips";
      for (let i = 0; i < upgrade.max; i += 1) {
        const pip = document.createElement("span");
        pip.className = `pip${i < level ? " on" : ""}`;
        pips.append(pip);
      }
      meta.append(pips);
    }

    card.append(top, title, desc, scope, requirement, meta);
    card.addEventListener("click", () => selectUpgrade(upgrade));
      grid.append(card);
    }
    section.append(head, grid);
    el.cards.append(section);
    groupSections.push(section);
  }
  applyUpgradeCategoryFilter(categoryButtons, groupSections);
  el.rerollBtn.disabled = !rerollAvailable;
  el.rerollBtn.textContent = rerollAvailable ? "重掷 · 剩余 1 次" : "本组已重掷";
}

function rerollCards() {
  if (state !== "levelup" || !rerollAvailable) return;
  rerollAvailable = false;
  upgradeCategoryFilter = "all";
  audio.ui();
  renderCards();
}

function applyUpgradeCategoryFilter(buttons, sections) {
  for (const button of buttons) {
    const active = button.dataset.category === upgradeCategoryFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  for (const section of sections) {
    section.classList.toggle(
      "hidden",
      upgradeCategoryFilter !== "all" &&
        section.dataset.category !== upgradeCategoryFilter,
    );
  }
}

function chooseUpgradeByIndex(index) {
  if (!currentChoices[index]) return;
  selectUpgrade(currentChoices[index]);
}

function selectUpgrade(upgrade) {
  if (state !== "levelup" || !G) return;
  audio.unlock();
  if (upgrade.fallback) {
    upgrade.apply(G.player);
  } else if (upgrade.breakthrough) {
    markCodex("breakthroughs", upgrade.id);
    G.breakthroughs[upgrade.id] = true;
    showToast(`突破 · ${upgrade.name}`, "good", 2600);
    audio.perfectRelease();
  } else {
    markCodex("upgrades", upgrade.id);
    G.upgradeLevels[upgrade.id] = (G.upgradeLevels[upgrade.id] || 0) + 1;
    upgrade.apply(G.player);
    if (upgrade.id === "starRiverDream") {
      showToast("星河追梦 · 空间站已入轨", "good", 2200);
    } else if (upgrade.id === "weaponDiversity") {
      showToast("武器多元化 · 卫星武器库已解锁", "good", 2200);
    }
  }
  G.pendingLevels -= 1;
  G.flash = 0.35;
  G.shake = Math.max(G.shake, 4);
  burst(
    G.player.x,
    G.player.y,
    upgrade.rare || upgrade.breakthrough ? "#ffd166" : "#6ff7ff",
    34,
    180,
    3.5,
    0.8,
  );
  audio.ui();
  if (G.pendingLevels > 0) {
    rerollAvailable = true;
    upgradeCategoryFilter = "all";
    renderCards();
  } else {
    el.levelup.classList.add("hidden");
    state = "playing";
    lastFrame = performance.now();
    updateHUD(true);
    focusGame();
  }
}

function gameOver() {
  if (state === "gameover" || state === "victory") return;
  state = "gameover";
  cancelGravity();
  keys.clear();
  pointer.active = false;
  const p = G.player;
  p.hp = 0;
  burst(p.x, p.y, "#6ff7ff", 80, 380, 7, 1.4);
  burst(p.x, p.y, "#ff5f6d", 60, 280, 5, 1.1);
  G.shake = 30;
  G.flash = 0.9;
  audio.stopAmbient(0.4);
  audio.stopMusic(0.5);
  audio.gameover();
  if (G.endless) {
    if (G.time > endlessBest) {
      endlessBest = G.time;
      writeStorage("planetcore-endless-best", endlessBest.toFixed(1));
      updateRecordText();
    }
  } else {
    saveRecord(false);
  }
  el.gameoverCopy.textContent =
    G.endless
      ? `无尽深空第 ${G.endlessBossKills} 只吞噬者之后，你的光停下了。`
      : G.time >= BOSS_TIME - 2
      ? "只差一点。虚空吞噬者仍在你留下的光里游荡。"
      : "你的光被深空吞没了。下一次，星核会更坚硬。";
  el.goTime.textContent = formatTime(G.time);
  el.goLevel.textContent = String(G.level);
  el.goKills.textContent = String(G.kills);
  el.bossWrap.classList.add("hidden");
  el.hud.classList.add("hidden");
  lockResultActions(el.gameover);
  el.gameover.classList.remove("hidden");
}

function winGame() {
  if (state === "victory") return;
  state = "victory";
  cancelGravity();
  keys.clear();
  pointer.active = false;
  audio.stopAmbient(1.2);
  audio.stopMusic(1.2);
  audio.victory();
  saveRecord(true);
  if (!endlessUnlocked) {
    endlessUnlocked = true;
    writeStorage("planetcore-endless-unlocked", "1");
    el.unlockNote?.classList.remove("hidden");
  }
  el.winTime.textContent = formatTime(G.time);
  el.winLevel.textContent = String(G.level);
  el.winKills.textContent = String(G.kills);
  el.bossWrap.classList.add("hidden");
  lockResultActions(el.victory);
  el.victory.classList.remove("hidden");
  el.hud.classList.add("hidden");
}

function resultActionsReady() {
  return performance.now() >= resultLockedUntil;
}

function lockResultActions(overlay) {
  clearTimeout(resultLockTimeout);
  resultLockedUntil = performance.now() + RESULT_INPUT_LOCK_MS;
  overlay.classList.add("result-locked");
  const buttons = overlay.querySelectorAll("button");
  for (const button of buttons) button.disabled = true;
  resultLockTimeout = window.setTimeout(() => {
    resultLockedUntil = 0;
    overlay.classList.remove("result-locked");
    for (const button of buttons) button.disabled = false;
  }, RESULT_INPUT_LOCK_MS);
}

function clearResultLock() {
  clearTimeout(resultLockTimeout);
  resultLockedUntil = 0;
  for (const overlay of [el.gameover, el.victory]) {
    overlay.classList.remove("result-locked");
    for (const button of overlay.querySelectorAll("button")) {
      button.disabled = false;
    }
  }
}

function showToast(text, kind = "", duration = 2400) {
  clearTimeout(toastTimeout);
  el.toast.textContent = text;
  el.toast.className = `toast${kind ? ` ${kind}` : ""} show`;
  toastTimeout = window.setTimeout(() => {
    el.toast.classList.remove("show");
  }, duration);
}

function updateHUD(force = false) {
  if (!G) return;
  const p = G.player;
  el.hpFill.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
  el.shieldFill.style.width = p.shieldMax > 0 ? `${clamp((p.shield / p.shieldMax) * 100, 0, 100)}%` : "0%";
  el.hpText.textContent = `${Math.max(0, Math.ceil(p.hp))}`;
  el.xpFill.style.width = `${clamp((G.xp / G.xpNext) * 100, 0, 100)}%`;
  const abilityFill =
    p.planetId === "sun" ? p.laserCharge : p.gravityEnergy / p.gravityMax;
  el.gravityFill.style.width = `${clamp(abilityFill * 100, 0, 100)}%`;
  el.levelText.textContent = `Lv.${G.level}`;
  el.timer.textContent = formatTime(G.time);
  el.killText.textContent = `击杀 ${G.kills}`;
  refreshAbilityUI();

  if (G.boss && !G.boss.dead) {
    el.bossWrap.classList.remove("hidden");
    el.eventText.classList.add("hidden");
    el.bossFill.style.width = `${clamp((G.boss.hp / G.boss.maxHp) * 100, 0, 100)}%`;
    el.bossPhase.textContent = G.boss.phase === 2 ? "第二阶段" : "第一阶段";
  } else if (!G.bossSpawned) {
    el.bossWrap.classList.add("hidden");
  }

  const activeRifts = G.riftEnemies.filter((rift) => !rift.dead).length;
  if (!G.boss && (G.activeEvent || activeRifts > 0)) {
    el.eventText.classList.remove("hidden");
    let eventText = "";
    if (G.activeEvent?.id === "rift") {
      eventText = `虚空裂隙 · 余 ${activeRifts}`;
    } else if (G.activeEvent?.id === "safeZone") {
      const warningZone = G.safeZones.find((zone) => !zone.resolved);
      eventText = warningZone
        ? `星域裁决 · 第 ${G.safeZoneWaveNumber}/${G.safeZoneTotalWaves} 波 · ${Math.max(
            0,
            warningZone.warning - warningZone.elapsed,
          ).toFixed(1)}s 后裁定`
        : `星域裁决 · 下一波安全区重组中`;
      if (activeRifts > 0) eventText += ` · 裂隙 ${activeRifts}`;
    } else if (G.activeEvent) {
      eventText = `${G.activeEvent.name} · ${Math.max(0, Math.ceil(G.activeEvent.time))}s`;
      if (activeRifts > 0) eventText += ` · 裂隙 ${activeRifts}`;
    } else {
      eventText = `虚空裂隙 · 余 ${activeRifts}`;
    }
    el.eventText.textContent = eventText;
  } else {
    el.eventText.classList.add("hidden");
  }

  if (force) {
    el.waveLabel.textContent = waveLabel(G.time);
  }
}

function w2sX(x) {
  return x - G.cam.x + W / 2;
}

function w2sY(y) {
  return y - G.cam.y + H / 2;
}

function mod(value, base) {
  return ((value % base) + base) % base;
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawBackground();

  if (state === "menu" || state === "loadout") {
    drawMenuScene();
    drawVignette();
    return;
  }

  if (!G) {
    drawVignette();
    return;
  }

  const shakeX = G.shake > 0.1 ? rand(-G.shake, G.shake) * 0.55 : 0;
  const shakeY = G.shake > 0.1 ? rand(-G.shake, G.shake) * 0.55 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawGravityField();
  drawPlanetAbilityEffects();
  drawEventHorizon();
  drawWarpTrails();
  drawLaserScars();
  drawSingularities();
  drawLineHazards();
  drawHazards();
  drawSafeZones();
  drawGems();
  drawEnemies();
  drawMoons();
  drawWarpGhosts();
  drawPlayer();
  drawLaser();
  drawSummons();
  drawSatelliteLasers();
  drawSpaceStation();
  drawSatelliteBombs();
  drawWarpGuard();
  drawBullets();
  drawEnemyBullets();
  drawShockwaves();
  drawParticles();
  drawEventAtmosphere();
  drawTexts();
  ctx.restore();

  drawWarpHud();
  drawRiftPointer();
  if (pointer.active && pointer.touch && state === "playing") drawJoystick();
  drawVignette();

  if (G.flash > 0.01) {
    ctx.fillStyle = `rgba(150, 245, 255, ${G.flash * 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.hurtFlash > 0.01) {
    const gradient = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.25,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.72,
    );
    gradient.addColorStop(0, "rgba(255, 40, 70, 0)");
    gradient.addColorStop(1, `rgba(255, 40, 70, ${G.hurtFlash * 0.55})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawBackground() {
  ctx.fillStyle = "#040714";
  ctx.fillRect(0, 0, W, H);

  const camX = G ? G.cam.x : menuTime * 6;
  const camY = G ? G.cam.y : menuTime * 2;
  const maxSide = Math.max(W, H);

  drawBlob(
    W * 0.18 - mod(camX * 0.04, W * 0.25),
    H * 0.28 - mod(camY * 0.03, H * 0.2),
    maxSide * 0.52,
    "#17306f",
    0.32,
  );
  drawBlob(
    W * 0.82 - mod(camX * 0.025, W * 0.2),
    H * 0.72 - mod(camY * 0.02, H * 0.18),
    maxSide * 0.58,
    "#451a63",
    0.26,
  );
  drawBlob(
    W * 0.55 - mod(camX * 0.06, W * 0.3),
    H * 0.08 - mod(camY * 0.05, H * 0.22),
    maxSide * 0.4,
    "#075466",
    0.16,
  );
  drawBlob(
    W * 0.42 - mod(camX * 0.1, W * 0.35),
    H * 0.88 - mod(camY * 0.08, H * 0.28),
    maxSide * 0.36,
    "#1d2350",
    0.2,
  );
  drawBlob(
    W * 0.92 - mod(camX * 0.075, W * 0.26),
    H * 0.18 - mod(camY * 0.06, H * 0.24),
    maxSide * 0.3,
    "#4b2e6e",
    0.14,
  );
  drawBlob(
    W * 0.88 - mod(camX * 0.055, W * 0.24),
    H * 0.16 - mod(camY * 0.04, H * 0.2),
    maxSide * 0.46,
    "#6b3a2a",
    0.16,
  );
  drawBlob(
    W * 0.08 - mod(camX * 0.09, W * 0.32),
    H * 0.78 - mod(camY * 0.07, H * 0.3),
    maxSide * 0.5,
    "#0a4a5a",
    0.18,
  );

  drawNebulaBands(camX, camY);
  drawGalaxyBand(camX, camY);
  drawDistantSun(camX, camY);
  drawDistantPlanets(camX, camY);

  const tileW = W + 200;
  const tileH = H + 200;
  for (const layer of STAR_LAYERS) {
    for (const star of layer.stars) {
      const sx = mod(star.x * tileW - camX * star.z, tileW) - 100;
      const sy = mod(star.y * tileH - camY * star.z, tileH) - 100;
      const twinkle = 0.72 + 0.28 * Math.sin(menuTime * star.tw + star.phase);
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle =
        star.r > 1.5 ? "#c8f7ff" : star.r > 1.05 ? "#e4efff" : "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, star.r, 0, TAU);
      ctx.fill();
      if (star.cross) {
        ctx.globalAlpha = star.a * twinkle * 0.55;
        ctx.fillRect(sx - star.r * 3.8, sy - 0.4, star.r * 7.6, 0.8);
        ctx.fillRect(sx - 0.4, sy - star.r * 3.8, 0.8, star.r * 7.6);
      }
    }
  }
  ctx.globalAlpha = 1;
  drawDustAndDebris(camX, camY);
  drawForegroundMotes(camX, camY);
  drawShootingStars(camX, camY);
}

function drawNebulaBands(camX, camY) {
  const bands = [
    { x: 0.16, y: 0.34, w: 1.35, h: 0.22, rot: -0.36, c: [74, 156, 255], a: 0.075, p: 0.018 },
    { x: 0.78, y: 0.56, w: 1.1, h: 0.18, rot: 0.34, c: [182, 92, 224], a: 0.065, p: 0.024 },
    { x: 0.5, y: 0.13, w: 0.95, h: 0.14, rot: -0.1, c: [255, 172, 96], a: 0.045, p: 0.012 },
  ];
  const span = Math.max(W, H) + 820;
  for (const band of bands) {
    const bx = mod(band.x * W - camX * band.p + menuTime * 1.2, span) - 410;
    const by = mod(band.y * H - camY * band.p + menuTime * 0.7, span) - 410;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(bx, by);
    ctx.rotate(band.rot);
    const gradient = ctx.createLinearGradient(0, -band.h * H, 0, band.h * H);
    gradient.addColorStop(0, `rgba(${band.c.join(",")}, 0)`);
    gradient.addColorStop(0.45, `rgba(${band.c.join(",")}, ${band.a * 0.6})`);
    gradient.addColorStop(0.55, `rgba(${band.c.join(",")}, ${band.a})`);
    gradient.addColorStop(1, `rgba(${band.c.join(",")}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, band.w * W * 0.55, band.h * H, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawGalaxyBand(camX, camY) {
  ctx.save();
  const ox = mod(camX * 0.008 + menuTime * 1.8, W + 700) - 350;
  const oy = mod(camY * 0.006 + menuTime * 1.1, H + 700) - 350;
  ctx.translate(W * 0.54 - ox, H * 0.43 - oy);
  ctx.rotate(-0.4);
  const band = ctx.createLinearGradient(0, -H * 0.26, 0, H * 0.26);
  band.addColorStop(0, "rgba(50, 80, 150, 0)");
  band.addColorStop(0.44, "rgba(108, 130, 205, 0.07)");
  band.addColorStop(0.54, "rgba(176, 158, 235, 0.11)");
  band.addColorStop(1, "rgba(50, 80, 150, 0)");
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.92, H * 0.19, 0, 0, TAU);
  ctx.fill();
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(W, H) * 0.3);
  core.addColorStop(0, "rgba(190, 180, 255, 0.06)");
  core.addColorStop(1, "rgba(190, 180, 255, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(W, H) * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDistantSun(camX, camY) {
  const span = Math.max(W, H) + 620;
  const sx = mod(W * 0.86 - camX * 0.016 + menuTime * 0.8, span) - 280;
  const sy = mod(H * 0.14 - camY * 0.012 + menuTime * 0.4, span) - 280;
  const radius = 118;
  if (sx < -radius * 2.5 || sx > W + radius * 2.5 || sy < -radius * 2.5 || sy > H + radius * 2.5) {
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 2.2);
  glow.addColorStop(0, "rgba(255, 240, 205, 0.36)");
  glow.addColorStop(0.14, "rgba(255, 180, 110, 0.18)");
  glow.addColorStop(0.45, "rgba(160, 90, 120, 0.07)");
  glow.addColorStop(1, "rgba(80, 40, 100, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, radius * 2.2, 0, TAU);
  ctx.fill();

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * TAU + menuTime * 0.03;
    const length = radius * (1.45 + (i % 3) * 0.28);
    const ray = ctx.createLinearGradient(
      sx + Math.cos(angle) * radius * 0.2,
      sy + Math.sin(angle) * radius * 0.2,
      sx + Math.cos(angle) * length,
      sy + Math.sin(angle) * length,
    );
    ray.addColorStop(0, "rgba(255, 220, 170, 0.12)");
    ray.addColorStop(1, "rgba(255, 160, 100, 0)");
    ctx.strokeStyle = ray;
    ctx.lineWidth = 3 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(angle) * radius * 0.2, sy + Math.sin(angle) * radius * 0.2);
    ctx.lineTo(sx + Math.cos(angle) * length, sy + Math.sin(angle) * length);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 248, 224, 0.7)";
  ctx.beginPath();
  ctx.arc(sx, sy, radius * 0.12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawForegroundMotes(camX, camY) {
  const tileW = W + 320;
  const tileH = H + 320;
  for (const mote of foregroundMotes) {
    const sx = mod(mote.x * tileW - camX * mote.z + menuTime * mote.drift, tileW) - 160;
    const sy =
      mod(mote.y * tileH - camY * mote.z + menuTime * mote.drift * 0.5, tileH) - 160;
    ctx.globalAlpha = mote.a * 0.4;
    ctx.fillStyle = mote.warm ? "#c68b6a" : "#7fb2de";
    ctx.beginPath();
    ctx.arc(sx, sy, mote.r * 2.2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = mote.a;
    ctx.fillStyle = mote.warm ? "#ffd8b0" : "#c9ecff";
    ctx.beginPath();
    ctx.arc(sx, sy, mote.r * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDustAndDebris(camX, camY) {
  const tileW = W + 240;
  const tileH = H + 240;
  for (const mote of dustMotes) {
    const sx = mod(mote.x * tileW - camX * mote.z + menuTime * mote.drift, tileW) - 120;
    const sy = mod(mote.y * tileH - camY * mote.z + menuTime * mote.drift * 0.45, tileH) - 120;
    ctx.globalAlpha = mote.a * 0.45;
    ctx.fillStyle = "#81a9ce";
    ctx.beginPath();
    ctx.arc(sx, sy, mote.r * 2.2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = mote.a;
    ctx.fillStyle = "#c2e4ff";
    ctx.beginPath();
    ctx.arc(sx, sy, mote.r * 0.55, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const debris of backgroundDebris) {
    const sx = mod(debris.x * tileW - camX * debris.z, tileW) - 120;
    const sy = mod(debris.y * tileH - camY * debris.z, tileH) - 120;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(debris.rot + menuTime * debris.spin);
    ctx.globalAlpha = debris.a;
    ctx.fillStyle = "#0a1428";
    ctx.strokeStyle = "rgba(120, 160, 200, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * TAU;
      const radius = debris.r * (0.72 + ((i * 37) % 29) / 100);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawDistantPlanets(camX, camY) {
  const bodies = [
    { x: 0.18, y: 0.24, r: 70, p: 0.035, c: ["#4a6ca8", "#22345f", "#0c1530"] },
    { x: 0.82, y: 0.68, r: 104, p: 0.022, c: ["#8b5b6e", "#48263a", "#140b1c"] },
    { x: 0.62, y: 0.14, r: 46, p: 0.052, c: ["#6a8c96", "#2d454f", "#0b161c"] },
  ];
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    const span = Math.max(W, H) + 520;
    const sx = mod(body.x * W - camX * body.p, span) - 180;
    const sy = mod(body.y * H - camY * body.p, span) - 180;
    if (sx < -body.r * 2 || sx > W + body.r * 2 || sy < -body.r * 2 || sy > H + body.r * 2) {
      continue;
    }
    ctx.save();
    ctx.globalAlpha = 0.22;
    const g = ctx.createRadialGradient(
      sx - body.r * 0.35,
      sy - body.r * 0.4,
      body.r * 0.1,
      sx,
      sy,
      body.r,
    );
    g.addColorStop(0, body.c[0]);
    g.addColorStop(0.62, body.c[1]);
    g.addColorStop(1, body.c[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, body.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `${body.c[0]}66`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, body.r * 1.5, body.r * 0.34, -0.32, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShootingStars(camX, camY) {
  const span = Math.max(W, H);
  for (let i = 0; i < 2; i += 1) {
    const period = 8.5 + i * 3.7;
    const t = (menuTime + i * 2.7) % period;
    if (t > 1.25) continue;
    const p = t / 1.25;
    const startX = mod(W * (0.12 + i * 0.55) - camX * 0.04, span) - 120;
    const startY = H * (0.12 + i * 0.34) - camY * 0.03;
    const x = startX + p * span * 0.42;
    const y = startY + p * span * 0.22;
    const gradient = ctx.createLinearGradient(x - 90, y - 46, x, y);
    gradient.addColorStop(0, "rgba(180, 245, 255, 0)");
    gradient.addColorStop(1, `rgba(220, 252, 255, ${0.5 * (1 - p)})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 90, y - 46);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function drawBlob(x, y, r, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.48, color);
  gradient.addColorStop(1, "rgba(4, 7, 20, 0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function drawMenuScene() {
  const r = Math.min(W, H) * 0.145;
  const cx = W / 2;
  const cy = H * 0.43;
  drawPlanet(cx, cy, r, menuTime, false);

  const moonAngle = menuTime * 0.35;
  const mx = cx + Math.cos(moonAngle) * r * 2.25;
  const my = cy + Math.sin(moonAngle) * r * 0.72;
  ctx.save();
  const glow = ctx.createRadialGradient(mx, my, 0, mx, my, r * 0.34);
  glow.addColorStop(0, "rgba(255, 209, 102, 0.7)");
  glow.addColorStop(1, "rgba(255, 209, 102, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(mx - r * 0.4, my - r * 0.4, r * 0.8, r * 0.8);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(mx, my, r * 0.075, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPlanet(sx, sy, radius, time, isPlayer, planetOverride) {
  const planet =
    planetOverride || (G && G.planet) || PLANET_BY_ID[selectedPlanetId] || PLANETS[0];
  const colors = planet.colors;
  const isSun = planet.id === "sun";
  const isJupiter = planet.id === "jupiter";
  const isVoid = planet.id === "voidstar";

  ctx.save();
  ctx.translate(sx, sy);

  const aura = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2.35);
  aura.addColorStop(0, `${colors[1]}${isPlayer ? "55" : "38"}`);
  aura.addColorStop(0.38, `${colors[2]}${isPlayer ? "28" : "18"}`);
  aura.addColorStop(1, `${colors[3]}00`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.35, 0, TAU);
  ctx.fill();

  if (isSun) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 20; i += 1) {
      const angle = (i / 20) * TAU + time * 0.12;
      const wobble = 0.82 + 0.35 * Math.abs(Math.sin(time * 1.6 + i));
      const inner = radius * 1.02;
      const outer = radius * (1.28 + wobble * 0.35);
      ctx.strokeStyle = `rgba(255, ${150 + (i % 4) * 20}, 70, ${0.12 + (i % 3) * 0.05})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.rotate(-0.36);
    ctx.strokeStyle = isVoid ? "rgba(140, 235, 255, 0.4)" : `${colors[1]}44`;
    ctx.lineWidth = Math.max(3, radius * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.92, radius * 0.48, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 209, 102, 0.16)";
    ctx.lineWidth = Math.max(1.5, radius * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 2.05, radius * 0.54, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.clip();

  const body = ctx.createRadialGradient(
    -radius * 0.42,
    -radius * 0.48,
    radius * 0.08,
    radius * 0.15,
    radius * 0.2,
    radius * 1.3,
  );
  body.addColorStop(0, colors[0]);
  body.addColorStop(0.26, colors[1]);
  body.addColorStop(0.62, colors[2]);
  body.addColorStop(1, colors[3]);
  ctx.fillStyle = body;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

  ctx.rotate(time * 0.035);
  if (isJupiter) {
    for (let i = 0; i < 8; i += 1) {
      const yy = (-0.55 + i * 0.155) * radius;
      ctx.fillStyle =
        i % 2 ? "rgba(94, 44, 34, 0.26)" : "rgba(255, 236, 198, 0.2)";
      ctx.beginPath();
      ctx.ellipse(0, yy, radius * 1.08, radius * (0.035 + (i % 3) * 0.014), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(190, 72, 58, 0.58)";
    ctx.beginPath();
    ctx.ellipse(radius * 0.26, radius * 0.16, radius * 0.27, radius * 0.15, 0.18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 223, 180, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (isSun) {
    for (let i = 0; i < 7; i += 1) {
      ctx.strokeStyle = i % 2 ? "rgba(255, 250, 215, 0.22)" : "rgba(255, 120, 50, 0.18)";
      ctx.lineWidth = radius * 0.06;
      ctx.beginPath();
      ctx.ellipse(
        Math.sin(i * 2.1) * radius * 0.12,
        (-0.45 + i * 0.16) * radius,
        radius * 1.05,
        radius * 0.07,
        0,
        0,
        TAU,
      );
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 235, 0.35)";
    ctx.beginPath();
    ctx.arc(-radius * 0.22, -radius * 0.24, radius * 0.23, 0, TAU);
    ctx.fill();
  } else if (isVoid) {
    for (let i = 0; i < 4; i += 1) {
      ctx.strokeStyle =
        i % 2 ? "rgba(155, 123, 255, 0.34)" : "rgba(111, 247, 255, 0.22)";
      ctx.lineWidth = radius * (0.025 + i * 0.008);
      ctx.beginPath();
      ctx.ellipse(
        Math.sin(i * 1.8) * radius * 0.1,
        (-0.35 + i * 0.2) * radius,
        radius * 1.05,
        radius * (0.08 + i * 0.015),
        i * 0.6,
        0,
        TAU,
      );
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(2, 3, 10, 0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(190, 165, 255, 0.45)";
    ctx.lineWidth = Math.max(1, radius * 0.035);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.73, 0, TAU);
    ctx.stroke();
  } else {
    for (let i = 0; i < 5; i += 1) {
      const yy = (-0.5 + i * 0.23) * radius;
      ctx.fillStyle = i % 2 ? "rgba(8, 24, 92, 0.18)" : "rgba(159, 251, 255, 0.13)";
      ctx.beginPath();
      ctx.ellipse(
        Math.sin(i * 2.1) * radius * 0.12,
        yy,
        radius * 1.08,
        radius * (0.06 + (i % 3) * 0.02),
        0,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.fillStyle = "rgba(63, 210, 145, 0.3)";
    ctx.beginPath();
    ctx.ellipse(-radius * 0.32, -radius * 0.12, radius * 0.24, radius * 0.15, 0.35, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(radius * 0.25, radius * 0.28, radius * 0.19, radius * 0.11, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(8, 17, 58, 0.22)";
    ctx.beginPath();
    ctx.ellipse(radius * 0.3, -radius * 0.2, radius * 0.18, radius * 0.1, 0.4, 0, TAU);
    ctx.fill();
  }

  const shade = ctx.createRadialGradient(
    -radius * 0.35,
    -radius * 0.4,
    radius * 0.1,
    radius * 0.25,
    radius * 0.3,
    radius * 1.25,
  );
  shade.addColorStop(0, "rgba(2, 6, 24, 0)");
  shade.addColorStop(0.72, "rgba(2, 6, 24, 0.07)");
  shade.addColorStop(1, "rgba(2, 4, 14, 0.72)");
  ctx.fillStyle = shade;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();

  if (isPlayer) {
    ctx.strokeStyle = "rgba(3, 7, 18, 0.92)";
    ctx.lineWidth = Math.max(4, radius * 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.015, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 247, 210, 0.95)";
    ctx.lineWidth = Math.max(1.8, radius * 0.055);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.995, 0, TAU);
    ctx.stroke();
    const pulse = 0.45 + 0.25 * Math.sin(time * 3.4);
    ctx.strokeStyle = `rgba(255, 224, 150, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.18, 0, TAU);
    ctx.stroke();
  } else {
    ctx.strokeStyle = `${colors[1]}bb`;
    ctx.lineWidth = Math.max(1, radius * 0.035);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.995, 0, TAU);
    ctx.stroke();
  }

  ctx.strokeStyle = `${colors[1]}2e`;
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.06, 0, TAU);
  ctx.stroke();

  if (!isSun) {
    ctx.save();
    ctx.rotate(-0.36);
    ctx.strokeStyle = isVoid ? "rgba(140, 235, 255, 0.72)" : `${colors[1]}88`;
    ctx.lineWidth = Math.max(3, radius * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.92, radius * 0.48, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 209, 102, 0.3)";
    ctx.lineWidth = Math.max(1.5, radius * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 2.05, radius * 0.54, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  if (isPlayer && G && G.player.shield > 0) {
    const shieldPct = G.player.shield / G.player.shieldMax;
    ctx.strokeStyle = `rgba(167, 123, 255, ${0.18 + shieldPct * 0.42})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.34, time * 0.7, time * 0.7 + TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawPlayer() {
  const p = G.player;
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);
  const blink = p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0;
  if (p.planetId === "voidstar" && p.voidCollapseActive) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    const coreRadius = p.radius * 1.55;
    const hole = ctx.createRadialGradient(sx, sy, 2, sx, sy, coreRadius);
    hole.addColorStop(0, "rgba(0, 0, 0, 1)");
    hole.addColorStop(0.58, "rgba(5, 1, 12, 1)");
    hole.addColorStop(0.78, "rgba(118, 72, 210, 0.82)");
    hole.addColorStop(0.9, "rgba(255, 231, 168, 0.55)");
    hole.addColorStop(1, "rgba(155, 123, 255, 0)");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(sx, sy, coreRadius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 239, 190, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, coreRadius * 1.34, coreRadius * 0.28, G.time * 0.9, 0, TAU);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.globalAlpha = blink ? 0.62 : 1;
    drawPlanet(sx, sy, p.radius, G.time, true);
    ctx.globalAlpha = 1;
  }

  const bob = Math.sin(G.time * 4) * 2;
  const markerY = sy - p.radius * 1.95 + bob;
  ctx.save();
  ctx.fillStyle = "rgba(255, 240, 190, 0.95)";
  ctx.strokeStyle = "rgba(3, 7, 18, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx, markerY + 11);
  ctx.lineTo(sx - 7, markerY);
  ctx.lineTo(sx + 7, markerY);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();

  if (p.planetId === "sun") {
    const ready = p.laserProgress >= p.laserProgressMax;
    const pipY = sy + p.radius * 1.78;
    for (let i = 0; i < p.laserProgressMax; i += 1) {
      ctx.fillStyle =
        i < p.laserProgress || ready
          ? ready
            ? "#ffd166"
            : "#ffcf6b"
          : "rgba(255, 255, 255, 0.16)";
      ctx.beginPath();
      ctx.arc(sx + (i - (p.laserProgressMax - 1) / 2) * 10, pipY, 2.4, 0, TAU);
      ctx.fill();
    }
    if (ready) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 221, 140, 0.9)";
      ctx.font = '600 11px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("过载", sx, pipY + 13);
      ctx.restore();
    }
  }
}

function drawSummons() {
  const p = G.player;
  if (!p.summons || p.summons.length === 0) return;

  ctx.save();
  ctx.strokeStyle = "rgba(150, 220, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 10]);
  const seen = new Set();
  for (const summon of p.summons) {
    if (seen.has(summon.orbit)) continue;
    seen.add(summon.orbit);
    ctx.beginPath();
    ctx.arc(w2sX(p.x), w2sY(p.y), summon.orbit, 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  if (G.breakthroughs.earthArray && p.summons.length > 1) {
    const points = p.summons.map((summon) => ({
      x: w2sX(p.x + Math.cos(summon.angle) * summon.orbit),
      y: w2sY(p.y + Math.sin(summon.angle) * summon.orbit),
    }));
    ctx.save();
    ctx.strokeStyle = "rgba(155, 238, 255, 0.22)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  for (const summon of p.summons) {
    const sx = w2sX(p.x + Math.cos(summon.angle) * summon.orbit);
    const sy = w2sY(p.y + Math.sin(summon.angle) * summon.orbit);
    ctx.save();
    ctx.translate(sx, sy);
    if (summon.type === "moon") {
      ctx.scale(0.84, 0.84);
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      glow.addColorStop(0, "rgba(220, 245, 255, 0.24)");
      glow.addColorStop(1, "rgba(180, 220, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, TAU);
      ctx.fill();
      const body = ctx.createRadialGradient(-4, -5, 1, 0, 0, 13);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.45, "#d8e2ea");
      body.addColorStop(1, "#7c8c9c");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, 12.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(70, 85, 100, 0.35)";
      ctx.beginPath();
      ctx.arc(-4, -2, 2.6, 0, TAU);
      ctx.arc(4.5, 4, 1.8, 0, TAU);
      ctx.arc(5, -5, 1.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 12.5, 0, TAU);
      ctx.stroke();
    } else {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      glow.addColorStop(0, "rgba(120, 225, 255, 0.22)");
      glow.addColorStop(1, "rgba(80, 170, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      ctx.scale(0.62, 0.62);
      ctx.rotate(summon.angle + Math.PI / 2);
      const panel = ctx.createLinearGradient(-20, 0, 20, 0);
      panel.addColorStop(0, "#2b4f74");
      panel.addColorStop(0.5, "#8fd6ff");
      panel.addColorStop(1, "#2b4f74");
      ctx.fillStyle = panel;
      ctx.fillRect(-20, -4, 12, 8);
      ctx.fillRect(8, -4, 12, 8);
      ctx.strokeStyle = "rgba(180, 235, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-20, -4, 12, 8);
      ctx.strokeRect(8, -4, 12, 8);
      ctx.fillStyle = "#d8ecf8";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = "#34506b";
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.strokeStyle = "#c6ecff";
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, -13);
      ctx.stroke();
      const blink = Math.sin(G.time * 6 + summon.angle) > 0.3;
      if (blink) {
        ctx.fillStyle = "#ff5f6d";
        ctx.beginPath();
        ctx.arc(0, -14, 1.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    if (summon.type === "satellite" && summon.beamCharge > 0) {
      const progress =
        1 -
        clamp(summon.beamCharge / Math.max(0.01, summon.beamChargeMax || 0.42), 0, 1);
      const dx = Math.cos(summon.beamAngle || 0);
      const dy = Math.sin(summon.beamAngle || 0);
      ctx.save();
      ctx.strokeStyle = `rgba(155, 238, 255, ${0.18 + progress * 0.42})`;
      ctx.lineWidth = 1 + progress * 2;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dx * 680, sy + dy * 680);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function drawSatelliteLasers() {
  if (!G.satelliteLaserVisuals?.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const laser of G.satelliteLaserVisuals) {
    const alpha = clamp(laser.life / laser.maxLife, 0, 1);
    const x1 = w2sX(laser.x1);
    const y1 = w2sY(laser.y1);
    const x2 = w2sX(laser.x2);
    const y2 = w2sY(laser.y2);
    ctx.strokeStyle = `rgba(60, 190, 255, ${alpha * 0.24})`;
    ctx.lineWidth = laser.width * 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(170, 245, 255, ${alpha * 0.82})`;
    ctx.lineWidth = laser.width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(245, 255, 255, ${alpha})`;
    ctx.lineWidth = Math.max(1.4, laser.width * 0.18);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpaceStation() {
  const p = G.player;
  if (p.spaceStationLevel <= 0) return;
  const sx = w2sX(p.x + Math.cos(p.spaceStationAngle) * 148);
  const sy = w2sY(p.y + Math.sin(p.spaceStationAngle) * 148);
  ctx.save();
  ctx.translate(sx, sy);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
  glow.addColorStop(0, "rgba(155, 238, 255, 0.28)");
  glow.addColorStop(1, "rgba(80, 170, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, TAU);
  ctx.fill();
  ctx.rotate(p.spaceStationAngle + Math.PI / 2);
  const panel = ctx.createLinearGradient(-25, 0, 25, 0);
  panel.addColorStop(0, "#244869");
  panel.addColorStop(0.5, "#9beeff");
  panel.addColorStop(1, "#244869");
  ctx.fillStyle = panel;
  ctx.fillRect(-24, -5, 14, 10);
  ctx.fillRect(10, -5, 14, 10);
  ctx.fillStyle = "#d9f8ff";
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = "#315676";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.strokeStyle = "rgba(200, 247, 255, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.stroke();
  const blink = Math.sin(G.time * 5.5) > 0;
  if (blink) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, -10, 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSatelliteBombs() {
  for (const bomb of G.satelliteBombs) {
    const sx = w2sX(bomb.x);
    const sy = w2sY(bomb.y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(bomb.angle + Math.PI / 2);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
    glow.addColorStop(0, "rgba(155, 238, 255, 0.34)");
    glow.addColorStop(1, "rgba(80, 170, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2b4f74";
    ctx.fillRect(-13, -3, 8, 6);
    ctx.fillRect(5, -3, 8, 6);
    ctx.fillStyle = "#e0f8ff";
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = "#9beeff";
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawLaser() {
  const p = G.player;
  if (p.weapon !== "laser") return;
  if (p.laserState !== "charging" && p.laserState !== "firing") return;
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);
  const range = LASER_RANGE;
  const charge = p.laserCharge;
  const firing = p.laserState === "firing";
  const salvoReady = p.laserProgress >= p.laserProgressMax;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  if (firing) {
    for (const visual of p.laserVisuals) {
      const alpha = clamp(visual.life / visual.maxLife, 0, 1);
      const visualWidth = visual.width || p.laserWidth;
      const dx = Math.cos(visual.angle);
      const dy = Math.sin(visual.angle);
      ctx.globalAlpha = 0.25 + 0.75 * alpha;
      ctx.strokeStyle = "rgba(255, 138, 61, 0.3)";
      ctx.lineWidth = visualWidth * (2.2 + 0.9 * alpha);
      ctx.beginPath();
      ctx.moveTo(sx + dx * p.radius, sy + dy * p.radius);
      ctx.lineTo(sx + dx * range, sy + dy * range);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 220, 150, 0.72)";
      ctx.lineWidth = visualWidth * (0.9 + 0.45 * alpha);
      ctx.beginPath();
      ctx.moveTo(sx + dx * p.radius, sy + dy * p.radius);
      ctx.lineTo(sx + dx * range, sy + dy * range);
      ctx.stroke();
      ctx.strokeStyle = "#fffdf2";
      ctx.lineWidth = Math.max(1.5, visualWidth * (0.22 + 0.2 * alpha));
      ctx.beginPath();
      ctx.moveTo(sx + dx * p.radius, sy + dy * p.radius);
      ctx.lineTo(sx + dx * range, sy + dy * range);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    const dx = Math.cos(p.laserAngle);
    const dy = Math.sin(p.laserAngle);
    const chargeWidth = p.laserWidth * (0.58 + charge * 1.72);
    ctx.strokeStyle = salvoReady
      ? "rgba(255, 220, 120, 0.62)"
      : `rgba(255, 190, 100, ${0.1 + charge * 0.26})`;
    ctx.lineWidth = salvoReady ? 3 : 2 + chargeWidth * 0.34;
    ctx.beginPath();
    ctx.moveTo(sx + dx * p.radius, sy + dy * p.radius);
    ctx.lineTo(sx + dx * range, sy + dy * range);
    ctx.stroke();
    const reticleX = sx + dx * Math.min(range, 620);
    const reticleY = sy + dy * Math.min(range, 620);
    ctx.strokeStyle = `rgba(255, 220, 140, ${0.24 + charge * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(reticleX, reticleY, 8 + charge * 8, 0, TAU);
    ctx.stroke();
  }

  const flare = ctx.createRadialGradient(sx, sy, 0, sx, sy, 34);
  flare.addColorStop(0, `rgba(255, 250, 220, ${0.35 + charge * 0.5})`);
  flare.addColorStop(1, "rgba(255, 160, 60, 0)");
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(sx, sy, 34, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawMoons() {
  const p = G.player;
  if (p.moons <= 0) return;
  for (let i = 0; i < p.moons; i += 1) {
    const angle = G.time * 2.35 + (i * TAU) / p.moons;
    const orbit = 76 + i * 17;
    const mx = w2sX(p.x + Math.cos(angle) * orbit);
    const my = w2sY(p.y + Math.sin(angle) * orbit);
    const r = 10 + i * 2;
    ctx.save();
    const glow = ctx.createRadialGradient(mx, my, 0, mx, my, r * 2.8);
    glow.addColorStop(0, "rgba(167, 123, 255, 0.55)");
    glow.addColorStop(1, "rgba(167, 123, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);
    ctx.fillStyle = "#d8c5ff";
    ctx.beginPath();
    ctx.arc(mx, my, r * 0.55, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 143, 255, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of G.enemies) {
    if (e.dead) continue;
    const sx = w2sX(e.x);
    const sy = w2sY(e.y);
    if (sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120) continue;
    drawEnemy(e, sx, sy);
  }
}

function drawEnemy(e, sx, sy) {
  ctx.save();
  ctx.translate(sx, sy);
  if (e.type === "comet") {
    drawComet(e);
  } else if (e.type === "drone") {
    drawDrone(e);
  } else if (e.type === "splitter") {
    drawSplitter(e);
  } else if (e.portal) {
    drawPortal(e);
  } else if (e.shielded) {
    drawShield(e);
  } else if (e.bomber) {
    drawBomber(e);
  } else if (e.priest) {
    drawPriest(e);
  } else if (e.boss) {
    drawBoss(e);
  } else {
    drawAsteroid(e);
  }
  ctx.restore();

  if ((e.elite || e.boss) && e.hp < e.maxHp) {
    const width = e.r * 2.1;
    const x = sx - width / 2;
    const y = sy - e.r - 16;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x, y, width, 4);
    ctx.fillStyle = e.boss ? "#ff5d9e" : "#ffd166";
    ctx.fillRect(x, y, width * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
}

function drawAsteroid(e) {
  const flash = e.hitFlash > 0;
  ctx.rotate(e.rotation);
  ctx.beginPath();
  const points = e.shape.length;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * TAU;
    const r = e.r * e.shape[i];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const gradient = ctx.createRadialGradient(-e.r * 0.35, -e.r * 0.4, 2, 0, 0, e.r * 1.2);
  gradient.addColorStop(0, flash ? "#ffffff" : "#d4e2ef");
  gradient.addColorStop(0.5, flash ? "#ffffff" : e.color);
  gradient.addColorStop(1, e.accent);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = e.elite ? "rgba(255, 209, 102, 0.85)" : "rgba(215, 236, 255, 0.22)";
  ctx.lineWidth = e.elite ? 2.5 : 1;
  ctx.stroke();

  ctx.fillStyle = "rgba(24, 38, 60, 0.35)";
  ctx.beginPath();
  ctx.arc(-e.r * 0.2, -e.r * 0.12, e.r * 0.16, 0, TAU);
  ctx.arc(e.r * 0.24, e.r * 0.2, e.r * 0.1, 0, TAU);
  ctx.fill();

  if (e.elite) {
    ctx.strokeStyle = "rgba(255, 209, 102, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 1.3, 0, TAU);
    ctx.stroke();
  }
}

function drawComet(e) {
  const speed = Math.hypot(e.vx, e.vy) || 1;
  const dx = e.vx / speed;
  const dy = e.vy / speed;
  ctx.save();
  ctx.rotate(Math.atan2(dy, dx));
  const tail = ctx.createLinearGradient(-e.r * 4.4, 0, 0, 0);
  tail.addColorStop(0, "rgba(50, 170, 255, 0)");
  tail.addColorStop(0.55, "rgba(80, 210, 255, 0.18)");
  tail.addColorStop(1, "rgba(160, 248, 255, 0.72)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(-e.r * 4.2, -e.r * 0.62);
  ctx.lineTo(0, 0);
  ctx.lineTo(-e.r * 4.2, e.r * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 2.1);
  glow.addColorStop(0, "rgba(190, 252, 255, 0.8)");
  glow.addColorStop(0.4, "rgba(80, 220, 255, 0.28)");
  glow.addColorStop(1, "rgba(40, 150, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 2.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#bdfaff";
  ctx.beginPath();
  ctx.arc(0, 0, e.r, 0, TAU);
  ctx.fill();
}

function drawDrone(e) {
  ctx.rotate(e.rotation * 0.45);
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * TAU;
    const x = Math.cos(angle) * e.r * 1.05;
    const y = Math.sin(angle) * e.r * 1.05;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#5c1f3a";
  ctx.fill();
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.rotate(-e.rotation * 0.45);
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 1.4);
  core.addColorStop(0, "#ffd6e4");
  core.addColorStop(0.3, e.color);
  core.addColorStop(1, "rgba(255, 93, 158, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 1.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffe8f0";
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 0.28, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 160, 195, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(e.r * 1.25, 0);
  ctx.stroke();
}

function drawSplitter(e) {
  const wobble = 1 + Math.sin(G.time * 4.5 + e.seed) * 0.06;
  ctx.fillStyle = "rgba(181, 140, 255, 0.14)";
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 1.5 * wobble, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  const points = 12;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * TAU;
    const r = e.r * (0.88 + Math.sin(angle * 3 + G.time * 2.2) * 0.1) * wobble;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.3, 2, 0, 0, e.r * 1.2);
  g.addColorStop(0, e.hitFlash > 0 ? "#ffffff" : "#e8dbff");
  g.addColorStop(0.4, e.color);
  g.addColorStop(1, e.accent);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(220, 198, 255, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(-e.r * 0.22, -e.r * 0.15, e.r * 0.1, 0, TAU);
  ctx.arc(e.r * 0.24, e.r * 0.18, e.r * 0.08, 0, TAU);
  ctx.fill();
}

function drawShield(e) {
  const flash = e.hitFlash > 0;
  ctx.rotate(e.rotation * 0.3);
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * TAU;
    const x = Math.cos(angle) * e.r * 1.02;
    const y = Math.sin(angle) * e.r * 1.02;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const body = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.35, 2, 0, 0, e.r * 1.2);
  body.addColorStop(0, flash ? "#ffffff" : "#d9f4ff");
  body.addColorStop(0.5, e.color);
  body.addColorStop(1, e.accent);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = "rgba(143, 214, 255, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.rotate(-e.rotation * 0.3);

  const facing = e.facing;
  ctx.strokeStyle = flash ? "#ffffff" : "rgba(160, 235, 255, 0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 1.34, facing - 0.82, facing + 0.82);
  ctx.stroke();
  ctx.strokeStyle = "rgba(143, 214, 255, 0.18)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 1.34, facing - 0.82, facing + 0.82);
  ctx.stroke();

  ctx.fillStyle = "rgba(240, 253, 255, 0.8)";
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 0.22, 0, TAU);
  ctx.fill();
}

function drawBomber(e) {
  const pulse = e.fusing ? 1 + Math.sin(G.time * 24) * 0.1 : 1;
  if (e.fusing) {
    const warn = clamp(1 - e.fuse / 1.05, 0, 1);
    ctx.strokeStyle = `rgba(255, 95, 109, ${0.35 + warn * 0.5})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255, 95, 109, ${0.08 + warn * 0.12})`;
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.rotate(e.rotation);
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * TAU;
    const r = e.r * (i % 2 ? 1.3 : 0.88) * pulse;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const body = ctx.createRadialGradient(-e.r * 0.25, -e.r * 0.3, 1, 0, 0, e.r * 1.35);
  body.addColorStop(0, e.hitFlash > 0 ? "#ffffff" : "#ffe1c4");
  body.addColorStop(0.45, e.color);
  body.addColorStop(1, e.accent);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = e.fusing ? "#ff5f6d" : "rgba(255, 180, 120, 0.55)";
  ctx.lineWidth = e.fusing ? 2.5 : 1.5;
  ctx.stroke();
  ctx.restore();

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 0.8);
  core.addColorStop(0, "#fff9ed");
  core.addColorStop(0.35, "#ffcf6b");
  core.addColorStop(1, "rgba(255, 120, 60, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 0.8, 0, TAU);
  ctx.fill();
}

function drawPriest(e) {
  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 2.2);
  aura.addColorStop(0, "rgba(195, 155, 255, 0.2)");
  aura.addColorStop(1, "rgba(195, 155, 255, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 2.2, 0, TAU);
  ctx.fill();

  ctx.rotate(e.rotation * 0.2);
  ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#3c1d68";
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.05);
  ctx.lineTo(e.r * 0.86, e.r * 0.86);
  ctx.lineTo(-e.r * 0.86, e.r * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e8dbff";
  ctx.beginPath();
  ctx.arc(0, -e.r * 0.42, e.r * 0.28, 0, TAU);
  ctx.fill();
  ctx.rotate(-e.rotation * 0.2);
  ctx.strokeStyle = "rgba(195, 155, 255, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(e.r * 0.9, -e.r * 0.7);
  ctx.lineTo(e.r * 0.9, e.r * 0.55);
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(e.r * 0.9, -e.r * 0.82, e.r * 0.16, 0, TAU);
  ctx.fill();
}

function drawPortal(e) {
  const pulse = 1 + Math.sin(G.time * 3.2 + e.seed) * 0.06;
  const aura = ctx.createRadialGradient(0, 0, e.r * 0.2, 0, 0, e.r * 2.4);
  aura.addColorStop(0, "rgba(167, 123, 255, 0.3)");
  aura.addColorStop(0.55, "rgba(75, 25, 130, 0.18)");
  aura.addColorStop(1, "rgba(40, 8, 80, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 2.4, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.rotate(e.rotation);
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = `rgba(${i % 2 ? "111, 247, 255" : "167, 123, 255"}, ${0.45 - i * 0.1})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * (0.72 + i * 0.24) * pulse, i * 1.8, i * 1.8 + Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();

  const hole = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r);
  hole.addColorStop(0, "#05030f");
  hole.addColorStop(0.55, "#1c0838");
  hole.addColorStop(0.78, "#6b2bb5");
  hole.addColorStop(1, "rgba(167, 123, 255, 0)");
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * pulse, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#e7d5ff";
  ctx.beginPath();
  ctx.ellipse(0, 0, e.r * 0.16, e.r * 0.34, G.time * 0.8, 0, TAU);
  ctx.fill();
}

function drawBoss(e) {
  const pulse = 1 + Math.sin(G.time * 3.6) * 0.03;
  const aura = ctx.createRadialGradient(0, 0, e.r * 0.4, 0, 0, e.r * 2.6);
  aura.addColorStop(0, "rgba(255, 93, 158, 0.26)");
  aura.addColorStop(0.45, "rgba(120, 30, 130, 0.15)");
  aura.addColorStop(1, "rgba(60, 10, 80, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 2.6, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.rotate(e.rotation * 0.35);
  ctx.fillStyle = "rgba(60, 12, 62, 0.9)";
  ctx.strokeStyle = "rgba(255, 93, 158, 0.3)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU;
    const inner = e.r * 0.8;
    const outer = e.r * (1.15 + (i % 3) * 0.11);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle - 0.12) * inner, Math.sin(angle - 0.12) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.lineTo(Math.cos(angle + 0.12) * inner, Math.sin(angle + 0.12) * inner);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  const body = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.35, e.r * 0.1, 0, 0, e.r * 1.08);
  body.addColorStop(0, e.hitFlash > 0 ? "#ffffff" : "#9b2b78");
  body.addColorStop(0.45, "#4a124f");
  body.addColorStop(1, "#190823");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * pulse, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = e.phase === 2 ? "rgba(255, 209, 102, 0.62)" : "rgba(255, 93, 158, 0.52)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.rotate(-e.rotation * 0.55);
  ctx.strokeStyle = "rgba(255, 120, 180, 0.32)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, e.r * 1.42, e.r * 0.56, 0.4, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, e.r * 1.3, e.r * 0.44, -0.5, 0, TAU);
  ctx.stroke();
  ctx.restore();

  const corePulse = 0.75 + Math.sin(G.time * 5) * 0.18;
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 0.55);
  core.addColorStop(0, "#fff6cf");
  core.addColorStop(0.25, "#ffd166");
  core.addColorStop(0.62, "#ff5d9e");
  core.addColorStop(1, "rgba(255, 93, 158, 0)");
  ctx.globalAlpha = corePulse;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 0.55, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255, 220, 160, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, e.r * 0.9, 0, TAU);
  ctx.stroke();
}

function drawBullets() {
  ctx.save();
  ctx.fillStyle = "rgba(4, 8, 18, 0.42)";
  for (const b of G.bullets) {
    const sx = w2sX(b.x);
    const sy = w2sY(b.y);
    ctx.beginPath();
    ctx.arc(sx, sy, b.r * 2.25, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of G.bullets) {
    const sx = w2sX(b.x);
    const sy = w2sY(b.y);
    if (b.missile) {
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(255, 164, 70, 0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-6, 0);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -4.5);
      ctx.lineTo(-5, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff4c9";
      ctx.beginPath();
      ctx.arc(3, 0, 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (b.gravityWave) {
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(155, 238, 255, 0.38)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(-8, 0, 17, -1.02, 1.02);
      ctx.stroke();
      ctx.strokeStyle = "rgba(225, 252, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-8, 0, 17, -0.92, 0.92);
      ctx.stroke();
      ctx.strokeStyle = "rgba(167, 123, 255, 0.36)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-18, 0, 25, -0.78, 0.78);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    const tail = 22;
    ctx.strokeStyle = "rgba(111, 247, 255, 0.32)";
    ctx.lineWidth = b.r * 1.4;
    ctx.beginPath();
    ctx.moveTo(sx - (b.vx / 720) * tail, sy - (b.vy / 720) * tail);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = "rgba(111, 247, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(sx, sy, b.r * 2.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#eaffff";
    ctx.beginPath();
    ctx.arc(sx, sy, b.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemyBullets() {
  ctx.save();
  ctx.fillStyle = "rgba(8, 2, 14, 0.52)";
  for (const b of G.enemyBullets) {
    if (b.captured) continue;
    const sx = w2sX(b.x);
    const sy = w2sY(b.y);
    ctx.beginPath();
    ctx.arc(sx, sy, b.r * 2.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of G.enemyBullets) {
    const sx = w2sX(b.x);
    const sy = w2sY(b.y);
    if (b.captured) {
      ctx.strokeStyle = "rgba(255, 209, 102, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, b.r * 2.1, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#fff4cf";
      ctx.beginPath();
      ctx.arc(sx, sy, b.r * 0.7, 0, TAU);
      ctx.fill();
      continue;
    }
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, b.r * 3.4);
    glow.addColorStop(0, "rgba(255, 240, 248, 0.9)");
    glow.addColorStop(0.22, b.color);
    glow.addColorStop(1, "rgba(255, 93, 158, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r * 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff1f7";
    ctx.beginPath();
    ctx.arc(sx, sy, b.r * 0.55, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawLaserScars() {
  if (!G.laserScars.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const scar of G.laserScars) {
    const alpha = clamp(scar.life / scar.maxLife, 0, 1);
    const x1 = w2sX(scar.x1);
    const y1 = w2sY(scar.y1);
    const x2 = w2sX(scar.x2);
    const y2 = w2sY(scar.y2);
    ctx.strokeStyle = `rgba(255, 125, 45, ${alpha * 0.14})`;
    ctx.lineWidth = scar.width * 2.1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 176, 80, ${alpha * 0.44})`;
    ctx.lineWidth = scar.width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 244, 205, ${alpha * 0.8})`;
    ctx.lineWidth = Math.max(1.4, scar.width * 0.14);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const t = (G.time * 0.5 + i / 4) % 1;
      ctx.fillStyle = `rgba(255, 210, 140, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(lerp(x1, x2, t), lerp(y1, y2, t), 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSingularities() {
  for (const singularity of G.singularities) {
    const sx = w2sX(singularity.x);
    const sy = w2sY(singularity.y);
    const alpha = clamp(singularity.life / singularity.maxLife, 0, 1);
    const radius = singularity.radius * (0.8 + 0.2 * (1 - alpha));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(sx, sy, 8, sx, sy, radius);
    aura.addColorStop(0, "rgba(20, 5, 40, 0.6)");
    aura.addColorStop(0.45, "rgba(100, 55, 180, 0.2)");
    aura.addColorStop(0.8, `rgba(185, 149, 255, ${0.18 * alpha})`);
    aura.addColorStop(1, "rgba(185, 149, 255, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      const spin = G.time * (0.5 + i * 0.12) * (i % 2 ? -1 : 1) + i * 1.3;
      ctx.strokeStyle = `rgba(${i % 2 ? "255, 190, 100" : "185, 149, 255"}, ${0.2 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * (0.28 + i * 0.18), spin, spin + Math.PI * 1.25);
      ctx.stroke();
    }
    const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16);
    core.addColorStop(0, "#05010c");
    core.addColorStop(0.55, "#2a0b48");
    core.addColorStop(0.8, "rgba(255, 209, 102, 0.65)");
    core.addColorStop(1, "rgba(255, 150, 80, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawWarpTrails() {
  if (!G.warpTrails.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const trail of G.warpTrails) {
    const alpha = clamp(trail.life / trail.maxLife, 0, 1);
    const x1 = w2sX(trail.x1);
    const y1 = w2sY(trail.y1);
    const x2 = w2sX(trail.x2);
    const y2 = w2sY(trail.y2);
    ctx.strokeStyle = `rgba(100, 150, 255, ${alpha * 0.16})`;
    ctx.lineWidth = trail.width * 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(160, 120, 255, ${alpha * 0.38})`;
    ctx.lineWidth = trail.width * 0.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(220, 250, 255, ${alpha * 0.72})`;
    ctx.lineWidth = Math.max(1.5, trail.width * 0.18);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const t = (G.time * 0.7 + i / 5) % 1;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      ctx.fillStyle = `rgba(230, 250, 255, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + (i % 3) * 0.7, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawWarpGhosts() {
  for (const ghost of G.warpGhosts) {
    const alpha = clamp(ghost.life / ghost.maxLife, 0, 1);
    const sx = w2sX(ghost.x);
    const sy = w2sY(ghost.y);
    ctx.save();
    ctx.globalAlpha = alpha * 0.42;
    const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, G.player.radius * 1.8);
    glow.addColorStop(0, "rgba(155, 123, 255, 0.3)");
    glow.addColorStop(1, "rgba(111, 247, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, G.player.radius * 1.8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 220, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, G.player.radius * (ghost.arrival ? 1.2 : 1.0), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWarpGuard() {
  const p = G.player;
  if (p.warpGuard <= 0) return;
  const alpha = clamp(p.warpGuard, 0, 1);
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);
  const radius = p.radius * 1.9;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const bubble = ctx.createRadialGradient(sx, sy, radius * 0.3, sx, sy, radius);
  bubble.addColorStop(0, "rgba(155, 123, 255, 0.02)");
  bubble.addColorStop(0.7, `rgba(111, 247, 255, ${alpha * 0.07})`);
  bubble.addColorStop(0.92, `rgba(185, 149, 255, ${alpha * 0.22})`);
  bubble.addColorStop(1, "rgba(185, 149, 255, 0)");
  ctx.fillStyle = bubble;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = `rgba(180, 240, 255, ${alpha * 0.75})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.arc(sx, sy, radius, G.time * 1.5, G.time * 1.5 + TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 6; i += 1) {
    const angle = G.time * 1.8 + (i * TAU) / 6;
    ctx.fillStyle = `rgba(220, 250, 255, ${alpha * 0.75})`;
    ctx.beginPath();
    ctx.arc(sx + Math.cos(angle) * radius, sy + Math.sin(angle) * radius, 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEventHorizon() {
  const p = G.player;
  if (p.planetId !== "voidstar") return;
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);
  const radius = 132 * p.eventHorizonMult;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const pull = ctx.createRadialGradient(sx, sy, p.radius, sx, sy, radius);
  pull.addColorStop(0, "rgba(30, 8, 50, 0.14)");
  pull.addColorStop(0.45, "rgba(104, 62, 180, 0.08)");
  pull.addColorStop(0.82, "rgba(155, 123, 255, 0.1)");
  pull.addColorStop(1, "rgba(155, 123, 255, 0)");
  ctx.fillStyle = pull;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, TAU);
  ctx.fill();

  for (let i = 0; i < 4; i += 1) {
    const spin = G.time * (0.35 + i * 0.08) * (i % 2 ? -1 : 1) + i * 1.7;
    ctx.strokeStyle = `rgba(${i % 2 ? "111, 247, 255" : "185, 149, 255"}, ${0.16 - i * 0.025})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(sx, sy, radius * (0.35 + i * 0.17), spin, spin + Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(143, 214, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.arc(sx, sy, radius * 1.55, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawWarpHud() {
  const p = G.player;
  if (p.planetId !== "voidstar") return;
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);
  const charges = p.warpCharges;
  const max = p.warpChargesMax;
  const ready = charges > 0;
  const ringRadius = p.radius * 1.55;
  ctx.save();
  const gap = 0.1;
  const sweep = TAU / max - gap;
  for (let i = 0; i < max; i += 1) {
    const start = -Math.PI / 2 + (i * TAU) / max + gap / 2;
    const charged = i < charges;
    const next = i === charges;
    ctx.strokeStyle = charged
      ? "rgba(140, 245, 255, 0.9)"
      : next
        ? "rgba(255, 209, 102, 0.7)"
        : "rgba(130, 150, 190, 0.22)";
    ctx.lineWidth = charged ? 3 : 2;
    ctx.beginPath();
    ctx.arc(sx, sy, ringRadius, start, start + sweep);
    ctx.stroke();
    if (next && charges < max) {
      const fraction = clamp(p.warpRecharge / p.warpRechargeTime, 0, 1);
      if (fraction > 0) {
        ctx.strokeStyle = "rgba(255, 230, 150, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, ringRadius, start, start + sweep * fraction);
        ctx.stroke();
      }
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '600 11px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = ready ? "rgba(165, 250, 255, 0.9)" : "rgba(190, 165, 255, 0.7)";
  ctx.fillText(
    ready
      ? `跃迁 ${charges}/${max}`
      : `充能 ${Math.ceil(p.warpRechargeTime - p.warpRecharge)}s`,
    sx,
    sy - p.radius * 2.35,
  );

  if (ready && !coarsePointer && mouseScreen.x > 0 && mouseScreen.y > 0) {
    const dx = mouseScreen.x - sx;
    const dy = mouseScreen.y - sy;
    const inRange = Math.hypot(dx, dy) <= 590;
    ctx.strokeStyle = inRange ? "rgba(140, 245, 255, 0.72)" : "rgba(150, 170, 200, 0.24)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(mouseScreen.x, mouseScreen.y, 12, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouseScreen.x - 18, mouseScreen.y);
    ctx.lineTo(mouseScreen.x - 7, mouseScreen.y);
    ctx.moveTo(mouseScreen.x + 7, mouseScreen.y);
    ctx.lineTo(mouseScreen.x + 18, mouseScreen.y);
    ctx.moveTo(mouseScreen.x, mouseScreen.y - 18);
    ctx.lineTo(mouseScreen.x, mouseScreen.y - 7);
    ctx.moveTo(mouseScreen.x, mouseScreen.y + 7);
    ctx.lineTo(mouseScreen.x, mouseScreen.y + 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGravityField() {
  const p = G.player;
  if (!p.gravityActive) return;
  const radius = gravityRadius();
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const field = ctx.createRadialGradient(sx, sy, radius * 0.08, sx, sy, radius);
  field.addColorStop(0, "rgba(167, 123, 255, 0.04)");
  field.addColorStop(0.55, "rgba(167, 123, 255, 0.07)");
  field.addColorStop(0.88, "rgba(111, 247, 255, 0.1)");
  field.addColorStop(1, "rgba(111, 247, 255, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, TAU);
  ctx.fill();

  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i += 1) {
    const rr = radius * (0.42 + i * 0.25);
    const spin = G.time * (0.55 + i * 0.2) * (i % 2 ? -1 : 1);
    ctx.strokeStyle = `rgba(${i === 1 ? "111, 247, 255" : "167, 123, 255"}, ${0.24 - i * 0.04})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rr, spin, spin + Math.PI * 1.35);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(167, 123, 255, 0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i += 1) {
    const angle = G.time * 0.7 + (i * TAU) / 6;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(angle) * radius * 0.28, sy + Math.sin(angle) * radius * 0.28);
    ctx.lineTo(sx + Math.cos(angle) * radius * 0.9, sy + Math.sin(angle) * radius * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanetAbilityEffects() {
  const p = G.player;
  const sx = w2sX(p.x);
  const sy = w2sY(p.y);
  if (p.planetId === "earth" && p.earthOverdriveActive) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.75 + Math.sin(G.time * 5.5) * 0.12;
    for (let i = 0; i < 3; i += 1) {
      const radius = (84 + i * 27) * pulse;
      ctx.strokeStyle =
        i === 1 ? "rgba(255, 209, 102, 0.38)" : "rgba(111, 247, 255, 0.3)";
      ctx.lineWidth = i === 1 ? 2 : 1.2;
      ctx.setLineDash(i === 1 ? [16, 7, 4, 7] : []);
      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        radius,
        G.time * (i % 2 ? -1.6 : 1.3) + i,
        G.time * (i % 2 ? -1.6 : 1.3) + i + Math.PI * 1.5,
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (p.planetId === "voidstar" && p.voidCollapseActive) {
    const radius = 230 * p.eventHorizonMult;
    const energy = clamp(p.gravityEnergy / p.gravityMax, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    const field = ctx.createRadialGradient(sx, sy, 8, sx, sy, radius);
    field.addColorStop(0, "rgba(0, 0, 0, 0.96)");
    field.addColorStop(0.16, "rgba(16, 4, 31, 0.92)");
    field.addColorStop(0.42, "rgba(92, 48, 145, 0.24)");
    field.addColorStop(0.76, `rgba(155, 123, 255, ${0.18 + (1 - energy) * 0.18})`);
    field.addColorStop(1, "rgba(155, 123, 255, 0)");
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 7; i += 1) {
      const spin = G.time * (1.15 + i * 0.16) * (i % 2 ? -1 : 1) + i;
      ctx.strokeStyle = `rgba(${i % 3 === 0 ? "255, 231, 168" : "190, 165, 255"}, ${0.18 + i * 0.018})`;
      ctx.lineWidth = 1.3 + (i % 2);
      ctx.beginPath();
      ctx.arc(sx, sy, radius * (0.2 + i * 0.09), spin, spin + Math.PI * 1.36);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSafeZones() {
  if (!G.safeZones.length) return;
  ctx.save();
  for (const zone of G.safeZones) {
    const sx = w2sX(zone.x);
    const sy = w2sY(zone.y);
    const remaining = clamp(zone.life / (zone.warning + 1.2), 0, 1);
    const progress = clamp(zone.elapsed / zone.warning, 0, 1);
    const safeResult = zone.result === "safe";
    const hitResult = zone.result === "hit";
    const color = hitResult ? "255, 84, 102" : "111, 247, 255";
    const aura = ctx.createRadialGradient(sx, sy, 4, sx, sy, zone.radius);
    aura.addColorStop(0, `rgba(${color}, ${0.12 + remaining * 0.08})`);
    aura.addColorStop(0.76, `rgba(${color}, ${0.06 + remaining * 0.06})`);
    aura.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sx, sy, zone.radius, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = `rgba(${color}, ${0.5 + remaining * 0.4})`;
    ctx.lineWidth = zone.resolved ? 2 : 2.6;
    ctx.setLineDash(zone.resolved ? [] : [12, 8]);
    ctx.beginPath();
    ctx.arc(sx, sy, zone.radius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!zone.resolved) {
      ctx.strokeStyle = "rgba(255, 239, 170, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        zone.radius - 5,
        -Math.PI / 2,
        -Math.PI / 2 + TAU * progress,
      );
      ctx.stroke();
    }

    const countdown = Math.max(0, zone.warning - zone.elapsed);
    ctx.fillStyle = safeResult
      ? "rgba(191, 252, 255, 0.92)"
      : hitResult
        ? "rgba(255, 143, 163, 0.9)"
        : "rgba(240, 254, 255, 0.96)";
    ctx.font = '700 22px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      safeResult ? "庇护" : hitResult ? "裁决" : `${Math.ceil(countdown)}`,
      sx,
      sy,
    );
    ctx.font = '600 11px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText("安全区", sx, sy + 18);
  }

  const unresolved = G.safeZones.filter((zone) => !zone.resolved);
  if (unresolved.length > 0) {
    const pulse = 0.55 + Math.sin(G.time * 9) * 0.2;
    ctx.strokeStyle = `rgba(255, 68, 92, ${0.36 + pulse * 0.24})`;
    ctx.lineWidth = 12;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    const danger = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.24,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.7,
    );
    danger.addColorStop(0, "rgba(255, 32, 72, 0)");
    danger.addColorStop(1, `rgba(255, 32, 72, ${0.09 + pulse * 0.08})`);
    ctx.fillStyle = danger;
    ctx.fillRect(0, 0, W, H);
    const waveText = `第 ${G.safeZoneWaveNumber}/${G.safeZoneTotalWaves} 波 · ${Math.ceil(
      Math.max(0, unresolved[0].warning - unresolved[0].elapsed),
    )} 秒后裁定`;
    ctx.font = '700 15px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = `rgba(255, 224, 226, ${0.82 + pulse * 0.12})`;
    ctx.textAlign = "center";
    ctx.fillText(waveText, W / 2, H * 0.18);
  }
  ctx.restore();
}

function drawLineHazards() {
  if (!G.lineHazards.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const line of G.lineHazards) {
    const x1 = w2sX(line.x1);
    const y1 = w2sY(line.y1);
    const x2 = w2sX(line.x2);
    const y2 = w2sY(line.y2);
    if (!line.active) {
      const pulse = 0.6 + 0.4 * Math.sin(G.time * 10 + line.x1 * 0.01);
      ctx.strokeStyle = `rgba(150, 28, 46, ${0.08 + pulse * 0.06})`;
      ctx.lineWidth = line.width * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(235, 75, 95, ${0.35 + pulse * 0.28})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const alpha = clamp(line.life / 0.5, 0, 1);
      ctx.strokeStyle = `rgba(155, 22, 42, ${alpha * 0.24})`;
      ctx.lineWidth = line.width * 2.4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(220, 48, 72, ${alpha * 0.62})`;
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 222, 218, ${alpha * 0.92})`;
      ctx.lineWidth = Math.max(1.5, line.width * 0.16);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHazards() {
  for (const hazard of G.hazards) {
    const sx = w2sX(hazard.x);
    const sy = w2sY(hazard.y);
    if (sx < -200 || sx > W + 200 || sy < -260 || sy > H + 200) continue;
    if (!hazard.exploded) {
      const pulse = 0.65 + 0.35 * Math.sin(G.time * 9 + hazard.x * 0.01);
      ctx.strokeStyle = `rgba(255, 150, 85, ${0.3 + pulse * 0.35})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      ctx.arc(sx, sy, hazard.radius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255, 120, 70, ${0.04 + pulse * 0.05})`;
      ctx.beginPath();
      ctx.arc(sx, sy, hazard.radius, 0, TAU);
      ctx.fill();

      if (hazard.delay < 0.5) {
        const progress = clamp(1 - hazard.delay / 0.5, 0, 1);
        const streak = ctx.createLinearGradient(sx - 90, sy - 220, sx, sy);
        streak.addColorStop(0, "rgba(255, 170, 90, 0)");
        streak.addColorStop(0.75, `rgba(255, 190, 110, ${0.3 + progress * 0.5})`);
        streak.addColorStop(1, "#fff3d2");
        ctx.strokeStyle = streak;
        ctx.lineWidth = 3 + progress * 3;
        ctx.beginPath();
        ctx.moveTo(sx - 60, sy - 170);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
    } else {
      const alpha = clamp(hazard.life / 0.55, 0, 1);
      const radius = hazard.radius * (1 + (1 - alpha) * 0.75);
      ctx.strokeStyle = `rgba(255, 170, 90, ${alpha * 0.55})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, TAU);
      ctx.stroke();
    }
  }
}

function drawEventAtmosphere() {
  const deadline = G.activeEvent?.id === "deadline";
  const flare = G.activeEvent?.id === "flare";
  if (G.tideTimer <= 0 && !deadline && !flare) return;
  if (flare) {
    const intensity = clamp((G.activeEvent?.time || 0) / 2.2, 0, 1);
    const gold = ctx.createRadialGradient(
      W * 0.5,
      H * 0.2,
      0,
      W * 0.5,
      H * 0.2,
      Math.max(W, H) * 0.85,
    );
    gold.addColorStop(0, `rgba(255, 232, 170, ${0.05 + intensity * 0.05})`);
    gold.addColorStop(0.55, `rgba(255, 160, 80, ${0.025 * intensity})`);
    gold.addColorStop(1, "rgba(255, 140, 70, 0)");
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i += 1) {
      const angle = -Math.PI * 0.85 + (i / 8) * Math.PI * 0.7;
      ctx.strokeStyle = `rgba(255, 205, 130, ${0.025 + intensity * 0.03})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.18);
      ctx.lineTo(W * 0.5 + Math.cos(angle) * Math.max(W, H), H * 0.18 + Math.sin(angle) * Math.max(W, H));
      ctx.stroke();
    }
    ctx.restore();
  }
  if (deadline) {
    const red = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.25,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.72,
    );
    red.addColorStop(0, "rgba(120, 10, 28, 0)");
    red.addColorStop(0.65, "rgba(120, 10, 28, 0.04)");
    red.addColorStop(1, "rgba(150, 15, 35, 0.13)");
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.tideTimer <= 0) return;
  const alpha = clamp(G.tideTimer / 2, 0, 1);
  const gradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  gradient.addColorStop(0, `rgba(255, 209, 102, ${0.055 * alpha})`);
  gradient.addColorStop(0.65, `rgba(255, 180, 80, ${0.025 * alpha})`);
  gradient.addColorStop(1, "rgba(255, 180, 80, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 22; i += 1) {
    const angle = G.time * (0.25 + (i % 5) * 0.03) + i * 2.3;
    const radius = 90 + ((i * 97 + G.time * 40) % Math.max(W, H)) * 0.55;
    const x = W / 2 + Math.cos(angle) * radius;
    const y = H / 2 + Math.sin(angle) * radius * 0.7;
    ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(G.time * 2 + i));
    ctx.fillStyle = i % 3 ? "#ffd166" : "#fff3cd";
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawGems() {
  for (const g of G.gems) {
    const sx = w2sX(g.x);
    const sy = w2sY(g.y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    if (g.type === "heart") {
      ctx.save();
      ctx.translate(sx, sy);
      const pulse = 0.86 + Math.sin(G.time * 5 + g.rotation) * 0.16;
      ctx.fillStyle = "rgba(255, 93, 158, 0.18)";
      ctx.beginPath();
      ctx.arc(0, 0, 15 * pulse, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ff8fb4";
      ctx.beginPath();
      ctx.arc(-3.5, -2, 4.2, 0, TAU);
      ctx.arc(3.5, -2, 4.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-7.5, 0);
      ctx.lineTo(0, 8.5);
      ctx.lineTo(7.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }
    const color = g.value >= 5 ? "#ffd166" : g.value >= 2 ? "#c39bff" : "#8dfcff";
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(g.rotation);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawShockwaves() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const sw of G.shockwaves) {
    const alpha = clamp(sw.life / sw.maxLife, 0, 1);
    const [cr, cg, cb] = sw.color || [111, 247, 255];
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.62})`;
    ctx.lineWidth = 3 + alpha * 4;
    ctx.beginPath();
    ctx.arc(w2sX(sw.x), w2sY(sw.y), sw.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(167, 123, 255, ${alpha * 0.28})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w2sX(sw.x), w2sY(sw.y), sw.r * 0.9, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of G.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    if (!p.glow) {
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.globalCompositeOperation = "lighter";
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(w2sX(p.x), w2sY(p.y), Math.max(0.3, p.size * alpha), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of G.texts) {
    const alpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = `${t.crit ? 800 : 600} ${t.size}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(3, 6, 16, 0.85)";
    ctx.strokeText(t.text, w2sX(t.x), w2sY(t.y));
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, w2sX(t.x), w2sY(t.y));
  }
  ctx.restore();
}

function drawJoystick() {
  const dx = pointer.x - pointer.startX;
  const dy = pointer.y - pointer.startY;
  const length = Math.hypot(dx, dy);
  const limit = 56;
  const scale = length > limit ? limit / length : 1;
  const knobX = pointer.startX + dx * scale;
  const knobY = pointer.startY + dy * scale;
  ctx.save();
  ctx.strokeStyle = "rgba(111, 247, 255, 0.26)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pointer.startX, pointer.startY, limit, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(111, 247, 255, 0.07)";
  ctx.fill();
  ctx.fillStyle = "rgba(111, 247, 255, 0.28)";
  ctx.beginPath();
  ctx.arc(knobX, knobY, 22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawRiftPointer() {
  const rifts = G.riftEnemies.filter((rift) => !rift.dead);
  if (!rifts.length) return;
  const rift = rifts.reduce((best, candidate) => {
    const bestD = dist2(G.player.x, G.player.y, best.x, best.y);
    const candidateD = dist2(G.player.x, G.player.y, candidate.x, candidate.y);
    return candidateD < bestD ? candidate : best;
  });
  const sx = w2sX(rift.x);
  const sy = w2sY(rift.y);
  const margin = 54;
  if (sx > margin && sx < W - margin && sy > margin && sy < H - margin) return;
  const angle = Math.atan2(sy - H / 2, sx - W / 2);
  const px = clamp(sx, margin, W - margin);
  const py = clamp(sy, margin, H - margin);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = "rgba(195, 155, 255, 0.95)";
  ctx.strokeStyle = "rgba(6, 10, 24, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(-10, 8);
  ctx.lineTo(10, 8);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "rgba(220, 200, 255, 0.8)";
  ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(rifts.length > 1 ? `裂隙 ×${rifts.length}` : "裂隙", px, py + 24);
  ctx.restore();
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.3,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.76,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.72, "rgba(0, 0, 0, 0.16)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function frame(now) {
  const raw = (now - lastFrame) / 1000;
  lastFrame = now;
  const dt = clamp(raw, 0, 0.033);
  menuTime += dt;

  try {
    if (state === "playing" && G) {
      updateGame(dt);
      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.055;
        updateHUD();
      }
    }

    render();
  } catch (error) {
    lastError = error && (error.stack || error.message) ? error.stack || error.message : String(error);
    console.error(error);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Lightweight hooks used by the built-in playtest harness.
window.__starGame = {
  start: startGame,
  menu: goMenu,
  getState() {
    if (!G) return { state };
    return {
      state,
      time: G.time,
      planet: G.planet?.id,
      difficulty: G.difficulty?.id,
      endless: G.endless,
      weapon: G.player.weapon,
      laserState: G.player.laserState,
      laserCharge: Math.round(G.player.laserCharge * 100),
      laserShotPower: Math.round((G.player.laserShotPower || 0) * 100),
      laserVisuals: G.player.laserVisuals.length,
      sunAutoAttack: Boolean(G.sunAutoAttack),
      laserProgress: G.player.laserProgress,
      laserSalvoBonus: G.player.laserSalvoBonus,
      summons: G.player.summons.map((s) => s.type),
      satelliteBombs: G.satelliteBombs.length,
      satelliteBombsLaunched: G.player.satelliteBombsLaunched,
      summonBullets: G.bullets.filter((b) => b.summon).length,
      summonShots: G.player.summonShots,
      satelliteArsenal: Boolean(G.player.satelliteArsenal),
      spaceStation: G.player.spaceStationLevel,
      missileBullets: G.bullets.filter((bullet) => bullet.missile).length,
      satelliteLasers: G.satelliteLaserVisuals.length,
      satelliteMissiles: G.player.satelliteMissiles,
      satelliteLaserShots: G.player.satelliteLaserShots,
      level: G.level,
      xp: G.xp,
      xpNext: G.xpNext,
      pendingLevels: G.pendingLevels,
      kills: G.kills,
      hp: G.player.hp,
      maxHp: G.player.maxHp,
      px: Math.round(G.player.x),
      py: Math.round(G.player.y),
      shield: G.player.shield,
      shieldMax: G.player.shieldMax,
      gravity: Math.round(G.player.gravityEnergy),
      gravityMax: Math.round(G.player.gravityMax),
      heavyDamageMult: G.player.heavyDamageMult,
      gravityPull: Math.round(G.player.gravityPullMult * 100) / 100,
      gravityActive: G.player.gravityActive,
      earthOverdriveActive: G.player.earthOverdriveActive,
      voidCollapseActive: G.player.voidCollapseActive,
      voidCollapseScale: G.player.voidCollapseScaleBonus,
      voidCollapseExtension: G.player.voidCollapseExtension,
      voidCollapseKills: G.player.voidCollapseKills,
      gravityCharge: Math.round(G.player.gravityCharge * 100),
      gravityCd: Math.round(G.player.gravityReleaseCd * 100) / 100,
      capturedBullets: G.enemyBullets.filter((b) => b.captured).length,
      gravityHeld,
      stormTimer: Math.round(G.player.stormTimer * 10) / 10,
      warpCharges: G.player.warpCharges,
      warpChargesMax: G.player.warpChargesMax,
      warpRecharge: Math.round(G.player.warpRecharge * 10) / 10,
      warpRechargeTime: G.player.warpRechargeTime,
      warpGuard: Math.round(G.player.warpGuard * 100) / 100,
      warpTrails: G.warpTrails.length,
      eventHorizon: Math.round(G.player.eventHorizonMult * 100) / 100,
      lastKey,
      lastError,
      event: G.activeEvent?.id || null,
      eventTime: G.activeEvent ? Math.round(G.activeEvent.time * 10) / 10 : 0,
      meteorWave: G.meteorWave,
      lineHazards: G.lineHazards.length,
      safeZones: G.safeZones.length,
      safeZoneWavesRemaining: G.safeZoneWavesRemaining,
      riftEnemies: G.riftEnemies.filter((rift) => !rift.dead).length,
      flarePulses: G.flarePulsesRemaining,
      tide: Math.round(G.tideTimer),
      hazards: G.hazards.length,
      endlessBossKills: G.endlessBossKills,
      enemies: G.enemies.length,
      bullets: G.bullets.length,
      bossHp: G.boss ? G.boss.hp : null,
      bossMaxHp: G.boss ? G.boss.maxHp : null,
      upgrades: { ...G.upgradeLevels },
      breakthroughs: Object.keys(G.breakthroughs),
      laserScars: G.laserScars.length,
      solarBulletClear: G.player.solarBulletClear,
      solarFlareImpact: G.player.solarFlareImpact,
      solarRadialSalvo: G.player.solarRadialSalvo,
      singularities: G.singularities.length,
    };
  },
  addXp(amount) {
    if (G && state === "playing") addXp(amount);
  },
  grantUpgrade(id) {
    if (!G) return;
    const upgrade = UPGRADES.find((entry) => entry.id === id);
    if (!upgrade) return;
    const current = G.upgradeLevels[id] || 0;
    if (current >= upgrade.max) return;
    G.upgradeLevels[id] = current + 1;
    upgrade.apply(G.player);
  },
  prepBreakthrough() {
    if (!G || state !== "playing") return;
    const breakthrough = BREAKTHROUGHS.find((entry) =>
      entry.planets.includes(G.planet.id),
    );
    if (!breakthrough) return;
    for (const [id, level] of Object.entries(breakthrough.requirement)) {
      while ((G.upgradeLevels[id] || 0) < level) {
        const upgrade = UPGRADES.find((entry) => entry.id === id);
        if (!upgrade) break;
        G.upgradeLevels[id] = (G.upgradeLevels[id] || 0) + 1;
        upgrade.apply(G.player);
      }
    }
    addXp(260);
  },
  forceBreakthrough() {
    if (!G) return;
    const breakthrough = BREAKTHROUGHS.find((entry) =>
      entry.planets.includes(G.planet.id),
    );
    if (!breakthrough) return;
    G.breakthroughs[breakthrough.id] = true;
    markCodex("breakthroughs", breakthrough.id);
  },
  setTime(time) {
    if (G) G.time = time;
  },
  spawnBoss() {
    if (G) {
      G.time = Math.max(G.time, BOSS_TIME);
      spawnBoss();
    }
  },
  killBoss() {
    if (G && G.boss) damageEnemy(G.boss, G.boss.hp + 1, { crit: true });
  },
  damagePlayer(amount) {
    if (G) {
      G.player.invuln = 0;
      damagePlayer(amount, G.player.x + 10, G.player.y);
    }
  },
  god(on = true) {
    if (G) G.player.invuln = on ? 99999 : 0;
  },
  gravity(on = true) {
    setGravityHeld(Boolean(on));
  },
  event() {
    if (G && state === "playing") triggerEvent();
  },
  deadline() {
    if (G && state === "playing") triggerEvent("deadline");
  },
  safeZone() {
    if (G && state === "playing") triggerEvent("safeZone");
  },
  meteor() {
    if (G && state === "playing") triggerEvent("meteor");
  },
  flare() {
    if (G && state === "playing") triggerEvent("flare");
  },
  rift() {
    if (G && state === "playing") triggerEvent("rift");
  },
  demoMob() {
    if (!G || state !== "playing") return;
    const types = ["shield", "bomber", "priest"];
    types.forEach((type, index) => {
      const angle = -Math.PI / 2 + index * 0.7;
      spawnEnemy(
        type,
        G.player.x + Math.cos(angle) * 260,
        G.player.y + Math.sin(angle) * 260,
      );
    });
  },
  elite() {
    if (!G || state !== "playing") return;
    const elite = spawnEnemy("elite", G.player.x + 150, G.player.y);
    if (elite) {
      elite.hp *= 1.8;
      elite.maxHp = elite.hp;
      elite.r = 36;
    }
  },
  addSatellite() {
    if (G && state === "playing" && G.player.planetId === "earth") {
      addSatellite();
    }
  },
  laserShot() {
    if (!G || state !== "playing" || G.player.weapon !== "laser") return;
    const target = nearestEnemy(G.player.x, G.player.y, LASER_RANGE);
    if (target) {
      G.player.laserAngle = Math.atan2(target.y - G.player.y, target.x - G.player.x);
    }
    startLaserSequence(false);
  },
  laserSalvo() {
    if (!G || state !== "playing" || G.player.weapon !== "laser") return;
    const target = nearestEnemy(G.player.x, G.player.y, LASER_RANGE);
    if (target) {
      G.player.laserAngle = Math.atan2(target.y - G.player.y, target.x - G.player.x);
    }
    G.player.laserProgress = G.player.laserProgressMax;
    startLaserSequence(true);
  },
  warp() {
    if (G && state === "playing" && G.player.planetId === "voidstar") {
      warpTo(W / 2 + 260, H / 2 - 60);
    }
  },
  choose(index) {
    chooseUpgradeByIndex(index);
  },
  simulate(seconds = 60) {
    if (!G || state !== "playing") return;
    const previousInvuln = G.player.invuln;
    G.player.invuln = 99999;
    const steps = Math.floor(seconds * 60);
    for (let i = 0; i < steps; i += 1) {
      G.player.x += Math.cos(G.time * 1.05) * (165 / 60);
      G.player.y += Math.sin(G.time * 0.86) * (145 / 60);
      updateGame(1 / 60);
      while (state === "levelup") {
        selectUpgrade(currentChoices[Math.floor(Math.random() * currentChoices.length)]);
      }
      if (state !== "playing") break;
    }
    G.player.invuln = previousInvuln;
    updateHUD(true);
  },
  clearRecord() {
    record = null;
    endlessBest = 0;
    endlessUnlocked = false;
    codexProgress = {
      planets: {},
      enemies: {},
      upgrades: {},
      events: {},
      breakthroughs: {},
    };
    selectedPlanetId = "earth";
    selectedDifficultyId = "cruise";
    sunAutoAttack = false;
    try {
      localStorage.removeItem("planetcore-best");
      localStorage.removeItem("planetcore-endless-best");
      localStorage.removeItem("planetcore-endless-unlocked");
      localStorage.removeItem("planetcore-codex");
      localStorage.removeItem("planetcore-last-planet");
      localStorage.removeItem("planetcore-last-difficulty");
      localStorage.removeItem("planetcore-sun-auto-attack");
    } catch {
      /* ignore */
    }
    updateRecordText();
    showToast("本地记录已清除", "good", 1600);
  },
};

const debugState = document.createElement("div");
debugState.id = "debugState";
debugState.hidden = true;
document.body.appendChild(debugState);
setInterval(() => {
  try {
    debugState.textContent = JSON.stringify(window.__starGame.getState());
  } catch {
    /* ignore */
  }
}, 300);

document.addEventListener("star-debug", (event) => {
  const detail = event.detail || {};
  const api = window.__starGame;
  if (api && typeof api[detail.cmd] === "function") {
    api[detail.cmd](detail.arg);
  }
});

if (new URLSearchParams(location.search).has("debug")) {
  const panel = document.createElement("div");
  panel.id = "debugPanel";
  panel.style.cssText =
    "position:fixed;left:12px;bottom:12px;z-index:60;display:flex;gap:6px;flex-wrap:wrap;max-width:360px;pointer-events:auto;";
  const actions = [
    ["+180 XP", "addXp", 180],
    ["Prep", "prepBreakthrough", undefined],
    ["Force BT", "forceBreakthrough", undefined],
    ["Boss", "spawnBoss", undefined],
    ["Kill Boss", "killBoss", undefined],
    ["God", "god", true],
    ["Gravity", "gravity", true],
    ["Release", "gravity", false],
    ["Event", "event", undefined],
    ["Deadline", "deadline", undefined],
    ["Safe Zones", "safeZone", undefined],
    ["Meteors", "meteor", undefined],
    ["Flare", "flare", undefined],
    ["Rift", "rift", undefined],
    ["Mob", "demoMob", undefined],
    ["Elite", "elite", undefined],
    ["Laser", "laserShot", undefined],
    ["Salvo", "laserSalvo", undefined],
    ["Warp", "warp", undefined],
    ["Sim 2s", "simulate", 2],
    ["Sim 10s", "simulate", 10],
    ["Sim 60s", "simulate", 60],
    ["Clear Save", "clearRecord", undefined],
    ["Lose", "damagePlayer", 999],
  ];
  for (const [label, cmd, arg] of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText =
      "padding:5px 9px;border:1px solid rgba(111,247,255,.35);border-radius:8px;background:rgba(4,10,24,.85);color:#9beeff;font-size:11px;";
    button.addEventListener("click", () => window.__starGame[cmd](arg));
    panel.append(button);
  }
  document.body.append(panel);
}
