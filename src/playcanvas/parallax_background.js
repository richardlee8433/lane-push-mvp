const DEFAULT_PARALLAX_CONFIG = {
  sky: 0.02,
  mountains: 0.05,
  forest: 0.1,
  beach: 0.2,
  ocean: 0.35
};

const TEXTURE_PATH = '/assets/textures/background.JPG';

const SLICE_OVERLAP = 0.02;

const SLICE_DEFS = [
  { key: 'sky', name: 'ParallaxSky', start: 0.78, end: 1.0, y: 118, z: 560, parallaxDepth: 1 },
  { key: 'mountains', name: 'ParallaxMountains', start: 0.58, end: 0.78, y: 54, z: 540, parallaxDepth: 1 },
  { key: 'forest', name: 'ParallaxForest', start: 0.38, end: 0.58, y: -2, z: 520, parallaxDepth: 1 },
  { key: 'beach', name: 'ParallaxBeach', start: 0.18, end: 0.38, y: -52, z: 500, parallaxDepth: 1 },
  { key: 'ocean', name: 'ParallaxOcean', start: 0.0, end: 0.18, y: -94, z: 480, parallaxDepth: 1 }
];

export class ParallaxBackground {
  constructor(app, options = {}) {
    this.app = app;
    this.root = new pc.Entity('ParallaxBackgroundRoot');
    this.referenceEntity = options.referenceEntity ?? null;
    this.cameraEntity = options.cameraEntity ?? null;
    this.anchorX = options.anchorX ?? 0;
    this.parallaxConfig = {
      ...DEFAULT_PARALLAX_CONFIG,
      ...(options.parallaxConfig || {})
    };
    this.layers = [];
    this.verificationPlane = null;

    app.root.addChild(this.root);
    this.loadAndBuild(options.texturePath || TEXTURE_PATH);
  }

  loadAndBuild(texturePath) {
    this.app.assets.loadFromUrl(texturePath, 'texture', (err, textureAsset) => {
      if (err || !textureAsset) {
        console.warn('[parallax] background load failed', texturePath, err);
        return;
      }

      const texture = textureAsset.resource;
      texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
      texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
      texture.minFilter = pc.FILTER_LINEAR;
      texture.magFilter = pc.FILTER_LINEAR;

      console.log('[parallax] tex loaded', texture.width, texture.height);

      this.createVerificationPlane(texture);
      this.buildSlicedLayers(texture);
      this.orientLayersToCamera();
    });
  }

  createVerificationPlane(texture) {
    const entity = new pc.Entity('ParallaxTextureVerification');
    entity.addComponent('render', {
      type: 'plane',
      castShadows: false,
      receiveShadows: false
    });

    const textureAspect = texture.width > 0 && texture.height > 0 ? texture.width / texture.height : 1.778;
    const planeHeight = 560;
    const planeWidth = planeHeight * textureAspect;

    entity.setLocalScale(planeWidth, 1, planeHeight);
    entity.setPosition(this.anchorX, 8, 620);

    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.diffuse.set(1, 1, 1);
    material.emissive.set(1, 1, 1);
    material.diffuseMap = texture;
    material.emissiveMap = texture;
    material.diffuseMapTiling = new pc.Vec2(1, 1);
    material.diffuseMapOffset = new pc.Vec2(0, 0);
    material.emissiveMapTiling = new pc.Vec2(1, 1);
    material.emissiveMapOffset = new pc.Vec2(0, 0);
    material.opacity = 1;
    material.blendType = pc.BLEND_NONE;
    material.cull = pc.CULLFACE_NONE;
    material.depthWrite = false;
    material.update();

    entity.render.material = material;
    entity.render.layers = [pc.LAYERID_WORLD];
    this.root.addChild(entity);

    const meshInstance = entity.render.meshInstances[0];
    meshInstance.cull = false;

    this.verificationPlane = {
      baseX: this.anchorX,
      y: 8,
      z: 620,
      entity
    };
  }

  buildSlicedLayers(texture) {
    const textureAspect = texture.width > 0 && texture.height > 0 ? texture.width / texture.height : 1.778;
    const baseHeight = 560;

    for (let i = 0; i < SLICE_DEFS.length; i += 1) {
      const def = SLICE_DEFS[i];
      const hasAbove = i > 0;
      const hasBelow = i < SLICE_DEFS.length - 1;
      const overlapDown = hasBelow ? SLICE_OVERLAP : 0;
      const overlapUp = hasAbove ? SLICE_OVERLAP : 0;
      const sliceStart = Math.max(0, def.start - overlapDown);
      const sliceEnd = Math.min(1, def.end + overlapUp);
      const sliceHeight = Math.max(0.01, sliceEnd - sliceStart);
      const layerHeight = baseHeight * sliceHeight;
      const layerWidth = layerHeight * textureAspect;

      this.layers.push(this.createLayer(def, texture, {
        sliceStart,
        sliceHeight,
        width: layerWidth,
        height: layerHeight
      }));
    }
  }

  createLayer(def, texture, config) {
    const entity = new pc.Entity(def.name);
    entity.addComponent('render', {
      type: 'plane',
      castShadows: false,
      receiveShadows: false
    });

    entity.setLocalScale(config.width, 1, config.height);
    entity.setPosition(this.anchorX, def.y, def.z);

    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.diffuse.set(1, 1, 1);
    material.emissive.set(1, 1, 1);
    material.diffuseMap = texture;
    material.emissiveMap = texture;
    material.opacity = 1;
    material.blendType = pc.BLEND_NONE;
    material.cull = pc.CULLFACE_NONE;
    material.depthWrite = false;

    material.diffuseMapTiling = new pc.Vec2(1, config.sliceHeight);
    material.diffuseMapOffset = new pc.Vec2(0, config.sliceStart);
    material.emissiveMapTiling = new pc.Vec2(1, config.sliceHeight);
    material.emissiveMapOffset = new pc.Vec2(0, config.sliceStart);
    material.update();

    entity.render.material = material;
    entity.render.layers = [pc.LAYERID_WORLD];
    this.root.addChild(entity);

    const meshInstance = entity.render.meshInstances[0];
    meshInstance.cull = false;

    return {
      key: def.key,
      baseX: this.anchorX,
      y: def.y,
      z: def.z,
      parallaxDepth: def.parallaxDepth,
      entity
    };
  }

  setReferenceEntity(entity) {
    this.referenceEntity = entity;
  }

  setCameraEntity(entity) {
    this.cameraEntity = entity;
  }

  orientLayersToCamera() {
    if (!this.cameraEntity) return;

    const cameraEuler = this.cameraEntity.getEulerAngles();
    const pitch = 90;
    const yaw = cameraEuler.y + 180;

    for (const layer of this.layers) {
      layer.entity.setEulerAngles(pitch, yaw, 0);
    }

    if (this.verificationPlane) {
      this.verificationPlane.entity.setEulerAngles(pitch, yaw, 0);
    }
  }

  update() {
    if (this.layers.length === 0) return;

    const referenceX = this.referenceEntity ? this.referenceEntity.getPosition().x : 0;

    if (this.verificationPlane) {
      this.verificationPlane.entity.setPosition(this.verificationPlane.baseX, this.verificationPlane.y, this.verificationPlane.z);
    }

    for (const layer of this.layers) {
      const parallaxFactor = this.parallaxConfig[layer.key] ?? 0;
      const x = layer.baseX + referenceX * parallaxFactor * (layer.parallaxDepth ?? 1);
      layer.entity.setPosition(x, layer.y, layer.z);
    }

    this.orientLayersToCamera();
  }
}

export const parallaxConfig = { ...DEFAULT_PARALLAX_CONFIG };
