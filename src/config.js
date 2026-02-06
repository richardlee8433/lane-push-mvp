export const UNIT_TYPES = {
  melee: {
    cost: 25,
    hp: 120,
    damage: 14,
    range: 18,
    attackInterval: 1.1,
    speed: 46
  },
  ranged: {
    cost: 35,
    hp: 80,
    damage: 10,
    range: 70,
    attackInterval: 1.6,
    speed: 38
  }
};

export const UPGRADE_CONFIG = {
  damage: {
    maxLevel: 3,
    costs: [60, 90, 130],
    multipliers: [1.15, 1.3, 1.5]
  },
  hp: {
    maxLevel: 3,
    costs: [60, 90, 130],
    multipliers: [1.15, 1.3, 1.5]
  },
  income: {
    maxLevel: 3,
    costs: [80, 120, 160],
    multipliers: [1.25, 1.5, 1.9]
  }
};

export const BASE_VALUES = {
  startingResources: 100,
  incomePerSecond: 12,
  playerHQHp: 600,
  enemyHQHp: 600
};

export const LANE = {
  startX: 90,
  endX: 930,
  structureDamageRange: 28
};
