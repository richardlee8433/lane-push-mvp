import { LANE } from '../config.js';

const LANE_LENGTH = 120;
const LANE_SCALE = LANE_LENGTH / (LANE.endX - LANE.startX);

function createMaterial(color) {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.update();
  return material;
}

export class RenderAdapter {
  constructor(app) {
    this.app = app;
    this.unitEntities = new Map();

    this.playerMaterial = createMaterial(new pc.Color(0.2, 0.7, 1));
    this.enemyMaterial = createMaterial(new pc.Color(1, 0.35, 0.35));
    this.playerHQMaterial = createMaterial(new pc.Color(0.1, 0.45, 1));
    this.enemyHQMaterial = createMaterial(new pc.Color(1, 0.2, 0.2));

    this.playerHQ = this.createHQ('PlayerHQ', this.playerHQMaterial, 0);
    this.enemyHQ = this.createHQ('EnemyHQ', this.enemyHQMaterial, LANE_LENGTH);

    this.followTarget = new pc.Entity('FollowTarget');
    this.followTarget.setPosition(0, 1, 0);
    app.root.addChild(this.followTarget);
  }

  createHQ(name, material, z) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box' });
    entity.render.material = material;
    entity.setLocalScale(4, 4, 4);
    entity.setPosition(0, 2, z);
    this.app.root.addChild(entity);
    return entity;
  }

  mapLaneToZ(laneX) {
    return (laneX - LANE.startX) * LANE_SCALE;
  }

  sync(game) {
    const livingUnits = game.units.filter((unit) => !unit.dead);
    const activeIds = new Set(livingUnits.map((unit) => unit.id));

    for (const unit of livingUnits) {
      let entity = this.unitEntities.get(unit.id);
      if (!entity) {
        entity = new pc.Entity(`${unit.side}-${unit.type}-${unit.id}`);
        entity.addComponent('render', { type: unit.type === 'ranged' ? 'sphere' : 'capsule' });
        entity.render.material = unit.side === 'player' ? this.playerMaterial : this.enemyMaterial;
        entity.setLocalScale(unit.type === 'ranged' ? 1.2 : 1, unit.type === 'ranged' ? 1.2 : 2, unit.type === 'ranged' ? 1.2 : 1);
        this.app.root.addChild(entity);
        this.unitEntities.set(unit.id, entity);
      }

      const z = this.mapLaneToZ(unit.x);
      entity.setPosition(0, unit.type === 'ranged' ? 1.2 : 1, z);
    }

    for (const [id, entity] of this.unitEntities.entries()) {
      if (!activeIds.has(id)) {
        entity.destroy();
        this.unitEntities.delete(id);
      }
    }

    const playerUnits = livingUnits.filter((unit) => unit.side === 'player');
    const maxPlayerZ = playerUnits.length > 0
      ? Math.max(...playerUnits.map((unit) => this.mapLaneToZ(unit.x)))
      : 0;

    this.followTarget.setPosition(0, 1, Math.max(0, maxPlayerZ));
  }

  clearUnits() {
    for (const entity of this.unitEntities.values()) {
      entity.destroy();
    }
    this.unitEntities.clear();
    this.followTarget.setPosition(0, 1, 0);
  }
}
