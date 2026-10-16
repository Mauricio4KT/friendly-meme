import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js";
import { collection, getDocs, getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";
import { firebaseApp } from "./firebase-client.js";
import "./theme.js";

const productGrid = document.getElementById('productGrid');
const catalogMsg = document.getElementById('catalogMsg');
const categoryFilter = document.getElementById('categoryFilter');
const productSort = document.getElementById('productSort');
const cartCount = document.getElementById('cartCount');
const cartMsg = document.getElementById('cartMsg');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const receipt = document.getElementById('receipt');
const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const io = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    io.unobserve(entry.target);
  }
}), { threshold: .15 });
let products = [];
let cart = [];
let pdfGeneratorPromise;
let activeOrder;
const appCheckSiteKey = document.querySelector('meta[name="firebase-app-check-site-key"]')?.content.trim();
let createOrderCallable;

if (appCheckSiteKey) {
  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    createOrderCallable = httpsCallable(getFunctions(firebaseApp, 'us-central1'), 'createOrder');
  } catch (error) {
    console.error('No se pudo inicializar App Check para proteger la tienda:', error);
  }
}
const db = getFirestore(firebaseApp);

const getPublishedTime = product => product.publicadoEn?.toMillis?.() ?? 0;

const loadPdfGenerator = () => {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (pdfGeneratorPromise) return pdfGeneratorPromise;

  pdfGeneratorPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('La biblioteca de PDF se cargó, pero no quedó disponible.'));
    };
    script.onerror = () => reject(new Error('No se pudo descargar la biblioteca para generar el PDF.'));
    document.head.append(script);
  });

  pdfGeneratorPromise.catch(() => {
    pdfGeneratorPromise = undefined;
  });
  return pdfGeneratorPromise;
};

const renderCart = () => {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.product.precio * item.quantity, 0);
  cartCount.textContent = String(count);
  cartItems.replaceChildren();
  cartTotal.textContent = count ? `Total de productos: ${copFormatter.format(total)}` : '';
  cartMsg.textContent = count ? `${count} producto${count === 1 ? '' : 's'} en tu carrito.` : 'Tu carrito está vacío.';
  checkoutForm.classList.toggle('hidden', count === 0);
  receipt.classList.add('hidden');

  cart.forEach(({ product, quantity }) => {
    const row = document.createElement('div');
    row.className = 'py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3';

    const details = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'font-medium';
    name.textContent = product.nombre;
    const price = document.createElement('p');
    price.className = 'text-sm text-tinta/65';
    price.textContent = `${copFormatter.format(product.precio)} c/u`;
    details.append(name, price);

    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-2';
    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.className = 'btn btn-line !py-1 !px-3';
    decrease.textContent = '-';
    decrease.setAttribute('aria-label', `Quitar una unidad de ${product.nombre}`);
    decrease.dataset.cartAction = 'decrease';
    decrease.dataset.productId = product.id;
    const quantityLabel = document.createElement('span');
    quantityLabel.className = 'min-w-6 text-center';
    quantityLabel.textContent = String(quantity);
    const increase = document.createElement('button');
    increase.type = 'button';
    increase.className = 'btn btn-line !py-1 !px-3';
    increase.textContent = '+';
    increase.setAttribute('aria-label', `Agregar una unidad de ${product.nombre}`);
    increase.dataset.cartAction = 'increase';
    increase.dataset.productId = product.id;
    const subtotal = document.createElement('span');
    subtotal.className = 'sm:ml-4 min-w-24 text-right font-medium';
    subtotal.textContent = copFormatter.format(product.precio * quantity);
    controls.append(decrease, quantityLabel, increase, subtotal);
    row.append(details, controls);
    cartItems.append(row);
  });
};

const renderProducts = () => {
  const selectedCategory = categoryFilter.value;
  const sortOrder = productSort.value;
  const visibleProducts = products
    .filter(product => selectedCategory === 'all' || product.categoria === selectedCategory)
    .sort((a, b) => {
      if (sortOrder === 'price-asc') return a.precio - b.precio || a.nombre.localeCompare(b.nombre, 'es');
      if (sortOrder === 'alphabetical') return a.nombre.localeCompare(b.nombre, 'es');
      return getPublishedTime(b) - getPublishedTime(a) || a.nombre.localeCompare(b.nombre, 'es');
    });

  productGrid.replaceChildren();
  visibleProducts.forEach(product => {
    const card = document.createElement('article');
    card.className = 'gold-card rounded-2xl p-5 reveal flex flex-col min-h-40';

    const category = document.createElement('p');
    category.className = 'text-xs uppercase tracking-widest text-rosaoro';
    category.textContent = product.categoria;

    const name = document.createElement('h2');
    name.className = 'font-serif text-xl leading-snug mt-2 flex-1';
    name.textContent = product.nombre;

    const price = document.createElement('p');
    price.className = 'mt-4 pt-3 border-t border-oro/30 text-rosaoro font-medium';
    price.textContent = copFormatter.format(product.precio);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn btn-gold w-full mt-4';
    addButton.textContent = 'Agregar al carrito';
    addButton.setAttribute('aria-label', `Agregar ${product.nombre} al carrito`);
    addButton.dataset.cartAction = 'add';
    addButton.dataset.productId = product.id;

    card.append(category, name, price, addButton);
    productGrid.append(card);
    io.observe(card);
  });

  catalogMsg.textContent = visibleProducts.length
    ? `${visibleProducts.length} productos ${selectedCategory === 'all' ? 'disponibles' : `en ${selectedCategory}`}.`
    : 'No hay productos en esta categoría.';
};

const loadProducts = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'productos'));
    if (!snapshot.empty) {
      products = snapshot.docs.map(productDoc => ({ id: productDoc.id, ...productDoc.data() }));
      renderProducts();
      return;
    }
    catalogMsg.textContent = 'Cargando catálogo del sitio...';
  } catch (error) {
    console.warn('No se pudo leer el catálogo de Firestore; se intentará mostrar el catálogo incluido en el sitio.', error);
  }

  try {
    const response = await fetch('./productos.json');
    if (!response.ok) throw new Error(`Error HTTP ${response.status} al cargar productos.json`);
    products = await response.json();
    if (!Array.isArray(products) || !products.every(product =>
      typeof product.nombre === 'string' &&
      typeof product.categoria === 'string' &&
      Number.isFinite(product.precio)
    )) {
      throw new Error('El archivo productos.json no tiene el formato esperado.');
    }
    renderProducts();
    catalogMsg.textContent = `${products.length} productos disponibles. Catálogo del sitio; pendiente de cargar en Firestore.`;
  } catch (error) {
    console.error('No se pudo cargar el catálogo local de productos:', error);
    catalogMsg.textContent = 'No se pudo cargar el catálogo. Revisa la conexión y vuelve a intentarlo.';
  }
};

productGrid.addEventListener('click', event => {
  const button = event.target.closest('button[data-cart-action="add"]');
  if (!button) return;
  const product = products.find(item => item.id === button.dataset.productId);
  if (!product) {
    console.error('No se encontró el producto seleccionado en el catálogo.');
    return;
  }
  const cartItem = cart.find(item => item.product.id === product.id);
  if (cartItem) cartItem.quantity = Math.min(cartItem.quantity + 1, 99);
  else cart.push({ product, quantity: 1 });
  renderCart();
  cartMsg.textContent = `${product.nombre} se agregó al carrito.`;
});

cartItems.addEventListener('click', event => {
  const button = event.target.closest('button[data-cart-action]');
  if (!button) return;
  const itemIndex = cart.findIndex(item => item.product.id === button.dataset.productId);
  if (itemIndex < 0) return;
  if (button.dataset.cartAction === 'increase') {
    cart[itemIndex].quantity = Math.min(cart[itemIndex].quantity + 1, 99);
  } else if (button.dataset.cartAction === 'decrease') {
    cart[itemIndex].quantity -= 1;
    if (cart[itemIndex].quantity === 0) cart.splice(itemIndex, 1);
  }
  renderCart();
});

checkoutForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!checkoutForm.reportValidity() || !cart.length) return;

  const orderStatus = document.getElementById('orderStatus');
  if (!createOrderCallable) {
    orderStatus.textContent = 'La tienda todavía no tiene configurada la clave pública de App Check. No se creó el pedido.';
    return;
  }

  const customer = Object.fromEntries(new FormData(checkoutForm));
  const submitButton = document.getElementById('prepareOrder');
  submitButton.disabled = true;
  orderStatus.textContent = 'Guardando tu pedido de forma segura...';

  try {
    const response = await createOrderCallable({
      customer: {
        name: customer.nombre,
        phone: customer.telefono
      },
      delivery: {
        city: customer.ciudad,
        address: customer.direccion,
        notes: customer.indicaciones || ''
      },
      paymentMethod: customer.metodoPago,
      items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity }))
    });
    activeOrder = response.data;
    renderOrderReceipt(activeOrder);
    orderStatus.textContent = '';
    receipt.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('No se pudo guardar el pedido en Firestore:', error);
    orderStatus.textContent = error.code === 'functions/failed-precondition'
      ? 'No se pudo verificar la seguridad de la tienda. Intenta de nuevo o contáctanos por WhatsApp.'
      : error.code === 'functions/not-found'
        ? 'Uno de los productos ya no está disponible. Actualiza la tienda e inténtalo otra vez.'
        : 'No se pudo guardar el pedido. Revisa tu conexión e inténtalo otra vez.';
  } finally {
    submitButton.disabled = false;
  }
});

const renderOrderReceipt = order => {
  const putText = (id, value) => {
    document.getElementById(id).textContent = value;
  };

  putText('receiptOrderNumber', `Pedido ${order.orderNumber} · ${new Date(order.createdAt).toLocaleString('es-CO')}`);
  putText('receiptName', order.customer.name);
  putText('receiptPhone', order.customer.phone);
  putText('receiptAddress', `${order.delivery.address}, ${order.delivery.city}`);
  putText('receiptPayment', order.payment.method);
  putText('receiptNotes', order.delivery.notes || '');
  document.getElementById('receiptNotesRow').classList.toggle('hidden', !order.delivery.notes);

  const receiptItems = document.getElementById('receiptItems');
  receiptItems.replaceChildren();
  order.items.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'border-b border-oro/15';
    [item.nombre, String(item.cantidad), copFormatter.format(item.precio), copFormatter.format(item.subtotal)]
      .forEach((value, index) => {
        const cell = document.createElement('td');
        cell.className = `py-3 ${index === 0 ? 'pr-3' : index === 1 ? 'px-3 text-center' : index === 2 ? 'px-3 text-right' : 'pl-3 text-right'}`;
        cell.textContent = value;
        row.append(cell);
      });
    receiptItems.append(row);
  });

  putText('receiptTotal', copFormatter.format(order.subtotal));
  receipt.classList.remove('hidden');
};

document.getElementById('editOrder').addEventListener('click', () => {
  receipt.classList.add('hidden');
  checkoutForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
const downloadReceiptButton = document.getElementById('downloadReceipt');
const pdfStatus = document.getElementById('pdfStatus');
downloadReceiptButton.addEventListener('click', async () => {
  downloadReceiptButton.disabled = true;
  pdfStatus.textContent = 'Preparando tu comprobante en PDF...';
  try {
    const jsPDF = await loadPdfGenerator();
    if (!activeOrder) throw new Error('No hay un pedido guardado para generar el comprobante.');
    const orderReference = activeOrder.orderNumber;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const gold = [184, 144, 42];
    const ink = [44, 44, 44];
    let y = 0;

    const drawTableHeader = () => {
      pdf.setFillColor(249, 246, 240);
      pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...ink);
      pdf.text('Producto', margin + 3, y + 6.5);
      pdf.text('Cant.', margin + 112, y + 6.5, { align: 'center' });
      pdf.text('Precio', margin + 143, y + 6.5, { align: 'right' });
      pdf.text('Subtotal', pageWidth - margin - 3, y + 6.5, { align: 'right' });
      y += 12;
    };

    const ensurePageSpace = requiredHeight => {
      if (y + requiredHeight <= pageHeight - 18) return;
      pdf.addPage();
      y = 18;
      drawTableHeader();
    };

    const drawParagraph = (text, options = {}) => {
      const x = options.x ?? margin;
      const width = options.width ?? contentWidth;
      const fontSize = options.fontSize ?? 9;
      const lineHeight = options.lineHeight ?? 4.5;
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, width);
      ensurePageSpace(lines.length * lineHeight + 2);
      pdf.text(lines, x, y);
      y += lines.length * lineHeight;
    };

    pdf.setFillColor(249, 246, 240);
    pdf.rect(0, 0, pageWidth, 49, 'F');
    pdf.setFillColor(...gold);
    pdf.rect(0, 0, pageWidth, 2, 'F');
    pdf.setTextColor(...gold);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('NoAn Beauty', margin, 17);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Belleza en cada detalle', margin, 23);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(...ink);
    pdf.text('COMPROBANTE DE COMPRA', pageWidth - margin, 16, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(document.getElementById('receiptOrderNumber').textContent, pageWidth - margin, 23, { align: 'right' });
    pdf.setFillColor(244, 217, 214);
    pdf.roundedRect(pageWidth - margin - 57, 29, 57, 8, 3, 3, 'F');
    pdf.setTextColor(92, 57, 57);
    pdf.setFontSize(8);
    pdf.text('Pendiente de verificar el pago', pageWidth - margin - 28.5, 34.3, { align: 'center' });
    y = 57;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...gold);
    pdf.text('DATOS DEL CLIENTE Y ENTREGA', margin, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...ink);
    drawParagraph(`Cliente: ${activeOrder.customer.name}`);
    drawParagraph(`Teléfono: ${activeOrder.customer.phone}`);
    drawParagraph(`Dirección: ${activeOrder.delivery.address}, ${activeOrder.delivery.city}`);
    if (activeOrder.delivery.notes) drawParagraph(`Indicaciones: ${activeOrder.delivery.notes}`);
    drawParagraph(`Método de pago: ${activeOrder.payment.method}`);
    drawParagraph('Número para pagar: 320 582 5656');
    y += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...gold);
    pdf.text('DETALLE DEL PEDIDO', margin, y);
    y += 5;
    drawTableHeader();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...ink);

    activeOrder.items.forEach(item => {
      const nameLines = pdf.splitTextToSize(item.nombre, 100);
      const rowHeight = Math.max(9, nameLines.length * 4 + 4);
      ensurePageSpace(rowHeight);
      pdf.setDrawColor(232, 215, 184);
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
      pdf.text(nameLines, margin + 3, y + 5);
      pdf.text(String(item.cantidad), margin + 112, y + 5, { align: 'center' });
      pdf.text(copFormatter.format(item.precio), margin + 143, y + 5, { align: 'right' });
      pdf.text(copFormatter.format(item.subtotal), pageWidth - margin - 3, y + 5, { align: 'right' });
      y += rowHeight;
    });

    ensurePageSpace(25);
    y += 6;
    pdf.setFillColor(249, 246, 240);
    pdf.roundedRect(pageWidth - margin - 77, y, 77, 21, 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...ink);
    pdf.text('TOTAL DE PRODUCTOS', pageWidth - margin - 4, y + 7, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...gold);
    pdf.text(copFormatter.format(activeOrder.subtotal), pageWidth - margin - 4, y + 16, { align: 'right' });
    y += 29;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...ink);
    drawParagraph('El domicilio se cotiza por separado. El pedido se confirma cuando verifiquemos el pago.');
    drawParagraph('Envía manualmente por WhatsApp una captura de este comprobante y otra del pago al +57 320 582 5656.');
    drawParagraph('Este documento es un comprobante de pedido, no una factura electrónica DIAN.', { fontSize: 7.5 });

    pdf.save(`NoAn-Beauty-${orderReference}.pdf`);
    pdfStatus.textContent = 'PDF descargado. Si no lo ves, revisa las descargas del navegador.';
  } catch (error) {
    console.error('No se pudo generar o descargar el PDF del comprobante:', error);
    pdfStatus.textContent = 'No se pudo descargar el PDF. Revisa tu conexión e inténtalo otra vez.';
  } finally {
    downloadReceiptButton.disabled = false;
  }
});

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });

const btn = document.getElementById('menuBtn');
const menu = document.getElementById('mobileMenu');
btn.addEventListener('click', () => {
  const open = menu.classList.toggle('hidden') === false;
  btn.setAttribute('aria-expanded', String(open));
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.classList.add('hidden');
  btn.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('.reveal').forEach(element => io.observe(element));
categoryFilter.addEventListener('change', renderProducts);
productSort.addEventListener('change', renderProducts);
document.getElementById('year').textContent = new Date().getFullYear();
renderCart();
loadProducts();
