import type { LevelDef } from './types'

// Level 1 layout. Store floor is at z < 4.5, the farm is in front (z > 6).
// Every station faces +z (towards the camera), so interaction zones are in front of them.
// Snapshot of the original (v1) layout, kept for comparison via ?layout=v1.
export const LEVEL1_V1: LevelDef = {
  bounds: { x: 0.5, z: 3.5, w: 33, d: 23 },
  areas: [
    { id: 'A0', rect: { x: -4, z: -1.5, w: 14, d: 12 } },
    { id: 'A1', rect: { x: 8, z: -1.5, w: 10, d: 12 } },
    // east annex: the coffee corner lives here
    { id: 'A2', rect: { x: 15, z: -1.5, w: 4, d: 12 } },
    // west office strip: enclosed room with a door from the store, right next to the first trash bin
    // door gap [-4.5, -2.5] sits between the egg crate and the back wall so the nav grid keeps it clear
    { id: 'A3', rect: { x: -13.25, z: -3.5, w: 4.5, d: 8 }, enclose: true, door: { side: 'east', at: -3.5, width: 2 } },
  ],
  startAreas: ['A0', 'A3'],
  wallZ: -7.5,
  trash: [
    { id: 'bin1', pos: { x: -10.2, z: -6.6 } },
    { id: 'bin2', pos: { x: 1.6, z: -6.6 } },
    // near the apple tree, for farm workers with nowhere to dump
    { id: 'bin3', pos: { x: 13, z: 12.5 } },
  ],
  playerStart: { x: -5, z: 6 },
  spawnPoint: { x: -12.5, z: 3.5 },
  exitPoint: { x: -12.5, z: 2.5 },
  finalUnlock: 'branch',

  deco: [
    { id: 'tree1', model: 'tree', pos: { x: -15, z: 6.5 } },
    { id: 'tree2', model: 'tree', pos: { x: 14.5, z: 13.8 } },
    { id: 'tree3', model: 'tree', pos: { x: -16, z: 6 } },
    { id: 'flowers1', model: 'flowerPatch', pos: { x: -14.7, z: 4.2 } },
    { id: 'flowers2', model: 'flowerPatch', pos: { x: 14.8, z: 1.5 } },
    { id: 'flowers3', model: 'flowerPatch', pos: { x: 1.5, z: 14.6 } },
    { id: 'rock1', model: 'rock', pos: { x: 16.5, z: 13 } },
    { id: 'rock2', model: 'rock', pos: { x: -15, z: 9 } },
    { id: 'lamp1', model: 'streetLamp', pos: { x: -15.2, z: 2.5 } },
    { id: 'lamp2', model: 'streetLamp', pos: { x: 13.5, z: 4.5 } },
    { id: 'bench1', model: 'bench', pos: { x: 13.2, z: 5.6 }, turn: 1 },
    // hiring office: the desk anchors the room, candidates wait on the rug by the door
    { id: 'officeDesk', model: 'desk', pos: { x: -13.25, z: -6.4 }, label: 'OFICINA' },
    { id: 'officeChair1', model: 'chair', pos: { x: -13.85, z: -5.5 }, turn: 2 },
    { id: 'officeChair2', model: 'chair', pos: { x: -12.65, z: -5.5 }, turn: 2 },
    { id: 'officeRug', model: 'mat', pos: { x: -13.25, z: -5.45 } },
    { id: 'lamp3', model: 'streetLamp', pos: { x: -13.7, z: 1.2 } },
    // store dressing
    { id: 'bakeryCase1', model: 'bakeryCase', pos: { x: -10.3, z: -0.2 } },
    { id: 'flowerStand1', model: 'flowerStand', pos: { x: -14.3, z: 0.8 } },
    // seating between the annex shelves
    { id: 'coffeeCorner1', model: 'coffeeCorner', pos: { x: 15, z: 1.5 } },
  ],

  start: [
    { type: 'producer', id: 'planter1', model: 'planter', kind: 'tomato', pos: { x: -6, z: 8.5 }, max: 6, regrow: 3 },
    { type: 'shelf', id: 'shelfTomato', model: 'shelf', kind: 'tomato', pos: { x: -6, z: -5 }, cap: 12, tiers: 2 },
    { type: 'checkout', id: 'checkout1', pos: { x: -8, z: 1 } },
  ],
  // the cashier hire spot lives at the checkout from the start, outside the unlock chain
  startReveals: ['planter2', 'cashier'],

  unlocks: [
    {
      id: 'planter2',
      label: 'Tomates',
      icon: 'tomato',
      // per-plant purchase: $10 each, the planter starts with 1 plant (3 tomatoes)
      price: 10,
      units: 2,
      zone: { x: -2.5, z: 11 },
      spawns: [{ type: 'producer', id: 'planter2', model: 'planter', kind: 'tomato', pos: { x: -2.5, z: 8.5 }, max: 6, regrow: 3, units: 2 }],
      reveals: ['eggs'],
    },
    {
      id: 'eggs',
      label: 'Gallinas',
      icon: 'egg',
      price: 40,
      zone: { x: -10.5, z: 9.5 },
      spawns: [
        // hens only lay while they have tomatoes to eat (1 tomato = 1 egg)
        { type: 'producer', id: 'nest1', model: 'nest', kind: 'egg', pos: { x: -10.5, z: 9.5 }, max: 8, regrow: 3, start: 2, feed: { kind: 'tomato', cap: 4 } },
        { type: 'shelf', id: 'shelfEgg', model: 'crate', kind: 'egg', pos: { x: -9.5, z: -1.5 }, cap: 12 },
      ],
      reveals: ['canner', 'hen2', 'strawberry'],
    },
    {
      id: 'strawberry',
      label: 'Fresas',
      icon: 'strawberry',
      price: 60,
      zone: { x: -6, z: 12.5 },
      spawns: [
        { type: 'producer', id: 'patch1', model: 'strawberryPatch', kind: 'strawberry', pos: { x: -6, z: 12.5 }, max: 6, regrow: 3 },
        { type: 'shelf', id: 'shelfStrawberry', model: 'shelf', kind: 'strawberry', pos: { x: -5.5, z: -1.5 }, cap: 12, tiers: 2 },
      ],
      reveals: ['beehive'],
    },
    {
      id: 'beehive',
      label: 'Colmena',
      icon: 'honey',
      price: 140,
      zone: { x: 0, z: 12.5 },
      spawns: [
        // bees work on their own: no feed needed
        { type: 'producer', id: 'hive1', model: 'beehive', kind: 'honey', pos: { x: 0, z: 12.5 }, max: 4, regrow: 4, start: 0 },
        { type: 'shelf', id: 'shelfHoney', model: 'crate', kind: 'honey', pos: { x: 3.5, z: -1.5 }, cap: 12 },
      ],
      reveals: ['appleTree', 'jamPot'],
    },
    {
      id: 'appleTree',
      label: 'Manzano',
      icon: 'apple',
      price: 100,
      zone: { x: 9.5, z: 12.5 },
      spawns: [
        { type: 'producer', id: 'tree1', model: 'appleTree', kind: 'apple', pos: { x: 9.5, z: 12.5 }, max: 5, regrow: 4 },
        { type: 'shelf', id: 'shelfApple', model: 'crate', kind: 'apple', pos: { x: 9, z: 1 }, cap: 12 },
      ],
      reveals: [],
    },
    {
      id: 'hen2',
      label: 'Segunda gallina',
      icon: 'egg',
      price: 110,
      zone: { x: -7, z: 9.5 },
      spawns: [
        // side by side with nest1 on the layout grid
        { type: 'producer', id: 'nest2', model: 'nest', kind: 'egg', pos: { x: -7, z: 9.5 }, max: 8, regrow: 3, start: 0, feed: { kind: 'tomato', cap: 4 } },
      ],
      reveals: [],
    },
    {
      id: 'canner',
      label: 'Enlatadora',
      icon: 'tomatoCan',
      price: 80,
      zone: { x: -1.5, z: -5 },
      spawns: [
        {
          type: 'machine',
          id: 'canner',
          model: 'canner',
          pos: { x: -1.5, z: -5 },
          recipe: { in: { tomato: 1 }, out: 'tomatoCan', n: 1, time: 2.5 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfCan', model: 'shelf', kind: 'tomatoCan', pos: { x: -3, z: -1.5 }, cap: 12, tiers: 2 },
      ],
      reveals: ['farmer'],
    },
    {
      id: 'farmer',
      label: 'Contratar granjero',
      icon: 'tomato',
      price: 90,
      // office line-up: east column, nearest the door
      zone: { x: -12.6, z: -4.4 },
      spawns: [],
      worker: { id: 'farmer', role: 'farmer' },
      // choice: expand the store or hire help first (both appear side by side)
      reveals: ['areaA1', 'shelver'],
    },
    {
      id: 'farmer2',
      label: 'Contratar segundo granjero',
      icon: 'tomato',
      price: 140,
      // office line-up: west column
      zone: { x: -14.4, z: -4.4 },
      spawns: [],
      worker: { id: 'farmer2', role: 'farmer' },
      reveals: [],
    },
    {
      id: 'areaA1',
      label: 'Ampliar tienda',
      icon: 'money',
      price: 120,
      zone: { x: 2, z: 1 },
      spawns: [],
      area: 'A1',
      // the new area is where the mill and bakery go
      reveals: ['wheat', 'areaA2'],
    },
    {
      id: 'areaA2',
      label: 'Anexo cafetería',
      icon: 'money',
      price: 400,
      // pay zone on the grass path in front of the annex
      zone: { x: 15, z: 6 },
      spawns: [],
      area: 'A2',
      // opening the annex is what unlocks selling cakes and pizzas
      // and brings the second round of staff hires to the office
      reveals: ['mixer', 'pizzaOven', 'farmer2', 'shelver2', 'chef2'],
    },
    {
      id: 'shelver',
      label: 'Contratar reponedor',
      icon: 'tomatoCan',
      price: 130,
      // office line-up: east column, middle hire zone
      zone: { x: -12.6, z: -2.6 },
      spawns: [],
      worker: { id: 'shelver', role: 'shelver' },
      reveals: [],
    },
    {
      id: 'shelver2',
      label: 'Contratar segundo reponedor',
      icon: 'tomatoCan',
      price: 210,
      // office line-up: west column
      zone: { x: -14.4, z: -2.6 },
      spawns: [],
      worker: { id: 'shelver2', role: 'shelver' },
      reveals: [],
    },
    {
      id: 'wheat',
      label: 'Trigo y molino',
      icon: 'wheat',
      // strong first price: the mill plus a field that starts with 1 tile
      price: 150,
      zone: { x: 8.5, z: 9.5 },
      spawns: [
        { type: 'producer', id: 'plot1', model: 'plot', kind: 'wheat', pos: { x: 4.5, z: 9.5 }, max: 12, regrow: 1.5, units: 12 },
        {
          type: 'machine',
          id: 'mill',
          model: 'mill',
          pos: { x: 5, z: -5 },
          recipe: { in: { wheat: 1 }, out: 'flour', n: 1, time: 2.5 },
          inputCap: 4,
          outputCap: 4,
        },
      ],
      reveals: ['cow', 'wheatPlants'],
    },
    {
      id: 'wheatPlants',
      label: 'Más trigo',
      icon: 'wheat',
      // cheap per-tile price: the field grows one tile per purchase
      price: 25,
      units: 11,
      grows: 'plot1',
      zone: { x: 8.5, z: 9.5 },
      spawns: [],
      reveals: [],
    },
    {
      id: 'cow',
      label: 'Vaca lechera',
      icon: 'milk',
      price: 180,
      zone: { x: 10.5, z: 9.5 },
      spawns: [
        { type: 'producer', id: 'cow1', model: 'cow', kind: 'milk', pos: { x: 10.5, z: 9.5 }, max: 4, regrow: 4, start: 0, feed: { kind: 'wheat', cap: 4 } },
      ],
      reveals: ['milkFridge'],
    },
    {
      id: 'milkFridge',
      label: 'Refrigerador de leche',
      icon: 'milk',
      price: 120,
      zone: { x: 11.5, z: -1.5 },
      spawns: [{ type: 'shelf', id: 'shelfMilk', model: 'fridge', kind: 'milk', pos: { x: 11.5, z: -1.5 }, cap: 12, tiers: 3 }],
      // choice: checkout / bakery line or the cheese line first (both appear side by side)
      reveals: ['checkout2', 'cheesePress'],
    },
    {
      id: 'cheesePress',
      label: 'Prensa de queso',
      icon: 'cheese',
      price: 260,
      zone: { x: 7.75, z: -4 },
      spawns: [
        {
          type: 'machine',
          id: 'cheesePress',
          model: 'cheesePress',
          // back row, between the mill and the oven
          pos: { x: 7.75, z: -6.5 },
          recipe: { in: { milk: 1 }, out: 'cheese', n: 1, time: 3 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfCheese', model: 'shelf', kind: 'cheese', pos: { x: -1, z: -1.5 }, cap: 12, tiers: 2 },
      ],
      reveals: [],
    },
    {
      id: 'mixer',
      label: 'Pastelera',
      icon: 'cake',
      price: 300,
      // inside the cafeteria annex: cakes are sold there and nowhere else
      zone: { x: 14.5, z: -4 },
      spawns: [
        {
          type: 'machine',
          id: 'mixer',
          model: 'mixer',
          pos: { x: 14.5, z: -6 },
          // first three-ingredient recipe: the premium product
          recipe: { in: { flour: 1, milk: 1, egg: 1 }, out: 'cake', n: 1, time: 3.5 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfCake', model: 'shelf', kind: 'cake', pos: { x: 15.5, z: 0.5 }, cap: 12, tiers: 2 },
      ],
      reveals: [],
    },
    {
      id: 'pizzaOven',
      label: 'Horno de pizza',
      icon: 'pizza',
      price: 350,
      zone: { x: 15, z: -0.5 },
      spawns: [
        {
          type: 'machine',
          id: 'pizzaOven',
          model: 'pizzaOven',
          pos: { x: 15, z: -2.5 },
          recipe: { in: { flour: 1, tomato: 1, cheese: 1 }, out: 'pizza', n: 1, time: 4 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfPizza', model: 'shelf', kind: 'pizza', pos: { x: 15.5, z: 2.5 }, cap: 12, tiers: 2 },
      ],
      reveals: [],
    },
    {
      id: 'checkout2',
      label: 'Segunda caja',
      icon: 'money',
      price: 200,
      zone: { x: 5, z: 3.5 },
      spawns: [{ type: 'checkout', id: 'checkout2', pos: { x: 5, z: 1 } }],
      reveals: ['bakery', 'cashier2'],
    },
    {
      id: 'bakery',
      label: 'Panadería',
      icon: 'bread',
      price: 220,
      zone: { x: 10.5, z: -5 },
      spawns: [
        {
          type: 'machine',
          id: 'oven',
          model: 'oven',
          pos: { x: 10.5, z: -5 },
          recipe: { in: { flour: 1, egg: 1 }, out: 'bread', n: 1, time: 3 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfBread', model: 'shelf', kind: 'bread', pos: { x: 8.5, z: -1.5 }, cap: 12, tiers: 2 },
      ],
      reveals: ['chef'],
    },
    {
      id: 'chef',
      label: 'Contratar chef',
      icon: 'bread',
      price: 250,
      // office line-up: east column, nearest the door
      zone: { x: -12.6, z: -0.8 },
      spawns: [],
      worker: { id: 'chef', role: 'chef' },
      reveals: ['branch'],
    },
    {
      id: 'chef2',
      label: 'Contratar segundo chef',
      icon: 'bread',
      price: 380,
      // office line-up: west column
      zone: { x: -14.4, z: -0.8 },
      spawns: [],
      worker: { id: 'chef2', role: 'chef' },
      reveals: [],
    },
    {
      id: 'branch',
      label: 'Nueva sucursal',
      icon: 'money',
      price: 500,
      // right outside the store entrance: buying it completes the level
      zone: { x: -12.5, z: 3 },
      spawns: [],
      reveals: [],
    },
    {
      id: 'cashier2',
      label: 'Contratar segundo cajero',
      icon: 'money',
      price: 220,
      zone: { x: 7.5, z: 3.5 },
      spawns: [],
      cashier: 'checkout2',
      reveals: [],
    },
    {
      id: 'jamPot',
      label: 'Olla de mermelada',
      icon: 'jam',
      price: 240,
      zone: { x: -4, z: -6.5 },
      spawns: [
        {
          type: 'machine',
          id: 'jamPot',
          model: 'jamPot',
          // store back row, left of the canner
          pos: { x: -4, z: -6.5 },
          recipe: { in: { strawberry: 1, honey: 1 }, out: 'jam', n: 1, time: 3.5 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfJam', model: 'shelf', kind: 'jam', pos: { x: -5.5, z: 1 }, cap: 12, tiers: 2 },
      ],
      reveals: [],
    },
    {
      id: 'cashier',
      label: 'Contratar cajero',
      icon: 'money',
      price: 150,
      // right next to the counter, on the cashier side
      zone: { x: -10.5, z: 1 },
      spawns: [],
      cashier: 'checkout1',
      reveals: [],
    },
  ],
}
