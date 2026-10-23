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
