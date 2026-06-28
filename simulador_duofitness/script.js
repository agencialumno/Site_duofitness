import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";

// ── FIREBASE STORAGE ──
const firebaseConfig = {
  apiKey: "AIzaSyCG6nZw4X8KVPxy_u3CFGuz1COVBPQPHlQ",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.firebasestorage.app",
  messagingSenderId: "1029705610423",
  appId: "1:1029705610423:web:c8a26f127a89a1a7b1c932"
};

const fbApp   = initializeApp(firebaseConfig);

 //── APP CHECK ──
initializeAppCheck(fbApp, {
  provider: new ReCaptchaV3Provider('6LdhHzItAAAAAMOapflWGPqhTM1IWEFV49tNKlqR'),
  isTokenAutoRefreshEnabled: true
});

const auth    = getAuth(fbApp);
const storage = getStorage(fbApp);
const db = getFirestore(fbApp);

function mostrarPopupSalvamento() {
  const popup = document.getElementById('popupSalvamento');
  const titulo = document.getElementById('popupTitulo');
  const barra = document.getElementById('popupBarra');
  const pct = document.getElementById('popupPct');
  popup.classList.remove('sucesso');
  titulo.textContent = '💾 Salvando proposta...';
  barra.style.width = '0%';
  pct.textContent = '0%';
  document.getElementById('popupBarraWrap').style.display = 'block';
  popup.classList.add('visivel');
}

function atualizarPopupProgresso(progresso) {
  document.getElementById('popupBarra').style.width = progresso + '%';
  document.getElementById('popupPct').textContent = Math.round(progresso) + '%';
}

function finalizarPopupSalvamento(sucesso) {
  const popup = document.getElementById('popupSalvamento');
  const titulo = document.getElementById('popupTitulo');
  if (sucesso) {
    popup.classList.add('sucesso');
    titulo.textContent = '✓ Proposta salva com sucesso!';
    atualizarPopupProgresso(100);
    document.getElementById('popupBarraWrap').style.display = 'none';
    document.getElementById('popupPct').textContent = '';
  } else {
    titulo.textContent = '⚠ Não foi possível salvar.';
  }
  setTimeout(() => {
    popup.classList.remove('visivel');
    setTimeout(() => popup.classList.remove('sucesso'), 350);
  }, 3000);
}

async function salvarNoStorage(blob, nomeArquivo, tipo = 'PPTX') {
  try {
    const { ref, uploadBytesResumable, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");
    const user = auth.currentUser;
    const caminho = `propostas/${tipo}/${nomeArquivo}`;
    const storageRef = ref(storage, caminho);

    mostrarPopupSalvamento();

    await new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on('state_changed',
        snapshot => {
          const progresso = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          atualizarPopupProgresso(progresso);
        },
        error => {
          finalizarPopupSalvamento(false);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          finalizarPopupSalvamento(true);
          resolve(url);
        }
      );
    });

  } catch(e) {
    finalizarPopupSalvamento(false);
    console.warn('Erro ao salvar no Storage:', e);
  }
}

// ── DADOS DOS COMBOS ──
const COMBOS = {
  UNO:    { mens: 4500,  alu: 1200 },
  DUO:    { mens: 7200,  alu: 1800 },
  TRIPLE: { mens: 10200, alu: 2400 },
  PRIME:  { mens: 13500, alu: 3000 },
  ELITE:  { mens: 17000, alu: 3600 },
};

const BASE       = 0.005;
const BONUS      = 0.015;
const CSS_SPLIT  = 0.25;
const COMBOS_PENDENTES = [];

const CATALOGO = {
  UNO: {
    tag: "Combo Entrada", nome: "UNO",
    categorias: [
      { nome: "Cardio", itens: [["Esteira Olímpica Professional","×1"],["Bicicleta Spinning Magnética","×1"]] },
      { nome: "Máquinas de Força", itens: [["Dual Cable Crossover","×1"]] },
      { nome: "Pesos Livres", itens: [["Halteres 1–10kg","×1"],["Anilhas variadas","×1"]] },
      { nome: "Acessórios", itens: [["Step Ajustável","×1"],["Colchonetes","×1"],["Tornozeleira Polia","×1"]] },
    ]
  },
  DUO: {
    tag: "Combo Intermediário", nome: "DUO",
    categorias: [
      { nome: "Cardio", itens: [["Esteira Olímpica Professional","×2"],["Bicicleta Spinning Magnética","×2"]] },
      { nome: "Máquinas de Força", itens: [["Dual Cable Crossover","×1"],["Supino Articulado","×1"]] },
      { nome: "Pesos Livres", itens: [["Halteres 1–15kg","×1"],["Anilhas variadas","×1"],["Barra Olímpica","×1"]] },
      { nome: "Acessórios", itens: [["Step Ajustável","×2"],["Colchonetes","×2"],["Tornozeleira Polia","×1"]] },
    ]
  },
  TRIPLE: {
    tag: "Combo Avançado", nome: "TRIPLE",
    categorias: [
      { nome: "Cardio", itens: [["Esteira Olímpica Professional","×3"],["Bicicleta Spinning Magnética","×2"],["Elíptico","×1"]] },
      { nome: "Máquinas de Força", itens: [["Dual Cable Crossover","×2"],["Supino Articulado","×1"],["Leg Press","×1"]] },
      { nome: "Pesos Livres", itens: [["Halteres 1–20kg","×1"],["Anilhas variadas","×1"],["Barra Olímpica","×2"]] },
      { nome: "Acessórios", itens: [["Step Ajustável","×2"],["Colchonetes","×4"],["Tornozeleira Polia","×2"]] },
    ]
  },
  PRIME: {
    tag: "Combo Premium", nome: "PRIME",
    categorias: [
      { nome: "Cardio", itens: [["Esteira Olímpica Professional","×4"],["Bicicleta Spinning Magnética","×3"],["Elíptico","×2"]] },
      { nome: "Máquinas de Força", itens: [["Dual Cable Crossover","×2"],["Supino Articulado","×2"],["Leg Press","×1"],["Puxador Alto/Remada Baixa","×1"]] },
      { nome: "Pesos Livres", itens: [["Halteres 1–25kg","×1"],["Anilhas variadas","×2"],["Barra Olímpica","×2"]] },
      { nome: "Acessórios", itens: [["Step Ajustável","×3"],["Colchonetes","×6"],["Tornozeleira Polia","×2"]] },
    ]
  },
  ELITE: {
    tag: "Combo Elite", nome: "ELITE",
    categorias: [
      { nome: "Cardio", itens: [["Esteira Olímpica Professional","×5"],["Bicicleta Spinning Magnética","×4"],["Elíptico","×3"],["Remo Indoor","×1"]] },
      { nome: "Máquinas de Força", itens: [["Dual Cable Crossover","×3"],["Supino Articulado","×2"],["Leg Press","×2"],["Puxador Alto/Remada Baixa","×2"],["Voador Peitoral","×1"]] },
      { nome: "Pesos Livres", itens: [["Halteres 1–30kg","×1"],["Anilhas variadas","×2"],["Barra Olímpica","×3"],["Barra W","×1"]] },
      { nome: "Acessórios", itens: [["Step Ajustável","×4"],["Colchonetes","×8"],["Tornozeleira Polia","×2"],["Corda de Pular","×4"]] },
    ]
  },
};

// ── CLOUDCONVERT (mover para backend após testes) ──
const CC_WORKER = 'https://withered-fire-fd56.lumno-contato.workers.dev';

let promoOn = false;

function togglePromo() {
  promoOn = !promoOn;
  document.getElementById('switchPill').classList.toggle('on', promoOn);
  document.getElementById('promoToggleRow').classList.toggle('ativo', promoOn);
  document.getElementById('promoCampos').classList.toggle('aberto', promoOn);
  atualizar();
  salvarDados();
}

function fmt(v) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function construirTabelaRef(cont, aptos) {
  const corpo = document.getElementById('tabelaRefBody');
  const comboAtivo = document.getElementById('combo').value;
  corpo.innerHTML = '';
  Object.entries(COMBOS).forEach(([nome, d]) => {
    const mensCli = d.mens - (cont === 'NAO' ? d.alu : 0);
    const minApto = aptos > 0 ? mensCli / aptos : 0;
    const tr = document.createElement('tr');
    if (nome === comboAtivo) tr.classList.add('ativo');
    tr.innerHTML = `<td>${nome}</td><td>${fmt(mensCli)}</td><td>${aptos > 0 ? fmt(minApto) : '—'}</td>`;
    corpo.appendChild(tr);
  });
}

function setVazio() {
  document.getElementById('statusBadge').className = 'status-badge status-vazio';
  document.getElementById('statusBadge').textContent = '← Preencha os campos para simular';
  document.getElementById('prevPremiacao').className = 'preview-value muted';
  document.getElementById('prevPremiacao').textContent = '—';
  document.getElementById('prevMensTotal').className = 'preview-value muted';
  document.getElementById('prevMensTotal').textContent = '—';
}

function atualizar() {
  ['nomeCondominio','aptos','valorApto','mesesPromo','mensPromo'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value) limparErro(id);
  });
  const combo   = document.getElementById('combo').value;
  const prazo   = parseInt(document.getElementById('prazo').value);
  const cont    = document.getElementById('container').value;
  const aptos   = parseFloat(document.getElementById('aptos').value) || 0;
  const vApto   = parseFloat(document.getElementById('valorApto').value);
  let mPromo = parseFloat(document.getElementById('mesesPromo').value) || 0;
  if (mPromo > 6) {
    document.getElementById('mesesPromo').value = 6;
    mPromo = 6;
    setErro('mesesPromo', 'O período promocional é limitado a 6 meses.');
  }
  const mPromoV = parseFloat(document.getElementById('mensPromo').value) || 0;

  const d = COMBOS[combo];
  const mensCli = d.mens - (cont === 'NAO' ? d.alu : 0);
  const recLiq  = d.mens - d.alu;
  const minApto = aptos > 0 ? mensCli / aptos : 0;

  document.getElementById('minValDisplay').textContent = aptos > 0 ? fmt(minApto) : '—';
  construirTabelaRef(cont, aptos);

  if (!vApto || aptos === 0) { setVazio(); return; }

  const mensNeg = vApto * aptos;
  let contNeg;
  if (promoOn && mPromo > 0 && mPromoV > 0) {
    const mensPromoTotal = mPromoV * aptos;
    contNeg = (mPromo * mensPromoTotal) + ((prazo - mPromo) * mensNeg);
  } else {
    contNeg = mensNeg * prazo;
  }

  const contMin  = recLiq * prazo;
  const extra    = Math.max(0, contNeg - contMin);
  const comBase  = contNeg * BASE;
  const comBonus = extra * BONUS;
  const comTotal = comBase + comBonus;
  const comCSS   = comTotal * CSS_SPLIT;
  const pct = vApto / minApto - 1;

  let statusClass, statusTxt;
  if (vApto < minApto) {
    statusClass = 'status-bloqueado';
    statusTxt = '❌ BLOQUEADO — Valor abaixo do mínimo para este combo.';
  } else if (pct < 0.05) {
    statusClass = 'status-minimo';
    statusTxt = '⚠ NO MÍNIMO — Premiação mínima. Tente subir o valor!';
  } else if (pct < 0.15) {
    statusClass = 'status-bom';
    statusTxt = '✔ BOM NEGÓCIO — Aprovado! Ainda há margem para crescer.';
  } else if (pct < 0.25) {
    statusClass = 'status-otimo';
    statusTxt = '🚀 ÓTIMO NEGÓCIO — Excelente! Sua premiação está crescendo.';
  } else {
    statusClass = 'status-maximo';
    statusTxt = '⭐ MÁXIMO — Premiação no topo! Melhor proposta possível.';
  }

  const badge = document.getElementById('statusBadge');
  badge.className = 'status-badge ' + statusClass;
  badge.textContent = statusTxt;

  const elPrem = document.getElementById('prevPremiacao');
  if (vApto < minApto) {
    elPrem.textContent = 'R$ 0,00';
    elPrem.className = 'preview-value vermelho';
  } else {
    elPrem.textContent = fmt(comCSS);
    elPrem.className = 'preview-value ' + (pct >= 0.25 ? 'amarelo' : 'verde');
  }

  const elMens = document.getElementById('prevMensTotal');
  elMens.textContent = fmt(mensNeg);
  elMens.className = 'preview-value ' + (vApto < minApto ? 'vermelho' : 'amarelo');

  // Validar valor promocional em tempo real
  if (promoOn && mPromoV > 0 && minApto > 0) {
    if (mPromoV < minApto) {
      setErro('mensPromo', `Valor promocional abaixo do mínimo permitido (${fmt(minApto)} por unidade).`);
    } else {
      limparErro('mensPromo');
    }
  }

  salvarDados();
}

function abrirModal() {
  const combo = document.getElementById('combo').value;
  const cat = CATALOGO[combo];
  if (!cat) return;
  document.getElementById('modalNomeCombo').textContent = cat.nome;
  document.getElementById('modalTagCombo').textContent = cat.tag;
  const grid = document.getElementById('modalEquipGrid');
  grid.innerHTML = '';
  cat.categorias.forEach(c => {
    const card = document.createElement('div');
    card.className = 'modal-equip-card';
    card.innerHTML = `<div class="modal-equip-titulo">${c.nome}</div>` +
      c.itens.map(([nome, qty]) =>
        `<div class="modal-equip-item"><span>${nome}</span><span class="modal-equip-qty">${qty}</span></div>`
      ).join('');
    grid.appendChild(card);
  });
  document.getElementById('modalOverlay').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('aberto');
}

function fecharModalFora(e) {
  if (e.target === document.getElementById('modalOverlay')) fecharModal();
}

function fmtBRL(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── GERA O ZIP COM O PPTX PREENCHIDO (reutilizado por PPTX e PDF) ──
async function gerarZip(combo, nomeRaw, aptos, vApto, prazo) {
  const arquivo = combo.toLowerCase();

  if (!window.JSZip) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const response = await fetch(`templates/${arquivo}.pptx`);
  if (!response.ok) throw new Error(`Template ${arquivo}.pptx não encontrado.`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const nome     = nomeRaw.toUpperCase();
  const mensApto = 'R$ ' + fmtBRL(vApto);
  const mensCond = 'R$ ' + fmtBRL(vApto * aptos);
  const aptosStr = String(Math.round(aptos));

  const valores = {
    NOME:       nome,
    VALOR:      mensApto,
    VALOR_COND: mensCond,
    UNIDADES:   aptosStr,
    PRAZO:      `${prazo} meses`,
  };

  const slides = Object.keys(zip.files).filter(
    f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml')
  );

  for (const slidePath of slides) {
    let xml = await zip.file(slidePath).async('string');
    Object.entries(valores).forEach(([chave, valor]) => {
      xml = xml.replaceAll(`[${chave}]`, valor);
    });
    zip.file(slidePath, xml);
  }

  return { zip, nome: nomeRaw };
}


// ── VALIDAÇÃO DE CAMPOS ──
function setErro(id, msg) {
  const input = document.getElementById(id);
  if (!input) return;
  input.classList.add('campo-erro');
  let msgEl = input.parentElement.querySelector('.msg-erro');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.className = 'msg-erro';
    input.parentElement.appendChild(msgEl);
  }
  msgEl.textContent = msg;
  msgEl.style.display = 'block';
}

function limparErro(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.classList.remove('campo-erro');
  const msgEl = input.parentElement.querySelector('.msg-erro');
  if (msgEl) msgEl.style.display = 'none';
}

function limparTodosErros() {
  ['nomeCondominio','aptos','valorApto','mesesPromo','mensPromo'].forEach(limparErro);
}

function validarCampos() {
  limparTodosErros();
  let valido = true;
  let primeiroInvalido = null;

  const nome  = document.getElementById('nomeCondominio').value.trim();
  const aptos = parseFloat(document.getElementById('aptos').value);
  const vApto = parseFloat(document.getElementById('valorApto').value);

  if (!nome) {
    setErro('nomeCondominio', 'Informe o nome do condomínio.');
    primeiroInvalido = primeiroInvalido || 'nomeCondominio';
    valido = false;
  }

  if (!aptos || aptos <= 0) {
    setErro('aptos', 'Informe um número de unidades válido (maior que zero).');
    primeiroInvalido = primeiroInvalido || 'aptos';
    valido = false;
  }

  if (!vApto || vApto <= 0) {
    setErro('valorApto', 'Informe um valor por unidade válido (maior que zero).');
    primeiroInvalido = primeiroInvalido || 'valorApto';
    valido = false;
  }

  if (promoOn) {
    const meses  = parseFloat(document.getElementById('mesesPromo').value);
    const vPromo = parseFloat(document.getElementById('mensPromo').value);

    if (!meses || meses <= 0 || meses > 6) {
      setErro('mesesPromo', 'Informe entre 1 e 6 meses promocionais.');
      primeiroInvalido = primeiroInvalido || 'mesesPromo';
      valido = false;
    }

    if (!vPromo || vPromo <= 0) {
      setErro('mensPromo', 'Informe o valor promocional por unidade.');
      primeiroInvalido = primeiroInvalido || 'mensPromo';
      valido = false;
    } else {
      const combo   = document.getElementById('combo').value;
      const cont    = document.getElementById('container').value;
      const aptosV  = parseFloat(document.getElementById('aptos').value) || 0;
      const d       = COMBOS[combo];
      const mensCli = d.mens - (cont === 'NAO' ? d.alu : 0);
      const minApto = aptosV > 0 ? mensCli / aptosV : 0;
      if (minApto > 0 && vPromo < minApto) {
        setErro('mensPromo', `Valor promocional abaixo do mínimo permitido (${fmt(minApto)} por unidade).`);
        primeiroInvalido = primeiroInvalido || 'mensPromo';
        valido = false;
      }
    }
  }

  if (primeiroInvalido) document.getElementById(primeiroInvalido).focus();
  return valido;
}


async function registrarLog(combo, nomeCondominio, tipo, nomeArquivo) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'logs_propostas'), {
      vendedor:       user ? user.email : 'desconhecido',
      nomeVendedor:   user ? (user.displayName || user.email) : 'desconhecido',
      combo:          combo,
      condominio:     nomeCondominio,
      tipo:           tipo,
      arquivo:        nomeArquivo,
      data:           new Date().toISOString(),
      dataFormatada:  new Date().toLocaleString('pt-BR'),
    });
  } catch(e) {
    console.warn('Erro ao registrar log:', e);
  }
}

// ── RATE LIMITING ──
const _rateLimit = { timestamps: [], bloqueadoAte: null };

function verificarRateLimit() {
  const agora = Date.now();

  // Verifica se está no período de bloqueio
  if (_rateLimit.bloqueadoAte && agora < _rateLimit.bloqueadoAte) {
    const espera = Math.ceil((_rateLimit.bloqueadoAte - agora) / 1000);
    alert(`Limite atingido. Aguarde ${espera} segundo${espera > 1 ? 's' : ''}.`);
    return false;
  }

  // Reseta se o bloqueio já passou
  if (_rateLimit.bloqueadoAte && agora >= _rateLimit.bloqueadoAte) {
    _rateLimit.timestamps = [];
    _rateLimit.bloqueadoAte = null;
  }

  // Remove timestamps com mais de 1 minuto
  _rateLimit.timestamps = _rateLimit.timestamps.filter(t => t > agora - 60000);

  if (_rateLimit.timestamps.length >= 5) {
    _rateLimit.bloqueadoAte = agora + 10000;
    alert('Limite de 5 propostas por minuto atingido. Aguarde 10 segundos.');
    return false;
  }

  _rateLimit.timestamps.push(agora);
  return true;
}


// ── BAIXAR PPTX ──
async function gerarProposta() {
  const btn     = document.getElementById('btnGerar');
  const lblBtn  = btn.querySelector('.btn-lbl');
  const nomeRaw = (document.getElementById('nomeCondominio').value || '').trim();
  const aptos   = parseFloat(document.getElementById('aptos').value) || 0;
  const vApto   = parseFloat(document.getElementById('valorApto').value) || 0;
  const combo   = document.getElementById('combo').value;
  const prazo = parseInt(document.getElementById('prazo').value);

  if (!validarCampos()) return;
  if (!verificarRateLimit()) return;
  if (COMBOS_PENDENTES.includes(combo)) { alert('Combo ' + combo + ' ainda não disponível.'); return; }

  // Estado de carregamento
  btn.classList.add('loading');
  btn.disabled = true;
  lblBtn.textContent = 'Gerando proposta...';

  try {
    const { zip } = await gerarZip(combo, nomeRaw, aptos, vApto, prazo);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposta Duo Fitness ${combo} - ${nomeRaw}.pptx`;
    document.body.appendChild(a); a.click();
    await salvarNoStorage(blob, `Proposta Duo Fitness ${combo} - ${nomeRaw}.pptx`, 'PPTX');
    document.body.removeChild(a); URL.revokeObjectURL(url);
    salvarHistorico('PPTX');
    await registrarLog(combo, nomeRaw, 'PPTX', `Proposta Duo Fitness ${combo} - ${nomeRaw}.pptx`);

  } catch(e) {
    alert('Não foi possível gerar a proposta. Verifique sua conexão e tente novamente.');
    console.error(e);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    lblBtn.textContent = 'Baixar Proposta em PowerPoint';
  }
}

// ── BAIXAR PDF VIA CLOUDCONVERT ──
async function gerarPDF() {
  const btnPdf  = document.getElementById('btnGerarPdf');
  const lblPdf  = btnPdf.querySelector('.btn-lbl');
  if (btnPdf.disabled) return;
  const nomeRaw = (document.getElementById('nomeCondominio').value || '').trim();
  const aptos   = parseFloat(document.getElementById('aptos').value) || 0;
  const vApto   = parseFloat(document.getElementById('valorApto').value) || 0;
  const combo   = document.getElementById('combo').value;
  const prazo = parseInt(document.getElementById('prazo').value);

  if (!validarCampos()) return;
  if (!verificarRateLimit()) return;
  if (COMBOS_PENDENTES.includes(combo)) { alert('Combo ' + combo + ' ainda não disponível.'); return; }

  // Estado de carregamento
  btnPdf.classList.add('loading');
  btnPdf.disabled = true;
  lblPdf.textContent = 'Gerando PDF...';

  try {
    // 1. Gerar o PPTX preenchido em memória
    const { zip } = await gerarZip(combo, nomeRaw, aptos, vApto);
    const pptxBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // 2. Criar job no CloudConvert
    const jobRes = await fetch(`${CC_WORKER}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'upload-pptx': { operation: 'import/upload' },
          'convert-pdf': {
            operation: 'convert',
            input: 'upload-pptx',
            input_format: 'pptx',
            output_format: 'pdf'
          },
          'export-pdf': {
            operation: 'export/url',
            input: 'convert-pdf'
          }
        }
      })
    });

    if (!jobRes.ok) throw new Error('Erro ao criar job no CloudConvert.');
    const job = await jobRes.json();

    // 3. Fazer upload do PPTX
    const uploadTask = job.data.tasks.find(t => t.name === 'upload-pptx');
    const uploadUrl  = uploadTask.result.form.url;
    const uploadParams = uploadTask.result.form.parameters;

    const formData = new FormData();
    Object.entries(uploadParams).forEach(([k, v]) => formData.append(k, v));
    formData.append('file', pptxBlob, `proposta_${combo.toLowerCase()}.pptx`);

    const upRes = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!upRes.ok) throw new Error('Erro ao fazer upload para o CloudConvert.');

    // 4. Aguardar conversão (polling)
    const jobId = job.data.id;
    let exportTask = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`${CC_WORKER}/jobs/${jobId}`, {
        });
      const statusData = await statusRes.json();
      const tasks = statusData.data.tasks;
      const exp = tasks.find(t => t.name === 'export-pdf');
      if (exp && exp.status === 'finished') {
        exportTask = exp;
        break;
      }
      const failed = tasks.find(t => t.status === 'error');
      if (failed) throw new Error('Falha na conversão: ' + (failed.message || 'erro desconhecido'));
    }

    if (!exportTask) throw new Error('Tempo esgotado aguardando conversão.');

    // 5. Baixar o PDF
    const pdfUrl = exportTask.result.files[0].url;
    const pdfRes = await fetch(pdfUrl);
    const pdfBlob = await pdfRes.blob();

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposta Duo Fitness ${combo} - ${nomeRaw}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
    await salvarNoStorage(pdfBlob, `Proposta Duo Fitness ${combo} - ${nomeRaw}.pdf`, 'PDF');
    salvarHistorico('PDF');
    await registrarLog(combo, nomeRaw, 'PDF', `Proposta Duo Fitness ${combo} - ${nomeRaw}.pdf`);

  } catch(e) {
    alert('Não foi possível gerar o PDF. Verifique sua conexão e tente novamente.');
    console.error(e);
  } finally {
    btnPdf.classList.remove('loading');
    btnPdf.disabled = false;
    lblPdf.textContent = 'Baixar Proposta em PDF';
  }
}


// ── LOCALSTORAGE ──
const STORAGE_KEY = 'duofitness_simulador';

function salvarDados() {
  const dados = {
    nomeCondominio: document.getElementById('nomeCondominio').value,
    combo:          document.getElementById('combo').value,
    prazo:          document.getElementById('prazo').value,
    container:      document.getElementById('container').value,
    aptos:          document.getElementById('aptos').value,
    valorApto:      document.getElementById('valorApto').value,
    promoOn:        promoOn,
    mesesPromo:     document.getElementById('mesesPromo').value,
    mensPromo:      document.getElementById('mensPromo').value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function restaurarDados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);

    if (d.nomeCondominio) document.getElementById('nomeCondominio').value = d.nomeCondominio;
    if (d.combo)          document.getElementById('combo').value          = d.combo;
    if (d.prazo)          document.getElementById('prazo').value          = d.prazo;
    if (d.container)      document.getElementById('container').value      = d.container;
    if (d.aptos)          document.getElementById('aptos').value          = d.aptos;
    if (d.valorApto)      document.getElementById('valorApto').value      = d.valorApto;
    if (d.mesesPromo)     document.getElementById('mesesPromo').value     = d.mesesPromo;
    if (d.mensPromo)      document.getElementById('mensPromo').value      = d.mensPromo;

    if (d.promoOn && !promoOn) togglePromo();
  } catch(e) {
    console.warn('Erro ao restaurar dados:', e);
  }
}

function limparFormulario() {
  localStorage.removeItem(STORAGE_KEY);

  document.getElementById('nomeCondominio').value = '';
  document.getElementById('combo').value          = 'DUO';
  document.getElementById('prazo').value          = '60';
  document.getElementById('container').value      = 'SIM';
  document.getElementById('aptos').value          = '100';
  document.getElementById('valorApto').value      = '';
  document.getElementById('mesesPromo').value     = '';
  document.getElementById('mensPromo').value      = '';

  if (promoOn) togglePromo();

  limparTodosErros();
  atualizar();
}

// ── HISTÓRICO DE PROPOSTAS ──
const HISTORICO_KEY = 'duofitness_historico';

function salvarHistorico(tipo) {
  const historico = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const novo = {
    id:             Date.now(),
    tipo:           tipo, // 'PPTX' ou 'PDF'
    nomeCondominio: document.getElementById('nomeCondominio').value.trim(),
    combo:          document.getElementById('combo').value,
    prazo:          document.getElementById('prazo').value,
    container:      document.getElementById('container').value,
    aptos:          document.getElementById('aptos').value,
    valorApto:      document.getElementById('valorApto').value,
    promoOn:        promoOn,
    mesesPromo:     document.getElementById('mesesPromo').value,
    mensPromo:      document.getElementById('mensPromo').value,
    data:           new Date().toLocaleString('pt-BR'),
  };
  historico.unshift(novo);
  if (historico.length > 20) historico.splice(20);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico));
  renderizarHistorico();
}

function excluirProposta(id) {
  const historico = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const novo = historico.filter(h => h.id !== id);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(novo));
  renderizarHistorico();
}

function reabrirProposta(id) {
  const historico = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const item = historico.find(h => h.id === id);
  if (!item) return;

  document.getElementById('nomeCondominio').value = item.nomeCondominio;
  document.getElementById('combo').value          = item.combo;
  document.getElementById('prazo').value          = item.prazo;
  document.getElementById('container').value      = item.container;
  document.getElementById('aptos').value          = item.aptos;
  document.getElementById('valorApto').value      = item.valorApto;
  document.getElementById('mesesPromo').value     = item.mesesPromo || '';
  document.getElementById('mensPromo').value      = item.mensPromo || '';

  if (item.promoOn && !promoOn) togglePromo();
  if (!item.promoOn && promoOn) togglePromo();

  fecharHistorico();
  atualizar();
}

function renderizarHistorico() {
  const historico = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const lista = document.getElementById('historicoLista');
  if (!lista) return;

  if (historico.length === 0) {
    lista.innerHTML = '<div class="historico-vazio">Nenhuma proposta gerada ainda.</div>';
    return;
  }

  lista.innerHTML = historico.map(h => `
    <div class="historico-card">
      <div class="historico-info">
        <div class="historico-nome">${h.nomeCondominio}</div>
        <div class="historico-meta">
          <span class="historico-badge">${h.combo}</span>
          <span class="historico-badge">${h.prazo} meses</span>
          <span class="historico-badge historico-tipo">${h.tipo}</span>
        </div>
        <div class="historico-data">${h.data}</div>
      </div>
      <div class="historico-acoes">
        <button class="historico-btn-reabrir" onclick="reabrirProposta(${h.id})">Reabrir</button>
        <button class="historico-btn-excluir" onclick="excluirProposta(${h.id})">✕</button>
      </div>
    </div>
  `).join('');
}

function abrirHistorico() {
  renderizarHistorico();
  document.getElementById('modalHistorico').classList.add('aberto');
}

function fecharHistorico() {
  document.getElementById('modalHistorico').classList.remove('aberto');
}

function fecharHistoricoFora(e) {
  if (e.target === document.getElementById('modalHistorico')) fecharHistorico();
}

// ── EXPOR FUNÇÕES GLOBAIS (necessário para type="module") ──
window.togglePromo      = togglePromo;
window.atualizar        = atualizar;
window.abrirModal       = abrirModal;
window.fecharModal      = fecharModal;
window.fecharModalFora  = fecharModalFora;
window.gerarProposta    = gerarProposta;
window.gerarPDF         = gerarPDF;
window.limparFormulario = limparFormulario;
window.excluirProposta  = excluirProposta;
window.reabrirProposta  = reabrirProposta;
window.abrirHistorico   = abrirHistorico;
window.fecharHistorico  = fecharHistorico;
window.fecharHistoricoFora = fecharHistoricoFora;

// ── HEARTBEAT ONLINE ──
async function iniciarHeartbeat(user) {
  const { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const db = getFirestore(fbApp);
  const docRef = doc(db, 'usuarios_online', user.uid);

  async function heartbeat() {
    await setDoc(docRef, {
      email: user.email,
      nome: user.displayName || user.email.split('@')[0],
      ultimoAcesso: serverTimestamp(),
    });
  }

  await heartbeat();
  setInterval(heartbeat, 30000);

  window.addEventListener('beforeunload', () => deleteDoc(docRef));
}

document.addEventListener('DOMContentLoaded', () => {
  restaurarDados();
  construirTabelaRef('SIM', 100);
  atualizar();
});
