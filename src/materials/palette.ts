// Colors sampled from the My Mini Mart store screenshots and the web Playable.
export const C = {
  grass: '#B9EF62',
  grassDark: '#8FD84C',
  floor: '#FFCB85',
  floorEdge: '#7FD24A',
  wall: '#E3EAEE',
  wallStripe: '#3F8CE0',
  glass: '#C6F0DF',
  mat: '#F0A15A',
  pinkFloor: '#F4C6D8',

  wood: '#B97A45',
  woodDark: '#8A5A32',
  woodLight: '#D9A066',
  cardboard: '#D39A5B',
  fence: '#D98A3E',

  soil: '#8A5530',
  soilBase: '#E8912E',
  straw: '#FFE27A',
  nest: '#F0A030',

  counter: '#5FF0C4',
  pad: '#9AA2A6',
  zone: '#ACBCBF',

  tomato: '#E8352B',
  leaf: '#3DBE3A',
  leafDark: '#2A9A2E',
  egg: '#FFF4DD',
  bread: '#E0913F',
  breadTop: '#F4C27A',
  wheat: '#F6C945',
  can: '#6BCB4A',
  milk: '#FFFFFF',
  milkBand: '#4A90E2',
  cheese: '#F7CE55',
  cheeseRind: '#E0972F',
  strawberry: '#E8485C',
  honey: '#F0A828',
  jam: '#A83240',
  juice: '#FFB13B',
  butter: '#FFE27A',
  ketchup: '#D62A22',
  iceCream: '#FFB3C8',
  cone: '#E3A15A',
  pancake: '#E9A552',
  chrome: '#DDE4E8',
  asphalt: '#5E656C',

  money: '#86DB55',
  moneyDark: '#4E9E2F',
  fridge: '#3C84DA',
  fridgeGlass: '#BFE6FF',
  trash: '#E0403C',
  white: '#FFFFFF',
  cream: '#FFF6E6',
  gray: '#8C9296',
  lightGray: '#C9CED2',
  dark: '#3A3F45',
  screen: '#2E3440',
  pink: '#F28DA8',
  orange: '#F7A53B',
  yellow: '#FFD23F',
  water: '#8FD3FF',
  waterDeep: '#5DB8F0',

  // teal blue of the original's player (lit ~#54C2D7, shadow ~#3995B2 after the toon ramp)
  player: '#4CBFD6',
  outline: '#141110',
} as const

// Customer body colors, like the random NPC colors in the game.
// No pink (staff is pink) and no blue/purple (too close to each other and to the teal player).
export const CUSTOMER_COLORS = ['#E0574F', '#A8D857', '#F5D64A', '#5ED36B', '#F28A3B', '#F0F0F0']

// Employees are all pink, like the original game; roles differ by hat.
export const WORKER_COLOR = '#E866D8'

// The cashier wears a navy suit with a yellow necktie instead of the staff jumpsuit.
export const CASHIER_COLOR = '#3D4A6B'

// Random looks for incoming customers: hair colors for hair heads, vivid cloths for hats.
export const HAIR_COLORS = ['#5C3A21', '#2B2B2B', '#E8C46B', '#C96A2E', '#E866D8']
export const CLOTH_COLORS = ['#4AA8FF', '#E0574F', '#5ED36B', '#F5D64A', '#F0F0F0']

// Body colors for drive-up cars and motorbikes.
export const VEHICLE_COLORS = ['#E0574F', '#4AA8FF', '#F5D64A', '#5ED36B', '#F28A3B', '#F0F0F0', '#A77BEA']
