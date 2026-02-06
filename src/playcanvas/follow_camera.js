export class FollowCamera {
  constructor(cameraEntity, options = {}) {
    this.cameraEntity = cameraEntity;
    this.target = options.target || null;
    this.height = options.height ?? 8;
    this.distance = options.distance ?? 14;
    this.lookAhead = options.lookAhead ?? 20;
    this.smooth = options.smooth ?? 0.1;
    this.tempDesired = new pc.Vec3();
    this.tempLook = new pc.Vec3();
  }

  setTarget(target) {
    this.target = target;
  }

  update(dt) {
    if (!this.target) return;

    const tpos = this.target.getPosition();
    this.tempDesired.set(tpos.x, tpos.y + this.height, tpos.z - this.distance);

    const cpos = this.cameraEntity.getPosition().clone();
    const alpha = 1 - Math.pow(1 - this.smooth, dt * 60);
    cpos.lerp(cpos, this.tempDesired, alpha);
    this.cameraEntity.setPosition(cpos);

    this.tempLook.set(tpos.x, tpos.y + 1, tpos.z + this.lookAhead);
    this.cameraEntity.lookAt(this.tempLook);
  }
}
