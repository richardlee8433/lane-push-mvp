# Lane Push Game – PlayCanvas 3D MVP

This MVP keeps the original lane-push gameplay systems and data while replacing the rendering layer with PlayCanvas 3D entities.

## What Stays Unchanged
- Game logic and progression remain in `src/systems.js`
- Level balancing data remains in `data/levels.json`
- Spawn, upgrades, economy, enemy waves, and win/lose conditions are unchanged

## 3D Rendering Layer
- `src/playcanvas/main.js` – app boot, scene setup, lights, camera, and game startup
- `src/playcanvas/render_adapter.js` – syncs simulation state to 3D entities
- `src/playcanvas/follow_camera.js` – third-person smoothed follow camera
- `src/playcanvas/lane_ground.js` – long lane ground plane

### Scene Layout
- Forward axis is `+Z`
- Player HQ at `z = 0`
- Enemy HQ at `z = 120`
- Units move toward `+Z` on the lane
- Camera follows a target behind and above player-side progress with smoothing

## Single Browser Entry Point
- `index.html` loads PlayCanvas and starts `src/main.js`
- `src/main.js` delegates to `src/playcanvas/main.js`

## Assets

Runtime media now uses a dedicated top-level `/assets` contract:

```text
assets/
  models/
  textures/
  audio/
```

- Place runtime-loaded 3D models in `assets/models/`.
  - The runtime now loads these as PlayCanvas `container` assets and instantiates them for gameplay entities:
    - `player.glb` → player entity visual
    - `barrel.glb` → regular enemy/barrel visuals
    - `boss.glb` → boss entity visual
  - If any model fails to load at runtime, the game falls back to built-in primitive meshes.
- Place image textures in `assets/textures/`.
- Place sound files in `assets/audio/`.

At runtime, PlayCanvas code assumes absolute asset URLs rooted at:
- `/assets/models/*`
- `/assets/textures/*`
- `/assets/audio/*`

Example runtime model path:

```text
/assets/models/player.glb
```

Important:
- This repository does not fetch or download external assets as part of runtime setup.
- Codex should never fetch external assets for this project.

## Run Locally
Use any static server from repository root:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Build
This project is a static-browser MVP and does not require a compile step.

Optional packaging command (for distribution):

```bash
zip -r lane-push-mvp.zip .
```

## Publish to VIVERSE
1. Create a new VIVERSE Worlds project.
2. Upload/import this repository content as project assets.
3. Ensure `index.html`, `src/`, `styles.css`, and `data/levels.json` are included.
4. Verify the PlayCanvas CDN script is allowed in your publish target.
5. Preview and publish through VIVERSE Worlds.

If your VIVERSE environment blocks external CDN scripts, host a local PlayCanvas engine build in project assets and update the script reference in `index.html`.
