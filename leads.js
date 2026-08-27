import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ⚠️ Mesmo firebaseConfig usado no landing.js
const firebaseConfig = {
  apiKey: "AIzaSyCG6nZw4X8KVPxy_u3CFGuz1COVBPQPHlQ",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.appspot.com",
  messagingSenderId: "1029705610423",
  appId: "1:1029705610423:web:c8a26f127a89a1a7b1c932",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const statusEl  = document.getElementById('leads-status');
const totalEl   = document.getElementById('leads-total');
const tbody     = document.getElementById('leads-tbody');
const tabelaWrapper = document.getElementById('leads-tabela-wrapper');

tabelaWrapper.style.display = 'none';

function formatarData(timestamp) {
  if (!timestamp) return '—';
  const data = timestamp.toDate();
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CAPITAL_LABEL = {
  ate_80k: 'Até R$ 80 mil',
  '80_120k': 'R$ 80–120 mil',
  '120_200k': 'R$ 120–200 mil',
  acima_200k: 'Acima de R$ 200 mil',
};

const OPERACAO_LABEL = {
  sim: 'Sim',
  passivo: 'Investimento passivo',
};

const SIM_NAO_LABEL = {
  sim: 'Sim',
  nao: 'Não',
};

async function carregarLeads() {
  try {
    const q = query(collection(db, 'leads_landing'), orderBy('criadoEm', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      statusEl.textContent = 'Nenhum lead recebido ainda.';
      return;
    }

    snapshot.forEach((doc) => {
      const d = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatarData(d.criadoEm)}</td>
        <td>${d.nome ?? '—'}</td>
        <td>${d.whatsapp ?? '—'}</td>
        <td>${d.email ?? '—'}</td>
        <td>${d.cidade ?? '—'}</td>
        <td>${CAPITAL_LABEL[d.capital] ?? d.capital ?? '—'}</td>
        <td>${OPERACAO_LABEL[d.operacao] ?? d.operacao ?? '—'}</td>
        <td>${SIM_NAO_LABEL[d.mesmaCidade] ?? d.mesmaCidade ?? '—'}</td>
      `;
      tbody.appendChild(tr);
    });

    totalEl.textContent = `${snapshot.size} lead${snapshot.size === 1 ? '' : 's'} recebido${snapshot.size === 1 ? '' : 's'}`;
    statusEl.style.display = 'none';
    tabelaWrapper.style.display = 'block';
  } catch (err) {
    console.error('Erro ao carregar leads:', err);
    statusEl.textContent = 'Não foi possível carregar os leads. Veja o console para detalhes.';
  }
}

carregarLeads();
