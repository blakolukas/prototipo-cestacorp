/* Runtime do protótipo: roda as telas do canvas (template + renderVals) no navegador.
   setState → renderVals → template → morphdom. Eventos por delegação, então nada se perde entre renders. */
(function () {
  'use strict';

  class DCLogic {
    constructor() { this.state = {}; }
    setState(patch) { this.state = Object.assign({}, this.state || {}, patch); agendar(); }
  }
  window.DCLogic = DCLogic;

  const tpl = document.getElementById('dc-template').textContent;
  const codigo = document.getElementById('dc-logic').textContent;
  const host = document.getElementById('app');
  const Component = new Function('DCLogic', codigo + '\n;return Component;')(DCLogic);
  const comp = new Component();
  if (!comp.state) comp.state = {};

  const BOOL = ['disabled', 'checked', 'selected', 'hidden', 'required', 'readonly', 'open'];
  const umaExpr = (s) => { const m = /^\s*\{\{\s*([\s\S]+?)\s*\}\}\s*$/.exec(s); return m ? m[1] : null; };
  const cache = new Map();
  const avaliar = (expr, escopo) => {
    let fn = cache.get(expr);
    if (!fn) { fn = new Function('s', 'with (s) { return (' + expr + '); }'); cache.set(expr, fn); }
    try { return fn(escopo); } catch (e) { return undefined; }
  };
  const interpolar = (s, escopo) => s.replace(/\{\{\s*([\s\S]+?)\s*\}\}/g, (m, e) => { const v = avaliar(e, escopo); return v == null ? '' : String(v); });
  const tipoEvento = (el, nome) => {
    if (nome === 'onchange') {
      const t = (el.getAttribute('type') || '').toLowerCase();
      return (el.tagName === 'SELECT' || t === 'checkbox' || t === 'radio' || t === 'file') ? 'change' : 'input';
    }
    return nome.slice(2);
  };

  function montar(no, escopo) {
    for (const el of [...no.childNodes]) {
      if (el.nodeType === 3) { if (el.nodeValue.includes('{{')) el.nodeValue = interpolar(el.nodeValue, escopo); continue; }
      if (el.nodeType !== 1) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'sc-if') {
        if (avaliar(umaExpr(el.getAttribute('value') || '') || 'false', escopo)) { montar(el, escopo); el.replaceWith(...el.childNodes); } else { el.remove(); }
        continue;
      }
      if (tag === 'sc-for') {
        const lista = avaliar(umaExpr(el.getAttribute('list') || '') || '[]', escopo) || [];
        const nome = el.getAttribute('as') || 'item';
        const frag = document.createDocumentFragment();
        lista.forEach((item) => { const c = el.cloneNode(true); montar(c, Object.assign({}, escopo, { [nome]: item })); frag.append(...c.childNodes); });
        el.replaceWith(frag);
        continue;
      }
      let valor;
      for (const a of [...el.attributes]) {
        if (a.name.startsWith('hint-')) { el.removeAttribute(a.name); continue; }
        if (!a.value.includes('{{')) continue;
        const e = umaExpr(a.value);
        if (a.name.startsWith('on')) {
          const fn = e ? avaliar(e, escopo) : null;
          el.removeAttribute(a.name);
          if (typeof fn === 'function') { (el.__h = el.__h || {})[tipoEvento(el, a.name)] = fn; }
          continue;
        }
        if (e !== null) {
          const v = avaliar(e, escopo);
          if (v == null || typeof v === 'function') { el.removeAttribute(a.name); continue; }
          if (BOOL.includes(a.name)) { if (v) el.setAttribute(a.name, ''); else el.removeAttribute(a.name); continue; }
          el.setAttribute(a.name, String(v));
          if (a.name === 'value') valor = String(v);
        } else {
          el.setAttribute(a.name, interpolar(a.value, escopo));
        }
      }
      if (el.__h) el.setAttribute('data-h', Object.keys(el.__h).join(' '));
      montar(el, escopo);
      if (valor !== undefined && 'value' in el) el.value = valor;
    }
  }

  function render() {
    let vals = {};
    try { vals = comp.renderVals() || {}; } catch (e) { console.error(e); }
    const t = document.createElement('template');
    t.innerHTML = tpl;
    montar(t.content, vals);
    const novo = document.createElement('div');
    novo.id = 'app';
    novo.append(t.content);
    morphdom(host, novo, {
      onBeforeElUpdated(de, para) {
        de.__h = para.__h;
        if (de === document.activeElement && (de.tagName === 'INPUT' || de.tagName === 'TEXTAREA') && de.type !== 'checkbox' && de.type !== 'radio') {
          // não briga com quem está digitando: o valor do campo é a fonte da verdade
          para.value = de.value;
          para.setAttribute('value', de.value);
        }
        return true; // sempre desce: os handlers dos filhos mudam a cada render
      },
    });
  }

  let pendente = false;
  function agendar() { if (!pendente) { pendente = true; queueMicrotask(() => { pendente = false; render(); }); } }

  ['click', 'input', 'change'].forEach((tipo) => {
    host.addEventListener(tipo, (ev) => {
      let el = ev.target;
      while (el && el !== host) {
        if (el.__h && el.__h[tipo]) {
          if (tipo === 'click' && el.tagName === 'A' && !el.getAttribute('href')) ev.preventDefault();
          el.__h[tipo].call(el, ev);
          return;
        }
        el = el.parentElement;
      }
    });
  });

  render();
})();
