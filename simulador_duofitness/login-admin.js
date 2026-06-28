import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCG6nZw4X8KVPxy_u3CFGuz1COVBPQPHlQ",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.firebasestorage.app",
  messagingSenderId: "1029705610423",
  appId: "1:1029705610423:web:c8a26f127a89a1a7b1c932"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

async function isAdmin(email) {
  const q = query(collection(db, 'admins'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  return !snap.empty;
}

function mostrarErro(msg) {
  const el = document.getElementById('authErro');
  el.textContent = msg;
  el.style.display = 'block';
}

onAuthStateChanged(auth, async user => {
  document.getElementById('loadingOverlay').style.display = 'none';
  if (user && await isAdmin(user.email)) {
    window.location.href = 'admin.html';
  }
});

window.loginGoogle = async function() {
  try {
    const result = await signInWithPopup(auth, provider);
    if (!await isAdmin(result.user.email)) {
      mostrarErro('Acesso negado. Este e-mail não é um administrador.');
      await signOut(auth);
      return;
    }
    window.location.href = 'admin.html';
  } catch(e) {
    mostrarErro('Erro ao fazer login com Google.');
    console.error(e);
  }
};

window.submitAuth = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  if (!email || !senha) {
    mostrarErro('Preencha e-mail e senha.');
    return;
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, senha);
    if (!await isAdmin(result.user.email)) {
      mostrarErro('Acesso negado. Este e-mail não é um administrador.');
      await signOut(auth);
      return;
    }
    window.location.href = 'admin.html';
  } catch(e) {
    if (e.code === 'auth/invalid-credential') {
      mostrarErro('E-mail ou senha incorretos.');
    } else {
      mostrarErro('Erro ao fazer login.');
    }
  }
};