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
      '<p class="mut">Versão de teste ' + h(D.versao) + '</p>' +
      continuar +
      '<div class="card"><h2>Como funciona</h2>' +
      '<p>Você vai ler <b>' + totalItens + ' afirmações</b> sobre economia e papel do Estado e dizer o quanto concorda com cada uma. Leva cerca de 6 a 8 minutos.</p>' +
      '<p>Não há resposta certa ou errada. Responda pelo que você pensa, e não pelo que seria "esperado". Se uma afirmação não fizer sentido para você, pode pular.</p>' +
      '<p>No final você vê um painel com a sua posição em cada tema, um gráfico geral e o detalhe de cada eixo.</p></div>' +
      '<div class="card aviso"><h3>Sobre esta versão de teste</h3>' +
      '<p class="peq">Este protótipo cobre só o bloco A (Economia e Estado). As perguntas ainda não foram validadas com dados reais, então o resultado é uma <b>indicação de posição</b>, não um diagnóstico. Ainda não há classificação em perfis.</p></div>' +
      '<div class="card"><h3>Privacidade</h3><p class="peq">Suas respostas ficam <b>somente neste navegador</b>. Nada é enviado a nenhum servidor. Para compartilhar o resultado com quem aplica o teste, use o botão de baixar as respostas no final.</p></div>' +
      '<button class="btn prim" style="width:100%" data-acao="iniciar">Começar</button>';
  }

  function telaPergunta() {
    var id = estado.ordem[estado.idx];
    var info = mapaItens[id];
    var atual = estado.respostas[id];
    var prog = Math.round(estado.idx / estado.ordem.length * 100);
    var botoes = D.escala.map(function (o) {
      return '<button class="btn bloco' + (atual === o.v ? ' sel' : '') + '" data-acao="responder" data-v="' + o.v + '">' + h(o.t) + '</button>';
    }).join('');
    app.innerHTML =
      '<div class="topo"><span class="mut peq">Pergunta ' + (estado.idx + 1) + ' de ' + estado.ordem.length + '</span>' +
      '<button class="pular" data-acao="sair">Salvar e sair</button></div>' +
      '<div class="prog"><i style="width:' + prog + '%"></i></div>' +
      '<p class="mut peq">Bloco ' + h(info.bloco.codigo) + ' · ' + h(info.bloco.nome) + '</p>' +
      '<p class="pergunta">' + h(info.it.texto) + '</p>' +
      botoes +
      '<div class="topo" style="margin-top:6px"><button class="pular" data-acao="voltar"' + (estado.idx === 0 ? ' disabled style="visibility:hidden"' : '') + '>← Voltar</button>' +
      '<button class="pular" data-acao="pular">Prefiro não responder</button></div>';
  }

  /* ---------- Resultado ---------- */
  function radarSVG(eixos) {
    var n = eixos.length, cx = 200, cy = 190, R = 138;
    if (n < 3) return '';
    var ang = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
    var s = '<svg class="radar" viewBox="0 0 400 380" role="img" aria-label="Gráfico de radar com a posição em cada eixo">';
    for (var r = 1; r <= 5; r++) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push((cx + (r - 1) / 4 * R * Math.cos(ang(i))).toFixed(1) + ',' + (cy + (r - 1) / 4 * R * Math.sin(ang(i))).toFixed(1));
      if (r === 1) continue;
      s += '<polygon class="anel" points="' + pts.join(' ') + '"/>';
    }
    for (var k = 0; k < n; k++) s += '<line class="raio" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.cos(ang(k))).toFixed(1) + '" y2="' + (cy + R * Math.sin(ang(k))).toFixed(1) + '"/>';
    s += '<text class="escala" x="' + (cx + 4) + '" y="' + (cy - R / 2 - 1) + '">3</text><text class="escala" x="' + (cx + 4) + '" y="' + (cy - R - 2) + '">5</text><text class="escala" x="' + (cx + 4) + '" y="' + (cy - 3) + '">1</text>';
    var poly = [], pontos = '';
    eixos.forEach(function (e, i) {
      if (e.media === null) return;
      var rr = (e.media - 1) / 4 * R;
      var x = cx + rr * Math.cos(ang(i)), y = cy + rr * Math.sin(ang(i));
      poly.push(x.toFixed(1) + ',' + y.toFixed(1));
      pontos += '<circle class="pt" data-acao="aba" data-v="' + e.codigo + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6"><title>' + h(e.codigo + ' ' + e.nome + ': ' + fmt(e.media)) + '</title></circle>';
    });
    if (poly.length >= 3) s += '<polygon class="area" points="' + poly.join(' ') + '"/>';
    else if (poly.length === 2) s += '<polyline class="area" points="' + poly.join(' ') + '"/>';
    s += pontos;
    eixos.forEach(function (e, i) {
      var c = Math.cos(ang(i)), sn = Math.sin(ang(i));
      var lx = cx + (R + 16) * c, ly = cy + (R + 16) * sn + 5;
      var anc = c > 0.3 ? 'start' : (c < -0.3 ? 'end' : 'middle');
      s += '<g data-acao="aba" data-v="' + e.codigo + '"><text class="cod" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anc + '">' + h(e.codigo) + '</text></g>';
    });
    return s + '</svg>';
  }

  function barraPos(m, vazia) {
    return '<div class="barra' + (vazia ? ' vazia' : '') + '"><span class="marca" style="left:' + pct(m) + '%"></span></div>';
  }

  function abaGeral(res) {
    var medidos = 0, divergentes = [];
    res.blocos.forEach(function (b) { b.eixos.forEach(function (e) {
      if (e.media !== null) medidos++;
      if (e.consistencia.chave === 'baixa') divergentes.push(e);
    }); });
    var dur = estado.inicio && estado.fim ? Math.max(1, Math.round((estado.fim - estado.inicio) / 60000)) : null;
    var out = '';
    out += '<div class="card aviso"><p class="peq" style="margin:0"><b>Versão de teste.</b> Mostra só o bloco A (Economia e Estado). As perguntas e as faixas de interpretação ainda não foram validadas com dados reais. Leia como indicação de posição, não como diagnóstico.</p></div>';
    out += '<div class="kpis">' +
      '<div class="kpi"><b>' + res.qualidade.validas + '/' + res.qualidade.total + '</b><span>afirmações respondidas</span></div>' +
      '<div class="kpi"><b>' + medidos + '/' + totalEixos + '</b><span>eixos medidos</span></div>' +
      '<div class="kpi"><b>' + divergentes.length + '</b><span>eixos com respostas divergentes</span></div>' +
      '<div class="kpi"><b>' + (dur === null ? '–' : dur + ' min') + '</b><span>tempo de resposta</span></div></div>';
    res.qualidade.alertas.forEach(function (a) { out += '<div class="card erro"><p class="peq" style="margin:0">' + h(a) + '</p></div>'; });

    res.blocos.forEach(function (b) {
      out += '<div class="card"><h2>Bloco ' + h(b.codigo) + ' · ' + h(b.nome) + '</h2>';
      out += '<p class="mut peq">Centro do gráfico = Polo 1 (nota 1); borda = Polo 5 (nota 5). Estar mais perto da borda não é melhor nem pior: só indica o lado do eixo. Toque num ponto para abrir o eixo.</p>';
      out += radarSVG(b.eixos);
      out += '<div class="legenda">' + b.eixos.map(function (e) { return '<button class="leg" data-acao="aba" data-v="' + e.codigo + '"><b>' + h(e.codigo) + '</b> ' + h(e.curto) + '</button>'; }).join('') + '</div>';
      out += '</div><div class="card"><h2>Mapa de posições</h2>';
      b.eixos.forEach(function (e) {
        out += '<div class="mapa-linha" data-acao="aba" data-v="' + e.codigo + '"><div class="topo" style="margin:0"><h3>' + h(e.codigo) + ' · ' + h(e.nome) + '</h3><span class="chip c-' + e.posicao.chave + '">' + fmt(e.media) + '</span></div>' +
          barraPos(e.media, e.media === null) +
          '<div class="polos"><span>' + h(e.polo1) + '</span><span>' + h(e.polo5) + '</span></div></div>';
      });
      out += '</div>';
    });

    if (divergentes.length) {
      out += '<div class="card aviso"><h3>Eixos para olhar com atenção</h3><p class="peq">Nestes eixos suas respostas apontaram para lados opostos, então a nota média esconde nuances:</p><ul class="sem">';
      divergentes.forEach(function (e) { out += '<li><a href="#" data-acao="aba" data-v="' + e.codigo + '" style="color:var(--acento)">' + h(e.codigo + ' · ' + e.nome) + '</a></li>'; });
      out += '</ul></div>';
    }
    out += '<div class="card"><h3>Seus dados</h3><div class="linha-btn"><button class="btn" data-acao="csv">Baixar respostas (CSV)</button><button class="btn" data-acao="recomecar">Refazer o questionário</button></div>' +
      '<p class="peq mut" style="margin-top:10px">O arquivo CSV contém só as suas respostas e notas, sem nome ou identificação.</p></div>';
    return out;
  }

  function textoInterpretacao(e) {
    if (e.media === null) return 'Não há respostas suficientes neste eixo (o mínimo é 2 afirmações respondidas).';
    var base = 'Em "' + e.nome + '", sua nota foi ' + fmt(e.media) + ' de 5. ';
    switch (e.posicao.chave) {
      case 'forte1': return base + 'Suas respostas se alinham de forma clara ao Polo 1: ' + e.polo1 + '.';
      case 'tende1': return base + 'Suas respostas tendem ao Polo 1 (' + e.polo1 + '), sem chegar ao extremo.';
      case 'meio': return base + 'Suas respostas ficam perto do meio da escala, entre "' + e.polo1 + '" e "' + e.polo5 + '". Pode ser uma posição moderada ou uma ambivalência; os itens abaixo mostram em quais afirmações você concordou ou discordou.';
      case 'tende5': return base + 'Suas respostas tendem ao Polo 5 (' + e.polo5 + '), sem chegar ao extremo.';
      default: return base + 'Suas respostas se alinham de forma clara ao Polo 5: ' + e.polo5 + '.';
    }
  }

  function abaEixo(e) {
    var out = '';
    out += '<div class="card"><div class="cab-eixo"><div class="nota-grande">' + fmt(e.media) + '<span class="mut" style="font-size:1rem"> /5</span></div>' +
      '<div><p class="mut peq" style="margin:0">' + h(e.codigo) + '</p><h2 style="margin:0 0 6px">' + h(e.nome) + '</h2>' +
      '<span class="chip c-' + e.posicao.chave + '">' + h(e.posicao.texto) + '</span> <span class="chip c-' + e.consistencia.chave + '">' + h(e.consistencia.texto) + '</span></div></div>' +
      barraPos(e.media, e.media === null) +
      '<div class="polos"><span><b>Polo 1</b><br>' + h(e.polo1) + '</span><span><b>Polo 5</b><br>' + h(e.polo5) + '</span></div></div>';

    var n1 = 0, nm = 0, n5 = 0;
    e.itens.forEach(function (i) { if (i.nota === null) return; if (i.nota <= 2) n1++; else if (i.nota >= 4) n5++; else nm++; });
    out += '<div class="card"><h3>O que suas respostas dizem</h3><p>' + h(textoInterpretacao(e)) + '</p>' +
      '<p class="peq mut">Das ' + e.validos + ' afirmações respondidas: ' + n1 + ' apontam para o Polo 1, ' + nm + ' ficam no meio e ' + n5 + ' apontam para o Polo 5.</p></div>';

    var conc = e.contradicoes.filter(function (c) { return c.tipo === 'concorda_ambos'; });
    var disc = e.contradicoes.filter(function (c) { return c.tipo === 'discorda_ambos'; });
    if (conc.length || (e.amplitude !== null && e.amplitude >= 3)) {
      out += '<div class="card aviso"><h3>Respostas que puxam em sentidos opostos</h3>';
      if (conc.length) {
        out += '<p class="peq">Você concordou com afirmações que apontam para lados opostos do eixo:</p><ul class="sem peq">';
        conc.slice(0, 3).forEach(function (c) { out += '<li><b>' + h(c.a) + '</b> “' + h(mapaItens[c.a].it.texto) + '” e <b>' + h(c.b) + '</b> “' + h(mapaItens[c.b].it.texto) + '”</li>'; });
        if (conc.length > 3) out += '<li class="mut">e mais ' + (conc.length - 3) + ' par(es) de afirmações.</li>';
        out += '</ul><p class="peq mut">Isso pode ser nuance real (por exemplo, apoiar a regra geral mas não em certos casos) ou dificuldade de interpretar alguma frase.</p>';
      } else {
        out += '<p class="peq">A diferença entre sua nota mais alta e a mais baixa neste eixo é de ' + e.amplitude + ' pontos, o que indica posições diferentes dentro do mesmo tema. Veja os itens abaixo.</p>';
      }
      out += '</div>';
    }
    if (disc.length) {
      out += '<div class="card"><h3>Você rejeitou os dois lados em alguns itens</h3><p class="peq">Em ' + disc.length + ' par(es) de afirmações opostas você discordou das duas. Isso é comum em quem não se identifica com nenhum dos dois extremos do eixo.</p></div>';
    }

    out += '<div class="card"><h3>Suas respostas, item a item</h3>';
    e.itens.forEach(function (i) {
      var dir = i.sentido === 'D' ? 'Polo 5' : 'Polo 1';
      out += '<div class="item"><div class="tx">' + h(i.texto) + '</div><div class="meta">';
      if (i.resposta === null) {
        out += '<span class="chip">Sem resposta</span>';
      } else {
        out += '<span class="chip">Você: ' + h(L.ROTULOS[i.resposta]) + '</span>' +
          '<span class="chip">Concordar aponta para o ' + dir + '</span>' +
          '<span class="chip c-' + (i.nota <= 2 ? 'tende1' : (i.nota >= 4 ? 'tende5' : 'media')) + '">Nota no eixo: ' + i.nota + '</span>';
      }
      out += '</div>' + (i.nota === null ? '' : '<div class="mini"><i style="left:' + pct(i.nota) + '%"></i></div>') + '</div>';
    });
    out += '</div>';

    out += '<div class="card"><details><summary>Como esta nota foi calculada</summary>' +
      '<p class="peq">A nota do eixo é a média das notas das afirmações respondidas, de 1 (Polo 1) a 5 (Polo 5). Nas afirmações que apontam para o Polo 1, a nota é invertida (6 menos a resposta) para que todas fiquem na mesma direção. A coerência compara a maior e a menor nota do eixo: diferença de até 1 ponto indica respostas coerentes; 2 pontos, coerência moderada; 3 ou mais, respostas divergentes.</p>' +
      '<p class="peq mut">Faixas de interpretação (hipóteses a calibrar): até 1,6 forte ao Polo 1; até 2,4 tendência ao Polo 1; entre 2,4 e 3,6 intermediário; até 4,4 tendência ao Polo 5; acima disso, forte ao Polo 5.</p></details></div>';
    return out;
  }

  function telaResultado() {
    var res = L.resultadoCompleto(D, estado.respostas);
    var abas = '<button class="aba' + (abaAtual === 'geral' ? ' sel' : '') + '" data-acao="aba" data-v="geral">Visão geral</button>';
    var porCodigo = {};
    res.blocos.forEach(function (b) { b.eixos.forEach(function (e) {
      porCodigo[e.codigo] = e;
      abas += '<button class="aba' + (abaAtual === e.codigo ? ' sel' : '') + '" data-acao="aba" data-v="' + e.codigo + '">' + h(e.codigo) + ' · ' + h(e.curto) + '</button>';
    }); });
    var conteudo = abaAtual === 'geral' || !porCodigo[abaAtual] ? abaGeral(res) : abaEixo(porCodigo[abaAtual]);
    app.innerHTML = '<h1>Seu resultado</h1><div class="abas" role="tablist">' + abas + '</div>' + conteudo +
      '<p class="rodape">Versão ' + h(D.versao) + '. Resultado gerado no seu navegador; nenhuma resposta foi enviada a servidor.</p>';
    var sel = app.querySelector('.aba.sel');
    if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ignora */ } }
  }

  function render() {
    if (estado.tela === 'pergunta') telaPergunta();
    else if (estado.tela === 'resultado') telaResultado();
    else telaIntro();
  }

  /* ---------- Ações ---------- */
  function novoEstado() {
    var semente = Math.floor(Math.random() * 2147483647) + 1;
    estado = { tela: 'pergunta', semente: semente, ordem: L.ordemItens(D, semente), respostas: {}, idx: 0, inicio: Date.now(), fim: null };
    abaAtual = 'geral';
    salvar();
  }
  function avancar() {
    if (estado.idx >= estado.ordem.length - 1) {
      estado.tela = 'resultado'; estado.fim = Date.now(); abaAtual = 'geral';
    } else { estado.idx++; }
    salvar(); render(); window.scrollTo(0, 0);
  }
  function baixarCSV() {
    var meta = { inicio: estado.inicio ? new Date(estado.inicio).toISOString() : '', fim: estado.fim ? new Date(estado.fim).toISOString() : '',
                 duracao_segundos: estado.inicio && estado.fim ? Math.round((estado.fim - estado.inicio) / 1000) : '' };
    var blob = new Blob(['﻿' + L.paraCSV(D, estado.respostas, meta)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'respostas_matriz_politica.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-acao]');
    if (!t) return;
    var acao = t.getAttribute('data-acao');
    if (t.tagName === 'A') ev.preventDefault();
    if (acao === 'iniciar' || acao === 'recomecar') {
      if (acao === 'recomecar' && estado.tela === 'resultado' && !window.confirm('Apagar as respostas e refazer o questionário?')) return;
      novoEstado(); render(); window.scrollTo(0, 0);
    } else if (acao === 'continuar') {
      var s = carregar(); if (s) { estado = s; estado.tela = 'pergunta'; var i = 0; while (i < estado.ordem.length && estado.respostas[estado.ordem[i]] !== undefined) i++; estado.idx = Math.min(i, estado.ordem.length - 1); }
      render(); window.scrollTo(0, 0);
    } else if (acao === 'ver-resultado') {
      var r = carregar(); if (r) { estado = r; abaAtual = 'geral'; render(); window.scrollTo(0, 0); }
    } else if (acao === 'responder') {
      estado.respostas[estado.ordem[estado.idx]] = parseInt(t.getAttribute('data-v'), 10);
      salvar();
      Array.prototype.forEach.call(app.querySelectorAll('.btn.bloco'), function (b) { b.classList.toggle('sel', b === t); });
      setTimeout(avancar, 180);
    } else if (acao === 'pular') {
      estado.respostas[estado.ordem[estado.idx]] = null; avancar();
    } else if (acao === 'voltar') {
      if (estado.idx > 0) { estado.idx--; salvar(); render(); window.scrollTo(0, 0); }
    } else if (acao === 'sair') {
      salvar(); estado = { tela: 'intro', semente: 0, ordem: [], respostas: {}, idx: 0, inicio: null, fim: null }; render(); window.scrollTo(0, 0);
    } else if (acao === 'aba') {
      abaAtual = t.getAttribute('data-v'); telaResultado(); window.scrollTo(0, 0);
    } else if (acao === 'csv') {
      baixarCSV();
    }
  });

  var salvoInicial = carregar();
  estado.tela = 'intro';
  if (salvoInicial) { /* a tela inicial oferece continuar ou ver resultado */ }
  render();
  window.__app = { estado: function () { return estado; } };
})();
