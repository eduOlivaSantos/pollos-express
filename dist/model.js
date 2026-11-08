export const branches = [
  { id: 'piloto', name: 'Sucursal piloto', area: 'Zona 1', stock: { pollo: 20, papas: 32, bebida: 24, pan: 12 } },
  { id: 'norte', name: 'Sucursal Norte', area: 'Zona 18', stock: { pollo: 42, papas: 35, bebida: 30, pan: 18 } },
];

export const ingredients = [
  { id: 'pollo', name: 'Piezas de pollo', unit: 'piezas', singular: 'pieza', min: 16 },
  { id: 'papas', name: 'Papas fritas', unit: 'porciones', singular: 'porción', min: 8 },
  { id: 'bebida', name: 'Bebidas', unit: 'unidades', singular: 'unidad', min: 8 },
  { id: 'pan', name: 'Pan brioche', unit: 'unidades', singular: 'unidad', min: 4 },
];

export const menu = [
  { id: 'express', name: 'Combo Express', category: 'Combos', description: '2 piezas, papas y bebida', price: 4500, recipe: { pollo: 2, papas: 1, bebida: 1 }, tone: 'gold' },
  { id: 'familiar', name: 'Combo Familiar', category: 'Combos', description: '8 piezas, 4 papas y 4 bebidas', price: 13900, recipe: { pollo: 8, papas: 4, bebida: 4 }, tone: 'peach' },
  { id: 'crujiente', name: 'Sándwich Crujiente', category: 'Combos', description: 'Pollo en pan brioche', price: 3500, recipe: { pollo: 1, pan: 1 }, tone: 'sand' },
  { id: 'pieza', name: 'Pollo Dorado', category: 'Pollo', description: '1 pieza de pollo frito', price: 1800, recipe: { pollo: 1 }, tone: 'sand' },
  { id: 'papas', name: 'Papas Fritas', category: 'Acompañamientos', description: 'Una porción de papas', price: 1200, recipe: { papas: 1 }, tone: 'gold' },
  { id: 'bebida', name: 'Bebida Fría', category: 'Bebidas', description: 'Refresco de 355 ml', price: 1000, recipe: { bebida: 1 }, tone: 'peach' },
];

export const orderTypes = ['Para llevar', 'En local', 'Retiro'];
export const paymentMethods = ['Efectivo', 'Tarjeta'];
export const statuses = ['Recibida', 'En preparación', 'Lista', 'Entregada'];
export const formatMoney = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
const byProduct = new Map(menu.map(product => [product.id, product]));

export function totals(items) {
  const usage = {};
  let cents = 0;
  for (const { id, quantity } of items) {
    const product = byProduct.get(id);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Revisa las cantidades del pedido.');
    cents += product.price * quantity;
    for (const [ingredient, amount] of Object.entries(product.recipe)) {
      usage[ingredient] = (usage[ingredient] ?? 0) + amount * quantity;
    }
  }
  return { cents, usage };
}

export function stockFor(state, branchId, includePending = false) {
  const stock = { ...branches.find(branch => branch.id === branchId).stock };
  for (const order of state.orders) {
    if (order.branch !== branchId || (order.pending && !includePending)) continue;
    for (const [ingredient, quantity] of Object.entries(order.usage)) stock[ingredient] -= quantity;
  }
  return stock;
}

function seededOrder(number, minutesAgo, type, items) {
  const time = new Date(Date.now() - minutesAgo * 60000).toISOString();
  return {
    id: 'muestra-' + number, number, branch: 'norte', type, payment: 'Efectivo', items,
    ...totals(items), createdAt: time, confirmedAt: time, status: 3, pending: false,
  };
}

export function seed() {
  return {
    generation: crypto.randomUUID(),
    nextNumber: 104,
    offline: {},
    orders: [
      seededOrder(101, 71, 'En local', [{ id: 'express', quantity: 2 }]),
      seededOrder(102, 48, 'Para llevar', [{ id: 'familiar', quantity: 1 }]),
      seededOrder(103, 27, 'Retiro', [{ id: 'crujiente', quantity: 2 }, { id: 'bebida', quantity: 2 }]),
    ],
  };
}

export function placeOrder(state, request) {
  if (request.generation !== state.generation) throw new Error('La demo se reinició. Agrega los productos de nuevo.');
  const existing = state.orders.find(order => order.id === request.id);
  if (existing) return existing;
  if (!request.items.length || !orderTypes.includes(request.type) || !paymentMethods.includes(request.payment) ||
      !branches.some(branch => branch.id === request.branch)) {
    throw new Error('Revisa el pedido y vuelve a confirmar.');
  }
  const { cents, usage } = totals(request.items);
  const stock = stockFor(state, request.branch, true);
  const shortage = ingredients.find(ingredient => (usage[ingredient.id] ?? 0) > stock[ingredient.id]);
  if (shortage) throw new Error('Existencias insuficientes de ' + shortage.name.toLowerCase() + '. Ajusta el pedido.');
  const time = new Date().toISOString();
  const pending = Boolean(state.offline[request.branch]);
  const order = {
    id: request.id, number: state.nextNumber++, branch: request.branch,
    type: request.type, payment: request.payment, items: request.items,
    cents, usage, createdAt: time, confirmedAt: pending ? null : time, status: 0, pending,
  };
  state.orders.push(order);
  return order;
}

export function advanceOrder(state, id, expected) {
  const order = state.orders.find(item => item.id === id);
  if (!order || order.pending || order.status !== expected || expected >= statuses.length - 1) return false;
  order.status += 1;
  return true;
}

export function toggleConnection(state, branchId) {
  if (!state.offline[branchId]) {
    state.offline[branchId] = true;
    return { offline: true, synced: 0 };
  }
  delete state.offline[branchId];
  let synced = 0;
  const time = new Date().toISOString();
  for (const order of state.orders) {
    if (order.branch !== branchId || !order.pending) continue;
    order.confirmedAt = time;
    order.pending = false;
    synced += 1;
  }
  return { offline: false, synced };
}

const storageKey = 'pollos-express-demo-v1';
const exclusive = action => navigator.locks.request(storageKey, action);
const read = () => JSON.parse(localStorage.getItem(storageKey));
const write = state => localStorage.setItem(storageKey, JSON.stringify(state));

export function openState() {
  return exclusive(() => {
    const saved = read();
    if (saved) return saved;
    const state = seed();
    write(state);
    return state;
  });
}

export function updateState(action) {
  return exclusive(() => {
    const state = read() ?? seed();
    const result = action(state);
    write(state);
    return { state, result };
  });
}

export function watchState(onChange) {
  window.addEventListener('storage', event => {
    if (event.key === storageKey) onChange(read());
  });
}
