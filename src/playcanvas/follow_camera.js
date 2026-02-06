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
    this.shakeTime = 0;
    this.shakeDuration = 0.1;
    this.shakeMagnitude = 0;
    this.shakeOffset = new pc.Vec3();
  }

  setTarget(target) {
    this.target = target;
  }

  shake(magnitude = 0.15, duration = 0.08) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeDuration = Math.max(0.02, duration);
    this.shakeTime = this.shakeDuration;
  }

  update(dt) {
    if (!this.target) return;

    const tpos = this.target.getPosition();
    this.tempDesired.set(tpos.x, tpos.y + this.height, tpos.z - this.distance);

    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const normalized = this.shakeTime / this.shakeDuration;
      const amount = this.shakeMagnitude * normalized;
      this.shakeOffset.set((Math.random() * 2 - 1) * amount, (Math.random() * 2 - 1) * amount * 0.65, (Math.random() * 2 - 1) * amount);
      this.tempDesired.add(this.shakeOffset);
    }

    const cpos = this.cameraEntity.getPosition().clone();
    const alpha = 1 - Math.pow(1 - this.smooth, dt * 60);
    cpos.lerp(cpos, this.tempDesired, alpha);
    this.cameraEntity.setPosition(cpos);

    this.tempLook.set(tpos.x, tpos.y + 1, tpos.z + this.lookAhead);
    this.cameraEntity.lookAt(this.tempLook);
  }
}
