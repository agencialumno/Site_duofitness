// tema.js
export function iniciarTema() {
  const salvo = localStorage.getItem('duofitness_tema');
  if (salvo === 'claro') document.documentElement.classList.add('tema-claro');
}

export function alternarTema() {
  const claro = document.documentElement.classList.toggle('tema-claro');
  localStorage.setItem('duofitness_tema', claro ? 'claro' : 'escuro');
  atualizarIcone();
}

function atualizarIcone() {
  const claro = document.documentElement.classList.contains('tema-claro');

  // Botão fixo (simulador) — esconde pois agora é o toggle inline
  document.querySelectorAll('.btn-tema').forEach(btn => {
    btn.style.display = 'none';
  });

  // Toggle inline do simulador
  const switchTema = document.getElementById('switchTema');
  const temaLabel  = document.getElementById('temaLabel');
  if (switchTema) {
    switchTema.className = 'switch-pill' + (claro ? ' on' : '');
  }
  if (temaLabel) {
    temaLabel.textContent = claro ? '🌙 Alternar para escuro' : '☀️ Alternar para claro';
  }

  // Botão da sidebar do admin
  document.querySelectorAll('.sidebar-footer .btn-tema').forEach(btn => {
    btn.style.display = '';
    btn.textContent = claro ? '🌙 Alternar para escuro' : '☀️ Alternar para claro';
    btn.title = claro ? 'Mudar para tema escuro' : 'Mudar para tema claro';
  });
}

document.addEventListener('DOMContentLoaded', atualizarIcone);