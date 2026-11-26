/*
 * Confirmação de presença por lista fechada (ADR-0007). Envia para POST /api/rsvp os campos do
 * contrato declarado em shared/rsvp-contract.ts: guestId, attending, phone, message.
 * A validação aqui é só para ajudar o convidado; quem decide é o servidor.
 */
(function () {
  'use strict';

  const site = (window.WeddingSite = window.WeddingSite || {});

  const validators = {
    guestId: (data) => (data.get('guestId') ? '' : 'Escolha seu nome na lista.'),
    attending: (data) => (data.get('attending') ? '' : 'Escolha se você vem ou não.'),
    phone: (data) => (String(data.get('phone') || '').replace(/\D/g, '').length >= 10 ? '' : 'Informe um WhatsApp com DDD, por exemplo (27) 99999-0000.'),
  };

  function showFieldError(form, fieldName, message) {
    const errorSlot = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (errorSlot) errorSlot.textContent = message;
    form.querySelectorAll(`[name="${fieldName}"]`).forEach((input) => input.setAttribute('aria-invalid', String(Boolean(message))));
  }

  function validate(form) {
    const data = new FormData(form);
    const invalidFields = Object.entries(validators)
      .map(([fieldName, check]) => {
        const message = check(data);
        showFieldError(form, fieldName, message);
        return message ? fieldName : null;
      })
      .filter(Boolean);
    return { data, invalidFields };
  }

  function toPayload(data) {
    return {
      guestId: Number(data.get('guestId')),
      attending: data.get('attending') === 'yes',
      phone: String(data.get('phone') || ''),
      message: String(data.get('message') || ''),
    };
  }

  function focusField(form, fieldName) {
    const target = fieldName === 'guestId' ? form.querySelector('[data-guest-search-input]') : form.querySelector(`[name="${fieldName}"]`);
    target?.focus();
  }

  function showSuccess(form, data) {
    const success = form.closest('[data-rsvp]').querySelector('[data-rsvp-success]');
    const attending = data.get('attending') === 'yes';
    const fullName = form.querySelector('[data-guest-search-input]').value.trim();
    success.querySelector('[data-rsvp-success-name]').textContent = fullName.split(' ')[0];
    success.querySelector('[data-rsvp-success-yes]').hidden = !attending;
    success.querySelector('[data-rsvp-success-no]').hidden = attending;
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  function showServerErrors(form, body) {
    Object.entries(body.fieldErrors || {}).forEach(([fieldName, message]) => showFieldError(form, fieldName, message));
    form.querySelector('[data-rsvp-status]').textContent = body.message || 'Não foi possível enviar agora. Tente de novo.';
  }

  function setBusy(form, busy) {
    const button = form.querySelector('[type="submit"]');
    button.disabled = busy;
    button.toggleAttribute('aria-busy', busy);
    form.querySelector('[data-rsvp-status]').textContent = busy ? 'Enviando sua resposta…' : '';
  }

  async function sendResponse(form, data) {
    const response = await fetch('api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(data)),
    });
    const body = await response.json();
    setBusy(form, false);
    if (response.status === 201) return showSuccess(form, data);
    showServerErrors(form, body);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { data, invalidFields } = validate(form);
    if (invalidFields.length) return focusField(form, invalidFields[0]);
    setBusy(form, true);
    try {
      await sendResponse(form, data);
    } catch (error) {
      setBusy(form, false);
      form.querySelector('[data-rsvp-status]').textContent = 'Sem conexão para enviar. Confira a internet e tente de novo.';
      site.reportProblem?.('rsvp-submit', error);
    }
  }

  function bindGuestSearch(form) {
    const guestId = form.querySelector('[data-guest-id]');
    const details = form.querySelector('[data-rsvp-details]');
    site.createGuestSearch(form.querySelector('[data-guest-search]'), {
      onSelect: (guest) => {
        guestId.value = String(guest.id);
        details.hidden = false;
        showFieldError(form, 'guestId', '');
      },
      onClear: () => {
        guestId.value = '';
        details.hidden = true;
      },
    });
  }

  function showPreviewNotice(form) {
    form.hidden = true;
    form.closest('[data-rsvp]').querySelector('[data-rsvp-preview]').hidden = false;
  }

  site.bindRsvpForms = function bindRsvpForms() {
    document.querySelectorAll('[data-rsvp-form]').forEach((form) => {
      if (window.WEDDING_CONFIG.previewMode) return showPreviewNotice(form);
      form.noValidate = true;
      form.addEventListener('submit', handleSubmit);
      bindGuestSearch(form);
    });
  };
})();
