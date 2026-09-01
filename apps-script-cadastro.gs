function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);

    var planilha = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    planilha.appendRow([
      new Date(),
      dados.nome || '',
      dados.cpf || '',
      dados.email || '',
      dados.telefone || '',
      dados.consentimento ? 'Sim' : 'Não',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ sucesso: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ sucesso: false, erro: erro.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
