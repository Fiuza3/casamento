/*
 * Lista de presentes da página pública: lê GET /api/gifts (contrato em shared/gifts-contract.ts),
 * preenche o <template data-gift-template> da página e abre a janela do Pix.
 */
(function () {
  'use strict';

  const site = (window.WeddingSite = window.WeddingSite || {});
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function fillImage(image, gift) {
    if (!image) return;
    image.hidden = !gift.imageUrl;
    if (!gift.imageUrl) return;
    image.src = gift.imageUrl;
    image.alt = gift.imageAlt;
  }

  function fillGift(template, gift) {
    const item = template.content.firstElementChild.cloneNode(true);
    fillImage(item.querySelector('[data-gift-field="image"]'), gift);
    item.querySelector('[data-gift-field="title"]').textContent = gift.title;
    item.querySelector('[data-gift-field="description"]').textContent = gift.description;
    item.querySelector('[data-gift-field="price"]').textContent = currency.format(gift.priceInCents / 100);
    item.querySelector('[data-gift-select]').dataset.giftId = String(gift.id);
    return item;
  }

  function openPixDialog({ dialog, gift, pix }) {
    fillImage(dialog.querySelector('[data-gift-dialog-image]'), gift);
    dialog.querySelector('[data-gift-dialog-title]').textContent = gift.title;
    dialog.querySelector('[data-gift-dialog-price]').textContent = currency.format(gift.priceInCents / 100);
    dialog.querySelector('[data-pix-key]').textContent = pix.key;
    dialog.querySelector('[data-pix-holder]').textContent = pix.holder;
    dialog.querySelector('[data-copy-status]').textContent = '';
    dialog.showModal();
  }

  async function copyPixKey(dialog) {
    const status = dialog.querySelector('[data-copy-status]');
    const keyElement = dialog.querySelector('[data-pix-key]');
    try {
      await navigator.clipboard.writeText(keyElement.textContent);
      status.textContent = 'Chave Pix copiada.';
    } catch (error) {
      window.getSelection().selectAllChildren(keyElement);
      status.textContent = 'Não deu para copiar automaticamente. A chave está selecionada: copie com Ctrl+C ou segure o dedo.';
      site.reportProblem?.('pix-copy', error);
    }
  }

  function bindDialog(dialog) {
    dialog.querySelector('[data-copy-pix]').addEventListener('click', () => copyPixKey(dialog));
    dialog.querySelectorAll('[data-dialog-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  }

  async function fetchGifts() {
    const response = await fetch('api/gifts');
    if (!response.ok) throw new Error(`Lista de presentes indisponível (HTTP ${response.status})`);
    return (await response.json()).gifts;
  }

  function showGifts({ container, template, dialog, gifts, pix }) {
    container.replaceChildren(...gifts.map((gift) => fillGift(template, gift)));
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-gift-select]');
      const gift = button && gifts.find((candidate) => String(candidate.id) === button.dataset.giftId);
      if (gift) openPixDialog({ dialog, gift, pix });
    });
  }

  site.renderGiftList = async function renderGiftList({ pix }) {
    const container = document.querySelector('[data-gift-list]');
    const template = document.querySelector('[data-gift-template]');
    const dialog = document.querySelector('[data-gift-dialog]');
    const status = document.querySelector('[data-gift-status]');
    if (!container || !template || !dialog || !status) return;
    bindDialog(dialog);
    status.textContent = 'Carregando os presentes…';
    try {
      const gifts = await fetchGifts();
      status.textContent = gifts.length ? '' : 'A lista de presentes será publicada em breve.';
      showGifts({ container, template, dialog, gifts, pix });
    } catch (error) {
      status.textContent = 'Não foi possível carregar a lista agora. Recarregue a página em instantes.';
      site.reportProblem?.('gift-list', error);
    }
  };
})();
