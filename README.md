# Lane Push Game – VIVERSE Worlds MVP

Minimal lane-push strategy MVP implemented from the project scope.

## Scope Implemented
- Player actions: spawn units and buy upgrades only.
- Automatic unit movement/combat on a single lane.
- Target priority: enemy units → structures (HQ in this MVP) → enemy HQ.
- Systems included:
  - `GameManager`
  - `EconomySystem`
  - `SpawnerSystem`
  - `UnitSystem`
  - `StructureSystem`
  - `UpgradeSystem`
  - `UISystem`
- Exactly 2 unit types:
  - Melee: high HP, short range
  - Ranged: lower HP, longer range, slower attack
- Exactly 3 upgrades, each with 3 levels:
  - Unit Damage
  - Unit HP
  - Resource Income
- Exactly 3 data-driven levels loaded from `data/levels.json`
  - Enemy spawn interval
  - Enemy wave size
  - Enemy stat multipliers
  - Structure HP multipliers
- Win/Lose conditions:
  - Win when enemy HQ HP reaches 0
  - Lose when player HQ HP reaches 0

## Project Structure
- `index.html` – main UI and battlefield layout
- `styles.css` – simple primitive visual styling
- `data/levels.json` – level balancing/configuration
- `src/config.js` – unit/upgrade/base constants
- `src/systems.js` – all required game systems
- `src/main.js` – bootstraps the game

## Run Locally
Use any static file server from the repository root. Example with Python:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Publish to VIVERSE Worlds (Toolkit Workflow)
1. Create a new VIVERSE Worlds project using PlayCanvas Toolkit.
2. Import project files from this repository into the project assets.
3. Ensure `index.html` is the entry point and `data/levels.json` is included in published assets.
4. Build and preview inside the Toolkit environment.
5. Publish the world through the Toolkit publish flow.

## Notes
- Visuals are simple primitives/placeholders to match MVP scope.
- Balance is configured via `data/levels.json` and constants in `src/config.js`.
