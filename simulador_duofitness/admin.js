import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCG6nZw4X8KVPxy_u3CFGuz1COVBPQPHlQ",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.firebasestorage.app",
  messagingSenderId: "1029705610423",
  appId: "1:1029705610423:web:c8a26f127a89a1a7b1c932"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

let usuarioAtual = null;
let todosLogs = [];
let todasPropostas = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 20;
let propostasFiltradas = [];

// ── VERIFICAR ADMIN ──
async function verificarAdmin(email) {
  const q = query(collection(db, 'admins'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── AUTH STATE ──
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'login-admin.html'; return; }

  const isAdmin = await verificarAdmin(user.email);
  if (!isAdmin) {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('acessoNegado').classList.add('visivel');
    return;
  }

  usuarioAtual = user;

  // Preencher sidebar
  const nome = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
  document.getElementById('sidebarNome').textContent = user.displayName || nome;
  document.getElementById('sidebarEmail').textContent = user.email;
  document.getElementById('sidebarAvatar').textContent = nome[0].toUpperCase();

  // Registrar online
  await registrarOnline(user);

  // Carregar dados
  await Promise.all([
  carregarPropostas(),
  carregarUsuarios(),
  carregarLogs(),
  carregarLogsLogin(),
]);

  // Listener em tempo real para usuários online
  ouvirOnline();

  document.getElementById('loadingOverlay').style.display = 'none';
});

// ── USUÁRIOS ONLINE ──
async function registrarOnline(user) {
  const nome = user.displayName || user.email.split('@')[0];
  const docRef = doc(db, 'usuarios_online', user.uid);

  async function heartbeat() {
    await setDoc(docRef, {
      email: user.email,
      nome: nome,
      ultimoAcesso: serverTimestamp(),
    });
  }

  await heartbeat();
  // Atualiza a cada 30 segundos
  setInterval(heartbeat, 30000);

  // Remove ao sair pelo botão
  window.addEventListener('beforeunload', () => {
    deleteDoc(docRef);
  });
}

function ouvirOnline() {
  onSnapshot(collection(db, 'usuarios_online'), snap => {
    const count = snap.size;
    document.getElementById('onlineCount').textContent = count;
    document.getElementById('badgeOnline').textContent = count;
    document.getElementById('metricaOnline').textContent = count;

    const grid = document.getElementById('onlineGrid');
    if (count === 0) {
      grid.innerHTML = '<div class="vazio">Ninguém online no momento.</div>';
      return;
    }
    grid.innerHTML = '';
    snap.forEach(d => {
      const u = d.data();
      const inicial = (u.nome || u.email)[0].toUpperCase();
      const card = document.createElement('div');
      card.className = 'online-card';
      card.innerHTML = `
        <div class="online-card-avatar">${inicial}</div>
        <div>
          <div class="online-card-nome">${u.nome || '—'}</div>
          <div class="online-card-email">${u.email}</div>
          <div class="online-card-tempo">● Online agora</div>
        </div>`;
      grid.appendChild(card);
    });
  });
}

// ── PROPOSTAS ──
async function carregarPropostas() {
  const q = query(collection(db, 'logs_propostas'), orderBy('data', 'desc'), limit(200));
  const snap = await getDocs(q);
  todasPropostas = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Métricas
  const total = todasPropostas.length;
  const pptx  = todasPropostas.filter(p => p.tipo === 'PPTX').length;
  const pdf   = todasPropostas.filter(p => p.tipo === 'PDF').length;
  const mes   = todasPropostas.filter(p => {
    const d = new Date(p.data);
    const agora = new Date();
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  }).length;

  document.getElementById('metricaTotal').textContent = total;
  document.getElementById('metricaPptx').textContent = pptx;
  document.getElementById('metricaPdf').textContent = pdf;
  document.getElementById('metricaMes').textContent = mes;

  // Popular filtro de usuários
  const emails = [...new Set(todasPropostas.map(p => p.vendedor))];
  const sel = document.getElementById('filtroUsuario');
  emails.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e; opt.textContent = e;
    sel.appendChild(opt);
  });

  renderizarPropostas(todasPropostas);
}

function renderizarPropostas(lista) {
  propostasFiltradas = lista;
  paginaAtual = 1;
  renderizarPagina();
}

function renderizarPagina() {
  const tbody = document.getElementById('tabelaPropostas');
  const total = propostasFiltradas.length;
  const totalPaginas = Math.ceil(total / ITENS_POR_PAGINA);
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const pagina = propostasFiltradas.slice(inicio, fim);
  const isMobile = window.innerWidth <= 768;

  if (pagina.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhuma proposta encontrada.</td></tr>';
    document.getElementById('paginacaoInfo').textContent = '';
    return;
  }

  if (isMobile) {
    // Esconder thead
    const thead = tbody.closest('table').querySelector('thead');
    if (thead) thead.style.display = 'none';

    tbody.innerHTML = pagina.map(p => {
      const tipo = p.tipo === 'PDF'
        ? '<span class="badge badge-pdf">PDF</span>'
        : '<span class="badge badge-pptx">PPTX</span>';
      const data = p.dataFormatada || new Date(p.data).toLocaleString('pt-BR');
      return `<tr style="display:flex;flex-direction:column;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);gap:4px;">
        <td style="border:none;padding:0;font-size:14px;font-weight:700;color:#e8eaf0;"><strong>${p.condominio || '—'}</strong></td>
        <td style="border:none;padding:0;font-size:12px;color:#9ca3af;">${p.combo || '—'} · ${p.vendedor || '—'}</td>
        <td style="border:none;padding:0;font-size:11px;color:#6b7280;">${data}</td>
        <td style="border:none;padding:0;display:flex;align-items:center;gap:8px;margin-top:4px;">${tipo} <a class="btn-acao btn-baixar" href="#" onclick="baixarArquivo('${p.arquivo}','${p.tipo}');return false;">⬇ Baixar</a></td>
      </tr>`;
    }).join('');
  } else {
    const thead = tbody.closest('table').querySelector('thead');
    if (thead) thead.style.display = '';

    tbody.innerHTML = pagina.map(p => {
      const tipo = p.tipo === 'PDF'
        ? '<span class="badge badge-pdf">PDF</span>'
        : '<span class="badge badge-pptx">PPTX</span>';
      const data = p.dataFormatada || new Date(p.data).toLocaleString('pt-BR');
      return `<tr>
        <td><strong>${p.condominio || '—'}</strong></td>
        <td>${p.combo || '—'}</td>
        <td style="font-size:11px;color:var(--muted)">${p.vendedor || '—'}</td>
        <td style="font-size:11px;color:var(--muted)">${data}</td>
        <td class="td-tipo-acao">${tipo} <a class="btn-acao btn-baixar" href="#" onclick="baixarArquivo('${p.arquivo}','${p.tipo}');return false;">⬇ Baixar</a></td>
      </tr>`;
    }).join('');
  }

  document.getElementById('paginacaoInfo').textContent =
    `${inicio + 1}–${Math.min(fim, total)} de ${total}`;
  document.getElementById('btnAnterior').disabled = paginaAtual === 1;
  document.getElementById('btnProximo').disabled = paginaAtual === totalPaginas;
}

window.paginaAnterior = function() { if (paginaAtual > 1) { paginaAtual--; renderizarPagina(); } };
window.proximaPagina  = function() { paginaAtual++; renderizarPagina(); };

window.filtrarPropostas = function() {
  const cond  = document.getElementById('filtroCondominio').value.toLowerCase();
  const combo = document.getElementById('filtroCombo').value;
  const tipo  = document.getElementById('filtroTipo').value;
  const user  = document.getElementById('filtroUsuario').value;
  const filtrado = todasPropostas.filter(p =>
    (!cond  || (p.condominio||'').toLowerCase().includes(cond)) &&
    (!combo || p.combo === combo) &&
    (!tipo  || p.tipo === tipo) &&
    (!user  || p.vendedor === user)
  );
  renderizarPropostas(filtrado);
};

window.baixarArquivo = async function(arquivo, tipo) {
  if (!arquivo) return;
  try {
    const pasta = tipo === 'PDF' ? 'PDF' : 'PPTX';
    const storageRef = ref(storage, `propostas/${pasta}/${arquivo}`);
    const url = await getDownloadURL(storageRef);
    window.open(url, '_blank');
  } catch(e) {
    alert('Arquivo não encontrado no Storage.');
    console.error(e);
  }
};

// ── USUÁRIOS AUTORIZADOS ──
async function carregarUsuarios() {
  const snap = await getDocs(collection(db, 'usuarios_autorizados'));
  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('metricaTotalUsuarios').textContent = lista.length;

  const div = document.getElementById('listaUsuarios');
  if (lista.length === 0) { div.innerHTML = '<div class="vazio">Nenhum usuário cadastrado.</div>'; return; }
  div.innerHTML = lista.map(u => `
    <div class="usuario-row">
      <div class="usuario-info">
        <div class="usuario-email">${u.email}</div>
      </div>
      <button class="btn-acao btn-excluir" onclick="removerUsuario('${u.id}','${u.email}')">✕ Remover</button>
    </div>`).join('');
}

window.adicionarUsuario = async function() {
  const email = document.getElementById('novoEmail').value.trim().toLowerCase();
  if (!email) { alert('Informe um e-mail.'); return; }
  try {
    await addDoc(collection(db, 'usuarios_autorizados'), { email });
    document.getElementById('novoEmail').value = '';
    await carregarUsuarios();
  } catch(e) { alert('Erro ao adicionar usuário.'); console.error(e); }
};

window.removerUsuario = async function(id, email) {
  if (!confirm(`Remover ${email}?`)) return;
  try {
    await deleteDoc(doc(db, 'usuarios_autorizados', id));
    await carregarUsuarios();
  } catch(e) { alert('Erro ao remover usuário.'); console.error(e); }
};

// ── LOGS ──
async function carregarLogs() {
  const q = query(collection(db, 'logs_propostas'), orderBy('data', 'desc'), limit(500));
  const snap = await getDocs(q);
  todosLogs = snap.docs.map(d => d.data());
  renderizarLogs(todosLogs);
}

function renderizarLogs(lista) {
  const tbody = document.getElementById('tabelaLogs');
  if (lista.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum log encontrado.</td></tr>'; return; }
  tbody.innerHTML = lista.map(l => {
    const tipo = l.tipo === 'PDF'
      ? '<span class="badge badge-pdf">PDF</span>'
      : '<span class="badge badge-pptx">PPTX</span>';
    const data = l.dataFormatada || new Date(l.data).toLocaleString('pt-BR');
    return `<tr>
      <td style="font-size:11px">${l.vendedor || '—'}</td>
      <td>${l.condominio || '—'}</td>
      <td>${l.combo || '—'}</td>
      <td>${tipo}</td>
      <td style="font-size:11px;color:var(--muted)">${data}</td>
    </tr>`;
  }).join('');
}

window.filtrarLogs = function() {
  const txt = document.getElementById('filtroLog').value.toLowerCase();
  const filtrado = todosLogs.filter(l =>
    (l.vendedor||'').toLowerCase().includes(txt) ||
    (l.condominio||'').toLowerCase().includes(txt) ||
    (l.combo||'').toLowerCase().includes(txt)
  );
  renderizarLogs(filtrado);
};

window.exportarCSV = function() {
  const header = 'Usuário,Condomínio,Combo,Tipo,Data\n';
  const rows = todosLogs.map(l =>
    `"${l.vendedor||''}","${l.condominio||''}","${l.combo||''}","${l.tipo||''}","${l.dataFormatada||''}"`
  ).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs_duo_fitness_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ── NAVEGAÇÃO ──
const titulos = {
  propostas: ['Propostas Geradas', 'Todas as propostas geradas pelos usuários'],
  online:    ['Usuários Online', 'Quem está acessando o simulador agora'],
  usuarios:  ['Usuários Autorizados', 'Gerencie quem pode acessar o simulador'],
  logs:      ['Logs de Acesso', 'Histórico completo de atividades'],
  suporte:   ['Suporte', 'Canais de atendimento'],
};

window.irPara = function(secao, btn) {
  fecharSidebar();
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));
  document.getElementById('secao-' + secao).classList.add('ativa');
  btn.classList.add('ativo');
  document.getElementById('topbarTitulo').textContent = titulos[secao][0];
  document.getElementById('topbarSub').textContent = titulos[secao][1];
};

window.fazerLogout = async function() {
  if (usuarioAtual) {
    try { await deleteDoc(doc(db, 'usuarios_online', usuarioAtual.uid)); } catch(e) {}
  }
  await signOut(auth);
  window.location.href = 'login-admin.html';
};

function fecharSidebar() {
  document.getElementById('sidebar').classList.remove('aberta');
  document.getElementById('sidebarOverlay').classList.remove('aberta');
  document.getElementById('hamburger').classList.remove('escondido');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('aberta');
    document.getElementById('sidebarOverlay').classList.toggle('aberta');
    document.getElementById('hamburger').classList.toggle('escondido');
  });

  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    fecharSidebar();
  });
});

let todosLogsLogin = [];

async function carregarLogsLogin() {
  const q = query(collection(db, 'logs_login'), orderBy('data', 'desc'), limit(500));
  const snap = await getDocs(q);
  todosLogsLogin = snap.docs.map(d => d.data());
  renderizarLogsLogin(todosLogsLogin);
}

function renderizarLogsLogin(lista) {
  const tbody = document.getElementById('tabelaLogsLogin');
  if (!tbody) return;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="vazio">Nenhum log encontrado.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(l => `<tr>
    <td style="font-size:11px">${l.email || '—'}</td>
    <td>${l.nome || '—'}</td>
    <td><span class="badge badge-verde">${l.metodo || '—'}</span></td>
    <td style="font-size:11px;color:var(--muted)">${l.dataFormatada || '—'}</td>
  </tr>`).join('');
}

window.filtrarLogsLogin = function() {
  const txt = document.getElementById('filtroLogLogin').value.toLowerCase();
  const filtrado = todosLogsLogin.filter(l =>
    (l.email||'').toLowerCase().includes(txt) ||
    (l.nome||'').toLowerCase().includes(txt)
  );
  renderizarLogsLogin(filtrado);
};

window.alternarAbaLog = function(aba) {
  document.getElementById('abaLogsPropostas').style.display = aba === 'propostas' ? '' : 'none';
  document.getElementById('abaLogsLogin').style.display = aba === 'login' ? '' : 'none';
  document.getElementById('btnAbaPropostas').className = aba === 'propostas' ? 'btn-primario' : 'btn-secundario';
  document.getElementById('btnAbaLogin').className = aba === 'login' ? 'btn-primario' : 'btn-secundario';
};

window.exportarCSVLogin = function() {
  const header = 'E-mail,Nome,Método,Data\n';
  const rows = todosLogsLogin.map(l =>
    `"${l.email||''}","${l.nome||''}","${l.metodo||''}","${l.dataFormatada||''}"`
  ).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs_acesso_duo_fitness_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};