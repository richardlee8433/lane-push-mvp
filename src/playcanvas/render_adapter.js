function createMaterial(color) {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.update();
  return material;
}

export class RenderAdapter {
  constructor(app) {
    this.app = app;
    this.targetEntities = new Map();

    this.playerMaterial = createMaterial(new pc.Color(0.25, 0.75, 1));
    this.barrelMaterial = createMaterial(new pc.Color(0.75, 0.45, 0.2));
    this.bossMaterial = createMaterial(new pc.Color(0.95, 0.2, 0.2));

    this.playerEntity = new pc.Entity('Runner');
    this.playerEntity.addComponent('render', { type: 'capsule' });
    this.playerEntity.render.material = this.playerMaterial;
    this.playerEntity.setLocalScale(1, 1.5, 1);
    this.playerEntity.setPosition(0, 1.2, 0);
    app.root.addChild(this.playerEntity);

    this.followTarget = new pc.Entity('FollowTarget');
    this.followTarget.setPosition(0, 1, 0);
    app.root.addChild(this.followTarget);
  }

  createTargetEntity(target) {
    const entity = new pc.Entity(`${target.type}-${target.id}`);
    entity.addComponent('render', { type: target.type === 'boss' ? 'box' : 'cylinder' });
    entity.render.material = target.type === 'boss' ? this.bossMaterial : this.barrelMaterial;

    if (target.type === 'boss') {
      entity.setLocalScale(4.5, 4.5, 4.5);
    } else {
      entity.setLocalScale(1.3, 1.3, 1.3);
    }

    this.app.root.addChild(entity);
    this.targetEntities.set(target.id, entity);
    return entity;
  }

  sync(game) {
    const activeIds = new Set();

    this.playerEntity.setPosition(game.player.x, 1.2, game.player.z);
    this.followTarget.setPosition(game.player.x, 1, game.player.z);

    for (const target of game.targets) {
      if (!target.alive) continue;
      activeIds.add(target.id);

      let entity = this.targetEntities.get(target.id);
      if (!entity) entity = this.createTargetEntity(target);

      const y = target.type === 'boss' ? 2.2 : 0.8;
      entity.setPosition(target.x, y, target.z);
    }

    for (const [id, entity] of this.targetEntities.entries()) {
      if (!activeIds.has(id)) {
        entity.destroy();
        this.targetEntities.delete(id);
      }
    }
  }

  clearUnits() {
    for (const entity of this.targetEntities.values()) {
      entity.destroy();
    }
    this.targetEntities.clear();
  }
}
