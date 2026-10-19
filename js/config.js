export const BOSS_TIME = 480;
export const MAX_ENEMIES = 300;
export const MAX_PARTICLES = 720;
export const MAX_DAMAGE_TEXTS = 64;
export const MAX_GEMS = 320;

export const PLAYER_BASE = {
  radius: 27,
  maxHp: 100,
  speed: 252,
  fireInterval: 0.45,
  damage: 15,
  bulletSpeed: 720,
  bulletCount: 1,
  bulletRadius: 4.2,
  pierce: 0,
  crit: 0.05,
  critMult: 2,
  magnet: 88,
  magnetSpeedMult: 1,
  regen: 0,
  moons: 0,
  novaLevel: 0,
  shieldMax: 0,
  shield: 0,
  gravityMax: 100,
  gravityRadius: 240,
  gravityDrain: 34,
  gravityRecharge: 25,
  gravityRadiusMult: 1,
  gravityDamageMult: 1,
  gravityChargeSpeed: 1,
  gravityPullMult: 1,
  weapon: "bullets",
  laserWidth: 14,
  laserChargeTime: 1.22,
  laserDamageMult: 2.75,
  laserBurnLevel: 0,
  laserProgress: 0,
  laserProgressMax: 4,
  laserSalvoBonus: 0,
  summonDamageMult: 1,
  summonFireMult: 1,
  satelliteMax: 0,
  satelliteInterval: 65,
  warpChargesMax: 3,
  warpRechargeTime: 4,
  warpDamageMult: 1,
  eventHorizonMult: 1,
};

export const ENEMY_TYPES = {
  asteroid: {
    radius: 16,
    hp: 34,
    speed: 82,
    damage: 8,
    xp: 2,
    color: "#a9bfd4",
    accent: "#5f7894",
    mass: 1,
  },
  comet: {
    radius: 11,
    hp: 21,
    speed: 152,
    damage: 6,
    xp: 2,
    color: "#7fe8ff",
    accent: "#2ea6d8",
    mass: 0.7,
  },
  drone: {
    radius: 14,
    hp: 48,
    speed: 96,
    damage: 9,
    xp: 3,
    color: "#ff7ba8",
    accent: "#8f2350",
    mass: 0.9,
    shooter: true,
  },
  splitter: {
    radius: 22,
    hp: 82,
    speed: 62,
    damage: 11,
    xp: 4,
    color: "#b58cff",
    accent: "#5b2c9e",
    mass: 1.5,
    split: true,
  },
  mini: {
    radius: 10,
    hp: 17,
    speed: 126,
    damage: 5,
    xp: 1,
    color: "#d5b8ff",
    accent: "#7b4ec9",
    mass: 0.5,
  },
  elite: {
    radius: 32,
    hp: 560,
    speed: 58,
    damage: 16,
    xp: 24,
    color: "#ffd166",
    accent: "#b36618",
    mass: 3.2,
    elite: true,
  },
  boss: {
    radius: 64,
    hp: 5000,
    speed: 48,
    damage: 20,
    xp: 60,
    color: "#ff5d9e",
    accent: "#5a0f45",
    mass: 8,
    boss: true,
  },
  shield: {
    radius: 18,
    hp: 108,
    speed: 70,
    damage: 11,
    xp: 5,
    color: "#8fd6ff",
    accent: "#255a89",
    mass: 2,
    shielded: true,
  },
  bomber: {
    radius: 16,
    hp: 62,
    speed: 96,
    damage: 9,
    xp: 3,
    color: "#ff9b5c",
    accent: "#8a2b12",
    mass: 0.9,
    bomber: true,
  },
  priest: {
    radius: 20,
    hp: 145,
    speed: 52,
    damage: 8,
    xp: 6,
    color: "#c39bff",
    accent: "#5b2c9e",
    mass: 1.2,
    priest: true,
  },
  rift: {
    radius: 36,
    hp: 260,
    speed: 0,
    damage: 0,
    xp: 30,
    color: "#a77bff",
    accent: "#2a0d55",
    mass: 99,
    portal: true,
    station: true,
  },
};

export const UPGRADES = [
  {
    id: "damage",
    name: "星核裂变",
    icon: "✦",
    desc: "子弹伤害提高 22%。",
    max: 5,
    apply(p) {
      p.damage *= 1.22;
    },
  },
  {
    id: "firerate",
    name: "脉冲超频",
    icon: "⚡",
    desc: "攻击间隔缩短 15%。",
    max: 5,
    apply(p) {
      p.fireInterval *= 0.85;
      p.laserChargeTime *= 0.85;
    },
  },
  {
    id: "multishot",
    name: "双星连射",
    icon: "⊹",
    desc: "每轮额外发射 1 枚星芒，弹道略微展开。",
    max: 3,
    rare: true,
    planets: ["earth", "jupiter"],
    apply(p) {
      p.bulletCount += 1;
    },
  },
  {
    id: "speed",
    name: "惯性引擎",
    icon: "➤",
    desc: "移动速度提高 10%，更容易穿过敌群。",
    max: 4,
    apply(p) {
      p.speed *= 1.1;
    },
  },
  {
    id: "hp",
    name: "星壳装甲",
    icon: "⬢",
    desc: "最大生命提高 30，并立刻恢复 30 生命。",
    max: 4,
    apply(p) {
      p.maxHp += 30;
      p.hp = Math.min(p.maxHp, p.hp + 30);
    },
  },
  {
    id: "magnet",
    name: "引力透镜",
    icon: "◎",
    desc: "星尘拾取范围扩大 45%，星尘飞向你的速度提高 25%。",
    max: 3,
    apply(p) {
      p.magnet *= 1.45;
      p.magnetSpeedMult *= 1.25;
    },
  },
  {
    id: "pierce",
    name: "穿透星芒",
    icon: "⌁",
    desc: "子弹可以额外穿透 1 个敌人。",
    max: 2,
    planets: ["earth", "jupiter"],
    apply(p) {
      p.pierce += 1;
    },
  },
  {
    id: "crit",
    name: "暴击星尘",
    icon: "✧",
    desc: "暴击率提高 10%，暴击造成双倍伤害。",
    max: 4,
    apply(p) {
      p.crit += 0.1;
    },
  },
  {
    id: "moon",
    name: "行星环刃",
    icon: "◐",
    desc: "获得一颗环绕卫星，撞击敌人造成伤害。",
    max: 3,
    rare: true,
    apply(p) {
      p.moons += 1;
    },
  },
  {
    id: "nova",
    name: "超新星脉冲",
    icon: "◎",
    desc: "周期性释放冲击波，击退并灼烧周围敌人。",
    max: 3,
    rare: true,
    apply(p) {
      p.novaLevel += 1;
    },
  },
  {
    id: "regen",
    name: "再生星云",
    icon: "✚",
    desc: "每秒恢复 0.6 生命。",
    max: 3,
    apply(p) {
      p.regen += 0.6;
    },
  },
  {
    id: "size",
    name: "等离子核心",
    icon: "●",
    desc: "子弹体积提高 18%；太阳的光束宽度同样提高。",
    max: 3,
    apply(p) {
      p.bulletRadius *= 1.18;
      p.laserWidth *= 1.12;
    },
  },
  {
    id: "shield",
    name: "相位护盾",
    icon: "⬡",
    desc: "获得 30 点护盾，脱战 5 秒后自动恢复。",
    max: 3,
    rare: true,
    apply(p) {
      p.shieldMax += 30;
      p.shield = p.shieldMax;
    },
  },
  {
    id: "singularity",
    name: "奇点引擎",
    icon: "◉",
    desc: "引力场最大范围 +20%，蓄力速度 +20%，释放伤害 +20%。",
    max: 2,
    rare: true,
    apply(p) {
      p.gravityRadiusMult *= 1.2;
      p.gravityChargeSpeed *= 1.2;
      p.gravityDamageMult *= 1.2;
    },
  },
  {
    id: "satellite",
    name: "人造卫星网络",
    icon: "🛰",
    desc: "人造卫星上限 +1，所有召唤物攻击频率 +20%。",
    max: 2,
    rare: true,
    planets: ["earth"],
    apply(p) {
      p.satelliteMax += 1;
      p.summonFireMult *= 1.2;
    },
  },
  {
    id: "lunar",
    name: "月潮共振",
    icon: "☾",
    desc: "月球与人造卫星的伤害提高 30%。",
    max: 3,
    planets: ["earth"],
    apply(p) {
      p.summonDamageMult *= 1.3;
    },
  },
  {
    id: "laserFocus",
    name: "光束聚焦",
    icon: "▮",
    desc: "蓄力激光宽度 +22%，激光伤害 +18%。",
    max: 3,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.laserWidth *= 1.22;
      p.laserDamageMult *= 1.18;
    },
  },
  {
    id: "laserBurn",
    name: "日珥灼烧",
    icon: "☀",
    desc: "被激光命中的敌人会持续燃烧，叠加提高燃烧伤害。",
    max: 2,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.laserBurnLevel += 1;
    },
  },
  {
    id: "gravityWell",
    name: "深空引力",
    icon: "◉",
    desc: "木星引力场范围 +22%，吸力 +30%。",
    max: 2,
    rare: true,
    planets: ["jupiter"],
    apply(p) {
      p.gravityRadiusMult *= 1.22;
      p.gravityPullMult *= 1.3;
    },
  },
  {
    id: "gravityCycle",
    name: "潮汐循环",
    icon: "◌",
    desc: "引力能量上限 +25，恢复速度 +30%，释放冷却缩短 15%。",
    max: 2,
    rare: true,
    planets: ["jupiter"],
    apply(p) {
      p.gravityMax += 25;
      p.gravityRecharge *= 1.3;
      p.gravityReleaseCdMax *= 0.85;
    },
  },
  {
    id: "prism",
    name: "分光棱镜",
    icon: "⋔",
    desc: "过载连续射击额外增加 1 次，激光伤害提高 6%。",
    max: 2,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.laserSalvoBonus += 1;
      p.laserDamageMult *= 1.06;
    },
  },
  {
    id: "warpDrive",
    name: "折叠引擎",
    icon: "⇌",
    desc: "跃迁充能时间缩短 20%，跃迁落点伤害提高 30%。",
    max: 2,
    rare: true,
    planets: ["voidstar"],
    apply(p) {
      p.warpRechargeTime *= 0.8;
      p.warpDamageMult *= 1.3;
    },
  },
  {
    id: "eventHorizon",
    name: "事件视界",
    icon: "◯",
    desc: "事件视界范围与牵引力提高 30%，贴近伤害提高 25%。",
    max: 2,
    rare: true,
    planets: ["voidstar"],
    apply(p) {
      p.eventHorizonMult *= 1.3;
    },
  },
];

export const ENEMY_LORE = {
  asteroid: {
    name: "碎星",
    threat: "低",
    desc: "被引力撕碎的旧世界残骸，缓慢但数量庞大。",
    tip: "优先用穿透与范围伤害清理，别被它们围住。",
  },
  comet: {
    name: "彗尾",
    threat: "中",
    desc: "沿着弯曲轨迹高速逼近，尾部会留下灼热轨迹。",
    tip: "横向移动比直线后退更容易甩开。",
  },
  drone: {
    name: "虚空无人机",
    threat: "中",
    desc: "保持距离并发射追踪弹的自动兵器。",
    tip: "引力可以吸走它们的弹幕，贴近后优先击毁。",
  },
  splitter: {
    name: "裂变星云",
    threat: "中",
    desc: "死亡后分裂成三个小型子体，清理不彻底会迅速扩散。",
    tip: "用引力把它们聚在一起，再一次性清掉。",
  },
  mini: {
    name: "星云子体",
    threat: "低",
    desc: "裂变星云死亡后留下的碎片，速度快但生命很低。",
    tip: "范围伤害和卫星环刃可以顺带清理。",
  },
  shield: {
    name: "盾卫",
    threat: "高",
    desc: "正面装有偏转装甲，来自正面的弹丸伤害大幅降低。",
    tip: "用引力拉扯它转向，或让卫星、超新星从侧面命中。",
  },
  bomber: {
    name: "自爆孢子",
    threat: "高",
    desc: "靠近后停下并开始膨胀，短暂延迟后范围爆炸。",
    tip: "看到红色预警圈就离开；也可在引爆前用引力击退。",
  },
  priest: {
    name: "虚空祭司",
    threat: "高",
    desc: "躲在后方为周围敌人回复生命，并发射缓慢的能量球。",
    tip: "它是优先目标。用引力把它从后排拖出来。",
  },
  elite: {
    name: "陨星领主",
    threat: "极高",
    desc: "周期性出现的重型碎星，拥有极高生命与撞击伤害。",
    tip: "保留引力能量，把它和杂兵一起聚团后爆发。",
  },
  boss: {
    name: "虚空吞噬者",
    threat: "灾厄",
    desc: "从虚空深处醒来的行星猎手，会召唤彗尾并释放环形弹幕。",
    tip: "二阶段弹幕更密；用引力吸弹后寻找安全窗口输出。",
  },
  rift: {
    name: "虚空裂隙",
    threat: "事件",
    desc: "特殊事件中出现的稳定裂隙，会持续吐出敌人。",
    tip: "打掉裂隙才能结束增援，别只顾着清小怪。",
  },
};

export const PLANETS = [
  {
    id: "earth",
    name: "地球",
    en: "EARTH",
    tag: "卫星召唤",
    icon: "🌍",
    colors: ["#b9ffff", "#5cd6ff", "#2d6ef0", "#091245"],
    desc: "人类母星。月球先行，随后人造卫星陆续入轨，用一整张轨道火力网替母星清扫深空。",
    passive: "轨道文明",
    passiveDesc:
      "开局自带月球；每 62 秒发射一颗人造卫星，最多 4 颗。月球与卫星会自动锁定并攻击敌人。",
    modifiers: {
      regen: 0.15,
      gravityRadiusMult: 0.95,
      gravityMax: 1,
      gravityDamageMult: 1,
      summonDamageMult: 1.05,
      satelliteMax: 4,
      satelliteInterval: 62,
    },
  },
  {
    id: "sun",
    name: "太阳",
    en: "SUN",
    tag: "蓄力激光",
    icon: "☀️",
    colors: ["#fffbe0", "#ffd166", "#ff8a3d", "#7a1d08"],
    weapon: "laser",
    desc: "把自身点燃的恒星。基础攻击改为蓄力激光；每次开火积攒过载，攒满后下一次攻击会连续速射多道激光。",
    passive: "日冕过载",
    passiveDesc:
      "每 4 次激光积攒一次过载，下次攻击沿同一条指示线快速连续射出 3 道激光。伤害 +16%，攻速 +8%，但最大生命 -15%，引力较弱。",
    modifiers: {
      maxHp: 0.85,
      damage: 1.16,
      fireInterval: 0.92,
      speed: 1.04,
      gravityRadiusMult: 0.8,
      gravityMax: 0.85,
      gravityDamageMult: 0.9,
      magnet: 0.95,
    },
  },
  {
    id: "jupiter",
    name: "木星",
    en: "JUPITER",
    tag: "引力洪流",
    icon: "🪐",
    colors: ["#ffe8c2", "#e0b07a", "#9c5f3a", "#2a1220"],
    desc: "以质量换空间的气态巨行星。引力场远大于其他星核，靠聚怪与释放冲击波碾碎敌群。",
    passive: "引力洪流",
    passiveDesc:
      "引力范围、能量、吸力与释放伤害大幅提高；每 6.5 秒释放风暴击退敌群。最大生命 +35%，移速 -10%。",
    modifiers: {
      radius: 1.18,
      maxHp: 1.35,
      speed: 0.9,
      damage: 0.88,
      fireInterval: 1.05,
      gravityRadiusMult: 1.42,
      gravityMax: 1.55,
      gravityDamageMult: 1.5,
      gravityPullMult: 1.55,
      gravityDrain: 29,
      gravityRecharge: 32,
      gravityReleaseCdMult: 0.78,
      magnet: 1.1,
    },
  },
  {
    id: "voidstar",
    name: "暗星",
    en: "VOIDSTAR",
    tag: "跃迁奇点",
    icon: "🌑",
    colors: ["#f0e9ff", "#9b7bff", "#241052", "#02030a"],
    desc: "一颗失去推进能力的暗星。它不靠引擎移动，而是折叠空间：点击或轻触战场即可跃迁。",
    passive: "事件视界",
    passiveDesc:
      "无法使用 WASD 移动。跃迁可存 3 格，每格 4 秒依次回充；点击/轻触或按 Q 消耗一格跃迁，路径造成伤害并留下轨迹。事件视界牵引杂兵，但对精英/Boss产生斥力与剪切伤害；重质量目标贴近且应急就绪时会自动触发跃迁。",
    noMove: true,
    modifiers: {
      maxHp: 1.12,
      damage: 1.12,
      fireInterval: 0.94,
      gravityRadiusMult: 1.05,
      gravityMax: 1.1,
      gravityDamageMult: 1.1,
      magnet: 1.18,
      warpChargesMax: 3,
      warpRechargeTime: 4,
      warpDamageMult: 1,
      eventHorizonMult: 1,
    },
  },
];

export const DIFFICULTIES = [
  {
    id: "cruise",
    name: "巡航",
    tag: "标准",
    desc: "适合第一次进入深空。敌人压力较低，容错更高。",
    enemyHp: 0.95,
    enemyDamage: 0.9,
    enemySpeed: 1,
    spawnRate: 0.95,
    eliteRate: 0.9,
    bossHp: 0.9,
    xpMult: 1,
  },
  {
    id: "deep",
    name: "深空",
    tag: "进阶",
    desc: "敌人更密、更硬，精英出现更频繁。推荐熟悉引力后挑战。",
    enemyHp: 1.15,
    enemyDamage: 1.12,
    enemySpeed: 1.03,
    spawnRate: 1.12,
    eliteRate: 1.1,
    bossHp: 1.15,
    xpMult: 1.02,
  },
  {
    id: "void",
    name: "虚空",
    tag: "噩梦",
    desc: "深空不再留手。高伤害、高密度、高血量，只给最熟练的星核。",
    enemyHp: 1.4,
    enemyDamage: 1.38,
    enemySpeed: 1.07,
    spawnRate: 1.3,
    eliteRate: 1.25,
    bossHp: 1.35,
    xpMult: 1.06,
  },
  {
    id: "endless",
    name: "无尽深空",
    tag: "解锁",
    desc: "通关一次后解锁。Boss 会反复归来，只有存活时间能证明你的光。",
    enemyHp: 1.2,
    enemyDamage: 1.15,
    enemySpeed: 1.05,
    spawnRate: 1.15,
    eliteRate: 1.15,
    bossHp: 1.2,
    xpMult: 1.03,
    endless: true,
  },
];

export const EVENTS = [
  {
    id: "meteor",
    name: "流星雨",
    icon: "☄",
    color: "#ffb35c",
    desc: "深空碎片成批坠落，落点会出现短暂预警。",
    tip: "预警圈内不要停留；也可以把敌人聚进落点。",
  },
  {
    id: "rift",
    name: "虚空裂隙",
    icon: "◉",
    color: "#a77bff",
    desc: "一道稳定的虚空裂隙开启，持续吐出敌人。",
    tip: "裂隙本身是目标，击碎它才能停止增援。",
  },
  {
    id: "tide",
    name: "星尘潮汐",
    icon: "✧",
    color: "#ffd166",
    desc: "星尘被潮汐牵引，短时间内全图星尘都会飞向星核。",
    tip: "趁这段时间拉开距离，或主动冲进敌群吸收经验。",
  },
  {
    id: "flare",
    name: "太阳耀斑",
    icon: "☀",
    color: "#ff8a3d",
    desc: "恒星风暴横扫战场，清除敌方弹幕并灼烧全场敌人。",
    tip: "耀斑会伤害所有敌人，适合在敌群最密时触发。",
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const PLANET_BY_ID = Object.fromEntries(PLANETS.map((p) => [p.id, p]));
export const DIFFICULTY_BY_ID = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const WAVE_LABELS = [
  [0, "深空 · 静默"],
  [35, "碎星带"],
  [80, "彗尾乱流"],
  [140, "无人机群"],
  [210, "裂变星云"],
  [290, "引力风暴"],
  [370, "虚空回响"],
  [BOSS_TIME - 10, "吞噬者逼近"],
];

export function waveLabel(time) {
  let label = WAVE_LABELS[0][1];
  for (const [at, text] of WAVE_LABELS) {
    if (time >= at) label = text;
  }
  return label;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
