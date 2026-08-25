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
  apiKey: "COLE_AQUI",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI",
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

const PERFIL_LABEL = {
  sindico: 'Síndico(a)',
  morador: 'Morador(a)',
  franqueado: 'Franqueado',
  outro: 'Outro',
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
        <td>${PERFIL_LABEL[d.perfil] ?? d.perfil ?? '—'}</td>
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
