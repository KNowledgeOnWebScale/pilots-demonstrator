// Shared UI helpers for the PILOTS demonstrator.
// These contain no scenario logic and no state: every scenario is standalone.
(function () {
  'use strict';

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child == null) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  // Fills a <select> with test cases and loads the chosen case into the textareas.
  // `cases`: [{ id, label, description, expected, inputs: { textareaId: string } }]
  function bindTestCases({ select, info, cases, onLoad }) {
    select.replaceChildren(...cases.map((c) => el('option', { value: c.id, text: c.label })));
    const load = () => {
      const testCase = cases.find((c) => c.id === select.value);
      for (const [id, value] of Object.entries(testCase.inputs)) {
        document.getElementById(id).value = value;
      }
      info.replaceChildren(
        testCase.description + ' ',
        el('strong', { text: `Expected: ${testCase.expected}.` }),
      );
      onLoad?.(testCase);
    };
    select.addEventListener('change', load);
    load();
  }

  // Runs an async action while showing a busy state on the button.
  async function withBusy(button, action) {
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    try {
      await action();
    } finally {
      button.removeAttribute('aria-busy');
      button.disabled = false;
    }
  }

  // Renders a verdict banner plus a list of checks: [{ label, passed, detail }]
  function renderChecks(container, { verdict, passed, checks, conclusion }) {
    const items = checks.map((check) =>
      el('li', { class: check.passed ? 'check-pass' : check.passed === false ? 'check-fail' : 'check-skip' },
        el('span', { class: 'check-icon', text: check.passed ? '✔' : check.passed === false ? '✘' : '–' }),
        el('span', {},
          el('strong', { text: check.label }),
          check.detail ? el('br') : null,
          check.detail ? el('small', { text: check.detail }) : null,
        ),
      ),
    );
    container.replaceChildren(
      el('article', { class: `verdict ${passed ? 'verdict-yes' : 'verdict-no'}` },
        el('h4', { text: verdict }),
        conclusion ? el('p', {}, el('i', { text: conclusion })) : null,
      ),
      el('ul', { class: 'checks' }, items),
    );
  }

  function renderError(container, message) {
    container.replaceChildren(
      el('article', { class: 'verdict verdict-no' },
        el('h4', { text: 'Could not process the input' }),
        el('p', { text: message }),
      ),
    );
  }

  // Minimal tab navigation driven by the URL hash (#scenario-1, ...).
  function initTabs() {
    const links = [...document.querySelectorAll('[data-tab]')];
    const panels = [...document.querySelectorAll('[data-panel]')];
    const show = () => {
      const current = location.hash.slice(1) || panels[0].dataset.panel;
      const target = panels.some((p) => p.dataset.panel === current) ? current : panels[0].dataset.panel;
      panels.forEach((p) => { p.hidden = p.dataset.panel !== target; });
      links.forEach((l) => {
        const active = l.dataset.tab === target;
        l.classList.toggle('outline', !active);
        if (active) l.setAttribute('aria-current', 'page');
        else l.removeAttribute('aria-current');
      });
    };
    window.addEventListener('hashchange', show);
    show();
  }

  window.Demo = { el, bindTestCases, withBusy, renderChecks, renderError, initTabs };
})();
