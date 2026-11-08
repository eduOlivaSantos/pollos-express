import {
  advanceOrder, branches, menu, openState, orderTypes, paymentMethods, placeOrder, seed, toggleConnection,
  totals, updateState, watchState,
} from './model.js';
import { cartView, catalog, currency, icon, kitchenView, posView, receiptDialog, reportView, stockView, ticketNumber } from './views.js';

const pages = [
  { id: 'caja', title: 'Caja', icon: 'cash', render: posView },
  { id: 'cocina', title: 'Cocina', icon: 'kitchen', render: kitchenView },
  { id: 'inventario', title: 'Inventario', icon: 'box', render: stockView },
  { id: 'gerencia', title: 'Gerencia', icon: 'chart', render: reportView },
];

const workspace = document.querySelector('#workspace');
const navigation = document.querySelector('#navigation');
const branchPicker = document.querySelector('#branch');
const connection = document.querySelector('#connection');
const dialog = document.querySelector('#dialog');
const notice = document.querySelector('#notice');
const stateByBranch = new Map(branches.map(branch => [branch.id, { cart: [], type: orderTypes[0] }]));
let branch = branches.find(item => item.id === new URLSearchParams(location.search).get('sucursal')) ?? branches[0];
let category = 'Todo';
let query = '';
let orderFilter = 'Todos';
let state;
let noticeTimer;
let dialogTrigger;
let request;
let submitting = false;

const page = () => pages.find(item => '#' + item.id === location.hash) ?? pages[0];
const draft = () => stateByBranch.get(branch.id);
const context = () => ({ state, branch, ...draft(), category, query, orderFilter });

function showNotice(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.classList.add('visible');
  noticeTimer = setTimeout(() => notice.classList.remove('visible'), 4100);
}

function preserveFocus(container, update) {
  const active = document.activeElement;
  const selector = active.id ? '#' + CSS.escape(active.id) :
    ['data-add', 'data-minus', 'data-category', 'data-advance', 'data-ticket', 'value']
      .map(name => active.hasAttribute(name) ? active.localName + '[' + name + '="' + CSS.escape(active.getAttribute(name)) + '"]' : '')
      .find(Boolean);
  const restore = container.contains(active) && selector;
  const selection = active.id === 'product-search' ? [active.selectionStart, active.selectionEnd] : null;
  const scope = active.closest('#cart') ? '#cart ' : '';
  update();
  if (!restore) return;
  const replacement = container.querySelector(scope + selector) ?? container.querySelector(selector);
  replacement?.focus({ preventScroll: true });
  if (selection) replacement?.setSelectionRange(...selection);
}

function render() {
  const current = page();
  for (const link of navigation.querySelectorAll('a')) {
    if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('#breadcrumb').textContent = current.title;
  document.title = current.title + ' · Pollos Express';
  branchPicker.value = branch.id;
  const offline = Boolean(state.offline[branch.id]);
  connection.setAttribute('aria-pressed', String(offline));
  connection.innerHTML = '<span aria-hidden="true"></span>' + (offline ? 'Restablecer conexión' : 'Simular desconexión');
  preserveFocus(workspace, () => { workspace.innerHTML = current.render(context()); });
}

function updateCart() {
  const cart = document.querySelector('#cart');
  preserveFocus(cart, () => { cart.innerHTML = cartView(draft().cart, draft().type, branch); });
}

function updateCatalog() {
  const grid = document.querySelector('#catalog');
  preserveFocus(grid, () => { grid.innerHTML = catalog(state, branch.id, category, query); });
}

function useState(next) {
  if (!next) return;
  if (state && state.generation !== next.generation) {
    for (const item of stateByBranch.values()) {
      item.cart = [];
      item.type = orderTypes[0];
    }
    if (dialog.open) dialog.close();
  }
  state = next;
  render();
}

async function mutate(action) {
  const { state: next, result } = await updateState(action);
  useState(next);
  return result;
}

function changeQuantity(id, delta) {
  const previous = draft().cart;
  const item = previous.find(line => line.id === id);
  const quantity = (item?.quantity ?? 0) + delta;
  draft().cart = item ?
    previous.map(line => line.id === id ? { id, quantity } : line).filter(line => line.quantity > 0) :
    [...previous, { id, quantity }];
  updateCart();
}

function openDialog(content, trigger) {
  dialog.innerHTML = content;
  if (dialog.open) {
    dialog.querySelector('button')?.focus();
  } else {
    dialogTrigger = trigger;
    dialog.showModal();
  }
}

function openCheckout(trigger) {
  const { cart, type } = draft();
  if (!cart.length) return;
  request = {
    id: crypto.randomUUID(), generation: state.generation, items: cart.map(item => ({ ...item })), type, branch: branch.id,
  };
  const offline = Boolean(state.offline[branch.id]);
  openDialog('<form id="payment-form"><div class="dialog-header"><div><p class="eyebrow">PAGO SIMULADO</p>' +
    '<h2 id="dialog-title">Cobrar pedido</h2><p>' + branch.name + ' · ' + type + '</p></div><button class="icon-button" type="button" data-close aria-label="Cerrar">' +
    icon('close') + '</button></div><div class="checkout-total"><span>Total a cobrar</span><strong>' + currency(totals(cart).cents) +
    '</strong></div><fieldset class="payment-options"><legend>Medio de pago</legend>' +
    paymentMethods.map((method, index) => '<label><input type="radio" name="payment" value="' + method + '"' + (index ? '' : ' checked') + '><span>' +
      icon(index ? 'card' : 'bills', 19) + method + '</span></label>').join('') + '</fieldset><p class="dialog-error" id="payment-error" role="alert"></p>' +
    '<button class="primary full" type="submit">' + (offline ? 'Guardar pedido pendiente' : 'Confirmar pago simulado') + icon('arrow', 18) +
    '</button></form>', trigger);
}

function openGuide(trigger) {
  openDialog('<div class="dialog-header"><div><p class="eyebrow">DEMO OPERATIVA</p><h2 id="dialog-title">Guía de la demo</h2>' +
    '<p>Prueba la operación de la sucursal piloto.</p></div><button class="icon-button" type="button" data-close aria-label="Cerrar">' + icon('close') +
    '</button></div><ol class="guide-list"><li><strong>Caja</strong>Agrega 2 Combos Express y cobra Q90.00.</li>' +
    '<li><strong>Cocina</strong>Busca el número del ticket y entrega el pedido.</li><li><strong>Inventario</strong>Verifica la salida de 4 piezas de pollo.</li>' +
    '<li><strong>Gerencia</strong>Comprueba la venta y filtra por sucursal.</li><li><strong>Contingencia</strong>Simula una desconexión, registra otro pedido y restablece la conexión.</li>' +
    '</ol><p class="dialog-note">Usa otra pestaña del mismo navegador para ver cocina en paralelo.</p><button class="primary full" data-close>Entendido</button>', trigger);
}

navigation.innerHTML = pages.map(item => '<a href="#' + item.id + '">' + icon(item.icon) + '<span>' + item.title + '</span></a>').join('');
document.querySelector('#branch-icon').innerHTML = icon('branch', 18);
branchPicker.innerHTML = branches.map(item => '<option value="' + item.id + '">' + item.name + '</option>').join('');
document.querySelector('#guide').innerHTML = icon('guide', 18) + '<span>Guía de la demo</span>';
document.querySelector('#reset').innerHTML = icon('refresh', 18) + '<span>Reiniciar demo</span>';

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  workspace.focus();
  workspace.scrollIntoView();
});

window.addEventListener('hashchange', () => {
  if (!state) return;
  render();
  workspace.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});

branchPicker.addEventListener('change', () => {
  branch = branches.find(item => item.id === branchPicker.value);
  const url = new URL(location.href);
  url.searchParams.set('sucursal', branch.id);
  history.replaceState(null, '', url);
  if (state) render();
});

connection.addEventListener('click', async () => {
  connection.disabled = true;
  const current = branch.id;
  try {
    const result = await mutate(next => toggleConnection(next, current));
    const restored = result.synced === 1 ? '1 pedido sincronizado.' : result.synced + ' pedidos sincronizados.';
    showNotice(result.offline ? 'Contingencia simulada activa.' : 'Conexión restablecida. ' + restored);
  } catch {
    showNotice('No se pudo cambiar la conexión. Intenta de nuevo.');
  } finally {
    connection.disabled = false;
  }
});

document.querySelector('#guide').addEventListener('click', event => openGuide(event.currentTarget));
document.querySelector('#reset').addEventListener('click', event => {
  openDialog('<div class="dialog-header"><div><p class="eyebrow">DATOS DE DEMOSTRACIÓN</p><h2 id="dialog-title">Reiniciar demo</h2>' +
    '<p>Se borrarán las ventas de prueba y se restaurará el inventario inicial en ambas sucursales.</p></div></div>' +
    '<div class="dialog-actions"><button class="quiet-button" data-close>Cancelar</button><button class="primary" data-reset>Reiniciar demo</button></div>', event.currentTarget);
});

workspace.addEventListener('input', event => {
  if (event.target.id !== 'product-search') return;
  query = event.target.value;
  updateCatalog();
});

workspace.addEventListener('change', event => {
  if (event.target.name === 'type') draft().type = event.target.value;
  if (event.target.id === 'report-filter') {
    orderFilter = event.target.value;
    render();
  }
});

workspace.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { add, minus, category: filter, advance, stage, ticket } = button.dataset;
  if (add || minus) {
    changeQuantity(add ?? minus, add ? 1 : -1);
    if (add) showNotice(menu.find(product => product.id === add).name + ' agregado.');
  }
  if (filter) {
    category = filter;
    for (const option of workspace.querySelectorAll('[data-category]')) {
      option.setAttribute('aria-pressed', String(option.dataset.category === category));
    }
    updateCatalog();
  }
  if (button.id === 'checkout') openCheckout(button);
  if (ticket) {
    const order = state.orders.find(item => item.id === ticket);
    if (order) openDialog(receiptDialog(order), button);
  }
  if (advance) {
    button.disabled = true;
    try {
      const changed = await mutate(next => advanceOrder(next, advance, Number(stage)));
      const order = state.orders.find(item => item.id === advance);
      showNotice(changed ? 'Orden ' + ticketNumber(order) + ' actualizada.' : 'El estado del pedido ya cambió.');
      workspace.querySelector('[data-advance="' + advance + '"]')?.focus();
    } catch {
      button.disabled = false;
      showNotice('No se pudo cambiar el estado. Intenta de nuevo.');
    }
  }
});

dialog.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-close') && !submitting) dialog.close();
  if (!button.hasAttribute('data-reset')) return;
  button.disabled = true;
  try {
    await mutate(next => Object.assign(next, seed()));
    if (dialog.open) dialog.close();
    showNotice('Demo reiniciada. Inventario y ventas restaurados.');
  } catch {
    button.disabled = false;
    showNotice('No se pudo reiniciar la demo. Intenta de nuevo.');
  }
});

dialog.addEventListener('cancel', event => {
  if (submitting) event.preventDefault();
});

dialog.addEventListener('close', () => {
  if (dialog.open) return;
  if (dialogTrigger?.isConnected) dialogTrigger.focus();
  else (workspace.querySelector('.recent, [data-add]:enabled') ?? workspace).focus({ preventScroll: true });
});

dialog.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id !== 'payment-form' || submitting) return;
  const form = event.target;
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('#payment-error');
  const sale = { ...request, payment: new FormData(form).get('payment') };
  submitting = true;
  submit.disabled = true;
  error.textContent = '';
  try {
    const order = await mutate(next => placeOrder(next, sale));
    stateByBranch.get(sale.branch).cart = [];
    if (page().id === 'caja') updateCart();
    openDialog(receiptDialog(order));
  } catch (failure) {
    error.textContent = failure.message;
    submit.disabled = false;
  } finally {
    submitting = false;
  }
});

try {
  useState(await openState());
  watchState(useState);
} catch {
  workspace.innerHTML = '<div class="empty"><strong>No se pudo iniciar la demo</strong><p>Ábrela desde su URL o con el servidor local y permite el almacenamiento del navegador.</p></div>';
}
