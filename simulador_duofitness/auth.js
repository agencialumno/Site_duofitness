// ── FIREBASE AUTH + FIRESTORE ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

async function emailAutorizado(email) {
  try {
    const emailLower = email.toLowerCase();
    console.log('Verificando autorização para:', emailLower);

    const [snapUsuarios, snapAdmins, snapFranqueados] = await Promise.all([
      getDocs(query(collection(db, 'usuarios_autorizados'), where('email', '==', emailLower))),
      getDocs(query(collection(db, 'admins'), where('email', '==', emailLower))),
      getDocs(query(collection(db, 'franqueados'), where('email', '==', emailLower))),
    ]);

    console.log('Resultado usuarios_autorizados:', snapUsuarios.empty ? 'vazio' : 'encontrado', snapUsuarios.size);
    console.log('Resultado admins:', snapAdmins.empty ? 'vazio' : 'encontrado', snapAdmins.size);
    console.log('Resultado franqueados:', snapFranqueados.empty ? 'vazio' : 'encontrado', snapFranqueados.size);

    return !snapUsuarios.empty || !snapAdmins.empty || !snapFranqueados.empty;
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
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    el.classList.remove('sucesso');
  }
}

function mostrarSucesso(msg) {
  const el = document.getElementById('authErro');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    el.classList.add('sucesso');
  }
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function loginGoogle() {
  console.log('loginGoogle() iniciada');
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('Popup retornou, email:', result.user.email);
    const autorizado = await emailAutorizado(result.user.email);
    console.log('Autorizado?', autorizado);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com o administrador.');
      return;
    }
    await registrarLogin(result.user, 'Google');
    console.log('Login registrado, redirecionando...');
    window.location.href = 'index.html';
  } catch(e) {
    console.error('Erro capturado em loginGoogle:', e.code, e.message);
    if (e.code === 'auth/popup-blocked') {
      mostrarErro('O navegador bloqueou a janela de login. Tente novamente ou use e-mail e senha.');
    } else {
      mostrarErro('Erro ao fazer login com Google. Tente novamente.');
    }
  }
}

async function processarRedirect() {
  console.log('processarRedirect() foi chamada');
  try {
    const result = await getRedirectResult(auth);
    console.log('Resultado do getRedirectResult:', result);
    if (!result) {
      console.log('Nenhum resultado de redirect — não veio do Google agora');
      return;
    }
    console.log('Email retornado:', result.user.email);
    const autorizado = await emailAutorizado(result.user.email);
    console.log('Email autorizado?', autorizado);
    if (!autorizado) {
      await signOut(auth);
      mostrarErro('Acesso não autorizado. Entre em contato com o administrador.');
      return;
    }
    await registrarLogin(result.user, 'Google');
    window.location.href = 'index.html';
  } catch(e) {
    console.error('Erro em processarRedirect:', e);
    mostrarErro('Erro ao fazer login com Google. Tente novamente.');
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
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const autorizado = await emailAutorizado(cred.user.email);
    if (!autorizado) {
      await deleteUser(cred.user);
      mostrarErro('Este e-mail não está autorizado. Entre em contato com o administrador.');
      return;
    }
    mostrarSucesso('Conta criada com sucesso! Redirecionando...');
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
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
    // Detectar role e aplicar permissões
    const qAdmin = query(collection(db, 'admins'), where('email', '==', user.email.toLowerCase()));
    const snapAdmin = await getDocs(qAdmin);

    let role = 'vendedor';
    if (!snapAdmin.empty) {
      role = 'admin';
    } else {
      const qFranqueado = query(collection(db, 'franqueados'), where('email', '==', user.email.toLowerCase()));
      const snapFranqueado = await getDocs(qFranqueado);
      if (!snapFranqueado.empty) role = 'franqueado';
    }

    window.userRole = role;

    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin) btnAdmin.style.display = role === 'admin' ? 'block' : 'none';

    if (typeof window.aplicarPermissoes === 'function') window.aplicarPermissoes(role);
  });
}
async function logout() {
  await signOut(auth);
  window.location.href = 'login.html';
}

export { loginGoogle, loginEmail, cadastrarEmail, verificarAuth, logout, processarRedirect };