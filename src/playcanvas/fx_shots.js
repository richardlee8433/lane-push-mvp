function createUnlitMaterial({ diffuse, emissive = diffuse, emissiveIntensity = 1 }) {
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = diffuse;
  material.emissive = emissive;
  material.emissiveIntensity = emissiveIntensity;
  material.blendType = pc.BLEND_ADDITIVE;
  material.update();
  return material;
}

export class ShotFx {
  constructor(app) {
    this.app = app;
    this.effects = [];

    this.tracerMaterial = createUnlitMaterial({
      diffuse: new pc.Color(0.7, 0.9, 1),
      emissive: new pc.Color(0.45, 0.7, 1),
      emissiveIntensity: 1.8
    });

    this.flashMaterial = createUnlitMaterial({
      diffuse: new pc.Color(1, 0.85, 0.45),
      emissive: new pc.Color(1, 0.8, 0.25),
      emissiveIntensity: 2.2
    });

    this.hitMaterial = createUnlitMaterial({
      diffuse: new pc.Color(1, 0.35, 0.35),
      emissive: new pc.Color(1, 0.2, 0.2),
      emissiveIntensity: 2.4
    });
  }

  spawnShot(from, to) {
    this.spawnTracer(from, to, 0.08);
    this.spawnMuzzleFlash(from, 0.04);
    this.spawnHitFlash(to, 0.06);
  }

  spawnTracer(from, to, lifetime) {
    const tracer = new pc.Entity('Tracer');
    tracer.addComponent('render', { type: 'box' });
    tracer.render.material = this.tracerMaterial;

    const direction = new pc.Vec3().sub2(to, from);
    const length = Math.max(0.1, direction.length());
    direction.normalize();

    const center = new pc.Vec3().add2(from, to).mulScalar(0.5);
    tracer.setPosition(center);
    tracer.lookAt(to);
    tracer.rotateLocal(90, 0, 0);
    tracer.setLocalScale(0.05, length * 0.5, 0.05);

    this.app.root.addChild(tracer);
    this.effects.push({ entity: tracer, life: lifetime, maxLife: lifetime, kind: 'tracer' });
  }

  spawnMuzzleFlash(position, lifetime) {
    const flash = new pc.Entity('MuzzleFlash');
    flash.addComponent('render', { type: 'sphere' });
    flash.render.material = this.flashMaterial;
    flash.setPosition(position.x, position.y, position.z);
    flash.setLocalScale(0.18, 0.18, 0.18);

    this.app.root.addChild(flash);
    this.effects.push({ entity: flash, life: lifetime, maxLife: lifetime, kind: 'muzzle' });
  }

  spawnHitFlash(position, lifetime) {
    const hit = new pc.Entity('HitFlash');
    hit.addComponent('render', { type: 'sphere' });
    hit.render.material = this.hitMaterial;
    hit.setPosition(position.x, position.y, position.z);
    hit.setLocalScale(0.25, 0.25, 0.25);

    this.app.root.addChild(hit);
    this.effects.push({ entity: hit, life: lifetime, maxLife: lifetime, kind: 'hit' });
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.life -= dt;

      const progress = Math.max(0, effect.life / effect.maxLife);
      if (effect.kind === 'muzzle') {
        const s = 0.06 + progress * 0.12;
        effect.entity.setLocalScale(s, s, s);
      } else if (effect.kind === 'hit') {
        const s = 0.1 + progress * 0.2;
        effect.entity.setLocalScale(s, s, s);
      }

      if (effect.life <= 0) {
        effect.entity.destroy();
        this.effects.splice(i, 1);
      }
    }
  }

  clear() {
    for (const effect of this.effects) effect.entity.destroy();
    this.effects = [];
  }
}
