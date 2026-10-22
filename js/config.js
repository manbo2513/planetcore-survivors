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
  critMult: 1.5,
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
  laserWidth: 18,
  laserChargeTime: 1.55,
  laserDamageMult: 2.75,
  laserBurnLevel: 0,
  laserProgress: 0,
  laserProgressMax: 5,
  laserSalvoBonus: 0,
  summonDamageMult: 1,
  summonFireMult: 1,
  satelliteMax: 0,
  satelliteInterval: 45,
  satelliteBombDamageMult: 1,
  satelliteBombRadiusMult: 1,
  satelliteBombIntervalMult: 1,
  warpChargesMax: 3,
  warpRechargeTime: 3,
  warpDamageMult: 1,
  eventHorizonMult: 1,
  heavyDamageMult: 1,
  satelliteArsenal: false,
  spaceStationLevel: 0,
  solarFlareImpact: false,
  solarStillChargeMult: 1,
  solarBulletClear: false,
  solarClearCharged: false,
  voidKillExtend: false,
  solarRadialSalvo: false,
  spaceStationAngle: 0,
  spaceStationDropCd: 9,
  voidCollapseScaleBonus: 0,
  voidCollapseExtension: 0,
  voidCollapseKills: 0,
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
    speed: 165,
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
    hp: 110,
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
    desc: "造成的所有伤害提高 20%。",
    scope: "普攻 / 激光 / 召唤物 / 超新星 / 引力与星球技能",
    max: 5,
    apply(p) {
      p.damage *= 1.2;
    },
  },
  {
    id: "firerate",
    name: "脉冲超频",
    icon: "⚡",
    desc: "出手间隔缩短 20%。",
    scope: "自身普攻 / 召唤物攻击 / 太阳蓄力时间",
    max: 5,
    apply(p) {
      p.fireInterval *= 0.8;
      p.laserChargeTime *= 0.8;
      p.summonFireMult *= 1.2;
    },
  },
  {
    id: "multishot",
    name: "双星连射",
    icon: "⊹",
    desc: "每次攻击额外发射 1 枚子弹，弹道略微展开。",
    scope: "自身普攻子弹",
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
    desc: "速度提高 10%，更容易穿过敌群。",
    scope: "移动",
    max: 4,
    planets: ["earth", "sun", "jupiter"],
    apply(p) {
      p.speed *= 1.1;
    },
  },
  {
    id: "hp",
    name: "星壳装甲",
    icon: "⬢",
    desc: "上限提高 30，并立刻恢复 30 生命。",
    scope: "生命上限",
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
    desc: "范围扩大 45%，星尘飞行速度提高 25%。",
    scope: "星尘拾取",
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
    desc: "额外穿透 1 个敌人。",
    scope: "自身普攻子弹",
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
    desc: "暴击率提高 10%，暴击造成 1.5 倍伤害。",
    scope: "子弹 / 激光",
    max: 4,
    apply(p) {
      p.crit += 0.1;
    },
  },
  {
    id: "heavyHunter",
    name: "巨构猎手",
    icon: "⌖",
    desc: "对精英和 Boss 造成的伤害提高 25%。",
    scope: "所有伤害中对精英 / Boss 的部分",
    max: 2,
    apply(p) {
      p.heavyDamageMult *= 1.25;
    },
  },
  {
    id: "nova",
    name: "超新星脉冲",
    icon: "◎",
    desc: "击退并灼烧周围敌人，伤害随攻击力提高。",
    scope: "周期冲击波（基础间隔 6.5 秒，每级缩短 0.55 秒）",
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
    desc: "每秒恢复 1 点生命。",
    scope: "生命恢复",
    max: 3,
    apply(p) {
      p.regen += 1;
    },
  },
  {
    id: "size",
    name: "等离子核心",
    icon: "●",
    desc: "子弹体积提高 18%，太阳激光宽度提高 12%；不提高伤害。",
    scope: "自身普攻 / 召唤物子弹尺寸 / 太阳激光宽度",
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
    desc: "获得 30 点，脱战 5 秒后自动恢复。",
    scope: "护盾",
    max: 3,
    rare: true,
    apply(p) {
      p.shieldMax += 30;
      p.shield = p.shieldMax;
    },
  },
  {
    id: "satellite",
    name: "人造卫星网络",
    icon: "🛰",
    desc: "上限 +1，攻击频率 +20%。",
    scope: "月球 / 人造卫星",
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
    desc: "召唤物伤害提高 30%。",
    scope: "月球 / 人造卫星 / 过剩卫星",
    max: 3,
    planets: ["earth"],
    apply(p) {
      p.summonDamageMult *= 1.3;
    },
  },
  {
    id: "excessSatellite",
    name: "过剩卫星协议",
    icon: "☄",
    desc: "引爆伤害 +35%，范围 +20%。",
    scope: "过剩卫星引爆",
    max: 2,
    rare: true,
    planets: ["earth"],
    apply(p) {
      p.satelliteBombDamageMult *= 1.35;
      p.satelliteBombRadiusMult *= 1.2;
    },
  },
  {
    id: "satelliteSpeed",
    name: "轨道加速阵列",
    icon: "⏱",
    desc: "卫星入轨与过剩卫星发射间隔缩短 10%。",
    scope: "卫星入轨 / 过剩卫星发射",
    max: 3,
    planets: ["earth"],
    apply(p) {
      p.satelliteInterval *= 0.9;
    },
  },
  {
    id: "weaponDiversity",
    name: "武器多元化",
    icon: "✣",
    desc: "人造卫星会随机使用普通弹、范围导弹或短蓄力贯穿激光攻击。",
    scope: "地球人造卫星",
    max: 1,
    rare: true,
    planets: ["earth"],
    apply(p) {
      p.satelliteArsenal = true;
    },
  },
  {
    id: "starRiverDream",
    name: "星河追梦",
    icon: "✧",
    desc: "部署一座环绕地球的空间站；人造卫星攻速 +25%、伤害 +20%，空间站每 9 秒生产爱心和少量星尘。",
    scope: "地球空间站 / 人造卫星",
    max: 1,
    rare: true,
    planets: ["earth"],
    apply(p) {
      p.spaceStationLevel = 1;
      p.spaceStationDropCd = 4;
    },
  },
  {
    id: "stormEngine",
    name: "风暴引擎",
    icon: "🌀",
    desc: "风暴释放间隔缩短 12%，范围扩大 10%。",
    scope: "木星风暴",
    max: 3,
    rare: true,
    planets: ["jupiter"],
    apply(p) {
      p.stormInterval *= 0.88;
      p.stormRadius *= 1.1;
    },
  },
  {
    id: "laserFocus",
    name: "光束聚焦",
    icon: "▮",
    desc: "激光伤害 +25%，宽度 -10%。",
    scope: "太阳激光",
    max: 3,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.laserWidth *= 0.9;
      p.laserDamageMult *= 1.25;
    },
  },
  {
    id: "stillSunCharge",
    name: "静日聚能",
    icon: "◉",
    desc: "静止不动时，日冕的充能速度提高 10%。",
    scope: "太阳自动蓄力",
    max: 3,
    planets: ["sun"],
    apply(p) {
      p.solarStillChargeMult *= 1.1;
    },
  },
  {
    id: "solarBulletClear",
    name: "日冕净界",
    icon: "◌",
    desc: "日冕每次蓄满时清除全屏敌弹。",
    scope: "太阳满蓄力",
    max: 1,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.solarBulletClear = true;
    },
  },
  {
    id: "laserBurn",
    name: "日珥灼烧",
    icon: "☀",
    desc: "命中敌人持续燃烧，叠加提高燃烧伤害。",
    scope: "太阳激光命中",
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
    desc: "范围 +22%，吸力 +30%。",
    scope: "木星专属引力场",
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
    desc: "能量上限 +25，恢复速度 +30%，释放冷却缩短 15%。",
    scope: "木星专属引力场",
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
    desc: "过载攻击额外增加 1 条射线，伤害提高 5%。",
    scope: "太阳过载射击",
    max: 3,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.laserSalvoBonus += 1;
      p.laserDamageMult *= 1.05;
    },
  },
  {
    id: "solarFlareImpact",
    name: "耀核冲击",
    icon: "☀",
    desc: "释放过载攻击时，同时触发一次太阳耀斑。",
    scope: "太阳过载射击",
    max: 1,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.solarFlareImpact = true;
    },
  },
  {
    id: "solarRadialSalvo",
    name: "无界耀变",
    icon: "✺",
    desc: "过载攻击额外增加 5 条射线，并取消瞄准角度限制，射线会向四周散射。",
    scope: "太阳过载射击",
    max: 1,
    rare: true,
    planets: ["sun"],
    apply(p) {
      p.laserSalvoBonus += 5;
      p.solarRadialSalvo = true;
    },
  },
  {
    id: "warpDrive",
    name: "折叠引擎",
    icon: "⇌",
    desc: "跃迁充能时间缩短 20%，跃迁与路径伤害提高 30%。",
    scope: "暗星跃迁",
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
    desc: "事件视界与黑洞的牵引范围、吸力、爆炸伤害提高 30%；精英/Boss 仍具有抗性。",
    scope: "暗星事件视界 / 塌缩黑洞",
    max: 2,
    rare: true,
    planets: ["voidstar"],
    apply(p) {
      p.eventHorizonMult *= 1.3;
    },
  },
  {
    id: "voidProliferation",
    name: "奇点增殖",
    icon: "◍",
    desc: "黑洞期间每击杀 1 个敌人延长 0.18 秒并扩大 1.5% 范围；最多延长 3 秒、扩大 45%。",
    scope: "暗星黑洞",
    max: 1,
    rare: true,
    planets: ["voidstar"],
    apply(p) {
      p.voidKillExtend = true;
    },
  },
];

export const BREAKTHROUGHS = [
  {
    id: "earthArray",
    name: "月轨炮阵",
    icon: "✦",
    planets: ["earth"],
    breakthrough: true,
    scope: "月球 / 人造卫星",
    requirement: { satellite: 1, lunar: 1 },
    requirementText: "人造卫星网络 Lv1 + 月潮共振 Lv1",
    desc: "月球额外释放 1 道引力波，每颗人造卫星额外发射 1 枚子弹，召唤物攻击获得更强穿透；卫星之间出现轨道连线。",
    tip: "召唤物流的收束：更多弹丸、更好的穿透，适合在卫星满编后继续堆月潮共振。",
  },
  {
    id: "solarScar",
    name: "日冕熔线",
    icon: "▤",
    planets: ["sun"],
    breakthrough: true,
    scope: "太阳激光",
    requirement: { laserFocus: 1, laserBurn: 1 },
    requirementText: "光束聚焦 Lv1 + 日珥灼烧 Lv1",
    desc: "所有激光都会在命中路径上留下持续约 2.2 秒的灼烧轨迹，对经过的敌人持续造成伤害。",
    tip: "用激光切割出一条燃烧带，再把敌群引进去；宽光束与过载扇形会留下更大的灼烧区域。",
  },
  {
    id: "tidalSingularity",
    name: "潮汐奇点",
    icon: "◉",
    planets: ["jupiter"],
    breakthrough: true,
    scope: "木星引力释放",
    requirement: { gravityWell: 1, nova: 1 },
    requirementText: "深空引力 Lv1 + 超新星脉冲 Lv1",
    desc: "引力释放后会在原地留下持续 2.5 秒的奇点，持续牵引敌人，结束时再次爆炸。",
    tip: "聚怪、拖拽、二次爆炸，适合把敌人压在奇点里再用引力或风暴收尾。",
  },
  {
    id: "foldedHorizon",
    name: "折叠视界",
    icon: "⇌",
    planets: ["voidstar"],
    breakthrough: true,
    scope: "暗星跃迁路径",
    requirement: { warpDrive: 1, eventHorizon: 1 },
    requirementText: "折叠引擎 Lv1 + 事件视界 Lv1",
    desc: "跃迁轨迹在 1.2 秒后二次坍缩，对整条路径造成额外伤害，并生成一次空间撕裂冲击。",
    tip: "三格跃迁可以连续铺设折叠路径；先拉出长线，再让整条路径依次坍缩。",
  },
];

export const BREAKTHROUGH_BY_ID = Object.fromEntries(
  BREAKTHROUGHS.map((breakthrough) => [breakthrough.id, breakthrough]),
);

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
    tip: "木星引力与暗星黑洞都能吞掉弹幕；贴近后优先击毁。",
  },
  splitter: {
    name: "裂变星云",
    threat: "中",
    desc: "死亡后分裂成三个小型子体，清理不彻底会迅速扩散。",
    tip: "用木星引力聚团，或让太阳蓄力激光一次贯穿整条队列。",
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
    tip: "盾牌转向有延迟。快速绕到侧后方，或用跃迁/引力改变相对位置，再让卫星、超新星从侧面命中。",
  },
  bomber: {
    name: "自爆孢子",
    threat: "高",
    desc: "靠近后停下并开始膨胀，短暂延迟后范围爆炸。",
    tip: "看到红色预警圈就离开；木星可在引爆前用引力击退。",
  },
  priest: {
    name: "虚空祭司",
    threat: "高",
    desc: "躲在后方为周围敌人回复生命，并发射缓慢的能量球。",
    tip: "它是优先目标。用木星引力拖出后排，或让暗星黑洞吞掉其身边护卫。",
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
    tip: "二阶段弹幕更密；用木星引力或暗星黑洞清出安全窗口再反击。",
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
    tag: "轨道文明",
    icon: "🌍",
    colors: ["#b9ffff", "#5cd6ff", "#2d6ef0", "#091245"],
    desc: "人类母星。月球以引力波犁开敌群，人造卫星不断入轨；进入星轨过载后，整条轨道都会加速运转。",
    passive: "轨道文明",
    passiveDesc:
      "自带可持续释放引力波的月球；每 30 秒发射一颗卫星，最多 5 颗，过剩卫星会脱轨自毁。按下空格进入星轨过载状态，移动速度提升 30%，召唤物攻速翻倍；再次按下或耗尽充能后退出。",
    abilityLabel: "星轨",
    abilityAction: "切换过载",
    modifiers: {
      regen: 0.15,
      gravityMax: 1,
      summonDamageMult: 1.05,
      satelliteMax: 5,
      satelliteInterval: 30,
    },
  },
  {
    id: "sun",
    name: "太阳",
    en: "SUN",
    tag: "日冕齐射",
    icon: "☀️",
    colors: ["#fffbe0", "#ffd166", "#ff8a3d", "#7a1d08"],
    weapon: "laser",
    desc: "把自身点燃的恒星。日冕会自动积蓄能量，按下空格便将当前蓄力释放为贯穿激光。",
    passive: "日冕齐射",
    passiveDesc:
      "伤害 +16%，最大生命 -15%；自动蓄力，按下空格释放激光。蓄力越久，光束越宽、伤害越高。每 5 次击发积攒一点充能，满 5 点后下一次攻击可连续释放 6 道激光。",
    abilityLabel: "日冕",
    abilityAction: "发射激光",
    modifiers: {
      maxHp: 0.85,
      damage: 1.16,
      fireInterval: 0.92,
      speed: 1.04,
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
    desc: "以质量换空间的气态巨行星。它缓慢自愈，以高频风暴击退敌群，并用专属引力场掌控战场。",
    passive: "引力洪流",
    passiveDesc:
      "最大生命 +35%，移动速度 -10%，每秒恢复 0.7 生命；每 4.8 秒释放风暴击退敌群。按住空格积蓄引力，期间获得 28% 伤害减免，松手释放冲击。",
    abilityLabel: "引力",
    abilityAction: "按住聚能",
    modifiers: {
      radius: 1.18,
      maxHp: 1.35,
      speed: 0.9,
      damage: 0.88,
      fireInterval: 1.05,
      regen: 0.7,
      gravityRadiusMult: 1.42,
      gravityMax: 1.55,
      gravityDamageMult: 1.5,
      gravityPullMult: 1.55,
      gravityDrain: 29,
      gravityRecharge: 32,
      gravityReleaseCdMult: 0.78,
      gravityMitigation: 0.28,
      stormInterval: 4.8,
      stormRadius: 225,
      magnet: 1.1,
    },
  },
  {
    id: "voidstar",
    name: "暗星",
    en: "VOIDSTAR",
    tag: "视界坍缩",
    icon: "🌑",
    colors: ["#f0e9ff", "#9b7bff", "#241052", "#02030a"],
    desc: "一颗失去推进能力的暗星。它靠折叠空间跃迁，并在路径上留下持续侵蚀现实的暗轨。",
    passive: "视界坍缩",
    passiveDesc:
      "无法移动，点击屏幕可进行跃迁，并在跃迁路径留下暗轨。跃迁最多储存 3 次，每 3 秒恢复一次；充能完全时按下空格可化身黑洞，期间不会受到伤害并持续牵引敌人和弹幕，结束时会产生一次爆炸并击退存活者。黑洞期间无法主动取消。",
    abilityLabel: "奇点",
    abilityAction: "满充能释放",
    noMove: true,
    modifiers: {
      maxHp: 1.12,
      damage: 1.12,
      fireInterval: 0.94,
      gravityMax: 1.1,
      magnet: 1.18,
      warpChargesMax: 3,
      warpRechargeTime: 3,
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
    eventIntervalMult: 1,
    eventPower: 1,
    riftCount: 1,
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
    eventIntervalMult: 0.88,
    eventPower: 1.12,
    riftCount: 2,
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
    eventIntervalMult: 0.75,
    eventPower: 1.35,
    riftCount: 3,
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
    eventIntervalMult: 0.82,
    eventPower: 1.2,
    riftCount: 2,
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
    desc: "恒星风暴连续爆发三次，每次清除敌方弹幕并灼烧全场敌人。",
    tip: "三次爆发会连续削弱敌群，适合在敌群最密时触发。",
  },
  {
    id: "deadline",
    name: "赤线封锁",
    icon: "╱",
    color: "#c23b4a",
    desc: "暗红色射线在战场中交错亮起，短暂预警后切割经过的区域。",
    tip: "观察红线预警，提前穿过空隙；暗星可以直接跃迁离开封锁区。",
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
