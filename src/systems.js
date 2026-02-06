let targetIdCounter = 1;

class ProgressionSystem {
  constructor(config = {}) {
    this.base = config.base ?? 20;
    this.growth = config.growth ?? 10;
    this.bonuses = {
      damageMultiplier: config.levelUpBonuses?.damageMultiplier ?? 1.12,
      fireRateMultiplier: config.levelUpBonuses?.fireRateMultiplier ?? 0.94,
      rangeAdd: config.levelUpBonuses?.rangeAdd ?? 0.6
    };
  }

  thresholdFor(level) {
    return this.base + this.growth * (level - 1);
  }
}

export class RunnerUI {
  constructor(game) {
    this.game = game;
    this.coinsEl = document.getElementById('coins-counter');
    this.distanceEl = document.getElementById('distance-counter');
    this.levelUpEl = document.getElementById('levelup-effect');
    this.statusEl = document.getElementById('status-screen');
    this.levelUpTimeout = null;
  }

  render() {
    this.coinsEl.textContent = `Coins: ${Math.floor(this.game.coins)}`;

    if (this.distanceEl) {
      const current = Math.floor(this.game.player.z);
      const target = this.game.level?.distanceToBoss ?? 0;
      this.distanceEl.textContent = `${current}m / ${target}m`;
    }
  }

  showLevelUp(level) {
    if (!this.levelUpEl) return;
    this.levelUpEl.textContent = `LEVEL ${level}!`;
    this.levelUpEl.classList.remove('hidden');
    this.levelUpEl.classList.add('show');
    window.clearTimeout(this.levelUpTimeout);
    this.levelUpTimeout = window.setTimeout(() => {
      this.levelUpEl.classList.remove('show');
      this.levelUpEl.classList.add('hidden');
    }, 700);
  }

  showStatus(text) {
    this.statusEl.textContent = text;
    this.statusEl.classList.remove('hidden');
  }

  hideStatus() {
    this.statusEl.textContent = '';
    this.statusEl.classList.add('hidden');
  }
}

export class GameManager {
  constructor(config, hooks = {}) {
    this.levels = config.levels ?? [];
    this.progression = new ProgressionSystem(config.progression);
    this.hooks = hooks;

    this.currentLevelIndex = 0;
    this.level = null;

    this.coins = 0;
    this.isRunning = false;
    this.lastFrame = 0;

    this.player = {
      x: 0,
      z: 0,
      laneStep: 2.6,
      minX: -5.2,
      maxX: 5.2,
      hp: 100,
      maxHp: 100,
      damage: 14,
      fireInterval: 0.3,
      fireRange: 18,
      fireCooldown: 0,
      level: 1,
      xp: 0,
      xpToNext: this.progression.thresholdFor(1)
    };

    this.targets = [];
    this.spawnCursorZ = 0;
    this.bossSpawned = false;
    this.levelCompleted = false;

    this.ui = new RunnerUI(this);

    this.keys = { left: false, right: false };
    this.bindInput();

    this.loadLevel(0);
  }

  bindInput() {
    const isLeftKey = (event) => event.code === 'KeyA' || event.key === 'ArrowLeft';
    const isRightKey = (event) => event.code === 'KeyD' || event.key === 'ArrowRight';

    window.addEventListener('keydown', (event) => {
      if (isLeftKey(event)) {
        this.keys.left = true;
      }
      if (isRightKey(event)) {
        this.keys.right = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (isLeftKey(event)) {
        this.keys.left = false;
      }
      if (isRightKey(event)) {
        this.keys.right = false;
      }
    });
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    this.level = this.levels[index];
    if (!this.level) {
      this.endRun('All levels clear!');
      return;
    }

    this.player.z = 0;
    this.player.x = 0;
    this.player.fireCooldown = 0;

    this.targets = [];
    this.spawnCursorZ = this.level.rowInterval;
    this.bossSpawned = false;
    this.levelCompleted = false;
    this.ui.hideStatus();

    if (this.hooks.onLevelLoaded) this.hooks.onLevelLoaded(this);

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrame = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    }
  }

  spawnRow(z) {
    const laneCount = 5;
    for (let i = 0; i < laneCount; i += 1) {
      if (Math.random() < 0.5) continue;
      const laneX = -5.2 + i * 2.6;
      this.targets.push({
        id: targetIdCounter++,
        type: 'barrel',
        x: laneX,
        z,
        hp: this.level.barrelHP,
        maxHp: this.level.barrelHP,
        xpReward: this.level.xpPerKill,
        coinReward: this.level.coinPerKill,
        alive: true
      });
    }
  }

  spawnBoss() {
    this.targets.push({
      id: targetIdCounter++,
      type: 'boss',
      x: 0,
      z: this.level.distanceToBoss + this.level.boss.spawnOffset,
      hp: this.level.boss.hp,
      maxHp: this.level.boss.hp,
      xpReward: this.level.xpPerKill * 6,
      coinReward: this.level.coinPerKill * 8,
      alive: true
    });
    this.bossSpawned = true;
  }

  updateMovement(dt) {
    const laneSpeed = 11;
    // Horizontal axis convention: left is -X, right is +X.
    if (this.keys.left) this.player.x -= laneSpeed * dt;
    if (this.keys.right) this.player.x += laneSpeed * dt;
    this.player.x = Math.max(this.player.minX, Math.min(this.player.maxX, this.player.x));

    this.player.z += this.level.speed * dt;
  }

  updateSpawning() {
    const ahead = this.player.z + 55;
    while (!this.bossSpawned && this.spawnCursorZ <= ahead && this.spawnCursorZ < this.level.distanceToBoss) {
      this.spawnRow(this.spawnCursorZ);
      this.spawnCursorZ += this.level.rowInterval;
    }

    if (!this.bossSpawned && this.player.z >= this.level.distanceToBoss) {
      this.spawnBoss();
    }
  }

  updateAutoFire(dt) {
    this.player.fireCooldown -= dt;
    if (this.player.fireCooldown > 0) return;

    let best = null;
    let bestDist = Infinity;
    for (const target of this.targets) {
      if (!target.alive) continue;
      const dz = target.z - this.player.z;
      if (dz < -2) continue;
      const dx = target.x - this.player.x;
      const dist = Math.hypot(dx, dz);
      if (dist <= this.player.fireRange && dist < bestDist) {
        best = target;
        bestDist = dist;
      }
    }

    if (!best) return;

    best.hp -= this.player.damage;
    this.player.fireCooldown = this.player.fireInterval;

    if (best.hp <= 0) {
      best.alive = false;
      this.awardKill(best);
    }
  }

  awardKill(target) {
    this.coins += target.coinReward;
    this.player.xp += target.xpReward;

    while (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext;
      this.player.level += 1;
      this.player.xpToNext = this.progression.thresholdFor(this.player.level);
      this.player.damage *= this.progression.bonuses.damageMultiplier;
      this.player.fireInterval *= this.progression.bonuses.fireRateMultiplier;
      this.player.fireRange += this.progression.bonuses.rangeAdd;
      this.ui.showLevelUp(this.player.level);
    }

    if (target.type === 'boss') {
      this.levelCompleted = true;
    }
  }

  cleanupTargets() {
    const trailingCutoff = this.player.z - 20;
    this.targets = this.targets.filter((target) => target.alive && target.z >= trailingCutoff);
  }

  advanceLevelIfNeeded() {
    if (!this.levelCompleted) return;

    const nextIndex = this.currentLevelIndex + 1;
    if (nextIndex >= this.levels.length) {
      this.endRun('All levels clear!');
      return;
    }

    this.loadLevel(nextIndex);
  }

  endRun(text) {
    this.isRunning = false;
    this.ui.showStatus(text);
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    const dt = Math.min(0.05, (timestamp - this.lastFrame) / 1000);
    this.lastFrame = timestamp;

    this.updateMovement(dt);
    this.updateSpawning();
    this.updateAutoFire(dt);
    this.cleanupTargets();
    this.advanceLevelIfNeeded();

    this.ui.render();
    if (this.hooks.onFrame) this.hooks.onFrame(this, dt);

    if (this.isRunning) requestAnimationFrame((ts) => this.loop(ts));
  }
}
