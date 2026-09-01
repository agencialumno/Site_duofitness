/* ⚠️ COLE AQUI a URL do seu Google Apps Script Web App,
   depois de publicá-lo (termina em /exec) */
const SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyId58kxAXrklHsEyzpewLKQE0M_pokMY56yj4gwHc6xW9Q-MX3tNWuVr96hQWrhYJPDg/exec';

/* ⚠️ CONFIGURE AQUI os dados reais do PIX antes de publicar.
   Enquanto CHAVE estiver como placeholder, a seção de PIX fica
   escondida (não mostra um QR Code quebrado pros usuários). */
const PIX_CONFIG = {
  chave: 'COLE_AQUI_SUA_CHAVE_PIX', // CPF, CNPJ, e-mail, telefone ou chave aleatória
  nomeRecebedor: 'DUO FITNESS', // até 25 caracteres, sem acento
  cidade: 'RIO DE JANEIRO', // até 15 caracteres, sem acento
  valor: null, // deixe null para "valor livre" (a pessoa digita quanto pagar)
};

function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function tlv(id, valor) {
  const tamanho = valor.length.toString().padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

/* CRC-16/CCITT-FALSE — padrão exigido pelo Banco Central pro campo 63 */
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPayloadPix({ chave, nomeRecebedor, cidade, valor }) {
  const nomeLimpo = removerAcentos(nomeRecebedor).slice(0, 25);
  const cidadeLimpa = removerAcentos(cidade).slice(0, 15);

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave);
  const additionalData = tlv('05', '***'); // txid genérico (PIX estático)

  let payload =
    tlv('00', '01') + // Payload Format Indicator
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') + // Merchant Category Code
    tlv('53', '986'); // Moeda: Real (BRL)

  if (valor) {
    payload += tlv('54', Number(valor).toFixed(2));
  }

  payload +=
    tlv('58', 'BR') +
    tlv('59', nomeLimpo) +
    tlv('60', cidadeLimpa) +
    tlv('62', additionalData);

  payload += '6304'; // ID + tamanho do próprio campo CRC, antes de calculá-lo
  return payload + crc16(payload);
}

function exibirPix() {
  if (!PIX_CONFIG.chave || PIX_CONFIG.chave === 'COLE_AQUI_SUA_CHAVE_PIX') {
    console.warn('PIX não configurado — preencha PIX_CONFIG.chave no cadastro.js antes de publicar.');
    return;
  }

  const payload = gerarPayloadPix(PIX_CONFIG);

  new QRCode(document.getElementById('cad-pix-qr'), {
    text: payload,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
  });

  const input = document.getElementById('cad-pix-input');
  input.value = payload;

  const btnCopiar = document.getElementById('cad-pix-copiar');
  const copiadoMsg = document.getElementById('cad-pix-copiado');
  btnCopiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      input.select();
      document.execCommand('copy');
    }
    copiadoMsg.classList.add('visivel');
    setTimeout(() => copiadoMsg.classList.remove('visivel'), 2500);
  });

  document.getElementById('cad-pix-area').style.display = 'flex';
}

const form = document.getElementById('cad-form');
const btn = document.getElementById('cad-btn');
const msgEl = document.getElementById('cad-msg');
const sucessoEl = document.getElementById('cad-sucesso');

function validarCPF(valor) {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 11;
}

function validarTelefone(valor) {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length >= 10 && digitos.length <= 13;
}

function mostrarErro(texto) {
  msgEl.textContent = texto;
  msgEl.className = 'cad-erro';
}

/* Máscara simples de CPF enquanto digita */
const cpfInput = document.getElementById('cad-cpf');
cpfInput.addEventListener('input', () => {
  let v = cpfInput.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  cpfInput.value = v;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarErro('');

  // honeypot — se preenchido, é bot, aborta silenciosamente
  const honeypot = document.getElementById('cad-website').value;
  if (honeypot) return;

  const nome = document.getElementById('cad-nome').value.trim();
  const cpf = document.getElementById('cad-cpf').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const telefone = document.getElementById('cad-telefone').value.trim();
  const consentimento = document.getElementById('cad-consentimento').checked;

  if (!nome || !cpf || !email || !telefone) {
    mostrarErro('Preencha todos os campos.');
    return;
  }

  if (!validarCPF(cpf)) {
    mostrarErro('Informe um CPF válido (11 dígitos).');
    return;
  }

  if (!validarTelefone(telefone)) {
    mostrarErro('Informe um telefone válido, com DDD.');
    return;
  }

  if (!consentimento) {
    mostrarErro('É necessário autorizar o uso dos dados (LGPD) para continuar.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    // Sem cabeçalho Content-Type customizado de propósito — evita o
    // preflight CORS que o Google Apps Script não trata bem.
    const resp = await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify({ nome, cpf, email, telefone, consentimento }),
    });
    const resultado = await resp.json();

    if (!resultado.sucesso) {
      if (resultado.jaCadastrado) {
        mostrarErro('Este CPF já está cadastrado. Cada pessoa pode se cadastrar apenas uma vez.');
      } else {
        mostrarErro('Não foi possível enviar agora. Tente novamente em instantes.');
      }
      btn.disabled = false;
      btn.textContent = 'Enviar';
      return;
    }

    form.style.display = 'none';
    sucessoEl.classList.add('visivel');
    document.getElementById('cad-titulo').innerHTML = 'Parabéns! <em>Você agora faz parte do futuro do wellness.</em>';
    document.getElementById('cad-subtitulo').textContent = 'Falta apenas uma etapa: a validação do pagamento para confirmar sua franquia.';
    setTimeout(() => {
      document.getElementById('cad-progresso-fill').style.width = '90%';
    }, 300);
    exibirPix();
  } catch (err) {
    console.error('Erro ao enviar cadastro:', err);
    mostrarErro('Não foi possível enviar agora. Tente novamente em instantes.');
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }
});