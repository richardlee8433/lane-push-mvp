const DEFAULT_PARALLAX_CONFIG = {
  sky: 0.02,
  mountains: 0.05,
  forest: 0.1,
  beach: 0.2,
  ocean: 0.35
};

const LAYER_DEFS = [
  { key: 'sky', name: 'ParallaxSky', uvMinY: 0.72, uvMaxY: 1.0, y: 22, z: 290, width: 520, height: 150 },
  { key: 'mountains', name: 'ParallaxMountains', uvMinY: 0.53, uvMaxY: 0.72, y: 12, z: 270, width: 500, height: 105 },
  { key: 'forest', name: 'ParallaxForest', uvMinY: 0.34, uvMaxY: 0.53, y: 7, z: 250, width: 460, height: 85 },
  { key: 'beach', name: 'ParallaxBeach', uvMinY: 0.18, uvMaxY: 0.34, y: 2.8, z: 232, width: 420, height: 58 },
  { key: 'ocean', name: 'ParallaxOcean', uvMinY: 0.0, uvMaxY: 0.18, y: 0.5, z: 215, width: 380, height: 46 }
];

export class ParallaxBackground {
  constructor(app, options = {}) {
    this.app = app;
    this.root = new pc.Entity('ParallaxBackgroundRoot');
    this.referenceEntity = options.referenceEntity ?? null;
    this.anchorX = options.anchorX ?? 0;
    this.parallaxConfig = {
      ...DEFAULT_PARALLAX_CONFIG,
      ...(options.parallaxConfig || {})
    };
    this.layers = [];

    app.root.addChild(this.root);
    this.loadAndBuild(options.texturePath || '/assets/textures/background.JPG');
  }

  loadAndBuild(texturePath) {
    this.app.assets.loadFromUrl(texturePath, 'texture', (err, textureAsset) => {
      if (err || !textureAsset) {
        console.warn(`[ParallaxBackground] Failed to load ${texturePath}`, err);
        return;
      }

      for (const def of LAYER_DEFS) {
        this.layers.push(this.createLayer(def, textureAsset.resource));
      }
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
    entity.setLocalEulerAngles(0, 180, 0);
    entity.setPosition(this.anchorX, def.y, def.z);

    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.diffuse.set(1, 1, 1);
    material.emissive.set(1, 1, 1);
    material.emissiveMap = texture;
    material.opacity = 1;
    material.blendType = pc.BLEND_NONE;
    material.cull = pc.CULLFACE_NONE;

    // Each layer samples a vertical stripe of the same source image by remapping UVs.
    // Tiling shrinks UV height to the desired slice, and offset moves that slice into place.
    // Example: uvMinY=0.53 uvMaxY=0.72 -> tiling.y=0.19 and offset.y=0.53.
    const uvHeight = def.uvMaxY - def.uvMinY;
    material.emissiveMapTiling = new pc.Vec2(1, uvHeight);
    material.emissiveMapOffset = new pc.Vec2(0, def.uvMinY);
    material.update();

    entity.render.material = material;
    this.root.addChild(entity);

    return {
      key: def.key,
      baseX: this.anchorX,
      z: def.z,
      entity
    };
  }

  setReferenceEntity(entity) {
    this.referenceEntity = entity;
  }

  update() {
    if (!this.referenceEntity || this.layers.length === 0) return;

    const referenceX = this.referenceEntity.getPosition().x;

    for (const layer of this.layers) {
      const parallaxFactor = this.parallaxConfig[layer.key] ?? 0;
      const x = layer.baseX + referenceX * parallaxFactor;
      layer.entity.setPosition(x, layer.entity.getPosition().y, layer.z);
    }
  }
}

export const parallaxConfig = { ...DEFAULT_PARALLAX_CONFIG };
