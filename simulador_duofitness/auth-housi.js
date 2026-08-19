import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signOut, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

async function housiAutorizado(email) {
  const emailLower = email.toLowerCase();
  const snap = await getDocs(query(collection(db, 'housi_autorizados'), where('email', '==', emailLower)));
  return !snap.empty;
}

async function registrarLoginHousi(user, metodo) {
  try {
    await addDoc(collection(db, 'logs_login_housi'), {
      email: user.email,
      nome: user.displayName || user.email.split('@')[0],
      metodo,
      data: new Date().toISOString(),
      dataFormatada: new Date().toLocaleString('pt-BR'),
    });
  } catch(e) { console.error('Erro ao registrar log de login HOUSI:', e); }
}

function mostrarErro(msg) {
  const el = document.getElementById('authErro');
  if (el) { el.textContent = msg; el.style.display = 'block'; el.classList.remove('sucesso'); }
}

function mostrarSucesso(msg) {
  const el = document.getElementById('authErro');
  if (el) { el.textContent = msg; el.style.display = 'block'; el.classList.add('sucesso'); }
}

async function loginGoogleHousi() {
  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch(e) {
    mostrarErro(e.code === 'auth/popup-blocked'
      ? 'O navegador bloqueou a janela de login. Tente novamente.'
      : 'Erro ao fazer login com Google. Tente novamente.');
    console.error(e);
    return;
  }
  await new Promise(r => setTimeout(r, 500));
  try {
    const autorizado = await housiAutorizado(result.user.email);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com a Agência Lumno.');
      return;
    }
    await registrarLoginHousi(result.user, 'Google');
    window.location.href = 'housi.html';
  } catch(e) {
    mostrarErro('Não foi possível verificar seu acesso. Tente novamente.');
    console.error(e);
  }
}

async function loginEmailHousi(email, senha) {
  let result;
  try {
    result = await signInWithEmailAndPassword(auth, email, senha);
  } catch(e) {
    mostrarErro(e.code === 'auth/invalid-credential' ? 'E-mail ou senha incorretos.' : 'Erro ao fazer login.');
    return;
  }
  try {
    const autorizado = await housiAutorizado(result.user.email);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com a Agência Lumno.');
      return;
    }
    await registrarLoginHousi(result.user, 'E-mail');
    window.location.href = 'housi.html';
  } catch(e) {
    mostrarErro('Não foi possível verificar seu acesso. Tente novamente.');
    console.error(e);
  }
}

function verificarAuthHousi() {
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'login-housi.html'; return; }
    const autorizado = await housiAutorizado(user.email);
    if (!autorizado) { await signOut(auth); window.location.href = 'login-housi.html'; return; }
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
    const nomeEl = document.getElementById('nomeUsuario');
    if (nomeEl) {
      const nome = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
      nomeEl.textContent = `Olá, ${nome}!`;
    }
  });
}

async function cadastrarEmailHousi(email, senha) {
  try {
    await createUserWithEmailAndPassword(auth, email, senha);
    mostrarSucesso('Email cadastrado. Entre em contato com a Agência Lumno para liberar o acesso.');
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

async function processarRedirectHousi() {
  let result;
  try {
    result = await getRedirectResult(auth);
    if (!result) return;
  } catch(e) {
    mostrarErro('Erro ao fazer login com Google. Tente novamente.');
    console.error(e);
    return;
  }
  try {
    const autorizado = await housiAutorizado(result.user.email);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com a Agência Lumno.');
      return;
    }
    await registrarLoginHousi(result.user, 'Google');
    window.location.href = 'housi.html';
  } catch(e) {
    mostrarErro('Não foi possível verificar seu acesso. Tente novamente.');
    console.error(e);
  }
}

async function logoutHousi() {
  await signOut(auth);
  window.location.href = 'login-housi.html';
}

export { loginGoogleHousi, loginEmailHousi, cadastrarEmailHousi, processarRedirectHousi, verificarAuthHousi, logoutHousi };