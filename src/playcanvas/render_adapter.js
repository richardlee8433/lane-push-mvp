import { ShotFx } from './fx_shots.js';

function createMaterial(color) {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.update();
  return material;
}

const ASSET_ROOTS = {
  models: '/assets/models',
  textures: '/assets/textures',
  audio: '/assets/audio'
};

// Runtime media contract:
// - Put model files in /assets/models (for example: player.glb, barrel.glb, boss.glb).
// - Put texture files in /assets/textures.
// - Put audio files in /assets/audio.
// PlayCanvas runtime-loaded media should always resolve from these folders.
const RUNTIME_MODEL_PATHS = {
  player: `${ASSET_ROOTS.models}/player.glb`,
  barrel: `${ASSET_ROOTS.models}/barrel.glb`,
  boss: `${ASSET_ROOTS.models}/boss.glb`
};

const modelTransformMap = {
  player: { scale: [2.5, 2.5, 2.5], yaw: 0 },
  barrel: { scale: [1.3, 1.3, 1.3], yaw: 0 },
  boss: { scale: [4.5, 4.5, 4.5], yaw: 180 }
};

function applyVisualTransform(entity, modelKey) {
  const config = modelTransformMap[modelKey];
  entity.setLocalScale(config.scale[0], config.scale[1], config.scale[2]);
  entity.setLocalEulerAngles(0, config.yaw, 0);
}

function createProceduralRunState() {
  return {
    phase: Math.random() * Math.PI * 2,
    bobAmount: 0.06,
    swayAmount: 1.8,
    speed: 13
  };
}

export class RenderAdapter {
  constructor(app) {
    this.app = app;
    this.targetEntities = new Map();
    this.runtimeModelPaths = RUNTIME_MODEL_PATHS;
    this.modelAssets = new Map();
    this.targetStateMap = new Map();

    this.playerMaterial = createMaterial(new pc.Color(0.25, 0.75, 1));
    this.barrelMaterial = createMaterial(new pc.Color(0.75, 0.45, 0.2));
    this.bossMaterial = createMaterial(new pc.Color(0.95, 0.2, 0.2));

    this.playerEntity = new pc.Entity('Runner');
    this.playerEntity.setPosition(0, 1.2, 0);
    app.root.addChild(this.playerEntity);
    this.setVisual(this.playerEntity, 'player', () => this.createPlayerPrimitiveFallback());

    this.followTarget = new pc.Entity('FollowTarget');
    this.followTarget.setPosition(0, 1, 0);
    app.root.addChild(this.followTarget);

    this.shotFx = new ShotFx(app);

    this.preloadModels();
  }

  preloadModels() {
    // Models are loaded as PlayCanvas container assets directly from /assets/models/*.glb.
    this.loadModel('player', this.runtimeModelPaths.player).then((loaded) => {
      if (loaded) this.setVisual(this.playerEntity, 'player', () => this.createPlayerPrimitiveFallback());
    });

    this.loadModel('barrel', this.runtimeModelPaths.barrel).then((loaded) => {
      if (loaded) this.refreshTargetVisuals('barrel', 'barrel');
    });

    this.loadModel('boss', this.runtimeModelPaths.boss).then((loaded) => {
      if (loaded) this.refreshTargetVisuals('boss', 'boss');
    });
  }

  loadModel(modelKey, path) {
    return new Promise((resolve) => {
      this.app.assets.loadFromUrl(path, 'container', (err, asset) => {
        if (err || !asset) {
          console.warn(`[RenderAdapter] Failed to load model ${modelKey} from ${path}. Using primitive fallback.`, err);
          resolve(false);
          return;
        }

        this.modelAssets.set(modelKey, asset);
        resolve(true);
      });
    });
  }

  createPlayerPrimitiveFallback() {
    const primitive = new pc.Entity('PlayerFallback');
    primitive.addComponent('render', { type: 'capsule' });
    primitive.render.material = this.playerMaterial;
    applyVisualTransform(primitive, 'player');
    this.setupPlayerRunMotion(primitive);
    return primitive;
  }

  createTargetPrimitiveFallback(modelKey) {
    const primitive = new pc.Entity(`${modelKey}-Fallback`);
    primitive.addComponent('render', { type: modelKey === 'boss' ? 'box' : 'cylinder' });
    primitive.render.material = modelKey === 'boss' ? this.bossMaterial : this.barrelMaterial;
    applyVisualTransform(primitive, modelKey);
    return primitive;
  }

  createModelVisual(modelKey) {
    const asset = this.modelAssets.get(modelKey);
    if (!asset?.resource) return null;

    const visual = asset.resource.instantiateRenderEntity();
    applyVisualTransform(visual, modelKey);

    if (modelKey === 'player') this.setupPlayerRunMotion(visual);

    return visual;
  }

  setupPlayerRunMotion(visual) {
    const playedAnimation = this.tryPlayRunAnimation(visual);
    if (!playedAnimation) {
      visual.runMotionState = createProceduralRunState();
    }
  }

  tryPlayRunAnimation(visual) {
    const candidates = [];

    if (visual.anim?.baseLayer?.states) {
      for (const stateName of Object.keys(visual.anim.baseLayer.states)) {
        candidates.push(stateName);
      }
    }

    if (visual.animation?.assets) {
      for (const asset of visual.animation.assets) {
        if (asset?.name) candidates.push(asset.name);
      }
    }

    const runLike = candidates.find((name) => /run|walk/i.test(name));
    if (!runLike) return false;

    try {
      if (visual.anim?.baseLayer?.play) {
        visual.anim.baseLayer.play(runLike);
        return true;
      }

      if (visual.animation?.play) {
        visual.animation.play(runLike, 0.15);
        return true;
      }
    } catch (error) {
      console.warn('[RenderAdapter] Unable to play run animation. Falling back to procedural run motion.', error);
    }

    return false;
  }

  updatePlayerRunMotion(dt) {
    const visual = this.playerEntity.visualEntity;
    const state = visual?.runMotionState;
    if (!state) return;

    state.phase += dt * state.speed;
    const bob = Math.sin(state.phase) * state.bobAmount;
    const sway = Math.sin(state.phase * 0.5) * state.swayAmount;
    const { scale, yaw } = modelTransformMap.player;

    visual.setLocalScale(scale[0], scale[1] + bob, scale[2]);
    visual.setLocalEulerAngles(bob * 8, yaw + sway, 0);
  }

  setVisual(parent, modelKey, fallbackFactory) {
    if (parent.visualEntity) {
      parent.visualEntity.destroy();
      parent.visualEntity = null;
    }

    // To add/replace models later, update RUNTIME_MODEL_PATHS and modelTransformMap for the new key.
    const visual = this.createModelVisual(modelKey) || fallbackFactory();
    parent.addChild(visual);
    parent.visualEntity = visual;
  }

  refreshTargetVisuals(targetType, modelKey) {
    for (const record of this.targetEntities.values()) {
      if (record.type !== targetType) continue;
      this.setVisual(record.entity, modelKey, () => this.createTargetPrimitiveFallback(modelKey));
    }
  }

  createTargetEntity(target) {
    const entity = new pc.Entity(`${target.type}-${target.id}`);
    const modelKey = target.type === 'boss' ? 'boss' : 'barrel';
    this.setVisual(entity, modelKey, () => this.createTargetPrimitiveFallback(modelKey));

    this.app.root.addChild(entity);

    const record = { entity, type: target.type };
    this.targetEntities.set(target.id, record);
    return record;
  }

  sync(game, dt = 0) {
    const activeIds = new Set();

    this.playerEntity.setPosition(game.player.x, 1.2, game.player.z);
    this.followTarget.setPosition(game.player.x, 1, game.player.z);
    this.updatePlayerRunMotion(dt);

    for (const target of game.targets) {
      if (!target.alive) continue;
      activeIds.add(target.id);

      let record = this.targetEntities.get(target.id);
      if (!record) record = this.createTargetEntity(target);

      const y = target.type === 'boss' ? 2.2 : 0.8;
      record.entity.setPosition(target.x, y, target.z);

      const last = this.targetStateMap.get(target.id);
      if (last && target.hp < last.hp) {
        const muzzle = new pc.Vec3(game.player.x, 2.1, game.player.z + 0.4);
        const hit = new pc.Vec3(target.x, y + (target.type === 'boss' ? 1 : 0.5), target.z);
        this.shotFx.spawnShot(muzzle, hit);
      }

      this.targetStateMap.set(target.id, { hp: target.hp });
    }

    for (const [id, record] of this.targetEntities.entries()) {
      if (!activeIds.has(id)) {
        record.entity.destroy();
        this.targetEntities.delete(id);
        this.targetStateMap.delete(id);
      }
    }

    this.shotFx.update(dt);
  }

  clearUnits() {
    for (const record of this.targetEntities.values()) {
      record.entity.destroy();
    }
    this.targetEntities.clear();
    this.targetStateMap.clear();
    this.shotFx.clear();
  }
}
