import { GameManager } from '../systems.js';
import { FollowCamera } from './follow_camera.js';
import { LaneGround } from './lane_ground.js';
import { LowPolyEnvironment } from './environment_lowpoly.js';
import { RenderAdapter } from './render_adapter.js';

const SKYBOX_HDR_PATH = '/assets/textures/evening_road_01_puresky_1k.hdr';

function createLighting(app) {
  app.scene.ambientLight = new pc.Color(0.03, 0.03, 0.03);

  const light = new pc.Entity('DirectionalLight');
  light.addComponent('light', {
    type: 'directional',
    intensity: 1.1,
    castShadows: false
  });
  light.setEulerAngles(45, 25, 0);
  app.root.addChild(light);
}

function loadTextureAsset(app, path) {
  return new Promise((resolve, reject) => {
    app.assets.loadFromUrl(path, 'texture', (error, asset) => {
      if (error || !asset) {
        reject(error || new Error(`Failed to load texture: ${path}`));
        return;
      }

      resolve(asset.resource);
    });
  });
}

function applyHdriToScene(app, sourceTexture) {
  const scene = app.scene;
  scene.skyboxIntensity = 1;

  if (pc.EnvLighting && typeof pc.EnvLighting.generateSkyboxCubemap === 'function') {
    const skyboxCubemap = pc.EnvLighting.generateSkyboxCubemap(sourceTexture);
    const envAtlas = pc.EnvLighting.generateLightingSource
      ? pc.EnvLighting.generateLightingSource(sourceTexture)
      : pc.EnvLighting.generateAtlas(sourceTexture);

    scene.setSkybox(skyboxCubemap);
    scene.envAtlas = envAtlas;
    return;
  }

  scene.envAtlas = sourceTexture;
}

async function setupHdriEnvironment(app) {
  try {
    const hdrTexture = await loadTextureAsset(app, SKYBOX_HDR_PATH);
    applyHdriToScene(app, hdrTexture);
  } catch (error) {
    console.warn('[skybox] Failed to load HDRI skybox.', error);
  }
}

function createCamera(app) {
  const camera = new pc.Entity('MainCamera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.53, 0.68, 0.8),
    fov: 68,
    nearClip: 0.1,
    farClip: 800
  });
  camera.setPosition(0, 8, -14);
  app.root.addChild(camera);
  return camera;
}

function resizeToElement(app, canvas) {
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  app.resizeCanvas(width, height);
}

export async function startPlayCanvasGame() {
  const canvas = document.getElementById('application-canvas');
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(document.body),
    touch: new pc.TouchDevice(document.body)
  });

  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  resizeToElement(app, canvas);
  app.start();

  await setupHdriEnvironment(app);

  window.addEventListener('resize', () => resizeToElement(app, canvas));

  createLighting(app);
  new LaneGround(app, { width: 20, length: 420 });
  const environment = new LowPolyEnvironment(app, {
    size: 420,
    segments: 80,
    enableLandforms: false,
    enableWater: false
  });

  const cameraEntity = createCamera(app);
  const renderer = new RenderAdapter(app, {
    onPlayerDamaged: () => followCamera.shake(0.2, 0.1)
  });
  const followCamera = new FollowCamera(cameraEntity, {
    target: renderer.followTarget,
    height: 8,
    distance: 14,
    lookAhead: 20,
    smooth: 0.1
  });

  app.on('update', (dt) => {
    environment.update(dt);
    followCamera.update(dt);
  });

  const response = await fetch('./data/levels.json');
  const data = await response.json();

  return new GameManager(data, {
    onFrame(game, dt) {
      renderer.sync(game, dt);
    },
    onLevelLoaded() {
      renderer.clearUnits();
    }
  });
}
