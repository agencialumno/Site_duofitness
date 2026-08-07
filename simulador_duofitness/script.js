import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
let equipamentosExtras = [];

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
    const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");
    const user = auth.currentUser;
    const caminho = `propostas/${tipo}/${nomeArquivo}`;
    const storageRef = ref(storage, caminho);

    mostrarPopupSalvamento();
    atualizarPopupProgresso(50);

    const snapshot = await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(snapshot.ref);

    finalizarPopupSalvamento(true);

  } catch(e) {
    finalizarPopupSalvamento(false);
    console.warn('Erro ao salvar no Storage:', e);
  }
}

// ── DADOS DOS COMBOS ──
// ── DADOS DOS COMBOS ──
const COMBOS = {
  UNO:    { parcela: 1832.22, manutencao: 300.00,  container: 2500.00,  totalEquip: 77146.19,  entrada: 3857.30,  numParcelas: 40 },
  DUO:    { parcela: 3020.45, manutencao: 600.00,  container: 5000.00,  totalEquip: 149432.99, entrada: 7471.64,  numParcelas: 47 },
  TRIPLE: { parcela: 4533.37, manutencao: 900.00,  container: 7500.00,  totalEquip: 224282.99, entrada: 11214.14, numParcelas: 47 },
  PRIME:  { parcela: 5574.78, manutencao: 1200.00, container: 10000.00, totalEquip: 275804.99, entrada: 13790.24, numParcelas: 47 },
  ELITE:  { parcela: 7862.54, manutencao: 1300.00, container: 11000.00, totalEquip: 389216.99, entrada: 19449.44, numParcelas: 47 },
};

const MARGEM_FRANQUEADO = 0.30;
const ROYALTIES         = 0.10;
const IMPOSTO_NF         = 0.065;

const BASE       = 0.002;
const BONUS      = 0.002;

// Calcula a cascata completa de um combo e retorna cada etapa para uso na tabela e na DRE.
const DESPESA_SIMULADOR = 300.00;

function calcularCascata(combo, temContainer) {
  const d = COMBOS[combo];
  const subtotalCusto = d.parcela + d.manutencao + DESPESA_SIMULADOR + (temContainer ? d.container : 0);
  const lucroFranqueado = subtotalCusto * MARGEM_FRANQUEADO;
  const subtotalComLucro = subtotalCusto + lucroFranqueado;
  const mensalidadeMinima = subtotalComLucro / (1 - ROYALTIES - IMPOSTO_NF);
  const royalties = mensalidadeMinima * ROYALTIES;
  const imposto = mensalidadeMinima * IMPOSTO_NF;

  return {
    parcela: d.parcela,
    manutencao: d.manutencao,
    despesaSimulador: DESPESA_SIMULADOR,
    container: temContainer ? d.container : 0,
    subtotalCusto,
    lucroFranqueado,
    subtotalComLucro,
    royalties,
    imposto,
    mensalidadeMinima,
  };
}

function recalcularParcela(combo) {
  const d = COMBOS[combo];

  // Soma o total atual dos equipamentos com as quantidades editadas
  let novoTotal = 0;
  CATALOGO[combo].categorias.forEach(cat => {
    cat.itens.forEach(item => {
      novoTotal += item.valorUnit * item.qtd;
    });
  });

  // Soma o valor dos equipamentos extras (de outros combos)
  equipamentosExtras.forEach(ex => {
    novoTotal += ex.valorUnit * ex.qtd;
  });

  // (novoTotal - entrada) ÷ parcelas = nova parcela
  const novaParcela = (novoTotal - d.entrada) / d.numParcelas;
  COMBOS[combo].parcela = Math.max(0, novaParcela);
}

function renderizarDRE(combo, cont, aptos, mensNeg) {
  const corpo = document.getElementById('tabelaDREBody');
  if (!corpo) return;
  const calc = calcularCascata(combo, cont === 'SIM');
  const minApto = aptos > 0 ? calc.mensalidadeMinima / aptos : 0;

  const receitaIncremental = mensNeg > 0 ? Math.max(0, mensNeg - calc.mensalidadeMinima) : 0;
  const temIncremental = receitaIncremental > 0;
  const lucroTotal = calc.lucroFranqueado + receitaIncremental;
  const royaltiesDRE = (mensNeg > 0 ? mensNeg : calc.mensalidadeMinima) * ROYALTIES;

  const linhas = [
    { label: 'Valor da parcela do equipamento', valor: calc.parcela },
    { label: '(+) Manutenção preventiva', valor: calc.manutencao },
    { label: '(+) App Duo', valor: calc.despesaSimulador },
    { label: '(+) Container + Estrutura' + (cont === 'SIM' ? '' : ' (não contratado)'), valor: calc.container },
    { label: 'Subtotal de custos', valor: calc.subtotalCusto, destaque: true },
    { label: '(+) Lucro do franqueado (30%)', valor: calc.lucroFranqueado },
    { label: 'Subtotal com lucro', valor: calc.subtotalComLucro, destaque: true },
  ];

  if (!temIncremental) {
    linhas.push({ label: '(-) Royalties sobre faturamento (10%)', valor: royaltiesDRE });
  }

  linhas.push({ label: '(-) Imposto / NF sobre faturamento (6,5%)', valor: calc.imposto });
  linhas.push({ label: 'Mensalidade mínima do condomínio', valor: calc.mensalidadeMinima, total: true });
  linhas.push({ label: '(÷) Por unidade (' + (aptos || 0) + ')', valor: minApto, total: true });
  linhas.push({ label: 'Receita incremental', valor: receitaIncremental, total: true });

  if (temIncremental) {
    linhas.push({ label: 'Lucro total do franqueado', valor: lucroTotal, total: true });
    linhas.push({ label: '(-) Royalties (10%)', valor: royaltiesDRE });
  }

  corpo.innerHTML = linhas.map(l => `
    <tr class="${l.total ? 'dre-total' : ''} ${l.destaque ? 'dre-subtotal' : ''}">
      <td>${l.label}</td>
      <td>${fmt(l.valor)}</td>
    </tr>
  `).join('');
}

const COMBOS_PENDENTES = [];

const CATALOGO = {
  UNO: {
    tag: "Combo Entrada", nome: "UNO",
    categorias: [
      { nome: "Cardio", itens: [
        { curto: "Esteira", completo: "Esteira Kikos KX8500iC 220V", qtd: 1, valorUnit: 17034.00, ph: 'ESTEIRA' },
        { curto: "Bike", completo: "Bike Kikos KV8.7i Bivolt", qtd: 1, valorUnit: 4529.40, ph: 'BIKE_KIKOS' },
      ] },
      { nome: "Força", itens: [
        { curto: "Estação Multifuncional", completo: "Estação Multifuncional Kikos 519BF", qtd: 1, valorUnit: 33594.00, ph: 'ESTACAO_MULT' },
      ] },
      { nome: "Bancos", itens: [
        { curto: "Banco Multi Posições", completo: "Banco Multi Posições Kikos A84", qtd: 2, valorUnit: 2394.00, ph: 'BANCO_MULT' },
      ] },
      { nome: "Pesos Livres", itens: [
        { curto: "Anilha 10kg", completo: "Anilha Rubber Vermelho Kikos 10kg", qtd: 10, valorUnit: 509.40, ph: 'ANILHA' },
        { curto: "Barra W", completo: "Barra W 1.20m Cromada com Presilha Olímpica Kikos", qtd: 1, valorUnit: 941.40, ph: 'BARRA_W' },
        { curto: "Halter 10kg", completo: "Halter Emborrachado 10kg", qtd: 11, valorUnit: 353.40, ph: 'HALTER' },
      ] },
      { nome: "Armazenamento", itens: [
        { curto: "Suporte para Barras", completo: "Suporte para Barras Olímpicas Kikos", qtd: 1, valorUnit: 2135.40, ph: 'SUP_BARRA' },
        { curto: "Suporte para Halteres", completo: "Suporte para Halteres 10 Pares", qtd: 1, valorUnit: 2616.00, ph: 'SUP_HALTER' },
      ] },
      { nome: "Puxadores", itens: [
        { curto: "Puxador Reto", completo: "Puxador Reto 60cm Lightning Bolt", qtd: 1, valorUnit: 197.99, ph: 'PUX_RETO' },
        { curto: "Puxador Corda", completo: "Puxador Corda Serginho", qtd: 1, valorUnit: 229.20, ph: 'CORDA_SERG' },
        { curto: "Puxador Romano", completo: "Puxador Romano 64cm Serginho", qtd: 1, valorUnit: 605.40, ph: 'PUX_ROMA' },
        { curto: "Puxador Tornozelo", completo: "Puxador Tornozelo Alça Cross Serginho", qtd: 1, valorUnit: 98.40, ph: 'PUX_TORNO' },
        { curto: "Puxador Triângulo", completo: "Puxador Triângulo Serginho", qtd: 1, valorUnit: 490.80, ph: 'TRI_SERG' },
      ] },
      { nome: "Acessórios", itens: [
        { curto: "Step Light", completo: "Step Light Kikos", qtd: 2, valorUnit: 239.40, ph: 'STEP_LIGHT' },
        { curto: "Colchonete", completo: "Colchonete Emborrachado Pequeno", qtd: 2, valorUnit: 213.00, ph: 'COLCHONETE' },
      ] },
    ]
  },
  DUO: {
    tag: "Combo Intermediário", nome: "DUO",
    categorias: [
      { nome: "Cardio", itens: [
        { curto: "Esteira", completo: "Esteira Kikos KX8500iC 220V", qtd: 2, valorUnit: 17034.00, ph: 'ESTEIRA' },
        { curto: "Bike", completo: "Bike Kikos KV8.7i Bivolt", qtd: 1, valorUnit: 4529.40, ph: 'BIKE_KIKOS' },
        { curto: "Bike Spinning", completo: "Bike Spinning Kikos F9", qtd: 1, valorUnit: 7314.00, ph: 'BIKE_SPI' },
      ] },
      { nome: "Força", itens: [
        { curto: "Cross com Smith", completo: "Cross com Smith Linha Kikos Pro TTMS22", qtd: 1, valorUnit: 33774.00, ph: 'CROSS_SMITH' },
        { curto: "Cadeira Adutora/Abdutora", completo: "Cadeira Adutora e Abdutora Linha Dual Kikos Pro TTDS7475", qtd: 1, valorUnit: 18474.00, ph: 'AD_ABD' },
        { curto: "Cadeira Flexora/Extensora", completo: "Cadeira Flexora e Extensora Linha Dual Kikos Pro TTDS7172", qtd: 1, valorUnit: 22254.00, ph: 'EX_FLX' },
      ] },
      { nome: "Bancos", itens: [
        { curto: "Banco Multi Posições", completo: "Banco Multi Posições Kikos A84", qtd: 2, valorUnit: 2394.00, ph: 'BANCO_MULT' },
        { curto: "Banco Supino", completo: "Banco Supino Regulável Fechado 0 a 45 Smart Repair", qtd: 1, valorUnit: 7030.80, ph: 'BANCO_SUP' },
      ] },
      { nome: "Pesos Livres", itens: [
        { curto: "Anilha 10kg", completo: "Anilha Rubber Vermelho Kikos 10kg", qtd: 10, valorUnit: 509.40, ph: 'ANILHA' },
        { curto: "Barra W", completo: "Barra W 1.20m Cromada com Presilha Olímpica Kikos", qtd: 1, valorUnit: 941.40, ph: 'BARRA_W' },
        { curto: "Halter 10kg", completo: "Halter Emborrachado 10kg", qtd: 11, valorUnit: 353.40, ph: 'HALTER' },
      ] },
      { nome: "Armazenamento", itens: [
        { curto: "Suporte para Barras", completo: "Suporte para Barras Olímpicas Kikos", qtd: 1, valorUnit: 2135.40, ph: 'SUP_BARRA' },
        { curto: "Suporte para Halteres", completo: "Suporte para Halteres 10 Pares", qtd: 1, valorUnit: 2616.00, ph: 'SUP_HALTER' },
      ] },
      { nome: "Puxadores", itens: [
        { curto: "Puxador Reto", completo: "Puxador Reto 60cm Lightning Bolt", qtd: 1, valorUnit: 197.99, ph: 'PUX_RETO' },
        { curto: "Puxador Corda", completo: "Puxador Corda Serginho", qtd: 1, valorUnit: 229.20, ph: 'CORDA_SERG' },
        { curto: "Puxador Romano", completo: "Puxador Romano 64cm Serginho", qtd: 1, valorUnit: 605.40, ph: 'PUX_ROMA' },
        { curto: "Puxador Tornozelo", completo: "Puxador Tornozelo Alça Cross Serginho", qtd: 1, valorUnit: 98.40, ph: 'PUX_TORNO' },
        { curto: "Puxador Triângulo", completo: "Puxador Triângulo Serginho", qtd: 1, valorUnit: 490.80, ph: 'TRI_SERG' },
      ] },
      { nome: "Acessórios", itens: [
        { curto: "Step Light", completo: "Step Light Kikos", qtd: 2, valorUnit: 239.40, ph: 'STEP_LIGHT' },
        { curto: "Colchonete", completo: "Colchonete Emborrachado Pequeno", qtd: 2, valorUnit: 213.00, ph: 'COLCHONETE' },
      ] },
    ]
  },
  TRIPLE: {
    tag: "Combo Avançado", nome: "TRIPLE",
    categorias: [
      { nome: "Cardio", itens: [
        { curto: "Esteira", completo: "Esteira Kikos KX8500iC 220V", qtd: 3, valorUnit: 17034.00, ph: 'ESTEIRA' },
        { curto: "Bike", completo: "Bike Kikos KV8.7i Bivolt", qtd: 1, valorUnit: 4529.40, ph: 'BIKE_KIKOS' },
        { curto: "Bike Spinning", completo: "Bike Spinning Kikos F9", qtd: 1, valorUnit: 7314.00, ph: 'BIKE_SPI' },
        { curto: "Elíptico", completo: "Elíptico Kikos KE4.4", qtd: 1, valorUnit: 8874.00, ph: 'ELIPTICO' },
      ] },
      { nome: "Força", itens: [
        { curto: "Cross com Smith", completo: "Cross com Smith Linha Kikos Pro TTMS22", qtd: 1, valorUnit: 33774.00, ph: 'CROSS_SMITH' },
        { curto: "Leg Press", completo: "Leg Press 140kg Linha Classic Kikos Pro CLS70", qtd: 1, valorUnit: 18954.00, ph: 'LEG_PRESS' },
        { curto: "Peitoral Dorsal", completo: "Peitoral Dorsal TTS22 80kg Linha Titanium Kikos Pro", qtd: 1, valorUnit: 13314.00, ph: 'PEIT_DORS' },
        { curto: "Cadeira Adutora/Abdutora", completo: "Cadeira Adutora e Abdutora Linha Dual Kikos Pro TTDS7475", qtd: 1, valorUnit: 18474.00, ph: 'AD_ABD' },
        { curto: "Cadeira Flexora/Extensora", completo: "Cadeira Flexora e Extensora Linha Dual Kikos Pro TTDS7172", qtd: 1, valorUnit: 22254.00, ph: 'EX_FLX' },
        { curto: "Pulley com Remada", completo: "Pulley com Remada Linha Dual Kikos Pro TTDS3031", qtd: 1, valorUnit: 16674.00, ph: 'PULLEY' },
      ] },
      { nome: "Bancos", itens: [
        { curto: "Banco Multi Posições", completo: "Banco Multi Posições Kikos A84", qtd: 2, valorUnit: 2394.00, ph: 'BANCO_MULT' },
        { curto: "Banco Supino", completo: "Banco Supino Regulável Fechado 0 a 45 Smart Repair", qtd: 1, valorUnit: 7030.80, ph: 'BANCO_SUP' },
      ] },
      { nome: "Pesos Livres", itens: [
        { curto: "Anilha 10kg", completo: "Anilha Rubber Vermelho Kikos 10kg", qtd: 10, valorUnit: 509.40, ph: 'ANILHA' },
        { curto: "Barra W", completo: "Barra W 1.20m Cromada com Presilha Olímpica Kikos", qtd: 1, valorUnit: 941.40, ph: 'BARRA_W' },
        { curto: "Halter 10kg", completo: "Halter Emborrachado 10kg", qtd: 11, valorUnit: 353.40, ph: 'HALTER' },
      ] },
      { nome: "Armazenamento", itens: [
        { curto: "Suporte para Barras", completo: "Suporte para Barras Olímpicas Kikos", qtd: 1, valorUnit: 2135.40, ph: 'SUP_BARRA' },
        { curto: "Suporte para Halteres", completo: "Suporte para Halteres 10 Pares", qtd: 1, valorUnit: 2616.00, ph: 'SUP_HALTER' },
      ] },
      { nome: "Puxadores", itens: [
        { curto: "Puxador Reto", completo: "Puxador Reto 60cm Lightning Bolt", qtd: 1, valorUnit: 197.99, ph: 'PUX_RETO' },
        { curto: "Puxador Corda", completo: "Puxador Corda Serginho", qtd: 1, valorUnit: 229.20, ph: 'CORDA_SERG' },
        { curto: "Puxador Romano", completo: "Puxador Romano 64cm Serginho", qtd: 1, valorUnit: 605.40, ph: 'PUX_ROMA' },
        { curto: "Puxador Tornozelo", completo: "Puxador Tornozelo Alça Cross Serginho", qtd: 1, valorUnit: 98.40, ph: 'PUX_TORNO' },
        { curto: "Puxador Triângulo", completo: "Puxador Triângulo Serginho", qtd: 1, valorUnit: 490.80, ph: 'TRI_SERG' },
      ] },
      { nome: "Acessórios", itens: [
        { curto: "Step Light", completo: "Step Light Kikos", qtd: 2, valorUnit: 239.40, ph: 'STEP_LIGHT' },
        { curto: "Colchonete", completo: "Colchonete Emborrachado Pequeno", qtd: 2, valorUnit: 213.00, ph: 'COLCHONETE' },
      ] },
    ]
  },
  PRIME: {
    tag: "Combo Premium", nome: "PRIME",
    categorias: [
      { nome: "Cardio", itens: [
        { curto: "Esteira", completo: "Esteira Kikos KX8500iC 220V", qtd: 4, valorUnit: 17034.00, ph: 'ESTEIRA' },
        { curto: "Bike", completo: "Bike Kikos KV8.7i Bivolt", qtd: 1, valorUnit: 4529.40, ph: 'BIKE_KIKOS' },
        { curto: "Bike Spinning", completo: "Bike Spinning Kikos F9", qtd: 1, valorUnit: 7314.00, ph: 'BIKE_SPI' },
        { curto: "Elíptico", completo: "Elíptico Kikos KE4.4", qtd: 1, valorUnit: 8874.00, ph: 'ELIPTICO' },
      ] },
      { nome: "Força", itens: [
        { curto: "Cross Angular", completo: "Cross Angular TTMS21", qtd: 1, valorUnit: 25794.00, ph: 'CROSS_ANG' },
        { curto: "Cross com Smith", completo: "Cross com Smith Linha Kikos Pro TTMS22", qtd: 1, valorUnit: 33774.00, ph: 'CROSS_SMITH' },
        { curto: "Glúteo Máximo", completo: "Glúteo Máximo TTPL94 Linha Kikos Pro", qtd: 1, valorUnit: 8694.00, ph: 'G_MAX' },
        { curto: "Leg Press", completo: "Leg Press 140kg Linha Classic Kikos Pro CLS70", qtd: 1, valorUnit: 18954.00, ph: 'LEG_PRESS' },
        { curto: "Peitoral Dorsal", completo: "Peitoral Dorsal TTS22 80kg Linha Titanium Kikos Pro", qtd: 1, valorUnit: 13314.00, ph: 'PEIT_DORS' },
        { curto: "Cadeira Adutora/Abdutora", completo: "Cadeira Adutora e Abdutora Linha Dual Kikos Pro TTDS7475", qtd: 1, valorUnit: 18474.00, ph: 'AD_ABD' },
        { curto: "Cadeira Flexora/Extensora", completo: "Cadeira Flexora e Extensora Linha Dual Kikos Pro TTDS7172", qtd: 1, valorUnit: 22254.00, ph: 'EX_FLX' },
        { curto: "Pulley com Remada", completo: "Pulley com Remada Linha Dual Kikos Pro TTDS3031", qtd: 1, valorUnit: 16674.00, ph: 'PULLEY' },
      ] },
      { nome: "Bancos", itens: [
        { curto: "Banco Multi Posições", completo: "Banco Multi Posições Kikos A84", qtd: 2, valorUnit: 2394.00, ph: 'BANCO_MULT' },
        { curto: "Banco Supino", completo: "Banco Supino Regulável Fechado 0 a 45 Smart Repair", qtd: 1, valorUnit: 7030.80, ph: 'BANCO_SUP' },
      ] },
      { nome: "Pesos Livres", itens: [
        { curto: "Anilha 10kg", completo: "Anilha Rubber Vermelho Kikos 10kg", qtd: 10, valorUnit: 509.40, ph: 'ANILHA' },
        { curto: "Barra W", completo: "Barra W 1.20m Cromada com Presilha Olímpica Kikos", qtd: 1, valorUnit: 941.40, ph: 'BARRA_W' },
        { curto: "Halter 10kg", completo: "Halter Emborrachado 10kg", qtd: 11, valorUnit: 353.40, ph: 'HALTER' },
      ] },
      { nome: "Armazenamento", itens: [
        { curto: "Suporte para Barras", completo: "Suporte para Barras Olímpicas Kikos", qtd: 1, valorUnit: 2135.40, ph: 'SUP_BARRA' },
        { curto: "Suporte para Halteres", completo: "Suporte para Halteres 10 Pares", qtd: 1, valorUnit: 2616.00, ph: 'SUP_HALTER' },
      ] },
      { nome: "Puxadores", itens: [
        { curto: "Puxador Reto", completo: "Puxador Reto 60cm Lightning Bolt", qtd: 1, valorUnit: 197.99, ph: 'PUX_RETO' },
        { curto: "Puxador Corda", completo: "Puxador Corda Serginho", qtd: 1, valorUnit: 229.20, ph: 'CORDA_SERG' },
        { curto: "Puxador Romano", completo: "Puxador Romano 64cm Serginho", qtd: 1, valorUnit: 605.40, ph: 'PUX_ROMA' },
        { curto: "Puxador Tornozelo", completo: "Puxador Tornozelo Alça Cross Serginho", qtd: 1, valorUnit: 98.40, ph: 'PUX_TORNO' },
        { curto: "Puxador Triângulo", completo: "Puxador Triângulo Serginho", qtd: 1, valorUnit: 490.80, ph: 'TRI_SERG' },
      ] },
      { nome: "Acessórios", itens: [
        { curto: "Step Light", completo: "Step Light Kikos", qtd: 2, valorUnit: 239.40, ph: 'STEP_LIGHT' },
        { curto: "Colchonete", completo: "Colchonete Emborrachado Pequeno", qtd: 2, valorUnit: 213.00, ph: 'COLCHONETE' },
      ] },
    ]
  },
  ELITE: {
    tag: "Combo Elite", nome: "ELITE",
    categorias: [
      { nome: "Cardio", itens: [
        { curto: "Esteira", completo: "Esteira Kikos KX8500iC 220V", qtd: 4, valorUnit: 17034.00, ph: 'ESTEIRA' },
        { curto: "Bike KR9.6", completo: "Bike Kikos KR9.6iX", qtd: 1, valorUnit: 11394.00, ph: 'BIKE_ERGO' },
        { curto: "Bike", completo: "Bike Kikos KV8.7i Bivolt", qtd: 1, valorUnit: 4529.40, ph: 'BIKE_KIKOS' },
        { curto: "Bike Spinning", completo: "Bike Spinning Kikos F9", qtd: 1, valorUnit: 7314.00, ph: 'BIKE_SPI' },
        { curto: "Elíptico", completo: "Elíptico Kikos KE4.4", qtd: 1, valorUnit: 8874.00, ph: 'ELIPTICO' },
        { curto: "Escada Profissional", completo: "Escada Profissional com Display LED KE17.0i", qtd: 1, valorUnit: 29940.00, ph: 'ESCADA' },
      ] },
      { nome: "Força", itens: [
        { curto: "Cross Angular", completo: "Cross Angular TTMS21", qtd: 1, valorUnit: 25794.00, ph: 'CROSS_ANG' },
        { curto: "Cross com Smith", completo: "Cross com Smith Linha Kikos Pro TTMS22", qtd: 1, valorUnit: 33774.00, ph: 'CROSS_SMITH' },
        { curto: "Elevação Pélvica", completo: "Elevação Pélvica TTPL92i", qtd: 1, valorUnit: 15174.00, ph: 'ELEVACAO' },
        { curto: "Glúteo Máximo", completo: "Glúteo Máximo TTPL94 Linha Kikos Pro", qtd: 1, valorUnit: 8694.00, ph: 'G_MAX' },
        { curto: "Leg Press", completo: "Leg Press 140kg Linha Classic Kikos Pro CLS70", qtd: 1, valorUnit: 18954.00, ph: 'LEG_PRESS' },
        { curto: "Peitoral Dorsal", completo: "Peitoral Dorsal TTS22 80kg Linha Titanium Kikos Pro", qtd: 1, valorUnit: 13314.00, ph: 'PEIT_DORS' },
        { curto: "Desenvolvimento", completo: "Desenvolvimento PR23 Linha Plate Load Kikos Pro", qtd: 1, valorUnit: 13854.00, ph: 'DESENV' },
        { curto: "Puxada Alta/Supino", completo: "Puxada Alta com Supino PR35 Dual Linha Plate Load Kikos Pro", qtd: 1, valorUnit: 17034.00, ph: 'PUXADA_ALTA' },
        { curto: "Cadeira Adutora/Abdutora", completo: "Cadeira Adutora e Abdutora Linha Dual Kikos Pro TTDS7475", qtd: 1, valorUnit: 18474.00, ph: 'AD_ABD' },
        { curto: "Cadeira Flexora/Extensora", completo: "Cadeira Flexora e Extensora Linha Dual Kikos Pro TTDS7172", qtd: 1, valorUnit: 22254.00, ph: 'EX_FLX' },
        { curto: "Pulley com Remada", completo: "Pulley com Remada Linha Dual Kikos Pro TTDS3031", qtd: 1, valorUnit: 16674.00, ph: 'PULLEY' },
      ] },
      { nome: "Bancos", itens: [
        { curto: "Banco Multi Posições", completo: "Banco Multi Posições Kikos A84", qtd: 2, valorUnit: 2394.00, ph: 'BANCO_MULT' },
        { curto: "Banco Supino", completo: "Banco Supino Regulável Fechado 0 a 45 Smart Repair", qtd: 1, valorUnit: 7030.80, ph: 'BANCO_SUP' },
      ] },
      { nome: "Pesos Livres", itens: [
        { curto: "Anilha 10kg", completo: "Anilha Rubber Vermelho Kikos 10kg", qtd: 30, valorUnit: 509.40, ph: 'ANILHA' },
        { curto: "Barra W", completo: "Barra W 1.20m Cromada com Presilha Olímpica Kikos", qtd: 1, valorUnit: 941.40, ph: 'BARRA_W' },
        { curto: "Halter 10kg", completo: "Halter Emborrachado 10kg", qtd: 11, valorUnit: 353.40, ph: 'HALTER' },
        { curto: "Dumbell 14kg", completo: "Dumbell Rubber Vermelho Kikos 14kg", qtd: 2, valorUnit: 791.40, ph: 'D_14' },
        { curto: "Dumbell 18kg", completo: "Dumbell Rubber Vermelho Kikos 18kg", qtd: 2, valorUnit: 1019.40, ph: 'D_18' },
        { curto: "Dumbell 22kg", completo: "Dumbell Rubber Vermelho Kikos 22kg", qtd: 2, valorUnit: 1241.40, ph: 'D_22' },
        { curto: "Dumbell 26kg", completo: "Dumbell Rubber Vermelho Kikos 26kg", qtd: 2, valorUnit: 1463.40, ph: 'D_26' },
        { curto: "Dumbell 30kg", completo: "Dumbell Rubber Vermelho Kikos 30kg", qtd: 2, valorUnit: 1691.40, ph: 'D_30' },
      ] },
      { nome: "Armazenamento", itens: [
        { curto: "Suporte para Barras", completo: "Suporte para Barras Olímpicas Kikos", qtd: 1, valorUnit: 2135.40, ph: 'SUP_BARRA' },
        { curto: "Suporte para Halteres", completo: "Suporte para Halteres 10 Pares", qtd: 1, valorUnit: 2616.00, ph: 'SUP_HALTER' },
        { curto: "Rack de Dumbell", completo: "Rack de Dumbell 5 Pares MD6208 Kikos", qtd: 1, valorUnit: 3414.00, ph: 'RACK_DUMBELL' },
      ] },
      { nome: "Puxadores", itens: [
        { curto: "Puxador Reto", completo: "Puxador Reto 60cm Lightning Bolt", qtd: 1, valorUnit: 197.99, ph: 'PUX_RETO' },
        { curto: "Puxador Corda", completo: "Puxador Corda Serginho", qtd: 1, valorUnit: 229.20, ph: 'CORDA_SERG' },
        { curto: "Puxador Romano", completo: "Puxador Romano 64cm Serginho", qtd: 1, valorUnit: 605.40, ph: 'PUX_ROMA' },
        { curto: "Puxador Tornozelo", completo: "Puxador Tornozelo Alça Cross Serginho", qtd: 1, valorUnit: 98.40, ph: 'PUX_TORNO' },
        { curto: "Puxador Triângulo", completo: "Puxador Triângulo Serginho", qtd: 1, valorUnit: 490.80, ph: 'TRI_SERG' },
      ] },
      { nome: "Acessórios", itens: [
        { curto: "Step Light", completo: "Step Light Kikos", qtd: 2, valorUnit: 239.40, ph: 'STEP_LIGHT' },
        { curto: "Colchonete", completo: "Colchonete Emborrachado Pequeno", qtd: 2, valorUnit: 213.00, ph: 'COLCHONETE' },
      ] },
    ]
  },
};

const CATALOGO_ORIGINAL = JSON.parse(JSON.stringify(CATALOGO));

function resetarCatalogo(combo) {
  CATALOGO[combo].categorias.forEach((cat, catIdx) => {
    cat.itens.forEach((item, itemIdx) => {
      item.qtd = CATALOGO_ORIGINAL[combo].categorias[catIdx].itens[itemIdx].qtd;
    });
  });
  COMBOS[combo].parcela = (COMBOS[combo].totalEquip - COMBOS[combo].entrada) / COMBOS[combo].numParcelas;
}

function verificarItensEditados(combo) {
  const atual = CATALOGO[combo];
  const original = CATALOGO_ORIGINAL[combo];
  let alterado = false;
  atual.categorias.forEach((cat, catIdx) => {
    cat.itens.forEach((item, itemIdx) => {
      if (item.qtd !== original.categorias[catIdx].itens[itemIdx].qtd) {
        alterado = true;
      }
    });
  });
  document.getElementById('avisoEdicaoSimulador').style.display = alterado ? 'block' : 'none';
  return alterado;
}

// ── CLOUDCONVERT (mover para backend após testes) ──
const CC_WORKER = 'https://withered-fire-fd56.lumno-contato.workers.dev';

let promoOn = false;
let itensEditados = false;

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

function aplicarPermissoes(role) {
  // DRE: visível para admin e franqueado
  const cardDRE = document.getElementById('tabelaDRE')?.closest('.preview-card');
  if (cardDRE) cardDRE.style.display = (role === 'admin' || role === 'franqueado') ? '' : 'none';

  // Premiação: visível para admin e vendedor
  const cardPremiacao = document.getElementById('prevPremiacao')?.closest('.preview-card');
  if (cardPremiacao) cardPremiacao.style.display = (role === 'admin' || role === 'vendedor') ? '' : 'none';
}

window.aplicarPermissoes = aplicarPermissoes;

function construirTabelaRef(cont, aptos) {
  const corpo = document.getElementById('tabelaRefBody');
  const comboAtivo = document.getElementById('combo').value;
  corpo.innerHTML = '';
  Object.keys(COMBOS).forEach((nome) => {
    const calc = calcularCascata(nome, cont === 'SIM');
    const minApto = aptos > 0 ? calc.mensalidadeMinima / aptos : 0;
    const tr = document.createElement('tr');
    if (nome === comboAtivo) tr.classList.add('ativo');
    tr.innerHTML = `<td>${nome}</td><td>${fmt(calc.mensalidadeMinima)}</td><td>${aptos > 0 ? fmt(minApto) : '—'}</td>`;
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
  document.getElementById('btnGerar').disabled = true;
  document.getElementById('btnGerarPdf').disabled = true;
}

function atualizar() {
  const comboSel = document.getElementById('combo').value;
  verificarItensEditados(comboSel);

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

  const calc = calcularCascata(combo, cont === 'SIM');
  const mensCli = calc.mensalidadeMinima;
  const minApto = aptos > 0 ? mensCli / aptos : 0;

  document.getElementById('minValDisplay').textContent = aptos > 0 ? fmt(minApto) : '—';
  construirTabelaRef(cont, aptos);
  renderizarDRE(combo, cont, aptos, vApto > 0 && aptos > 0 ? vApto * aptos : 0);

  if (!vApto || aptos === 0) { setVazio(); return; }

  const mensNeg = vApto * aptos;
  const contNeg = mensNeg * prazo;

  const contMin = calc.mensalidadeMinima * prazo;
  const extra    = Math.max(0, contNeg - contMin);
  const comBase  = contNeg * BASE;
  const comBonus = extra * BONUS;
  const comTotal = comBase + comBonus;
  const comCSS   = comTotal;
  const pct = vApto / minApto - 1;
  const abaixoDoMinimo = vApto < minApto;

  document.getElementById('btnGerar').disabled = abaixoDoMinimo;
  document.getElementById('btnGerarPdf').disabled = abaixoDoMinimo;

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
  cat.categorias.forEach((c, catIdx) => {
    const card = document.createElement('div');
    card.className = 'modal-equip-card';
    card.innerHTML = `<div class="modal-equip-titulo">${c.nome}</div>` +
      c.itens.map((item, itemIdx) =>
        `<div class="modal-equip-item">
          <span>${item.curto}</span>
          <span class="modal-equip-direita">
            <span class="modal-equip-qty">×${item.qtd}</span>
            <button class="modal-equip-editar" onclick="abrirEdicaoItem('${combo}',${catIdx},${itemIdx})">Editar</button>
          </span>
        </div>`
      ).join('');
    grid.appendChild(card);
  });
  renderizarExtras();
  document.getElementById('modalOverlay').classList.add('aberto');
}

function abrirEdicaoItem(combo, catIdx, itemIdx) {
  const item = CATALOGO[combo].categorias[catIdx].itens[itemIdx];
  document.getElementById('edicaoNomeCompleto').textContent = item.completo;
  document.getElementById('edicaoQtd').value = item.qtd;
  document.getElementById('edicaoOverlay').dataset.combo = combo;
  document.getElementById('edicaoOverlay').dataset.cat = catIdx;
  document.getElementById('edicaoOverlay').dataset.item = itemIdx;
  document.getElementById('edicaoValorUnit').textContent = fmt(item.valorUnit);
  document.getElementById('edicaoValorTotal').textContent = fmt(item.valorUnit * item.qtd);
  document.getElementById('avisoEspacoEdicao').style.display = 'none';
  document.getElementById('edicaoOverlay').classList.add('aberto');
}

function atualizarPreviewValorEdicao() {
  const overlay = document.getElementById('edicaoOverlay');
  const combo   = overlay.dataset.combo;
  const catIdx  = parseInt(overlay.dataset.cat);
  const itemIdx = parseInt(overlay.dataset.item);
  const item = CATALOGO[combo].categorias[catIdx].itens[itemIdx];
  const novaQtd = parseInt(document.getElementById('edicaoQtd').value) || 0;
  document.getElementById('edicaoValorTotal').textContent = fmt(item.valorUnit * novaQtd);

  const aviso = document.getElementById('avisoEspacoEdicao');
  if (novaQtd !== item.qtd) {
    aviso.style.display = 'block';
  } else {
    aviso.style.display = 'none';
  }
}
function fecharEdicaoItem() {
  document.getElementById('edicaoOverlay').classList.remove('aberto');
}

function abrirModalExtra() {
  document.getElementById('extraCombo').value = 'UNO';
  atualizarSelectItemExtra();
  document.getElementById('extraQtd').value = 1;
  document.getElementById('extraOverlay').classList.add('aberto');
}

function fecharModalExtra() {
  document.getElementById('extraOverlay').classList.remove('aberto');
}

function atualizarSelectItemExtra() {
  const combo = document.getElementById('extraCombo').value;
  const sel = document.getElementById('extraItem');
  sel.innerHTML = '';
  CATALOGO[combo].categorias.forEach((cat, catIdx) => {
    cat.itens.forEach((item, itemIdx) => {
      const opt = document.createElement('option');
      opt.value = `${catIdx}|${itemIdx}`;
      opt.textContent = `${item.curto} (${cat.nome})`;
      sel.appendChild(opt);
    });
  });
}

function confirmarExtra() {
  const comboAtivo  = document.getElementById('combo').value;
  const comboOrigem = document.getElementById('extraCombo').value;
  const [catIdx, itemIdx] = document.getElementById('extraItem').value.split('|').map(Number);
  const qtd = parseInt(document.getElementById('extraQtd').value);

  if (!qtd || qtd <= 0) {
    alert('Informe uma quantidade válida.');
    return;
  }

  const item = CATALOGO[comboOrigem].categorias[catIdx].itens[itemIdx];

  // Verifica se esse equipamento (mesmo placeholder) já existe na lista do combo ativo
  let itemExistente = null;
  CATALOGO[comboAtivo].categorias.forEach(cat => {
    cat.itens.forEach(it => {
      if (it.ph === item.ph) itemExistente = it;
    });
  });

  if (itemExistente) {
    // Já existe no combo ativo: apenas soma a quantidade no item original,
    // sem criar entrada em equipamentosExtras (não vira slide separado)
    itemExistente.qtd += qtd;
  } else {
    // Não existe no combo ativo: segue o fluxo normal de extra (slide copiado do ELITE)
    equipamentosExtras.push({
      combo: comboOrigem,
      curto: item.curto,
      valorUnit: item.valorUnit,
      qtd,
    });
  }

  fecharModalExtra();
  recalcularParcela(comboAtivo);
  verificarItensEditados(comboAtivo);
  atualizar();
  renderizarExtras();
  abrirModal();
}

function removerExtra(index) {
  equipamentosExtras.splice(index, 1);
  recalcularParcela(document.getElementById('combo').value);
  atualizar();
  renderizarExtras();
}

function renderizarExtras() {
  const div = document.getElementById('listaExtras');
  if (!div) return;
  if (equipamentosExtras.length === 0) {
    div.innerHTML = '<div style="font-size:12px;color:var(--muted);">Nenhum equipamento extra adicionado.</div>';
    return;
  }
  div.innerHTML = equipamentosExtras.map((ex, i) => `
    <div class="extra-item-row">
      <span>${ex.curto} <strong>×${ex.qtd}</strong> <span style="color:var(--muted);font-size:11px;">(${ex.combo})</span></span>
      <button class="extra-item-remover" onclick="removerExtra(${i})">✕</button>
    </div>
  `).join('');
}

function confirmarEdicaoItem() {
  const overlay = document.getElementById('edicaoOverlay');
  const combo   = overlay.dataset.combo;
  const catIdx  = parseInt(overlay.dataset.cat);
  const itemIdx = parseInt(overlay.dataset.item);
  const novaQtd = parseInt(document.getElementById('edicaoQtd').value);

  if (novaQtd === undefined || novaQtd === null || isNaN(novaQtd) || novaQtd < 0) {
    alert('Informe uma quantidade válida.');
    return;
  }

  CATALOGO[combo].categorias[catIdx].itens[itemIdx].qtd = novaQtd;
  recalcularParcela(combo);
  verificarItensEditados(combo);
  atualizar();
  fecharEdicaoItem();
  abrirModal();
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

const SLIDE_MAP = {
  UNO: {
    BIKE_KIKOS: 13, ESTACAO_MULT: 14, HALTER: 16, ANILHA: 16, BARRA_W: 17,
    SUP_BARRA: 18, SUP_HALTER: 18, TRI_SERG: 19, CORDA_SERG: 19, PUX_ROMA: 19,
    PUX_RETO: 20, PUX_TORNO: 20, STEP_LIGHT: 21, COLCHONETE: 21,
  },
  DUO: {
    ESTEIRA: 12, BIKE_KIKOS: 13, BIKE_SPI: 14, CROSS_SMITH: 15, AD_ABD: 16, EX_FLX: 17,
    BANCO_MULT: 18, BANCO_SUP: 19, HALTER: 20, ANILHA: 20, BARRA_W: 21,
    SUP_HALTER: 22, SUP_BARRA: 22, TRI_SERG: 23, CORDA_SERG: 23, PUX_ROMA: 23,
    PUX_RETO: 24, PUX_TORNO: 24, COLCHONETE: 25, STEP_LIGHT: 25,
  },
  TRIPLE: {
    ESTEIRA: 12, BIKE_KIKOS: 13, BIKE_SPI: 14, ELIPTICO: 15, CROSS_SMITH: 16, LEG_PRESS: 17,
    PEIT_DORS: 18, AD_ABD: 19, EX_FLX: 20, PULLEY: 21, BANCO_MULT: 22, BANCO_SUP: 23,
    HALTER: 24, ANILHA: 24, BARRA_W: 25, SUP_HALTER: 26, SUP_BARRA: 26,
    PUX_ROMA: 27, CORDA_SERG: 27, TRI_SERG: 27, PUX_RETO: 28, PUX_TORNO: 28,
    COLCHONETE: 29, STEP_LIGHT: 29,
  },
  PRIME: {
    ESTEIRA: 12, BIKE_KIKOS: 13, BIKE_SPI: 14, ELIPTICO: 15, CROSS_ANG: 16, CROSS_SMITH: 17,
    G_MAX: 18, LEG_PRESS: 19, PEIT_DORS: 20, AD_ABD: 21, EX_FLX: 22, PULLEY: 23,
    BANCO_MULT: 24, BANCO_SUP: 25, HALTER: 26, ANILHA: 26, BARRA_W: 27,
    SUP_BARRA: 28, SUP_HALTER: 28, TRI_SERG: 29, CORDA_SERG: 29, PUX_ROMA: 29,
    PUX_RETO: 30, PUX_TORNO: 30, COLCHONETE: 31, STEP_LIGHT: 31,
  },
  ELITE: {
    ESTEIRA: 12, BIKE_ERGO: 13, BIKE_KIKOS: 14, BIKE_SPI: 15, ELIPTICO: 16, ESCADA: 17,
    CROSS_ANG: 18, CROSS_SMITH: 19, ELEVACAO: 20, G_MAX: 21, LEG_PRESS: 22, PEIT_DORS: 23,
    DESENV: 24, PUXADA_ALTA: 25, AD_ABD: 26, EX_FLX: 27, PULLEY: 28, BANCO_MULT: 29,
    BANCO_SUP: 30, HALTER: 31, ANILHA: 31, D_14: 32, D_18: 32, D_22: 32,
    D_26: 33, D_30: 33, BARRA_W: 34, SUP_HALTER: 35, SUP_BARRA: 35, RACK_DUMBELL: 36,
    PUX_ROMA: 37, CORDA_SERG: 37, TRI_SERG: 37, PUX_RETO: 38, PUX_TORNO: 38,
    COLCHONETE: 39, STEP_LIGHT: 39,
  },
};

const EXTRAS_SLIDE_MAP = {
  UNO: 22,
  DUO: 26,
  TRIPLE: 30,
  PRIME: 32,
  ELITE: 40,
};

const VIDEO_URLS = {
  TRIPLE: 'https://youtu.be/nAK4zltVKNc',
  PRIME:  'https://youtu.be/CkySJDdGABY',
  ELITE:  'https://youtu.be/FvkxhRE5KDo',
};

function proximoNumeroSlide(zip) {
  const nums = Object.keys(zip.files)
    .map(f => f.match(/^ppt\/slides\/slide(\d+)\.xml$/))
    .filter(Boolean)
    .map(m => parseInt(m[1]));
  return Math.max(...nums) + 1;
}

function proximoRid(relsXml) {
  const nums = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  return Math.max(0, ...nums) + 1;
}

function proximoSldId(presentationXml) {
  const nums = [...presentationXml.matchAll(/<p:sldId id="(\d+)"/g)].map(m => parseInt(m[1]));
  return Math.max(0, ...nums) + 1;
}

// Remove um slide inteiro do combo (usado quando qtd = 0 para todos os itens daquele slide)
async function removerSlideDoZip(zip, slideNum) {
  const slidePath = `ppt/slides/slide${slideNum}.xml`;
  const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
  if (!zip.file(slidePath)) return;

  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  const relMatch = presRels.match(new RegExp(`<Relationship Id="(rId\\d+)"[^>]*Target="slides/slide${slideNum}\\.xml"/>`));
  if (!relMatch) return;
  const rId = relMatch[1];

  presRels = presRels.replace(relMatch[0], '');
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  let presXml = await zip.file('ppt/presentation.xml').async('string');
  presXml = presXml.replace(new RegExp(`<p:sldId id="\\d+" r:id="${rId}"/>`), '');
  zip.file('ppt/presentation.xml', presXml);

  let contentTypes = await zip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(new RegExp(`<Override PartName="/ppt/slides/slide${slideNum}\\.xml"[^>]*/>`), '');
  zip.file('[Content_Types].xml', contentTypes);

  zip.remove(slidePath);
  zip.remove(relsPath);
}

// Copia um slide do template ELITE para o zip de destino, colocando as quantidades corretas
async function copiarSlideParaZip(zipOrigem, slideNumOrigem, zipDestino, quantidadesOverride, posicaoAposRid) {
  const slidePathOrigem = `ppt/slides/slide${slideNumOrigem}.xml`;
  let slideXml = await zipOrigem.file(slidePathOrigem).async('string');
  let slideRelsXml = await zipOrigem.file(`ppt/slides/_rels/slide${slideNumOrigem}.xml.rels`).async('string');

  Object.entries(quantidadesOverride).forEach(([chave, valor]) => {
    slideXml = slideXml.replaceAll(`[${chave}]`, String(valor));
  });

  const imgMatch = slideRelsXml.match(/Target="\.\.\/media\/([^"]+)"/);
  if (imgMatch) {
    const nomeImagemOrigem = imgMatch[1];
    const imgData = await zipOrigem.file(`ppt/media/${nomeImagemOrigem}`).async('uint8array');
    let novoNomeImagem = nomeImagemOrigem;
    let i = 0;
    while (zipDestino.file(`ppt/media/${novoNomeImagem}`)) {
      i++;
      novoNomeImagem = `extra_${i}_${nomeImagemOrigem}`;
    }
    zipDestino.file(`ppt/media/${novoNomeImagem}`, imgData);
    slideRelsXml = slideRelsXml.replace(`../media/${nomeImagemOrigem}`, `../media/${novoNomeImagem}`);
  }

  const novoSlideNum = proximoNumeroSlide(zipDestino);
  zipDestino.file(`ppt/slides/slide${novoSlideNum}.xml`, slideXml);
  zipDestino.file(`ppt/slides/_rels/slide${novoSlideNum}.xml.rels`, slideRelsXml);

  let presRels = await zipDestino.file('ppt/_rels/presentation.xml.rels').async('string');
  const novoRid = 'rId' + proximoRid(presRels);
  presRels = presRels.replace(
    '</Relationships>',
    `<Relationship Id="${novoRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${novoSlideNum}.xml"/></Relationships>`
  );
  zipDestino.file('ppt/_rels/presentation.xml.rels', presRels);

  let contentTypes = await zipDestino.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(
    '</Types>',
    `<Override PartName="/ppt/slides/slide${novoSlideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
  );
  zipDestino.file('[Content_Types].xml', contentTypes);

  let presXml = await zipDestino.file('ppt/presentation.xml').async('string');
  const novoSldId = proximoSldId(presXml);
  const novaEntrada = `<p:sldId id="${novoSldId}" r:id="${novoRid}"/>`;

  if (posicaoAposRid) {
    // Insere logo depois do sldId que referencia posicaoAposRid
    const regexAlvo = new RegExp(`(<p:sldId id="\\d+" r:id="${posicaoAposRid}"/>)`);
    presXml = presXml.replace(regexAlvo, `$1${novaEntrada}`);
  } else {
    const ultimaOcorrencia = presXml.lastIndexOf('<p:sldId ');
    presXml = presXml.slice(0, ultimaOcorrencia) + novaEntrada + presXml.slice(ultimaOcorrencia);
  }

  zipDestino.file('ppt/presentation.xml', presXml);
  return novoRid;
}

// ── GERA O ZIP COM O PPTX PREENCHIDO (reutilizado por PPTX e PDF) ──
async function gerarZip(combo, nomeRaw, aptos, vApto, prazo, promoAtiva, mesesPromo, valorPromo, temContainer) {
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

  const mesesPromoNum = promoAtiva ? Math.min(parseInt(mesesPromo) || 0, 6) : 0;
  const promoMesTxt   = mesesPromoNum > 0
    ? `${mesesPromoNum} ${mesesPromoNum === 1 ? 'mês' : 'meses'}`
    : 'Não se aplica';
  const promoValorTxt = (promoAtiva && valorPromo > 0)
    ? 'R$ ' + fmtBRL(valorPromo) + ' por unidade'
    : 'Não se aplica';

  const valores = {
    NOME:        nome,
    VALOR:       mensApto,
    VALOR_COND:  mensCond,
    UNIDADES:    aptosStr,
    PRAZO:       `${prazo} meses`,
    PROMO_MES:   promoMesTxt,
    PROMO_VALOR: promoValorTxt,
  };

  // Marca se deve remover o bloco de período promocional do slide de resumo
  const removerBlocoPromo = !(promoAtiva && mesesPromoNum > 0);

// Adiciona quantidades dos equipamentos do combo selecionado
  const catCombo = CATALOGO[combo];
  if (catCombo) {
    catCombo.categorias.forEach(cat => {
      cat.itens.forEach(item => {
        if (item.ph) valores[item.ph] = String(item.qtd);
      });
    });
  }

// Placeholder de texto único fica sempre vazio agora — os extras viram slides reais
  valores.EQUIP_EXTRA = '';

  const slides = Object.keys(zip.files).filter(
    f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml')
  );

  for (const slidePath of slides) {
    let xml = await zip.file(slidePath).async('string');
    Object.entries(valores).forEach(([chave, valor]) => {
      xml = xml.replaceAll(`[${chave}]`, valor);
    });

    // Placeholder [EXTRAS]: substitui o <a:r> por múltiplas linhas (título + um item por linha),
    // ou esvazia o texto quando não há equipamentos extras (evita mostrar o placeholder literal, caso o slide não seja removido)
    if (xml.includes('[EXTRAS]')) {
      const runMatch = xml.match(/<a:r>((?:(?!<\/a:r>).)*)\[EXTRAS\]((?:(?!<\/a:r>).)*)<\/a:r>/s);
      if (runMatch) {
        const runCompleto = runMatch[0];
        const rPrMatch = runCompleto.match(/<a:rPr[^>]*>.*?<\/a:rPr>|<a:rPr[^>]*\/>/s);
        const rPr = rPrMatch ? rPrMatch[0] : '';

        if (equipamentosExtras.length > 0) {
          const linhas = ['Equipamentos Extras:'];
          equipamentosExtras.forEach(ex => linhas.push(`${ex.curto} - ${ex.qtd}`));
          const novoConteudo = linhas.map(txt => `<a:r>${rPr}<a:t>${txt}</a:t></a:r>`).join('<a:br/>');
          xml = xml.replace(runCompleto, novoConteudo);
        } else {
          const runVazio = `<a:r>${rPr}<a:t></a:t></a:r>`;
          xml = xml.replace(runCompleto, runVazio);
        }
      }
    }


   // Esvazia o texto do bloco "Período Promocional" quando não estiver ativo (sem remover a estrutura do parágrafo)
    if (removerBlocoPromo && xml.includes('Promocional') && xml.includes('- ' + promoMesTxt)) {
      const idxPromo = xml.indexOf('Promocional');
      const inicioParagrafo = xml.lastIndexOf('<a:p>', idxPromo);
      const fimBusca = xml.indexOf(promoValorTxt, idxPromo);
      if (inicioParagrafo !== -1 && fimBusca !== -1) {
        const idxFechamento = xml.indexOf('</a:p>', fimBusca);
        if (idxFechamento !== -1) {
          const fimParagrafo = idxFechamento + '</a:p>'.length;
          const paragrafoOriginal = xml.slice(inicioParagrafo, fimParagrafo);
          // Remove todo o texto visível (<a:t>...</a:t>) mas mantém a estrutura do parágrafo
          const paragrafoVazio = paragrafoOriginal.replace(/<a:t>[^<]*<\/a:t>/g, '<a:t></a:t>');
          xml = xml.slice(0, inicioParagrafo) + paragrafoVazio + xml.slice(fimParagrafo);
        }
      }
    }

  // Esvazia todo o texto da caixa que contém "Incluso na estrutura do Container..." quando o container NÃO for usado.
    // Ancora pelo texto único "<a:t>Incluso</a:t>" (não pelo nome do shape, que está duplicado no template — "TextBox 15" existe em duas caixas diferentes)
    // e localiza os limites reais do shape (<p:sp>...</p:sp>) ao redor desse texto, sem depender do nome.
    if (!temContainer) {
      const idxIncluso = xml.indexOf('<a:t>Incluso</a:t>');
      if (idxIncluso !== -1) {
        const inicioShape = xml.lastIndexOf('<p:sp>', idxIncluso);
        const fechamentoShape = xml.indexOf('</p:sp>', idxIncluso);
        if (inicioShape !== -1 && fechamentoShape !== -1) {
          const fimShape = fechamentoShape + '</p:sp>'.length;
          const shapeOriginal = xml.slice(inicioShape, fimShape);
          const shapeVazio = shapeOriginal.replace(/<a:t>[^<]*<\/a:t>/g, '<a:t></a:t>');
          xml = xml.slice(0, inicioShape) + shapeVazio + xml.slice(fimShape);
        }
      }

      // Desce a caixa "Total de unidades / Valor total / Prazo" para ocupar o espaço
      // que a caixa do Container deixou vazia, alinhando com o retângulo do BÔNUS logo abaixo.
      xml = xml.replace('y="1506794"', 'y="3898574"');
    }

    zip.file(slidePath, xml);
  }

  // ── Área invisível clicável sobre o botão "Assista o vídeo" (slide final é 100% imagem, sem texto editável) ──
  const VIDEO_SLIDE_MAP = { TRIPLE: 32, PRIME: 34, ELITE: 42 };
  const slideVideoNum = VIDEO_SLIDE_MAP[combo];
  if (slideVideoNum && VIDEO_URLS[combo]) {
    const slideVideoPath = `ppt/slides/slide${slideVideoNum}.xml`;
    const slideVideoFile = zip.file(slideVideoPath);
    if (slideVideoFile) {
      let xmlVideo = await slideVideoFile.async('string');

      const relsPath = `ppt/slides/_rels/slide${slideVideoNum}.xml.rels`;
      const relsFileExistente = zip.file(relsPath);
      let relsXml = relsFileExistente
        ? await relsFileExistente.async('string')
        : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
      const novoRid = 'rId' + proximoRid(relsXml);
      relsXml = relsXml.replace(
        '</Relationships>',
        `<Relationship Id="${novoRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${VIDEO_URLS[combo]}" TargetMode="External"/></Relationships>`
      );
      zip.file(relsPath, relsXml);

      // testeCoioordenadas medidas sobre a arte (1920x1080, mesma posição nos 3 combos): cobre todo o banner "Assista o vídeo... Clique aqui"
      const areaClicavel = `<p:sp><p:nvSpPr><p:cNvPr id="500" name="AreaClicavelVideo"><a:hlinkClick r:id="${novoRid}"/></p:cNvPr><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="9429750" y="7981950"/><a:ext cx="8763000" cy="1181100"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;

      xmlVideo = xmlVideo.replace('</p:spTree>', areaClicavel + '</p:spTree>');
      zip.file(slideVideoPath, xmlVideo);
    }
  }

  // ── Remover slides de equipamentos com quantidade zero ──
  const mapaCombo = SLIDE_MAP[combo];
  if (mapaCombo) {
    const slidesPorNum = {};
    catCombo.categorias.forEach(cat => {
      cat.itens.forEach(item => {
        if (item.ph && mapaCombo[item.ph] != null) {
          const num = mapaCombo[item.ph];
          if (!slidesPorNum[num]) slidesPorNum[num] = [];
          slidesPorNum[num].push(item.qtd);
        }
      });
    });
    for (const [slideNum, qtds] of Object.entries(slidesPorNum)) {
      const todosZerados = qtds.every(q => q === 0);
      if (todosZerados) {
        await removerSlideDoZip(zip, parseInt(slideNum));
      }
    }
  }

  // ── Adicionar slides com foto para equipamentos extras que não existem no combo ativo ──
  // (sempre copiados do template ELITE, que contém todos os equipamentos possíveis)
  if (equipamentosExtras.length > 0) {
    if (!window._eliteZipCache) {
      const respElite = await fetch('templates/elite.pptx');
      const bufElite = await respElite.arrayBuffer();
      window._eliteZipCache = await JSZip.loadAsync(bufElite);
    }
    const eliteZip = window._eliteZipCache;
    const mapaElite = SLIDE_MAP.ELITE;

    // Descobre o número do último slide de equipamento ainda existente no combo (após remoções)
    const numerosDeEquipamento = Object.values(mapaCombo || {});
    const maiorSlideEquipCombo = numerosDeEquipamento.length > 0 ? Math.max(...numerosDeEquipamento) : null;

    let ridReferencia = null;
    if (maiorSlideEquipCombo) {
      const presRelsAtual = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
      // Procura pelo maior slide de equipamento que ainda existe (pode ter sido removido se zerado)
      for (let n = maiorSlideEquipCombo; n >= 1; n--) {
        const m = presRelsAtual.match(new RegExp(`<Relationship Id="(rId\\d+)"[^>]*Target="slides/slide${n}\\.xml"/>`));
        if (m) { ridReferencia = m[1]; break; }
      }
    }

    // Agrupa os extras por slide de origem (alguns itens dividem o mesmo slide no ELITE)
    const extrasPorSlide = {};
    equipamentosExtras.forEach(ex => {
      const ph = Object.keys(mapaElite).find(chave => {
        return CATALOGO.ELITE.categorias.some(cat =>
          cat.itens.some(it => it.curto === ex.curto && it.ph === chave)
        );
      });
      if (!ph) return;
      const slideNum = mapaElite[ph];
      if (!extrasPorSlide[slideNum]) extrasPorSlide[slideNum] = {};
      extrasPorSlide[slideNum][ph] = ex.qtd;
    });

    for (const [slideNum, phsComQtd] of Object.entries(extrasPorSlide)) {
      const todosPhsDoSlide = Object.keys(mapaElite).filter(ph => mapaElite[ph] === parseInt(slideNum));
      const overrideCompleto = {};
      todosPhsDoSlide.forEach(ph => {
        overrideCompleto[ph] = phsComQtd[ph] != null ? phsComQtd[ph] : 0;
      });
      const novoRidInserido = await copiarSlideParaZip(eliteZip, parseInt(slideNum), zip, overrideCompleto, ridReferencia);
      ridReferencia = novoRidInserido; // próximo extra entra logo depois deste
    }
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
  } else {
    const comboV = document.getElementById('combo').value;
    const contV  = document.getElementById('container').value;
    const minAptoV = calcularCascata(comboV, contV === 'SIM').mensalidadeMinima / (aptos || 1);
    if (aptos > 0 && vApto < minAptoV) {
      setErro('valorApto', `Valor abaixo do mínimo permitido para este combo (${fmt(minAptoV)} por unidade).`);
      primeiroInvalido = primeiroInvalido || 'valorApto';
      valido = false;
    }
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
      const mensCliV = calcularCascata(combo, cont === 'SIM').mensalidadeMinima;
      const minApto = aptosV > 0 ? mensCliV / aptosV : 0;

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
  const mesesPromo = document.getElementById('mesesPromo').value;
  const valorPromo = parseFloat(document.getElementById('mensPromo').value) || 0;
  const temContainer = document.getElementById('container').value === 'SIM';

  if (!validarCampos()) return;
  if (!verificarRateLimit()) return;
  if (COMBOS_PENDENTES.includes(combo)) { alert('Combo ' + combo + ' ainda não disponível.'); return; }

  // Estado de carregamento
  btn.classList.add('loading');
  btn.disabled = true;
  lblBtn.textContent = 'Gerando proposta...';

  try {
    const { zip } = await gerarZip(combo, nomeRaw, aptos, vApto, prazo, promoOn, mesesPromo, valorPromo, temContainer);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      platform: 'DOS'
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
function atualizarStatusAba(aba, msg) {
  if (aba && !aba.closed && typeof aba.trocarStatus === 'function') {
    aba.trocarStatus(msg);
  }
}

function abrirAbaLoading() {
  const novaAba = window.open('', '_blank');
  if (novaAba) {
    novaAba.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Gerando PDF...</title>
        <style>
          body { font-family: Roboto, Arial, sans-serif; background:#000; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; }
          .spinner { width:130px; height:130px; border:10px solid #333; border-top-color:#fed205; border-radius:50%; animation:girar 1s linear infinite; margin-bottom:40px; }
          @keyframes girar { to { transform:rotate(360deg); } }
          .status-wrap { position:relative; height:70px; overflow:hidden; width:90%; max-width:600px; text-align:center; padding:0 12px; }
          #statusMsg {
            position:absolute; left:0; width:100%; margin:0; font-size:38px; font-weight:600; line-height:1.2;
            transition: transform 0.35s ease, opacity 0.35s ease;
            transform: translateY(0); opacity:1;
          }
          #statusMsg.saindo { transform: translateY(-28px); opacity:0; }
          #statusMsg.antes-entrar { transition:none; transform: translateY(28px); opacity:0; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div class="status-wrap"><p id="statusMsg">Gerando sua proposta em PDF...</p></div>
        <script>
          function trocarStatus(txt) {
            var el = document.getElementById('statusMsg');
            el.classList.add('saindo');
            setTimeout(function() {
              el.textContent = txt;
              el.classList.add('antes-entrar');
              el.classList.remove('saindo');
              void el.offsetWidth;
              el.classList.remove('antes-entrar');
            }, 350);
          }
        </script>
      </body>
      </html>
    `);
    novaAba.document.close();
  }
  return novaAba;
}

async function gerarPDF() {
  const btnPdf  = document.getElementById('btnGerarPdf');
  const lblPdf  = btnPdf.querySelector('.btn-lbl');
  if (btnPdf.disabled) return;
  const nomeRaw = (document.getElementById('nomeCondominio').value || '').trim();
  const aptos   = parseFloat(document.getElementById('aptos').value) || 0;
  const vApto   = parseFloat(document.getElementById('valorApto').value) || 0;
  const combo   = document.getElementById('combo').value;
  const prazo = parseInt(document.getElementById('prazo').value);
  const mesesPromo = document.getElementById('mesesPromo').value;
  const valorPromo = parseFloat(document.getElementById('mensPromo').value) || 0;
  const temContainer = document.getElementById('container').value === 'SIM';

  if (!validarCampos()) return;
  if (!verificarRateLimit()) return;
  if (COMBOS_PENDENTES.includes(combo)) { alert('Combo ' + combo + ' ainda não disponível.'); return; }

  // Abre a aba já no clique do usuário (síncrono, para não ser bloqueada como popup)
  // e escreve uma tela de loading nela até o PDF ficar pronto
  const novaAba = abrirAbaLoading();

  // Estado de carregamento
  btnPdf.classList.add('loading');
  btnPdf.disabled = true;
  lblPdf.textContent = 'Gerando PDF...';

  try {
    // 1. Gerar o PPTX preenchido em memória
    const { zip } = await gerarZip(combo, nomeRaw, aptos, vApto, prazo, promoOn, mesesPromo, valorPromo, temContainer);
    const pptxBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      compression: 'STORE'
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
    atualizarStatusAba(novaAba, 'Enviando arquivo para conversão...');

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
    atualizarStatusAba(novaAba, 'Convertendo para PDF...');
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

    atualizarStatusAba(novaAba, 'Quase lá, finalizando...');
    await salvarNoStorage(pdfBlob, `Proposta Duo Fitness ${combo} - ${nomeRaw}.pdf`, 'PDF');
    salvarHistorico('PDF');
    await registrarLog(combo, nomeRaw, 'PDF', `Proposta Duo Fitness ${combo} - ${nomeRaw}.pdf`);

    // Exibe o PDF na aba já aberta, mantendo o simulador na aba original
    const url = URL.createObjectURL(pdfBlob);
    if (novaAba) {
      novaAba.location.href = url;
    } else {
      // fallback caso o navegador tenha bloqueado a abertura antecipada
      window.open(url, '_blank', 'noopener');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);

    } catch(e) {
    if (novaAba) novaAba.close();
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

  Object.keys(COMBOS).forEach(combo => resetarCatalogo(combo));
  equipamentosExtras = [];
  itensEditados = false;
  document.getElementById('avisoEdicaoSimulador').style.display = 'none';

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

async function irParaAdmin() {
  const { getFirestore, collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const user = auth.currentUser;
  if (!user) return;
  const db2 = getFirestore(fbApp);
  const q = query(collection(db2, 'admins'), where('email', '==', user.email.toLowerCase()));
  const snap = await getDocs(q);
  if (!snap.empty) {
    window.open('admin.html', '_blank');
  } else {
    alert('Você não tem acesso ao painel administrativo.');
  }
}

// ── EXPOR FUNÇÕES GLOBAIS (necessário para type="module") ──
window.togglePromo      = togglePromo;
window.atualizar        = atualizar;
window.resetarCatalogo  = resetarCatalogo;
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
window.irParaAdmin = irParaAdmin;
window.abrirEdicaoItem    = abrirEdicaoItem;
window.fecharEdicaoItem   = fecharEdicaoItem;
window.confirmarEdicaoItem = confirmarEdicaoItem;
window.atualizarPreviewValorEdicao = atualizarPreviewValorEdicao;
window.abrirModalExtra = abrirModalExtra;
window.fecharModalExtra = fecharModalExtra;
window.atualizarSelectItemExtra = atualizarSelectItemExtra;
window.confirmarExtra = confirmarExtra;
window.removerExtra = removerExtra;
window.renderizarExtras = renderizarExtras;


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
