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

/* ---- FAQ — accordion ---- */
window.toggleFaq = function (btn) {
  const item = btn.parentElement;
  item.classList.toggle('aberto');
};

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

/* ---- FORMULÁRIO DE LEADS (qualificador de franqueado) ---- */
const form  = document.getElementById('lp-lead-form');
const btn   = document.getElementById('lp-form-btn');
const msgEl = document.getElementById('lp-form-msg');

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

    const nome         = document.getElementById('lp-nome').value.trim();
    const whatsapp     = document.getElementById('lp-whatsapp').value.trim();
    const email        = document.getElementById('lp-email').value.trim();
    const cidade       = document.getElementById('lp-cidade').value.trim();
    const capital      = document.getElementById('lp-capital').value;
    const operacao     = document.getElementById('lp-operacao').value;
    const mesmaCidade  = document.getElementById('lp-mesma-cidade').value;

    if (!nome || !whatsapp || !email || !cidade || !capital || !operacao || !mesmaCidade) {
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
        capital,
        operacao,
        mesmaCidade,
        origem: 'landing_franquia',
        criadoEm: serverTimestamp(),
      });

      form.reset();
      abrirModal();

      // Dispara evento no GTM — use isso como gatilho de "Evento personalizado"
      // pra acionar Meta Pixel, Google Ads etc. só quando o lead é enviado.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'lead_formulario_franquia',
        lead_cidade: cidade,
        lead_capital: capital,
      });
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      mostrarMsg('Não foi possível enviar agora. Tente novamente em instantes.', 'erro');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Quero abrir minha franquia';
    }
  });
}

/* ---- FORMATOS — seletor interativo ---- */
const formatoDados = {
  uno: { nome: 'UNO', estrutura: '1 container', area: '~30 m²', frase: 'O ponto de entrada ideal pra testar o modelo, com o menor investimento e a estrutura mais compacta.', img: 'assets/images/uno.png' },
  duo: { nome: 'DUO', estrutura: '2 containers', area: '~60 m²', frase: 'Dobro de capacidade e mais potencial de atendimento, mantendo a operação enxuta.', img: 'assets/images/duo.png' },
  triple: { nome: 'TRIPLE', estrutura: '3 containers', area: '~90 m²', frase: 'Equilíbrio entre porte e investimento, pensado pra praças com mais demanda.', img: 'assets/images/triple.png' },
  prime: { nome: 'PRIME', estrutura: '4 containers', area: '~120 m²', frase: 'Estrutura robusta pra regiões com maior potencial de alunos e ticket médio.', img: 'assets/images/prime.png' },
  elite: { nome: 'ELITE', estrutura: '5 containers', area: '~150 m²', frase: 'O topo da linha — estrutura completa pra quem quer entrar grande na rede.', img: 'assets/images/elite.png' },
};

function trocarFormato(chave) {
  const dados = formatoDados[chave];
  if (!dados) return;

  document.getElementById('formato-nome').textContent = dados.nome;
  document.getElementById('formato-frase').textContent = dados.frase;
  document.getElementById('formato-estrutura').textContent = dados.estrutura;
  document.getElementById('formato-area').textContent = dados.area;

  const img = document.getElementById('formato-img-atual');
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = dados.img;
    img.style.opacity = '1';
  }, 200);

  document.querySelectorAll('.formato-nav-item').forEach((btn) => {
    btn.classList.toggle('ativo', btn.dataset.formato === chave);
  });
}

document.querySelectorAll('.formato-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => trocarFormato(btn.dataset.formato));
});

/* ---- NAV — menu hamburguer mobile ---- */
const navToggle = document.getElementById('lp-nav-toggle');
const navLinks = document.getElementById('lp-nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const aberto = navLinks.classList.toggle('aberto');
    navToggle.classList.toggle('aberto', aberto);
    navToggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('aberto');
      navToggle.classList.remove('aberto');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}