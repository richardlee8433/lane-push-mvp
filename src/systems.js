import { BASE_VALUES, LANE, UNIT_TYPES, UPGRADE_CONFIG } from './config.js';

let unitIdCounter = 1;

export class EconomySystem {
  constructor() {
    this.resources = BASE_VALUES.startingResources;
    this.baseIncome = BASE_VALUES.incomePerSecond;
    this.incomeMultiplier = 1;
  }

  tick(dt) {
    this.resources += this.baseIncome * this.incomeMultiplier * dt;
  }

  spend(cost) {
    if (this.resources < cost) return false;
    this.resources -= cost;
    return true;
  }
}

export class UpgradeSystem {
  constructor(economy) {
    this.economy = economy;
    this.levels = { damage: 0, hp: 0, income: 0 };
  }

  buy(type) {
    const cfg = UPGRADE_CONFIG[type];
    const level = this.levels[type];
    if (!cfg || level >= cfg.maxLevel) return false;
    const cost = cfg.costs[level];
    if (!this.economy.spend(cost)) return false;

    this.levels[type] += 1;
    if (type === 'income') {
      this.economy.incomeMultiplier = cfg.multipliers[this.levels.income - 1];
    }
    return true;
  }

  applyUnitStats(base) {
    const damageMultiplier = UPGRADE_CONFIG.damage.multipliers[this.levels.damage - 1] || 1;
    const hpMultiplier = UPGRADE_CONFIG.hp.multipliers[this.levels.hp - 1] || 1;

    return {
      ...base,
      hp: base.hp * hpMultiplier,
      maxHp: base.hp * hpMultiplier,
      damage: base.damage * damageMultiplier
    };
  }
}

export class StructureSystem {
  constructor(level) {
    this.level = level;
    this.playerHQ = { hp: BASE_VALUES.playerHQHp * level.structureHpMultiplier, maxHp: BASE_VALUES.playerHQHp * level.structureHpMultiplier };
    this.enemyHQ = { hp: BASE_VALUES.enemyHQHp * level.structureHpMultiplier, maxHp: BASE_VALUES.enemyHQHp * level.structureHpMultiplier };
  }

  damageHQ(side, amount) {
    if (side === 'player') {
      this.playerHQ.hp = Math.max(0, this.playerHQ.hp - amount);
    } else {
      this.enemyHQ.hp = Math.max(0, this.enemyHQ.hp - amount);
    }
  }
}

export class SpawnerSystem {
  constructor(economy, upgrades, level) {
    this.economy = economy;
    this.upgrades = upgrades;
    this.level = level;
    this.enemySpawnTimer = 0;
  }

  spawnUnit(side, type) {
    const template = UNIT_TYPES[type];
    if (!template) return null;

    if (side === 'player' && !this.economy.spend(template.cost)) {
      return null;
    }

    const upgraded = side === 'player' ? this.upgrades.applyUnitStats(template) : {
      ...template,
      hp: template.hp * this.level.enemyStatMultiplier,
      maxHp: template.hp * this.level.enemyStatMultiplier,
      damage: template.damage * this.level.enemyStatMultiplier
    };

    return {
      id: unitIdCounter++,
      side,
      type,
      x: side === 'player' ? LANE.startX : LANE.endX,
      y: 118,
      hp: upgraded.hp,
      maxHp: upgraded.maxHp,
      damage: upgraded.damage,
      range: upgraded.range,
      attackInterval: upgraded.attackInterval,
      speed: upgraded.speed,
      attackCooldown: 0,
      dead: false
    };
  }

  tickEnemySpawner(dt) {
    this.enemySpawnTimer += dt;
    if (this.enemySpawnTimer < this.level.enemySpawnInterval) return [];
    this.enemySpawnTimer = 0;

    const wave = [];
    for (let i = 0; i < this.level.enemyWaveSize; i += 1) {
      const type = i % 2 === 0 ? 'melee' : 'ranged';
      const unit = this.spawnUnit('enemy', type);
      if (unit) {
        unit.x += i * 16;
        wave.push(unit);
      }
    }
    return wave;
  }
}

export class UnitSystem {
  update(units, structureSystem, dt) {
    for (const unit of units) {
      if (unit.dead) continue;
      if (unit.attackCooldown > 0) unit.attackCooldown -= dt;

      const enemies = units.filter((other) => !other.dead && other.side !== unit.side);
      const targetUnit = this.findClosestInRange(unit, enemies);

      if (targetUnit) {
        this.attackUnit(unit, targetUnit);
        continue;
      }

      const hq = unit.side === 'player' ? structureSystem.enemyHQ : structureSystem.playerHQ;
      const hqX = unit.side === 'player' ? LANE.endX + 30 : LANE.startX - 30;
      const distToHQ = Math.abs(unit.x - hqX);

      if (distToHQ <= Math.max(unit.range, LANE.structureDamageRange)) {
        if (unit.attackCooldown <= 0) {
          hq.hp = Math.max(0, hq.hp - unit.damage);
          unit.attackCooldown = unit.attackInterval;
        }
      } else {
        unit.x += unit.side === 'player' ? unit.speed * dt : -unit.speed * dt;
      }
    }

    for (const unit of units) {
      if (unit.hp <= 0) unit.dead = true;
    }
  }

  findClosestInRange(unit, enemies) {
    let closest = null;
    let minDistance = Infinity;

    for (const enemy of enemies) {
      const dist = Math.abs(enemy.x - unit.x);
      if (dist < minDistance) {
        minDistance = dist;
        closest = enemy;
      }
    }

    if (closest && minDistance <= unit.range) return closest;
    return null;
  }

  attackUnit(attacker, defender) {
    if (attacker.attackCooldown > 0) return;
    defender.hp -= attacker.damage;
    attacker.attackCooldown = attacker.attackInterval;
  }
}

export class UISystem {
  constructor(game) {
    this.game = game;
    this.resourcesEl = document.getElementById('resources');
    this.levelEl = document.getElementById('level');
    this.playerHqEl = document.getElementById('player-hq');
    this.enemyHqEl = document.getElementById('enemy-hq');
    this.unitsLayer = document.getElementById('units-layer');
    this.statusScreen = document.getElementById('status-screen');
  }

  render() {
    const { economy, structures, level, upgrades } = this.game;

    this.resourcesEl.textContent = `Resources: ${Math.floor(economy.resources)}`;
    this.levelEl.textContent = `Level: ${level.id}`;
    this.playerHqEl.textContent = `Player HQ: ${Math.ceil(structures.playerHQ.hp)}/${Math.ceil(structures.playerHQ.maxHp)}`;
    this.enemyHqEl.textContent = `Enemy HQ: ${Math.ceil(structures.enemyHQ.hp)}/${Math.ceil(structures.enemyHQ.maxHp)}`;

    this.renderUpgradeButton('damage', 'upgrade-damage', 'Unit Damage');
    this.renderUpgradeButton('hp', 'upgrade-hp', 'Unit HP');
    this.renderUpgradeButton('income', 'upgrade-income', 'Resource Income');

    this.unitsLayer.innerHTML = '';
    for (const unit of this.game.units.filter((u) => !u.dead)) {
      const dot = document.createElement('div');
      dot.className = `unit ${unit.side} ${unit.type === 'ranged' ? 'ranged' : ''}`;
      dot.style.left = `${unit.x}px`;
      dot.title = `${unit.side} ${unit.type} (${Math.ceil(unit.hp)} HP)`;
      this.unitsLayer.appendChild(dot);
    }
  }

  renderUpgradeButton(type, elementId, label) {
    const button = document.getElementById(elementId);
    const cfg = UPGRADE_CONFIG[type];
    const current = this.game.upgrades.levels[type];
    if (current >= cfg.maxLevel) {
      button.textContent = `${label} MAX`;
      button.disabled = true;
      return;
    }
    const nextLevel = current + 1;
    const cost = cfg.costs[current];
    button.textContent = `${label} Lv${nextLevel} (${cost})`;
  }

  showEndState(text) {
    this.statusScreen.classList.remove('hidden');
    this.statusScreen.textContent = text;
  }

  hideEndState() {
    this.statusScreen.classList.add('hidden');
    this.statusScreen.textContent = '';
  }
}

export class GameManager {
  constructor(levels) {
    this.levels = levels;
    this.isRunning = false;
    this.lastFrame = 0;
    this.units = [];
    this.level = null;
    this.economy = null;
    this.upgrades = null;
    this.spawner = null;
    this.structures = null;
    this.unitSystem = new UnitSystem();
    this.ui = new UISystem(this);

    this.bindUI();
    this.loadLevel(1);
  }

  bindUI() {
    document.getElementById('spawn-melee').addEventListener('click', () => this.spawnPlayer('melee'));
    document.getElementById('spawn-ranged').addEventListener('click', () => this.spawnPlayer('ranged'));
    document.getElementById('upgrade-damage').addEventListener('click', () => this.upgrades.buy('damage'));
    document.getElementById('upgrade-hp').addEventListener('click', () => this.upgrades.buy('hp'));
    document.getElementById('upgrade-income').addEventListener('click', () => this.upgrades.buy('income'));

    document.querySelectorAll('.level-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const levelId = Number(button.dataset.level);
        this.loadLevel(levelId);
      });
    });
  }

  loadLevel(levelId) {
    const level = this.levels.find((entry) => entry.id === levelId);
    if (!level) return;

    this.level = level;
    this.economy = new EconomySystem();
    this.upgrades = new UpgradeSystem(this.economy);
    this.structures = new StructureSystem(level);
    this.spawner = new SpawnerSystem(this.economy, this.upgrades, level);
    this.units = [];
    this.ui.hideEndState();

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrame = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    }
  }

  spawnPlayer(type) {
    if (!this.isRunning) return;
    const unit = this.spawner.spawnUnit('player', type);
    if (unit) this.units.push(unit);
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    const dt = Math.min(0.05, (timestamp - this.lastFrame) / 1000);
    this.lastFrame = timestamp;

    this.economy.tick(dt);
    this.units.push(...this.spawner.tickEnemySpawner(dt));
    this.unitSystem.update(this.units, this.structures, dt);
    this.units = this.units.filter((unit) => !unit.dead);

    if (this.structures.enemyHQ.hp <= 0) {
      this.isRunning = false;
      this.ui.showEndState('Victory! Enemy HQ Destroyed.');
    } else if (this.structures.playerHQ.hp <= 0) {
      this.isRunning = false;
      this.ui.showEndState('Defeat! Player HQ Destroyed.');
    }

    this.ui.render();

    if (this.isRunning) {
      requestAnimationFrame((ts) => this.loop(ts));
    }
  }
}
