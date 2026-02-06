const DEFAULT_PARALLAX_CONFIG = {
  sky: 0.02,
  mountains: 0.05,
  forest: 0.1,
  beach: 0.2,
  ocean: 0.35
};

const TEXTURE_PATH = '/assets/textures/background.JPG';

const LAYER_DEFS = [
  { key: 'sky', name: 'ParallaxSky', uvMinY: 0.78, uvMaxY: 1.0, y: 150, z: 560, width: 1800, height: 560 },
  { key: 'mountains', name: 'ParallaxMountains', uvMinY: 0.58, uvMaxY: 0.78, y: 92, z: 540, width: 1700, height: 420 },
  { key: 'forest', name: 'ParallaxForest', uvMinY: 0.38, uvMaxY: 0.58, y: 52, z: 520, width: 1600, height: 320 },
  { key: 'beach', name: 'ParallaxBeach', uvMinY: 0.18, uvMaxY: 0.38, y: 22, z: 500, width: 1500, height: 220 },
  { key: 'ocean', name: 'ParallaxOcean', uvMinY: 0.0, uvMaxY: 0.18, y: -6, z: 480, width: 1400, height: 170 }
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

    app.root.addChild(this.root);
    this.loadAndBuild(options.texturePath || TEXTURE_PATH);
  }

  loadAndBuild(texturePath) {
    this.app.assets.loadFromUrl(texturePath, 'texture', (err, textureAsset) => {
      if (err || !textureAsset) {
        console.warn('[parallax] background load failed', texturePath, err);
        return;
      }

      console.log('[parallax] background loaded', textureAsset.url);

      for (const def of LAYER_DEFS) {
        this.layers.push(this.createLayer(def, textureAsset.resource));
      }

      this.orientLayersToCamera();
    });
  }

  createLayer(def, texture) {
    const entity = new pc.Entity(def.name);
    entity.addComponent('render', {
      type: 'plane',
      castShadows: false,
      receiveShadows: false
    });

    entity.setLocalScale(def.width, def.height, 1);
    entity.setEulerAngles(90, 180, 0);
    entity.setPosition(this.anchorX, def.y, def.z);

    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.diffuse.set(1, 1, 1);
    material.emissive.set(1, 1, 1);
    material.emissiveMap = texture;
    material.opacity = 1;
    material.blendType = pc.BLEND_NONE;
    material.cull = pc.CULLFACE_NONE;
    material.depthWrite = false;

    const uvHeight = def.uvMaxY - def.uvMinY;
    material.emissiveMapTiling = new pc.Vec2(1, uvHeight);
    material.emissiveMapOffset = new pc.Vec2(0, def.uvMinY);
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

    const cameraRotation = this.cameraEntity.getRotation();
    for (const layer of this.layers) {
      layer.entity.setRotation(cameraRotation);
      layer.entity.rotateLocal(90, 180, 0);
    }
  }

  update() {
    if (this.layers.length === 0) return;

    const referenceX = this.referenceEntity ? this.referenceEntity.getPosition().x : 0;

    for (const layer of this.layers) {
      const parallaxFactor = this.parallaxConfig[layer.key] ?? 0;
      const x = layer.baseX + referenceX * parallaxFactor;
      layer.entity.setPosition(x, layer.y, layer.z);
    }

    this.orientLayersToCamera();
  }
}

export const parallaxConfig = { ...DEFAULT_PARALLAX_CONFIG };
