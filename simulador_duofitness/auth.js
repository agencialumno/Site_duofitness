// ── FIREBASE AUTH + FIRESTORE ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyCG6nZw4X8KVPxy_u3CFGuz1COVBPQPHlQ",
  authDomain: "simulador-duo-fitness.firebaseapp.com",
  projectId: "simulador-duo-fitness",
  storageBucket: "simulador-duo-fitness.firebasestorage.app",
  messagingSenderId: "1029705610423",
  appId: "1:1029705610423:web:c8a26f127a89a1a7b1c932"
};

const app      = initializeApp(firebaseConfig);

 //── APP CHECK ──
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdhHzItAAAAAMOapflWGPqhTM1IWEFV49tNKlqR'),
  isTokenAutoRefreshEnabled: true
});

const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

async function emailAutorizado(email) {
  try {
    const q = query(
      collection(db, 'usuarios_autorizados'),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch(e) {
    console.error('Erro ao verificar autorização:', e);
    return false;
  }
}

async function registrarLogin(user, metodo) {
  try {
    await addDoc(collection(db, 'logs_login'), {
      email: user.email,
      nome: user.displayName || user.email.split('@')[0],
      metodo: metodo, // 'google' ou 'email'
      data: new Date().toISOString(),
      dataFormatada: new Date().toLocaleString('pt-BR'),
    });
  } catch(e) {
    console.error('Erro ao registrar log de login:', e);
  }
}

function mostrarErro(msg) {
  const el = document.getElementById('authErro');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function loginGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const autorizado = await emailAutorizado(result.user.email);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com o administrador.');
      return;
    }
    await registrarLogin(result.user, 'Google');
    window.location.href = 'index.html';
  } catch(e) {
    mostrarErro('Erro ao fazer login com Google. Tente novamente.');
    console.error(e);
  }
}

async function loginEmail(email, senha) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, senha);
    const autorizado = await emailAutorizado(result.user.email);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com o administrador.');
      return;
    }
    await registrarLogin(result.user, 'E-mail');
    window.location.href = 'index.html';
  } catch(e) {
    if (e.code === 'auth/invalid-credential') {
      mostrarErro('E-mail ou senha incorretos.');
    } else {
      mostrarErro('Erro ao fazer login. Tente novamente.');
    }
  }
}
async function cadastrarEmail(email, senha) {
  try {
    const autorizado = await emailAutorizado(email);
    if (!autorizado) {
      mostrarErro('Este e-mail não está autorizado. Entre em contato com o administrador.');
      return;
    }
    await createUserWithEmailAndPassword(auth, email, senha);
    window.location.href = 'index.html';
  } catch(e) {
    if (e.code === 'auth/email-already-in-use') {
      mostrarErro('Este e-mail já está cadastrado. Faça login.');
    } else if (e.code === 'auth/weak-password') {
      mostrarErro('Senha fraca. Use pelo menos 6 caracteres.');
    } else {
      mostrarErro('Erro ao cadastrar. Tente novamente.');
    }
  }
}

function verificarAuth() {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const autorizado = await emailAutorizado(user.email);
    if (!autorizado) {
      await signOut(auth);
      window.location.href = 'login.html';
      return;
    }
    // Esconder loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
    if (typeof window.iniciarHeartbeat === 'function') window.iniciarHeartbeat(user);
    // Exibir nome do usuário
    const nomeEl = document.getElementById('nomeUsuario');
    if (nomeEl) {
      const nome = user.displayName
        ? user.displayName.split(' ')[0]
        : user.email.split('@')[0];
      nomeEl.textContent = `Olá, ${nome}!`;
    }
  });
}
async function logout() {
  await signOut(auth);
  window.location.href = 'login.html';
}

export { loginGoogle, loginEmail, cadastrarEmail, verificarAuth, logout };