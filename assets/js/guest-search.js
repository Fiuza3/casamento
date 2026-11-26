/*
 * Campo "Seu nome" com sugestões da lista de convidados (padrão combobox da WAI-ARIA).
 * O nome só vale quando escolhido na lista: o convite é individual (ADR-0007).
 * A API devolve no máximo 5 nomes a partir de 3 letras, para a lista não poder ser baixada inteira.
 */
(function () {
  'use strict';

  const site = (window.WeddingSite = window.WeddingSite || {});
  const MIN_LENGTH = 3;
  const DEBOUNCE_MILLISECONDS = 250;

  function describeResults(count) {
    if (count === 0) return 'Não encontramos esse nome na lista. Confira a grafia ou fale com os noivos.';
    return count === 1 ? '1 nome encontrado. Toque nele para escolher.' : `${count} nomes encontrados. Toque no seu para escolher.`;
  }

  function createOption(guest, index) {
    const option = document.createElement('li');
    option.id = `convidado-${guest.id}`;
    option.setAttribute('role', 'option');
    option.dataset.index = String(index);
    option.textContent = guest.fullName;
    return option;
  }

  site.createGuestSearch = function createGuestSearch(container, { onSelect, onClear }) {
    const input = container.querySelector('[data-guest-search-input]');
    const list = container.querySelector('[data-guest-search-options]');
    const status = container.querySelector('[data-guest-search-status]');
    const state = { guests: [], activeIndex: -1, requestToken: 0, timer: 0 };

    function showOptions(guests) {
      state.guests = guests;
      state.activeIndex = -1;
      list.replaceChildren(...guests.map(createOption));
      list.hidden = guests.length === 0;
      input.setAttribute('aria-expanded', String(guests.length > 0));
      input.removeAttribute('aria-activedescendant');
    }

    async function search(query) {
      const token = ++state.requestToken;
      status.textContent = 'Procurando seu nome…';
      try {
        const response = await fetch(`api/guests?query=${encodeURIComponent(query)}`);
        const body = await response.json();
        if (token !== state.requestToken) return;
        showOptions(response.ok ? body.guests : []);
        status.textContent = response.ok ? describeResults(body.guests.length) : body.message;
      } catch (error) {
        if (token !== state.requestToken) return;
        showOptions([]);
        status.textContent = 'Sem conexão para buscar seu nome. Confira a internet e tente de novo.';
        site.reportProblem?.('guest-search', error);
      }
    }

    function select(index) {
      const guest = state.guests[index];
      if (!guest) return;
      input.value = guest.fullName;
      showOptions([]);
      container.classList.add('is-selected');
      status.textContent = 'Nome encontrado na lista.';
      onSelect(guest);
    }

    function moveActive(step) {
      if (!state.guests.length) return;
      state.activeIndex = (state.activeIndex + step + state.guests.length) % state.guests.length;
      [...list.children].forEach((option, index) => option.classList.toggle('is-active', index === state.activeIndex));
      input.setAttribute('aria-activedescendant', list.children[state.activeIndex].id);
    }

    const keyActions = {
      ArrowDown: () => moveActive(1),
      ArrowUp: () => moveActive(-1),
      Enter: () => select(state.activeIndex),
      Escape: () => showOptions([]),
    };

    input.addEventListener('keydown', (event) => {
      const action = keyActions[event.key];
      if (!action || (event.key === 'Enter' && state.activeIndex < 0)) return;
      event.preventDefault();
      action();
    });

    input.addEventListener('input', () => {
      container.classList.remove('is-selected');
      onClear();
      window.clearTimeout(state.timer);
      const query = input.value.trim();
      state.requestToken += 1;
      showOptions([]);
      status.textContent = query && query.length < MIN_LENGTH ? 'Digite pelo menos 3 letras.' : '';
      if (query.length >= MIN_LENGTH) state.timer = window.setTimeout(() => search(query), DEBOUNCE_MILLISECONDS);
    });

    // mousedown cancela o blur do campo, senão a lista fecha antes do clique chegar na opção.
    list.addEventListener('mousedown', (event) => event.preventDefault());
    list.addEventListener('click', (event) => {
      const option = event.target.closest('[role="option"]');
      if (option) select(Number(option.dataset.index));
    });
  };
})();
