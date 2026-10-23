/* Lógica de pontuação do questionário. Sem dependência de navegador (testável no Node). */
(function (root) {
  'use strict';

  var ROTULOS = { 1: 'Discordo totalmente', 2: 'Discordo', 3: 'Nem concordo nem discordo', 4: 'Concordo', 5: 'Concordo totalmente' };

  function recodificar(sentido, v) { return sentido === 'R' ? 6 - v : v; }
  function valido(v) { return typeof v === 'number' && v >= 1 && v <= 5; }

  // Posição do eixo (1 = polo 1, 5 = polo 5) -> rótulo
  function rotuloPosicao(m) {
    if (m === null) return { chave: 'insuficiente', texto: 'Dados insuficientes' };
    if (m <= 1.6) return { chave: 'forte1', texto: 'Alinhamento forte ao Polo 1' };
    if (m <= 2.4) return { chave: 'tende1', texto: 'Tendência ao Polo 1' };
    if (m < 3.6) return { chave: 'meio', texto: 'Posição intermediária ou ambivalente' };
    if (m < 4.4) return { chave: 'tende5', texto: 'Tendência ao Polo 5' };
    return { chave: 'forte5', texto: 'Alinhamento forte ao Polo 5' };
  }

  function resultadoEixo(eixo, respostas) {
    var itens = eixo.itens.map(function (it) {
      var v = respostas[it.id];
      var ok = valido(v);
      return { id: it.id, texto: it.texto, sentido: it.sentido,
               resposta: ok ? v : null, nota: ok ? recodificar(it.sentido, v) : null };
    });
    var notas = itens.filter(function (i) { return i.nota !== null; }).map(function (i) { return i.nota; });
    var n = notas.length;
    var media = n >= 2 ? notas.reduce(function (a, b) { return a + b; }, 0) / n : null;
    var amplitude = n >= 2 ? Math.max.apply(null, notas) - Math.min.apply(null, notas) : null;

    var contradicoes = [];
    for (var i = 0; i < itens.length; i++) {
      for (var j = i + 1; j < itens.length; j++) {
        var a = itens[i], b = itens[j];
        if (a.resposta === null || b.resposta === null || a.sentido === b.sentido) continue;
        if (a.resposta >= 4 && b.resposta >= 4) contradicoes.push({ tipo: 'concorda_ambos', a: a.id, b: b.id });
        else if (a.resposta <= 2 && b.resposta <= 2) contradicoes.push({ tipo: 'discorda_ambos', a: a.id, b: b.id });
      }
    }

    var consistencia;
    if (amplitude === null) consistencia = { chave: 'insuficiente', texto: 'Dados insuficientes' };
    else if (amplitude <= 1) consistencia = { chave: 'alta', texto: 'Respostas coerentes' };
    else if (amplitude <= 2) consistencia = { chave: 'media', texto: 'Coerência moderada' };
    else consistencia = { chave: 'baixa', texto: 'Respostas divergentes' };

    return {
      codigo: eixo.codigo, nome: eixo.nome, curto: eixo.curto, polo1: eixo.polo1, polo5: eixo.polo5,
      itens: itens, validos: n, total: itens.length, media: media, amplitude: amplitude,
      posicao: rotuloPosicao(media), consistencia: consistencia, contradicoes: contradicoes
    };
  }

  // Qualidade geral das respostas (tendência a concordar com tudo, resposta única repetida, muitas puladas)
  function qualidadeGeral(dados, respostas) {
    var todos = [];
    dados.blocos.forEach(function (b) { b.eixos.forEach(function (e) { e.itens.forEach(function (it) { todos.push(it); }); }); });
    var vals = todos.map(function (it) { return respostas[it.id]; }).filter(valido);
    var puladas = todos.length - vals.length;
    var alertas = [];
    if (vals.length) {
      var mediaBruta = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var cont = {};
      vals.forEach(function (v) { cont[v] = (cont[v] || 0) + 1; });
      var maxFreq = Math.max.apply(null, Object.keys(cont).map(function (k) { return cont[k]; })) / vals.length;
      if (vals.length >= 10 && mediaBruta >= 3.9) alertas.push('Você concordou com a maior parte das afirmações, inclusive com algumas que apontam para lados opostos. Isso pode indicar tendência a concordar com tudo e reduz a precisão do resultado.');
      if (vals.length >= 10 && mediaBruta <= 2.1) alertas.push('Você discordou da maior parte das afirmações. Se nenhuma representa sua opinião, o resultado tende ao centro.');
      if (vals.length >= 10 && maxFreq >= 0.85) alertas.push('Quase todas as respostas foram iguais. Isso sugere resposta automática e o resultado perde confiabilidade.');
    }
    if (todos.length && puladas / todos.length > 0.25) alertas.push('Mais de um quarto das afirmações ficou sem resposta; vários eixos podem ter dados insuficientes.');
    return { total: todos.length, validas: vals.length, puladas: puladas, alertas: alertas };
  }

  function resultadoCompleto(dados, respostas) {
    var blocos = dados.blocos.map(function (b) {
      return { codigo: b.codigo, nome: b.nome, eixos: b.eixos.map(function (e) { return resultadoEixo(e, respostas); }) };
    });
    return { blocos: blocos, qualidade: qualidadeGeral(dados, respostas) };
  }

  // Ordem das perguntas: embaralhada com semente, evitando dois itens seguidos do mesmo eixo
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ordemItens(dados, semente) {
    var todos = [];
    dados.blocos.forEach(function (b) { b.eixos.forEach(function (e) { e.itens.forEach(function (it) { todos.push({ id: it.id, eixo: e.codigo }); }); }); });
    var rnd = mulberry32(semente);
    for (var i = todos.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = todos[i]; todos[i] = todos[j]; todos[j] = t;
    }
    for (var k = 1; k < todos.length; k++) {
      if (todos[k].eixo === todos[k - 1].eixo) {
        for (var m = k + 1; m < todos.length; m++) {
          if (todos[m].eixo !== todos[k - 1].eixo && (k + 1 >= todos.length || todos[m].eixo !== (todos[k + 1] || {}).eixo)) {
            var tmp = todos[k]; todos[k] = todos[m]; todos[m] = tmp; break;
          }
        }
      }
    }
    return todos.map(function (x) { return x.id; });
  }

  function paraCSV(dados, respostas, meta) {
    var linhas = ['bloco;eixo;item;sentido;resposta;nota_no_eixo'];
    dados.blocos.forEach(function (b) { b.eixos.forEach(function (e) { e.itens.forEach(function (it) {
      var v = respostas[it.id];
      linhas.push([b.codigo, e.codigo, it.id, it.sentido, valido(v) ? v : '', valido(v) ? recodificar(it.sentido, v) : ''].join(';'));
    }); }); });
    linhas.push('');
    linhas.push('versao;' + dados.versao);
    if (meta) Object.keys(meta).forEach(function (k) { linhas.push(k + ';' + meta[k]); });
    return linhas.join('\n');
  }

  var api = { ROTULOS: ROTULOS, recodificar: recodificar, valido: valido, rotuloPosicao: rotuloPosicao,
              resultadoEixo: resultadoEixo, resultadoCompleto: resultadoCompleto, qualidadeGeral: qualidadeGeral,
              ordemItens: ordemItens, paraCSV: paraCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Logica = api;
})(typeof window !== 'undefined' ? window : this);
