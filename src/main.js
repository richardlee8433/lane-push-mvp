import { GameManager } from './systems.js';

async function start() {
  const response = await fetch('./data/levels.json');
  const data = await response.json();
  new GameManager(data.levels);
}

start();
