function createBarMaterial(color) {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.emissive = color.clone().mulScalar(0.2);
  material.opacity = 0;
  material.blendType = pc.BLEND_NORMAL;
  material.update();
  return material;
}

function applyOpacity(material, opacity) {
  material.opacity = opacity;
  material.update();
}

export class PlayerHealthBar {
  constructor(app, parentEntity) {
    this.app = app;
    this.parentEntity = parentEntity;
    this.maxWidth = 1.4;
    this.currentOpacity = 0;
    this.targetOpacity = 0;

    this.root = new pc.Entity('PlayerHealthBar');
    this.root.setLocalPosition(0, 4.1, 0);

    this.bgMaterial = createBarMaterial(new pc.Color(0.04, 0.04, 0.05));
    this.fillMaterial = createBarMaterial(new pc.Color(0.2, 0.92, 0.35));

    this.bg = new pc.Entity('HPBarBG');
    this.bg.addComponent('render', { type: 'box' });
    this.bg.setLocalScale(this.maxWidth, 0.12, 0.08);
    this.bg.render.material = this.bgMaterial;

    this.fill = new pc.Entity('HPBarFill');
    this.fill.addComponent('render', { type: 'box' });
    this.fill.render.material = this.fillMaterial;

    this.root.addChild(this.bg);
    this.root.addChild(this.fill);
    this.parentEntity.addChild(this.root);

    this.setRatio(1);
  }

  setRatio(ratio) {
    const clamped = pc.math.clamp(ratio, 0, 1);
    const width = Math.max(0.0001, this.maxWidth * clamped);
    this.fill.setLocalScale(width, 0.08, 0.06);
    this.fill.setLocalPosition(-(this.maxWidth - width) * 0.5, 0, 0.08);
    this.targetOpacity = clamped < 0.999 ? 1 : 0;
  }

  update(dt) {
    const alpha = 1 - Math.pow(0.002, dt);
    this.currentOpacity = pc.math.lerp(this.currentOpacity, this.targetOpacity, alpha);
    applyOpacity(this.bgMaterial, this.currentOpacity * 0.75);
    applyOpacity(this.fillMaterial, this.currentOpacity);
  }
}
