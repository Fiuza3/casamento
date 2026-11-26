/*
 * Dados do casamento usados pelos scripts (contagem, som, Pix). Os presentes vêm do banco (GET /api/gifts).
 * Textos da página (nomes, local, horários) ficam no index.html, que é a única página: duplicá-los aqui
 * só criaria duas fontes para o mesmo dado. A data abaixo precisa bater com o horário da cerimônia no HTML.
 */
(function () {
  'use strict';

  window.WEDDING_CONFIG = Object.freeze({
    // true só na prévia estática do GitHub Pages (scripts/pages-preview-builder.ts): lá não há servidor para o formulário.
    previewMode: true,
    ceremonyStartIso: '2027-05-08T16:30:00-03:00',
    audioSource: 'assets/audio/ondas-praia-tropical.mp3',
    pix: {
      key: 'sua-chave-pix@exemplo.com',
      holder: 'Nome do titular',
    },
  });
})();
