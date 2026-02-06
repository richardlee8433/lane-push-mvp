# Lane Push Game – VIVERSE Worlds MVP

## 1. Project Goal
Build a minimal lane-push strategy game for VIVERSE Worlds.

Player actions are limited to:
- Spawning units
- Purchasing upgrades

Units move and fight automatically.

The project is scoped for fast delivery and easy replication.

## 2. Non-Goals
- No WASD player control
- No multiplayer
- No complex AI behavior trees
- No asset polish (use simple placeholders)

## 3. Core Game Loop
1. Player gains resources automatically over time.
2. Player spends resources to spawn units or purchase upgrades.
3. Units automatically move forward along a single lane.
4. Units auto-attack enemy units, then structures, then enemy HQ.
5. Destroying the enemy HQ results in victory.

## 4. Core Systems (Must Implement)
- GameManager: game state, level loading, win/lose
- EconomySystem: resource generation and spending
- SpawnerSystem: player and enemy unit spawning
- UnitSystem: movement, targeting, combat, death
- StructureSystem: towers and HQ with health
- UpgradeSystem: applies stat multipliers
- UISystem: basic HUD and buttons

## 5. Units
### Melee Unit
- High HP, short range

### Ranged Unit
- Lower HP, longer range, slower attack

Target priority:
1. Enemy units
2. Enemy structures
3. Enemy HQ

## 6. Upgrades
Implement exactly 3 upgrades:
- Unit Damage (3 levels)
- Unit HP (3 levels)
- Resource Income (3 levels)

## 7. Levels (Data-Driven)
Implement 3 levels using a data configuration file.

Each level controls:
- Enemy spawn interval
- Enemy wave size
- Enemy stat multipliers
- Structure HP multipliers

No level-specific logic in code.

## 8. Win & Lose Conditions
- Win: Enemy HQ HP <= 0
- Lose: Player HQ HP <= 0

## 9. Technical Constraints
- Engine: PlayCanvas Toolkit
- Use simple primitives for visuals
- Keep code modular and minimal
- No hardcoded difficulty values
- All balancing via config

## 10. Deliverables (Completion Checklist)
- Playable game running in browser
- All 3 levels playable
- Clear win/lose screens
- README instructions to run locally
- README instructions to publish to VIVERSE Worlds
