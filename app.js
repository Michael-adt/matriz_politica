/* Interface do questionário. Depende de itens.js (window.QUESTIONARIO) e logica.js (window.Logica). */
(function () {
  'use strict';
  var D = window.QUESTIONARIO, L = window.Logica;
  var CHAVE = 'matriz_politica_v1';
  var app = document.getElementById('app');

  var estado = { tela: 'intro', semente: 0, ordem: [], respostas: {}, idx: 0, inicio: null, fim: null };
  var abaAtual = 'geral';

  var mapaItens = {};
  D.blocos.forEach(function (b) { b.eixos.forEach(function (e) { e.itens.forEach(function (it) { mapaItens[it.id] = { it: it, eixo: e, bloco: b }; }); }); });
  var totalItens = Object.keys(mapaItens).length;
  var totalEixos = D.blocos.reduce(function (a, b) { return a + b.eixos.length; }, 0);

  function h(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(x) { return x === null ? '–' : x.toFixed(1).replace('.', ','); }
  function pct(m) { return m === null ? 50 : Math.max(0, Math.min(100, (m - 1) / 4 * 100)); }

  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* sem armazenamento */ } }
  function carregar() {
    try {
      var s = localStorage.getItem(CHAVE);
      if (!s) return null;
      var o = JSON.parse(s);
      if (!o || !Array.isArray(o.ordem) || o.ordem.length !== totalItens) return null;
      return o;
    } catch (e) { return null; }
  }
  function limpar() { try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ } }

  /* ---------- Telas ---------- */
  function telaIntro() {
    var salvo = carregar();
    var respondidas = salvo ? Object.keys(salvo.respostas).length : 0;
    var continuar = '';
    if (salvo && salvo.tela === 'resultado') {
      continuar = '<div class="card ok"><h3>Você já concluiu este questionário neste aparelho</h3><div class="linha-btn"><button class="btn prim" data-acao="ver-resultado">Ver meu resultado</button><button class="btn" data-acao="recomecar">Refazer do zero</button></div></div>';
    } else if (salvo && respondidas > 0) {
      continuar = '<div class="card ok"><h3>Questionário em andamento</h3><p class="mut">' + respondidas + ' de ' + totalItens + ' respondidas.</p><div class="linha-btn"><button class="btn prim" data-acao="continuar">Continuar de onde parei</button><button class="btn" data-acao="recomecar">Recomeçar</button></div></div>';
    }
    app.innerHTML =
      '<h1>Seu perfil político</h1>' +
