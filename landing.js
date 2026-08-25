/* =============================================
   FIREBASE — mesmo projeto do Simulador Duo Fitness
   ============================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ⚠️ COLE AQUI o mesmo firebaseConfig usado no auth.js do simulador
// (projectId já é "simulador-duo-fitness" — falta apiKey, messagingSenderId e appId reais)
const firebaseConfig = {
  apiKey: "AIzaSyCG6nZw4X8KVPxy_u3CFGuz1COVBPQPHlQ",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.appspot.com",
  messagingSenderId: "1029705610423",
  appId: "1:1029705610423:web:c8a26f127a89a1a7b1c932",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---- RODAPÉ — ano atual ---- */
const anoEl = document.getElementById('lp-ano');
if (anoEl) anoEl.textContent = new Date().getFullYear();

/* ---- FORMULÁRIO DE LEADS ---- */
const form    = document.getElementById('lp-lead-form');
const btn     = document.getElementById('lp-form-btn');
const msgEl   = document.getElementById('lp-form-msg');

/* ---- MODAL DE AGRADECIMENTO ---- */
const modalOverlay = document.getElementById('lp-modal-overlay');
const modalFechar   = document.getElementById('lp-modal-fechar');
const modalOk        = document.getElementById('lp-modal-ok');

function abrirModal() {
  modalOverlay.classList.add('lp-modal-visivel');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  modalOverlay.classList.remove('lp-modal-visivel');
  document.body.style.overflow = '';
}

if (modalFechar) modalFechar.addEventListener('click', fecharModal);
if (modalOk) modalOk.addEventListener('click', fecharModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharModal();
});

function validarWhatsapp(valor) {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length >= 10 && digitos.length <= 13;
}

function mostrarMsg(texto, tipo) {
  msgEl.textContent = texto;
  msgEl.className = tipo === 'sucesso' ? 'lp-sucesso' : 'lp-erro';
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarMsg('', '');

    // honeypot — se preenchido, é bot, aborta silenciosamente
    const honeypot = document.getElementById('lp-website').value;
    if (honeypot) return;

    const nome      = document.getElementById('lp-nome').value.trim();
    const whatsapp  = document.getElementById('lp-whatsapp').value.trim();
    const email     = document.getElementById('lp-email').value.trim();
    const cidade    = document.getElementById('lp-cidade').value.trim();
    const perfil    = document.getElementById('lp-perfil').value;

    if (!nome || !whatsapp || !email || !cidade || !perfil) {
      mostrarMsg('Preencha todos os campos.', 'erro');
      return;
    }

    if (!validarWhatsapp(whatsapp)) {
      mostrarMsg('Informe um WhatsApp válido, com DDD.', 'erro');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      await addDoc(collection(db, 'leads_landing'), {
        nome,
        whatsapp,
        email,
        cidade,
        perfil,
        origem: 'landing_page',
        criadoEm: serverTimestamp(),
      });

      form.reset();
      abrirModal();
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      mostrarMsg('Não foi possível enviar agora. Tente novamente em instantes.', 'erro');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  });
}
