import { addDoc, collection, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseApp } from "./firebase-client.js";
import "./theme.js";

const db = getFirestore(firebaseApp);

// Navbar: fondo al hacer scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive:true }); onScroll();

// Menú móvil
const btn = document.getElementById('menuBtn'), menu = document.getElementById('mobileMenu');
btn.addEventListener('click', () => {
  const open = menu.classList.toggle('hidden') === false;
  btn.setAttribute('aria-expanded', open);
  nav.classList.add('scrolled');
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.classList.add('hidden'); btn.setAttribute('aria-expanded','false'); }));

// Aparición suave al hacer scroll
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold:.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Preseleccionar servicio desde las tarjetas
document.querySelectorAll('.pick').forEach(a => a.addEventListener('click', () => { document.getElementById('servicio').value = a.dataset.servicio; }));

// Fecha mínima = hoy
const f = document.getElementById('fecha'); f.min = new Date().toISOString().split('T')[0];
document.getElementById('year').textContent = new Date().getFullYear();

// Guardar solicitudes de cita en Cloud Firestore
const form = document.getElementById('bookingForm'), msg = document.getElementById('formMsg');
const submitButton = form.querySelector('button[type="submit"]');
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.checkValidity()) { msg.textContent = 'Completa nombre, teléfono, servicio y fecha para enviar tu solicitud.'; msg.className = 'mt-4 text-center text-sm text-rosaoro'; return; }
  const d = Object.fromEntries(new FormData(form));
  submitButton.disabled = true;
  msg.textContent = 'Enviando tu solicitud...';
  msg.className = 'mt-4 text-center text-sm text-tinta';

  try {
    await addDoc(collection(db, 'appointmentRequests'), {
      nombre: d.nombre,
      telefono: d.telefono,
      fecha: d.fecha,
      servicio: d.servicio,
      mensaje: d.mensaje,
      createdAt: serverTimestamp()
    });
    msg.textContent = `¡Gracias, ${d.nombre.split(' ')[0]}! Recibimos tu solicitud de ${d.servicio} y te contactaremos pronto.`;
    form.reset();
  } catch (error) {
    console.error('No se pudo guardar la solicitud en Firestore:', error);
    msg.textContent = 'No se pudo enviar tu solicitud. Inténtalo de nuevo más tarde.';
    msg.className = 'mt-4 text-center text-sm text-rosaoro';
  } finally {
    submitButton.disabled = false;
  }
});