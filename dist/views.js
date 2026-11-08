import { branches, formatMoney, ingredients, menu, orderTypes, statuses, stockFor, totals } from './model.js';

const drawings = {
  cash: '<rect x="3" y="4" width="18" height="11" rx="2"/><path d="M8 20h8m-4-5v5m-5-9h4"/>',
  kitchen: '<path d="M6 14a4 4 0 1 1 2-7 4 4 0 0 1 8 0 4 4 0 1 1 2 7v6H6zm0 3h12"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zm0 0 9 4 9-4m-9 4v10M7.5 5l9 4"/>',
  chart: '<path d="M4 4v16h16M8 15v-3m5 3V8m5 7V5"/>',
  branch: '<path d="M3 10l2-6h14l2 6M4 11v9h16v-9M3 10c0 2 3 3 4 1 1 2 4 2 5 0 1 2 4 2 5 0 1 2 4 1 4-1M10 20v-5h4v5"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zm3 5h6m-6 4h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  external: '<path d="M13 5h6v6m0-6-9 9m7 0v5H5V7h5"/>',
  refresh: '<path d="M20 10a8 8 0 1 0-2 8m2-13v5h-5"/>',
  guide: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5 1c0 2-2.5 2-2.5 4m0 3h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  warning: '<path d="M12 4 3 20h18zm0 6v4m0 3h.01"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h3"/>',
  bills: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01m12 0h.01"/>',
};

export function icon(name, size = 20) {
  return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + drawings[name] + '</svg>';
}

const productName = id => menu.find(product => product.id === id).name;
export const currency = cents => formatMoney.format(cents / 100).replace(/\s/g, '');
export const ticketNumber = order => 'PEX-' + String(order.number).padStart(4, '0');
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const time = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' });
const clock = date => time.format(new Date(date));
const unit = (ingredient, amount) => amount === 1 ? ingredient.singular : ingredient.unit;

function title(label, heading, description, action = '') {
  return '<header class="page-heading"><div><p class="eyebrow">' + label + '</p><h1>' + heading +
    '</h1><p class="subtitle">' + description + '</p></div>' + action + '</header>';
}

function empty(symbol, heading, body) {
  return '<div class="empty">' + icon(symbol, 24) + '<strong>' + heading + '</strong><p>' + body + '</p></div>';
}

function branchOrders(state, branch) {
  return state.orders.filter(order => order.branch === branch && !order.pending);
}

export function catalog(state, branch, category, query) {
  const stock = stockFor(state, branch, true);
  const matches = menu.filter(product => (category === 'Todo' || product.category === category) &&
    (product.name + ' ' + product.description).toLowerCase().includes(query.trim().toLowerCase()));
  if (!matches.length) return empty('search', 'Sin coincidencias', 'Prueba otro nombre o elige una categoría diferente.');
  return matches.map(product => {
    const soldOut = Object.entries(product.recipe).some(([id, quantity]) => stock[id] < quantity);
    return '<article class="product"><div class="food-art ' + product.tone + '"><svg viewBox="0 0 248 136" aria-hidden="true"><use href="./menu.svg#' + product.id +
      '"></use></svg>' + (product.id === 'express' ? '<span class="menu-stamp">DE LA CASA</span>' : '') +
      '</div><div class="product-copy"><h3>' + product.name + '</h3><p>' + product.description + '</p>' +
      '<div class="product-bottom"><strong>' + currency(product.price) + '</strong><button type="button" data-add="' + product.id + '"' +
      (soldOut ? ' disabled aria-label="' + product.name + ', agotado"' : ' aria-label="Agregar ' + product.name + '" title="Agregar ' + product.name + '"') +
      '>' + (soldOut ? 'Agotado' : icon('plus', 19)) + '</button></div></div></article>';
  }).join('');
}

export function cartView(cart, type, branch) {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const items = cart.map(({ id, quantity }) => {
    const product = menu.find(item => item.id === id);
    return '<li class="cart-line"><div><strong>' + product.name + '</strong><span>' + currency(product.price) +
      ' c/u</span></div><div class="stepper"><button type="button" data-minus="' + id + '" aria-label="Quitar una unidad de ' +
      product.name + '">' + icon('minus', 15) + '</button><span>' + quantity + '</span><button type="button" data-add="' +
      id + '" aria-label="Sumar una unidad de ' + product.name + '">' + icon('plus', 15) + '</button></div><b>' +
      currency(product.price * quantity) + '</b></li>';
  }).join('');
  return '<div class="receipt-head"><span class="receipt-mark">' + icon('receipt', 23) + '</span><div><h2>Pedido actual</h2><p>' + branch.name +
    '</p></div><span class="item-count">' + count + '</span></div><div class="receipt-body"><fieldset class="types"><legend>Tipo de pedido</legend><div>' +
    orderTypes.map(option => '<label><input type="radio" name="type" value="' + option + '"' + (option === type ? ' checked' : '') +
      '><span>' + option + '</span></label>').join('') + '</div></fieldset>' +
    (items ? '<ul class="cart-list">' + items + '</ul>' : empty('receipt', 'Tu pedido está vacío', 'Agrega productos del menú para empezar.')) +
    '<div class="receipt-total"><span>Total a cobrar</span><strong>' + currency(totals(cart).cents) +
    '</strong></div><button type="button" class="primary full" id="checkout"' + (count ? '' : ' disabled') + '>Cobrar pedido ' +
    icon('arrow', 18) + '</button><p class="receipt-note">Pago y comprobante simulados</p></div>';
}

export function posView({ state, branch, cart, type, category, query }) {
  const filters = ['Todo', 'Combos', 'Pollo', 'Acompañamientos', 'Bebidas'];
  const pending = state.orders.filter(order => order.branch === branch.id && order.pending);
  const recent = state.orders.filter(order => order.branch === branch.id).at(-1);
  const offline = Boolean(state.offline[branch.id]);
  return title('01 / CAJA', 'Punto de venta', 'Selecciona productos y registra el pedido de la sucursal.',
    '<a class="quiet-button" href="?sucursal=' + branch.id + '#cocina" target="_blank" rel="noopener">' + icon('external', 16) + ' Abrir cocina en otra pestaña</a>') +
    (offline ? '<div class="alert">' + icon('warning', 19) + '<div><strong>Contingencia simulada activa</strong><p>Los pedidos se guardan aquí y pasan a cocina al restablecer la conexión.</p></div><span>' +
      pending.length + ' pendiente' + (pending.length === 1 ? '' : 's') + '</span></div>' : '') +
    '<div class="pos-grid"><section class="menu-workspace" aria-labelledby="menu-title"><div class="section-row"><div><h2 id="menu-title">Menú</h2>' +
    '<p>' + menu.length + ' productos en el catálogo</p></div><label class="search">' + icon('search', 18) +
    '<span class="sr-only">Buscar producto</span><input id="product-search" placeholder="Buscar producto" value="' + escapeHtml(query) + '"></label></div>' +
    '<div class="filters" aria-label="Categorías del menú">' + filters.map(filter => '<button type="button" data-category="' + filter +
      '" aria-pressed="' + (filter === category) + '">' + filter + '</button>').join('') + '</div><div class="catalog" id="catalog">' +
    catalog(state, branch.id, category, query) + '</div></section><div class="order-column"><section class="receipt" id="cart" aria-label="Pedido actual">' +
    cartView(cart, type, branch) + '</section>' + (recent ? '<button class="recent" data-ticket="' + recent.id + '">' + icon('receipt', 19) +
    '<span><strong>Último ticket · ' + ticketNumber(recent) + '</strong><small>' + (recent.pending ? 'Pendiente de sincronizar' : 'Ver comprobante') +
    '</small></span>' + icon('arrow', 17) + '</button>' : '') + '</div></div>';
}

export function kitchenView({ state, branch }) {
  const orders = branchOrders(state, branch.id);
  const pending = orders.filter(order => order.status < 3).length;
  const labels = ['Recibidas', 'En preparación', 'Listas', 'Entregadas'];
  return title('02 / COCINA', 'Órdenes de cocina', 'Sigue los pedidos confirmados de ' + branch.name + '.',
    '<span class="live-indicator"><span></span>' + pending + ' en curso</span>') +
    '<div class="kitchen-board">' + labels.map((label, stage) => {
      const group = orders.filter(order => order.status === stage).reverse();
      return '<section class="lane stage-' + stage + '"><header><h2><i></i>' + label + '</h2><span>' + group.length + '</span></header>' +
        (group.length ? group.map(order => '<article class="kitchen-order"><div class="order-heading"><strong>' + ticketNumber(order) +
          '</strong><span>' + clock(order.confirmedAt) + '</span></div><p class="tag">' + order.type + '</p><ul>' +
          order.items.map(item => '<li><span>' + item.quantity + ' ×</span> ' + productName(item.id) + '</li>').join('') +
          '</ul>' + (stage === 3 ? '<p class="delivered">' + icon('check', 16) + ' Entregada</p>' :
            '<button class="lane-action" data-advance="' + order.id + '" data-stage="' + stage + '">' +
            ['Iniciar preparación', 'Marcar como lista', 'Confirmar entrega'][stage] + icon('arrow', 16) + '</button>') + '</article>').join('') :
          '<div class="lane-empty">' + icon(stage === 3 ? 'check' : 'receipt', 22) + '<span>Sin órdenes</span></div>') + '</section>';
    }).join('') + '</div>';
}

function table(caption, headers, rows) {
  return '<div class="table-scroll"><table><caption class="sr-only">' + caption + '</caption><thead><tr>' +
    headers.map(head => '<th scope="col">' + head + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(row => '<tr>' + row.map((cell, index) => index ? '<td>' + cell + '</td>' : '<th scope="row">' + cell + '</th>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

export function stockView({ state, branch }) {
  const stock = stockFor(state, branch.id);
  const low = ingredients.filter(ingredient => stock[ingredient.id] <= ingredient.min);
  const movements = branchOrders(state, branch.id).reverse().flatMap(order =>
    ingredients.filter(item => order.usage[item.id]).map(item => [
      ticketNumber(order), clock(order.confirmedAt), item.name,
      '−' + order.usage[item.id] + ' ' + unit(item, order.usage[item.id]), 'Consumo por receta',
    ]));
  return title('03 / INVENTARIO', 'Inventario por receta', 'Consulta existencias y rastrea el consumo de cada venta en ' + branch.name + '.',
    '<span class="live-indicator ' + (low.length ? 'low' : '') + '"><span></span>' + (low.length ? low.length + ' en mínimo o menos' : 'Existencias al día') + '</span>') +
    '<section class="data-panel"><div class="section-row"><div><h2>Existencias</h2><p>El consumo se registra al confirmar la venta.</p></div></div>' +
    table('Existencias', ['Insumo', 'Saldo inicial', 'Existencia actual', 'Mínimo', 'Estado'], ingredients.map(item => [
      item.name, branch.stock[item.id] + ' ' + item.unit, '<b>' + stock[item.id] + '</b> ' + unit(item, stock[item.id]), item.min,
      '<span class="status-badge ' + (stock[item.id] <= item.min ? 'low' : '') + '">' + (stock[item.id] <= item.min ? 'Stock bajo' : 'Disponible') + '</span>',
    ])) + '</section><section class="data-panel"><div class="section-row"><div><h2>Movimientos recientes</h2><p>Identificados por el mismo número de orden que aparece en caja.</p></div></div>' +
    (movements.length ? table('Movimientos de inventario', ['Orden', 'Hora', 'Insumo', 'Salida', 'Motivo'], movements) :
      empty('box', 'Aún no hay movimientos', 'Las ventas confirmadas aparecerán aquí con los insumos utilizados.')) + '</section>';
}

export function reportView({ state, branch, orderFilter }) {
  const all = branchOrders(state, branch.id);
  const orders = all.filter(order => orderFilter === 'Todos' || order.type === orderFilter);
  const sales = orders.reduce((sum, order) => sum + order.cents, 0);
  const average = orders.length ? Math.round(sales / orders.length) : 0;
  const byBranch = branches.map(item => ({
    ...item,
    cents: branchOrders(state, item.id).filter(order => orderFilter === 'Todos' || order.type === orderFilter)
      .reduce((sum, order) => sum + order.cents, 0),
  }));
  const max = Math.max(1, ...byBranch.map(item => item.cents));
  const cards = [['Ventas confirmadas', currency(sales)], ['Pedidos confirmados', orders.length], ['Ticket promedio', currency(average)]];
  return title('04 / GERENCIA', 'Resumen de ventas', 'Revisa los resultados de ' + branch.name + ' con los datos de la demo.',
    '<label class="report-filter">Tipo de pedido <select id="report-filter">' + ['Todos', ...orderTypes].map(type =>
      '<option' + (type === orderFilter ? ' selected' : '') + '>' + type + '</option>').join('') + '</select></label>') +
    '<div class="metrics">' + cards.map(([label, value]) => '<div><p>' + label + '</p><strong>' + value + '</strong></div>').join('') +
    '</div><section class="data-panel sales-panel"><div class="section-row"><div><h2>Ventas por sucursal</h2><p>Comparativo del ambiente de demostración.</p></div></div>' +
    '<div class="bars">' + byBranch.map(item => '<div class="bar-row ' + (item.id === branch.id ? 'selected' : '') + '"><span>' +
      item.name + '</span><div class="bar-track"><span style="--width:' + (item.cents / max * 100) +
      '%"></span></div><strong>' + currency(item.cents) + '</strong></div>').join('') + '</div></section>' +
    '<section class="data-panel"><div class="section-row"><div><h2>Pedidos registrados</h2><p>' + branch.name + ' · ' +
    (orderFilter === 'Todos' ? 'Todos los tipos' : orderFilter) + '</p></div></div>' +
    (orders.length ? table('Ventas confirmadas', ['Orden', 'Hora', 'Tipo', 'Estado', 'Total'], [...orders].reverse().map(order => [
      ticketNumber(order), clock(order.confirmedAt), order.type, statuses[order.status], '<b>' + currency(order.cents) + '</b>',
    ])) : empty('chart', 'No hay ventas en esta vista', 'Confirma una venta en caja o cambia el filtro.')) + '</section>';
}

export function receiptDialog(order) {
  return '<div class="ticket-top"><span class="ticket-icon">' + icon(order.pending ? 'clock' : 'check', 24) + '</span>' +
    '<p class="eyebrow">COMPROBANTE DE DEMO</p><h2 id="dialog-title">' + (order.pending ? 'Pendiente de sincronizar' : 'Pedido confirmado') + '</h2>' +
    '<p>' + ticketNumber(order) + ' · ' + branches.find(branch => branch.id === order.branch).name + '</p></div><div class="ticket-details">' +
    '<p>' + order.type + ' · ' + order.payment + ' · ' + clock(order.createdAt) + '</p><ul>' +
    order.items.map(item => '<li><span>' + item.quantity + ' × ' + productName(item.id) + '</span><strong>' + currency(totals([item]).cents) + '</strong></li>').join('') +
    '</ul><div><span>Total</span><strong>' + currency(order.cents) + '</strong></div></div><p class="dialog-note">' +
    (order.pending ? 'La orden se enviará al restablecer la conexión simulada.' : 'Comprobante simulado de la venta.') +
    '</p><button class="primary full" type="button" data-close>Volver a caja ' + icon('arrow', 18) + '</button>';
}
