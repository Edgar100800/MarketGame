import type { LevelDef } from './types'

// Level 1 layout (v3, compact). Customers come from a street behind the store and enter
// through doors in the back wall; the player works the front, between the farm and the shelves.
// Store bands, back to front: back wall + doors (z -7), checkouts with their queue lane (z -5),
// shelf row A (z -1.8), shelf row B (z 1.2), machines facing the farm (z 3.6), store front (z 4.5).
// Every machine sits right above the crop it eats, and its shelf sits right behind it.
// Spacing: shelves 3.0 apart (pads 2.9), machines 4.0 apart (pads 3.8), so pads never touch.
// Older layouts: level1.v1.ts (?layout=v1) and git history for v2.
export const LEVEL1: LevelDef = {
  bounds: { x: 3.5, z: 1.75, w: 41, d: 23.5 },
  areas: [
    { id: 'A0', rect: { x: -3.5, z: -1.25, w: 13, d: 11.5 } },
    { id: 'A1', rect: { x: 9, z: -1.25, w: 12, d: 11.5 } },
    // cafeteria annex: cakes and pizzas are made and sold here
    { id: 'A2', rect: { x: 19, z: -1.25, w: 8, d: 11.5 } },
    // hiring office: its door faces the farm, so staff never cross the shop floor
    { id: 'A3', rect: { x: -13, z: -3.25, w: 6, d: 7.5 }, enclose: true, door: { side: 'south', at: -13, width: 2 } },
  ],
  startAreas: ['A0', 'A3'],
  wallZ: -7,
  // customer entrances in the back wall; a door exists once its area is open
  doors: [
    { id: 'door1', x: -8.5, width: 2, area: 'A0' },
    // the expansion brings its own entrance, right next to the second checkout
    { id: 'door2', x: 5, width: 2, area: 'A1' },
  ],
  trash: [
    // front corner by the canner and the tomato shelf
    { id: 'bin1', pos: { x: -9.9, z: 3.8 } },
    // between the jam pot and the mill: serves both rooms
    { id: 'bin2', pos: { x: 2.2, z: 3.8 } },
    // east farm, by the cow
    { id: 'bin3', pos: { x: 15.3, z: 7.5 } },
    // west farm, by the hens: spare tomatoes are the first thing thrown away
    { id: 'bin4', pos: { x: -11.3, z: 9 } },
    // annex back corner, only once the annex is open
    { id: 'bin5', pos: { x: 16, z: -6.3 }, area: 'A2' },
    // center farm lane, behind the hive and the apple tree
    { id: 'bin6', pos: { x: 1.8, z: 13 } },
  ],
  playerStart: { x: -4.5, z: 5 },
  finalUnlock: 'branch',

  deco: [
    { id: 'tree1', model: 'tree', pos: { x: -16, z: 6 } },
    { id: 'tree2', model: 'tree', pos: { x: 22, z: 11 } },
    { id: 'tree3', model: 'tree', pos: { x: -16.5, z: 10 } },
    { id: 'flowers1', model: 'flowerPatch', pos: { x: -14, z: 5 } },
    { id: 'flowers2', model: 'flowerPatch', pos: { x: 18.5, z: 9.5 } },
    { id: 'flowers3', model: 'flowerPatch', pos: { x: -3, z: 13 } },
    { id: 'rock1', model: 'rock', pos: { x: 20, z: 12.5 } },
    { id: 'rock2', model: 'rock', pos: { x: -14.5, z: 12.5 } },
    { id: 'lamp1', model: 'streetLamp', pos: { x: -10.8, z: 5.5 } },
    { id: 'lamp2', model: 'streetLamp', pos: { x: 15.5, z: 5.5 } },
    { id: 'bench1', model: 'bench', pos: { x: 22.5, z: 7 }, turn: 1 },
    // hiring office: the desk anchors the room, candidates wait on the rug
    { id: 'officeDesk', model: 'desk', pos: { x: -13, z: -6.4 }, label: 'OFICINA' },
    { id: 'officeChair1', model: 'chair', pos: { x: -13.6, z: -5.5 }, turn: 2 },
    { id: 'officeChair2', model: 'chair', pos: { x: -12.4, z: -5.5 }, turn: 2 },
    { id: 'officeRug', model: 'mat', pos: { x: -13, z: -5.4 } },
    { id: 'lamp3', model: 'streetLamp', pos: { x: -16.5, z: 0 } },
    // store dressing
    { id: 'bakeryCase1', model: 'bakeryCase', pos: { x: 8.5, z: -1.8 } },
    { id: 'flowerStand1', model: 'flowerStand', pos: { x: -14, z: 1.8 } },
    // seating in the middle of the annex
    { id: 'coffeeCorner1', model: 'coffeeCorner', pos: { x: 18, z: -1.5 } },
  ],

  start: [
    { type: 'producer', id: 'planter1', model: 'planter', kind: 'tomato', pos: { x: -8.5, z: 7.2 }, max: 6, regrow: 3 },
    { type: 'shelf', id: 'shelfTomato', model: 'shelf', kind: 'tomato', pos: { x: -8.5, z: 1.2 }, cap: 12, tiers: 2 },
    // right inside the first door: customers pay on their way out
    { type: 'checkout', id: 'checkout1', pos: { x: -5, z: -4.5 } },
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
      zone: { x: -5, z: 7.2 },
      spawns: [{ type: 'producer', id: 'planter2', model: 'planter', kind: 'tomato', pos: { x: -5, z: 7.2 }, max: 6, regrow: 3, units: 2 }],
      reveals: ['eggs'],
    },
    {
      id: 'eggs',
      label: 'Gallinas',
      icon: 'egg',
      price: 40,
      zone: { x: -8.6, z: 10.5 },
      spawns: [
        // hens only lay while they have tomatoes to eat (1 tomato = 1 egg)
        { type: 'producer', id: 'nest1', model: 'nest', kind: 'egg', pos: { x: -8.6, z: 10.5 }, max: 8, regrow: 3, start: 2, feed: { kind: 'tomato', cap: 4 } },
        { type: 'shelf', id: 'shelfEgg', model: 'crate', kind: 'egg', pos: { x: -8.5, z: -1.8 }, cap: 12 },
      ],
      reveals: ['canner', 'hen2', 'strawberry'],
    },
    {
      id: 'strawberry',
      label: 'Fresas',
      icon: 'strawberry',
      price: 60,
      zone: { x: -0.5, z: 7.2 },
      spawns: [
        { type: 'producer', id: 'patch1', model: 'strawberryPatch', kind: 'strawberry', pos: { x: -0.5, z: 7.2 }, max: 6, regrow: 3 },
        { type: 'shelf', id: 'shelfStrawberry', model: 'shelf', kind: 'strawberry', pos: { x: -2.5, z: 1.2 }, cap: 12, tiers: 2 },
      ],
      reveals: ['beehive'],
    },
    {
      id: 'beehive',
      label: 'Colmena',
      icon: 'honey',
      price: 140,
      zone: { x: -0.8, z: 10.5 },
      spawns: [
        // bees work on their own: no feed needed
        { type: 'producer', id: 'hive1', model: 'beehive', kind: 'honey', pos: { x: -0.8, z: 10.5 }, max: 4, regrow: 4, start: 0 },
        { type: 'shelf', id: 'shelfHoney', model: 'crate', kind: 'honey', pos: { x: -5.5, z: -1.8 }, cap: 12 },
      ],
      reveals: ['appleTree', 'jamPot'],
    },
    {
      id: 'appleTree',
      label: 'Manzano',
      icon: 'apple',
      price: 100,
      zone: { x: 3.3, z: 10.7 },
      spawns: [
        { type: 'producer', id: 'tree1', model: 'appleTree', kind: 'apple', pos: { x: 3.3, z: 10.7 }, max: 5, regrow: 4 },
        { type: 'shelf', id: 'shelfApple', model: 'crate', kind: 'apple', pos: { x: -2.5, z: -1.8 }, cap: 12 },
      ],
      reveals: [],
    },
    {
      id: 'hen2',
      label: 'Segunda gallina',
      icon: 'egg',
      price: 110,
      zone: { x: -5, z: 10.5 },
      spawns: [
        // side by side with nest1 on the layout grid
        { type: 'producer', id: 'nest2', model: 'nest', kind: 'egg', pos: { x: -5, z: 10.5 }, max: 8, regrow: 3, start: 0, feed: { kind: 'tomato', cap: 4 } },
      ],
      reveals: [],
    },
    {
      id: 'canner',
      label: 'Enlatadora',
      icon: 'tomatoCan',
      price: 80,
      zone: { x: -7, z: 3.6 },
      spawns: [
        {
          type: 'machine',
          id: 'canner',
          model: 'canner',
          // right above the tomato planters, facing the farm
          pos: { x: -7, z: 3.6 },
          recipe: { in: { tomato: 1 }, out: 'tomatoCan', n: 1, time: 2.5 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfCan', model: 'shelf', kind: 'tomatoCan', pos: { x: -5.5, z: 1.2 }, cap: 12, tiers: 2 },
      ],
      reveals: ['farmer'],
    },
    {
      id: 'farmer',
      label: 'Contratar granjero',
      icon: 'tomato',
      price: 90,
      // office line-up: east column (first hires), front row by the door
      zone: { x: -11.6, z: -1 },
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
      // office line-up: west column (second hires), front row
      zone: { x: -14.4, z: -1 },
      spawns: [],
      worker: { id: 'farmer2', role: 'farmer' },
      // hiring the second brings the third along
      reveals: ['farmer3'],
    },
    {
      id: 'farmer3',
      label: 'Contratar tercer granjero',
      icon: 'tomato',
      // double the regular farmer
      price: 180,
      // replaces farmer2 on the same pad once the second hire is bought
      zone: { x: -14.4, z: -1 },
      spawns: [],
      worker: { id: 'farmer3', role: 'farmer' },
      reveals: [],
    },
    {
      id: 'areaA1',
      label: 'Ampliar tienda',
      icon: 'money',
      price: 120,
      // end of the first checkout's queue lane, next to the wall that will open
      zone: { x: 2, z: -5.8 },
      spawns: [],
      area: 'A1',
      // the new room brings the wheat line and its own entrance + checkout
      reveals: ['wheat', 'checkout2'],
    },
    {
      id: 'areaA2',
      label: 'Anexo cafetería',
      icon: 'money',
      price: 400,
      // pay zone on the grass in front of the annex
      zone: { x: 19, z: 6 },
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
      // office line-up: east column, middle row
      zone: { x: -11.6, z: -2.8 },
      spawns: [],
      worker: { id: 'shelver', role: 'shelver' },
      reveals: [],
    },
    {
      id: 'shelver2',
      label: 'Contratar segundo reponedor',
      icon: 'tomatoCan',
      price: 210,
      // office line-up: west column (second hires), middle row
      zone: { x: -14.4, z: -2.8 },
      spawns: [],
      worker: { id: 'shelver2', role: 'shelver' },
      reveals: ['shelver3'],
    },
    {
      id: 'shelver3',
      label: 'Contratar tercer reponedor',
      icon: 'tomatoCan',
      // double the regular shelver
      price: 260,
      // replaces shelver2 on the same pad once the second hire is bought
      zone: { x: -14.4, z: -2.8 },
      spawns: [],
      worker: { id: 'shelver3', role: 'shelver' },
      reveals: [],
    },
    {
      id: 'wheat',
      label: 'Trigo y molino',
      icon: 'wheat',
      // strong first price: the mill plus a field that starts with 1 tile
      price: 150,
      zone: { x: 6, z: 10.5 },
      spawns: [
        { type: 'producer', id: 'plot1', model: 'plot', kind: 'wheat', pos: { x: 6, z: 7.2 }, max: 12, regrow: 1.5, units: 12 },
        {
          type: 'machine',
          id: 'mill',
          model: 'mill',
          // right above the wheat field
          pos: { x: 5, z: 3.6 },
          recipe: { in: { wheat: 1 }, out: 'flour', n: 1, time: 2.5 },
          inputCap: 4,
          outputCap: 4,
        },
      ],
      // flour is ready: the bakery and the dairy come next
      reveals: ['cow', 'wheatPlants', 'bakery'],
    },
    {
      id: 'wheatPlants',
      label: 'Más trigo',
      icon: 'wheat',
      // cheap per-tile price: the field grows one tile per purchase
      price: 25,
      units: 11,
      grows: 'plot1',
      zone: { x: 6, z: 10.5 },
      spawns: [],
      reveals: [],
    },
    {
      id: 'cow',
      label: 'Vaca y refrigerador',
      icon: 'milk',
      // the cow comes with its milk fridge, so milk sells from the first bottle
      price: 240,
      zone: { x: 12, z: 7.2 },
      spawns: [
        { type: 'producer', id: 'cow1', model: 'cow', kind: 'milk', pos: { x: 12, z: 7.2 }, max: 4, regrow: 4, start: 0, feed: { kind: 'wheat', cap: 4 } },
        // straight up from the cow, behind the cheese press
        { type: 'shelf', id: 'shelfMilk', model: 'fridge', kind: 'milk', pos: { x: 13, z: 1.2 }, cap: 12, tiers: 3 },
      ],
      reveals: ['cheesePress'],
    },
    {
      id: 'cheesePress',
      label: 'Prensa de queso',
      icon: 'cheese',
      price: 260,
      zone: { x: 13, z: 3.6 },
      spawns: [
        {
          type: 'machine',
          id: 'cheesePress',
          model: 'cheesePress',
          // right above the cow
          pos: { x: 13, z: 3.6 },
          recipe: { in: { milk: 1 }, out: 'cheese', n: 1, time: 3 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfCheese', model: 'shelf', kind: 'cheese', pos: { x: 10, z: 1.2 }, cap: 12, tiers: 2 },
      ],
      // with milk and cheese flowing, the cafeteria annex can open (cakes + pizzas)
      reveals: ['areaA2'],
    },
    {
      id: 'mixer',
      label: 'Pastelera',
      icon: 'cake',
      price: 300,
      zone: { x: 17, z: 3.6 },
      spawns: [
        {
          type: 'machine',
          id: 'mixer',
          model: 'mixer',
          pos: { x: 17, z: 3.6 },
          // first three-ingredient recipe: the premium product
          recipe: { in: { flour: 1, milk: 1, egg: 1 }, out: 'cake', n: 1, time: 3.5 },
          inputCap: 4,
          outputCap: 4,
        },
        // turned to face west, lined up along the annex's east wall
        { type: 'shelf', id: 'shelfCake', model: 'shelf', kind: 'cake', pos: { x: 22, z: -4.5 }, turn: 3, cap: 12, tiers: 2 },
      ],
      reveals: [],
    },
    {
      id: 'pizzaOven',
      label: 'Horno de pizza',
      icon: 'pizza',
      price: 350,
      zone: { x: 21, z: 3.6 },
      spawns: [
        {
          type: 'machine',
          id: 'pizzaOven',
          model: 'pizzaOven',
          pos: { x: 21, z: 3.6 },
          recipe: { in: { flour: 1, tomato: 1, cheese: 1 }, out: 'pizza', n: 1, time: 4 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfPizza', model: 'shelf', kind: 'pizza', pos: { x: 22, z: -1.4 }, turn: 3, cap: 12, tiers: 2 },
      ],
      // the pizza oven is the last big machine: the new branch opens after it
      reveals: ['branch'],
    },
    {
      id: 'checkout2',
      label: 'Segunda caja',
      icon: 'money',
      price: 200,
      zone: { x: 8.5, z: -4.5 },
      // right inside the second door
      spawns: [{ type: 'checkout', id: 'checkout2', pos: { x: 8.5, z: -4.5 } }],
      reveals: ['cashier2'],
    },
    {
      id: 'bakery',
      label: 'Panadería',
      icon: 'bread',
      price: 220,
      zone: { x: 9, z: 3.6 },
      spawns: [
        {
          type: 'machine',
          id: 'oven',
          model: 'oven',
          // between the mill (flour) and the farm path from the hens (eggs)
          pos: { x: 9, z: 3.6 },
          recipe: { in: { flour: 1, egg: 1 }, out: 'bread', n: 1, time: 3 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfBread', model: 'shelf', kind: 'bread', pos: { x: 7, z: 1.2 }, cap: 12, tiers: 2 },
      ],
      reveals: ['chef'],
    },
    {
      id: 'chef',
      label: 'Contratar chef',
      icon: 'bread',
      price: 250,
      // office line-up: east column, back row
      zone: { x: -11.6, z: -4.6 },
      spawns: [],
      worker: { id: 'chef', role: 'chef' },
      reveals: [],
    },
    {
      id: 'chef2',
      label: 'Contratar segundo chef',
      icon: 'bread',
      price: 380,
      // office line-up: west column (second hires), back row
      zone: { x: -14.4, z: -4.6 },
      spawns: [],
      worker: { id: 'chef2', role: 'chef' },
      reveals: ['chef3'],
    },
    {
      id: 'chef3',
      label: 'Contratar tercer chef',
      icon: 'bread',
      // double the regular chef
      price: 500,
      // replaces chef2 on the same pad once the second hire is bought
      zone: { x: -14.4, z: -4.6 },
      spawns: [],
      worker: { id: 'chef3', role: 'chef' },
      reveals: [],
    },
    {
      id: 'branch',
      label: 'Nueva sucursal',
      icon: 'money',
      price: 500,
      // on the grass by the store's west corner: buying it completes the level
      zone: { x: -12, z: 3.5 },
      spawns: [],
      reveals: [],
    },
    {
      id: 'cashier2',
      label: 'Contratar segundo cajero',
      icon: 'money',
      price: 220,
      zone: { x: 11.5, z: -5.8 },
      spawns: [],
      cashier: 'checkout2',
      reveals: [],
    },
    {
      id: 'jamPot',
      label: 'Olla de mermelada',
      icon: 'jam',
      price: 240,
      zone: { x: -1, z: 3.6 },
      spawns: [
        {
          type: 'machine',
          id: 'jamPot',
          model: 'jamPot',
          // right above the strawberries and the hive
          pos: { x: -1, z: 3.6 },
          recipe: { in: { strawberry: 1, honey: 1 }, out: 'jam', n: 1, time: 3.5 },
          inputCap: 4,
          outputCap: 4,
        },
        { type: 'shelf', id: 'shelfJam', model: 'shelf', kind: 'jam', pos: { x: 0.5, z: 1.2 }, cap: 12, tiers: 2 },
      ],
      reveals: [],
    },
    {
      id: 'cashier',
      label: 'Contratar cajero',
      icon: 'money',
      price: 40,
      // right next to the counter, on the cashier side
      zone: { x: -2, z: -5.8 },
      spawns: [],
      cashier: 'checkout1',
      reveals: [],
    },
  ],
}
