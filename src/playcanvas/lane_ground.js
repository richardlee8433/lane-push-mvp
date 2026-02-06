export class LaneGround {
  constructor(app, options = {}) {
    this.app = app;
    this.length = options.length ?? 220;
    this.width = options.width ?? 20;

    this.entity = new pc.Entity('LaneGround');
    this.entity.addComponent('render', { type: 'plane' });
    this.entity.setLocalScale(this.width, 1, this.length);
    this.entity.setPosition(0, 0, this.length * 0.5);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.2, 0.25, 0.3);
    material.metalness = 0.05;
    material.gloss = 0.2;
    material.update();
    this.entity.render.material = material;

    app.root.addChild(this.entity);
  }
}
