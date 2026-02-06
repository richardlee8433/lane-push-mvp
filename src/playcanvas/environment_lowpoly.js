function createMaterial(color) {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.specular = new pc.Color(0.08, 0.08, 0.1);
  material.gloss = 0.25;
  material.metalness = 0;
  material.cull = pc.CULLFACE_NONE;
  material.update();
  return material;
}

export class LowPolyEnvironment {
  constructor(app, options = {}) {
    this.app = app;
    this.size = options.size ?? 400;
    this.segments = options.segments ?? 80;
    this.time = 0;
    this.enableLandforms = options.enableLandforms ?? false;
    this.enableWater = options.enableWater ?? true;

    this.waterMaterial = createMaterial(new pc.Color(0.12, 0.52, 0.62));
    this.landMaterial = createMaterial(new pc.Color(0.34, 0.42, 0.34));
    this.rockMaterial = createMaterial(new pc.Color(0.42, 0.4, 0.38));

    this.setupAtmosphere();
    if (this.enableWater) {
      this.createWater();
    }
    if (this.enableLandforms) {
      this.createDistantLandforms();
    }
  }

  setupAtmosphere() {
    try {
      this.app.scene.fogType = pc.FOG_LINEAR;
      this.app.scene.fogColor = new pc.Color(0.56, 0.7, 0.8);
      this.app.scene.fogStart = 70;
      this.app.scene.fogEnd = 360;
    } catch (error) {
      if (!LowPolyEnvironment.didWarnFogSetup) {
        console.warn('LowPolyEnvironment: fog setup unsupported, continuing without fog.', error);
        LowPolyEnvironment.didWarnFogSetup = true;
      }
    }
  }

  createWater() {
    const cellSize = this.size / this.segments;
    const triCount = this.segments * this.segments * 2;
    const vertexCount = triCount * 3;

    this.positions = new Float32Array(vertexCount * 3);
    this.normals = new Float32Array(vertexCount * 3);
    this.baseXZ = new Float32Array(vertexCount * 2);
    this.wavePhase = new Float32Array(vertexCount * 2);
    this.waterIndices = new Uint16Array(vertexCount);

    let v = 0;
    for (let z = 0; z < this.segments; z += 1) {
      const z0 = -this.size * 0.5 + z * cellSize;
      const z1 = z0 + cellSize;

      for (let x = 0; x < this.segments; x += 1) {
        const x0 = -this.size * 0.5 + x * cellSize;
        const x1 = x0 + cellSize;

        v = this.writeTri(v, x0, z0, x0, z1, x1, z0);
        v = this.writeTri(v, x1, z0, x0, z1, x1, z1);
      }
    }

    for (let i = 0; i < vertexCount; i += 1) {
      this.waterIndices[i] = i;
    }

    this.waterMesh = new pc.Mesh(this.app.graphicsDevice);
    this.waterMesh.setPositions(this.positions);
    this.waterMesh.setNormals(this.normals);
    this.waterMesh.setIndices(this.waterIndices);
    this.waterMesh.update(pc.PRIMITIVE_TRIANGLES);

    const node = new pc.GraphNode('LowPolyWaterNode');
    const meshInstance = new pc.MeshInstance(this.waterMesh, this.waterMaterial, node);

    this.waterEntity = new pc.Entity('LowPolyWater');
    this.waterEntity.addComponent('render', {
      meshInstances: [meshInstance],
      castShadows: false,
      receiveShadows: false
    });
    this.waterEntity.setPosition(0, -0.25, 170);

    this.app.root.addChild(this.waterEntity);
  }

  writeTri(vertexOffset, ax, az, bx, bz, cx, cz) {
    const offsets = [
      [ax, az],
      [bx, bz],
      [cx, cz]
    ];

    for (let i = 0; i < 3; i += 1) {
      const vertexIndex = vertexOffset + i;
      const posOffset = vertexIndex * 3;
      const x = offsets[i][0];
      const z = offsets[i][1];

      this.positions[posOffset] = x;
      this.positions[posOffset + 1] = this.sampleWaveHeight(x, z, 0);
      this.positions[posOffset + 2] = z;

      const phaseOffset = vertexIndex * 2;
      this.baseXZ[phaseOffset] = x;
      this.baseXZ[phaseOffset + 1] = z;
      this.wavePhase[phaseOffset] = x * 0.06;
      this.wavePhase[phaseOffset + 1] = z * 0.04;
    }

    this.setFaceNormal(vertexOffset);
    return vertexOffset + 3;
  }

  sampleWaveHeight(x, z, t) {
    return (
      Math.sin(x * 0.07 + t * 1.2) * 0.45 +
      Math.cos(z * 0.05 + t * 0.9) * 0.35 +
      Math.sin((x + z) * 0.03 + t * 0.6) * 0.25
    );
  }

  setFaceNormal(vertexOffset) {
    const p0 = vertexOffset * 3;
    const p1 = p0 + 3;
    const p2 = p0 + 6;

    const ax = this.positions[p0];
    const ay = this.positions[p0 + 1];
    const az = this.positions[p0 + 2];
    const bx = this.positions[p1];
    const by = this.positions[p1 + 1];
    const bz = this.positions[p1 + 2];
    const cx = this.positions[p2];
    const cy = this.positions[p2 + 1];
    const cz = this.positions[p2 + 2];

    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    this.normals[p0] = nx;
    this.normals[p0 + 1] = ny;
    this.normals[p0 + 2] = nz;
    this.normals[p1] = nx;
    this.normals[p1 + 1] = ny;
    this.normals[p1 + 2] = nz;
    this.normals[p2] = nx;
    this.normals[p2 + 1] = ny;
    this.normals[p2 + 2] = nz;
  }

  createDistantLandforms() {
    const placements = [
      { x: -80, y: 6, z: 250, sx: 48, sy: 15, sz: 28, yaw: 18, type: 'box', mat: this.landMaterial },
      { x: 95, y: 9, z: 275, sx: 55, sy: 20, sz: 24, yaw: -20, type: 'box', mat: this.rockMaterial },
      { x: -140, y: 12, z: 315, sx: 65, sy: 22, sz: 34, yaw: 24, type: 'cone', mat: this.rockMaterial },
      { x: 150, y: 7, z: 330, sx: 60, sy: 18, sz: 30, yaw: -26, type: 'box', mat: this.landMaterial },
      { x: 0, y: 10, z: 360, sx: 90, sy: 24, sz: 36, yaw: 4, type: 'cone', mat: this.rockMaterial }
    ];

    for (const land of placements) {
      const entity = new pc.Entity('DistantLandform');
      entity.addComponent('render', { type: land.type });
      entity.render.material = land.mat;
      entity.setPosition(land.x, land.y, land.z);
      entity.setLocalScale(land.sx, land.sy, land.sz);
      entity.setEulerAngles(0, land.yaw, 0);
      this.app.root.addChild(entity);
    }
  }

  update(dt) {
    if (!this.waterMesh || !this.positions || !this.normals) {
      return;
    }

    this.time += dt;

    const vertexCount = this.positions.length / 3;
    for (let i = 0; i < vertexCount; i += 1) {
      const posOffset = i * 3;
      const waveOffset = i * 2;
      const x = this.baseXZ[waveOffset];
      const z = this.baseXZ[waveOffset + 1];
      this.positions[posOffset + 1] = this.sampleWaveHeight(
        x + Math.sin(this.wavePhase[waveOffset] + this.time) * 0.6,
        z + Math.cos(this.wavePhase[waveOffset + 1] + this.time * 0.8) * 0.6,
        this.time
      );
    }

    for (let tri = 0; tri < vertexCount; tri += 3) {
      this.setFaceNormal(tri);
    }

    this.waterMesh.setPositions(this.positions);
    this.waterMesh.setNormals(this.normals);
    this.waterMesh.update(pc.PRIMITIVE_TRIANGLES);
  }
}
