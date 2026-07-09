/* =============================================
   SCRIPT PRINCIPAL — Duo Fitness Site Oficial
   ============================================= */


   /* ---- HERO MOBILE — troca imagem ---- */
if (window.innerWidth <= 768) {
  const heroImg = document.querySelector('#hero-imagem img');
  if (heroImg) heroImg.src = 'assets/images/Hero_sem_fundo.png';
}


   /* ---- SCROLL AO TOPO AO CARREGAR ---- */
window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---- HERO — efeito zoom out ao scrollar ---- */
const heroImg = document.querySelector('#hero-imagem img');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const heroH   = document.getElementById('hero').offsetHeight;
  const progress = Math.min(scrollY / heroH, 1);
  const scale    = 1 - (progress * 0.08); // zoom out sutil: 1 → 0.92
  if (heroImg) heroImg.style.transform = `scale(${scale})`;
});
/* ---- CONCEITO — expandir imagem ao clicar ---- */
const conceitoImagem  = document.getElementById('conceito-imagem');
const conceitoFechar  = document.getElementById('conceito-fechar');
const conceito        = document.getElementById('conceito');
const conceitoImpacto = document.getElementById('conceito-impacto');
const conceitoConteudo = document.querySelectorAll('#conceito-texto h2, #conceito-texto .subtitulo, #conceito-texto .btn-conceito');

function esconderTextoEsquerdo() {
  conceitoConteudo.forEach(el => {
    el.style.transition = 'opacity 0.15s ease';
    el.style.opacity = '0';
  });
}

function mostrarTextoEsquerdo() {
  conceitoConteudo.forEach(el => {
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '1';
  });
  setTimeout(() => {
    conceitoConteudo.forEach(el => {
      el.style.transition = '';
      el.style.opacity = '';
    });
  }, 400);
}

if (conceitoImagem && conceitoFechar && conceito && window.innerWidth > 768) {
  conceitoImagem.addEventListener('click', () => {
    if (conceito.classList.contains('imagem-expandida')) return;
    esconderTextoEsquerdo();
    setTimeout(() => {
      conceito.classList.add('imagem-expandida');
      conceitoFechar.classList.add('visivel');
      document.body.style.overflow = 'hidden';
    }, 150);
  });

  conceitoFechar.addEventListener('click', () => {
    if (conceitoImpacto) {
      conceitoImpacto.style.transition = 'opacity 0.1s ease';
      conceitoImpacto.style.opacity = '0';
    }

    // No mobile, remove fixed antes de recolher
    if (window.innerWidth <= 768) {
      conceitoImagem.style.transition = 'opacity 0.3s ease';
      conceitoImagem.style.opacity = '0';
      setTimeout(() => {
        conceito.classList.remove('imagem-expandida');
        conceitoFechar.classList.remove('visivel');
        document.body.style.overflow = '';
        conceitoImagem.style.transition = '';
        conceitoImagem.style.opacity = '';
        if (conceitoImpacto) {
          conceitoImpacto.style.transition = '';
          conceitoImpacto.style.opacity = '';
        }
        setTimeout(() => mostrarTextoEsquerdo(), 200);
      }, 300);
    } else {
      setTimeout(() => {
        conceito.classList.remove('imagem-expandida');
        conceitoFechar.classList.remove('visivel');
        document.body.style.overflow = '';
        if (conceitoImpacto) {
          conceitoImpacto.style.transition = '';
          conceitoImpacto.style.opacity = '';
        }
        setTimeout(() => mostrarTextoEsquerdo(), 450);
      }, 100);
    }
  });
}

/* ---- GALERIA MOBILE — troca imagens ---- */
if (window.innerWidth <= 768) {
  const galeriaMobileImgs = {
    0: 'assets/images/mobile/mobile_1.png',
    1: 'assets/images/mobile/mobile_4.png',
  };
  document.querySelectorAll('.galeria-item').forEach(item => {
    const idx = item.dataset.index;
    if (galeriaMobileImgs[idx]) {
      const img = item.querySelector('img');
      if (img) img.src = galeriaMobileImgs[idx];
    }
  });
}

/* ---- GALERIA MOBILE — dots de progresso ---- */
if (window.innerWidth <= 768) {
  const galeriaScroll = document.getElementById('galeria');
  const dots = document.querySelectorAll('.galeria-dot');

  if (galeriaScroll && dots.length) {
    galeriaScroll.addEventListener('scroll', () => {
      const itemWidth = galeriaScroll.querySelector('.galeria-item').offsetWidth + 12; // 12 = gap
      const index = Math.round(galeriaScroll.scrollLeft / itemWidth);
      dots.forEach((dot, i) => dot.classList.toggle('ativo', i === index));
    });
  }
}

/* ---- COMBOS MOBILE — imagem inicial ---- */
if (window.innerWidth <= 768) {
  const comboImgInicial = document.getElementById('combo-img-atual');
  if (comboImgInicial) comboImgInicial.src = 'assets/images/mobile/mobile_uno.png';
}

/* ---- GALERIA ---- */
const galeria       = document.getElementById('galeria');
const galeriaItems  = document.querySelectorAll('.galeria-item');
const galeriaFechar = document.getElementById('galeria-fechar');
let galeriaAberta   = null;



galeriaItems.forEach(item => {
  item.addEventListener('click', () => {
    const index = item.dataset.index;
    if (galeriaAberta === index) return;

    if (galeriaAberta !== null) {
      galeria.classList.remove(`expandida-${galeriaAberta}`);
    }

    galeriaAberta = index;
    galeria.classList.add(`expandida-${index}`);
    galeriaFechar.classList.add('visivel');
    document.body.style.overflow = 'hidden';
  });
});

if (galeriaFechar) {
  galeriaFechar.addEventListener('click', () => {
    if (galeriaAberta !== null) {
      galeria.classList.remove(`expandida-${galeriaAberta}`);
      galeriaAberta = null;
    }
    galeriaFechar.classList.remove('visivel');
    document.body.style.overflow = '';
  });
}

/* ---- COMBOS ---- */
const comboDados = {
  uno: {
    frase: '<em>O começo de tudo.</em> Completo do jeito certo.',
    categorias: [
      { nome: 'Cardio', itens: ['Esteira ×1', 'Bike ×1'] },
      { nome: 'Força', itens: ['Estação Multifuncional ×1'] },
      { nome: 'Bancos', itens: ['Banco Multi Posições ×2'] },
      { nome: 'Pesos Livres', itens: ['Anilha 10kg ×10', 'Barra W ×1', 'Halter 10kg ×11'] },
      { nome: 'Armazenamento', itens: ['Suporte para Barras ×1', 'Suporte para Halteres ×1'] },
      { nome: 'Puxadores', itens: ['Puxador Reto ×1', 'Corda ×1', 'Romano ×1', 'Tornozelo ×1', 'Triângulo ×1'] },
      { nome: 'Acessórios', itens: ['Step Light ×2', 'Colchonete ×2'] },
    ],
    img: 'assets/images/desktop_uno.png',
    medidas: '12.9m x 2.44m — 29.74m²',
    usuarios: 'Até 22 usuários simultâneos',
  },
  duo: {
    frase: '<em>Dobro de estrutura.</em> Dobro de resultado.',
    categorias: [
      { nome: 'Cardio', itens: ['Esteira ×2', 'Bike ×1', 'Bike Spinning ×1'] },
      { nome: 'Força', itens: ['Cross com Smith ×1', 'Cadeira Adutora/Abdutora ×1', 'Cadeira Flexora/Extensora ×1'] },
      { nome: 'Bancos', itens: ['Banco Multi Posições ×2', 'Banco Supino ×1'] },
      { nome: 'Pesos Livres', itens: ['Anilha 10kg ×10', 'Barra W ×1', 'Halter 10kg ×11'] },
      { nome: 'Armazenamento', itens: ['Suporte para Barras ×1', 'Suporte para Halteres ×1'] },
      { nome: 'Puxadores', itens: ['Puxador Reto ×1', 'Corda ×1', 'Romano ×1', 'Tornozelo ×1', 'Triângulo ×1'] },
      { nome: 'Acessórios', itens: ['Step Light ×2', 'Colchonete ×2'] },
    ],
    img: 'assets/images/desktop_duo.png',
    medidas: '12.9m x 4.88m — 59.49m²',
    usuarios: 'Até 29 usuários simultâneos',
  },
  triple: {
    frase: 'Para condomínios que levam o <em>bem-estar a sério.</em>',
    categorias: [
      { nome: 'Cardio', itens: ['Esteira ×3', 'Bike ×1', 'Bike Spinning ×1', 'Elíptico ×1'] },
      { nome: 'Força', itens: ['Cross com Smith ×1', 'Leg Press ×1', 'Peitoral Dorsal ×1', 'Cadeira Adutora/Abdutora ×1', 'Cadeira Flexora/Extensora ×1', 'Pulley com Remada ×1'] },
      { nome: 'Bancos', itens: ['Banco Multi Posições ×2', 'Banco Supino ×1'] },
      { nome: 'Pesos Livres', itens: ['Anilha 10kg ×10', 'Barra W ×1', 'Halter 10kg ×11'] },
      { nome: 'Armazenamento', itens: ['Suporte para Barras ×1', 'Suporte para Halteres ×1'] },
      { nome: 'Puxadores', itens: ['Puxador Reto ×1', 'Corda ×1', 'Romano ×1', 'Tornozelo ×1', 'Triângulo ×1'] },
      { nome: 'Acessórios', itens: ['Step Light ×2', 'Colchonete ×2'] },
    ],
    img: 'assets/images/desktop_triple.png',
    medidas: '12.19m x 7.32m — 89.23m²',
    usuarios: 'Até 35 usuários simultâneos',
  },
  prime: {
    frase: '<em>Experiência premium.</em> Sem sair de casa.',
    categorias: [
      { nome: 'Cardio', itens: ['Esteira ×4', 'Bike ×1', 'Bike Spinning ×1', 'Elíptico ×1'] },
      { nome: 'Força', itens: ['Cross Angular ×1', 'Cross com Smith ×1', 'Glúteo Máximo ×1', 'Leg Press ×1', 'Peitoral Dorsal ×1', 'Cadeira Adutora/Abdutora ×1', 'Cadeira Flexora/Extensora ×1', 'Pulley com Remada ×1'] },
      { nome: 'Bancos', itens: ['Banco Multi Posições ×2', 'Banco Supino ×1'] },
      { nome: 'Pesos Livres', itens: ['Anilha 10kg ×10', 'Barra W ×1', 'Halter 10kg ×11'] },
      { nome: 'Armazenamento', itens: ['Suporte para Barras ×1', 'Suporte para Halteres ×1'] },
      { nome: 'Puxadores', itens: ['Puxador Reto ×1', 'Corda ×1', 'Romano ×1', 'Tornozelo ×1', 'Triângulo ×1'] },
      { nome: 'Acessórios', itens: ['Step Light ×2', 'Colchonete ×2'] },
    ],
    img: 'assets/images/desktop_prime.png',
    medidas: '12.19m x 9.76m — 118.97m²',
    usuarios: 'Até 51 usuários simultâneos',
  },
  elite: {
    frase: '<em>O topo.</em> Sem concessões.',
    categorias: [
      { nome: 'Cardio', itens: ['Esteira ×4', 'Bike KR9.6 ×1', 'Bike ×1', 'Bike Spinning ×1', 'Elíptico ×1', 'Escada Profissional ×1'] },
      { nome: 'Força', itens: ['Cross Angular ×1', 'Cross com Smith ×1', 'Elevação Pélvica ×1', 'Glúteo Máximo ×1', 'Leg Press ×1', 'Peitoral Dorsal ×1', 'Desenvolvimento ×1', 'Puxada Alta/Supino ×1', 'Cadeira Adutora/Abdutora ×1', 'Cadeira Flexora/Extensora ×1', 'Pulley com Remada ×1'] },
      { nome: 'Bancos', itens: ['Banco Multi Posições ×2', 'Banco Supino ×1'] },
      { nome: 'Pesos Livres', itens: ['Anilha 10kg ×30', 'Barra W ×1', 'Halter 10kg ×11', 'Dumbell 14kg ×2', 'Dumbell 18kg ×2', 'Dumbell 22kg ×2', 'Dumbell 26kg ×2', 'Dumbell 30kg ×2'] },
      { nome: 'Armazenamento', itens: ['Suporte para Barras ×1', 'Suporte para Halteres ×1', 'Rack de Dumbell ×1'] },
      { nome: 'Puxadores', itens: ['Puxador Reto ×1', 'Corda ×1', 'Romano ×1', 'Tornozelo ×1', 'Triângulo ×1'] },
      { nome: 'Acessórios', itens: ['Step Light ×2', 'Colchonete ×2'] },
    ],
    img: 'assets/images/desktop_elite.png',
    medidas: '12.19m x 12.20m — 148.72m²',
    usuarios: 'Até 67 usuários simultâneos',
  },
};
const comboNavItems  = document.querySelectorAll('.combo-nav-item');
const comboFrase     = document.getElementById('combo-ativo-frase');
const comboEquip     = document.getElementById('combo-ativo-equip');
const comboBtn       = document.getElementById('combo-ativo-btn');
const comboImgAtual  = document.getElementById('combo-img-atual');
const comboImgProx   = document.getElementById('combo-img-prox');
const comboMedidas   = document.getElementById('combo-planta-medidas');
const comboUsuarios  = document.getElementById('combo-planta-usuarios');
const comboInfo      = document.getElementById('combo-ativo-info');
const comboPlanta    = document.getElementById('combo-planta-card');
let comboAtivo       = 'uno';
let trocando         = false;

const comboImgsMobile = {
  uno: 'assets/images/mobile/mobile_uno.png',
  duo: 'assets/images/mobile/mobile_duo.png',
  triple: 'assets/images/mobile/mobile_triple.png',
  prime: 'assets/images/mobile/mobile_prime.png',
  elite: 'assets/images/mobile/mobile_elite.png',
};

function trocarCombo(novoCombo) {
  if (novoCombo === comboAtivo || trocando) return;
  trocando = true;

  const dados = comboDados[novoCombo];
  const imgCombo = (window.innerWidth <= 768 && comboImgsMobile[novoCombo])
    ? comboImgsMobile[novoCombo]
    : dados.img;
  const combosEl = document.getElementById('combos');

  // Fade out conteúdo
  comboInfo.classList.add('trocando');
  comboPlanta.classList.add('trocando');

  // Crossfade imagem
  comboImgProx.src = imgCombo;
  comboImgProx.style.opacity = '0';
  comboImgProx.onload = () => {
    comboImgAtual.style.opacity = '0';
    comboImgProx.style.opacity = '1';
    setTimeout(() => {
      comboImgAtual.src = imgCombo;
      comboImgAtual.style.opacity = '1';
      comboImgProx.style.opacity = '0';
    }, 500);
  };

  // Atualizar nav
  comboNavItems.forEach(item => {
    item.classList.toggle('ativo', item.dataset.combo === novoCombo);
  });

  // Elite — fundo amarelo
  if (novoCombo === 'elite') {
    combosEl.classList.add('combo-elite-ativo');
  } else {
    combosEl.classList.remove('combo-elite-ativo');
  }

  // Atualizar conteúdo após fade out
  setTimeout(() => {
    comboFrase.innerHTML = dados.frase;
    comboBtn.href = 'https://www.instagram.com/duofitness.ofc/';
    comboMedidas.textContent = dados.medidas;
    comboUsuarios.textContent = dados.usuarios;

 comboEquip.innerHTML = dados.categorias.map((cat) => `
  <li class="accordion-item">
    <button class="accordion-header" onclick="toggleAccordion(this)">
      <span>${cat.nome}</span>
      <span class="accordion-icon">›</span>
    </button>
    <ul class="accordion-body">
      ${cat.itens.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </li>
`).join('');

    comboInfo.classList.remove('trocando');
    comboPlanta.classList.remove('trocando');
    comboAtivo = novoCombo;
    trocando = false;
  }, 300);
}

comboNavItems.forEach(item => {
  item.addEventListener('click', () => trocarCombo(item.dataset.combo));
});

/* ---- CTA ----------------------------------- */

/* ---- ANIMAÇÕES DE SCROLL (Intersection Observer) */
const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('reveal-visible');
      }, i * 150);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => observer.observe(el));

/* ---- ACCORDION EQUIPAMENTOS ---- */
function toggleAccordion(btn) {
  const item = btn.parentElement;
  item.classList.toggle('aberto');
}