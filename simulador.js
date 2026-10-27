/* Simulador de Redes · Laboratório Senac — código do jogo (carregado pelo Canva via jsDelivr) */
(function () {
  'use strict';

  var S = window.__SIM = {
    marcas: [],
    erros: [],
    versao: '3.7.1',
    fase: 'login', // login → comandos → carregando → jogo → fim
    pausado: true,
    teclas: {},
    joy: { x: 0, z: 0 },
    toque: false,
    interativos: [],
    colisores: [],
    leds: [],
    aluno: { nome: '', turma: '' },
    tempoInicio: null,
    tempoFinal: null
  };
  window.__SIM_MARCAS = S.marcas;
  window.__SIM_ERROS = S.erros;

  function registrarErro(origem, e) {
    var msg = (e && e.message) ? e.message : String(e);
    S.erros.push(origem + ': ' + msg);
    if (window.console && console.error) console.error('[SIM]', origem, e);
    if (S.mostrarFalha) S.mostrarFalha();
  }
  S.registrarErro = registrarErro;

  // Cada seção registra sua marca antes de rodar: a marca prova que o código chegou
  // inteiro ao navegador; um erro dentro dela é problema de execução.
  function secao(id, fn) {
    S.marcas.push(id);
    try {
      fn();
    } catch (e) {
      registrarErro(id, e);
    }
  }

  // Envolve funções chamadas depois (cliques, missões) para nenhum erro travar o jogo.
  S.protegido = function (nome, fn) {
    return function () {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        registrarErro(nome, e);
      }
    };
  };

  window.addEventListener('error', function (ev) {
    registrarErro('global', ev.error || ev.message);
  });

  /* ================================================================== */
  secao('B01-constantes', function () {
    // Logo Senac em pixels (paleta + run-length). Desenhado direto no canvas:
    // o Canva bloqueia imagens "data:", então não usamos <img>.
    S.LOGO_DADOS = {"w":96,"h":57,"p":[[0,0,0,0],[81,137,186,163],[10,86,157,255],[102,152,196,156],[110,157,198,105],[76,133,184,255],[142,178,208,82],[247,175,102,255],[240,138,31,255],[180,205,221,41]],"d":"0X11210131410Z0t11270Z0r2b11410Z0k512f31610Z0f612j51410Z0d310646035126410Z0u61022201410Z0x110Z0g728773084101910Z068n710Z039103718u710Z028z710V728C720P758u710X758p720Z04748m7103910Z04738k0Z0e718h710Z0g8g710Z0i718d710Z0k728b0Z0m73880Z0o7485710Z0p75830Z0q780Z0r750Z0u740Z0v730Z0w720Z0x710Z0Z0Z0Z0761311231610Z0p611128110Z0e916141324103312a110Z0c41112602112b110Z0a412901412c110c410125114191099141112511410f2301316108312a012731416201320a312b4107312a51610b61273106512a516126610f91512d3105112d0b612961031129314201260h2f1103112f41096129519101412841044126610e3127032702412h91086151294101275191062711610b612611053126022641033126110c31265131270811291131081125110711250126410531260d11265126410a2d0141032608912551250826610795012d0a91512e310191261107112b1107260361112l510c61512d11012q082602312n0f9101312b512q082631112p0j41112y08265126024163412d610l312c0e1125082c1107265126510b910b2b310d1125082c079126312731081122410951250126310c1125082c610611264111275191051125314104914126013127014261071125082d61041127410129114102112a0228022a3107112508260128012a41022b522j41032931071125082641112i410291512a01412h4105112731075125082602312902264104112903412d3161076111253107310123014107312401410261112511410211012301610611270541315101245131410e63910U4131115201"};

    S.COR = {
      azul: 0x0b4f9c, // azul Senac (conferir com o manual de marca)
      azulEscuro: 0x08326a,
      laranja: 0xf7941d, // laranja Senac (conferir com o manual de marca)
      noite: 0x0a1a33,
      parede: 0xe4e9ef,
      pisoA: 0xb8c1cc,
      pisoB: 0xa7b1be,
      madeira: 0xc79a66,
      madeiraEscura: 0x7d5a3a,
      metal: 0x9aa4b0,
      metalEscuro: 0x2a3038,
      plastico: 0x1f2329,
      plasticoClaro: 0xd9dee4,
      caboAzul: 0x2d7fe0,
      caboCinza: 0xa0a6ad,
      calca: 0x1d2b45,
      tenis: 0xf4f4f4,
      ledVerde: 0x39ff6a,
      ledAmbar: 0xffb020,
      ledApagado: 0x1d2a1f,
      destaque: 0x664018
    };

    S.CSS = {
      fonte: 'Arial, Helvetica, sans-serif',
      mono: '"Courier New", Courier, monospace',
      fundo: '#0A1A33',
      painel: '#0E2547',
      painel2: '#133465',
      borda: '#2F5C99',
      laranja: '#F7941D',
      laranjaEscuro: '#B8650A',
      azul: '#0B4F9C',
      branco: '#FFFFFF',
      cinza: '#AFC2D8',
      verde: '#6BF08E',
      vermelho: '#FF7676',
      amarelo: '#FFD36B'
    };

    S.SALA = { largura: 12, profundidade: 9, altura: 3 };

    S.CFG = {
      velocidade: 3.0,
      raio: 0.3,
      alcance: 1.9,
      camera: { x: 0, y: 5.4, z: 5.9 },
      alturaRender: 360, // resolução interna baixa = visual de PS1 e leveza
      alturaRenderToque: 300,
      inicio: { x: -4.3, z: 3.2 },
      dica1: 180, // segundos na mesma missão até a primeira dica + seta laranja
      dica2: 300 // segundos até a dica mais detalhada
    };

    // Padrão T-568B, pino 1 → 8.
    S.T568B = [
      { id: 'bl', nome: 'Branco-laranja', cor: '#F7861D', listrado: true },
      { id: 'l', nome: 'Laranja', cor: '#F7861D', listrado: false },
      { id: 'bv', nome: 'Branco-verde', cor: '#2EAA4A', listrado: true },
      { id: 'a', nome: 'Azul', cor: '#2160D8', listrado: false },
      { id: 'ba', nome: 'Branco-azul', cor: '#2160D8', listrado: true },
      { id: 'v', nome: 'Verde', cor: '#2EAA4A', listrado: false },
      { id: 'bm', nome: 'Branco-marrom', cor: '#7A4A26', listrado: true },
      { id: 'm', nome: 'Marrom', cor: '#7A4A26', listrado: false }
    ];

    // Padrão T-568A (etiqueta "A" das keystones), montado com os mesmos fios.
    S.T568A = ['bv', 'v', 'bl', 'a', 'ba', 'l', 'bm', 'm'].map(function (id) {
      return S.T568B.filter(function (f) { return f.id === id; })[0];
    });

    S.REDE = {
      prefixo: '192.168.0.',
      gateway: '192.168.0.1',
      mascara: '255.255.255.0',
      ipsValidos: ['192.168.0.2', '192.168.0.3']
    };
  });

  /* ================================================================== */
  secao('B02-utilitarios', function () {
    S.estilo = function (el, estilos) {
      for (var k in estilos) {
        if (Object.prototype.hasOwnProperty.call(estilos, k)) el.style[k] = estilos[k];
      }
      return el;
    };

    // Cria elementos sempre via JS e com estilo inline: o Canva não "congela"
    // estilos nem o Tailwind injetado interfere.
    S.el = function (tag, estilos, texto, pai) {
      var e = document.createElement(tag);
      if (estilos) S.estilo(e, estilos);
      if (texto !== undefined && texto !== null) e.textContent = texto;
      if (pai) pai.appendChild(e);
      return e;
    };

    S.hex = function (n) {
      return '#' + n.toString(16).padStart(6, '0');
    };

    // Turma: só números (2026.6.103 vira 20266103). A única palavra aceita é TESTE.
    S.normalizarTurma = function (v) {
      var t = String(v || '').toUpperCase();
      var digitos = t.replace(/[^0-9]/g, '');
      if (!digitos && t.replace(/[^A-Z]/g, '') === 'TESTE') return 'TESTE';
      return digitos;
    };
    // Enquanto digita: deixa formar a palavra TESTE; o resto vira só números.
    S.filtrarTurmaDigitando = function (v) {
      var t = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (/^[A-Z]+$/.test(t) && 'TESTE'.indexOf(t) === 0) return t;
      return t.replace(/[^0-9]/g, '');
    };

    S.formatarTempo = function (seg) {
      seg = Math.max(0, seg);
      var m = Math.floor(seg / 60);
      var s = Math.floor(seg % 60);
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    };

    S.formatarTempoLongo = function (seg) {
      var m = Math.floor(seg / 60);
      var s = seg - m * 60;
      return m + ' min ' + s.toFixed(1).replace('.', ',') + ' s';
    };

    S.embaralhar = function (lista) {
      var a = lista.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    };

    S.hashTexto = function (txt) {
      var h = 0x811c9dc5;
      for (var i = 0; i < txt.length; i++) {
        h ^= txt.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return h;
    };

    S.agora = function () {
      return performance.now();
    };

    // Cronômetro com pausa (cenas curtas no meio do jogo não contam tempo).
    S.tempoPausado = 0;
    S.pausaDesde = null;
    S.zerarRelogio = function () {
      S.tempoInicio = S.agora();
      S.tempoFinal = null;
      S.tempoPausado = 0;
      S.pausaDesde = null;
    };
    S.pausarRelogio = function () {
      if (S.tempoInicio !== null && S.tempoFinal === null && S.pausaDesde === null) S.pausaDesde = S.agora();
    };
    S.retomarRelogio = function () {
      if (S.pausaDesde === null) return;
      var d = S.agora() - S.pausaDesde;
      S.tempoPausado += d;
      if (S.jogo) S.jogo.progressoEm += d; // as dicas também não contam a cena
      S.pausaDesde = null;
    };
    S.tempoDeJogo = function () {
      if (S.tempoInicio === null) return 0;
      var fim = S.tempoFinal !== null ? S.tempoFinal : (S.pausaDesde !== null ? S.pausaDesde : S.agora());
      return (fim - S.tempoInicio - S.tempoPausado) / 1000;
    };

    S.ehToque = function () {
      try {
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      } catch (e) { /* ignora */ }
      return (navigator.maxTouchPoints || 0) > 0 && !(window.matchMedia && window.matchMedia('(hover: hover)').matches);
    };

    var canvasLogo = null;
    S.logoCanvas = function () {
      if (canvasLogo) return canvasLogo;
      var d = S.LOGO_DADOS;
      var DIG = '0123456789abcdefghijklmnopqrstuvwxyz';
      var LEN = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      canvasLogo = document.createElement('canvas');
      canvasLogo.width = d.w;
      canvasLogo.height = d.h;
      var ctx = canvasLogo.getContext('2d');
      var img = ctx.createImageData(d.w, d.h);
      var pos = 0;
      for (var i = 0; i < d.d.length; i += 2) {
        var cor = d.p[DIG.indexOf(d.d.charAt(i))];
        var n = LEN.indexOf(d.d.charAt(i + 1));
        for (var k = 0; k < n; k++) {
          var o = (pos + k) * 4;
          img.data[o] = cor[0];
          img.data[o + 1] = cor[1];
          img.data[o + 2] = cor[2];
          img.data[o + 3] = cor[3];
        }
        pos += n;
      }
      ctx.putImageData(img, 0, 0);
      return canvasLogo;
    };

    // Primeiro nome do aluno com inicial maiúscula (usado nas falas).
    S.primeiroNome = function () {
      var n = ((S.aluno && S.aluno.nome) || 'aluno').trim().split(/\s+/)[0];
      return n.charAt(0).toUpperCase() + n.slice(1);
    };

    // Ícones desenhados em SVG: não dependem das fontes do aparelho
    // (o símbolo ⏻ em texto não aparece em vários celulares).
    var ICONES = {
      energia: ['M12 3v8', 'M6.6 6.6a7.6 7.6 0 1 0 10.8 0'],
      reset: ['M19.5 12a7.5 7.5 0 1 1-2.2-5.3', 'M19.6 3.8v4.2h-4.2'],
      telaCheia: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5']
    };
    S.icone = function (nome, tamanho, espessura) {
      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', String(tamanho));
      svg.setAttribute('height', String(tamanho));
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', String(espessura || 2.6));
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.display = 'block';
      svg.style.margin = 'auto';
      svg.style.pointerEvents = 'none';
      (ICONES[nome] || []).forEach(function (d) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
      });
      return svg;
    };

    S.armazenar = function (chave, valor) {
      try {
        if (valor === undefined) return window.sessionStorage.getItem(chave);
        window.sessionStorage.setItem(chave, valor);
      } catch (e) { /* armazenamento indisponível: segue sem */ }
      return null;
    };

    // Configurações (sons e acessibilidade). Ficam na sessão da aba, como o
    // nome e a turma. A tela de configurações fica em p17.
    S.CFG_PADRAO = {
      volEfeitos: 0.8,
      volFalas: 0.8,
      volMusica: 0.5,
      daltonismo: false,
      legendas: false,
      texto: 1, // 1 = normal · 1.2 = grande · 1.35 = muito grande
      contorno: false,
      lerVoz: false,
      marteloAssistido: false,
      botoesGrandes: false,
      joystickDireita: false
    };
    S.cfg = {};
    (function () {
      var salvo = null;
      try { salvo = JSON.parse(S.armazenar('sim-config') || 'null'); } catch (e) { salvo = null; }
      for (var k in S.CFG_PADRAO) {
        S.cfg[k] = salvo && typeof salvo[k] === typeof S.CFG_PADRAO[k] ? salvo[k] : S.CFG_PADRAO[k];
      }
    })();
    S.salvarConfig = function () {
      S.armazenar('sim-config', JSON.stringify(S.cfg));
    };

    // Sons: o motor de áudio (p16) substitui estas funções vazias. Assim
    // qualquer parte do jogo pode chamar S.som('martelo') sem se preocupar.
    S.som = function () {};
    S.somGenerico = function () {};
    S.voz = {
      fala: function () {},
      acompanhar: function () {},
      frase: function () {},
      parar: function () {}
    };
  });


  /* ================================================================== */
  secao('U01-raiz-e-tema', function () {
    var C = S.CSS;
    var raiz = document.createElement('div');
    raiz.id = 'sim-root';
    raiz.setAttribute('tabindex', '0');
    S.estilo(raiz, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%', // ajustado abaixo para caber só na parte visível do iframe
      overflow: 'hidden',
      background: C.fundo,
      color: C.branco,
      fontFamily: C.fonte,
      outline: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
      touchAction: 'none',
      webkitTapHighlightColor: 'transparent'
    });
    document.body.appendChild(raiz);
    S.raiz = raiz;
    document.documentElement.style.touchAction = 'none';
    document.body.style.touchAction = 'none';

    // O Canva pode deixar o iframe mais alto que a tela (principalmente no
    // celular deitado). Faixas invisíveis de 40 px + IntersectionObserver dizem
    // qual parte do iframe está realmente visível, e o jogo se encaixa nela.
    S.areaVisivel = null;
    S.ajustarAreaVisivel = function () {
      var hIframe = window.innerHeight;
      var v = S.areaVisivel;
      var cheio = document.fullscreenElement || document.webkitFullscreenElement;
      var topo = 0;
      var altura = hIframe;
      if (v && !cheio && v.altura >= 120 && v.altura < hIframe - 2) {
        topo = Math.max(0, Math.round(v.topo));
        altura = Math.round(v.altura);
      }
      var novoTopo = topo + 'px';
      var novaAltura = altura + 'px';
      if (raiz.style.top !== novoTopo || raiz.style.height !== novaAltura) {
        raiz.style.top = novoTopo;
        raiz.style.height = novaAltura;
        if (S.redimensionar) S.redimensionar();
      }
    };
    var faixas = [];
    var retangulos = [];
    var observador = null;
    function recalcularVisivel() {
      var topo = Infinity;
      var base = -Infinity;
      retangulos.forEach(function (r) {
        if (!r) return;
        if (r.top < topo) topo = r.top;
        if (r.bottom > base) base = r.bottom;
      });
      S.areaVisivel = base > topo ? { topo: topo, altura: base - topo } : null;
      S.ajustarAreaVisivel();
    }
    function montarFaixas() {
      if (!observador) return;
      faixas.forEach(function (f) {
        observador.unobserve(f);
        f.remove();
      });
      faixas = [];
      retangulos = [];
      var h = window.innerHeight;
      for (var y = 0; y < h; y += 40) {
        var f = document.createElement('div');
        S.estilo(f, {
          position: 'absolute',
          top: y + 'px',
          left: '0',
          width: '1px',
          height: Math.min(40, h - y) + 'px',
          pointerEvents: 'none',
          visibility: 'hidden'
        });
        document.body.appendChild(f);
        faixas.push(f);
        retangulos.push(null);
        observador.observe(f);
      }
    }
    if (window.IntersectionObserver) {
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          var i = faixas.indexOf(e.target);
          if (i < 0) return;
          var b = e.boundingClientRect;
          var r = e.intersectionRect;
          if (!e.isIntersecting || r.height <= 0 || b.height <= 0) {
            retangulos[i] = null;
            return;
          }
          // Converte para pixels do próprio iframe: funciona mesmo se o Canva
          // ampliar/reduzir o iframe com escala (transform).
          var f = faixas[i];
          var y0 = parseFloat(f.style.top);
          var esc = parseFloat(f.style.height) / b.height;
          retangulos[i] = { top: y0 + (r.top - b.top) * esc, bottom: y0 + (r.bottom - b.top) * esc };
        });
        recalcularVisivel();
      }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
      montarFaixas();
    }
    var alturaAnterior = window.innerHeight;
    window.addEventListener('resize', function () {
      if (window.innerHeight !== alturaAnterior) {
        alturaAnterior = window.innerHeight;
        montarFaixas();
      }
      S.ajustarAreaVisivel();
    });

    // Tela cheia (quando o Canva permitir): ocupa a tela toda e trava em paisagem.
    S.podeTelaCheia = function () {
      return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    };
    S.alternarTelaCheia = function () {
      var el = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      var pedir = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!pedir) return;
      try {
        var p = pedir.call(el, { navigationUI: 'hide' });
        var travar = function () {
          try {
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
          } catch (e) { /* nem todo aparelho permite */ }
        };
        if (p && p.then) p.then(travar, function () {});
        else travar();
      } catch (e) { /* bloqueado pelo navegador */ }
    };
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () { setTimeout(S.ajustarAreaVisivel, 60); });
    });
    S.ui = {};

    S.ui.camada = function (z, estilos) {
      var base = { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', zIndex: String(z) };
      if (estilos) for (var k in estilos) base[k] = estilos[k];
      return S.el('div', base, null, raiz);
    };

    S.ui.botao = function (texto, tipo, aoClicar, pai) {
      var cores = {
        primario: { fundo: C.laranja, texto: '#10203A', sombra: C.laranjaEscuro },
        secundario: { fundo: C.painel2, texto: C.branco, sombra: '#071430' },
        perigo: { fundo: '#C9443D', texto: C.branco, sombra: '#7D1F1A' },
        claro: { fundo: '#E9EEF5', texto: '#10203A', sombra: '#8D9BB0' }
      }[tipo || 'primario'];
      var b = S.el('button', {
        background: cores.fundo,
        color: cores.texto,
        border: '3px solid #071430',
        borderRadius: '6px',
        boxShadow: '0 4px 0 ' + cores.sombra,
        padding: S.raiz.clientHeight < 520 ? '7px 12px' : '10px 18px',
        fontFamily: C.fonte,
        fontWeight: '700',
        fontSize: S.raiz.clientHeight < 520 ? '14px' : '15px',
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transform: 'translateY(0)',
        touchAction: 'manipulation',
        lineHeight: '1.2'
      }, texto, pai);
      b.type = 'button';
      b.className = 'sim-btn';
      b.addEventListener('pointerdown', function () {
        b.style.transform = 'translateY(3px)';
        b.style.boxShadow = '0 1px 0 ' + cores.sombra;
      });
      var soltar = function () {
        b.style.transform = 'translateY(0)';
        b.style.boxShadow = '0 4px 0 ' + cores.sombra;
      };
      b.addEventListener('pointerup', soltar);
      b.addEventListener('pointerleave', soltar);
      if (aoClicar) b.addEventListener('click', S.protegido('botao:' + texto, aoClicar));
      return b;
    };

    S.ui.cartao = function (pai, estilos) {
      var base = {
        background: C.painel,
        border: '3px solid ' + C.borda,
        borderRadius: '10px',
        boxShadow: '0 8px 0 #050E1F',
        padding: '22px 24px',
        boxSizing: 'border-box',
        color: C.branco,
        fontFamily: C.fonte
      };
      if (estilos) for (var k in estilos) base[k] = estilos[k];
      return S.el('div', base, null, pai);
    };

    S.ui.campo = function (rotulo, pai, opcoes) {
      opcoes = opcoes || {};
      var wrap = S.el('label', { display: 'block', marginBottom: '14px' }, null, pai);
      S.el('div', { fontSize: '13px', fontWeight: '700', color: C.cinza, marginBottom: '6px', letterSpacing: '0.04em' }, rotulo, wrap);
      var input = S.el('input', {
        width: '100%',
        boxSizing: 'border-box',
        background: '#071733',
        color: C.branco,
        border: '3px solid ' + C.borda,
        borderRadius: '6px',
        padding: '10px 12px',
        fontSize: '16px', // 16px evita zoom automático no iPhone
        fontFamily: opcoes.mono ? C.mono : C.fonte,
        outline: 'none',
        userSelect: 'text',
        webkitUserSelect: 'text',
        touchAction: 'manipulation'
      }, null, wrap);
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      if (opcoes.placeholder) input.placeholder = opcoes.placeholder;
      if (opcoes.max) input.maxLength = opcoes.max;
      if (opcoes.inputMode) input.inputMode = opcoes.inputMode;
      if (opcoes.maiusculas) input.autocapitalize = 'characters';
      input.addEventListener('focus', function () { input.style.borderColor = C.laranja; });
      input.addEventListener('blur', function () { input.style.borderColor = C.borda; });
      return { wrap: wrap, input: input };
    };

    // Tela cheia com cartão central rolável (login, comandos, final).
    S.ui.tela = function (z, larguraMax) {
      var fundo = S.ui.camada(z || 30, {
        background: 'radial-gradient(ellipse at 50% 0%, #163E78 0%, #0A1A33 65%)',
        overflowY: 'auto',
        touchAction: 'pan-y',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '18px',
        boxSizing: 'border-box'
      });
      fundo.setAttribute('data-tela', String(z || 30));
      var cartao = S.ui.cartao(fundo, {
        width: '100%',
        maxWidth: larguraMax || '460px',
        margin: 'auto 0'
      });
      return { fundo: fundo, cartao: cartao, fechar: function () { fundo.remove(); } };
    };

    S.ui.logo = function (pai, altura) {
      var fonte = S.logoCanvas();
      var c = S.el('canvas', {
        height: (altura || 44) + 'px',
        width: 'auto',
        imageRendering: 'pixelated',
        display: 'block',
        background: '#FFFFFF',
        borderRadius: '6px',
        padding: '6px 10px',
        boxSizing: 'content-box'
      }, null, pai);
      c.width = fonte.width;
      c.height = fonte.height;
      c.getContext('2d').drawImage(fonte, 0, 0);
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', 'Senac');
      return c;
    };
  });

  /* ================================================================== */
  secao('U02-modal-e-avisos', function () {
    var C = S.CSS;
    var modalAtual = null;

    // Janela 2D por cima do 3D. Enquanto aberta o 3D para de renderizar.
    // Telas baixas (celular deitado): interface mais compacta.
    S.ui.compacto = function () {
      return S.raiz.clientHeight < 520;
    };

    S.ui.abrirModal = function (titulo, opcoes) {
      opcoes = opcoes || {};
      var compacto = S.ui.compacto();
      if (modalAtual) modalAtual.fechar(true);
      var fundo = S.ui.camada(20, {
        background: 'rgba(4, 10, 24, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compacto ? '4px' : '10px',
        boxSizing: 'border-box'
      });
      var cartao = S.ui.cartao(fundo, {
        width: '100%',
        maxWidth: opcoes.largura || '720px',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '0'
      });
      var topo = S.el('div', {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: compacto ? '6px 12px' : '12px 16px',
        borderBottom: '3px solid ' + C.borda,
        background: C.painel2,
        borderRadius: '7px 7px 0 0'
      }, null, cartao);
      S.el('div', { fontWeight: '700', fontSize: '16px', color: C.laranja, letterSpacing: '0.03em' }, titulo, topo);
      var corpo = S.el('div', {
        padding: compacto ? '8px 12px 10px' : '14px 16px 16px',
        overflowY: 'auto',
        touchAction: 'pan-y',
        fontSize: '14px',
        lineHeight: '1.45'
      }, null, cartao);

      var fechado = false;
      var m = {
        fundo: fundo,
        cartao: cartao,
        corpo: corpo,
        cancelavel: opcoes.fechavel !== false,
        fechar: function (silencioso) {
          if (fechado) return;
          fechado = true;
          fundo.remove();
          if (modalAtual === m) modalAtual = null;
          if (S.fase === 'jogo') S.pausado = false;
          if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
          if (!silencioso && opcoes.aoFechar) S.protegido('modal:aoFechar', opcoes.aoFechar)();
          S.raiz.focus({ preventScroll: true });
        }
      };
      if (opcoes.fechavel !== false) {
        var x = S.ui.botao('✕', 'secundario', function () { m.fechar(); }, topo);
        S.estilo(x, { padding: '4px 10px', fontSize: '14px' });
        x.setAttribute('aria-label', 'Fechar');
      }
      modalAtual = m;
      // Teclado: o foco vai para a janela (Tab percorre os botões dela).
      cartao.setAttribute('tabindex', '-1');
      cartao.setAttribute('role', 'dialog');
      cartao.setAttribute('aria-label', titulo);
      cartao.style.outline = 'none';
      setTimeout(function () {
        if (!fechado && !cartao.contains(document.activeElement)) {
          try { cartao.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
        }
      }, 30);
      if (S.ocultarAviso) S.ocultarAviso();
      S.pausado = true;
      S.teclas = {};
      S.joy.x = 0;
      S.joy.z = 0;
      if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
      return m;
    };

    S.ui.modalAberto = function () {
      return modalAtual;
    };

    // Avisos rápidos no topo.
    var camadaAviso = null;
    var timerAviso = null;
    S.aviso = function (texto, tipo, duracao) {
      if (!camadaAviso) {
        camadaAviso = S.el('div', {
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: '25',
          maxWidth: 'calc(100% - 24px)',
          boxSizing: 'border-box',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '3px solid #071430',
          fontWeight: '700',
          fontSize: '14px',
          textAlign: 'center',
          pointerEvents: 'none',
          transition: 'opacity .2s ease',
          opacity: '0'
        }, null, S.raiz);
      }
      var cores = {
        ok: ['#1F7A3E', C.branco],
        erro: ['#A8322C', C.branco],
        alerta: ['#C98A10', '#10203A'],
        info: [C.painel2, C.branco]
      }[tipo || 'info'];
      var baixo = S.ui.compacto();
      camadaAviso.style.top = baixo ? 'auto' : '12px';
      camadaAviso.style.bottom = baixo ? '64px' : 'auto';
      camadaAviso.style.maxWidth = baixo && S.toque ? 'calc(100% - 300px)' : 'calc(100% - 24px)';
      camadaAviso.style.fontSize = baixo ? '13px' : '14px';
      camadaAviso.textContent = S.marcarSimbolo ? S.marcarSimbolo(texto, tipo) : texto;
      if (S.somGenerico) S.somGenerico(tipo);
      camadaAviso.style.background = cores[0];
      camadaAviso.style.color = cores[1];
      camadaAviso.style.opacity = '1';
      clearTimeout(timerAviso);
      timerAviso = setTimeout(function () { camadaAviso.style.opacity = '0'; }, duracao || 2800);
    };

    S.ocultarAviso = function () {
      if (camadaAviso) camadaAviso.style.opacity = '0';
    };

    // Aviso para girar o celular (só em telas de toque na vertical).
    var guarda = null;
    S.ui.verificarOrientacao = function () {
      var w = S.raiz.clientWidth;
      var h = S.raiz.clientHeight;
      var retrato = S.toque && h > w;
      if (retrato && !guarda) {
        guarda = S.ui.camada(50, {
          background: C.fundo,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          gap: '18px'
        });
        var cel = S.el('div', {
          width: '56px',
          height: '96px',
          border: '5px solid ' + C.laranja,
          borderRadius: '12px',
          boxSizing: 'border-box',
          animation: 'sim-girar 1.6s ease-in-out infinite'
        }, null, guarda);
        cel.setAttribute('aria-hidden', 'true');
        S.el('div', { fontSize: '20px', fontWeight: '700' }, 'Gire o celular', guarda);
        S.el('div', { fontSize: '15px', color: C.cinza, maxWidth: '280px' }, 'O simulador funciona com o celular na horizontal (paisagem).', guarda);
      } else if (!retrato && guarda) {
        guarda.remove();
        guarda = null;
      }
    };
    var estiloAnim = document.createElement('style');
    estiloAnim.textContent = '@keyframes sim-girar{0%,20%{transform:rotate(0)}50%,70%{transform:rotate(-90deg)}100%{transform:rotate(0)}}' +
      '@keyframes sim-pulsar{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}';
    document.head.appendChild(estiloAnim);

    // Selo discreto quando algo deu errado internamente (F9 mostra detalhes).
    var selo = null;
    S.mostrarFalha = function () {
      if (selo || !S.raiz) return;
      selo = S.el('div', {
        position: 'absolute',
        left: '8px',
        bottom: '8px',
        zIndex: '60',
        background: '#A8322C',
        color: '#FFFFFF',
        fontSize: '11px',
        fontWeight: '700',
        padding: '3px 8px',
        borderRadius: '4px',
        pointerEvents: 'none'
      }, 'Aviso técnico (F9)', S.raiz);
    };
  });

  /* ================================================================== */
  secao('U03-login', function () {
    var C = S.CSS;

    // Tela baixa (celular deitado) ou estreita: layout compacto em duas colunas.
    S.ui.telaApertada = function () {
      return S.raiz.clientHeight < 520 || S.raiz.clientWidth < 560;
    };

    S.ui.compactarTela = function (t) {
      S.estilo(t.fundo, { padding: '6px' });
      S.estilo(t.cartao, { padding: '12px 14px', boxShadow: '0 4px 0 #050E1F' });
    };

    S.ui.compactarCampo = function (c) {
      c.wrap.style.marginBottom = '8px';
      c.wrap.firstChild.style.marginBottom = '3px';
      c.wrap.firstChild.style.fontSize = '11px';
      c.input.style.padding = '7px 10px';
    };

    S.ui.mostrarLogin = function () {
      S.fase = 'login';
      var ap = S.ui.telaApertada();
      var deitado = ap && S.raiz.clientWidth >= 560;
      var t = S.ui.tela(30, deitado ? '760px' : '440px');
      S.telaLogin = t;
      t.modo = String(ap) + '|' + String(deitado);
      if (ap) S.ui.compactarTela(t);

      // Em celular deitado: coluna da esquerda (marca + personagem) e da direita (campos).
      var corpo = S.el('div', deitado
        ? { display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: '16px', alignItems: 'start' }
        : null, null, t.cartao);
      var colA = S.el('div', null, null, corpo);
      var colB = deitado ? S.el('div', null, null, corpo) : colA;

      var cab = S.el('div', { display: 'flex', alignItems: 'center', gap: ap ? '10px' : '14px', marginBottom: ap ? '10px' : '18px' }, null, colA);
      S.ui.logo(cab, ap ? 30 : 40);
      var tit = S.el('div', null, null, cab);
      S.el('div', { fontSize: ap ? '17px' : '21px', fontWeight: '700', lineHeight: '1.15' }, 'Simulador de Redes', tit);
      S.el('div', { fontSize: ap ? '11px' : '13px', color: C.laranja, fontWeight: '700', letterSpacing: '0.06em' }, 'LABORATÓRIO · CABEAMENTO E IP', tit);

      // Escolha do personagem.
      var genero = S.armazenar('sim-genero') === 'f' ? 'f' : 'm';
      var blocoPers = S.el('div', { marginBottom: ap ? '8px' : '14px' }, null, deitado ? colA : colB);
      S.el('div', { fontSize: ap ? '11px' : '13px', fontWeight: '700', color: C.cinza, marginBottom: ap ? '3px' : '6px', letterSpacing: '0.04em' }, 'PERSONAGEM', blocoPers);
      var opcoes = S.el('div', { display: 'flex', gap: '8px' }, null, blocoPers);
      var botoesGenero = {};
      function marcarGenero() {
        ['m', 'f'].forEach(function (g) {
          var b = botoesGenero[g];
          var sel = g === genero;
          b.style.background = sel ? C.laranja : '#071733';
          b.style.color = sel ? '#10203A' : C.branco;
          b.style.borderColor = sel ? '#071430' : C.borda;
          b.setAttribute('aria-pressed', sel ? 'true' : 'false');
        });
      }
      [['m', '🧑 Masculino'], ['f', '👩 Feminino']].forEach(function (op) {
        var b = S.el('button', {
          flex: '1 1 0',
          padding: ap ? '7px 8px' : '9px 10px',
          border: '3px solid ' + C.borda,
          borderRadius: '6px',
          fontFamily: C.fonte,
          fontWeight: '700',
          fontSize: ap ? '13px' : '14px',
          cursor: 'pointer',
          touchAction: 'manipulation'
        }, op[1], opcoes);
        b.type = 'button';
        b.addEventListener('click', function () {
          genero = op[0];
          marcarGenero();
        });
        botoesGenero[op[0]] = b;
      });
      marcarGenero();
      if (deitado) {
        S.el('div', { fontSize: '11px', color: C.cinza, lineHeight: '1.35' },
          'Seu nome, turma e tempo aparecem no ranking da turma.', colA);
      }

      var nome = S.ui.campo('NOME DO ALUNO', colB, { placeholder: 'Ex.: Maria Souza', max: 40 });
      var turma = S.ui.campo('CÓDIGO DA TURMA', colB, { placeholder: 'Ex.: 20266103', max: 20, maiusculas: true });
      if (ap) {
        S.ui.compactarCampo(nome);
        S.ui.compactarCampo(turma);
      }
      nome.input.value = S.armazenar('sim-nome') || '';
      turma.input.value = S.filtrarTurmaDigitando(S.armazenar('sim-turma') || '');
      turma.input.addEventListener('input', function () {
        var antes = turma.input.value;
        var pos = turma.input.selectionStart;
        var limpo = S.filtrarTurmaDigitando(antes);
        if (limpo === antes) return;
        // Mantém o cursor no lugar mesmo removendo pontos, espaços e letras.
        var ate = S.filtrarTurmaDigitando(antes.slice(0, pos)).length;
        turma.input.value = limpo;
        try { turma.input.setSelectionRange(ate, ate); } catch (e) { /* ignora */ }
      });

      var erro = S.el('div', { color: C.vermelho, fontSize: '13px', fontWeight: '700', minHeight: ap ? '0' : '18px', marginBottom: ap ? '4px' : '8px' }, '', colB);
      var botoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, colB);

      function entrar() {
        var n = nome.input.value.trim().replace(/\s+/g, ' ');
        var tu = S.normalizarTurma(turma.input.value);
        if (n.length < 2) {
          erro.textContent = 'Digite seu nome (pelo menos 2 letras).';
          nome.input.focus();
          return;
        }
        if (tu.length < 2) {
          erro.textContent = 'Digite o código da turma: só números (ex.: 20266103) ou TESTE.';
          turma.input.focus();
          return;
        }
        S.aluno.nome = n;
        S.aluno.turma = tu;
        S.aluno.genero = genero;
        S.armazenar('sim-nome', n);
        S.armazenar('sim-turma', tu);
        S.armazenar('sim-genero', genero);
        t.fechar();
        S.ui.mostrarFases();
      }

      var bEntrar = S.ui.botao('Entrar', 'primario', entrar, botoes);
      bEntrar.style.flex = '1 1 120px';
      var bRank = S.ui.botao('Ver ranking', 'secundario', function () {
        S.ui.mostrarRanking('', null, 'geral');
      }, botoes);
      bRank.style.flex = '1 1 120px';

      [nome.input, turma.input].forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            entrar();
          }
        });
      });

      if (!deitado) {
        S.el('div', { fontSize: '12px', color: C.cinza, marginTop: ap ? '8px' : '16px', lineHeight: '1.4' },
          'Seu nome, turma e tempo aparecem no ranking da turma. Melhor jogado no computador ou no celular na horizontal.', t.cartao);
      }
      var rodLogin = S.el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: ap ? '6px' : '10px' }, null, t.cartao);
      S.ui.botaoAtualizar(rodLogin);
      S.el('div', { fontSize: '10px', color: '#5F7896', textAlign: 'right' },
        'versão ' + S.versao + (window.__SIM_CARREGADOR ? ' · carregador ' + window.__SIM_CARREGADOR : '') + (window.__SIM_ORIGEM ? ' · ' + window.__SIM_ORIGEM : ''), rodLogin);
      // Se o celular girar, a tela é remontada no layout certo sem perder o que foi digitado.
      t.guardar = function () {
        S.armazenar('sim-nome', nome.input.value);
        S.armazenar('sim-turma', turma.input.value);
        S.armazenar('sim-genero', genero);
      };
      if (!S.toque) setTimeout(function () { (nome.input.value ? turma.input : nome.input).focus(); }, 50);
    };

    S.ui.reorganizarLogin = function () {
      var t = S.telaLogin;
      if (S.fase !== 'login' || !t || !t.fundo.isConnected) return;
      var ap = S.ui.telaApertada();
      var modo = String(ap) + '|' + String(ap && S.raiz.clientWidth >= 560);
      if (modo === t.modo) return;
      t.guardar();
      t.fechar();
      S.ui.mostrarLogin();
    };
  });

  /* ================================================================== */
  secao('U04-comandos', function () {
    var C = S.CSS;

    function linhaComando(pai, tecla, acao, ap) {
      var l = S.el('div', { display: 'flex', alignItems: 'center', gap: '10px', margin: ap ? '4px 0' : '7px 0' }, null, pai);
      S.el('div', {
        minWidth: ap ? '78px' : '92px',
        textAlign: 'center',
        background: '#071733',
        border: '2px solid ' + C.borda,
        borderBottomWidth: '4px',
        borderRadius: '6px',
        padding: ap ? '2px 6px' : '4px 8px',
        fontFamily: C.mono,
        fontWeight: '700',
        fontSize: ap ? '12px' : '13px',
        color: C.laranja,
        boxSizing: 'border-box',
        flex: '0 0 auto'
      }, tecla, l);
      S.el('div', { fontSize: ap ? '13px' : '14px' }, acao, l);
    }

    // inicio = true: vem do login e leva ao jogo; false: só consulta durante o jogo.
    // Seletor de fases: logo depois do login.
    S.ui.mostrarFases = function () {
      S.fase = 'fases';
      var ap = S.ui.telaApertada();
      var t = S.ui.tela(30, '640px');
      if (ap) S.ui.compactarTela(t);
      S.el('div', { fontSize: ap ? '18px' : '22px', fontWeight: '700', marginBottom: '4px' }, 'Escolha o laboratório', t.cartao);
      S.el('div', { color: C.cinza, fontSize: '13px', marginBottom: ap ? '8px' : '14px' }, 'Cada laboratório tem o seu próprio ranking.', t.cartao);
      var lista = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, t.cartao);
      ['laboratorio', 'servidores', 'cabeamento', 'realidade'].forEach(function (id) {
        var f = S.fases[id];
        if (!f) return;
        var b = S.el('button', {
          flex: '1 1 170px',
          textAlign: 'left',
          background: '#071733',
          border: '3px solid ' + C.borda,
          borderRadius: '10px',
          padding: ap ? '10px 12px' : '14px 16px',
          color: C.branco,
          cursor: 'pointer',
          touchAction: 'manipulation',
          fontFamily: C.fonte
        }, null, lista);
        b.type = 'button';
        b.setAttribute('aria-label', 'Laboratório ' + f.numero);
        S.el('div', { color: C.laranja, fontWeight: '700', fontSize: '12px', letterSpacing: '0.06em' }, 'LABORATÓRIO ' + f.numero, b);
        S.el('div', { fontWeight: '700', fontSize: ap ? '16px' : '18px', margin: '2px 0 4px' }, f.titulo || f.nome, b);
        S.el('div', { fontSize: '13px', color: C.cinza, lineHeight: '1.4' }, f.resumoCurto || '', b);
        S.el('div', { fontSize: '12px', fontWeight: '700', color: C.laranja, marginTop: '8px' }, 'Escolher ▶', b);
        b.addEventListener('mouseenter', function () { b.style.borderColor = C.laranja; });
        b.addEventListener('mouseleave', function () { b.style.borderColor = C.borda; });
        b.addEventListener('click', function () {
          S.faseEscolhida = id;
          t.fechar();
          S.ui.mostrarComandos(true);
        });
      });
      var rod = S.el('div', { display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: ap ? '10px' : '14px' }, null, t.cartao);
      S.ui.botao('Voltar', 'secundario', function () {
        t.fechar();
        S.ui.mostrarLogin();
      }, rod);
      S.ui.botaoAtualizar(rod);
    };

    S.ui.mostrarComandos = function (inicio) {
      if (inicio) S.fase = 'comandos';
      var ap = S.ui.telaApertada();
      var t = S.ui.tela(inicio ? 30 : 40, '640px');
      if (ap) S.ui.compactarTela(t);
      var topo = S.el('div', { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: ap ? '8px' : '14px' }, null, t.cartao);
      S.el('div', { fontSize: ap ? '18px' : '22px', fontWeight: '700' }, 'Como jogar', topo);
      S.el('div', { fontSize: '12px', color: C.laranja, fontWeight: '700', letterSpacing: '0.08em' }, inicio ? 'OLÁ, ' + S.aluno.nome.toUpperCase() : 'PAUSA', topo);

      var grade = S.el('div', { display: 'flex', flexWrap: 'wrap', gap: ap ? '8px' : '14px' }, null, t.cartao);
      function bloco(titulo, ativo) {
        var b = S.el('div', {
          flex: '1 1 250px',
          background: ativo ? C.painel2 : '#0B1F3E',
          border: '3px solid ' + (ativo ? C.laranja : C.borda),
          borderRadius: '8px',
          padding: ap ? '8px 10px' : '12px 14px',
          boxSizing: 'border-box',
          opacity: ativo ? '1' : '0.75'
        }, null, grade);
        var cab = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }, null, b);
        S.el('div', { fontWeight: '700', fontSize: '15px' }, titulo, cab);
        if (ativo) S.el('div', { fontSize: '11px', fontWeight: '700', color: '#10203A', background: C.laranja, borderRadius: '4px', padding: '2px 6px' }, 'SEU APARELHO', cab);
        return b;
      }
      // No celular mostra só os controles de toque (a tela é pequena).
      if (!S.toque || !ap) {
        var pc = bloco('Computador', !S.toque);
        linhaComando(pc, 'W A S D', 'Andar (ou setas ↑ ↓ ← →)', ap);
        linhaComando(pc, 'E', 'Usar o objeto mais próximo', ap);
        linhaComando(pc, 'CLIQUE', 'Usar o objeto clicado', ap);
        linhaComando(pc, 'ESC', 'Fechar janela', ap);
        linhaComando(pc, 'H', 'Ver estes comandos', ap);
      }
      if (S.toque || !ap) {
        var cel = bloco('Celular (na horizontal)', S.toque);
        linhaComando(cel, 'JOYSTICK', 'Arraste no canto ' + (S.cfg.joystickDireita ? 'direito' : 'esquerdo') + ' para andar', ap);
        linhaComando(cel, 'USAR', 'Botão laranja: usar o objeto próximo', ap);
        linhaComando(cel, 'TOQUE', 'Tocar no objeto também funciona', ap);
        linhaComando(cel, '?', 'Ver estes comandos', ap);
      }

      var obj = S.el('div', {
        marginTop: ap ? '8px' : '14px',
        background: '#071733',
        border: '2px dashed ' + C.borda,
        borderRadius: '8px',
        padding: ap ? '6px 10px' : '10px 14px',
        fontSize: ap ? '13px' : '14px',
        lineHeight: '1.45'
      }, null, t.cartao);
      S.el('div', { fontWeight: '700', color: C.laranja, marginBottom: '2px' }, 'Sua missão', obj);
      var faseCmd = S.fases[S.faseEscolhida] || S.fases.laboratorio || {};
      S.el('div', null, ap ? faseCmd.missaoCurta : faseCmd.missaoLonga, obj);
      if (!ap) S.el('div', { color: C.cinza, marginTop: '6px', fontSize: '13px' }, 'O tempo conta para o ranking. Se travar numa etapa, aparece uma dica e uma seta laranja.', obj);

      var rodape = S.el('div', { display: 'flex', gap: '10px', marginTop: ap ? '10px' : '16px', flexWrap: 'wrap' }, null, t.cartao);
      if (inicio) {
        var bVoltar = S.ui.botao('Voltar', 'secundario', function () {
          t.fechar();
          S.ui.mostrarFases();
        }, rodape);
        bVoltar.style.flex = '0 0 auto';
        var bComecar = S.ui.botao('Começar o laboratório ▶', 'primario', function () {
          // No celular, aproveita o toque para pedir tela cheia (se o Canva permitir).
          if (S.toque && S.podeTelaCheia() && !document.fullscreenElement) S.alternarTelaCheia();
          t.fechar();
          S.iniciarCarregamento();
        }, rodape);
        bComecar.style.flex = '1 1 200px';
      } else {
        S.pausado = true;
        var bFechar = S.ui.botao('Voltar ao jogo', 'primario', function () {
          t.fechar();
          if (!S.ui.modalAberto()) S.pausado = false;
          S.raiz.focus({ preventScroll: true });
        }, rodape);
        bFechar.style.flex = '1 1 200px';
        var bCfg = S.ui.botao('⚙ Configurações', 'secundario', function () {
          if (S.ui.mostrarConfig) S.ui.mostrarConfig();
        }, rodape);
        bCfg.style.flex = '0 0 auto';
        S.telaPausa = t;
      }
    };
  });

  /* ================================================================== */
  secao('U05-carregamento', function () {
    var C = S.CSS;
    S.ui.mostrarCarregamento = function () {
      var t = S.ui.tela(30, '420px');
      S.el('div', { fontSize: '18px', fontWeight: '700', marginBottom: '12px' }, 'Montando o laboratório…', t.cartao);
      var barra = S.el('div', { height: '18px', background: '#071733', border: '3px solid ' + C.borda, borderRadius: '4px', overflow: 'hidden' }, null, t.cartao);
      var cheio = S.el('div', { height: '100%', width: '0%', background: C.laranja, transition: 'width .15s linear' }, null, barra);
      var txt = S.el('div', { fontSize: '13px', color: C.cinza, marginTop: '10px' }, 'Preparando…', t.cartao);
      return {
        progresso: function (pct, texto) {
          cheio.style.width = Math.round(pct * 100) + '%';
          if (texto) txt.textContent = texto;
        },
        fechar: t.fechar
      };
    };
  });

  /* ================================================================== */
  secao('U06-hud', function () {
    var C = S.CSS;
    var hud = S.hud = {};
    var cache = {};

    function definirTexto(chave, el, texto) {
      if (cache[chave] === texto) return;
      cache[chave] = texto;
      el.textContent = texto;
    }

    S.ui.criarHud = function () {
      if (hud.camada) return; // a mesma HUD serve para todas as fases
      var raiz = S.raiz;
      hud.camada = S.el('div', { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', zIndex: '5', pointerEvents: 'none' }, null, raiz);

      // Missão + tempo (canto superior esquerdo).
      hud.missao = S.el('div', {
        position: 'absolute',
        top: '10px',
        left: '10px',
        width: 'min(360px, 46%)',
        background: 'rgba(14, 37, 71, 0.92)',
        border: '3px solid ' + C.borda,
        borderRadius: '8px',
        padding: '8px 12px',
        boxSizing: 'border-box',
        fontSize: '13px',
        lineHeight: '1.35'
      }, null, hud.camada);
      var topo = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }, null, hud.missao);
      hud.numero = S.el('div', { color: C.laranja, fontWeight: '700', fontSize: '12px', letterSpacing: '0.06em' }, 'MISSÃO 1/10', topo);
      hud.tempo = S.el('div', { fontFamily: C.mono, fontWeight: '700', fontSize: '18px' }, '00:00', topo);
      hud.texto = S.el('div', { fontWeight: '700', fontSize: '14px', marginTop: '2px' }, '', hud.missao);
      hud.dica = S.el('div', {
        display: 'none',
        marginTop: '6px',
        background: '#3A2A08',
        border: '2px solid ' + C.amarelo,
        borderRadius: '6px',
        padding: '5px 8px',
        color: C.amarelo,
        fontSize: '12px'
      }, '', hud.missao);

      // Item na mão + ajuda (canto superior direito).
      hud.direita = S.el('div', {
        position: 'absolute',
        top: '10px',
        right: '62px', // o canto fica para o botão de configurações (⚙)
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        pointerEvents: 'auto'
      }, null, hud.camada);
      hud.mao = S.el('div', {
        display: 'none',
        background: 'rgba(14, 37, 71, 0.92)',
        border: '3px solid ' + C.laranja,
        borderRadius: '8px',
        padding: '6px 10px',
        fontSize: '12px',
        fontWeight: '700',
        maxWidth: '190px',
        pointerEvents: 'none'
      }, '', hud.direita);
      if (S.toque && S.podeTelaCheia()) {
        var bCheia = S.ui.botao('', 'secundario', S.alternarTelaCheia, hud.direita);
        S.estilo(bCheia, { padding: '6px 10px', fontSize: '16px' });
        bCheia.appendChild(S.icone('telaCheia', 18, 2.4));
        bCheia.setAttribute('aria-label', 'Tela cheia');
      }
      var bAjuda = S.ui.botao('?', 'secundario', function () { S.ui.mostrarComandos(false); }, hud.direita);
      S.estilo(bAjuda, { padding: '6px 12px', fontSize: '16px' });
      bAjuda.setAttribute('aria-label', 'Ver comandos');

      // Prompt de interação (rodapé).
      hud.prompt = S.el('div', {
        position: 'absolute',
        bottom: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'none',
        background: 'rgba(7, 20, 48, 0.5)',
        border: '2px solid rgba(247, 148, 29, 0.75)',
        borderRadius: '8px',
        padding: '7px 14px',
        fontSize: '14px',
        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100% - 320px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }, '', hud.camada);
      S.ui.ajustarHudToque();
    };

    // No celular as caixas ficam ~20% menores para sobrar mais vista do 3D.
    S.ui.ajustarHudToque = function () {
      if (!hud.camada) return;
      var t = S.toque;
      S.estilo(hud.missao, {
        width: t ? 'min(288px, 37%)' : 'min(360px, 46%)',
        padding: t ? '6px 10px' : '8px 12px',
        fontSize: t ? '10.5px' : '13px',
        borderWidth: t ? '2px' : '3px'
      });
      hud.numero.style.fontSize = t ? '9.5px' : '12px';
      hud.tempo.style.fontSize = t ? '14.5px' : '18px';
      hud.texto.style.fontSize = t ? '11px' : '14px';
      hud.dica.style.fontSize = t ? '10px' : '12px';
      hud.dica.style.padding = t ? '4px 6px' : '5px 8px';
      S.estilo(hud.prompt, {
        fontSize: t ? '11px' : '14px',
        padding: t ? '5px 11px' : '7px 14px'
      });
      hud.mao.style.fontSize = t ? '10px' : '12px';
    };

    S.ui.mostrarHud = function (sim) {
      if (hud.camada) hud.camada.style.display = sim ? 'block' : 'none';
    };

    S.ui.atualizarHud = function () {
      if (!hud.camada) return;
      definirTexto('tempo', hud.tempo, S.formatarTempo(S.tempoDeJogo()));
    };

    S.ui.definirMissao = function (indice, total, texto) {
      definirTexto('num', hud.numero, 'MISSÃO ' + indice + '/' + total);
      definirTexto('txt', hud.texto, texto);
    };

    S.ui.definirDica = function (texto) {
      if (!texto) {
        hud.dica.style.display = 'none';
        cache.dica = null;
        return;
      }
      definirTexto('dica', hud.dica, '💡 ' + texto);
      hud.dica.style.display = 'block';
    };

    S.ui.definirMao = function (texto) {
      if (!texto) {
        hud.mao.style.display = 'none';
        return;
      }
      hud.mao.textContent = '✋ ' + texto;
      hud.mao.style.display = 'block';
    };

    S.ui.definirPrompt = function (texto) {
      if (cache.prompt === texto) return;
      cache.prompt = texto;
      if (!texto) {
        hud.prompt.style.display = 'none';
        return;
      }
      hud.prompt.textContent = (S.toque ? 'USAR: ' : '[E] ') + texto;
      hud.prompt.style.display = 'block';
    };
  });

  /* ================================================================== */
  secao('U09-atualizacoes', function () {
    var C = S.CSS;
    // Mesmo endereço que o carregador do Canva usa.
    var CAMINHO = 'herick-css/simulador-redes-senac';
    var ARQ = 'simulador.js';
    var A = S.atualizacao = { nova: null, dispensada: null, verificando: false };

    function numeros(v) {
      return String(v || '0').split('.').map(function (n) { return parseInt(n, 10) || 0; });
    }
    // true se "a" for mais nova que "b".
    A.maisNova = function (a, b) {
      var x = numeros(a);
      var y = numeros(b);
      for (var i = 0; i < Math.max(x.length, y.length); i++) {
        if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
      }
      return false;
    };

    function urls() {
      var t = Date.now();
      var gh = 'https://raw.githubusercontent.com/' + CAMINHO + '/main/' + ARQ + '?v=' + t;
      var jsd = 'https://cdn.jsdelivr.net/gh/' + CAMINHO + '@main/' + ARQ + '?v=' + t;
      return window.__SIM_ORIGEM === 'jsdelivr' ? [jsd, gh] : [gh, jsd];
    }

    // Lê só o começo do arquivo publicado (a versão fica nos primeiros bytes).
    A.verificar = function () {
      if (!window.fetch) return Promise.reject(new Error('sem fetch'));
      var lista = urls();
      function ler(url, parcial) {
        var op = { cache: 'no-store' };
        if (parcial) op.headers = { Range: 'bytes=0-4095' };
        return fetch(url, op).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        }).then(function (txt) {
          var m = /versao:\s*'([0-9.]+)'/.exec(txt);
          if (!m) throw new Error('versão não encontrada');
          return m[1];
        });
      }
      // Cada endereço: primeiro só o começo do arquivo; se a rede recusar,
      // o arquivo inteiro; depois o próximo endereço.
      function tentar(i) {
        if (i >= lista.length) return Promise.reject(new Error('sem resposta'));
        return ler(lista[i], true).catch(function () {
          return ler(lista[i], false);
        }).catch(function () { return tentar(i + 1); });
      }
      A.verificando = true;
      return tentar(0).then(function (v) {
        A.verificando = false;
        A.publicada = v;
        A.nova = A.maisNova(v, S.versao) ? v : null;
        return { versao: v, nova: !!A.nova };
      }, function (e) {
        A.verificando = false;
        throw e;
      });
    };

    function emJogo() {
      return S.fase === 'jogo' || S.fase === 'cena';
    }

    A.atualizar = function () {
      try { window.location.reload(); } catch (e) { registrarErro('atualizar', e); }
    };

    // Botão "Procurar atualizações" (telas de menu).
    S.ui.botaoAtualizar = function (pai) {
      // Versão offline (pendrive): não tem de onde baixar atualização.
      if (window.__SIM_OFFLINE) return null;
      var b = S.ui.botao('🔄 Procurar atualizações', 'secundario', function () {
        if (A.verificando) return;
        var antes = b.textContent;
        b.textContent = '🔄 Procurando…';
        b.disabled = true;
        A.verificar().then(function (r) {
          b.textContent = antes;
          b.disabled = false;
          janela(r.nova
            ? { titulo: 'Atualização disponível', texto: 'A versão ' + r.versao + ' já está no ar (você está na ' + S.versao + ').', atualizar: true }
            : { titulo: 'Tudo em dia ✔', texto: 'Você já está na versão mais recente (' + S.versao + ').' });
        }, function () {
          b.textContent = antes;
          b.disabled = false;
          janela({ titulo: 'Não deu para verificar', texto: 'Sem acesso ao servidor de atualizações agora. Confira a internet e tente de novo.' });
        });
      }, pai);
      S.estilo(b, { padding: '6px 12px', fontSize: '13px' });
      return b;
    };

    function janela(o) {
      var t = S.ui.tela(60, '380px');
      S.el('div', { fontSize: '19px', fontWeight: '700', marginBottom: '8px' }, o.titulo, t.cartao);
      S.el('div', { fontSize: '14px', color: C.cinza, lineHeight: '1.45', marginBottom: '14px' }, o.texto, t.cartao);
      if (o.atualizar && emJogo()) {
        S.el('div', { fontSize: '13px', color: C.amarelo, marginBottom: '12px' }, 'Atenção: atualizar recarrega o jogo e o progresso desta fase será perdido.', t.cartao);
      }
      var linha = S.el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap' }, null, t.cartao);
      if (o.atualizar) {
        S.estilo(S.ui.botao('Atualizar agora', 'primario', A.atualizar, linha), { flex: '1 1 auto' });
        S.ui.botao('Depois', 'secundario', function () { t.fechar(); }, linha);
      } else {
        S.estilo(S.ui.botao('Fechar', 'primario', function () { t.fechar(); }, linha), { flex: '1 1 auto' });
      }
    }

    // Aviso automático: confere sozinho de tempos em tempos e só sugere.
    var faixa = null;
    function mostrarFaixa(v) {
      if (faixa || A.dispensada === v) return;
      faixa = S.el('div', {
        // No jogo fica abaixo dos avisos do topo, para não cobri-los.
        position: 'absolute', top: emJogo() ? '64px' : '8px', left: '50%', transform: 'translateX(-50%)', zIndex: '70',
        display: 'flex', alignItems: 'center', gap: '8px', maxWidth: 'calc(100% - 24px)', boxSizing: 'border-box',
        background: 'rgba(11,79,156,0.95)', border: '2px solid ' + C.laranja, borderRadius: '8px',
        padding: '6px 8px 6px 12px', fontFamily: C.fonte, fontSize: '13px', fontWeight: '700', color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
      }, null, S.raiz);
      S.el('span', { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, '🔄 Nova versão ' + v + ' disponível', faixa);
      var confirmar = false;
      var bAt = S.ui.botao('Atualizar', 'primario', function () {
        if (emJogo() && !confirmar) {
          confirmar = true;
          bAt.textContent = 'Perder o progresso? Toque de novo';
          setTimeout(function () {
            confirmar = false;
            if (bAt.isConnected) bAt.textContent = 'Atualizar';
          }, 4000);
          return;
        }
        A.atualizar();
      }, faixa);
      S.estilo(bAt, { padding: '4px 10px', fontSize: '12px', boxShadow: 'none' });
      var bX = S.ui.botao('✕', 'secundario', function () {
        A.dispensada = v;
        faixa.remove();
        faixa = null;
      }, faixa);
      S.estilo(bX, { padding: '4px 8px', fontSize: '12px', boxShadow: 'none' });
      bX.setAttribute('aria-label', 'Dispensar aviso de atualização');
    }
    function checarSozinho() {
      if (document.hidden || A.verificando) return;
      A.verificar().then(function (r) {
        if (r.nova) mostrarFaixa(r.versao);
      }, function () { /* sem rede: tenta na próxima */ });
    }
    // Só quando rodando a partir do GitHub/jsDelivr (no Canva).
    if (window.__SIM_ORIGEM) {
      setTimeout(checarSozinho, 20000);
      setInterval(checarSozinho, 5 * 60 * 1000);
    }
    A.checarAgora = checarSozinho;
  });


  /* ================================================================== */
  secao('D01-dados-ranking', function () {
    var D = S.dados = {
      registros: [],
      carregado: false,
      offline: false,
      erroLeitura: null,
      ouvintes: []
    };

    function avisar() {
      D.ouvintes.slice().forEach(function (fn) { S.protegido('dados:ouvinte', fn)(); });
    }

    D.aoMudar = function (fn) {
      D.ouvintes.push(fn);
      return function () {
        var i = D.ouvintes.indexOf(fn);
        if (i >= 0) D.ouvintes.splice(i, 1);
      };
    };

    // O Canva injeta window.dataSdk: os dados vão para uma Canva Sheet
    // compartilhada por todos que abrem o link.
    D.iniciar = function () {
      if (!window.dataSdk || typeof window.dataSdk.init !== 'function') {
        D.offline = true;
        D.carregado = true;
        avisar();
        return;
      }
      try {
        var r = window.dataSdk.init({
          onDataChanged: function (dados) {
            D.registros = Array.isArray(dados) ? dados : [];
            D.carregado = true;
            D.erroLeitura = null;
            avisar();
          }
        });
        if (r && typeof r.then === 'function') {
          r.then(function (res) {
            if (res && res.isOk === false) {
              D.erroLeitura = 'Não foi possível ler o ranking.';
              avisar();
            }
          }, function () {
            D.erroLeitura = 'Não foi possível acessar o ranking.';
            avisar();
          });
        }
      } catch (e) {
        D.erroLeitura = 'Não foi possível acessar o ranking.';
        registrarErro('dados:init', e);
      }
    };

    D.salvar = function (registro) {
      if (D.offline) {
        registro.__backendId = 'local-' + Date.now();
        D.registros.push(registro);
        avisar();
        return Promise.resolve({ isOk: true, offline: true });
      }
      try {
        return Promise.resolve(window.dataSdk.create(registro)).then(function (res) {
          return res || { isOk: false };
        }, function () {
          return { isOk: false };
        });
      } catch (e) {
        registrarErro('dados:salvar', e);
        return Promise.resolve({ isOk: false });
      }
    };

    // Mesmo aluno em registros diferentes: nome sem acento/maiúsculas + turma.
    D.chaveAluno = function (nome, turma) {
      var n = String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (n.normalize) n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n + '|' + S.normalizarTurma(turma);
    };

    // Marcas do professor gravadas junto com os resultados:
    //   { tipo: 'zerar', data }          → esconde tudo o que veio antes
    //   { tipo: 'ocultar', alvo: id }    → esconde um resultado
    // Usadas só se o Canva não deixar apagar de verdade.
    function marcas() {
      var corte = '';
      var ocultos = {};
      var ultimoZerar = -1;
      D.registros.forEach(function (r, i) {
        if (!r || !r.tipo) return;
        if (r.tipo === 'zerar') {
          ultimoZerar = i;
          if (String(r.data || '') > corte) corte = String(r.data || '');
        }
        if (r.tipo === 'ocultar' && r.alvo) ocultos[r.alvo] = true;
      });
      // Tudo o que foi gravado antes da marca de zerar também sai (mesmo com
      // relógio adiantado no aparelho do aluno).
      for (var i = 0; i < ultimoZerar; i++) {
        var r = D.registros[i];
        if (r && !r.tipo && r.__backendId) ocultos[r.__backendId] = true;
      }
      return { corte: corte, ocultos: ocultos };
    }
    var cacheMarcas = null;
    var cacheDe = null;
    function valido(r) {
      if (!r || r.tipo || !isFinite(Number(r.tempo)) || Number(r.tempo) <= 0) return false;
      if (cacheDe !== D.registros) {
        cacheDe = D.registros;
        cacheMarcas = marcas();
      }
      if (cacheMarcas.ocultos[r.__backendId]) return false;
      if (cacheMarcas.corte && String(r.data || '') < cacheMarcas.corte) return false;
      return true;
    }
    D.valido = valido;
    // Resultados que aparecem no ranking (para a área do professor).
    D.visiveis = function () {
      return D.registros.filter(valido);
    };

    // O Canva deixa apagar? (window.dataSdk.delete)
    D.podeApagar = function () {
      return D.offline || !!(window.dataSdk && typeof window.dataSdk['delete'] === 'function');
    };
    function apagarUm(r) {
      if (D.offline) {
        var i = D.registros.indexOf(r);
        if (i >= 0) D.registros.splice(i, 1);
        return Promise.resolve(true);
      }
      try {
        return Promise.resolve(window.dataSdk['delete'](r)).then(function (res) {
          return !res || res.isOk !== false;
        }, function () { return false; });
      } catch (e) {
        registrarErro('dados:apagar', e);
        return Promise.resolve(false);
      }
    }
    // Apaga (ou esconde) vários, um de cada vez. progresso(feitos, total).
    D.apagar = function (lista, progresso) {
      lista = lista.slice();
      var ok = 0;
      var falhas = 0;
      if (!D.podeApagar()) {
        var agora = new Date().toISOString();
        var cadeia = Promise.resolve();
        lista.forEach(function (r, i) {
          cadeia = cadeia.then(function () {
            return D.salvar({ tipo: 'ocultar', alvo: r.__backendId, data: agora }).then(function (res) {
              if (res && res.isOk !== false) ok++; else falhas++;
              if (progresso) progresso(i + 1, lista.length);
            });
          });
        });
        return cadeia.then(function () { return { ok: ok, falhas: falhas, ocultou: true }; });
      }
      var c = Promise.resolve();
      lista.forEach(function (r, i) {
        c = c.then(function () {
          return apagarUm(r).then(function (deu) {
            if (deu) ok++; else falhas++;
            if (progresso) progresso(i + 1, lista.length);
          });
        });
      });
      return c.then(function () {
        if (D.offline) avisar();
        return { ok: ok, falhas: falhas, ocultou: false };
      });
    };
    // Zerar: apaga tudo (se der) ou grava a marca de reinício.
    D.zerar = function (progresso) {
      if (D.podeApagar()) {
        return D.apagar(D.registros.filter(function (r) { return r && r.__backendId; }), progresso);
      }
      return D.salvar({ tipo: 'zerar', data: new Date().toISOString() }).then(function (res) {
        return { ok: res && res.isOk !== false ? 1 : 0, falhas: res && res.isOk !== false ? 0 : 1, ocultou: true };
      });
    };

    // Turmas que aparecem nos registros (para o seletor).
    D.turmas = function () {
      var vistas = {};
      D.registros.forEach(function (r) {
        if (!valido(r)) return;
        var t = S.normalizarTurma(r.turma);
        if (t) vistas[t] = (vistas[t] || 0) + 1;
      });
      return Object.keys(vistas).sort().map(function (t) { return { turma: t, n: vistas[t] }; });
    };

    // Melhor tentativa de cada aluno numa fase.
    D.melhoresDaFase = function (turma, fase) {
      var porAluno = {};
      D.daTurma(turma, fase).forEach(function (r) {
        var k = D.chaveAluno(r.nome, r.turma);
        if (!porAluno[k]) porAluno[k] = r; // daTurma já vem do mais rápido ao mais lento
      });
      return Object.keys(porAluno).map(function (k) { return porAluno[k]; }).sort(function (a, b) {
        return Number(a.tempo) - Number(b.tempo);
      });
    };

    // Ranking geral: soma do melhor tempo de cada fase. Quem fez mais fases
    // vem antes; entre quem fez as mesmas fases, ganha o menor tempo total.
    D.geral = function (turma) {
      var alunos = {};
      [1, 2, 3].forEach(function (fase) {
        D.melhoresDaFase(turma, fase).forEach(function (r) {
          var k = D.chaveAluno(r.nome, r.turma);
          var a = alunos[k] || (alunos[k] = { chave: k, nome: String(r.nome || '?').trim(), turma: S.normalizarTurma(r.turma), fases: {}, tempo: 0, erros: 0, sessoes: [], recente: '' });
          a.fases[fase] = Number(r.tempo);
          a.tempo += Number(r.tempo);
          a.erros += Number(r.erros) || 0;
          if (r.sessao) a.sessoes.push(r.sessao);
          // Mostra o nome como foi escrito da última vez.
          if (String(r.data || '') >= a.recente) {
            a.recente = String(r.data || '');
            a.nome = String(r.nome || a.nome).trim();
          }
        });
      });
      return Object.keys(alunos).map(function (k) {
        var a = alunos[k];
        a.nFases = Object.keys(a.fases).length;
        return a;
      }).sort(function (a, b) {
        return b.nFases - a.nFases || a.tempo - b.tempo;
      });
    };

    // Resultados da turma numa fase (registros antigos, sem fase, são da fase 1).
    D.daTurma = function (turma, fase) {
      fase = fase || 1;
      return D.registros.filter(function (r) {
        if (!valido(r)) return false;
        if ((Number(r.fase) || 1) !== fase) return false;
        return !turma || S.normalizarTurma(r.turma) === turma;
      }).sort(function (a, b) {
        return Number(a.tempo) - Number(b.tempo);
      });
    };
  });

  /* ================================================================== */
  secao('D02-tela-ranking', function () {
    var C = S.CSS;
    var NOMES_FASE = { 1: 'Rede local', 2: 'Servidor', 3: 'Cabeamento' };

    // fase: 'geral' (padrão) ou 1, 2, 3. turma: '' = todas as turmas.
    S.ui.mostrarRanking = function (turmaInicial, sessaoDestaque, faseInicial) {
      var t = S.ui.tela(40, '660px');
      var turma = S.normalizarTurma(turmaInicial);
      var fase = faseInicial || 'geral';
      var todasTentativas = false;
      var minhaChave = S.aluno && S.aluno.nome ? S.dados.chaveAluno(S.aluno.nome, S.aluno.turma) : null;
      var estreito = function () { return t.cartao.clientWidth < 480; };

      var cab = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }, null, t.cartao);
      var tituloRank = S.el('div', { fontSize: '21px', fontWeight: '700', userSelect: 'none', WebkitUserSelect: 'none' }, '🏆 Ranking', cab);
      var cabBotoes = S.el('div', { display: 'flex', gap: '8px' }, null, cab);
      // Botão escondido: aparece depois de apertar P cinco vezes seguidas
      // (no celular: tocar 5 vezes no título "Ranking").
      var bProf = S.ui.botao('🔒 Professor', 'secundario', function () {
        S.ui.areaProfessor();
      }, cabBotoes);
      S.estilo(bProf, { padding: '6px 10px', fontSize: '13px', display: 'none' });
      var segredo = { n: 0, ultimo: 0 };
      function contarSegredo() {
        var agora = Date.now();
        segredo.n = agora - segredo.ultimo < 1500 ? segredo.n + 1 : 1;
        segredo.ultimo = agora;
        if (segredo.n >= 5) {
          segredo.n = 0;
          bProf.style.display = '';
        }
      }
      function teclaSegredo(e) {
        if (!t.fundo.isConnected) {
          window.removeEventListener('keydown', teclaSegredo);
          return;
        }
        var alvo = e.target && e.target.tagName;
        if (alvo === 'INPUT' || alvo === 'TEXTAREA') return;
        if ((e.key || '').toLowerCase() === 'p' && !e.repeat) contarSegredo();
        else if (e.key !== 'Shift') segredo.n = 0;
      }
      window.addEventListener('keydown', teclaSegredo);
      tituloRank.addEventListener('pointerdown', contarSegredo);
      var bFechar = S.ui.botao('Fechar', 'secundario', function () {
        parar();
        t.fechar();
      }, cabBotoes);
      bFechar.style.padding = '6px 12px';

      // Turma: lista com as turmas que já têm resultado.
      var filtro = S.el('label', { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }, null, t.cartao);
      S.el('span', { fontSize: '13px', fontWeight: '700', color: C.cinza, letterSpacing: '0.04em' }, 'TURMA', filtro);
      var sel = S.el('select', {
        flex: '1 1 200px',
        minWidth: '0',
        background: C.painel2,
        color: C.branco,
        border: '3px solid ' + C.borda,
        borderRadius: '6px',
        padding: '7px 10px',
        fontFamily: C.fonte,
        fontSize: '15px',
        fontWeight: '700',
        cursor: 'pointer'
      }, null, filtro);
      sel.setAttribute('aria-label', 'Turma');
      sel.addEventListener('change', function () {
        turma = sel.value;
        desenhar();
      });
      function montarTurmas() {
        var lista = S.dados.turmas();
        if (turma && !lista.some(function (x) { return x.turma === turma; })) lista.push({ turma: turma, n: 0 });
        sel.textContent = '';
        var o = S.el('option', null, 'Todas as turmas (geral)', sel);
        o.value = '';
        lista.forEach(function (x) {
          var op = S.el('option', null, x.turma + (x.n ? '  ·  ' + x.n + ' resultado' + (x.n > 1 ? 's' : '') : ''), sel);
          op.value = x.turma;
        });
        sel.value = turma;
      }

      // Abas: geral + uma por fase.
      var abas = S.el('div', { display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }, null, t.cartao);
      var defs = [{ id: 'geral', txt: 'Geral' }, { id: 1, txt: 'Fase 1' }, { id: 2, txt: 'Fase 2' }, { id: 3, txt: 'Fase 3' }];
      var botoesAba = defs.map(function (d) {
        var b = S.ui.botao(d.txt, 'secundario', function () {
          fase = d.id;
          marcarAbas();
          desenhar();
        }, abas);
        S.estilo(b, { flex: '1 1 0', padding: '7px 8px', fontSize: '13px', minWidth: '64px' });
        if (d.id !== 'geral') b.title = NOMES_FASE[d.id];
        return b;
      });
      function marcarAbas() {
        botoesAba.forEach(function (b, i) {
          var ativa = defs[i].id === fase;
          b.style.background = ativa ? C.laranja : C.painel2;
          b.style.color = ativa ? '#10203A' : C.branco;
        });
        opcoes.style.display = fase === 'geral' ? 'none' : 'flex';
      }
      var explica = S.el('div', { fontSize: '12px', color: C.cinza, margin: '6px 0 0' }, '', t.cartao);
      var opcoes = S.el('label', { display: 'none', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.cinza, marginTop: '6px', cursor: 'pointer' }, null, t.cartao);
      var chk = S.el('input', { width: '16px', height: '16px', accentColor: C.laranja }, null, opcoes);
      chk.type = 'checkbox';
      S.el('span', null, 'Mostrar todas as tentativas (não só a melhor de cada aluno)', opcoes);
      chk.addEventListener('change', function () {
        todasTentativas = chk.checked;
        desenhar();
      });

      var destaques = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '12px 0' }, null, t.cartao);
      var lista = S.el('div', null, null, t.cartao);
      var status = S.el('div', { fontSize: '12px', color: C.cinza, marginTop: '10px' }, '', t.cartao);

      function cartaoDestaque(titulo, nome, valor, cor) {
        var c = S.el('div', {
          flex: '1 1 200px',
          background: '#071733',
          border: '3px solid ' + cor,
          borderRadius: '8px',
          padding: '8px 12px'
        }, null, destaques);
        S.el('div', { fontSize: '11px', fontWeight: '700', color: cor, letterSpacing: '0.06em' }, titulo, c);
        S.el('div', { fontSize: '15px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, nome || '—', c);
        S.el('div', { fontFamily: C.mono, fontSize: '14px', color: C.cinza }, valor || '', c);
      }

      function tempoCurto(seg) {
        return S.formatarTempo(seg) + '.' + String(Math.floor((seg % 1) * 10));
      }

      function linhaTabela(colunas, estilo) {
        var l = S.el('div', Object.assign({
          display: 'grid',
          gridTemplateColumns: colunas,
          gap: '8px',
          alignItems: 'center'
        }, estilo || {}), null, lista);
        return l;
      }

      function nomeComTurma(pai, nome, turmaReg, meu) {
        var el = S.el('div', { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: meu ? '700' : '400' }, String(nome || '?') + (meu ? '  (você)' : ''), pai);
        var tr = S.normalizarTurma(turmaReg);
        if (!turma && tr) S.el('span', { color: C.cinza, fontSize: '11px', marginLeft: '6px', fontWeight: '400' }, tr, el);
      }

      function estiloLinha(i, meu) {
        return {
          padding: '7px 8px',
          fontSize: '14px',
          background: meu ? '#3A2A08' : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.03)'),
          border: meu ? '2px solid ' + C.laranja : '2px solid transparent',
          borderRadius: '6px'
        };
      }

      function cabecalho(colunas, titulos) {
        var c = linhaTabela(colunas, { fontSize: '11px', fontWeight: '700', color: C.cinza, padding: '0 8px 6px', borderBottom: '2px solid ' + C.borda });
        titulos.forEach(function (h, i) {
          S.el('div', { textAlign: i >= 2 ? 'right' : 'left' }, h, c);
        });
      }

      function desenharGeral() {
        // O geral só lista quem concluiu as 3 fases.
        var todos = S.dados.geral(turma);
        var regs = todos.filter(function (a) { return a.nFases === 3; });
        var emAndamento = todos.length - regs.length;
        var euFora = minhaChave && todos.some(function (a) { return a.chave === minhaChave && a.nFases < 3; });
        explica.textContent = 'Só quem concluiu as 3 fases. Vale a soma do melhor tempo de cada fase.' +
          (euFora ? ' Você ainda não concluiu as 3 fases.' : '');
        status.textContent = regs.length + ' aluno(s) com as 3 fases' + (emAndamento ? ' · ' + emAndamento + ' ainda em andamento' : '') +
          (turma ? ' (turma ' + turma + ').' : ' (todas as turmas).');
        if (!regs.length) {
          S.el('div', { padding: '18px 0', color: C.cinza, textAlign: 'center' }, 'Ninguém concluiu as 3 fases ainda' + (turma ? ' na turma ' + turma + '.' : '.'), lista);
          return;
        }
        cartaoDestaque('🏅 LÍDER GERAL', regs[0].nome + (turma ? '' : '  ·  ' + regs[0].turma), 'Total ' + S.formatarTempoLongo(regs[0].tempo), C.verde);
        cartaoDestaque('🎓 CONCLUÍRAM AS 3 FASES', regs.length + ' aluno(s)', emAndamento ? emAndamento + ' ainda em andamento' : 'todos que jogaram', C.amarelo);
        var col = estreito() ? '30px minmax(0,1fr) 56px 40px 70px' : '42px minmax(0,1fr) 92px 60px 92px';
        cabecalho(col, ['POS.', 'ALUNO', 'FASES', 'ERROS', 'TOTAL']);
        regs.slice(0, 80).forEach(function (a, i) {
          var meu = (minhaChave && a.chave === minhaChave) || (sessaoDestaque && a.sessoes.indexOf(sessaoDestaque) >= 0);
          var l = linhaTabela(col, estiloLinha(i, meu));
          S.el('div', { fontWeight: '700', color: i < 3 ? C.laranja : C.branco }, String(i + 1).padStart(2, '0'), l);
          nomeComTurma(l, a.nome, a.turma, meu);
          var fs = S.el('div', { display: 'flex', gap: '3px', justifyContent: 'flex-end' }, null, l);
          [1, 2, 3].forEach(function (n) {
            var feita = a.fases[n] !== undefined;
            var p = S.el('div', {
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              lineHeight: '18px',
              textAlign: 'center',
              background: feita ? C.verde : 'transparent',
              color: feita ? '#0B2412' : C.cinza,
              border: feita ? 'none' : '1px dashed ' + C.borda,
              boxSizing: 'border-box'
            }, String(n), fs);
            p.title = 'Fase ' + n + (feita ? ': ' + tempoCurto(a.fases[n]) : ': não concluída');
          });
          S.el('div', { textAlign: 'right', color: C.cinza }, String(a.erros), l);
          S.el('div', { textAlign: 'right', fontFamily: C.mono, fontWeight: '700' }, tempoCurto(a.tempo), l);
        });
        if (regs.length > 80) S.el('div', { fontSize: '12px', color: C.cinza, padding: '6px 8px' }, '+ ' + (regs.length - 80) + ' alunos', lista);
      }

      function desenharFase() {
        var regs = todasTentativas ? S.dados.daTurma(turma, fase) : S.dados.melhoresDaFase(turma, fase);
        explica.textContent = 'Fase ' + fase + ' · ' + NOMES_FASE[fase] + (todasTentativas ? ' · todas as tentativas.' : ' · melhor tentativa de cada aluno.');
        status.textContent = regs.length + ' resultado(s) na fase ' + fase + (turma ? ', turma ' + turma : ', todas as turmas') + '.';
        if (!regs.length) return vazio();
        cartaoDestaque('⚡ MAIS RÁPIDO', regs[0].nome, S.formatarTempoLongo(Number(regs[0].tempo)), C.verde);
        cartaoDestaque('🐢 MAIS DEMORADO', regs[regs.length - 1].nome, S.formatarTempoLongo(Number(regs[regs.length - 1].tempo)), C.amarelo);
        var col = estreito() ? '30px minmax(0,1fr) 44px 70px' : '42px minmax(0,1fr) 72px 92px';
        cabecalho(col, ['POS.', 'ALUNO', 'ERROS', 'TEMPO']);
        regs.slice(0, 80).forEach(function (r, i) {
          var meu = (sessaoDestaque && r.sessao === sessaoDestaque) ||
            (!todasTentativas && minhaChave && S.dados.chaveAluno(r.nome, r.turma) === minhaChave);
          var l = linhaTabela(col, estiloLinha(i, meu));
          S.el('div', { fontWeight: '700', color: i < 3 ? C.laranja : C.branco }, String(i + 1).padStart(2, '0'), l);
          nomeComTurma(l, r.nome, r.turma, meu);
          S.el('div', { textAlign: 'right', color: C.cinza }, String(Number(r.erros) || 0), l);
          S.el('div', { textAlign: 'right', fontFamily: C.mono, fontWeight: '700' }, tempoCurto(Number(r.tempo)), l);
        });
        if (regs.length > 80) S.el('div', { fontSize: '12px', color: C.cinza, padding: '6px 8px' }, '+ ' + (regs.length - 80) + ' resultados', lista);
      }

      function vazio() {
        S.el('div', { padding: '18px 0', color: C.cinza, textAlign: 'center' }, 'Ainda não há resultados' + (turma ? ' para a turma ' + turma + '.' : '.'), lista);
      }

      function desenhar() {
        destaques.textContent = '';
        lista.textContent = '';
        var D = S.dados;
        if (!D.carregado) {
          status.textContent = 'Carregando ranking…';
          return;
        }
        if (fase === 'geral') desenharGeral();
        else desenharFase();
        if (D.erroLeitura) status.textContent = D.erroLeitura + ' ' + status.textContent;
        if (D.offline) status.textContent = 'Modo offline: fora do Canva o ranking não é compartilhado. ' + status.textContent;
      }

      function atualizarTudo() {
        montarTurmas();
        desenhar();
      }
      var parar = S.dados.aoMudar(atualizarTudo);
      marcarAbas();
      atualizarTudo();
      return t;
    };
  });

  /* ================================================================== */
  secao('D03-area-professor', function () {
    var C = S.CSS;
    // Senha do professor: o código guarda só a "impressão digital" dela
    // (SHA-256 com sal, repetido 5000 vezes). Não dá para ler a senha daqui.
    var SENHA_HASH = 'aa0cfce5430f3e43fcddc4bee664eeace25c1da00d8645cfc7afc31710229e39';

    // SHA-256 em JavaScript puro (funciona em qualquer navegador).
    var K = [];
    (function () {
      function frac(x) { return ((x - Math.floor(x)) * 4294967296) >>> 0; }
      var n = 2;
      while (K.length < 64) {
        var primo = true;
        for (var d = 2; d * d <= n; d++) if (n % d === 0) { primo = false; break; }
        if (primo) K.push(frac(Math.cbrt(n)));
        n++;
      }
    })();
    function sha256(texto) {
      var bytes = unescape(encodeURIComponent(texto));
      var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
      var l = bytes.length;
      var m = [];
      for (var i = 0; i < l; i++) m[i >> 2] |= bytes.charCodeAt(i) << (24 - (i % 4) * 8);
      m[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
      var total = (((l + 8) >> 6) + 1) * 16;
      for (var j = (l >> 2) + 1; j < total; j++) m[j] = m[j] | 0;
      m[total - 1] = l * 8;
      var w = new Array(64);
      for (var b = 0; b < total; b += 16) {
        var a = H[0], bb = H[1], c = H[2], dd = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (var t = 0; t < 64; t++) {
          if (t < 16) w[t] = m[b + t] | 0;
          else {
            var x = w[t - 15], y = w[t - 2];
            var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
            var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
          }
          var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
          var ch = (e & f) ^ (~e & g);
          var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
          var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
          var maj = (a & bb) ^ (a & c) ^ (bb & c);
          var t2 = (S0 + maj) | 0;
          h = g; g = f; f = e; e = (dd + t1) | 0;
          dd = c; c = bb; bb = a; a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + dd) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
      }
      return H.map(function (v) { return ('00000000' + (v >>> 0).toString(16)).slice(-8); }).join('');
    }
    function hashSenha(txt) {
      var h = sha256('senac-simulador-redes|' + txt);
      for (var i = 0; i < 5000; i++) h = sha256(h + '|' + i);
      return h;
    }
    var liberado = false;

    S.ui.areaProfessor = function () {
      if (liberado) return painel();
      var t = S.ui.tela(50, '380px');
      S.el('div', { fontSize: '19px', fontWeight: '700', marginBottom: '10px' }, '🔒 Área do professor', t.cartao);
      var campo = S.ui.campo('SENHA', t.cartao, { max: 40 });
      campo.input.type = 'password';
      var msg = S.el('div', { fontSize: '13px', minHeight: '18px', color: '#FF8A80', marginBottom: '8px' }, '', t.cartao);
      var linha = S.el('div', { display: 'flex', gap: '8px' }, null, t.cartao);
      function entrar() {
        if (hashSenha(campo.input.value.trim()) === SENHA_HASH) {
          liberado = true;
          t.fechar();
          painel();
        } else {
          msg.textContent = 'Senha incorreta.';
          campo.input.select();
        }
      }
      S.estilo(S.ui.botao('Entrar', 'primario', entrar, linha), { flex: '1 1 auto' });
      S.ui.botao('Cancelar', 'secundario', function () { t.fechar(); }, linha);
      campo.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') entrar();
        if (e.key === 'Escape') t.fechar();
      });
      setTimeout(function () { campo.input.focus(); }, 50);
    };

    function dataCurta(iso) {
      if (!iso) return 'sem data';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return 'sem data';
      function p(n) { return String(n).padStart(2, '0'); }
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function painel() {
      var D = S.dados;
      var t = S.ui.tela(50, '700px');
      var cab = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }, null, t.cartao);
      S.el('div', { fontSize: '20px', fontWeight: '700' }, '🔒 Área do professor · ranking', cab);
      var bFechar = S.ui.botao('Fechar', 'secundario', function () {
        parar();
        t.fechar();
      }, cab);
      bFechar.style.padding = '6px 12px';
      var modo = S.el('div', { fontSize: '12px', color: C.cinza, marginBottom: '10px', lineHeight: '1.45' }, '', t.cartao);

      // Filtros
      var filtros = S.el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }, null, t.cartao);
      function seletor(rotulo) {
        var s = S.el('select', {
          flex: '1 1 160px', minWidth: '0', background: C.painel2, color: C.branco,
          border: '3px solid ' + C.borda, borderRadius: '6px', padding: '6px 8px',
          fontFamily: C.fonte, fontSize: '14px', fontWeight: '700'
        }, null, filtros);
        s.setAttribute('aria-label', rotulo);
        s.addEventListener('change', desenhar);
        return s;
      }
      var selTurma = seletor('Turma');
      var selFase = seletor('Fase');
      [['', 'Todas as fases'], ['1', 'Fase 1'], ['2', 'Fase 2'], ['3', 'Fase 3']].forEach(function (o) {
        var op = S.el('option', null, o[1], selFase);
        op.value = o[0];
      });
      var busca = S.el('input', {
        flex: '1 1 160px', minWidth: '0', background: '#071733', color: C.branco,
        border: '3px solid ' + C.borda, borderRadius: '6px', padding: '6px 8px',
        fontFamily: C.fonte, fontSize: '14px'
      }, null, filtros);
      busca.placeholder = 'Buscar nome…';
      busca.addEventListener('input', desenhar);

      var acoes = S.el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '6px 0 8px' }, null, t.cartao);
      var bTodos = S.ui.botao('Marcar todos da lista', 'secundario', function () {
        var lista = filtrados();
        var todos = lista.every(function (r) { return marcados[r.__backendId]; });
        lista.forEach(function (r) { marcados[r.__backendId] = !todos; });
        desenhar();
      }, acoes);
      var bApagar = S.ui.botao('Apagar selecionados', 'perigo', null, acoes);
      var bZerar = S.ui.botao('Zerar ranking inteiro', 'perigo', null, acoes);
      [bTodos, bApagar, bZerar].forEach(function (b) { S.estilo(b, { padding: '7px 12px', fontSize: '13px' }); });
      var status = S.el('div', { fontSize: '13px', fontWeight: '700', minHeight: '18px', marginBottom: '6px' }, '', t.cartao);
      var lista = S.el('div', null, null, t.cartao);

      var marcados = {};
      var ocupado = false;
      var confirmando = null; // 'apagar' | 'zerar'
      var timerConf = null;

      function pedirConfirmacao(qual) {
        confirmando = qual;
        clearTimeout(timerConf);
        timerConf = setTimeout(function () { confirmando = null; rotulos(); }, 5000);
        rotulos();
      }
      function rotulos() {
        var n = selecionados().length;
        bApagar.textContent = confirmando === 'apagar' ? '⚠ Confirmar: apagar ' + n + '?' : 'Apagar selecionados (' + n + ')';
        bZerar.textContent = confirmando === 'zerar' ? '⚠ Confirmar: zerar TUDO?' : 'Zerar ranking inteiro';
        bApagar.disabled = ocupado || !n;
        bApagar.style.opacity = bApagar.disabled ? '0.5' : '1';
        bZerar.disabled = ocupado;
      }

      function selecionados() {
        return D.visiveis().filter(function (r) { return marcados[r.__backendId]; });
      }
      function filtrados() {
        var tu = selTurma.value;
        var fa = selFase.value;
        var q = busca.value.trim().toLowerCase();
        return D.visiveis().filter(function (r) {
          if (tu && S.normalizarTurma(r.turma) !== tu) return false;
          if (fa && String(Number(r.fase) || 1) !== fa) return false;
          if (q && String(r.nome || '').toLowerCase().indexOf(q) < 0) return false;
          return true;
        }).sort(function (a, b) {
          return String(b.data || '').localeCompare(String(a.data || ''));
        });
      }

      bApagar.addEventListener('click', function () {
        if (ocupado || !selecionados().length) return;
        if (confirmando !== 'apagar') return pedirConfirmacao('apagar');
        executar(function (prog) { return D.apagar(selecionados(), prog); });
      });
      bZerar.addEventListener('click', function () {
        if (ocupado) return;
        if (confirmando !== 'zerar') return pedirConfirmacao('zerar');
        executar(function (prog) { return D.zerar(prog); });
      });

      function executar(fn) {
        confirmando = null;
        clearTimeout(timerConf);
        ocupado = true;
        rotulos();
        status.style.color = C.amarelo;
        status.textContent = 'Processando…';
        fn(function (feitos, total) {
          status.textContent = 'Processando… ' + feitos + '/' + total;
        }).then(function (r) {
          ocupado = false;
          marcados = {};
          status.style.color = r.falhas ? '#FF8A80' : C.verde;
          status.textContent = r.falhas
            ? '✖ ' + r.falhas + ' não foram ' + (r.ocultou ? 'ocultados' : 'apagados') + '. Tente de novo.'
            : '✔ Pronto: ' + (r.ocultou ? 'resultados escondidos do ranking.' : r.ok + ' resultado(s) apagado(s).');
          desenhar();
        }, function () {
          ocupado = false;
          status.style.color = '#FF8A80';
          status.textContent = '✖ Não foi possível concluir. Tente de novo.';
          desenhar();
        });
      }

      function montarTurmas() {
        var atual = selTurma.value;
        selTurma.textContent = '';
        var o = S.el('option', null, 'Todas as turmas', selTurma);
        o.value = '';
        D.turmas().forEach(function (x) {
          var op = S.el('option', null, x.turma, selTurma);
          op.value = x.turma;
        });
        selTurma.value = atual;
        if (selTurma.value !== atual) selTurma.value = '';
      }

      function desenhar() {
        lista.textContent = '';
        if (!D.carregado) {
          modo.textContent = 'Carregando…';
          return;
        }
        modo.textContent = (D.offline ? 'Modo offline (fora do Canva): só afeta esta aba. ' : '') +
          (D.podeApagar()
            ? 'Os resultados apagados somem para todos.'
            : 'O Canva não permite apagar daqui: os resultados escolhidos ficam escondidos do ranking (continuam guardados).') +
          ' Total no ranking: ' + D.visiveis().length + '.';
        var regs = filtrados();
        var col = '28px minmax(0,1fr) 46px 66px 86px';
        var cabL = S.el('div', { display: 'grid', gridTemplateColumns: col, gap: '6px', fontSize: '11px', fontWeight: '700', color: C.cinza, padding: '0 6px 6px', borderBottom: '2px solid ' + C.borda }, null, lista);
        ['', 'ALUNO', 'FASE', 'TEMPO', 'DATA'].forEach(function (h, i) {
          S.el('div', { textAlign: i >= 2 ? 'right' : 'left' }, h, cabL);
        });
        if (!regs.length) {
          S.el('div', { padding: '14px 0', color: C.cinza, textAlign: 'center' }, 'Nenhum resultado com esses filtros.', lista);
        }
        regs.slice(0, 300).forEach(function (r, i) {
          var id = r.__backendId;
          var l = S.el('label', {
            display: 'grid', gridTemplateColumns: col, gap: '6px', alignItems: 'center',
            padding: '6px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px',
            background: marcados[id] ? '#4A1C1A' : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.03)')
          }, null, lista);
          var chk = S.el('input', { width: '18px', height: '18px', accentColor: '#C9443D' }, null, l);
          chk.type = 'checkbox';
          chk.checked = !!marcados[id];
          chk.addEventListener('change', function () {
            marcados[id] = chk.checked;
            l.style.background = chk.checked ? '#4A1C1A' : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.03)');
            rotulos();
          });
          var nome = S.el('div', { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, String(r.nome || '?'), l);
          S.el('span', { color: C.cinza, fontSize: '11px', marginLeft: '6px' }, S.normalizarTurma(r.turma), nome);
          S.el('div', { textAlign: 'right', color: C.cinza }, String(Number(r.fase) || 1), l);
          S.el('div', { textAlign: 'right', fontFamily: C.mono }, S.formatarTempo(Number(r.tempo)), l);
          S.el('div', { textAlign: 'right', color: C.cinza, fontSize: '12px' }, dataCurta(r.data), l);
        });
        if (regs.length > 300) S.el('div', { fontSize: '12px', color: C.cinza, padding: '6px' }, 'Mostrando 300 de ' + regs.length + '. Use os filtros.', lista);
        rotulos();
      }

      var parar = D.aoMudar(function () {
        montarTurmas();
        desenhar();
      });
      montarTurmas();
      desenhar();
    }
  });


  /* ================================================================== */
  secao('W01-render-base', function () {
    var cacheMat = {};
    S.mundo = {};

    // Lambert = iluminação por vértice, mais barata e com cara de PS1.
    S.matUnico = function (cor, opcoes) {
      var p = { color: cor };
      if (opcoes) for (var k in opcoes) p[k] = opcoes[k];
      return new THREE.MeshLambertMaterial(p);
    };
    S.mat = function (cor, opcoes) {
      var chave = cor + '|' + JSON.stringify(opcoes || {});
      if (!cacheMat[chave]) cacheMat[chave] = S.matUnico(cor, opcoes);
      return cacheMat[chave];
    };

    S.textura = function (largura, altura, desenhar) {
      var c = document.createElement('canvas');
      c.width = largura;
      c.height = altura;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      var t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.__ctx = ctx;
      t.__w = largura;
      t.__h = altura;
      t.redesenhar = function (fn) {
        (fn || desenhar)(ctx, largura, altura);
        t.needsUpdate = true;
      };
      if (desenhar) desenhar(ctx, largura, altura);
      return t;
    };

    // O logo já está em pixels: entrega o canvas na hora.
    S.quandoLogo = function (fn) {
      fn(S.logoCanvas());
    };

    S.caixa = function (l, a, p, material, x, y, z, pai, semSombra) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), material);
      m.position.set(x || 0, y || 0, z || 0);
      if (!semSombra) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      (pai || S.raizFase || S.cena).add(m);
      return m;
    };

    S.cilindro = function (rt, rb, a, seg, material, x, y, z, pai) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, a, seg || 6), material);
      m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true;
      (pai || S.raizFase || S.cena).add(m);
      return m;
    };

    // Tudo o que pertence a uma fase vai para S.raizFase: ao trocar de fase,
    // um único dispose() libera geometrias, materiais e texturas da GPU.
    S.adicionar = function (obj) {
      (S.raizFase || S.cena).add(obj);
      return obj;
    };

    S.limparCacheMateriais = function () {
      cacheMat = {};
    };

    S.liberar = function (raiz) {
      var geos = new Set();
      var mats = new Set();
      var texs = new Set();
      raiz.traverse(function (o) {
        if (o.geometry) geos.add(o.geometry);
        if (!o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          mats.add(m);
          for (var k in m) {
            if (m[k] && m[k].isTexture) texs.add(m[k]);
          }
        });
      });
      geos.forEach(function (g) { g.dispose(); });
      texs.forEach(function (t) { t.dispose(); });
      mats.forEach(function (m) { m.dispose(); });
      return { geometrias: geos.size, materiais: mats.size, texturas: texs.size };
    };

    S.grupo = function (x, y, z, pai) {
      var g = new THREE.Group();
      g.position.set(x || 0, y || 0, z || 0);
      (pai || S.raizFase || S.cena).add(g);
      return g;
    };

    S.colisor = function (x, z, largura, profundidade) {
      var r = S.CFG.raio;
      S.colisores.push({
        minX: x - largura / 2 - r,
        maxX: x + largura / 2 + r,
        minZ: z - profundidade / 2 - r,
        maxZ: z + profundidade / 2 + r
      });
    };

    // Registra objetos clicáveis. Materiais são clonados para o destaque
    // de hover acender só este objeto.
    S.interativo = function (meshes, info) {
      if (!Array.isArray(meshes)) meshes = [meshes];
      info.meshes = meshes;
      meshes.forEach(function (m) {
        m.material = Array.isArray(m.material)
          ? m.material.map(function (mm) { return mm.clone(); })
          : m.material.clone();
        m.userData.info = info;
        S.interativos.push(m);
      });
      S.mundo.objetos = S.mundo.objetos || {};
      S.mundo.objetos[info.id] = info;
      return info;
    };

    S.posMundo = function (obj, local) {
      obj.updateWorldMatrix(true, false);
      var v = local ? local.clone() : new THREE.Vector3();
      return obj.localToWorld(v);
    };

    S.montarRenderer = function () {
      var r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.BasicShadowMap;
      S.estilo(r.domElement, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'block',
        imageRendering: 'pixelated',
        zIndex: '0'
      });
      S.raiz.insertBefore(r.domElement, S.raiz.firstChild);
      S.renderer = r;

      // Celular com pouca memória: o navegador pode "derrubar" o 3D (WebGL).
      // Em vez de travar, avisamos e redesenhamos quando ele voltar.
      var avisoContexto = null;
      r.domElement.addEventListener('webglcontextlost', function (ev) {
        ev.preventDefault();
        S.contextoPerdido = true;
        S.perdasDeContexto = (S.perdasDeContexto || 0) + 1; // aparece no painel F9
        if (avisoContexto) return;
        avisoContexto = S.ui.camada(60, {
          background: 'rgba(4,10,24,0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '20px',
          textAlign: 'center',
          color: '#FFFFFF',
          fontWeight: '700'
        });
        S.el('div', { fontSize: '17px' }, 'O navegador pausou o 3D para liberar memória.', avisoContexto);
        S.el('div', { fontSize: '13px', color: S.CSS.cinza, fontWeight: '400' }, 'Aguarde alguns segundos. Se não voltar, feche outras abas e recarregue.', avisoContexto);
        S.ui.botao('Recarregar a página', 'primario', function () { window.location.reload(); }, avisoContexto);
      }, false);
      r.domElement.addEventListener('webglcontextrestored', function () {
        S.contextoPerdido = false;
        if (avisoContexto) {
          avisoContexto.remove();
          avisoContexto = null;
        }
        if (!S.cena) return;
        S.cena.traverse(function (o) {
          if (!o.material) return;
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
            m.needsUpdate = true;
            for (var k in m) if (m[k] && m[k].isTexture) m[k].needsUpdate = true;
          });
        });
      }, false);

      S.cena = new THREE.Scene();
      S.cena.background = new THREE.Color(S.COR.noite);
      S.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 50);

      var hemi = new THREE.HemisphereLight(0xffffff, 0x5d6b84, 0.7);
      S.cena.add(hemi);
      var sol = new THREE.DirectionalLight(0xffffff, 0.55);
      sol.position.set(3, 9, 4);
      sol.castShadow = true;
      sol.shadow.mapSize.set(512, 512);
      var sc = sol.shadow.camera;
      sc.left = -8;
      sc.right = 8;
      sc.top = 8;
      sc.bottom = -8;
      sc.near = 1;
      sc.far = 22;
      sol.shadow.bias = -0.002;
      S.cena.add(sol);

      S.qualidade = { sombras: true, escala: 1 };
      S.redimensionar();
      if (window.ResizeObserver) {
        new ResizeObserver(function () { S.redimensionar(); }).observe(S.raiz);
      }
    };

    // Renderiza em baixa resolução (≈360 linhas) e amplia com pixels nítidos.
    S.redimensionar = function () {
      if (S.ui.verificarOrientacao) S.ui.verificarOrientacao();
      if (!S.renderer) return;
      var w = Math.max(S.raiz.clientWidth, 1);
      var h = Math.max(S.raiz.clientHeight, 1);
      var alvo = (S.toque ? S.CFG.alturaRenderToque : S.CFG.alturaRender) * S.qualidade.escala;
      S.renderer.setPixelRatio(Math.min(1, alvo / h));
      S.renderer.setSize(w, h, false);
      S.camera.aspect = w / h;
      // Em telas estreitas afasta a câmera para caber a sala.
      S.camera.fov = w / h < 1.4 ? 56 : 48;
      S.camera.updateProjectionMatrix();
    };
  });

  /* ================================================================== */
  secao('W02-sala', function () {
    // opcoes: { quadroX, placaX } — posição do quadro e da placa na parede do fundo.
    S.mundo.montarSala = function (opcoes) {
      opcoes = opcoes || {};
      var quadroX = opcoes.quadroX !== undefined ? opcoes.quadroX : -1.7;
      var placaX = opcoes.placaX !== undefined ? opcoes.placaX : 2.3;
      var quadroY = opcoes.quadroY || 1.75;
      var C = S.COR;
      var L = S.SALA.largura;
      var P = S.SALA.profundidade;
      var A = S.SALA.altura;

      var texPiso = S.textura(32, 32, function (ctx, w, h) {
        ctx.fillStyle = S.hex(C.pisoA);
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = S.hex(C.pisoB);
        ctx.fillRect(0, 0, w / 2, h / 2);
        ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, w, 1);
        ctx.fillRect(0, 0, 1, h);
      });
      texPiso.wrapS = THREE.RepeatWrapping;
      texPiso.wrapT = THREE.RepeatWrapping;
      texPiso.repeat.set(L / 1.5, P / 1.5);
      var piso = new THREE.Mesh(new THREE.PlaneGeometry(L, P), new THREE.MeshLambertMaterial({ map: texPiso }));
      piso.rotation.x = -Math.PI / 2;
      piso.receiveShadow = true;
      S.adicionar(piso);

      var mParede = S.mat(C.parede);
      var mFaixa = S.mat(C.azul);
      var mListra = S.mat(C.laranja);
      var e = 0.12;
      S.caixa(L + e * 2, A, e, mParede, 0, A / 2, -P / 2 - e / 2);
      // Parede esquerda em partes: deixa o vão da porta (z 2,475 a 3,525).
      var PORTA = { z0: 2.475, z1: 3.525, alt: 2.1 };
      var trechosEsq = [[-P / 2, PORTA.z0], [PORTA.z1, P / 2]];
      trechosEsq.forEach(function (t) {
        S.caixa(e, A, t[1] - t[0], mParede, -L / 2 - e / 2, A / 2, (t[0] + t[1]) / 2);
      });
      S.caixa(e, A - PORTA.alt, PORTA.z1 - PORTA.z0, mParede, -L / 2 - e / 2, (A + PORTA.alt) / 2, (PORTA.z0 + PORTA.z1) / 2);
      S.caixa(e, A, P, mParede, L / 2 + e / 2, A / 2, 0);
      S.caixa(L + e * 2, 0.4, e, mParede, 0, 0.2, P / 2 + e / 2);
      // Faixa azul + listra laranja (identidade Senac).
      S.caixa(L, 0.95, 0.02, mFaixa, 0, 0.475, -P / 2 + 0.011, null, true);
      trechosEsq.forEach(function (t) {
        S.caixa(0.02, 0.95, t[1] - t[0], mFaixa, -L / 2 + 0.011, 0.475, (t[0] + t[1]) / 2, null, true);
        S.caixa(0.03, 0.07, t[1] - t[0], mListra, -L / 2 + 0.015, 0.98, (t[0] + t[1]) / 2, null, true);
      });
      S.caixa(0.02, 0.95, P, mFaixa, L / 2 - 0.011, 0.475, 0, null, true);
      S.caixa(L, 0.07, 0.03, mListra, 0, 0.98, -P / 2 + 0.015, null, true);
      S.caixa(0.03, 0.07, P, mListra, L / 2 - 0.015, 0.98, 0, null, true);

      // Porta (parede esquerda) com dobradiça: abre para dentro da sala.
      var dobradica = S.grupo(-L / 2 + 0.04, 0, PORTA.z0);
      var folha = S.caixa(0.06, PORTA.alt, PORTA.z1 - PORTA.z0, S.mat(C.madeiraEscura), 0, PORTA.alt / 2, 0.525, dobradica);
      var macaneta = S.caixa(0.08, 0.06, 0.18, S.mat(C.metal), 0.05, 1.0, 0.875, dobradica, true);
      var mBatente = S.mat(C.metalEscuro);
      S.caixa(0.1, PORTA.alt + 0.08, 0.06, mBatente, -L / 2 + 0.02, (PORTA.alt + 0.08) / 2, PORTA.z0 - 0.03, null, true);
      S.caixa(0.1, PORTA.alt + 0.08, 0.06, mBatente, -L / 2 + 0.02, (PORTA.alt + 0.08) / 2, PORTA.z1 + 0.03, null, true);
      S.caixa(0.1, 0.08, PORTA.z1 - PORTA.z0 + 0.12, mBatente, -L / 2 + 0.02, PORTA.alt + 0.04, 3.0, null, true);
      // Corredor do lado de fora (aparece com a porta aberta).
      S.caixa(2.2, 0.02, 1.4, S.mat(0x4a5466), -L / 2 - 1.2, 0.0, 3.0, null, true);
      S.caixa(0.1, A, 1.4, S.mat(0x2c3647), -L / 2 - 2.3, A / 2, 3.0, null, true);
      S.caixa(2.2, A, 0.1, S.mat(0x36415a), -L / 2 - 1.2, A / 2, 2.25, null, true);
      S.caixa(2.2, A, 0.1, S.mat(0x36415a), -L / 2 - 1.2, A / 2, 3.75, null, true);
      S.mundo.porta = { dobradica: dobradica, malhas: [folha, macaneta], angulo: 0, alvo: 0, liberada: false };
      var mVidro = S.mat(0xa9d6f5, { emissive: 0x4f86b5, emissiveIntensity: 0.35 });
      var mCaixilho = S.mat(C.metalEscuro);
      var janelas = opcoes.janelas || [-2.8, -0.2, 2.4];
      for (var j = 0; j < janelas.length; j++) {
        var zj = janelas[j];
        S.caixa(0.04, 1.1, 1.5, mVidro, L / 2 - 0.03, 1.85, zj, null, true);
        S.caixa(0.07, 0.07, 1.6, mCaixilho, L / 2 - 0.05, 1.3, zj, null, true);
        S.caixa(0.07, 0.07, 1.6, mCaixilho, L / 2 - 0.05, 2.4, zj, null, true);
      }

      // Placa com o logo Senac e o nome do laboratório.
      var texPlaca = S.textura(128, 80, function (ctx, w, h) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, h - 6, w, 6);
      });
      S.quandoLogo(function (img) {
        texPlaca.redesenhar(function (ctx, w, h) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          var lw = 96;
          var lh = Math.round(img.height * lw / img.width);
          ctx.drawImage(img, (w - lw) / 2, 6, lw, lh);
          ctx.fillStyle = '#F7941D';
          ctx.fillRect(0, h - 6, w, 6);
        });
      });
      S.caixa(1.66, 1.06, 0.05, S.mat(C.azulEscuro), placaX, 2.05, -P / 2 + 0.03, null, true);
      var placa = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshLambertMaterial({ map: texPlaca }));
      placa.position.set(placaX, 2.05, -P / 2 + 0.06);
      S.adicionar(placa);
      S.mundo.placa = placa;
      var texNome = S.textura(128, 16, function (ctx, w, h) {
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LABORATÓRIO DE REDES', w / 2, 12);
      });
      var nomeLab = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshLambertMaterial({ map: texNome }));
      nomeLab.position.set(placaX, 1.38, -P / 2 + 0.06);
      S.adicionar(nomeLab);

      // Quadro branco: lista de missões que vai sendo riscada.
      S.mundo.texQuadro = S.textura(256, 128, null);
      S.caixa(3.1, 1.62, 0.05, S.mat(C.metal), quadroX, quadroY, -P / 2 + 0.03, null, true);
      var quadro = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.52), new THREE.MeshLambertMaterial({ map: S.mundo.texQuadro }));
      quadro.position.set(quadroX, quadroY, -P / 2 + 0.06);
      S.adicionar(quadro);
      S.caixa(1.0, 0.04, 0.08, S.mat(C.metal), quadroX, quadroY - 0.8, -P / 2 + 0.07, null, true);
      S.interativo(quadro, {
        id: 'quadro',
        nome: 'Quadro de missões',
        ancora: new THREE.Vector3(quadroX, 0, -3.7)
      });
    };

    S.mundo.abrirPorta = function () {
      var p = S.mundo.porta;
      if (!p) return;
      if (p.alvo !== 1.45 && p.angulo < 0.5) S.som('porta');
      p.alvo = 1.45;
    };

    S.mundo.atualizarPorta = function (dt) {
      var p = S.mundo.porta;
      if (!p || p.angulo === p.alvo) return;
      p.angulo += (p.alvo - p.angulo) * Math.min(1, dt * 3.5);
      if (Math.abs(p.alvo - p.angulo) < 0.002) p.angulo = p.alvo;
      p.dobradica.rotation.y = p.angulo;
    };

    // A porta só vira objeto clicável quando a fase termina.
    S.mundo.liberarPorta = function () {
      var p = S.mundo.porta;
      if (!p || p.liberada) return;
      p.liberada = true;
      S.mundo.abrirPorta();
      S.interativo(p.malhas, {
        id: 'porta',
        nome: 'Porta (para o Laboratório 2)',
        ancora: new THREE.Vector3(-5.1, 0, 3.0)
      });
    };

    S.mundo.desenharQuadro = function (missoes, atual) {
      S.mundo.texQuadro.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#FAFBFC';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0B4F9C';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('MISSÕES DO LABORATÓRIO', 8, 15);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(8, 19, 150, 3);
        var y0 = 34;
        var dy = Math.min(9.4, 88 / Math.max(1, missoes.length - 1));
        ctx.font = (dy < 8.5 ? 7 : 8) + 'px Arial';
        missoes.forEach(function (m, i) {
          var y = y0 + i * dy;
          var feita = m.feita;
          var ehAtual = i === atual;
          ctx.fillStyle = feita ? '#1E8E3E' : ehAtual ? '#D9700A' : '#33415A';
          ctx.fillText((feita ? '✔ ' : ehAtual ? '▶ ' : '□ ') + (i + 1) + '. ' + m.quadro, 10, y);
          if (feita) {
            var larg = ctx.measureText((i + 1) + '. ' + m.quadro).width;
            ctx.fillRect(22, y - 3, larg + 2, 1);
          }
        });
      });
    };
  });

  /* ================================================================== */
  secao('W03-bancadas-e-pcs', function () {
    S.pcs = {};

    S.mundo.desenharTela = function (pc) {
      pc.tex.redesenhar(function (ctx, w, h) {
        var e = pc.estado;
        if (!pc.ativo) {
          // PCs de enfeite: avisam que estão em manutenção.
          ctx.fillStyle = '#1A1F27';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#FFD36B';
          for (var k = -h; k < w; k += 14) {
            ctx.beginPath();
            ctx.moveTo(k, h);
            ctx.lineTo(k + 7, h);
            ctx.lineTo(k + 7 + h, 0);
            ctx.lineTo(k + h, 0);
            ctx.fill();
          }
          ctx.fillStyle = '#1A1F27';
          ctx.fillRect(6, h / 2 - 9, w - 12, 18);
          ctx.fillStyle = '#FFD36B';
          ctx.font = 'bold 9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('EM MANUTENÇÃO', w / 2, h / 2 + 3);
          return;
        }
        if (!e.ligado) {
          ctx.fillStyle = '#04070C';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#1A2534';
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(pc.nome, w / 2, h / 2 + 4);
          return;
        }
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, h - 7, w, 7);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.font = 'bold 9px Arial';
        ctx.fillText(pc.nome, 4, 11);
        ctx.font = '8px Arial';
        ctx.fillText(e.conectado ? 'Rede: cabo OK' : 'Rede: sem cabo', 4, 23);
        ctx.fillText('IP' + (e.dhcp ? ' (DHCP)' : '') + ': ' + (e.ip || '—'), 4, 33);
        if (e.ping) {
          ctx.fillStyle = '#6BF08E';
          ctx.fillText('ping ' + e.ping + ': OK', 4, 43);
        }
        // Ícone de "Configurações de Rede".
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(w - 20, 4, 16, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(w - 17, 7, 10, 7);
        ctx.fillRect(w - 13, 14, 2, 3);
      });
    };

    // rot: giro da bancada (0 = encostada na parede do fundo).
    function bancada(x, z, largura, interativa, rot) {
      var C = S.COR;
      var g = S.grupo(x, 0, z);
      rot = rot || 0;
      g.rotation.y = rot;
      var mTampo = S.mat(C.madeira);
      var mPe = S.mat(C.metalEscuro);
      S.caixa(largura, 0.05, 0.8, mTampo, 0, 0.76, 0, g);
      var dx = largura / 2 - 0.07;
      S.caixa(0.05, 0.74, 0.7, mPe, -dx, 0.37, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, dx, 0.37, 0, g);
      S.caixa(largura - 0.15, 0.25, 0.02, mPe, 0, 0.55, -0.33, g, true);
      if (Math.abs(Math.sin(rot)) > 0.5) S.colisor(x, z, 0.8, largura);
      else S.colisor(x, z, largura, 0.8);
      if (interativa !== false) {
        // Cadeira simples.
        var mCad = S.mat(C.azul);
        var cg = S.grupo(-0.35, 0, 0.72, g);
        S.caixa(0.44, 0.06, 0.42, mCad, 0, 0.46, 0, cg);
        S.caixa(0.44, 0.46, 0.05, mCad, 0, 0.74, 0.2, cg);
        S.caixa(0.05, 0.42, 0.05, mPe, 0, 0.23, 0, cg);
        S.caixa(0.4, 0.04, 0.06, mPe, 0, 0.03, 0, cg);
        S.caixa(0.06, 0.04, 0.4, mPe, 0, 0.03, 0, cg);
      }
      return g;
    }

    function criarPc(nome, x, z, ativo, largura, rot) {
      var C = S.COR;
      rot = rot || 0;
      var b = bancada(x, z, largura || 2.0, true, rot);
      var g = S.grupo(-0.3, 0.785, -0.1, b);
      var mPreto = S.mat(C.plastico);
      var mClaro = S.mat(C.plasticoClaro);
      var base = S.caixa(0.22, 0.02, 0.16, mPreto, 0, 0.01, -0.06, g);
      var haste = S.caixa(0.05, 0.2, 0.05, mPreto, 0, 0.11, -0.09, g);
      var moldura = S.caixa(0.68, 0.44, 0.05, mPreto, 0, 0.42, -0.07, g);
      var pc = {
        nome: nome,
        ativo: ativo,
        estado: { ligado: false, conectado: false, portaSwitch: null, ip: null, mascara: null, gateway: null, configurado: false, ping: null },
        bancada: b
      };
      pc.tex = S.textura(96, 56, null);
      var tela = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: pc.tex }));
      tela.position.set(0, 0.42, -0.044);
      g.add(tela);
      S.mundo.desenharTela(pc);

      var gab = S.caixa(0.22, 0.44, 0.44, mClaro, 0.68, 0.22, -0.05, g);
      var frente = S.caixa(0.17, 0.38, 0.01, mPreto, 0.68, 0.22, 0.175, g, true);
      pc.led = S.caixa(0.03, 0.03, 0.01, S.matUnico(C.ledApagado), 0.68, 0.38, 0.182, g, true);
      // Placa de rede na traseira do gabinete (de onde sai o cabo).
      pc.porta = S.caixa(0.06, 0.04, 0.02, S.mat(0x0a0c0f), 0.68, 0.12, -0.28, g, true);
      S.caixa(0.44, 0.02, 0.14, mPreto, -0.02, 0.01, 0.22, g, true);
      S.caixa(0.06, 0.025, 0.1, mPreto, 0.33, 0.013, 0.24, g, true);

      // PCs de enfeite também respondem (avisam que estão em manutenção).
      pc.info = S.interativo([moldura, gab, frente, base, haste, tela], {
        id: 'pc:' + nome,
        nome: ativo ? nome : nome + ' (em manutenção)',
        pc: pc,
        // Ponto em frente à cadeira (local -0.2, 0.85), girado com a bancada.
        ancora: new THREE.Vector3(x - 0.2 * Math.cos(rot) + 0.85 * Math.sin(rot), 0, z + 0.2 * Math.sin(rot) + 0.85 * Math.cos(rot))
      });
      S.pcs[nome] = pc;
      return pc;
    }

    S.mundo.criarPc = criarPc;

    S.mundo.montarBancadas = function () {
      criarPc('PC-01', -2.6, -1.3, true);
      criarPc('PC-02', 1.0, -1.3, true);
      criarPc('PC-03', -2.6, 1.5, false);
      criarPc('PC-04', 1.0, 1.5, false);
    };

    S.ligarPc = function (pc, ligado) {
      pc.estado.ligado = ligado;
      S.mundo.desenharTela(pc);
      pc.led.material.color.setHex(ligado ? S.COR.ledVerde : S.COR.ledApagado);
      pc.led.material.emissive.setHex(ligado ? S.COR.ledVerde : 0x000000);
      pc.led.material.emissiveIntensity = ligado ? 0.9 : 0;
    };
  });

  /* ================================================================== */
  secao('W04-rack-switch-roteador', function () {
    // Layout das portas na textura frontal do switch (em pixels da textura).
    var SW = { w: 256, h: 28, larg: 0.5, alt: 0.05 };
    var portasSw = [];
    (function () {
      for (var col = 0; col < 12; col++) {
        var x = 26 + col * 14 + (col >= 6 ? 8 : 0);
        portasSw.push({ nome: 'Fa0/' + (col * 2 + 1), x: x, y: 5, giga: false });
        portasSw.push({ nome: 'Fa0/' + (col * 2 + 2), x: x, y: 16, giga: false });
      }
      portasSw.push({ nome: 'Gi0/1', x: 216, y: 10, giga: true });
      portasSw.push({ nome: 'Gi0/2', x: 234, y: 10, giga: true });
    })();
    S.PORTAS_SWITCH = portasSw;

    var RO = { w: 128, h: 24, larg: 0.36, alt: 0.06 };
    var portasRo = [
      { nome: 'WAN', x: 58, y: 9, wan: true },
      { nome: 'LAN 1', x: 74, y: 9 },
      { nome: 'LAN 2', x: 88, y: 9 },
      { nome: 'LAN 3', x: 102, y: 9 },
      { nome: 'LAN 4', x: 116, y: 9 }
    ];
    S.PORTAS_ROTEADOR = portasRo;

    S.mundo.desenharSwitch = function () {
      var ocup = S.jogo ? S.jogo.portasSwitch : {};
      S.mundo.texSwitch.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#3A434F';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#9FB3C8';
        ctx.font = 'bold 7px Arial';
        ctx.fillText('SW-24', 3, 10);
        ctx.fillStyle = '#39FF6A';
        ctx.fillRect(4, 15, 4, 3); // LED de energia (switch sempre ligado)
        portasSw.forEach(function (p) {
          if (p.giga) {
            ctx.fillStyle = '#F7941D';
            ctx.fillRect(p.x - 2, p.y - 2, 15, 12);
          }
          ctx.fillStyle = '#0B0D10';
          ctx.fillRect(p.x, p.y, 11, 8);
          var dono = ocup[p.nome];
          if (dono) {
            ctx.fillStyle = '#2D7FE0';
            ctx.fillRect(p.x + 2, p.y + 2, 7, 5);
            var aceso = dono === 'roteador' ? S.jogo.roteadorLigado : (S.pcs[dono] && S.pcs[dono].estado.ligado);
            ctx.fillStyle = aceso ? '#39FF6A' : '#FFB020';
            ctx.fillRect(p.x + 9, p.y, 2, 2);
          }
        });
      });
    };

    S.mundo.desenharRoteador = function () {
      var j = S.jogo || {};
      S.mundo.texRoteador.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#E9EDF2';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, 3);
        ctx.fillStyle = '#5B6B80';
        ctx.font = 'bold 7px Arial';
        ctx.fillText('ROTEADOR', 4, 12);
        if (j.roteadorLigado) {
          ctx.fillStyle = '#0B4F9C';
          ctx.font = 'bold 6px Arial';
          ctx.fillText('192.168.0.1', 22, 20);
        }
        ctx.fillStyle = j.roteadorLigado ? '#39FF6A' : '#2A3530';
        ctx.fillRect(6, 16, 4, 3);
        ctx.fillRect(14, 16, 4, 3);
        portasRo.forEach(function (p) {
          ctx.fillStyle = p.wan ? '#1D5FBF' : '#E0B020';
          ctx.fillRect(p.x - 1, p.y - 1, 12, 10);
          ctx.fillStyle = '#0B0D10';
          ctx.fillRect(p.x, p.y, 10, 8);
          if (j.portaRoteador === p.nome) {
            ctx.fillStyle = '#9AA0A6';
            ctx.fillRect(p.x + 2, p.y + 2, 6, 5);
          }
        });
      });
    };

    function posPorta(malha, larg, alt, wTex, hTex, px, py, profundidade) {
      var lx = ((px + 5) / wTex - 0.5) * larg;
      var ly = (0.5 - (py + 4) / hTex) * alt;
      return S.posMundo(malha, new THREE.Vector3(lx, ly, profundidade / 2 + 0.002));
    }

    S.mundo.posPortaSwitch = function (nome) {
      var p = portasSw.filter(function (q) { return q.nome === nome; })[0];
      return posPorta(S.mundo.malhaSwitch, SW.larg, SW.alt, SW.w, SW.h, p.x, p.y, 0.32);
    };
    S.mundo.posPortaRoteador = function (nome) {
      var p = portasRo.filter(function (q) { return q.nome === nome; })[0];
      return posPorta(S.mundo.malhaRoteador, RO.larg, RO.alt, RO.w, RO.h, p.x, p.y, 0.22);
    };

    S.mundo.montarRack = function () {
      var C = S.COR;
      var rx = 4.6;
      var rz = -4.0;
      S.mundo.rack = { x: rx, z: rz };
      var g = S.grupo(rx, 0, rz);
      var mRack = S.mat(C.metalEscuro);
      [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]].forEach(function (p) {
        S.caixa(0.05, 1.8, 0.05, mRack, p[0], 0.9, p[1], g);
      });
      S.caixa(0.66, 0.05, 0.62, mRack, 0, 1.8, 0, g);
      S.caixa(0.66, 0.08, 0.62, mRack, 0, 0.04, 0, g);
      S.caixa(0.6, 0.03, 0.56, mRack, 0, 1.36, 0, g);
      S.caixa(0.6, 1.75, 0.02, mRack, 0, 0.9, -0.28, g, true);
      S.colisor(rx, rz, 0.75, 0.7);

      // Switch: a frente é uma textura com as 24 portas Fast + 2 Gigabit.
      S.mundo.texSwitch = S.textura(SW.w, SW.h, null);
      var mSw = S.mat(0x3a434f);
      var matsSw = [mSw, mSw, mSw, mSw, new THREE.MeshLambertMaterial({ map: S.mundo.texSwitch }), mSw];
      var sw = new THREE.Mesh(new THREE.BoxGeometry(SW.larg, SW.alt, 0.32), matsSw);
      sw.position.set(0, 1.0, 0.0);
      sw.castShadow = true;
      g.add(sw);
      S.mundo.malhaSwitch = sw;
      S.interativo(sw, {
        id: 'switch',
        nome: 'Switch (24 Fast + 2 Gigabit)',
        ancora: new THREE.Vector3(rx - 0.25, 0, rz + 1.0)
      });

      // Roteador na prateleira de cima.
      S.mundo.texRoteador = S.textura(RO.w, RO.h, null);
      var mRo = S.mat(0xe9edf2);
      var matsRo = [mRo, mRo, S.mat(C.azul), mRo, new THREE.MeshLambertMaterial({ map: S.mundo.texRoteador }), mRo];
      var ro = new THREE.Mesh(new THREE.BoxGeometry(RO.larg, RO.alt, 0.22), matsRo);
      ro.position.set(0, 1.41, 0.04);
      ro.castShadow = true;
      g.add(ro);
      S.mundo.malhaRoteador = ro;
      var a1 = S.cilindro(0.01, 0.012, 0.24, 4, S.mat(0x222222), -0.14, 1.55, -0.04, g);
      var a2 = S.cilindro(0.01, 0.012, 0.24, 4, S.mat(0x222222), 0.14, 1.55, -0.04, g);
      a1.rotation.z = 0.25;
      a2.rotation.z = -0.25;
      S.interativo([ro, a1, a2], {
        id: 'roteador',
        nome: 'Roteador',
        ancora: new THREE.Vector3(rx + 0.25, 0, rz + 1.0)
      });
      S.mundo.desenharSwitch();
      S.mundo.desenharRoteador();
    };
  });

  /* ================================================================== */
  secao('W05-ferramentas-e-cabos', function () {
    S.mundo.montarFerramentas = function () {
      var C = S.COR;
      var bx = -4.9;
      var bz = 0.3;
      var g = S.grupo(bx, 0, bz);
      var mTampo = S.mat(C.madeira);
      var mPe = S.mat(C.metalEscuro);
      S.caixa(1.6, 0.05, 0.8, mTampo, 0, 0.76, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, -0.72, 0.37, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, 0.72, 0.37, 0, g);
      S.colisor(bx, bz, 1.6, 0.8);
      var topo = S.grupo(0, 0.785, 0, g);

      var bobina = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.06, 4, 10), S.mat(C.caboAzul));
      bobina.rotation.x = Math.PI / 2;
      bobina.position.set(-0.5, 0.06, 0.05);
      bobina.castShadow = true;
      topo.add(bobina);

      var mAlicate = S.mat(C.laranja);
      var al = S.grupo(0.05, 0.02, 0.12, topo);
      var c1 = S.caixa(0.3, 0.03, 0.045, mAlicate, 0, 0, 0.035, al);
      var c2 = S.caixa(0.3, 0.03, 0.045, mAlicate, 0, 0, -0.035, al);
      var cab = S.caixa(0.13, 0.035, 0.11, S.mat(C.metal), 0.2, 0, 0, al);
      c1.rotation.y = 0.14;
      c2.rotation.y = -0.14;
      var pote = S.cilindro(0.07, 0.07, 0.09, 6, S.mat(0xcfe8f5), 0.45, 0.045, 0.1, topo);
      var testador = S.caixa(0.1, 0.05, 0.16, S.mat(0x2a6f3f), 0.62, 0.025, -0.15, topo);

      S.interativo([bobina, c1, c2, cab, pote, testador], {
        id: 'alicate',
        nome: 'Bancada de crimpagem',
        ancora: new THREE.Vector3(bx + 0.1, 0, bz + 0.9)
      });

      S.mundo.criarCartaz(g, bx, bz);
    };

    // Cartaz T-568B em pé sobre uma bancada (grupo g na posição bx, bz).
    S.mundo.criarCartaz = function (g, bx, bz) {
      var C = S.COR;
      var mPe = S.mat(C.metalEscuro);
      var texCartaz = S.textura(64, 48, function (ctx, w, h) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0B4F9C';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('T-568B', w / 2, 9);
        S.T568B.forEach(function (f, i) {
          var x = 6 + i * 7;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x, 14, 5, 24);
          ctx.fillStyle = f.cor;
          if (f.listrado) {
            for (var yy = 14; yy < 38; yy += 4) ctx.fillRect(x, yy, 5, 2);
          } else {
            ctx.fillRect(x, 14, 5, 24);
          }
          ctx.fillStyle = '#33415A';
          ctx.font = '6px Arial';
          ctx.fillText(String(i + 1), x + 2.5, 45);
        });
      });
      S.caixa(0.62, 0.48, 0.03, S.mat(C.azul), -0.05, 1.03, -0.3, g, true);
      var cartaz = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.42), new THREE.MeshLambertMaterial({ map: texCartaz }));
      cartaz.position.set(-0.05, 1.03, -0.283);
      g.add(cartaz);
      S.caixa(0.04, 0.3, 0.04, mPe, -0.05, 0.92, -0.33, g, true);
      S.interativo(cartaz, {
        id: 'cartaz',
        nome: 'Cartaz T-568B',
        ancora: new THREE.Vector3(bx - 0.1, 0, bz + 0.9)
      });
    };

    // Cabo instalado: tubo que sai do aparelho, desce ao chão e sobe no rack.
    S.mundo.caboInstalado = function (inicio, fim, curto) {
      var pts;
      if (curto) {
        pts = [
          inicio,
          new THREE.Vector3(inicio.x, inicio.y, inicio.z + 0.07),
          new THREE.Vector3((inicio.x + fim.x) / 2 + 0.05, (inicio.y + fim.y) / 2, Math.max(inicio.z, fim.z) + 0.13),
          new THREE.Vector3(fim.x, fim.y, fim.z + 0.07),
          fim
        ];
      } else {
        var rack = S.mundo.rack;
        var corredorZ = rack.z + 0.75;
        pts = [
          inicio,
          new THREE.Vector3(inicio.x, inicio.y - 0.05, inicio.z - 0.12),
          new THREE.Vector3(inicio.x, 0.03, inicio.z - 0.3),
          new THREE.Vector3(inicio.x, 0.03, corredorZ),
          new THREE.Vector3(rack.x - 0.55, 0.03, corredorZ),
          new THREE.Vector3(rack.x - 0.55, 0.3, rack.z + 0.45),
          new THREE.Vector3(fim.x, fim.y - 0.08, fim.z + 0.12),
          fim
        ];
      }
      var curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      var tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, curto ? 16 : 48, 0.014, 4, false), S.mat(curto ? S.COR.caboCinza : S.COR.caboAzul));
      tubo.castShadow = true;
      S.adicionar(tubo);
      return tubo;
    };

    // Cabo "solto" que liga a ponta conectada à mão do personagem.
    S.mundo.montarCaboMao = function () {
      var n = 14;
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      var linha = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: S.COR.caboAzul }));
      linha.visible = false;
      linha.frustumCulled = false;
      S.adicionar(linha);
      S.mundo.caboMao = { linha: linha, n: n, origem: null };
    };

    S.mundo.atualizarCaboMao = function () {
      var cm = S.mundo.caboMao;
      if (!cm || !cm.origem) return;
      var mao = S.posMundo(S.personagem.maoD);
      var o = cm.origem;
      var pos = cm.linha.geometry.attributes.position;
      var dist = o.distanceTo(mao);
      for (var i = 0; i < cm.n; i++) {
        var t = i / (cm.n - 1);
        var x = o.x + (mao.x - o.x) * t;
        var z = o.z + (mao.z - o.z) * t;
        var y = o.y + (mao.y - o.y) * t;
        y -= Math.sin(t * Math.PI) * Math.min(0.8, 0.12 + dist * 0.18);
        pos.setXYZ(i, x, Math.max(0.03, y), z);
      }
      pos.needsUpdate = true;
    };

    S.mundo.definirCaboMao = function (origem) {
      var cm = S.mundo.caboMao;
      cm.origem = origem;
      cm.linha.visible = !!origem;
      if (origem) S.mundo.atualizarCaboMao();
    };

    // Seta laranja que pula em cima do próximo alvo (dicas).
    S.mundo.montarSeta = function () {
      var seta = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.5, 4),
        new THREE.MeshLambertMaterial({ color: S.COR.laranja, emissive: S.COR.laranja, emissiveIntensity: 0.6 })
      );
      seta.rotation.x = Math.PI;
      seta.visible = false;
      S.adicionar(seta);
      S.mundo.seta = { malha: seta, alvo: null };
    };

    S.mundo.apontar = function (info) {
      var s = S.mundo.seta;
      s.alvo = info || null;
      s.malha.visible = !!info;
    };

    S.mundo.atualizarSeta = function (t) {
      var s = S.mundo.seta;
      if (!s.alvo) return;
      var caixa = s.alvo.__caixa;
      if (!caixa) {
        caixa = new THREE.Box3();
        s.alvo.meshes.forEach(function (m) { caixa.expandByObject(m); });
        s.alvo.__caixa = caixa;
      }
      var c = new THREE.Vector3();
      caixa.getCenter(c);
      s.malha.position.set(c.x, caixa.max.y + 0.35 + Math.abs(Math.sin(t * 4)) * 0.18, c.z);
      s.malha.rotation.y = t * 2;
    };
  });


  /* ================================================================== */
  secao('P01-personagem', function () {
    var PELES = ['#F2C9A5', '#DDA67E', '#BF8159', '#946042', '#62402A'];
    var CABELOS = ['#1C140F', '#3B2416', '#6B4423', '#C9A15A', '#0E0E0E'];

    function texturaRosto(pele, feminino) {
      return S.textura(16, 16, function (ctx) {
        ctx.fillStyle = pele;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#16120F';
        if (feminino) {
          ctx.fillRect(4, 5, 3, 1); // sobrancelhas finas
          ctx.fillRect(9, 5, 3, 1);
          ctx.fillRect(4, 7, 2, 3); // olhos
          ctx.fillRect(10, 7, 2, 3);
          ctx.fillRect(3, 7, 1, 1); // cílios
          ctx.fillRect(12, 7, 1, 1);
          ctx.fillStyle = 'rgba(214, 90, 90, 0.35)';
          ctx.fillRect(3, 10, 2, 1); // bochechas
          ctx.fillRect(11, 10, 2, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(7, 9, 2, 2); // nariz
          ctx.fillStyle = '#B5475A';
          ctx.fillRect(6, 12, 4, 1); // boca
          ctx.fillRect(7, 13, 2, 1);
        } else {
          ctx.fillRect(3, 5, 4, 1); // sobrancelhas
          ctx.fillRect(9, 5, 4, 1);
          ctx.fillRect(4, 7, 2, 3); // olhos
          ctx.fillRect(10, 7, 2, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(7, 9, 2, 2); // nariz
          ctx.fillStyle = '#7A3B2E';
          ctx.fillRect(6, 12, 4, 1); // boca
        }
      });
    }

    // Camiseta azul com listra laranja e o logo Senac no peito.
    function texturaCamisa(comLogo) {
      var t = S.textura(32, 32, function (ctx) {
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, 22, 32, 4);
        ctx.fillStyle = '#08326A';
        ctx.fillRect(11, 0, 10, 3); // gola
      });
      if (comLogo) {
        S.quandoLogo(function (img) {
          t.redesenhar(function (ctx) {
            ctx.fillStyle = '#0B4F9C';
            ctx.fillRect(0, 0, 32, 32);
            ctx.fillStyle = '#F7941D';
            ctx.fillRect(0, 22, 32, 4);
            ctx.fillStyle = '#08326A';
            ctx.fillRect(11, 0, 10, 3);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(16, 6, 13, 9); // etiqueta branca para o logo aparecer
            ctx.drawImage(img, 17, 7, 11, 7);
          });
        });
      }
      return t;
    }

    function texturaNome(nome, fundo) {
      return S.textura(128, 20, function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        var txt = nome.length > 16 ? nome.slice(0, 15) + '…' : nome;
        var larg = Math.min(w - 2, ctx.measureText(txt).width + 10);
        ctx.fillStyle = fundo || 'rgba(7,20,48,0.85)';
        ctx.fillRect((w - larg) / 2, 2, larg, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(txt, w / 2, 14);
      });
    }

    // Personagem "blocado" (cabeça cúbica grande), visual gerado pelo nome:
    // cada aluno ganha tom de pele, cor e estilo de cabelo próprios.
    S.criarPersonagem = function (nome, genero) {
      var feminino = genero === 'f';
      var h = S.hashTexto(nome || 'aluno');
      var pele = PELES[h % PELES.length];
      var cabelo = CABELOS[(h >>> 3) % CABELOS.length];
      var estilo = (h >>> 6) % 3;
      var peleN = parseInt(pele.slice(1), 16);
      var cabeloN = parseInt(cabelo.slice(1), 16);

      var mPele = S.mat(peleN);
      var mCabelo = S.mat(cabeloN);
      var mCalca = S.mat(S.COR.calca);
      var mTenis = S.mat(S.COR.tenis);
      var mSola = S.mat(S.COR.laranja);
      var mCamisa = S.mat(S.COR.azul);
      var mFrente = new THREE.MeshLambertMaterial({ map: texturaCamisa(true) });
      var mCostas = new THREE.MeshLambertMaterial({ map: texturaCamisa(false) });
      var mRosto = new THREE.MeshLambertMaterial({ map: texturaRosto(pele, feminino) });

      var raiz = S.grupo(S.CFG.inicio.x, 0, S.CFG.inicio.z);
      var corpo = S.grupo(0, 0, 0, raiz);

      function perna(x) {
        var piv = S.grupo(x, 0.74, 0, corpo);
        S.caixa(0.22, 0.6, 0.24, mCalca, 0, -0.3, 0, piv);
        S.caixa(0.24, 0.12, 0.32, mTenis, 0, -0.66, 0.04, piv);
        S.caixa(0.25, 0.03, 0.33, mSola, 0, -0.715, 0.04, piv, true);
        return piv;
      }
      var pernaE = perna(-0.13);
      var pernaD = perna(0.13);

      var tronco = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.32), [mCamisa, mCamisa, mCamisa, mCamisa, mFrente, mCostas]);
      tronco.position.set(0, 1.03, 0);
      tronco.castShadow = true;
      corpo.add(tronco);

      function braco(x) {
        var piv = S.grupo(x, 1.27, 0, corpo);
        S.caixa(0.19, 0.24, 0.21, mCamisa, 0, -0.1, 0, piv);
        S.caixa(0.15, 0.3, 0.16, mPele, 0, -0.36, 0, piv);
        var mao = S.caixa(0.17, 0.16, 0.17, mPele, 0, -0.57, 0, piv);
        return { piv: piv, mao: mao };
      }
      var bE = braco(-0.39);
      var bD = braco(0.39);

      S.caixa(0.18, 0.06, 0.16, mPele, 0, 1.34, 0, corpo);
      var cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.48), [mPele, mPele, mPele, mPele, mRosto, mPele]);
      cabeca.position.set(0, 1.62, 0);
      cabeca.castShadow = true;
      corpo.add(cabeca);
      // Três estilos de cabelo em blocos para cada personagem.
      if (feminino) {
        if (estilo === 0) {
          // Liso comprido com franja.
          S.caixa(0.56, 0.14, 0.52, mCabelo, 0, 1.91, -0.01, corpo);
          S.caixa(0.56, 0.08, 0.06, mCabelo, 0, 1.83, 0.23, corpo);
          S.caixa(0.58, 0.8, 0.1, mCabelo, 0, 1.52, -0.25, corpo);
          S.caixa(0.07, 0.56, 0.3, mCabelo, -0.285, 1.6, -0.07, corpo);
          S.caixa(0.07, 0.56, 0.3, mCabelo, 0.285, 1.6, -0.07, corpo);
        } else if (estilo === 1) {
          // Rabo de cavalo com elástico laranja.
          S.caixa(0.56, 0.14, 0.52, mCabelo, 0, 1.91, -0.01, corpo);
          S.caixa(0.56, 0.34, 0.08, mCabelo, 0, 1.73, -0.25, corpo);
          S.caixa(0.06, 0.22, 0.3, mCabelo, -0.28, 1.78, -0.08, corpo);
          S.caixa(0.06, 0.22, 0.3, mCabelo, 0.28, 1.78, -0.08, corpo);
          S.caixa(0.18, 0.06, 0.16, S.mat(S.COR.laranja), 0, 1.84, -0.32, corpo);
          S.caixa(0.16, 0.5, 0.14, mCabelo, 0, 1.56, -0.34, corpo);
        } else {
          // Volumoso com coque no alto.
          S.caixa(0.62, 0.22, 0.58, mCabelo, 0, 1.94, -0.02, corpo);
          S.caixa(0.62, 0.52, 0.12, mCabelo, 0, 1.66, -0.25, corpo);
          S.caixa(0.08, 0.36, 0.34, mCabelo, -0.3, 1.72, -0.06, corpo);
          S.caixa(0.08, 0.36, 0.34, mCabelo, 0.3, 1.72, -0.06, corpo);
          S.caixa(0.26, 0.22, 0.26, mCabelo, 0, 2.14, -0.08, corpo);
        }
      } else if (estilo === 0) {
        S.caixa(0.56, 0.14, 0.52, mCabelo, 0, 1.91, -0.01, corpo);
        S.caixa(0.56, 0.32, 0.08, mCabelo, 0, 1.73, -0.25, corpo);
      } else if (estilo === 1) {
        S.caixa(0.56, 0.24, 0.52, mCabelo, 0, 1.95, -0.01, corpo);
        S.caixa(0.56, 0.4, 0.1, mCabelo, 0, 1.7, -0.24, corpo);
        S.caixa(0.06, 0.2, 0.36, mCabelo, -0.27, 1.76, -0.04, corpo);
        S.caixa(0.06, 0.2, 0.36, mCabelo, 0.27, 1.76, -0.04, corpo);
      } else {
        S.caixa(0.54, 0.06, 0.5, mCabelo, 0, 1.89, -0.01, corpo);
        S.caixa(0.54, 0.18, 0.06, mCabelo, 0, 1.8, -0.24, corpo);
      }

      // Rolo de cabo na mão direita (aparece quando está segurando um cabo).
      var rolo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 4, 8), S.mat(S.COR.caboAzul));
      rolo.position.set(0, -0.6, 0.12);
      rolo.visible = false;
      bD.piv.add(rolo);

      var etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNome(nome), depthTest: false, transparent: true }));
      etiqueta.scale.set(1.3, 0.2, 1);
      etiqueta.position.set(0, 2.25, 0);
      etiqueta.renderOrder = 10;
      raiz.add(etiqueta);

      S.personagem = {
        raiz: raiz,
        corpo: corpo,
        pernaE: pernaE,
        pernaD: pernaD,
        bracoE: bE.piv,
        bracoD: bD.piv,
        maoD: bD.mao,
        rolo: rolo,
        fase: 0,
        angulo: Math.PI,
        andando: false
      };
      raiz.rotation.y = Math.PI;
    };

    S.texturaNome = texturaNome;

    S.personagemSegurando = function (sim) {
      if (S.personagem) S.personagem.rolo.visible = !!sim;
    };
  });

  /* ================================================================== */
  secao('P02-movimento-camera', function () {
    var desejada = null;
    var alvo = null;

    function livre(x, z) {
      var L2 = S.SALA.largura / 2 - S.CFG.raio - 0.08;
      var P2 = S.SALA.profundidade / 2 - S.CFG.raio - 0.08;
      if (x < -L2 || x > L2 || z < -P2 || z > P2) return false;
      for (var i = 0; i < S.colisores.length; i++) {
        var c = S.colisores[i];
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return false;
      }
      return true;
    }
    S.posicaoLivre = livre;

    function difAngulo(a, b) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    S.atualizarMovimento = function (dt) {
      var p = S.personagem;
      var t = S.teclas;
      var dx = S.joy.x;
      var dz = S.joy.z;
      if (t.w || t.arrowup) dz -= 1;
      if (t.s || t.arrowdown) dz += 1;
      if (t.a || t.arrowleft) dx -= 1;
      if (t.d || t.arrowright) dx += 1;
      var len = Math.sqrt(dx * dx + dz * dz);
      var intensidade = Math.min(1, len);
      p.andando = len > 0.15;
      if (p.andando) {
        dx /= len;
        dz /= len;
        var passo = S.CFG.velocidade * intensidade * dt;
        var pos = p.raiz.position;
        var nx = pos.x + dx * passo;
        var nz = pos.z + dz * passo;
        if (livre(nx, pos.z)) pos.x = nx;
        if (livre(pos.x, nz)) pos.z = nz;
        p.angulo += difAngulo(p.angulo, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
        p.raiz.rotation.y = p.angulo;
        p.fase += dt * 10 * intensidade;
        if (S.jogo) S.jogo.registrarAtividade();
      }
      var k = Math.min(1, dt * 14);
      var bal = p.andando ? Math.sin(p.fase) * 0.65 : 0;
      p.pernaE.rotation.x += (bal - p.pernaE.rotation.x) * k;
      p.pernaD.rotation.x += (-bal - p.pernaD.rotation.x) * k;
      p.bracoE.rotation.x += (-bal * 0.8 - p.bracoE.rotation.x) * k;
      var alvoBracoD = p.gestoAte && S.agora() < p.gestoAte ? -2.85 : typeof p.bracoFixo === 'number' ? p.bracoFixo : S.personagem.rolo.visible ? -0.5 : bal * 0.8;
      p.bracoD.rotation.x += (alvoBracoD - p.bracoD.rotation.x) * k;
      p.corpo.position.y = p.andando ? Math.abs(Math.sin(p.fase)) * 0.05 : Math.sin(S.agora() / 600) * 0.008;
    };

    // Posição e alvo da câmera de jogo para o personagem em "pos".
    S.poseCamera = function (pos, saidaPos, saidaAlvo) {
      var c = S.CFG.camera;
      var afast = S.camera.aspect < 1.5 ? 1.15 : 1;
      var cx = Math.max(-2.4, Math.min(2.4, pos.x * 0.85)) + c.x;
      saidaPos.set(cx, c.y * afast, pos.z + c.z * afast);
      saidaAlvo.set(cx, 0.9, pos.z - 0.7);
    };

    S.atualizarCamera = function (dt, imediato) {
      if (!desejada) {
        desejada = new THREE.Vector3();
        alvo = new THREE.Vector3();
      }
      S.poseCamera(S.personagem.raiz.position, desejada, alvo);
      if (imediato) S.camera.position.copy(desejada);
      else S.camera.position.lerp(desejada, 1 - Math.exp(-dt * 5));
      S.camera.lookAt(alvo);
    };
  });

  /* ================================================================== */
  secao('P03-professor', function () {
    // Professor Herick: fica no canto da frente, à direita, ao lado da mesa.
    // Acompanha o aluno com a cabeça e conversa quando é clicado.
    var PELE = '#E8B994';
    var CABELO = '#1A120D';
    var BARBA = '#20160F';
    var JAQUETA = '#F08A24';
    var JAQUETA_ESCURA = '#C96A12';
    var CAMISA = '#1C2B4A';
    var CRACHA = '#2B6FD1';
    var POS = { x: 5.2, z: 3.3, angulo: -1.33 };

    function px(ctx, cor, x, y, l, a) {
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, l || 1, a || 1);
    }

    function texturaRostoProf() {
      return S.textura(16, 16, function (ctx) {
        px(ctx, PELE, 0, 0, 16, 16);
        // Cabelo cacheado na testa (linha irregular).
        px(ctx, CABELO, 0, 0, 16, 1);
        [0, 1, 2, 3, 4, 7, 8, 9, 12, 13, 14, 15].forEach(function (x) { px(ctx, CABELO, x, 1); });
        [0, 1, 3, 14, 15].forEach(function (x) { px(ctx, CABELO, x, 2); });
        // Sobrancelhas grossas.
        px(ctx, CABELO, 3, 5, 4, 1);
        px(ctx, CABELO, 9, 5, 4, 1);
        px(ctx, CABELO, 4, 4, 3, 1);
        px(ctx, CABELO, 9, 4, 3, 1);
        // Olhos castanhos com um brilho.
        px(ctx, '#2E1A0F', 4, 7, 2, 2);
        px(ctx, '#2E1A0F', 10, 7, 2, 2);
        px(ctx, '#F1E6DA', 5, 7, 1, 1);
        px(ctx, '#F1E6DA', 11, 7, 1, 1);
        // Nariz.
        px(ctx, 'rgba(120,60,30,0.28)', 7, 8, 2, 3);
        // Costeletas finas e barba contornando o queixo.
        px(ctx, BARBA, 0, 6, 1, 7);
        px(ctx, BARBA, 15, 6, 1, 7);
        px(ctx, BARBA, 1, 11, 2, 2);
        px(ctx, BARBA, 13, 11, 2, 2);
        px(ctx, BARBA, 1, 13, 14, 3);
        px(ctx, BARBA, 3, 12, 3, 1);
        px(ctx, BARBA, 10, 12, 3, 1);
        // Bigode com pontas viradas (estilo "guidão").
        px(ctx, BARBA, 4, 11, 8, 1);
        px(ctx, BARBA, 3, 10, 1, 1);
        px(ctx, BARBA, 12, 10, 1, 1);
        // Boca (sorriso discreto).
        px(ctx, '#A8604E', 6, 12, 4, 1);
      });
    }

    // Lateral da cabeça; "frenteEsquerda" espelha para o outro lado.
    function texturaLadoProf(frenteEsquerda) {
      return S.textura(16, 16, function (ctx) {
        function p(cor, x, y, l, a) {
          px(ctx, cor, frenteEsquerda ? x : 16 - x - (l || 1), y, l, a);
        }
        p(PELE, 0, 0, 16, 16);
        p(CABELO, 0, 0, 16, 4);
        p(CABELO, 9, 4, 7, 7);
        p(CABELO, 12, 11, 4, 2);
        p(BARBA, 5, 4, 3, 8); // costeleta
        p(BARBA, 0, 11, 9, 5); // barba no maxilar
        p(BARBA, 0, 10, 3, 1);
        p('#C9946E', 8, 7, 2, 3); // orelha
      });
    }

    function texturaNucaProf() {
      return S.textura(16, 16, function (ctx) {
        px(ctx, PELE, 0, 0, 16, 16);
        px(ctx, CABELO, 0, 0, 16, 12);
        px(ctx, CABELO, 2, 12, 12, 1);
      });
    }

    function texturaPeitoProf() {
      var t = S.textura(32, 32, function (ctx) {
        px(ctx, JAQUETA, 0, 0, 32, 32);
        px(ctx, CAMISA, 11, 0, 10, 32); // camiseta por baixo da jaqueta aberta
        px(ctx, '#E6E6E6', 11, 0, 10, 1); // gola com listras
        px(ctx, '#E6E6E6', 12, 1, 8, 1);
        px(ctx, JAQUETA_ESCURA, 10, 0, 1, 32); // lapelas
        px(ctx, JAQUETA_ESCURA, 21, 0, 1, 32);
        px(ctx, JAQUETA_ESCURA, 0, 28, 32, 1);
        // Cordão do crachá (azul) e o crachá branco.
        for (var y = 2; y < 14; y++) {
          px(ctx, CRACHA, 12 + Math.floor((y - 2) / 4), y);
          px(ctx, CRACHA, 19 - Math.floor((y - 2) / 4), y);
        }
        px(ctx, '#FFFFFF', 13, 14, 6, 7);
        px(ctx, CRACHA, 13, 19, 6, 2);
      });
      S.quandoLogo(function (img) {
        t.__ctx.drawImage(img, 13, 15, 6, 4);
        t.needsUpdate = true;
      });
      return t;
    }

    function texturaCostasProf() {
      return S.textura(32, 32, function (ctx) {
        px(ctx, JAQUETA, 0, 0, 32, 32);
        px(ctx, CAMISA, 10, 0, 12, 2);
        px(ctx, JAQUETA_ESCURA, 0, 28, 32, 1);
        px(ctx, JAQUETA_ESCURA, 15, 8, 2, 20);
      });
    }

    function mesaProfessor() {
      var C = S.COR;
      var mx = 4.25;
      var mz = 3.3;
      var g = S.grupo(mx, 0, mz);
      var mTampo = S.mat(C.madeira);
      var mPe = S.mat(C.metalEscuro);
      S.caixa(0.62, 0.05, 1.3, mTampo, 0, 0.76, 0, g);
      S.caixa(0.05, 0.74, 0.05, mPe, -0.26, 0.37, -0.6, g);
      S.caixa(0.05, 0.74, 0.05, mPe, -0.26, 0.37, 0.6, g);
      S.caixa(0.05, 0.74, 0.05, mPe, 0.26, 0.37, -0.6, g);
      S.caixa(0.05, 0.74, 0.05, mPe, 0.26, 0.37, 0.6, g);
      S.caixa(0.02, 0.4, 1.2, S.mat(C.azul), -0.3, 0.52, 0, g, true); // painel frontal azul
      // Notebook aberto virado para o professor.
      S.caixa(0.24, 0.02, 0.32, S.mat(C.plastico), 0.08, 0.795, -0.2, g);
      var tampa = S.caixa(0.015, 0.22, 0.32, S.mat(C.azul), -0.04, 0.9, -0.2, g);
      tampa.rotation.z = 0.25;
      // Caneca laranja e livros.
      S.cilindro(0.045, 0.04, 0.1, 8, S.mat(C.laranja), 0.12, 0.835, 0.25, g);
      S.caixa(0.22, 0.04, 0.3, S.mat(0x2e7d4f), -0.05, 0.805, 0.38, g);
      S.caixa(0.2, 0.04, 0.28, S.mat(0xb33a3a), -0.05, 0.845, 0.38, g);
      S.colisor(mx, mz, 0.62, 1.3);
    }

    var gesto = null;
    var balao = null;
    var balaoAte = 0;
    var balaoTexto = null;
    var vTmp = null;

    // Herick reage ao que aconteceu na sala (Cachola foi embora, Carlos…).
    var reacao = null;
    S.reacaoProfessor = function (texto) { reacao = texto; };
    S.falaReacaoProfessor = function () { return reacao; };

    S.criarProfessor = function () {
      gesto = null;
      tocaAqui = null;
      reacao = null;
      mesaProfessor();
      var mPele = S.mat(parseInt(PELE.slice(1), 16));
      var mCabelo = S.mat(parseInt(CABELO.slice(1), 16));
      var mBarba = S.mat(parseInt(BARBA.slice(1), 16));
      var mJaqueta = S.mat(parseInt(JAQUETA.slice(1), 16));
      var mCalca = S.mat(0x5f646c);
      var mSapato = S.mat(0x1a1a1a);

      var raiz = S.grupo(POS.x, 0, POS.z);
      raiz.rotation.y = POS.angulo;
      var corpo = S.grupo(0, 0, 0, raiz);
      var partes = [];

      function perna(x) {
        var piv = S.grupo(x, 0.72, 0, corpo);
        partes.push(S.caixa(0.23, 0.6, 0.25, mCalca, 0, -0.3, 0, piv));
        partes.push(S.caixa(0.25, 0.1, 0.34, mSapato, 0, -0.66, 0.04, piv));
        return piv;
      }
      var pernaE = perna(-0.14);
      var pernaD = perna(0.14);

      var mFrente = new THREE.MeshLambertMaterial({ map: texturaPeitoProf() });
      var mCostas = new THREE.MeshLambertMaterial({ map: texturaCostasProf() });
      var tronco = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 0.34), [mJaqueta, mJaqueta, mJaqueta, mJaqueta, mFrente, mCostas]);
      tronco.position.set(0, 1.03, 0);
      tronco.castShadow = true;
      corpo.add(tronco);
      partes.push(tronco);

      function braco(x) {
        var piv = S.grupo(x, 1.28, 0, corpo);
        partes.push(S.caixa(0.2, 0.28, 0.22, mJaqueta, 0, -0.11, 0, piv));
        partes.push(S.caixa(0.17, 0.3, 0.18, mJaqueta, 0, -0.38, 0, piv));
        partes.push(S.caixa(0.16, 0.15, 0.16, mPele, 0, -0.6, 0, piv));
        return piv;
      }
      var bracoE = braco(-0.41);
      var bracoD = braco(0.41);

      partes.push(S.caixa(0.18, 0.06, 0.16, mPele, 0, 1.37, 0, corpo));
      // Cabeça num pivô próprio para poder girar acompanhando o aluno.
      var pivCabeca = S.grupo(0, 1.36, 0, corpo);
      var mRosto = new THREE.MeshLambertMaterial({ map: texturaRostoProf() });
      var mLadoD = new THREE.MeshLambertMaterial({ map: texturaLadoProf(true) });
      var mLadoE = new THREE.MeshLambertMaterial({ map: texturaLadoProf(false) });
      var mNuca = new THREE.MeshLambertMaterial({ map: texturaNucaProf() });
      var cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.48), [mLadoD, mLadoE, mCabelo, mPele, mRosto, mNuca]);
      cabeca.position.set(0, 0.26, 0);
      cabeca.castShadow = true;
      pivCabeca.add(cabeca);
      partes.push(cabeca);
      // Volume da barba no queixo.
      partes.push(S.caixa(0.34, 0.06, 0.06, mBarba, 0, 0.02, 0.25, pivCabeca, true));
      // Cabelo cacheado: base volumosa + "cachos" em blocos.
      partes.push(S.caixa(0.58, 0.14, 0.54, mCabelo, 0, 0.57, -0.01, pivCabeca));
      partes.push(S.caixa(0.58, 0.32, 0.08, mCabelo, 0, 0.38, -0.25, pivCabeca));
      partes.push(S.caixa(0.05, 0.16, 0.36, mCabelo, -0.285, 0.44, -0.05, pivCabeca, true));
      partes.push(S.caixa(0.05, 0.16, 0.36, mCabelo, 0.285, 0.44, -0.05, pivCabeca, true));
      [
        [-0.19, 0.67, 0.13], [0.02, 0.69, 0.17], [0.2, 0.66, 0.1], [-0.09, 0.68, -0.08],
        [0.13, 0.67, -0.14], [-0.21, 0.65, -0.18], [0.0, 0.66, -0.24], [-0.12, 0.58, 0.25], [0.12, 0.59, 0.25]
      ].forEach(function (c, i) {
        var t = i % 3 === 0 ? 0.15 : 0.12;
        partes.push(S.caixa(t, t, t, mCabelo, c[0], c[1], c[2], pivCabeca, true));
      });

      var etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.texturaNome('Prof. Herick', 'rgba(201,106,18,0.92)'), depthTest: false, transparent: true }));
      etiqueta.scale.set(1.3, 0.2, 1);
      etiqueta.position.set(0, 2.3, 0);
      etiqueta.renderOrder = 10;
      raiz.add(etiqueta);

      S.professor = {
        raiz: raiz,
        corpo: corpo,
        cabeca: pivCabeca,
        bracoE: bracoE,
        bracoD: bracoD,
        pernaE: pernaE,
        pernaD: pernaD,
        yaw: 0,
        alvoFixo: null,
        caminho: null,
        passo: 0,
        foi: false
      };
      S.interativo(partes, {
        id: 'professor',
        nome: 'Professor Herick',
        ancora: new THREE.Vector3(3.55, 0, 2.9)
      });
      S.colisor(POS.x, POS.z, 0.5, 0.4);
      S.professor.colisor = S.colisores[S.colisores.length - 1];
    };

    // Sai andando pelos pontos do caminho (contorna a mesa e vai até a porta).
    S.professorSair = function (aoSair) {
      var pr = S.professor;
      if (!pr || pr.caminho || pr.foi) return;
      pr.caminho = [[5.25, 2.2], [3.3, 2.3], [2.9, 3.05], [-5.0, 3.05], [-7.2, 3.05]];
      pr.aoSair = aoSair;
      pr.alvoFixo = null;
      // Deixa de bloquear o caminho e de ser clicável.
      var i = S.colisores.indexOf(pr.colisor);
      if (i >= 0) S.colisores.splice(i, 1);
      delete S.mundo.objetos.professor;
      for (var k = S.interativos.length - 1; k >= 0; k--) {
        var info = S.interativos[k].userData.info;
        if (info && info.id === 'professor') S.interativos.splice(k, 1);
      }
      S.esconderBalaoProfessor();
    };

    // Pula a caminhada (quando o aluno pula a cena).
    S.professorSumir = function () {
      var pr = S.professor;
      if (!pr || pr.foi) return;
      if (!pr.caminho) S.professorSair(null);
      pr.caminho = null;
      pr.foi = true;
      pr.raiz.visible = false;
      S.mundo.abrirPorta();
      var fn = pr.aoSair;
      pr.aoSair = null;
      if (fn) fn();
    };

    function andar(pr, dt) {
      var pos = pr.raiz.position;
      var alvo = pr.caminho[0];
      var dx = alvo[0] - pos.x;
      var dz = alvo[1] - pos.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      var passo = 2.4 * dt;
      if (dist <= passo) {
        pos.x = alvo[0];
        pos.z = alvo[1];
        pr.caminho.shift();
      } else {
        pos.x += dx / dist * passo;
        pos.z += dz / dist * passo;
        var ang = Math.atan2(dx, dz);
        pr.raiz.rotation.y += difAngulo(pr.raiz.rotation.y, ang) * Math.min(1, dt * 9);
      }
      // A porta abre quando ele chega perto.
      if (pos.x < -1.2) S.mundo.abrirPorta();
      pr.passo += dt * 9;
      var bal = Math.sin(pr.passo) * 0.6;
      pr.pernaE.rotation.x = bal;
      pr.pernaD.rotation.x = -bal;
      pr.bracoE.rotation.x = -bal * 0.7;
      pr.bracoD.rotation.x = bal * 0.7;
      pr.bracoD.rotation.z = 0;
      pr.corpo.position.y = Math.abs(Math.sin(pr.passo)) * 0.04;
      pr.yaw *= 1 - Math.min(1, dt * 6);
      pr.cabeca.rotation.y = pr.yaw;
      pr.cabeca.rotation.x = 0;
      if (!pr.caminho.length) {
        pr.caminho = null;
        pr.foi = true;
        pr.raiz.visible = false;
        var fn = pr.aoSair;
        pr.aoSair = null;
        if (fn) fn();
      }
    }

    // Gestos simples: 'aceno' (mão levantada balançando), 'apontar' e 'falar'.
    S.gestoProfessor = function (tipo, duracao) {
      gesto = tipo ? { tipo: tipo, t: 0, dur: duracao || 1.6 } : null;
    };

    function difAngulo(a, b) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    S.atualizarProfessor = function (dt) {
      var pr = S.professor;
      if (!pr || pr.foi) return;
      if (pr.caminho) {
        andar(pr, dt);
        return;
      }
      // Cabeça segue o aluno (ou um ponto fixo durante a cena), com limite de giro.
      var alvo = pr.alvoFixo || (S.personagem && S.personagem.raiz.position);
      if (alvo) {
        var mundo = Math.atan2(alvo.x - pr.raiz.position.x, alvo.z - pr.raiz.position.z);
        var local = Math.max(-1.25, Math.min(1.25, difAngulo(pr.raiz.rotation.y, mundo)));
        pr.yaw += (local - pr.yaw) * Math.min(1, dt * 6);
        pr.cabeca.rotation.y = pr.yaw;
      }
      var tempo = S.agora() / 1000;
      var bE = 0;
      var bD = 0;
      var bDz = 0;
      var bEz = 0;
      var aceno = 0;
      pr.cabeca.rotation.x = 0;
      pr.cabeca.rotation.z = 0;
      pr.corpo.rotation.x = 0;
      atualizarTocaAqui(dt);
      if (gesto) {
        gesto.t += dt;
        var f = Math.min(1, gesto.t / 0.25, (gesto.dur - gesto.t) / 0.25);
        if (gesto.tipo === 'aceno') {
          bD = -2.6 * f;
          aceno = Math.sin(gesto.t * 12) * 0.35 * f;
        } else if (gesto.tipo === 'apontar') {
          bD = -1.45 * f;
        } else if (gesto.tipo === 'falar') {
          bE = (-0.45 + Math.sin(gesto.t * 5) * 0.15) * f;
          pr.cabeca.rotation.x = Math.sin(gesto.t * 7) * 0.05 * f;
        } else if (gesto.tipo === 'explicar') {
          // Mão à frente "desenhando" no ar e cabeça balançando (não é aceno).
          bD = (-1.05 + Math.sin(gesto.t * 4.2) * 0.22) * f;
          bDz = Math.sin(gesto.t * 3.1) * 0.28 * f;
          bE = -0.25 * f;
          pr.cabeca.rotation.x = Math.sin(gesto.t * 5.5) * 0.08 * f;
          pr.cabeca.rotation.z = Math.sin(gesto.t * 2.6) * 0.1 * f;
        } else if (gesto.tipo === 'tocaAqui') {
          // Mão levantada, parada, esperando o toca aqui.
          bD = -2.75 * f;
          bDz = 0.12 * f;
        } else if (gesto.tipo === 'susto') {
          // Assustado: as duas mãos para cima, tremendo, corpo para trás.
          var tremor = Math.sin(gesto.t * 38) * 0.06 * f;
          bD = (-2.35 + tremor) * f;
          bE = (-2.35 - tremor) * f;
          bDz = 0.35 * f;
          bEz = -0.35 * f;
          pr.corpo.rotation.x = -0.14 * f;
          pr.cabeca.rotation.x = -0.12 * f;
          pr.cabeca.rotation.z = Math.sin(gesto.t * 9) * 0.06 * f;
        } else if (gesto.tipo === 'toca') {
          var k = Math.sin(Math.min(1, gesto.t / gesto.dur) * Math.PI);
          bD = -2.3 - k * 0.5;
          bDz = -0.35 * k;
        }
        if (gesto.t >= gesto.dur) gesto = null;
      }
      pr.bracoD.rotation.x = bD;
      pr.bracoD.rotation.z = bDz + aceno;
      pr.bracoE.rotation.x = bE;
      pr.bracoE.rotation.z = bEz;
      pr.corpo.position.y = Math.sin(tempo * 1.7) * 0.008;
      atualizarBalao();
    };

    // Balão de fala em HTML (legível mesmo com o 3D em baixa resolução).
    function criarBalao() {
      balao = S.el('div', {
        position: 'absolute',
        zIndex: '6',
        transform: 'translate(-50%, -100%)',
        background: '#FFFFFF',
        color: '#10203A',
        border: '3px solid #071430',
        borderRadius: '12px',
        padding: '7px 12px',
        fontWeight: '700',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        display: 'none',
        boxShadow: '0 4px 0 rgba(7,20,48,0.35)'
      }, '', S.raiz);
      balaoTexto = S.el('span', null, '', balao);
      S.el('div', {
        position: 'absolute',
        left: '50%',
        bottom: '-9px',
        width: '12px',
        height: '12px',
        marginLeft: '-6px',
        background: '#FFFFFF',
        borderRight: '3px solid #071430',
        borderBottom: '3px solid #071430',
        transform: 'rotate(45deg)'
      }, null, balao);
    }

    // gestoFala: nome do gesto, ou false para não mexer (ex.: mão levantada).
    // O gesto só recomeça quando o anterior terminou (cliques repetidos).
    S.professorFalar = function (texto, ms, gestoFala) {
      if (!S.professor) return;
      if (!balao) criarBalao();
      balaoTexto.textContent = texto;
      S.voz.frase('prof', texto);
      balao.style.fontSize = S.toque || S.ui.compacto() ? '12px' : '14px';
      balaoAte = S.agora() + (ms || 3200);
      if (gestoFala !== false && !gesto) S.gestoProfessor(gestoFala || 'aceno', 1.2);
      atualizarBalao();
      // Se o professor estiver fora da tela, a fala aparece como aviso.
      if (balao.style.display === 'none' && S.fase === 'jogo') S.aviso('Prof. Herick: "' + texto + '"', 'info', ms || 3200);
    };

    S.professorOcupado = function () { return !!gesto; };

    // ---- Toca aqui: depois da cena, o professor espera com a mão levantada.
    var tocaAqui = null;
    S.esperarTocaAqui = function () {
      tocaAqui = { t: 0, avisou: false };
      if (!gesto || gesto.tipo !== 'tocaAqui') S.gestoProfessor('tocaAqui', Infinity);
    };
    S.esperandoTocaAqui = function () { return !!tocaAqui; };
    S.baterTocaAqui = function () {
      if (!tocaAqui) return false;
      tocaAqui = null;
      S.gestoProfessor('toca', 0.7);
      S.som('toca');
      if (S.personagem) S.personagem.gestoAte = S.agora() + 700;
      S.professorFalar('Isso aí! ✋', 2200, false);
      return true;
    };
    function atualizarTocaAqui(dt) {
      if (!tocaAqui || S.pausado || S.fase !== 'jogo') return;
      tocaAqui.t += dt;
      if (tocaAqui.t >= 15 && !tocaAqui.avisou) {
        tocaAqui.avisou = true;
        S.professorFalar('Não vai me deixar no vácuo, né?', 4200, false);
      }
      if (tocaAqui.t >= 30) {
        tocaAqui = null;
        S.gestoProfessor(null);
        S.professorFalar('Bom, acho que você está focado em outra coisa...', 4800, false);
      }
    }

    S.esconderBalaoProfessor = function () {
      balaoAte = 0;
      if (balao) balao.style.display = 'none';
    };

    function atualizarBalao() {
      if (!balao) return;
      if (S.agora() > balaoAte || S.pausado || !S.professor || S.professor.foi) {
        balao.style.display = 'none';
        return;
      }
      if (!vTmp) vTmp = new THREE.Vector3();
      var rp = S.professor.raiz.position;
      vTmp.set(rp.x, 2.45, rp.z).project(S.camera);
      if (vTmp.z > 1 || Math.abs(vTmp.x) > 1.1 || Math.abs(vTmp.y) > 1.1) {
        balao.style.display = 'none';
        return;
      }
      var w = S.raiz.clientWidth;
      var h = S.raiz.clientHeight;
      var x = (vTmp.x + 1) / 2 * w;
      var larg = balao.offsetWidth || 180;
      x = Math.max(larg / 2 + 6, Math.min(w - larg / 2 - 6, x));
      balao.style.left = x + 'px';
      balao.style.top = Math.max(60, (1 - vTmp.y) / 2 * h - 10) + 'px';
      balao.style.display = 'block';
    }

    S.professorPosicao = POS;
  });


  /* ================================================================== */
  secao('E01-teclado-mouse', function () {
    var BLOQUEAR = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
    var hoverAtual = null;
    var mouse = null;
    var mouseMudou = false;
    var mouseTela = null;

    function digitando(e) {
      var t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }

    window.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      if (k === 'f9') {
        e.preventDefault();
        if (S.alternarVerificacao) S.alternarVerificacao();
        return;
      }
      // Esc fecha a janela mesmo com o cursor num campo de texto.
      if (digitando(e) && k !== 'escape') return;
      // Teclado nos menus: com um botão/lista em foco, Enter e Espaço são dele.
      var alvo = e.target && e.target.tagName;
      if ((alvo === 'BUTTON' || alvo === 'SELECT') && (k === 'enter' || k === ' ' || k.indexOf('arrow') === 0)) return;
      if (BLOQUEAR.indexOf(k) >= 0 && !digitando(e)) e.preventDefault();
      if (k === 'escape') {
        var m = S.ui.modalAberto();
        if (m && m.cancelavel !== false) m.fechar();
        else if (S.telaPausa && S.telaPausa.fundo.isConnected) {
          S.telaPausa.fechar();
          S.pausado = !!S.ui.modalAberto();
        }
        return;
      }
      if (S.fase !== 'jogo' || S.pausado) return;
      S.teclas[k] = true;
      if (e.repeat) return;
      if (k === 'e' || k === 'enter') S.jogo.usarProximo();
      if (k === 'h') S.ui.mostrarComandos(false);
    }, { passive: false });

    window.addEventListener('keyup', function (e) {
      S.teclas[(e.key || '').toLowerCase()] = false;
    });
    window.addEventListener('blur', function () {
      S.teclas = {};
    });

    var entradaLigada = false;
    S.ligarEntradaCena = function () {
      if (entradaLigada) return;
      entradaLigada = true;
      var c = S.renderer.domElement;
      mouse = new THREE.Vector2(-10, -10);
      var ray = new THREE.Raycaster();

      function ndc(e) {
        var r = c.getBoundingClientRect();
        mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        mouseTela = { x: e.clientX - r.left, y: e.clientY - r.top };
        mouseMudou = true;
      }

      S.pick = function () {
        ray.setFromCamera(mouse, S.camera);
        var hits = ray.intersectObjects(S.interativos, false);
        // Pula objetos travados pela fase (o toque "atravessa" até o liberado).
        for (var i = 0; i < hits.length; i++) {
          var info = hits[i].object.userData.info;
          if (!S.jogo || !S.jogo.permitido || S.jogo.permitido(info)) return info;
        }
        return null;
      };

      c.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse') ndc(e);
      });
      c.addEventListener('pointerleave', function () {
        mouse.set(-10, -10);
        mouseMudou = true;
      });
      c.addEventListener('pointerdown', S.protegido('clique-cena', function (e) {
        S.raiz.focus({ preventScroll: true });
        if (S.fase !== 'jogo' || S.pausado) return;
        ndc(e);
        var info = S.pick();
        if (info) S.jogo.usar(info, true);
      }));
    };

    function definirHover(info) {
      if (info === hoverAtual) return;
      S.destacar(hoverAtual, false);
      S.destacar(info, true);
      hoverAtual = info;
      S.renderer.domElement.style.cursor = info ? 'pointer' : 'default';
    }

    S.atualizarHover = function () {
      if (!mouse || !mouseMudou || S.toque) return;
      mouseMudou = false;
      definirHover(S.pausado ? null : S.pick());
      S.atualizarDicaMouse(hoverAtual, mouseTela);
    };

    S.limparHover = function () {
      definirHover(null);
      S.atualizarDicaMouse(null, null);
    };

    var emissivos = new WeakMap();
    S.destacar = function (info, ligado) {
      if (!info) return;
      info.meshes.forEach(function (m) {
        (Array.isArray(m.material) ? m.material : [m.material]).forEach(function (mat) {
          if (!mat.emissive) return;
          if (!emissivos.has(mat)) emissivos.set(mat, { cor: mat.emissive.getHex(), i: mat.emissiveIntensity });
          if (ligado) {
            mat.emissive.setHex(S.COR.destaque);
            mat.emissiveIntensity = 1;
          } else {
            var o = emissivos.get(mat);
            mat.emissive.setHex(o.cor);
            mat.emissiveIntensity = o.i;
          }
        });
      });
    };

    // Etiqueta com o nome do objeto sob o mouse.
    var etiqueta = null;
    S.atualizarDicaMouse = function (info, pos) {
      if (!etiqueta) {
        etiqueta = S.el('div', {
          position: 'absolute',
          zIndex: '7',
          background: 'rgba(0,0,0,0.82)',
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          display: 'none'
        }, '', S.raiz);
      }
      if (!info || !pos) {
        etiqueta.style.display = 'none';
        return;
      }
      var longe = S.jogo.distancia(info) > S.jogo.alcance(info);
      etiqueta.textContent = info.nome + (longe ? ' (chegue mais perto)' : '');
      etiqueta.style.left = Math.min(pos.x + 14, S.raiz.clientWidth - 160) + 'px';
      etiqueta.style.top = (pos.y + 16) + 'px';
      etiqueta.style.display = 'block';
    };
  });

  /* ================================================================== */
  secao('E02-controles-toque', function () {
    var C = S.CSS;
    var ctrl = null;

    S.ui.criarControlesToque = function () {
      if (ctrl) return;
      ctrl = {};
      // Joystick: base fixa no canto inferior esquerdo.
      ctrl.base = S.el('div', {
        position: 'absolute',
        left: '18px',
        bottom: '18px',
        width: '132px',
        height: '132px',
        borderRadius: '50%',
        background: 'rgba(14, 37, 71, 0.55)',
        border: '4px solid rgba(255,255,255,0.35)',
        boxSizing: 'border-box',
        zIndex: '6',
        touchAction: 'none'
      }, null, S.raiz);
      ctrl.pino = S.el('div', {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '58px',
        height: '58px',
        marginLeft: '-29px',
        marginTop: '-29px',
        borderRadius: '50%',
        background: C.laranja,
        border: '4px solid #071430',
        boxSizing: 'border-box',
        pointerEvents: 'none'
      }, null, ctrl.base);

      var dedo = null;
      function mover(e) {
        var r = ctrl.base.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var max = r.width / 2 - 10;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > max) {
          dx = dx / d * max;
          dy = dy / d * max;
        }
        ctrl.pino.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        var nx = dx / max;
        var ny = dy / max;
        var mag = Math.sqrt(nx * nx + ny * ny);
        if (mag < 0.18) {
          S.joy.x = 0;
          S.joy.z = 0;
        } else {
          S.joy.x = nx;
          S.joy.z = ny;
        }
      }
      function soltar() {
        dedo = null;
        S.joy.x = 0;
        S.joy.z = 0;
        ctrl.pino.style.transform = 'translate(0,0)';
      }
      ctrl.base.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        dedo = e.pointerId;
        try { ctrl.base.setPointerCapture(e.pointerId); } catch (er) { /* ignora */ }
        mover(e);
      });
      ctrl.base.addEventListener('pointermove', function (e) {
        if (e.pointerId === dedo) mover(e);
      });
      ctrl.base.addEventListener('pointerup', soltar);
      ctrl.base.addEventListener('pointercancel', soltar);
      ctrl.base.addEventListener('lostpointercapture', soltar);

      // Botão USAR no canto inferior direito.
      ctrl.usar = S.el('button', {
        position: 'absolute',
        right: '22px',
        bottom: '26px',
        width: '104px',
        height: '104px',
        borderRadius: '50%',
        background: C.laranja,
        color: '#10203A',
        border: '4px solid #071430',
        boxShadow: '0 6px 0 ' + C.laranjaEscuro,
        fontFamily: C.fonte,
        fontWeight: '700',
        fontSize: '17px',
        zIndex: '6',
        touchAction: 'none'
      }, 'USAR', S.raiz);
      ctrl.usar.type = 'button';
      ctrl.usar.setAttribute('data-som', 'nao');
      ctrl.usar.addEventListener('pointerdown', S.protegido('toque:usar', function (e) {
        e.preventDefault();
        ctrl.usar.style.transform = 'translateY(4px)';
        if (S.fase === 'jogo' && !S.pausado) S.jogo.usarProximo();
      }));
      var solta = function () { ctrl.usar.style.transform = 'translateY(0)'; };
      ctrl.usar.addEventListener('pointerup', solta);
      ctrl.usar.addEventListener('pointercancel', solta);
      S.ui.atualizarControlesToque();
    };

    // Acessibilidade: botões maiores e joystick do lado direito.
    S.ui.posicionarControlesToque = function () {
      if (!ctrl) return;
      var k = S.cfg.botoesGrandes ? 1.3 : 1;
      var dir = !!S.cfg.joystickDireita;
      var tb = Math.round(132 * k);
      var tp = Math.round(58 * k);
      var tu = Math.round(104 * k);
      S.estilo(ctrl.base, { width: tb + 'px', height: tb + 'px', left: dir ? 'auto' : '18px', right: dir ? '18px' : 'auto' });
      S.estilo(ctrl.pino, { width: tp + 'px', height: tp + 'px', marginLeft: (-tp / 2) + 'px', marginTop: (-tp / 2) + 'px' });
      S.estilo(ctrl.usar, { width: tu + 'px', height: tu + 'px', fontSize: Math.round(17 * k) + 'px', right: dir ? 'auto' : '22px', left: dir ? '22px' : 'auto' });
    };

    S.ui.atualizarControlesToque = function () {
      if (!ctrl) return;
      S.ui.posicionarControlesToque();
      var mostrar = S.toque && S.fase === 'jogo' && !S.pausado;
      ctrl.base.style.display = mostrar ? 'block' : 'none';
      ctrl.usar.style.display = mostrar ? 'block' : 'none';
      if (S.hud && S.hud.prompt) {
        // No celular o aviso de interação fica acima do botão, sem cobrir o joystick.
        S.hud.prompt.style.bottom = S.toque ? '20px' : '14px';
      }
    };

    // Se o aparelho tiver tela de toque e for tocado, liga os controles.
    window.addEventListener('touchstart', function () {
      if (!S.toque) {
        S.toque = true;
        if (S.fase === 'jogo') {
          S.ui.criarControlesToque();
          S.ui.ajustarHudToque();
          if (S.limparHover) S.limparHover();
          S.redimensionar();
        }
        S.ui.verificarOrientacao();
      }
    }, { passive: true });
  });


  /* ================================================================== */
  secao('J01-estado-e-missoes', function () {
    var J = S.jogo = {
      portasSwitch: {}, // 'Fa0/3' → 'PC-01' | 'roteador'
      portaRoteador: null,
      portaUplink: null,
      roteadorLigado: false,
      cabosCrimpados: 0,
      mao: null, // { tipo: 'cabo' } ou { tipo: 'ponta', origem: 'pc'|'switch', pc, porta, pos }
      erros: 0,
      dicas: 0,
      indice: -1,
      progressoEm: 0,
      nivelDica: 0,
      concluido: false,
      viuIpRoteador: false
    };

    function pc(n) { return S.pcs[n].estado; }
    function conectados() {
      return ['PC-01', 'PC-02'].filter(function (n) { return pc(n).conectado; }).length;
    }
    function pcsSemCabo() {
      return ['PC-01', 'PC-02'].filter(function (n) { return !pc(n).conectado; }).map(function (n) { return 'pc:' + n; });
    }
    function alvosConectar() {
      if (J.mao && J.mao.tipo === 'ponta') return ['switch'];
      if (!J.mao) return ['alicate'];
      return pcsSemCabo();
    }

    // Zera o estado comum ao começar uma fase (cada fase tem suas missões).
    J.reiniciar = function (missoes) {
      J.MISSOES = missoes;
      J.mao = null;
      J.erros = 0;
      J.dicas = 0;
      J.indice = -1;
      J.progressoEm = 0;
      J.nivelDica = 0;
      J.concluido = false;
      J.saidaLiberada = false;
      J.saindo = false;
    };

    J.MISSOES_F1 = J.MISSOES = [
      {
        id: 'ligar',
        quadro: 'Ligar PC-01 e PC-02',
        texto: 'Ligue os computadores PC-01 e PC-02.',
        feita: function () { return pc('PC-01').ligado && pc('PC-02').ligado; },
        alvos: function () {
          return ['PC-01', 'PC-02'].filter(function (n) { return !pc(n).ligado; }).map(function (n) { return 'pc:' + n; });
        },
        dica1: 'O PC-01 e o PC-02 ficam na fileira de bancadas perto do quadro. Chegue perto e use (E ou USAR).',
        dica2: 'Ligue os dois: PC-01 (esquerda) e PC-02 (direita). O LED verde do gabinete acende.'
      },
      {
        id: 'crimpar1',
        quadro: 'Crimpar o cabo 1 (T-568B)',
        texto: 'Crimpe um cabo de rede no padrão T-568B na bancada de ferramentas.',
        feita: function () { return J.cabosCrimpados >= 1; },
        alvos: function () { return ['alicate']; },
        dica1: 'A bancada de ferramentas fica perto da porta, à esquerda. Use o alicate.',
        dica2: 'Ordem T-568B: branco-laranja, laranja, branco-verde, azul, branco-azul, verde, branco-marrom, marrom.'
      },
      {
        id: 'conectar1',
        quadro: 'PC → switch (porta Fast)',
        texto: 'Encaixe o cabo na placa de rede de um PC e leve a outra ponta a uma porta Fast do switch.',
        feita: function () { return conectados() >= 1; },
        alvos: alvosConectar,
        dica1: 'Com o cabo na mão, use um PC para encaixar na placa de rede (RJ45). Depois vá ao rack.',
        dica2: 'No switch, escolha uma porta Fast Ethernet (Fa0/1 a Fa0/24). As Gigabit são do roteador.'
      },
      {
        id: 'crimpar2',
        quadro: 'Crimpar o cabo 2',
        texto: 'Crimpe o segundo cabo na bancada de ferramentas.',
        feita: function () { return J.cabosCrimpados >= 2; },
        alvos: function () { return ['alicate']; },
        dica1: 'Volte à bancada de ferramentas para crimpar outro cabo.',
        dica2: 'O cartaz na bancada mostra as cores do T-568B, do pino 1 ao 8.'
      },
      {
        id: 'conectar2',
        quadro: 'Outro PC → switch (Fast)',
        texto: 'Conecte o outro PC ao switch, também numa porta Fast.',
        feita: function () { return conectados() >= 2; },
        alvos: alvosConectar,
        dica1: 'Encaixe o cabo no PC que ainda está sem rede e leve a outra ponta ao switch.',
        dica2: 'Use uma porta Fast livre. As portas laranja (Gigabit) ficam para o roteador.'
      },
      {
        id: 'crimpar3',
        quadro: 'Crimpar o cabo 3',
        texto: 'Crimpe o terceiro cabo: ele vai ligar o switch ao roteador.',
        feita: function () { return J.cabosCrimpados >= 3; },
        alvos: function () { return ['alicate']; },
        dica1: 'Mais um cabo na bancada de ferramentas: ele será o uplink do switch.',
        dica2: 'Mesma sequência T-568B nas duas pontas (cabo direto).'
      },
      {
        id: 'uplink',
        quadro: 'Switch (Gigabit) → roteador (LAN)',
        texto: 'Ligue uma porta Gigabit do switch a uma porta LAN do roteador.',
        feita: function () { return !!J.portaRoteador; },
        alvos: function () { return J.mao && J.mao.tipo === 'ponta' ? ['roteador'] : ['switch']; },
        dica1: 'Comece pelo switch (porta Gigabit, laranja) e leve a outra ponta ao roteador.',
        dica2: 'No roteador use uma porta LAN (amarela). A WAN (azul) é para a internet do provedor.'
      },
      {
        id: 'roteador',
        quadro: 'Ligar o roteador',
        texto: 'Ligue o roteador (botão de energia).',
        feita: function () { return J.roteadorLigado; },
        alvos: function () { return ['roteador']; },
        dica1: 'O roteador fica na prateleira de cima do rack. Use-o e aperte o botão de energia.',
        dica2: 'Procure o botão de energia (vermelho, círculo com um traço) no painel do roteador.'
      },
      {
        id: 'ip1',
        quadro: 'IP fixo no PC-01',
        texto: 'Veja o IP do roteador (rack) e configure IP fixo no PC-01 na mesma rede, com final .2 ou .3.',
        feita: function () { return pc('PC-01').configurado; },
        alvos: function () { return J.viuIpRoteador ? ['pc:PC-01'] : ['roteador']; },
        dica1: 'Primeiro use o roteador para ver o IP dele: ele é o gateway da rede. Depois abra "Configurações de Rede" no PC-01.',
        dica2: 'IP 192.168.0.2 ou .3 · Máscara 255.255.255.0 · Gateway 192.168.0.1 (o roteador).'
      },
      {
        id: 'ip2',
        quadro: 'IP fixo no PC-02',
        texto: 'Configure IP fixo no PC-02: mesma rede do roteador, outro final (.2 ou .3).',
        feita: function () { return pc('PC-02').configurado; },
        alvos: function () { return J.viuIpRoteador ? ['pc:PC-02'] : ['roteador']; },
        dica1: 'Agora o PC-02: mesma máscara e mesmo gateway (o IP do roteador), mas outro endereço IP.',
        dica2: 'Se o PC-01 ficou com .2, use 192.168.0.3 (e vice-versa). O .1 é do roteador.'
      },
      {
        id: 'ping1',
        quadro: 'Ping PC-01 → PC-02',
        texto: 'Teste a rede: no PC-01, abra o Prompt de Comando e faça ping no IP do PC-02.',
        feita: function () { return !!pc('PC-01').pingOk; },
        alvos: function () { return ['pc:PC-01']; },
        dica1: 'Use o PC-01 → Prompt de Comando. Digite ping, um espaço e o IP do PC-02.',
        dica2: 'Exemplo: ping 192.168.0.3 (use o IP que você deu ao PC-02). Para conferir os IPs, digite ipconfig.'
      },
      {
        id: 'ping2',
        quadro: 'Ping PC-02 → PC-01',
        texto: 'Agora o caminho de volta: no PC-02, faça ping no IP do PC-01.',
        feita: function () { return !!pc('PC-02').pingOk; },
        alvos: function () { return ['pc:PC-02']; },
        dica1: 'Use o PC-02 → Prompt de Comando e faça ping no IP do PC-01.',
        dica2: 'Exemplo: ping 192.168.0.2 (o IP que você deu ao PC-01).'
      }
    ];

    J.missaoAtual = function () {
      return J.MISSOES[J.indice] || null;
    };

    J.registrarAtividade = function () {
      J.ativoEm = S.agora();
    };

    J.progresso = function () {
      J.progressoEm = S.agora();
      J.nivelDica = 0;
      S.ui.definirDica(null);
      S.mundo.apontar(null);
    };

    J.atualizarMissoes = function () {
      var lista = J.MISSOES.map(function (m) {
        return { quadro: m.quadro, feita: !!m.feita() };
      });
      var novo = -1;
      for (var i = 0; i < lista.length; i++) {
        if (!lista[i].feita) {
          novo = i;
          break;
        }
      }
      var mudou = novo !== J.indice;
      var anterior = J.indice;
      J.indice = novo;
      S.mundo.desenharQuadro(lista, novo);
      if (novo === -1) {
        var f = S.faseAtual || {};
        S.ui.definirMissao(J.MISSOES.length, J.MISSOES.length, J.saidaLiberada
          ? 'Rede pronta! Siga o professor: saia pela porta (à esquerda).'
          : (f.textoConcluido || 'Todas as missões concluídas!'));
        if (!J.concluido) {
          J.concluido = true;
          if (f.concluir) f.concluir();
        }
        return;
      }
      var m = J.MISSOES[novo];
      S.ui.definirMissao(novo + 1, J.MISSOES.length, typeof m.texto === 'function' ? m.texto() : m.texto);
      if (mudou) {
        J.progresso();
        if (anterior >= 0) {
          S.som('missao');
          S.aviso('✔ Missão concluída! Próxima: ' + m.quadro, 'ok', 3200);
        }
        // Leitura em voz alta: anuncia a nova missão.
        if (S.cfg.lerVoz && S.voz.ler && !(S.emCena && S.emCena())) S.voz.ler('prof', 'Missão ' + (novo + 1) + ': ' + (typeof m.texto === 'function' ? m.texto() : m.texto));
      }
    };

    J.atualizarDicas = function () {
      var m = J.missaoAtual();
      if (!m || S.pausado) return;
      var t = (S.agora() - J.progressoEm) / 1000;
      var nivel = t > S.CFG.dica2 ? 2 : t > S.CFG.dica1 ? 1 : 0;
      if (nivel > J.nivelDica) {
        J.nivelDica = nivel;
        J.dicas++;
        S.ui.definirDica(nivel === 2 ? m.dica2 : m.dica1);
        if (nivel === 1) S.aviso('Precisa de ajuda? Siga a seta laranja.', 'alerta');
      }
      if (J.nivelDica > 0) {
        var alvos = m.alvos();
        var info = alvos.length ? S.mundo.objetos[alvos[0]] : null;
        if (info !== S.mundo.seta.alvo) S.mundo.apontar(info);
      }
    };

    // Distância até o objeto: vale o ponto de referência (ancora) ou, se o
    // objeto informar, a distância real até ele (info.distReal).
    J.distancia = function (info) {
      var p = S.personagem.raiz.position;
      var dx = info.ancora.x - p.x;
      var dz = info.ancora.z - p.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (info.distReal) d = Math.min(d, info.distReal(p));
      return d;
    };
    J.alcance = function (info) {
      return info.alcance || S.CFG.alcance;
    };
    // A fase pode travar objetos (ex.: com o martelo na mão, só os X).
    J.permitido = function (info) {
      var f = S.faseAtual;
      return !info || !f || !f.permite || f.permite(info);
    };

    // Objeto mais adequado ao alcance: prioriza os alvos da missão atual.
    J.melhorProximo = function () {
      var m = J.missaoAtual();
      var alvos = m ? m.alvos() : [];
      var melhor = null;
      var melhorNota = Infinity;
      var objs = S.mundo.objetos;
      for (var id in objs) {
        if (!Object.prototype.hasOwnProperty.call(objs, id)) continue;
        var info = objs[id];
        if (!J.permitido(info)) continue;
        var d = J.distancia(info);
        if (d > J.alcance(info)) continue;
        var nota = d + (alvos.indexOf(id) >= 0 ? 0 : 1.5) + (id === 'quadro' || id === 'cartaz' || id === 'professor' || id === 'cachola' || id === 'logoSenac' ? 0.6 : 0);
        if (nota < melhorNota) {
          melhorNota = nota;
          melhor = info;
        }
      }
      return melhor;
    };

    // Rótulos comuns a todas as fases; o resto vem da fase atual.
    J.rotulo = function (info) {
      switch (info.id) {
        case 'quadro': return 'Ver missões';
        case 'cartaz': return 'Ver cartaz T-568B';
        case 'professor': return S.esperandoTocaAqui() ? 'Bater o toca aqui com o professor ✋' : 'Falar com o professor Herick';
        case 'cachola': return S.rotuloCachola();
        case 'logoSenac': return 'Ver a logo do Senac';
        case 'porta': return 'Sair pela porta (seguir o professor)';
      }
      var f = S.faseAtual;
      return (f && f.rotulo && f.rotulo(info)) || 'Usar ' + info.nome;
    };

    J.rotuloFase1 = function (info) {
      var mao = J.mao;
      switch (info.id) {
        case 'alicate': return 'Crimpar cabo';
        case 'switch':
          if (mao && mao.tipo === 'ponta' && mao.origem === 'pc') return 'Encaixar cabo no switch';
          if (mao && mao.tipo === 'cabo') return 'Encaixar cabo no switch';
          return 'Ver switch';
        case 'roteador':
          if (mao && mao.tipo === 'ponta') return 'Encaixar cabo no roteador';
          if (J.portaRoteador && !J.roteadorLigado) return 'Ligar o roteador';
          if (J.roteadorLigado) return 'Ver IP do roteador';
          return 'Ver roteador';
        default:
          if (info.pc) {
            if (!info.pc.ativo) return 'Ver ' + info.pc.nome;
            var e = info.pc.estado;
            if (!e.ligado) return 'Ligar ' + info.pc.nome;
            if (mao && mao.tipo === 'cabo' && !e.conectado) return 'Encaixar cabo no ' + info.pc.nome;
            if (J.roteadorLigado) return 'Usar ' + info.pc.nome;
            return 'Ver ' + info.pc.nome;
          }
          return 'Usar ' + info.nome;
      }
    };

    var ultimoPrompt = 0;
    J.atualizarPrompt = function () {
      var agora = S.agora();
      if (agora - ultimoPrompt < 120) return;
      ultimoPrompt = agora;
      var info = J.melhorProximo();
      S.ui.definirPrompt(info ? J.rotulo(info) : null);
    };

    J.usarProximo = function () {
      var info = J.melhorProximo();
      if (info) J.usar(info, false);
      else S.aviso('Chegue perto de um objeto para usar.', 'info', 1800);
    };

    J.errou = function (texto) {
      J.erros++;
      S.aviso('✖ ' + texto, 'erro', 3600);
    };

    J.definirMao = function (mao) {
      J.mao = mao;
      S.personagemSegurando(!!mao);
      S.mundo.definirCaboMao(mao && mao.tipo === 'ponta' ? mao.pos : null);
      if (!mao) S.ui.definirMao(null);
      else if (mao.rotulo) S.ui.definirMao(mao.rotulo);
      else if (mao.tipo === 'cabo') S.ui.definirMao('Cabo UTP crimpado');
      else S.ui.definirMao('Cabo: ponta presa no ' + (mao.origem === 'pc' ? mao.pc : 'switch ' + mao.porta));
    };
  });

  /* ================================================================== */
  secao('J02-acoes', function () {
    var J = S.jogo;

    function emMissao(ids) {
      var m = J.missaoAtual();
      return !!m && ids.indexOf(m.id) >= 0;
    }

    J.usar = S.protegido('jogo:usar', function (info, viaClique) {
      if (S.fase !== 'jogo' || S.pausado) return;
      if (!J.permitido(info)) {
        var f = S.faseAtual;
        S.aviso(f && f.avisoBloqueado ? f.avisoBloqueado(info) : 'Agora não dá para usar isso.', 'info', 2600);
        return;
      }
      if (J.distancia(info) > J.alcance(info)) {
        S.aviso('Chegue mais perto: ' + info.nome, 'info', 2000);
        return;
      }
      J.registrarAtividade();
      if (S.segredo) S.segredo(info.id);
      if (info.id === 'logoSenac') return S.aviso('Senac · a gente se vê amanhã! 🧡', 'info', 1500);
      if (info.id === 'professor') {
        if (S.faseAtual && S.faseAtual.usarProfessor && S.faseAtual.usarProfessor()) return;
        return falarProfessor();
      }
      if (info.id === 'cachola') return S.usarCachola();
      if (info.id === 'porta') return sairPelaPorta();
      if (info.id === 'quadro') return S.minigames.quadro();
      if (info.id === 'cartaz') return S.minigames.cartaz();
      var f = S.faseAtual;
      if (f && f.usar) return f.usar(info);
    });

    J.usarFase1 = function (info) {
      if (info.id === 'alicate') return usarAlicate();
      if (info.id === 'switch') return usarSwitch();
      if (info.id === 'roteador') return usarRoteador();
      if (info.pc) return usarPc(info.pc);
    };

    // Quantas missões já foram feitas (para o professor comentar o progresso).
    J.missoesFeitas = function () {
      return J.MISSOES.filter(function (m) { return m.feita(); }).length;
    };

    function falarProfessor() {
      if (S.baterTocaAqui()) return;
      var reacao = S.falaReacaoProfessor();
      if (reacao) {
        S.professorFalar(reacao, 3400);
        return;
      }
      var nome = S.primeiroNome();
      S.professorFalar(J.missoesFeitas() === 0
        ? 'Boa sorte com a atividade, ' + nome + '!'
        : 'Você está indo bem, ' + nome + '!', 3200);
    }

    // Primeiro cabo pronto: o professor comemora e levanta a mão.
    function cenaTocaAqui() {
      if (S.fase !== 'jogo' || S.ui.modalAberto() || !S.professor) return;
      S.cenaCurta({
        manterGesto: true,
        tomadas: { prof: { pos: [2.3, 2.35, 4.45], alvo: [5.1, 1.45, 3.2] } },
        falas: [
          { quem: 'prof', tomada: 'prof', gesto: 'tocaAqui', texto: 'Boa, você conseguiu! Toca aqui!' }
        ],
        aoFim: function () {
          S.esperarTocaAqui();
          S.aviso('Cabo pronto! O professor está esperando o toca aqui ✋ (depois, encaixe o cabo num PC).', 'info', 4200);
        }
      });
    }

    function usarAlicate() {
      if (J.mao) {
        S.aviso('Você já está com um cabo. Use-o antes de crimpar outro.', 'alerta');
        return;
      }
      if (J.cabosCrimpados >= 3) {
        S.aviso('Os três cabos já foram crimpados.', 'info');
        return;
      }
      if (!emMissao(['crimpar1', 'crimpar2', 'crimpar3'])) {
        var m = J.missaoAtual();
        S.aviso('Ainda não é hora de crimpar. Missão atual: ' + (m ? m.quadro : ''), 'alerta', 3200);
        return;
      }
      S.minigames.crimpar(function () {
        J.cabosCrimpados++;
        J.definirMao({ tipo: 'cabo' });
        J.atualizarMissoes();
        if (J.cabosCrimpados === 1) setTimeout(S.protegido('tocaAqui', cenaTocaAqui), 250);
        var proximo = J.cabosCrimpados === 3
          ? 'Leve-o ao switch: porta Gigabit.'
          : 'Agora encaixe-o na placa de rede de um PC.';
        S.aviso('Cabo pronto (T-568B nas duas pontas)! ' + proximo, 'ok', 3800);
      });
    }

    function usarPc(pc) {
      var e = pc.estado;
      var mao = J.mao;
      if (!pc.ativo) {
        S.aviso('Esse PC está sendo reparado pela turma de Manutenção de Computadores do SENAC.', 'info', 4200);
        return;
      }
      if (!e.ligado) {
        S.minigames.gabinete(pc, function () {
          S.ligarPc(pc, true);
          S.mundo.desenharSwitch();
          S.aviso(pc.nome + ' ligado.', 'ok', 2000);
          J.atualizarMissoes();
        });
        return;
      }
      if (mao && mao.tipo === 'cabo') {
        if (emMissao(['uplink'])) {
          S.aviso('Este cabo liga o switch ao roteador. Comece pelo switch (porta Gigabit).', 'alerta', 3600);
          return;
        }
        if (e.conectado) {
          S.aviso(pc.nome + ' já tem cabo. Use o outro PC.', 'alerta');
          return;
        }
        S.minigames.portasPc(pc, function () {
          var pos = S.posMundo(pc.porta);
          J.definirMao({ tipo: 'ponta', origem: 'pc', pc: pc.nome, pos: pos });
          J.progresso();
          S.aviso('Cabo preso no ' + pc.nome + '. Leve a outra ponta ao switch (rack, ao fundo).', 'ok', 3800);
        });
        return;
      }
      if (mao && mao.tipo === 'ponta') {
        if (mao.origem === 'pc' && mao.pc === pc.nome) {
          S.aviso('Esta ponta já está neste PC. Leve a outra ao switch.', 'alerta');
        } else if (mao.origem === 'pc') {
          J.errou('Não ligue um PC direto no outro: os dois cabos vão para o switch.');
        } else {
          J.errou('Este cabo sai do switch e vai no roteador (porta LAN), não no PC.');
        }
        return;
      }
      if (J.roteadorLigado) {
        S.minigames.desktopFase1(pc);
        return;
      }
      var m = J.missaoAtual();
      if (m && (m.id === 'conectar1' || m.id === 'conectar2') && !e.conectado) {
        S.aviso('Primeiro crimpe um cabo na bancada de ferramentas.', 'alerta');
      } else {
        S.aviso(pc.nome + ': ligado · ' + (e.conectado ? 'cabo na porta ' + e.portaSwitch : 'sem cabo') + '. A configuração de IP vem depois do roteador.', 'info', 3400);
      }
    }

    function usarSwitch() {
      var mao = J.mao;
      if (mao && mao.tipo === 'ponta' && mao.origem === 'pc') {
        S.minigames.portasSwitch('pc', function (porta) {
          var pc = S.pcs[mao.pc];
          J.portasSwitch[porta] = pc.nome;
          pc.estado.conectado = true;
          pc.estado.portaSwitch = porta;
          S.mundo.caboInstalado(S.posMundo(pc.porta), S.mundo.posPortaSwitch(porta), false);
          J.definirMao(null);
          S.mundo.desenharSwitch();
          S.mundo.desenharTela(pc);
          S.aviso(pc.nome + ' conectado na porta ' + porta + '. Link de 100 Mb/s!', 'ok', 3200);
          J.atualizarMissoes();
        });
        return;
      }
      if (mao && mao.tipo === 'cabo') {
        if (!emMissao(['uplink'])) {
          S.aviso('Comece pelo computador: encaixe o cabo na placa de rede de um PC.', 'alerta', 3400);
          return;
        }
        S.minigames.portasSwitch('uplink', function (porta) {
          J.portasSwitch[porta] = 'roteador';
          J.portaUplink = porta;
          J.definirMao({ tipo: 'ponta', origem: 'switch', porta: porta, pos: S.mundo.posPortaSwitch(porta) });
          S.mundo.desenharSwitch();
          J.progresso();
          S.aviso('Cabo preso na ' + porta + '. Agora a outra ponta numa porta LAN do roteador.', 'ok', 3600);
        });
        return;
      }
      if (mao && mao.tipo === 'ponta' && mao.origem === 'switch') {
        S.aviso('Esta ponta já está no switch. Leve a outra ao roteador (prateleira de cima).', 'alerta');
        return;
      }
      S.minigames.portasSwitch('ver', null);
    }

    function usarRoteador() {
      var mao = J.mao;
      if (mao && mao.tipo === 'ponta' && mao.origem === 'switch') {
        S.minigames.roteador('cabo', function (porta) {
          J.portaRoteador = porta;
          S.mundo.caboInstalado(S.mundo.posPortaSwitch(J.portaUplink), S.mundo.posPortaRoteador(porta), true);
          J.definirMao(null);
          S.mundo.desenharRoteador();
          S.aviso('Switch ligado ao roteador (' + J.portaUplink + ' → ' + porta + ').', 'ok', 3200);
          J.atualizarMissoes();
        });
        return;
      }
      if (mao && mao.tipo === 'ponta' && mao.origem === 'pc') {
        J.errou('Nesta rede os PCs vão no switch, não direto no roteador.');
        return;
      }
      if (mao && mao.tipo === 'cabo') {
        S.aviso(emMissao(['uplink'])
          ? 'Comece pelo switch: encaixe o cabo numa porta Gigabit.'
          : 'Este cabo é para um PC. Comece pela placa de rede do computador.', 'alerta', 3400);
        return;
      }
      if (!J.roteadorLigado && J.portaRoteador) {
        S.minigames.roteador('energia', function () {
          J.roteadorLigado = true;
          S.mundo.desenharRoteador();
          S.mundo.desenharSwitch();
          S.aviso('Roteador ligado! Ele recebeu um IP automaticamente. Use o roteador para ver qual é.', 'ok', 4200);
          J.atualizarMissoes();
        });
        return;
      }
      if (J.roteadorLigado && !J.viuIpRoteador) {
        J.viuIpRoteador = true;
        J.progresso();
      }
      S.minigames.roteador('ver', null);
    }

    // Fim de fase: para o cronômetro e, quando nenhuma janela estiver
    // aberta, roda a cena final da fase. "depois" decide o que vem em seguida.
    J.encerrarFase = function (aviso, depois) {
      S.tempoFinal = S.agora();
      S.ui.definirDica(null);
      S.mundo.apontar(null);
      if (aviso) S.aviso(aviso, 'ok', 3200);
      var esperar = S.protegido('fim', function () {
        if (S.ui.modalAberto() || S.fase !== 'jogo' || (S.f4 && S.f4.emAR)) {
          setTimeout(esperar, 200);
          return;
        }
        S.limparHover();
        S.cenaFinal(S.protegido('fim:depois', depois));
      });
      setTimeout(esperar, 1500);
    };

    J.concluirFase1 = function () {
      J.encerrarFase('Ping nos dois sentidos: a rede funciona!', function () {
        S.fase = 'jogo';
        S.pausado = false;
        S.ui.mostrarHud(true);
        S.ui.atualizarControlesToque();
        J.liberarSaida();
      });
    };

    // Depois que o professor sai, a porta vira o caminho para a próxima fase.
    J.liberarSaida = function () {
      J.saidaLiberada = true;
      S.mundo.liberarPorta();
      J.atualizarMissoes();
      S.mundo.apontar(S.mundo.objetos.porta);
      var prox = (S.faseAtual && S.faseAtual.numero || 1) + 1;
      S.aviso('Siga o professor: clique na porta para ir ao Laboratório ' + prox + '.', 'info', 4200);
    };

    // O aluno atravessa a porta; por enquanto isso encerra o jogo
    // (a fase 2 ainda não existe).
    function sairPelaPorta() {
      if (J.saindo) return;
      J.saindo = true;
      S.fase = 'cena';
      S.teclas = {};
      S.ui.mostrarHud(false);
      S.ui.atualizarControlesToque();
      S.mundo.apontar(null);
      S.limparHover();
      var p = S.personagem;
      var t = 0;
      var naPorta = false;
      var tFora = 0;
      var cortina = S.ui.camada(40, {
        background: '#000',
        opacity: '0',
        transition: 'opacity .6s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: '18px',
        pointerEvents: 'none'
      });
      cortina.textContent = 'Indo para o Laboratório ' + ((S.faseAtual && S.faseAtual.numero || 1) + 1) + '…';
      S.atualizarCena = function (dt) {
        t += dt;
        var pos = p.raiz.position;
        if (!naPorta) {
          var dx = -5.3 - pos.x;
          var dz = 3.0 - pos.z;
          var d = Math.sqrt(dx * dx + dz * dz);
          if (d < 0.15 || t > 4) {
            naPorta = true;
          } else {
            S.joy.x = dx / d;
            S.joy.z = dz / d;
          }
        }
        if (naPorta) {
          // Atravessa a porta (fora dos limites da sala).
          S.joy.x = -1;
          S.joy.z = 0;
          pos.z += (3.0 - pos.z) * Math.min(1, dt * 6);
          pos.x -= 2.6 * dt;
          tFora += dt;
          if (tFora > 0.25) cortina.style.opacity = '1';
        }
        S.atualizarMovimento(dt);
        S.atualizarCamera(dt);
        if (tFora > 1.1) {
          S.atualizarCena = null;
          S.joy.x = 0;
          S.joy.z = 0;
          S.ui.mostrarFim(S.faseAtual && S.faseAtual.numero || 1);
          setTimeout(function () { cortina.remove(); }, 50);
        }
      };
    }
  });


  /* ================================================================== */
  secao('M01-minigames-base', function () {
    var C = S.CSS;
    var MG = S.minigames = {};

    MG.fio = function (f, largura, altura) {
      var fundo = f.listrado
        ? 'repeating-linear-gradient(0deg, #F4F4F4 0px, #F4F4F4 6px, ' + f.cor + ' 6px, ' + f.cor + ' 11px)'
        : f.cor;
      return {
        width: largura + 'px',
        height: altura + 'px',
        background: fundo,
        border: '2px solid #071430',
        borderRadius: '6px 6px 2px 2px',
        boxSizing: 'border-box'
      };
    };

    // Daltonismo: sigla no fio (BL = branco-laranja, L = laranja…).
    var SIGLAS = { bl: 'BL', l: 'L', bv: 'BV', a: 'A', ba: 'BA', v: 'V', bm: 'BM', m: 'M' };
    MG.sigla = function (f) { return SIGLAS[f.id] || ''; };
    MG.marcarFio = function (el, f, pequena) {
      if (!S.cfg.daltonismo || !el) return el;
      S.estilo(el, { display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' });
      var t = S.el('span', {
        color: '#FFFFFF',
        fontSize: pequena ? '8px' : '10px',
        fontWeight: '700',
        fontFamily: C.fonte,
        lineHeight: '1',
        padding: '1px 2px',
        borderRadius: '3px',
        background: 'rgba(7,20,48,0.85)',
        pointerEvents: 'none'
      }, MG.sigla(f), el);
      t.setAttribute('data-fs', 'fixo');
      t.setAttribute('aria-hidden', 'true');
      return el;
    };
    MG.desenharFio = function (f, largura, altura, pai, pequena) {
      return MG.marcarFio(S.el('div', MG.fio(f, largura, altura), null, pai), f, pequena);
    };

    // Entrada fêmea RJ45/RJ11 vista de frente: abertura com o rebaixo da
    // trava embaixo e os contatos dourados em cima. A RJ11 é igual, só que
    // menor e com 4 contatos (a RJ45 tem 8).
    MG.portaRJ = function (pai, tipo, escala) {
      var rj11 = tipo === 'rj11';
      var k = escala || 1;
      var w = Math.round((rj11 ? 19 : 28) * k);
      var h = Math.round((rj11 ? 15 : 21) * k);
      var moldura = S.el('div', {
        position: 'relative', width: (w + 8) + 'px', height: (h + 8) + 'px', background: '#C9D2DC', borderRadius: '3px',
        margin: '0 auto', padding: '4px', boxSizing: 'border-box', flex: '0 0 auto', pointerEvents: 'none'
      }, null, pai);
      var furo = S.el('div', {
        position: 'relative', width: w + 'px', height: h + 'px', background: '#0A0C0F',
        clipPath: 'polygon(0 0, 100% 0, 100% 70%, 69% 70%, 69% 100%, 31% 100%, 31% 70%, 0 70%)'
      }, null, moldura);
      var n = rj11 ? 4 : 8;
      var pentes = S.el('div', {
        position: 'absolute', top: '2px', left: rj11 ? '24%' : '12%', right: rj11 ? '24%' : '12%', height: '38%',
        display: 'flex', justifyContent: 'space-between'
      }, null, furo);
      for (var i = 0; i < n; i++) S.el('div', { width: Math.max(1, Math.round(1.5 * k)) + 'px', height: '100%', background: '#E2B53C' }, null, pentes);
      return moldura;
    };

    MG.mensagem = function (pai) {
      var el = S.el('div', {
        minHeight: '20px',
        marginTop: '10px',
        fontWeight: '700',
        fontSize: '14px'
      }, '', pai);
      el.setAttribute('aria-live', 'polite');
      return function (texto, tipo) {
        el.textContent = S.marcarSimbolo ? S.marcarSimbolo(texto || '', tipo) : (texto || '');
        el.style.color = tipo === 'erro' ? C.vermelho : tipo === 'ok' ? C.verde : C.amarelo;
        if (texto) S.somGenerico(tipo);
      };
    };

    MG.referencia = function (pai, compacta) {
      var box = S.el('div', {
        background: '#071733',
        border: '2px solid ' + C.borda,
        borderRadius: '8px',
        padding: '10px 12px',
        marginTop: '10px'
      }, null, pai);
      S.el('div', { fontWeight: '700', color: C.laranja, marginBottom: '8px' }, 'Padrão T-568B (pino 1 → 8)', box);
      var linha = S.el('div', { display: 'flex', gap: compacta ? '6px' : '10px', flexWrap: 'wrap' }, null, box);
      S.T568B.forEach(function (f, i) {
        var col = S.el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: compacta ? '54px' : '64px' }, null, linha);
        S.el('div', { fontSize: '12px', fontWeight: '700', marginBottom: '3px' }, String(i + 1), col);
        MG.desenharFio(f, 20, compacta ? 44 : 60, col);
        S.el('div', { fontSize: '10px', textAlign: 'center', marginTop: '3px', color: C.cinza, lineHeight: '1.15' }, f.nome, col);
      });
      return box;
    };

    MG.cartaz = function () {
      var m = S.ui.abrirModal('Cartaz · padrão T-568B', { largura: '640px' });
      MG.referencia(m.corpo, false);
      S.el('div', { marginTop: '10px', color: C.cinza, fontSize: '13px' },
        'Segure o conector RJ45 com a trava para baixo e os contatos virados para você: o pino 1 fica à esquerda. ' +
        'Usando T-568B nas duas pontas você faz um cabo direto, o tipo usado entre PC e switch.', m.corpo);
    };

    MG.quadro = function () {
      var m = S.ui.abrirModal('Missões do laboratório', { largura: '520px' });
      S.jogo.MISSOES.forEach(function (mi, i) {
        var feita = mi.feita();
        var atual = i === S.jogo.indice;
        S.el('div', {
          padding: '7px 10px',
          margin: '4px 0',
          borderRadius: '6px',
          background: atual ? '#3A2A08' : '#071733',
          border: '2px solid ' + (atual ? C.laranja : 'transparent'),
          color: feita ? C.verde : C.branco,
          textDecoration: feita ? 'line-through' : 'none',
          fontWeight: atual ? '700' : '400'
        }, (feita ? '✔ ' : atual ? '▶ ' : '□ ') + (i + 1) + '. ' + (typeof mi.texto === 'function' ? mi.texto() : mi.texto), m.corpo);
      });
    };
  });

  /* ================================================================== */
  secao('M02-crimpagem', function () {
    var C = S.CSS;
    var MG = S.minigames;

    MG.crimpar = function (aoConcluir) {
      var m = S.ui.abrirModal('Crimpagem · cabo ' + (S.jogo.cabosCrimpados + 1) + ' de 3', { largura: '780px' });
      var corpo = m.corpo;

      var ap = S.ui.compacto();
      var J = S.jogo;
      // Pares do cabo UTP (cada par trançado: branco-x com x).
      var PARES = [['bl', 'l'], ['bv', 'v'], ['ba', 'a'], ['bm', 'm']];
      function fio(id) { return S.T568B.filter(function (f) { return f.id === id; })[0]; }
      function fundoFio(f, vertical) {
        return f.listrado
          ? 'repeating-linear-gradient(' + (vertical ? '0deg' : '90deg') + ', #F4F4F4 0px, #F4F4F4 5px, ' + f.cor + ' 5px, ' + f.cor + ' 9px)'
          : f.cor;
      }

      // ---- Etapa 1: cortar da bobina e decapar exatamente 2 cm -----------
      // A régua fica em cima do cabo, com o zero na ponta. O aluno toca onde
      // quer cortar a capa (de meio em meio centímetro) e aperta "Decapar".
      var PONTA = 94; // % da largura onde fica a ponta do cabo
      var POR_CM = 12; // % da largura por centímetro (a régua mede 5 cm)
      var CERTO = 2;
      function xCm(cm) { return PONTA - cm * POR_CM; }
      function fmtCm(cm) { return String(cm).replace('.', ',') + ' cm'; }

      var etapa1 = S.el('div', null, null, corpo);
      var instr = S.el('div', { fontSize: '15px', marginBottom: '4px' }, '1) Corte o cabo UTP da bobina.', etapa1);
      var sub = S.el('div', { fontSize: '12px', color: C.cinza, marginBottom: '8px' }, 'A bobina fica à direita. Use o alicate para cortar um pedaço do cabo.', etapa1);
      var altA = ap ? 104 : 124;
      var area = S.el('div', {
        position: 'relative', height: altA + 'px', margin: '4px 0 2px', touchAction: 'none', userSelect: 'none',
        background: '#0F1C30', border: '3px solid #071430', borderRadius: '8px', overflow: 'hidden'
      }, null, etapa1);
      var yCabo = ap ? 58 : 70;
      var altCabo = ap ? 24 : 28;
      // Fios expostos (escondidos sob a capa até decapar).
      var expostos = S.el('div', { position: 'absolute', left: xCm(CERTO) + '%', width: (PONTA - xCm(CERTO)) + '%', top: yCabo + 'px', height: altCabo + 'px', visibility: 'hidden' }, null, area);
      // Capa azul do cabo (vai até a borda: ainda está preso à bobina).
      var capa = S.el('div', {
        position: 'absolute', left: '0', width: '100%', top: yCabo + 'px', height: altCabo + 'px',
        background: 'linear-gradient(#5BA2F0, #2D7FE0 45%, #1D5FB0)', borderTop: '3px solid #071430', borderBottom: '3px solid #071430',
        boxSizing: 'border-box', transition: 'width .35s ease'
      }, null, area);
      var bobina = S.el('div', {
        position: 'absolute', right: '-26px', top: (yCabo - 30) + 'px', width: '60px', height: (altCabo + 60) + 'px',
        background: 'repeating-linear-gradient(0deg, #2D7FE0 0px, #2D7FE0 5px, #1D5FB0 5px, #1D5FB0 8px)', border: '3px solid #071430',
        borderRadius: '10px', transition: 'transform .5s ease, opacity .5s ease'
      }, null, area);
      // Régua (0 na ponta, 5 cm para a esquerda).
      var regua = S.el('div', {
        position: 'absolute', left: xCm(5) + '%', width: (5 * POR_CM) + '%', top: '6px', height: (ap ? 34 : 40) + 'px',
        background: '#F2D88A', border: '2px solid #071430', borderRadius: '4px', boxSizing: 'border-box', display: 'none', cursor: 'pointer'
      }, null, area);
      for (var t = 0; t <= 10; t++) {
        var cm = t / 2;
        var inteiro = t % 2 === 0;
        S.el('div', {
          position: 'absolute', left: ((5 - cm) / 5 * 100) + '%', top: '0', width: '2px', marginLeft: '-1px',
          height: inteiro ? '45%' : '26%', background: '#3A2A08'
        }, null, regua);
        if (inteiro) {
          S.el('div', {
            position: 'absolute', left: ((5 - cm) / 5 * 100) + '%', bottom: '1px',
            transform: cm === 5 ? 'translateX(3px)' : cm === 0 ? 'translateX(calc(-100% - 3px))' : 'translateX(-50%)',
            fontSize: '11px', fontWeight: '700', color: '#3A2A08'
          }, String(cm), regua);
        }
      }
      S.el('div', { position: 'absolute', left: '-30px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '700', color: '#F2D88A' }, 'cm', regua);
      // Marca de onde cortar.
      var marca = S.el('div', {
        position: 'absolute', top: '4px', bottom: '4px', width: '0', borderLeft: '3px dashed ' + C.laranja, display: 'none', pointerEvents: 'none'
      }, null, area);
      var etiq = S.el('div', {
        position: 'absolute', top: (yCabo + altCabo + 6) + 'px', transform: 'translateX(-50%)', background: C.laranja, color: '#10203A',
        fontSize: '12px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'none', pointerEvents: 'none'
      }, '', area);
      var msg1 = MG.mensagem(etapa1);
      var acoes1 = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }, null, etapa1);
      var marcado = null;
      var fase1 = 'cortar';

      var bCortar = S.ui.botao('✂ Cortar da bobina', 'primario', function () {
        if (fase1 !== 'cortar') return;
        fase1 = 'medir';
        S.som('corte');
        capa.style.width = PONTA + '%';
        capa.style.borderRight = '3px solid #071430';
        bobina.style.transform = 'translateX(70px)';
        bobina.style.opacity = '0';
        bCortar.remove();
        regua.style.display = 'block';
        instr.textContent = '1) Decape a capa externa: exatamente 2 cm, nem mais nem menos.';
        sub.textContent = 'Toque na régua (ou no cabo) para marcar onde cortar a capa. Depois aperte "Decapar".';
        bDecapar.style.display = '';
        area.style.cursor = 'crosshair';
      }, acoes1);
      var bDecapar = S.ui.botao('✂ Decapar aqui', 'primario', decapar, acoes1);
      bDecapar.style.display = 'none';
      bDecapar.disabled = true;
      bDecapar.style.opacity = '0.5';

      function marcar(cm) {
        if (fase1 !== 'medir') return;
        cm = Math.max(0.5, Math.min(5, Math.round(cm * 2) / 2));
        marcado = cm;
        marca.style.left = xCm(cm) + '%';
        marca.style.display = 'block';
        etiq.style.left = xCm(cm) + '%';
        etiq.textContent = fmtCm(cm);
        etiq.style.display = 'block';
        bDecapar.disabled = false;
        bDecapar.style.opacity = '1';
        bDecapar.textContent = '✂ Decapar ' + fmtCm(cm);
        msg1('', 'info');
        S.som('fio');
      }
      area.addEventListener('pointerdown', S.protegido('crimp:medir', function (e) {
        if (fase1 !== 'medir') return;
        var r = area.getBoundingClientRect();
        var pct = (e.clientX - r.left) / r.width * 100;
        marcar((PONTA - pct) / POR_CM);
      }));

      function decapar() {
        if (fase1 !== 'medir' || marcado === null) return;
        if (marcado !== CERTO) {
          J.erros++;
          msg1(marcado < CERTO
            ? '✖ Com ' + fmtCm(marcado) + ' os fios ficam curtos: não chegam até os contatos do conector. Decape 2 cm.'
            : '✖ Com ' + fmtCm(marcado) + ' sobra fio sem capa fora do conector: o cabo fica frouxo e pega interferência. Decape 2 cm.', 'erro');
          return;
        }
        fase1 = 'animando';
        S.som('decapar');
        bDecapar.remove();
        marca.style.display = 'none';
        etiq.style.display = 'none';
        regua.style.opacity = '0.35';
        // A capa encolhe até a marca; o pedaço cortado sai deslizando.
        var solta = S.el('div', {
          position: 'absolute', left: xCm(CERTO) + '%', width: (PONTA - xCm(CERTO)) + '%', top: yCabo + 'px', height: altCabo + 'px',
          background: 'linear-gradient(#5BA2F0, #2D7FE0 45%, #1D5FB0)', border: '3px solid #071430', boxSizing: 'border-box',
          borderRadius: '2px', transition: 'transform .7s ease-in, opacity .7s ease-in', zIndex: '2'
        }, null, area);
        capa.style.transition = 'none';
        capa.style.width = xCm(CERTO) + '%';
        // Os 4 pares trançados aparecem por baixo.
        expostos.style.visibility = 'visible';
        var alturaPar = altCabo / 4;
        var fios = [];
        PARES.forEach(function (par, k) {
          par.forEach(function (id, j) {
            var f = fio(id);
            var el = S.el('div', {
              position: 'absolute', left: '0', width: '100%', top: (k * alturaPar + j * alturaPar / 2) + 'px', height: (alturaPar / 2 + 0.5) + 'px',
              background: j === 0 ? 'repeating-linear-gradient(115deg, #F4F4F4 0px, #F4F4F4 5px, ' + f.cor + ' 5px, ' + f.cor + ' 10px)'
                : 'repeating-linear-gradient(115deg, ' + f.cor + ' 0px, ' + f.cor + ' 5px, #F4F4F4 5px, #F4F4F4 10px)',
              borderRadius: '0 3px 3px 0', transition: 'top .7s ease, height .7s ease, width .7s ease, background .3s ease', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.35)'
            }, null, expostos);
            fios.push({ el: el, f: f });
          });
        });
        requestAnimationFrame(function () {
          solta.style.transform = 'translate(120px, -6px) rotate(8deg)';
          solta.style.opacity = '0';
        });
        msg1('Capa cortada e puxada: 2 cm de fios à mostra. Agora destrance os pares…', 'ok');
        // Transição: os pares se destrançam e os 8 fios se abrem em leque.
        setTimeout(function () {
          if (!m.fundo.isConnected) return;
          solta.remove();
          S.som('fio');
          var passo = ap ? 7 : 8;
          var topo0 = altCabo / 2 - passo * 3.5;
          fios.forEach(function (x, i) {
            x.el.style.background = fundoFio(x.f, false);
            x.el.style.top = (topo0 + i * passo) + 'px';
            x.el.style.height = (passo - 2) + 'px';
            x.el.style.width = '112%';
            x.el.style.border = '1px solid #071430';
            x.el.style.boxSizing = 'border-box';
          });
          msg1('✔ Pares destrançados: os 8 fios estão separados.', 'ok');
          var bSeguir = S.ui.botao('Organizar os fios ▶', 'primario', function () {
            etapa1.remove();
            montarEtapa2();
          }, acoes1);
          bSeguir.focus({ preventScroll: true });
        }, 900);
      }
      MG.crimpAtual = { marcar: marcar };

      function montarEtapa2() {
        var cp = S.ui.compacto();
        var altSlot = cp ? 50 : 78;
        var altFio = cp ? 40 : 60;
        var tentativas = 0;
        var slots = new Array(8).fill(null);
        var bandejaFios = S.embaralhar(S.T568B);
        var refMostrada = false;

        S.el('div', { fontSize: '15px', marginBottom: '4px' }, '2) Coloque os 8 fios no conector RJ45 na ordem T-568B.', corpo);
        S.el('div', { fontSize: '12px', color: C.cinza, marginBottom: cp ? '4px' : '10px' }, 'Toque num fio para encaixar na próxima posição. Toque num fio já encaixado para tirar.', corpo);

        // Conector com os 8 pinos.
        var conector = S.el('div', {
          display: 'flex',
          gap: '6px',
          justifyContent: 'center',
          background: 'linear-gradient(#DDEBF5, #B7CADB)',
          border: '3px solid #071430',
          borderRadius: '10px 10px 4px 4px',
          padding: '10px 10px 6px',
          margin: '0 auto',
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }, null, corpo);
        var slotEls = [];
        for (var i = 0; i < 8; i++) {
          (function (idx) {
            var col = S.el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' }, null, conector);
            S.el('div', { fontSize: '11px', fontWeight: '700', color: '#10203A' }, String(idx + 1), col);
            var s = S.el('button', {
              width: '34px',
              height: altSlot + 'px',
              border: '2px dashed #5A6B80',
              borderRadius: '5px',
              background: 'rgba(255,255,255,0.5)',
              padding: '2px',
              cursor: 'pointer',
              boxSizing: 'border-box',
              touchAction: 'manipulation'
            }, null, col);
            s.type = 'button';
            s.setAttribute('aria-label', 'Pino ' + (idx + 1));
            s.addEventListener('click', S.protegido('crimp:slot', function () {
              if (!slots[idx]) return;
              S.som('fio');
              bandejaFios.push(slots[idx]);
              slots[idx] = null;
              desenhar();
            }));
            slotEls.push(s);
          })(i);
        }
        S.el('div', { textAlign: 'center', fontSize: '11px', color: C.cinza, marginTop: cp ? '2px' : '4px' }, 'Trava para baixo · pino 1 à esquerda', corpo);

        S.el('div', { fontSize: '13px', fontWeight: '700', margin: cp ? '4px 0 2px' : '12px 0 6px', color: C.laranja }, 'Fios soltos', corpo);
        var bandeja = S.el('div', { display: 'flex', gap: cp ? '4px' : '8px', flexWrap: 'wrap', minHeight: (altFio + 36) + 'px' }, null, corpo);

        var msg = MG.mensagem(corpo);
        var refBox = null;
        var acoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }, null, corpo);
        var bRef = S.ui.botao('Ver cartaz T-568B', 'secundario', function () { mostrarRef(true); }, acoes);
        S.ui.botao('Limpar', 'secundario', function () {
          slots.forEach(function (f, i2) {
            if (f) bandejaFios.push(f);
            slots[i2] = null;
          });
          desenhar();
        }, acoes);
        var bCrimpar = S.ui.botao('Conferir a ordem ✔', 'primario', crimpar, acoes);

        function mostrarRef(contarDica) {
          if (refMostrada) return;
          refMostrada = true;
          if (contarDica) S.jogo.dicas++;
          refBox = MG.referencia(corpo, true);
          bRef.style.display = 'none';
        }

        function desenhar() {
          slotEls.forEach(function (s, i2) {
            var f = slots[i2];
            s.textContent = '';
            s.style.borderStyle = f ? 'solid' : 'dashed';
            s.style.borderColor = '#5A6B80';
            if (f) MG.desenharFio(f, 26, altSlot - 8, s);
          });
          bandeja.textContent = '';
          bandejaFios.forEach(function (f) {
            var b = S.el('button', {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'transparent',
              border: '0',
              padding: '2px',
              cursor: 'pointer',
              color: C.branco,
              width: '64px',
              touchAction: 'manipulation'
            }, null, bandeja);
            b.type = 'button';
            MG.desenharFio(f, 22, altFio, b);
            S.el('div', { fontSize: '10px', lineHeight: '1.1', textAlign: 'center' }, f.nome, b);
            b.addEventListener('click', S.protegido('crimp:fio', function () {
              var livre = slots.indexOf(null);
              if (livre < 0) return;
              S.som('fio');
              slots[livre] = f;
              bandejaFios.splice(bandejaFios.indexOf(f), 1);
              desenhar();
            }));
          });
          var completo = slots.indexOf(null) < 0;
          bCrimpar.disabled = !completo;
          bCrimpar.style.opacity = completo ? '1' : '0.5';
          if (!bandejaFios.length) S.el('div', { color: C.cinza, fontSize: '13px', alignSelf: 'center' }, 'Todos os fios estão no conector.', bandeja);
        }

        function crimpar() {
          if (slots.indexOf(null) >= 0) return;
          var erradas = 0;
          slots.forEach(function (f, i2) {
            var ok = f.id === S.T568B[i2].id;
            slotEls[i2].style.borderColor = ok ? '#1E8E3E' : '#D63A33';
            // Daltonismo: símbolo além da cor da borda.
            if (S.cfg.daltonismo) {
              var sim = S.el('div', {
                position: 'absolute', left: '50%', top: '-4px', transform: 'translate(-50%, -100%)',
                fontSize: '13px', fontWeight: '700', color: ok ? '#1E8E3E' : '#D63A33', background: '#FFFFFF',
                border: '2px solid #071430', borderRadius: '50%', width: '18px', height: '18px', lineHeight: '15px', textAlign: 'center'
              }, ok ? '✔' : '✖', slotEls[i2]);
              sim.setAttribute('aria-hidden', 'true');
              slotEls[i2].style.position = 'relative';
              slotEls[i2].style.overflow = 'visible';
            }
            if (!ok) erradas++;
          });
          tentativas++;
          if (erradas) {
            S.jogo.erros++;
            msg(erradas + ' fio(s) fora de ordem (marcados em vermelho). Tire e coloque de novo.', 'erro');
            if (tentativas >= 2) mostrarRef(false);
            return;
          }
          msg('✔ Ordem T-568B certa nas duas pontas!', 'ok');
          acoes.textContent = '';
          if (refBox) refBox.remove();
          var bSeguir = S.ui.botao('Colocar os conectores RJ45 ▶', 'primario', function () {
            corpo.textContent = '';
            montarEtapa3();
          }, acoes);
          bSeguir.focus({ preventScroll: true });
        }

        desenhar();
      }

      // ---- Etapa 3: conector RJ45 nas duas pontas e crimpar -------------
      function montarEtapa3() {
        var cp = S.ui.compacto();
        S.el('div', { fontSize: '15px', marginBottom: '4px' }, '3) Coloque um conector RJ45 em cada ponta do cabo e crimpe.', corpo);
        S.el('div', { fontSize: '12px', color: C.cinza, marginBottom: '8px' }, 'Toque no conector RJ45 na bandeja e depois em cada ponta do cabo (A e B).', corpo);
        var linha = S.el('div', {
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', background: '#0F1C30',
          border: '3px solid #071430', borderRadius: '8px', padding: cp ? '10px 6px' : '16px 10px'
        }, null, corpo);
        var conectores = 2;
        var naMao = false;
        var pontas = {};
        function ponta(id, esquerda) {
          var b = S.el('button', {
            position: 'relative', width: cp ? '76px' : '92px', height: cp ? '62px' : '74px', background: 'transparent',
            border: '2px dashed #4A5D7A', borderRadius: '8px', cursor: 'pointer', padding: '0', flex: '0 0 auto', touchAction: 'manipulation'
          }, null, linha);
          b.type = 'button';
          b.setAttribute('aria-label', 'Ponta ' + id);
          b.setAttribute('data-som', 'nao');
          // Fios em leque saindo do cabo (pino 1 em cima).
          var leque = S.el('div', {
            position: 'absolute', top: '46%', transform: 'translateY(-50%)', width: '80%', display: 'flex', flexDirection: 'column', gap: '1px'
          }, null, b);
          leque.style[esquerda ? 'right' : 'left'] = '0';
          S.T568B.forEach(function (f) {
            S.el('div', { height: cp ? '3px' : '4px', background: fundoFio(f, false), border: '1px solid #071430', borderRadius: esquerda ? '3px 0 0 3px' : '0 3px 3px 0' }, null, leque);
          });
          S.el('div', {
            position: 'absolute', bottom: '-2px', left: '0', right: '0', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: C.cinza
          }, 'Ponta ' + id, b);
          var plug = desenharPlugue(b, esquerda, false, cp);
          plug.style.opacity = '0';
          plug.style.transform = 'translate(' + (esquerda ? '-30px' : '30px') + ', -50%)';
          b.addEventListener('click', S.protegido('crimp:ponta', function () { colocar(id); }));
          pontas[id] = { b: b, plug: plug, ok: false };
        }
        ponta('A', true);
        S.el('div', { flex: '1 1 auto', maxWidth: '360px', height: cp ? '18px' : '22px', background: 'linear-gradient(#5BA2F0, #2D7FE0 45%, #1D5FB0)', borderTop: '3px solid #071430', borderBottom: '3px solid #071430' }, null, linha);
        ponta('B', false);

        var bandeja = S.el('div', { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }, null, corpo);
        var bConector = S.el('button', {
          display: 'flex', alignItems: 'center', gap: '8px', background: '#071733', border: '3px solid ' + C.borda, borderRadius: '8px',
          padding: '6px 12px', color: C.branco, fontWeight: '700', fontSize: '13px', cursor: 'pointer', touchAction: 'manipulation'
        }, null, bandeja);
        bConector.type = 'button';
        bConector.setAttribute('aria-label', 'Conector RJ45');
        var icone = S.el('div', { position: 'relative', width: '34px', height: '30px' }, null, bConector);
        var ic = desenharPlugue(icone, false, true, false);
        ic.style.left = '2px';
        var rotConector = S.el('span', null, 'Conector RJ45 ×2', bConector);
        bConector.addEventListener('click', function () {
          if (!conectores) return msg('Os dois conectores já estão no cabo.', 'info');
          naMao = !naMao;
          bConector.style.borderColor = naMao ? C.laranja : C.borda;
          bConector.style.background = naMao ? '#3A2A08' : '#071733';
          msg(naMao ? 'Conector RJ45 na mão: toque numa ponta do cabo.' : '', 'info');
        });
        var msg = MG.mensagem(corpo);
        var acoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }, null, corpo);

        function colocar(id) {
          var p = pontas[id];
          if (p.ok) return msg('A ponta ' + id + ' já tem conector.', 'info');
          if (!naMao) return msg('Primeiro pegue o conector RJ45 na bandeja.', 'info');
          p.ok = true;
          conectores--;
          S.som('plugue');
          p.plug.style.opacity = '1';
          p.plug.style.transform = 'translate(0, -50%)';
          p.b.style.borderStyle = 'solid';
          p.b.style.borderColor = '#1E8E3E';
          rotConector.textContent = 'Conector RJ45 ×' + conectores;
          if (!conectores) {
            naMao = false;
            bConector.disabled = true;
            bConector.style.opacity = '0.45';
            bConector.style.borderColor = C.borda;
            bConector.style.background = '#071733';
            msg('✔ Conectores nas duas pontas. Agora crimpe!', 'ok');
            var bCrimp = S.ui.botao('Crimpar as duas pontas ✔', 'primario', function () {
              bCrimp.remove();
              S.som('crimpar');
              setTimeout(function () { S.som('crimpar'); }, 450);
              ['A', 'B'].forEach(function (k) { pontas[k].plug.style.filter = 'brightness(0.92)'; });
              msg('Clique! As duas pontas crimpadas: cabo direto T-568B pronto.', 'ok');
              var bPegar = S.ui.botao('Pegar o cabo ▶', 'primario', function () {
                m.fechar(true);
                aoConcluir();
              }, acoes);
              bPegar.focus({ preventScroll: true });
            }, acoes);
            bCrimp.focus({ preventScroll: true });
          } else {
            msg('Conector na ponta ' + id + '. Falta a ponta ' + (id === 'A' ? 'B' : 'A') + '.', 'ok');
          }
        }
      }

      // Conector RJ45 macho: corpo transparente, contatos dourados e a trava.
      // pequeno: ícone da bandeja; senão cobre a ponta dos fios (fica
      // transparente, como o conector de verdade, e os fios aparecem dentro).
      function desenharPlugue(pai, esquerda, pequeno, compacto) {
        var w = pequeno ? 26 : compacto ? 40 : 48;
        var h = pequeno ? 24 : compacto ? 40 : 50;
        var p = S.el('div', {
          position: 'absolute', top: '50%', width: w + 'px', height: h + 'px', transition: 'transform .35s ease, opacity .35s ease',
          pointerEvents: 'none'
        }, null, pai);
        p.style[esquerda ? 'left' : 'right'] = '2px';
        p.style.top = pequeno ? '50%' : '46%';
        S.el('div', {
          position: 'absolute', top: '0', bottom: '0', width: '86%', background: pequeno ? 'rgba(225,238,255,0.92)' : 'rgba(225,238,255,0.5)', border: '2px solid #8FA3BC',
          borderRadius: esquerda ? '3px 1px 1px 3px' : '1px 3px 3px 1px', boxSizing: 'border-box'
        }, null, p).style[esquerda ? 'left' : 'right'] = '0';
        var cont = S.el('div', {
          position: 'absolute', top: '3px', bottom: '3px', width: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }, null, p);
        cont.style[esquerda ? 'left' : 'right'] = '3px';
        for (var i = 0; i < 8; i++) S.el('div', { height: '1.5px', background: '#D9A21B' }, null, cont);
        // Trava (clip) do lado de cima.
        var trava = S.el('div', { position: 'absolute', top: '-4px', width: '45%', height: '5px', background: 'rgba(225,238,255,0.92)', border: '2px solid #8FA3BC', borderBottom: 'none', boxSizing: 'border-box' }, null, p);
        trava.style[esquerda ? 'left' : 'right'] = '20%';
        return p;
      }
    };
  });

  /* ================================================================== */
  secao('M03-portas', function () {
    var C = S.CSS;
    var MG = S.minigames;

    // Frente do gabinete: o aluno precisa achar o botão de ligar (ícone de energia).
    MG.gabinete = function (pc, aoConcluir) {
      var m = S.ui.abrirModal('Gabinete do ' + pc.nome + ' · ligar o computador', { largura: '460px' });
      var ap = S.ui.compacto();
      S.el('div', { marginBottom: '10px' }, 'Encontre e aperte o botão de ligar do gabinete.', m.corpo);
      var area = S.el('div', { display: 'flex', gap: '14px', alignItems: 'stretch', justifyContent: 'center', flexWrap: 'wrap' }, null, m.corpo);
      var torre = S.el('div', {
        width: ap ? '150px' : '170px',
        height: ap ? '210px' : '290px',
        background: 'linear-gradient(90deg, #C9D1DA, #E3E8EE 30%, #D4DBE3)',
        border: '4px solid #071430',
        borderRadius: '8px',
        position: 'relative',
        boxSizing: 'border-box',
        flex: '0 0 auto'
      }, null, area);
      var painel = S.el('div', {
        position: 'absolute',
        left: '14px',
        right: '14px',
        top: '12px',
        bottom: '12px',
        background: '#1F2329',
        borderRadius: '5px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: ap ? '7px' : '12px',
        padding: '10px 8px',
        boxSizing: 'border-box'
      }, null, torre);
      var msg = MG.mensagem(m.corpo);
      var ligando = false;

      function peca(estilos, rotulo, aoClicar, aria) {
        var b = S.el('button', estilos, rotulo, painel);
        b.type = 'button';
        b.style.cursor = 'pointer';
        b.style.touchAction = 'manipulation';
        if (aria) b.setAttribute('aria-label', aria);
        b.addEventListener('click', S.protegido('gabinete', function () {
          if (!ligando) aoClicar(b);
        }));
        return b;
      }
      // Gaveta do leitor de DVD.
      peca({ width: '100%', height: '18px', background: '#2B3138', border: '2px solid #4A5462', borderRadius: '3px', padding: '0' }, '', function () {
        msg('Essa é a gaveta do leitor de DVD.', 'info');
      }, 'Gaveta do DVD');
      var linhaBotoes = S.el('div', { display: 'flex', alignItems: 'center', gap: '14px', marginTop: ap ? '2px' : '10px' }, null, painel);
      painel.appendChild(linhaBotoes);
      var led = S.el('div', { width: '9px', height: '9px', borderRadius: '50%', background: '#2A3530', border: '1px solid #000' }, null, painel);
      linhaBotoes.appendChild(led);
      function botaoRedondo(icone, tamanho, aria, aoClicar) {
        var b = S.el('button', {
          width: tamanho + 'px',
          height: tamanho + 'px',
          borderRadius: '50%',
          background: '#3A424C',
          border: '3px solid #8A96A6',
          color: '#E6EBF2',
          fontSize: Math.round(tamanho * 0.45) + 'px',
          fontWeight: '700',
          padding: '0',
          cursor: 'pointer',
          touchAction: 'manipulation',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }, null, linhaBotoes);
        b.appendChild(S.icone(icone, Math.round(tamanho * (icone === 'energia' ? 0.56 : 0.6))));
        b.type = 'button';
        b.setAttribute('aria-label', aria);
        b.addEventListener('click', S.protegido('gabinete:' + aria, function () {
          if (!ligando) aoClicar(b);
        }));
        return b;
      }
      // Ordem embaralhada: o aluno precisa reconhecer o símbolo de energia.
      var botoes = [
        ['energia', ap ? 42 : 50, 'Botão de energia', function (b) {
          ligando = true;
          S.som('ligar');
          b.style.borderColor = '#39FF6A';
          led.style.background = '#39FF6A';
          led.style.boxShadow = '0 0 6px #39FF6A';
          msg('Ligando… o LED de energia acendeu!', 'ok');
          setTimeout(function () {
            m.fechar(true);
            aoConcluir();
          }, 800);
        }],
        ['reset', ap ? 26 : 30, 'Botão de reset', function (b) {
          S.jogo.erros++;
          b.style.borderColor = '#D63A33';
          msg('✖ Esse é o Reset: ele reinicia um PC que já está ligado. Procure o botão de energia (círculo com um traço em cima).', 'erro');
        }]
      ];
      S.embaralhar(botoes).forEach(function (bt) { botaoRedondo(bt[0], bt[1], bt[2], bt[3]); });
      var usbs = S.el('div', { display: 'flex', gap: '6px', marginTop: 'auto' }, null, painel);
      [0, 1].forEach(function () {
        var u = S.el('button', { width: '22px', height: '9px', background: '#1d5fbf', border: '2px solid #ccc', padding: '0', cursor: 'pointer' }, '', usbs);
        u.type = 'button';
        u.setAttribute('aria-label', 'Porta USB frontal');
        u.addEventListener('click', function () { if (!ligando) msg('Portas USB frontais: pendrive, fone, carregador.', 'info'); });
      });
      var dica = S.el('div', { flex: '1 1 160px', fontSize: '12px', color: S.CSS.cinza, lineHeight: '1.45', alignSelf: 'center' }, null, area);
      dica.textContent = 'O botão de ligar costuma ser o maior da frente do gabinete e tem o símbolo de energia: um círculo com um traço em cima. O LED acende quando o PC liga.';
    };

    // Traseira do gabinete: o aluno precisa achar a porta RJ45.
    MG.portasPc = function (pc, aoConcluir) {
      var m = S.ui.abrirModal('Traseira do ' + pc.nome + ' · onde vai o cabo de rede?', { largura: '640px' });
      S.el('div', { marginBottom: '10px' }, 'Escolha a porta certa para o cabo UTP.', m.corpo);
      var painel = S.el('div', {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
        gap: '10px',
        background: '#1F2329',
        border: '3px solid #071430',
        borderRadius: '8px',
        padding: '14px'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);
      var portas = [
        { nome: 'Energia', forma: { width: '40px', height: '26px', background: '#111', borderRadius: '4px', border: '3px solid #555' }, dica: 'Essa é a entrada de energia (tomada).' },
        { nome: 'USB', forma: { width: '30px', height: '12px', background: '#1d5fbf', border: '3px solid #ccc' }, dica: 'USB é para teclado, mouse e pendrive.' },
        { nome: 'USB', forma: { width: '30px', height: '12px', background: '#1d5fbf', border: '3px solid #ccc' }, dica: 'USB é para teclado, mouse e pendrive.' },
        { nome: 'VGA', forma: { width: '44px', height: '18px', background: '#2a4fb0', borderRadius: '0 0 8px 8px', border: '3px solid #ccc' }, dica: 'VGA é saída de vídeo para monitor.' },
        { nome: 'HDMI', forma: { width: '38px', height: '14px', background: '#000', borderRadius: '0 0 6px 6px', border: '3px solid #ccc' }, dica: 'HDMI é saída de vídeo e áudio.' },
        { nome: 'Rede (RJ45)', rj: 'rj45', certa: true },
        { nome: 'Áudio', forma: { width: '18px', height: '18px', background: '#5cb85c', borderRadius: '50%', border: '3px solid #ccc' }, dica: 'Essa é a saída de som (fone/caixa).' },
        { nome: 'Serial', forma: { width: '44px', height: '16px', background: '#7a7f88', borderRadius: '0 0 8px 8px', border: '3px solid #ccc' }, dica: 'Porta serial (antiga, para equipamentos legados).' }
      ];
      S.embaralhar(portas).forEach(function (p) {
        var b = S.el('button', {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minHeight: '78px',
          background: '#2B3138',
          border: '2px solid #4A5462',
          borderRadius: '6px',
          color: '#E6EBF2',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '700',
          touchAction: 'manipulation'
        }, null, painel);
        b.type = 'button';
        if (p.rj) MG.portaRJ(b, p.rj, 1);
        else S.el('div', p.forma, null, b).style.boxSizing = 'border-box';
        S.el('div', null, p.nome, b);
        b.addEventListener('click', S.protegido('porta-pc', function () {
          if (p.certa) {
            S.som('plugue');
            msg('Encaixado na placa de rede (RJ45). Clique!', 'ok');
            b.style.borderColor = C.verde;
            setTimeout(function () {
              m.fechar(true);
              aoConcluir();
            }, 650);
          } else {
            S.jogo.erros++;
            b.style.borderColor = C.vermelho;
            msg('✖ ' + p.dica + ' O cabo de rede usa o conector RJ45.', 'erro');
          }
        }));
      });
    };

    // Painel frontal do switch: 24 portas Fast + 2 Gigabit.
    MG.portasSwitch = function (modo, aoConcluir) {
      var titulos = {
        pc: 'Switch · escolha uma porta para o PC',
        uplink: 'Switch · escolha a porta do uplink (roteador)',
        ver: 'Switch de 24 portas'
      };
      var m = S.ui.abrirModal(titulos[modo], { largura: '820px' });
      var J = S.jogo;
      S.el('div', { marginBottom: '8px', fontSize: '13px' },
        modo === 'pc' ? 'Computadores usam as portas Fast Ethernet (10/100).'
          : modo === 'uplink' ? 'A ligação switch → roteador (uplink) usa uma porta Gigabit.'
          : 'Fast Ethernet (Fa0/1–24): 100 Mb/s · Gigabit (Gi0/1–2): 1000 Mb/s.', m.corpo);
      var painel = S.el('div', {
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        background: '#3A434F',
        border: '3px solid #071430',
        borderRadius: '8px',
        padding: '10px',
        overflowX: 'auto',
        touchAction: 'pan-x'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);

      function bloco(colunas) {
        return S.el('div', {
          display: 'grid',
          gridTemplateColumns: 'repeat(' + colunas + ', 34px)',
          gridAutoRows: '40px',
          gap: '5px',
          flex: '0 0 auto'
        }, null, painel);
      }
      var g1 = bloco(6);
      var g2 = bloco(6);
      var g3 = bloco(1);

      function botaoPorta(nome, giga, pai) {
        var dono = J.portasSwitch[nome];
        var b = S.el('button', {
          background: dono ? '#2D7FE0' : '#0B0D10',
          border: '3px solid ' + (giga ? C.laranja : '#8A96A6'),
          borderRadius: '3px',
          color: '#E6EBF2',
          fontSize: '9px',
          fontWeight: '700',
          cursor: 'pointer',
          padding: '0',
          touchAction: 'manipulation'
        }, nome.replace('Fa0/', '').replace('Gi0/', 'G'), pai);
        b.type = 'button';
        b.title = nome + (dono ? ' (ocupada: ' + dono + ')' : '');
        b.addEventListener('click', S.protegido('porta-switch', function () {
          if (modo === 'ver') {
            msg(nome + ': ' + (giga ? 'Gigabit, 1000 Mb/s' : 'Fast Ethernet, 100 Mb/s') + (dono ? ' · em uso por ' + dono : ' · livre'), 'info');
            return;
          }
          if (dono) {
            msg('A porta ' + nome + ' já está ocupada. Escolha outra.', 'info');
            return;
          }
          if (modo === 'pc' && giga) {
            J.erros++;
            msg('✖ As portas Gigabit (laranja) ficam reservadas para o uplink com o roteador. Use uma porta Fast.', 'erro');
            return;
          }
          if (modo === 'uplink' && !giga) {
            J.erros++;
            msg('✖ Para o uplink com o roteador use uma porta Gigabit (laranja), que é mais rápida.', 'erro');
            return;
          }
          b.style.background = '#2D7FE0';
          S.som('plugue');
          msg('Encaixado na ' + nome + '. Clique!', 'ok');
          setTimeout(function () {
            m.fechar(true);
            aoConcluir(nome);
          }, 600);
        }));
      }
      // Numeração como num switch real: ímpares em cima, pares embaixo.
      [g1, g2].forEach(function (g, gi) {
        var base = gi * 12;
        for (var c = 0; c < 6; c++) botaoPorta('Fa0/' + (base + c * 2 + 1), false, g);
        for (var c2 = 0; c2 < 6; c2++) botaoPorta('Fa0/' + (base + c2 * 2 + 2), false, g);
      });
      botaoPorta('Gi0/1', true, g3);
      botaoPorta('Gi0/2', true, g3);

      var leg = S.el('div', { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', fontSize: '12px', color: C.cinza }, null, m.corpo);
      S.el('span', null, '⬜ Fast Ethernet (PCs)', leg);
      S.el('span', { color: C.laranja }, '🟧 Gigabit (uplink)', leg);
      S.el('span', { color: '#6FA8F0' }, '🟦 Ocupada', leg);
    };

    // Roteador: portas WAN/LAN e botão de energia.
    MG.roteador = function (modo, aoConcluir) {
      var titulos = { cabo: 'Roteador · onde vai o cabo do switch?', energia: 'Roteador · ligar', ver: 'Roteador' };
      var m = S.ui.abrirModal(titulos[modo], { largura: '640px' });
      var J = S.jogo;
      S.el('div', { marginBottom: '8px', fontSize: '13px' },
        modo === 'cabo' ? 'Escolha a porta certa para ligar o switch.'
          : modo === 'energia' ? 'Aperte o botão de energia para ligar o roteador.'
          : 'WAN = internet do provedor · LAN = rede local (switch e PCs).', m.corpo);
      if (modo === 'ver') {
        var st = S.el('div', {
          background: J.roteadorLigado ? '#0F3A22' : '#071733',
          border: '3px solid ' + (J.roteadorLigado ? C.verde : C.borda),
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '10px'
        }, null, m.corpo);
        if (J.roteadorLigado) {
          S.el('div', { fontSize: '12px', fontWeight: '700', color: C.verde, letterSpacing: '0.05em' }, 'STATUS: LIGADO · IP DA REDE LOCAL (LAN)', st);
          S.el('div', { fontFamily: C.mono, fontSize: '26px', fontWeight: '700', margin: '2px 0' }, S.REDE.gateway, st);
          S.el('div', { fontSize: '13px', color: C.cinza }, 'Máscara ' + S.REDE.mascara + ' · Este IP é o gateway: os PCs usam a mesma rede (192.168.0.x) com outro final.', st);
        } else {
          S.el('div', { fontSize: '13px', color: C.cinza }, 'Status: desligado · sem IP. Quando ligado, ele recebe o IP automaticamente.', st);
        }
      }
      var painel = S.el('div', {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        background: '#E9EDF2',
        border: '3px solid #071430',
        borderRadius: '8px',
        padding: '14px',
        color: '#10203A'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);
      var leds = S.el('div', { display: 'flex', gap: '6px', width: '100%', marginBottom: '4px', alignItems: 'center', fontSize: '11px', fontWeight: '700' }, null, painel);
      var ledEls = ['PWR', 'WAN', 'LAN', 'WI-FI'].map(function (n) {
        var w = S.el('div', { display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }, null, leds);
        var l = S.el('div', { width: '10px', height: '10px', borderRadius: '50%', background: J.roteadorLigado ? '#1E8E3E' : '#9AA5B1', border: '1px solid #071430' }, null, w);
        S.el('span', null, n, w);
        return l;
      });

      function botao(nome, rotulo, cor, largura, aoClicar) {
        var col = S.el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }, null, painel);
        var b = S.el('button', {
          width: largura + 'px',
          height: '38px',
          background: cor,
          border: '3px solid #071430',
          borderRadius: nome === 'energia' ? '50%' : '3px',
          color: '#FFFFFF',
          fontWeight: '700',
          fontSize: nome === 'energia' ? '18px' : '10px',
          cursor: 'pointer',
          touchAction: 'manipulation',
          padding: '0'
        }, nome === 'energia' ? null : (J.portaRoteador === nome ? '●' : ''), col);
        if (nome === 'energia') {
          b.appendChild(S.icone('energia', 22, 2.8));
          b.setAttribute('aria-label', 'Ligar o roteador');
        }
        b.type = 'button';
        S.el('div', { fontSize: '11px', fontWeight: '700' }, rotulo, col);
        b.addEventListener('click', S.protegido('roteador:' + nome, aoClicar));
        return b;
      }

      botao('energia', 'Energia', '#C9443D', 40, function () {
        if (modo !== 'energia') {
          msg(J.roteadorLigado ? 'O roteador já está ligado.' : 'Primeiro conecte o switch ao roteador.', 'info');
          return;
        }
        S.som('ligar');
        ledEls.forEach(function (l, i) {
          setTimeout(function () { l.style.background = '#1E8E3E'; }, 150 * (i + 1));
        });
        msg('Ligando… LEDs acesos!', 'ok');
        setTimeout(function () {
          m.fechar(true);
          aoConcluir();
        }, 900);
      });
      botao('reset', 'Reset', '#7A7F88', 26, function () {
        msg('Reset apaga as configurações do roteador. Não é isso que queremos agora!', 'info');
      });
      botao('WAN', 'WAN (internet)', '#1D5FBF', 40, function () {
        if (modo === 'cabo') {
          J.erros++;
          msg('✖ WAN é a porta da internet (provedor). O switch vai numa porta LAN.', 'erro');
        } else msg('WAN: liga o roteador à internet do provedor.', 'info');
      });
      ['LAN 1', 'LAN 2', 'LAN 3', 'LAN 4'].forEach(function (n) {
        botao(n, n, '#D9A21B', 40, function () {
          if (modo !== 'cabo') {
            msg(n + ': porta da rede local' + (J.portaRoteador === n ? ' (em uso pelo switch).' : '.'), 'info');
            return;
          }
          S.som('plugue');
          msg('Encaixado na ' + n + '. Clique!', 'ok');
          setTimeout(function () {
            m.fechar(true);
            aoConcluir(n);
          }, 600);
        });
      });
    };
  });

  /* ================================================================== */
  secao('M04-configuracao-ip', function () {
    var C = S.CSS;
    var MG = S.minigames;

    function ipValido(txt) {
      var p = txt.split('.');
      if (p.length !== 4) return false;
      return p.every(function (x) { return /^\d{1,3}$/.test(x) && Number(x) <= 255; });
    }

    MG.ipValido = ipValido;

    // Campo de IP em 4 caixas com os pontos já escritos: funciona com o
    // teclado numérico do celular (no iPhone ele não tem ponto).
    MG.campoIp = function (grade, rotulo, valor, aoEnter) {
      S.el('div', { fontSize: '13px', fontWeight: '700' }, rotulo, grade);
      var linha = S.el('div', { display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'nowrap' }, null, grade);
      var partes = (valor || '').split('.');
      var caixas = [];
      for (var i = 0; i < 4; i++) {
        if (i) S.el('span', { fontWeight: '700', fontSize: '18px', color: '#10203A', padding: '0 1px' }, '.', linha);
        var inp = S.el('input', {
          width: '3.3em',
          minWidth: '0',
          boxSizing: 'border-box',
          padding: '7px 4px',
          fontSize: '16px',
          fontFamily: C.mono,
          textAlign: 'center',
          border: '2px solid #8A96A6',
          borderRadius: '4px',
          background: '#FFFFFF',
          color: '#10203A',
          userSelect: 'text',
          webkitUserSelect: 'text',
          touchAction: 'manipulation'
        }, null, linha);
        inp.type = 'text';
        inp.inputMode = 'numeric';
        inp.autocomplete = 'off';
        inp.maxLength = 3;
        inp.placeholder = '0';
        inp.setAttribute('aria-label', rotulo + ', parte ' + (i + 1) + ' de 4');
        inp.value = partes[i] && /^\d{1,3}$/.test(partes[i]) ? partes[i] : '';
        caixas.push(inp);
      }
      caixas.forEach(function (inp, i) {
        inp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            if (aoEnter) aoEnter();
          } else if (ev.key === '.' || ev.key === ',' || ev.key === ' ') {
            // Digitar ponto (no PC) só pula para a próxima caixa.
            ev.preventDefault();
            if (inp.value && caixas[i + 1]) caixas[i + 1].focus();
          } else if (ev.key === 'Backspace' && !inp.value && caixas[i - 1]) {
            ev.preventDefault();
            caixas[i - 1].focus();
          }
        });
        inp.addEventListener('input', function () {
          var txt = inp.value;
          // Colou um IP inteiro? Distribui nas 4 caixas.
          if (/[.,]/.test(txt)) {
            var p = txt.split(/[.,]/);
            for (var k = 0; k < 4 && i + k < 4; k++) caixas[i + k].value = (p[k] || '').replace(/\D/g, '').slice(0, 3);
            var ultimo = Math.min(3, i + p.length - 1);
            caixas[ultimo].focus();
            return;
          }
          inp.value = txt.replace(/\D/g, '').slice(0, 3);
          if (inp.value.length === 3 && caixas[i + 1]) caixas[i + 1].focus();
        });
        inp.addEventListener('focus', function () {
          try { inp.select(); } catch (er) { /* ignora */ }
        });
      });
      return {
        valor: function () {
          return caixas.map(function (c) { return c.value.trim(); }).join('.');
        },
        completo: function () {
          return caixas.every(function (c) { return c.value.trim() !== ''; });
        },
        habilitar: function (sim) {
          caixas.forEach(function (c) {
            c.disabled = !sim;
            c.style.background = sim ? '#FFFFFF' : '#DCE2EA';
          });
        },
        marcarErro: function (sim) {
          caixas.forEach(function (c) { c.style.borderColor = sim ? '#D63A33' : '#8A96A6'; });
        },
        focar: function () {
          var vazia = caixas.filter(function (c) { return !c.value; })[0];
          (vazia || caixas[0]).focus();
        }
      };
    };

    // Área de trabalho genérica: ícones de apps e uma janela por vez.
    MG.areaDeTrabalho = function (titulo, apps, largura) {
      var m = S.ui.abrirModal(titulo, { largura: largura || '720px' });
      var tela = S.el('div', {
        background: 'linear-gradient(160deg, #0B4F9C, #062A55)',
        border: '3px solid #071430',
        borderRadius: '8px',
        minHeight: '250px',
        padding: '14px',
        position: 'relative',
        boxSizing: 'border-box'
      }, null, m.corpo);
      var icones = S.el('div', { display: 'flex', gap: '12px', flexWrap: 'wrap' }, null, tela);
      var ctx = { m: m, tela: tela, msg: MG.mensagem(m.corpo), janela: null };
      ctx.abrirJanela = function (tituloJanela, cor) {
        ctx.fecharJanela();
        ctx.msg('');
        var j = S.el('div', {
          background: cor || '#F2F5F9',
          color: '#10203A',
          border: '3px solid #071430',
          borderRadius: '8px',
          marginTop: '12px',
          padding: '10px 12px 12px'
        }, null, tela);
        var topo = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }, null, j);
        S.el('div', { fontWeight: '700', color: cor ? '#E6EBF2' : '#0B4F9C' }, tituloJanela, topo);
        var x = S.ui.botao('✕', 'claro', function () { ctx.fecharJanela(); }, topo);
        S.estilo(x, { padding: '2px 9px', fontSize: '13px' });
        x.setAttribute('aria-label', 'Fechar ' + tituloJanela);
        ctx.janela = j;
        return j;
      };
      ctx.fecharJanela = function () {
        if (ctx.janela) ctx.janela.remove();
        ctx.janela = null;
      };
      apps.forEach(function (ic) {
        var b = S.el('button', {
          width: '92px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid transparent',
          borderRadius: '8px',
          padding: '8px 4px',
          color: '#FFFFFF',
          cursor: 'pointer',
          touchAction: 'manipulation'
        }, null, icones);
        b.type = 'button';
        S.el('div', { fontSize: '28px', lineHeight: '1' }, ic.s, b);
        S.el('div', { fontSize: '11px', fontWeight: '700', textAlign: 'center', lineHeight: '1.15' }, ic.n, b);
        b.addEventListener('click', S.protegido('desktop:' + ic.n, function () {
          if (ic.abrir) ic.abrir(ctx);
          else ctx.msg(ic.t, 'info');
        }));
      });
      return ctx;
    };

    // Prompt de Comando: o aluno digita comandos (ping, ipconfig…).
    // "executar(cmd, args, escrever)" devolve false se o comando não existe.
    MG.terminal = function (ctx, opcoes) {
      var j = ctx.abrirJanela('Prompt de Comando', '#10141A');
      var saida = S.el('div', {
        background: '#000000',
        color: '#D7DCE2',
        fontFamily: C.mono,
        fontSize: S.ui.compacto() ? '12px' : '13px',
        lineHeight: '1.35',
        padding: '8px',
        borderRadius: '4px',
        height: S.ui.compacto() ? '120px' : '170px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        touchAction: 'pan-y'
      }, null, j);
      var linhaCmd = S.el('div', { display: 'flex', gap: '6px', marginTop: '6px' }, null, j);
      var inp = S.el('input', {
        flex: '1 1 auto',
        minWidth: '0',
        background: '#000000',
        color: '#FFFFFF',
        border: '2px solid #4A5462',
        borderRadius: '4px',
        padding: '7px 8px',
        fontFamily: C.mono,
        fontSize: '16px',
        userSelect: 'text',
        webkitUserSelect: 'text'
      }, null, linhaCmd);
      inp.type = 'text';
      inp.autocomplete = 'off';
      inp.setAttribute('autocapitalize', 'none');
      inp.setAttribute('autocorrect', 'off');
      inp.setAttribute('enterkeyhint', 'go');
      inp.spellcheck = false;
      inp.placeholder = 'digite um comando (ex.: ipconfig)';
      inp.setAttribute('aria-label', 'Comando');
      var bExec = S.ui.botao('Executar', 'primario', function () { executar(); }, linhaCmd);
      S.estilo(bExec, { padding: '6px 12px', fontSize: '13px' });
      var ocupado = false;

      function escrever(texto, cor) {
        var l = S.el('div', cor ? { color: cor } : null, texto || '\u00a0', saida);
        saida.scrollTop = saida.scrollHeight;
        return l;
      }
      escrever(opcoes.cabecalho || 'Microsoft Windows [versão 10]\nDigite "ajuda" para ver os comandos.', '#8FA3BC');

      // Escreve linhas com um pequeno atraso entre elas (efeito de resposta).
      function escreverAos(linhas, depois) {
        ocupado = true;
        var i = 0;
        (function prox() {
          if (!j.isConnected) return;
          if (i >= linhas.length) {
            ocupado = false;
            if (depois) depois();
            return;
          }
          var l = linhas[i++];
          if (typeof l === 'string') l = { t: l };
          escrever(l.t, l.cor);
          if (l.som) S.som(l.som);
          setTimeout(prox, l.espera !== undefined ? l.espera : 60);
        })();
      }

      function executar() {
        if (ocupado) return;
        var txt = inp.value.trim();
        inp.value = '';
        escrever((opcoes.prompt || 'C:\\Users\\aluno>') + txt, '#FFFFFF');
        if (!txt) return;
        var partes = txt.split(/\s+/);
        var cmd = partes[0].toLowerCase();
        var args = partes.slice(1);
        if (cmd === 'cls' || cmd === 'clear') {
          saida.textContent = '';
          return;
        }
        if (cmd === 'ajuda' || cmd === 'help') {
          escreverAos(opcoes.ajuda || ['ipconfig     mostra a configuração de rede', 'ping <IP>    testa se outro aparelho responde', 'cls          limpa a tela']);
          return;
        }
        var r = opcoes.executar(cmd, args, escreverAos);
        if (r === false) escreverAos(['\'' + partes[0] + '\' não é reconhecido como um comando. Digite "ajuda".']);
      }
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          executar();
        }
      });
      if (!S.toque) setTimeout(function () { inp.focus(); }, 30);
      return { escrever: escrever, escreverAos: escreverAos, entrada: inp };
    };

    // Saída padrão de um ping (respondeu ou não).
    MG.saidaPing = function (ip, responde, nome) {
      var l = [{ t: '', espera: 0 }, { t: 'Disparando ' + (nome ? nome + ' [' + ip + ']' : ip) + ' com 32 bytes de dados:', espera: 350 }];
      for (var i = 0; i < 4; i++) {
        l.push(responde
          ? { t: 'Resposta de ' + ip + ': bytes=32 tempo<1ms TTL=128', espera: 380, som: 'bip' }
          : { t: 'Esgotado o tempo limite do pedido.', espera: 700 });
      }
      l.push({ t: '', espera: 0 });
      l.push('Estatísticas do Ping para ' + ip + ':');
      l.push(responde
        ? { t: '    Pacotes: Enviados = 4, Recebidos = 4, Perdidos = 0 (0% de perda)', cor: '#6BF08E' }
        : { t: '    Pacotes: Enviados = 4, Recebidos = 0, Perdidos = 4 (100% de perda)', cor: '#FF7676' });
      return l;
    };

    MG.desktopFase1 = function (pc) {
      var ctx = MG.areaDeTrabalho(pc.nome + ' · área de trabalho', [
        { n: 'Navegador', s: '🌐', t: 'Esta rede ainda não tem internet: é uma rede local entre os PCs.' },
        { n: 'Arquivos', s: '📁', t: 'Nada importante aqui.' },
        { n: 'Configurações de Rede', s: '⚙', abrir: function (c) { abrirRedeFase1(pc, c); } },
        { n: 'Prompt de Comando', s: '⌨', abrir: function (c) { terminalFase1(pc, c); } },
        { n: 'Lixeira', s: '🗑', t: 'A lixeira está vazia.' }
      ]);
      return ctx;
    };

    function terminalFase1(pc, ctx) {
      var e = pc.estado;
      var outroNome = pc.nome === 'PC-01' ? 'PC-02' : 'PC-01';
      var outro = S.pcs[outroNome].estado;
      MG.terminal(ctx, {
        executar: function (cmd, args, escrever) {
          if (cmd === 'ipconfig') {
            escrever(e.configurado ? [
              'Adaptador Ethernet:',
              '   Endereço IPv4. . . . . . . . : ' + e.ip,
              '   Máscara de Sub-rede. . . . . : ' + e.mascara,
              '   Gateway Padrão . . . . . . . : ' + e.gateway
            ] : ['Adaptador Ethernet:', '   Sem endereço IP configurado.']);
            return true;
          }
          if (cmd !== 'ping') return false;
          var alvo = args[0] || '';
          if (!alvo) {
            escrever(['Uso: ping <endereço IP>   (ex.: ping 192.168.0.3)']);
            return true;
          }
          if (!ipValido(alvo)) {
            escrever(['A solicitação ping não pôde encontrar o host ' + alvo + '. Verifique o nome e tente novamente.']);
            return true;
          }
          if (!e.configurado) {
            escrever(['Falha geral. Configure o IP deste PC primeiro.']);
            return true;
          }
          var J = S.jogo;
          var responde = false;
          var nota = null;
          if (alvo === e.ip || alvo === '127.0.0.1') {
            responde = true;
            nota = 'Esse é o IP do próprio ' + pc.nome + '. Faça ping no ' + outroNome + '.';
          } else if (alvo === S.REDE.gateway && J.roteadorLigado) {
            responde = true;
            nota = 'Esse é o roteador. Agora faça ping no ' + outroNome + '.';
          } else if (alvo === outro.ip && outro.configurado) {
            responde = true;
          } else if (alvo.indexOf(S.REDE.prefixo) !== 0) {
            nota = 'Esse IP não é da rede 192.168.0.x.';
          } else {
            nota = 'Nenhum aparelho com esse IP. Confira o IP do ' + outroNome + ' (use ipconfig nele).';
          }
          escrever(MG.saidaPing(alvo, responde), function () {
            if (responde && !nota) {
              e.pingOk = true;
              e.ping = alvo;
              S.mundo.desenharTela(pc);
              ctx.msg('✔ O ' + outroNome + ' respondeu! A comunicação ' + pc.nome + ' → ' + outroNome + ' funciona.', 'ok');
              J.atualizarMissoes();
              if (J.concluido) ctx.msg('✔ Ping nos dois sentidos! Feche a janela para continuar.', 'ok');
            } else if (nota) {
              ctx.msg(nota, responde ? 'info' : 'erro');
            }
          });
          return true;
        }
      });
    }

    function abrirRedeFase1(pc, ctx) {
      var e = pc.estado;
      var m = ctx.m;
      var msg = ctx.msg;
      var janela = ctx.abrirJanela('⚙ Configurações de Rede · Ethernet (' + (e.portaSwitch || 'sem cabo') + ')');
      if (!S.jogo.viuIpRoteador) {
        S.el('div', {
          background: '#FFF4D6',
          border: '2px solid #D9A21B',
          borderRadius: '6px',
          padding: '6px 8px',
          marginBottom: '8px',
          fontSize: '12px',
          color: '#5A4300'
        }, 'Dica: o IP do roteador (gateway da rede) aparece no próprio roteador, no rack. Ele mostra em qual rede os PCs devem ficar.', janela);
      }

      var modoManual = !!e.configurado;
      var opcoes = S.el('div', { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', fontSize: '13px' }, null, janela);
      function radio(rotulo, manual) {
        var l = S.el('label', { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }, null, opcoes);
        var r = S.el('input', { width: '18px', height: '18px' }, null, l);
        r.type = 'radio';
        r.name = 'modo-ip-' + pc.nome;
        r.checked = manual === modoManual;
        S.el('span', null, rotulo, l);
        r.addEventListener('change', function () {
          modoManual = manual;
          atualizarCampos();
        });
      }
      radio('Obter endereço IP automaticamente (DHCP)', false);
      radio('Usar o seguinte endereço IP (fixo / manual)', true);

      var grade = S.el('div', { display: 'grid', gridTemplateColumns: 'minmax(105px, auto) minmax(0, 1fr)', gap: '6px 10px', alignItems: 'center' }, null, janela);
      var fIp = MG.campoIp(grade, 'Endereço IP', e.ip, salvar);
      var fMasc = MG.campoIp(grade, 'Máscara de sub-rede', e.mascara, salvar);
      var fGw = MG.campoIp(grade, 'Gateway padrão', e.gateway, salvar);

      function atualizarCampos() {
        [fIp, fMasc, fGw].forEach(function (f) { f.habilitar(modoManual); });
      }
      atualizarCampos();

      var acoes = S.el('div', { display: 'flex', gap: '8px', marginTop: '12px' }, null, janela);
      S.ui.botao('Salvar', 'primario', salvar, acoes);
      S.ui.botao('Cancelar', 'claro', function () { ctx.fecharJanela(); }, acoes);

      function errou(texto, campoErr) {
        S.jogo.erros++;
        msg('✖ ' + texto, 'erro');
        if (campoErr) {
          campoErr.marcarErro(true);
          campoErr.focar();
        }
      }

      function salvar() {
        [fIp, fMasc, fGw].forEach(function (f) { f.marcarErro(false); });
        if (!modoManual) return errou('Nesta rede os IPs são fixos: escolha "Usar o seguinte endereço IP".');
        var vazio = [fIp, fMasc, fGw].filter(function (f) { return !f.completo(); })[0];
        if (vazio) {
          msg('Preencha as 4 partes de cada endereço.', 'info');
          vazio.marcarErro(true);
          vazio.focar();
          return;
        }
        var ip = fIp.valor();
        var masc = fMasc.valor();
        var gw = fGw.valor();
        var R = S.REDE;
        if (!ipValido(ip)) return errou('Endereço IP inválido: cada parte vai de 0 a 255.', fIp);
        if (ip === R.gateway) return errou('O .1 é o endereço do roteador (gateway). Escolha outro para o PC.', fIp);
        if (ip.indexOf(R.prefixo) !== 0) return errou('O IP precisa estar na mesma rede: 192.168.0.x.', fIp);
        if (R.ipsValidos.indexOf(ip) < 0) return errou('Use 192.168.0.2 ou 192.168.0.3, conforme a missão.', fIp);
        var outro = pc.nome === 'PC-01' ? S.pcs['PC-02'].estado : S.pcs['PC-01'].estado;
        if (outro.ip === ip) return errou('Esse IP já está no outro PC. Cada aparelho precisa de um IP único.', fIp);
        if (masc !== R.mascara) return errou('Rede classe C: a máscara é 255.255.255.0.', fMasc);
        if (gw !== R.gateway) return errou('O gateway é o IP do roteador. Confira no roteador (rack).', fGw);
        e.ip = ip;
        e.mascara = masc;
        e.gateway = gw;
        e.configurado = true;
        S.mundo.desenharTela(pc);
        msg('✔ Configuração salva! ' + pc.nome + ' agora é ' + ip + '.', 'ok');
        acoes.textContent = '';
        setTimeout(function () {
          m.fechar(true);
          S.jogo.atualizarMissoes();
        }, 1100);
      }
      if (!S.toque) setTimeout(function () { if (modoManual) fIp.focar(); else opcoes.querySelector('input').focus(); }, 30);
    }
  });

  /* ================================================================== */
  secao('F01-tela-final', function () {
    var C = S.CSS;

    // Tela de fim de fase: salva o resultado no ranking daquela fase.
    S.ui.mostrarFim = function (numFase) {
      numFase = numFase || 1;
      S.fase = 'fim';
      S.pausado = true;
      S.ui.atualizarControlesToque();
      var J = S.jogo;
      var tempo = Math.round(S.tempoDeJogo() * 10) / 10;
      var sessao = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      var t = S.ui.tela(30, '520px');
      S.som('vitoria');
      S.el('div', { fontSize: '13px', fontWeight: '700', color: C.laranja, letterSpacing: '0.08em' }, 'LABORATÓRIO ' + numFase + ' CONCLUÍDO', t.cartao);
      S.el('div', { fontSize: '24px', fontWeight: '700', margin: '4px 0 14px' }, numFase === 3 ? 'Cabeamento completo! 🎉' : numFase === 2 ? 'Servidor no ar! 🎉' : 'A rede está funcionando! 🎉', t.cartao);

      var stats = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }, null, t.cartao);
      function stat(rotulo, valor, cor) {
        var c = S.el('div', { flex: '1 1 120px', background: '#071733', border: '3px solid ' + cor, borderRadius: '8px', padding: '8px 12px' }, null, stats);
        S.el('div', { fontSize: '11px', fontWeight: '700', color: cor }, rotulo, c);
        S.el('div', { fontSize: '20px', fontWeight: '700', fontFamily: C.mono }, valor, c);
      }
      stat('TEMPO', S.formatarTempo(tempo), C.laranja);
      stat('ERROS', String(J.erros), J.erros ? C.amarelo : C.verde);
      stat('DICAS', String(J.dicas), C.cinza);

      var resumo = S.el('div', { fontSize: '13px', color: C.cinza, lineHeight: '1.5', marginBottom: '12px' }, null, t.cartao);
      var faseDef = S.faseAtual || {};
      resumo.textContent = faseDef.resumo ? faseDef.resumo() :
        'PC-01: ' + S.pcs['PC-01'].estado.ip + ' (' + S.pcs['PC-01'].estado.portaSwitch + ') · PC-02: ' +
        S.pcs['PC-02'].estado.ip + ' (' + S.pcs['PC-02'].estado.portaSwitch + ') · Uplink ' + J.portaUplink + ' → ' + J.portaRoteador +
        ' · Gateway 192.168.0.1 · Ping nos dois sentidos OK';

      var status = S.el('div', { fontSize: '14px', fontWeight: '700', minHeight: '20px', marginBottom: '12px' }, 'Salvando no ranking…', t.cartao);
      var botoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, t.cartao);
      if (faseDef.proxima && S.fases[faseDef.proxima]) {
        var bProx = S.ui.botao('Ir para o Laboratório ' + (numFase + 1) + ' ▶', 'primario', function () {
          t.fechar();
          S.irParaFase(faseDef.proxima);
        }, botoes);
        bProx.style.flex = '1 1 100%';
      }
      var bRank = S.ui.botao('🏆 Ver ranking', faseDef.proxima ? 'secundario' : 'primario', function () {
        S.ui.mostrarRanking('', sessao, 'geral');
      }, botoes);
      bRank.style.flex = '1 1 200px';
      var bDeNovo = S.ui.botao('Jogar de novo', 'secundario', function () {
        window.location.reload();
      }, botoes);
      bDeNovo.style.flex = '0 1 auto';

      var registro = {
        nome: S.aluno.nome,
        turma: S.aluno.turma,
        tempo: tempo,
        erros: J.erros,
        dicas: J.dicas,
        data: new Date().toISOString(),
        sessao: sessao,
        fase: numFase,
        versao: S.versao
      };
      S.ultimoRegistro = registro;

      function posicao() {
        var regs = S.dados.daTurma(S.aluno.turma, numFase);
        for (var i = 0; i < regs.length; i++) {
          if (regs[i].sessao === sessao) return { pos: i + 1, total: regs.length };
        }
        return null;
      }

      function tentarSalvar() {
        status.textContent = 'Salvando no ranking…';
        status.style.color = C.cinza;
        S.dados.salvar(registro).then(function (res) {
          if (res && res.isOk) {
            var atualizar = function () {
              var p = posicao();
              status.style.color = C.verde;
              status.textContent = p
                ? '✔ Resultado salvo! Fase ' + numFase + ': você ficou em ' + p.pos + 'º de ' + p.total + ' na turma ' + S.aluno.turma + '.'
                : '✔ Resultado salvo no ranking da fase ' + numFase + ' da turma ' + S.aluno.turma + '.';
            };
            atualizar();
            S.dados.aoMudar(atualizar);
          } else {
            status.style.color = C.vermelho;
            status.textContent = 'Não foi possível salvar. ';
            var b = S.ui.botao('Tentar de novo', 'secundario', tentarSalvar, status);
            b.style.padding = '4px 10px';
          }
        });
      }
      tentarSalvar();
    };
  });


  /* ================================================================== */
  secao('L01-carregamento', function () {
    function passo(fn) {
      return new Promise(function (ok) {
        setTimeout(function () {
          try {
            fn();
          } catch (e) {
            registrarErro('carregamento', e);
          }
          ok();
        }, 16);
      });
    }

    // ---- Fases ----------------------------------------------------------
    // Cada fase descreve as etapas que montam o cenário dela. Tudo que ela
    // cria fica dentro de S.raizFase; desmontar libera tudo da GPU (dispose).
    S.fases = {};
    S.faseAtual = null;
    var aoDesmontar = [];

    S.registrarFase = function (id, def) {
      def.id = id;
      S.fases[id] = def;
      return def;
    };

    // Funções extras de limpeza (ex.: esconder balões em HTML da fase).
    S.aoDesmontarFase = function (fn) {
      aoDesmontar.push(fn);
    };

    S.desmontarFase = function () {
      if (!S.raizFase) return null;
      var def = S.faseAtual;
      if (def && def.desmontar) {
        try { def.desmontar(); } catch (e) { registrarErro('desmontar', e); }
      }
      aoDesmontar.splice(0).forEach(function (fn) {
        try { fn(); } catch (e) { registrarErro('desmontar', e); }
      });
      S.cena.remove(S.raizFase);
      var liberado = S.liberar(S.raizFase);
      S.raizFase = null;
      S.faseAtual = null;
      S.limparCacheMateriais();
      S.interativos.length = 0;
      S.colisores.length = 0;
      S.leds.length = 0;
      S.mundo.objetos = {};
      S.mundo.seta = null;
      S.mundo.porta = null;
      S.mundo.caboMao = null;
      for (var k in S.pcs) {
        if (Object.prototype.hasOwnProperty.call(S.pcs, k)) delete S.pcs[k];
      }
      S.personagem = null;
      S.professor = null;
      if (S.limparHover) S.limparHover();
      if (S.renderer) S.renderer.renderLists.dispose();
      return liberado;
    };

    // Monta a fase em passos (a barra de carregamento avança entre eles).
    S.montarFase = function (id, tela) {
      var def = S.fases[id];
      if (S.raizFase) S.desmontarFase();
      S.raizFase = new THREE.Group();
      S.raizFase.name = 'fase:' + id;
      S.cena.add(S.raizFase);
      S.faseAtual = def;
      var etapas = def.etapas;
      var cadeia = Promise.resolve();
      etapas.forEach(function (et, i) {
        cadeia = cadeia.then(function () {
          if (tela) tela.progresso((i + 1) / (etapas.length + 2), et[0]);
          return passo(et[1]);
        });
      });
      return cadeia;
    };

    // Fase 1: o laboratório de redes.
    S.registrarFase('laboratorio', {
      numero: 1,
      nome: 'Laboratório de Redes',
      titulo: 'Rede local',
      resumoCurto: 'Crimpe cabos T-568B, ligue PCs no switch e no roteador, configure IP fixo e teste com ping.',
      missaoCurta: 'Ligue os PCs, crimpe cabos T-568B, conecte switch e roteador, configure IPs fixos e teste com ping.',
      missaoLonga: 'Monte a rede do laboratório: ligue os PCs, crimpe cabos no padrão T-568B, conecte tudo no switch e no roteador, configure IPs fixos e teste com ping nos dois sentidos. O quadro mostra as etapas e vai riscando o que você concluir.',
      proxima: 'servidores',
      usar: function (info) { return S.jogo.usarFase1(info); },
      rotulo: function (info) { return S.jogo.rotuloFase1(info); },
      concluir: function () { S.jogo.concluirFase1(); },
      textoConcluido: 'Rede testada nos dois sentidos!',
      etapas: [
        ['Preparando as missões…', function () { S.jogo.reiniciar(S.jogo.MISSOES_F1); }],
        ['Construindo a sala…', function () { S.mundo.montarSala(); }],
        ['Montando as bancadas e os PCs…', function () { S.mundo.montarBancadas(); }],
        ['Instalando o rack, o switch e o roteador…', function () { S.mundo.montarRack(); }],
        ['Separando as ferramentas…', function () { S.mundo.montarFerramentas(); }],
        ['Chamando o professor e o aluno…', function () {
          S.criarProfessor();
          S.criarPersonagem(S.aluno.nome, S.aluno.genero);
          S.mundo.montarCaboMao();
          S.mundo.montarSeta();
          S.criarCachola();
          S.prepararSegredo();
        }]
      ],
      atualizar: function (dt) { S.atualizarCachola(dt); },
      desmontar: function () {
        if (S.esconderBalaoProfessor) S.esconderBalaoProfessor();
        S.removerCachola();
        S.removerCarlos();
      }
    });

    // Troca de fase: desmonta a atual (dispose), monta a nova e começa
    // pela cena de abertura dela.
    S.irParaFase = S.protegido('irParaFase', function (id) {
      S.fase = 'carregando';
      S.pausado = true;
      S.ui.mostrarHud(false);
      S.ui.atualizarControlesToque();
      var tela = S.ui.mostrarCarregamento();
      tela.progresso(0.02, 'Indo para: ' + S.fases[id].nome + '…');
      passo(function () {
        S.desmontarFase();
      }).then(function () {
        return S.montarFase(id, tela);
      }).then(function () {
        return passo(function () {
          S.tempoInicio = null;
          S.tempoFinal = null;
          S.atualizarCamera(0, true);
          S.renderer.compile(S.cena, S.camera);
          S.renderer.render(S.cena, S.camera);
        });
      }).then(function () {
        tela.progresso(1, 'Pronto!');
        setTimeout(function () {
          tela.fechar();
          S.comecarJogo();
        }, 200);
      });
    });

    S.iniciarCarregamento = function () {
      S.fase = 'carregando';
      var tela = S.ui.mostrarCarregamento();
      if (typeof THREE === 'undefined') {
        tela.progresso(0, 'Não foi possível carregar o motor 3D (Three.js). Verifique a internet e recarregue a página.');
        registrarErro('carregamento', new Error('THREE indisponível'));
        return;
      }
      tela.progresso(0, 'Ligando o motor 3D…');
      passo(function () {
        if (!S.renderer) S.montarRenderer();
      }).then(function () {
        return S.montarFase(S.fases[S.faseEscolhida] ? S.faseEscolhida : 'laboratorio', tela);
      }).then(function () {
        tela.progresso(0.95, 'Preparando os gráficos…');
        return passo(function () {
          S.ligarEntradaCena();
          S.atualizarCamera(0, true);
          // Compila todos os shaders agora, para o jogo não engasgar depois.
          S.renderer.compile(S.cena, S.camera);
          S.renderer.render(S.cena, S.camera);
        });
      }).then(function () {
        tela.progresso(1, 'Pronto!');
        setTimeout(function () {
          tela.fechar();
          S.comecarJogo();
        }, 200);
      });
    };

    // Antes do jogo: cena de abertura com o professor. O cronômetro só
    // começa quando ela termina (ou é pulada).
    S.comecarJogo = S.protegido('comecarJogo', function () {
      S.ui.criarHud();
      S.ui.mostrarHud(false);
      S.jogo.atualizarMissoes();
      S.pausado = false;
      if (S.cenaAbertura) S.cenaAbertura(S.liberarJogo);
      else S.liberarJogo();
    });

    S.liberarJogo = S.protegido('liberarJogo', function () {
      S.ui.mostrarHud(true);
      if (S.toque) S.ui.criarControlesToque();
      S.fase = 'jogo';
      S.pausado = false;
      S.teclas = {};
      S.zerarRelogio();
      S.jogo.progressoEm = S.agora();
      S.jogo.atualizarMissoes();
      S.ui.atualizarControlesToque();
      S.raiz.focus({ preventScroll: true });
      S.aviso('Boa sorte, ' + S.primeiroNome() + '! Siga as missões do quadro.', 'info', 3200);
    });
  });

  /* ================================================================== */
  secao('L02-laco-e-qualidade', function () {
    var relogio = null;
    var quadros = 0;
    var janelaInicio = 0;
    var errosLaco = 0;
    S.fpsMedio = 0;

    // Estatísticas de desempenho ao vivo (painel F9).
    var amostras = [];
    var ultimoQuadro = 0;
    var ultimoCalculo = 0;
    S.desempenho = null;
    function medir(agora) {
      if (ultimoQuadro) amostras.push({ t: agora, dt: agora - ultimoQuadro });
      ultimoQuadro = agora;
      while (amostras.length && agora - amostras[0].t > 3000) amostras.shift();
      if (agora - ultimoCalculo < 250 || amostras.length < 2) return;
      ultimoCalculo = agora;
      var soma = 0;
      var pior = 0;
      var somaRecente = 0;
      var nRecente = 0;
      amostras.forEach(function (a) {
        soma += a.dt;
        if (a.dt > pior) pior = a.dt;
        if (agora - a.t <= 500) {
          somaRecente += a.dt;
          nRecente++;
        }
      });
      var info = S.renderer.info.render;
      var c = S.renderer.domElement;
      S.desempenho = {
        fps: nRecente ? 1000 / (somaRecente / nRecente) : 0,
        media: 1000 / (soma / amostras.length),
        minimo: pior ? 1000 / pior : 0,
        piorQuadroMs: pior,
        drawCalls: info.calls,
        triangulos: info.triangles,
        resolucao: c.width + '×' + c.height,
        sombras: S.qualidade.sombras,
        escala: S.qualidade.escala
      };
    }
    S.zerarMedicao = function () {
      amostras = [];
      ultimoQuadro = 0;
    };

    // Se o computador não aguentar, desliga as sombras e reduz a resolução.
    function ajustarQualidade(agora) {
      if (!janelaInicio) {
        janelaInicio = agora;
        quadros = 0;
        return;
      }
      quadros++;
      var dur = agora - janelaInicio;
      if (dur < 3000) return;
      S.fpsMedio = quadros / (dur / 1000);
      janelaInicio = agora;
      quadros = 0;
      if (S.fpsMedio < 26 && S.qualidade.sombras) {
        S.qualidade.sombras = false;
        S.renderer.shadowMap.enabled = false;
        S.cena.traverse(function (o) {
          if (!o.material) return;
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.needsUpdate = true; });
        });
      } else if (S.fpsMedio < 22 && S.qualidade.escala > 0.75) {
        S.qualidade.escala = 0.75;
        S.redimensionar();
      }
    }

    function quadro() {
      requestAnimationFrame(quadro);
      if (S.fase !== 'jogo' && S.fase !== 'fim' && S.fase !== 'cena') return;
      if (S.contextoPerdido) return;
      if (!relogio) relogio = new THREE.Clock();
      var dt = Math.min(relogio.getDelta(), 0.05);
      var agora = S.agora();
      try {
        S.ui.atualizarHud();
        if (S.fase === 'cena') {
          // Cena de abertura: câmera e personagens seguem o roteiro.
          if (S.atualizarCena) S.atualizarCena(dt);
          S.atualizarProfessor(dt);
          S.mundo.atualizarPorta(dt);
          if (S.faseAtual && S.faseAtual.atualizar) S.faseAtual.atualizar(dt);
          S.mundo.atualizarSeta(agora / 1000);
          S.renderer.render(S.cena, S.camera);
          ajustarQualidade(agora);
          medir(agora);
          return;
        }
        if (S.pausado || S.fase !== 'jogo') {
          janelaInicio = 0;
          ultimoQuadro = 0;
          return; // com janela aberta o 3D fica parado (economiza processamento)
        }
        S.atualizarMovimento(dt);
        S.atualizarCamera(dt);
        S.atualizarHover();
        S.mundo.atualizarCaboMao();
        S.mundo.atualizarSeta(agora / 1000);
        S.atualizarProfessor(dt);
        S.mundo.atualizarPorta(dt);
        if (S.faseAtual && S.faseAtual.atualizar) S.faseAtual.atualizar(dt);
        S.jogo.atualizarDicas();
        S.jogo.atualizarPrompt();
        S.renderer.render(S.cena, S.camera);
        ajustarQualidade(agora);
        medir(agora);
      } catch (e) {
        if (errosLaco++ < 5) registrarErro('laco', e);
      }
    }
    S.iniciarLaco = function () {
      requestAnimationFrame(quadro);
    };
  });

  /* ================================================================== */
  secao('L03-inicio', function () {
    S.toque = S.ehToque();
    if (S.ui.verificarOrientacao) S.ui.verificarOrientacao();
    window.addEventListener('resize', function () {
      if (S.redimensionar) S.redimensionar();
      else S.ui.verificarOrientacao();
      setTimeout(S.ui.reorganizarLogin, 80);
    });
    S.dados.iniciar();
    S.iniciarLaco();
    S.ui.mostrarLogin();
  });


  /* ================================================================== */
  secao('C01-cena-abertura', function () {
    // Cena de abertura "in-game": é a própria sala 3D com a câmera seguindo
    // um roteiro. Não carrega vídeo nem arquivo novo — só números e texto.
    var C = S.CSS;
    var DESTINO = { x: 3.45, z: 3.3 }; // onde o aluno para, de frente para o professor

    var TOMADAS = {
      abertura: { pos: [-2.2, 4.4, 8.4], alvo: [0.2, 0.7, 0.2] },
      dupla: { pos: [2.2, 2.15, 4.45], alvo: [5.0, 1.4, 3.1] }, // por cima do ombro do aluno
      aluno: { pos: [5.85, 2.2, 1.7], alvo: [3.6, 1.3, 3.4] }, // por cima do ombro do professor
      sala: { pos: [0.4, 5.6, 7.6], alvo: [-0.4, 0.4, -1.2] },
      pcs: { pos: [-0.8, 2.5, 1.9], alvo: [-0.8, 0.9, -1.4] },
      ferramentas: { pos: [-3.2, 2.3, 2.7], alvo: [-4.9, 0.85, 0.3] },
      switch: { pos: [3.7, 1.7, -1.9], alvo: [4.6, 1.05, -4.0] },
      roteador: { pos: [3.95, 1.85, -2.5], alvo: [4.6, 1.42, -4.0] },
      quadro: { pos: [-1.7, 2.05, -0.55], alvo: [-1.7, 1.6, -4.5] },
      despedida: { pos: [2.3, 2.35, 4.45], alvo: [5.1, 1.35, 3.2] }
    };

    function roteiro() {
      var nome = S.primeiroNome();
      var bemVindo = S.aluno.genero === 'f' ? 'bem-vinda' : 'bem-vindo';
      return [
        { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: 'Olá, ' + nome + '! Eu sou o Herick, professor do laboratório. Seja ' + bemVindo + '!' },
        { quem: 'prof', tomada: 'sala', gesto: 'falar', texto: 'Hoje você vai montar uma rede de verdade: dois computadores ligados a um switch e a um roteador.' },
        { quem: 'prof', tomada: 'pcs', gesto: 'apontar', texto: 'Primeiro, ligue o PC-01 e o PC-02, naquela fileira perto do quadro. O PC-03 e o PC-04 estão em manutenção.' },
        { quem: 'prof', tomada: 'ferramentas', gesto: 'apontar', texto: 'Na bancada perto da porta você vai crimpar os cabos no padrão T-568B. Tem um cartaz lá com a ordem das cores.' },
        { quem: 'prof', tomada: 'switch', gesto: 'apontar', texto: 'Os cabos dos PCs vão nas portas Fast do switch. As duas portas Gigabit ficam reservadas para o roteador.' },
        { quem: 'prof', tomada: 'roteador', gesto: 'apontar', texto: 'Depois, ligue o roteador, veja o IP dele e configure IPs fixos nos dois PCs, na mesma rede.' },
        { quem: 'prof', tomada: 'quadro', gesto: 'falar', texto: 'As missões ficam no quadro e vão sendo riscadas. Se você travar, eu mando umas dicas.' },
        { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: 'Boa sorte, ' + nome + '!' },
        { quem: 'aluno', tomada: 'aluno', texto: 'Valeu, professor! Bora lá!' }
      ];
    }

    var est = null;

    var FALANTES = {
      prof: { nome: function () { return 'Prof. Herick'; }, cor: C.laranja, texto: '#10203A' },
      aluno: { nome: function () { return S.aluno.nome; }, cor: '#4F9BFF', texto: '#071430' },
      cachola: { nome: function () { return 'Cachola'; }, cor: '#39C46A', texto: '#071430' },
      carlos: { nome: function () { return 'Prof. Carlos'; }, cor: '#C08A6A', texto: '#10203A' }
    };

    // Etiquetas de nome somem durante a cena (atrapalham os closes).
    function etiquetas(visiveis) {
      [S.personagem, S.professor, S.cachola && S.cachola(), S.carlos && S.carlos()].forEach(function (c) {
        if (!c) return;
        c.raiz.children.forEach(function (o) {
          if (o.isSprite) o.visible = visiveis;
        });
      });
    }

    function v3(a) {
      return new THREE.Vector3(a[0], a[1], a[2]);
    }
    function suave(t) {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    }

    // Leva a câmera de onde ela está até uma tomada, em "dur" segundos.
    function irPara(pos, alvo, dur) {
      est.cam = {
        dePos: S.camera.position.clone(),
        deAlvo: est.alvoAtual.clone(),
        paraPos: pos,
        paraAlvo: alvo,
        t: 0,
        dur: dur
      };
    }

    function atualizarCamera(dt) {
      var c = est.cam;
      if (!c) return;
      c.t += dt;
      var k = suave(c.t / c.dur);
      S.camera.position.lerpVectors(c.dePos, c.paraPos, k);
      est.alvoAtual.lerpVectors(c.deAlvo, c.paraAlvo, k);
      // Leve deslize depois de chegar, para a tomada não ficar "parada".
      if (c.t > c.dur) {
        var extra = Math.min(c.t - c.dur, 6) * 0.025;
        S.camera.position.x += extra;
      }
      S.camera.lookAt(est.alvoAtual);
    }

    // ---- Interface: faixas de cinema, caixa de diálogo e botão pular ----
    function montarUi() {
      if (S.ocultarAviso) S.ocultarAviso();
      var compacto = S.ui.compacto();
      var ui = {};
      ui.camada = S.el('div', {
        position: 'absolute',
        inset: '0',
        zIndex: '14',
        pointerEvents: 'auto',
        cursor: 'pointer',
        touchAction: 'none'
      }, null, S.raiz);
      var faixa = { position: 'absolute', left: '0', right: '0', height: '0', background: '#000', transition: 'height .5s ease' };
      ui.faixaCima = S.el('div', faixa, null, ui.camada);
      ui.faixaCima.style.top = '0';
      ui.faixaBaixo = S.el('div', faixa, null, ui.camada);
      ui.faixaBaixo.style.bottom = '0';

      ui.titulo = S.el('div', {
        position: 'absolute',
        top: compacto ? '9%' : '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: compacto ? '15px' : '20px',
        letterSpacing: '0.12em',
        textShadow: '0 2px 4px rgba(0,0,0,0.9)',
        whiteSpace: 'nowrap',
        opacity: '0',
        transition: 'opacity .6s ease'
      }, 'LABORATÓRIO DE REDES · SENAC', ui.camada);

      ui.pular = S.ui.botao('Pular ▸▸', 'secundario', function () { terminar(true); }, ui.camada);
      S.estilo(ui.pular, {
        position: 'absolute',
        top: compacto ? '6px' : '12px',
        right: '62px', // o canto fica para o botão de configurações (⚙)
        padding: compacto ? '4px 10px' : '6px 14px',
        fontSize: compacto ? '12px' : '14px',
        zIndex: '2'
      });
      ui.pular.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

      ui.caixa = S.el('div', {
        position: 'absolute',
        left: '50%',
        bottom: compacto ? '8px' : '22px',
        transform: 'translateX(-50%)',
        width: compacto ? 'min(640px, 92%)' : 'min(760px, 92%)',
        boxSizing: 'border-box',
        background: 'rgba(7, 20, 48, 0.93)',
        border: '3px solid ' + C.laranja,
        borderRadius: '10px',
        padding: compacto ? '14px 14px 10px' : '20px 20px 14px',
        display: 'none'
      }, null, ui.camada);
      ui.quem = S.el('div', {
        position: 'absolute',
        top: compacto ? '-13px' : '-15px',
        left: '14px',
        padding: compacto ? '2px 10px' : '3px 12px',
        borderRadius: '6px',
        border: '3px solid #071430',
        fontWeight: '700',
        fontSize: compacto ? '12px' : '14px'
      }, '', ui.caixa);
      ui.texto = S.el('div', {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: compacto ? '13px' : '16px',
        lineHeight: '1.45',
        minHeight: compacto ? '38px' : '46px'
      }, '', ui.caixa);
      ui.seguir = S.el('div', {
        textAlign: 'right',
        color: C.laranja,
        fontWeight: '700',
        fontSize: compacto ? '11px' : '12px',
        marginTop: '2px',
        visibility: 'hidden'
      }, S.toque ? 'toque para continuar ▶' : 'clique ou Espaço ▶', ui.caixa);

      ui.camada.addEventListener('pointerdown', S.protegido('cena:toque', function (e) {
        e.preventDefault();
        avancar();
      }));
      // Faixas de cinema entram suavemente.
      setTimeout(function () {
        var alt = compacto ? '6%' : '9%';
        ui.faixaCima.style.height = alt;
        ui.faixaBaixo.style.height = alt;
        ui.titulo.style.opacity = '1';
      }, 30);
      return ui;
    }

    function mostrarFala(i) {
      var f = est.falas[i];
      var ui = est.ui;
      est.falaAtual = i;
      est.letras = 0;
      est.completa = false;
      ui.titulo.style.opacity = '0';
      ui.caixa.style.display = 'block';
      var prof = f.quem === 'prof';
      var falante = FALANTES[f.quem] || FALANTES.aluno;
      ui.caixa.style.borderColor = falante.cor;
      ui.quem.textContent = falante.nome();
      ui.quem.style.background = falante.cor;
      ui.quem.style.color = falante.texto;
      ui.texto.textContent = '';
      ui.seguir.style.visibility = 'hidden';
      S.voz.fala(f.quem, f.texto, est);
      var t = est.tomadas[f.tomada];
      irPara(v3(t.pos), v3(t.alvo), i === 0 ? 0.6 : 1.1);
      var pr = S.professor || {};
      if (prof) {
        var dur = { aceno: 1.6, tocaAqui: Infinity, explicar: 3.2, susto: 3.6 }[f.gesto] || 2.6;
        S.gestoProfessor(f.gesto, dur);
        // Ao apontar algo, o professor olha para lá; senão olha o aluno.
        pr.alvoFixo = f.olhar ? v3(f.olhar) : f.gesto === 'apontar' ? v3(t.alvo) : null;
      } else if (!est.manterGesto) {
        pr.alvoFixo = f.olhar ? v3(f.olhar) : null;
        S.gestoProfessor(null);
      }
      // Ação de cena presa à fala (ex.: o gato acorda).
      if (f.acao) S.protegido('cena:acao', f.acao)();
    }

    function avancar() {
      if (!est || est.saindo || est.etapa === 'seguir') return;
      if (est.etapa === 'chegada') {
        chegar();
        return;
      }
      if (!est.completa) {
        est.letras = est.falas[est.falaAtual].texto.length;
        return;
      }
      if (est.falaAtual + 1 < est.falas.length) mostrarFala(est.falaAtual + 1);
      else if (est.aposFalas) {
        var fn = est.aposFalas;
        est.aposFalas = null;
        est.ui.caixa.style.display = 'none';
        try {
          fn();
        } catch (e) {
          registrarErro('cena:aposFalas', e);
          terminar(true);
        }
      } else terminar(false);
    }

    // Coloca o aluno diante do professor (no fim da caminhada ou ao pular).
    function chegar() {
      var p = S.personagem;
      S.joy.x = 0;
      S.joy.z = 0;
      p.raiz.position.set(DESTINO.x, 0, DESTINO.z);
      p.angulo = Math.PI / 2;
      p.raiz.rotation.y = p.angulo;
      est.etapa = 'dialogo';
      mostrarFala(0);
    }

    function terminar(pulou) {
      if (!est || est.saindo) return;
      if (est.etapa === 'chegada') {
        var p = S.personagem;
        p.raiz.position.set(DESTINO.x, 0, DESTINO.z);
        p.angulo = Math.PI / 2;
        p.raiz.rotation.y = p.angulo;
      }
      if (est.alunoAlvo) alunoNoLugar();
      if (pulou) S.voz.parar();
      // Um erro ao pular nunca pode travar a cena.
      if (pulou && est.aoPular) S.protegido('cena:pular', est.aoPular)();
      S.joy.x = 0;
      S.joy.z = 0;
      est.saindo = true;
      est.etapa = 'saida';
      if (S.professor) S.professor.alvoFixo = null;
      var ui = est.ui;
      ui.caixa.style.display = 'none';
      ui.titulo.style.opacity = '0';
      ui.faixaCima.style.height = '0';
      ui.faixaBaixo.style.height = '0';
      ui.pular.style.display = 'none';
      ui.camada.style.pointerEvents = 'none';
      var pos = new THREE.Vector3();
      var alvo = new THREE.Vector3();
      S.poseCamera(S.personagem.raiz.position, pos, alvo);
      irPara(pos, alvo, pulou ? 0.45 : 0.9);
      est.fimEm = est.cam.dur;
    }

    function concluir() {
      var fim = est.aoFim;
      est.ui.camada.remove();
      etiquetas(true);
      S.camera.lookAt(est.alvoAtual);
      est = null;
      S.atualizarCena = null;
      fim();
    }

    // Junta as tomadas comuns com as da fase.
    function tomadasDa(cfg) {
      var t = {};
      var k;
      for (k in TOMADAS) t[k] = TOMADAS[k];
      if (cfg && cfg.tomadas) for (k in cfg.tomadas) t[k] = cfg.tomadas[k];
      return t;
    }

    S.cenaAbertura = function (aoFim) {
      var cfg = (S.faseAtual && S.faseAtual.abertura) || {};
      S.fase = 'cena';
      S.teclas = {};
      var tomadas = tomadasDa(cfg);
      est = {
        aoFim: aoFim,
        falas: (cfg.falas || roteiro)(),
        tomadas: tomadas,
        fecharPorta: !!cfg.portaAberta,
        etapa: 'chegada',
        virarAluno: true,
        tempo: 0,
        alvoAtual: v3(tomadas.abertura.alvo),
        ui: montarUi()
      };
      if (cfg.titulo) est.ui.titulo.textContent = cfg.titulo;
      etiquetas(false);
      var p = S.personagem;
      var inicio = cfg.inicio || S.CFG.inicio;
      p.raiz.position.set(inicio.x, 0, inicio.z);
      // Na fase 2 o aluno entra pela porta, que já começa aberta.
      if (cfg.portaAberta && S.mundo.porta) {
        S.mundo.porta.angulo = S.mundo.porta.alvo = 1.45;
        S.mundo.porta.dobradica.rotation.y = 1.45;
      }
      S.camera.position.copy(v3(tomadas.abertura.pos));
      S.camera.lookAt(est.alvoAtual);
      var d = tomadas.dupla;
      irPara(v3(d.pos), v3(d.alvo), 3.4);
      S.atualizarCena = atualizar;
    };

    // ---- Cena curta no meio do jogo (Cachola, toca aqui…) ----------------
    // Pausa o cronômetro enquanto roda e devolve o controle no fim.
    S.cenaCurta = function (cfg) {
      if (est) return false;
      S.pausarRelogio();
      S.fase = 'cena';
      S.teclas = {};
      S.joy.x = 0;
      S.joy.z = 0;
      S.ui.mostrarHud(false);
      if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
      if (S.limparHover) S.limparHover();
      var dirAlvo = new THREE.Vector3();
      S.camera.getWorldDirection(dirAlvo);
      est = {
        aoFim: function () {
          S.retomarRelogio();
          S.fase = 'jogo';
          S.pausado = false;
          S.ui.mostrarHud(true);
          S.ui.atualizarControlesToque();
          if (cfg.aoFim) S.protegido('cenaCurta:fim', cfg.aoFim)();
        },
        falas: cfg.falas,
        tomadas: tomadasDa(cfg),
        etapa: 'dialogo',
        virarAluno: false,
        manterGesto: !!cfg.manterGesto,
        tempo: 0,
        alvoAtual: S.camera.position.clone().add(dirAlvo.multiplyScalar(4)),
        ui: montarUi()
      };
      est.ui.titulo.textContent = '';
      etiquetas(false);
      if (cfg.aposFalas) {
        est.aposFalas = function () {
          est.etapa = 'seguir';
          est.seguir = cfg.seguir || null;
          cfg.aposFalas(function () {
            if (est) setTimeout(function () { terminar(false); }, 350);
          });
        };
      }
      if (cfg.aoPular) est.aoPular = cfg.aoPular;
      // O aluno anda até o lugar da cena (em vez de ser "teletransportado").
      if (cfg.posAluno) est.alunoAlvo = { x: cfg.posAluno.x, z: cfg.posAluno.z, angulo: cfg.posAluno.angulo, t: 0, chegou: false };
      S.atualizarCena = atualizar;
      mostrarFala(0);
      return true;
    };

    S.emCena = function () { return !!est; };

    // ---- Caminhada do aluno até a marca da cena --------------------------
    function difAng(a, b) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }
    // Devolve true enquanto anda, 'virar' depois de chegar (girando).
    function guiarAluno(dt) {
      var a = est.alunoAlvo;
      if (!a) return false;
      var p = S.personagem;
      if (a.chegou) return 'virar';
      a.t += dt;
      var dx = a.x - p.raiz.position.x;
      var dz = a.z - p.raiz.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      // Chegou (ou ficou preso em algum móvel por muito tempo): encaixa.
      if (d < 0.08 || a.t > 3.5) {
        p.raiz.position.x = a.x;
        p.raiz.position.z = a.z;
        S.joy.x = 0;
        S.joy.z = 0;
        a.chegou = true;
        return 'virar';
      }
      var f = Math.max(0.35, Math.min(1, d / 0.5));
      S.joy.x = dx / d * f;
      S.joy.z = dz / d * f;
      return true;
    }
    function virarAluno(dt) {
      var a = est.alunoAlvo;
      var p = S.personagem;
      var dif = difAng(p.angulo, a.angulo);
      p.angulo += dif * Math.min(1, dt * 9);
      p.raiz.rotation.y = p.angulo;
      if (Math.abs(dif) < 0.01) {
        p.angulo = a.angulo;
        p.raiz.rotation.y = p.angulo;
        est.alunoAlvo = null;
      }
    }
    // Termina a caminhada na hora (pulo da cena ou ação que precisa do aluno parado).
    function alunoNoLugar() {
      var a = est && est.alunoAlvo;
      if (!a) return;
      var p = S.personagem;
      p.raiz.position.x = a.x;
      p.raiz.position.z = a.z;
      p.angulo = a.angulo;
      p.raiz.rotation.y = a.angulo;
      S.joy.x = 0;
      S.joy.z = 0;
      est.alunoAlvo = null;
    }
    S.alunoNoLugar = alunoNoLugar;

    // ---- Cena final: o professor chama o aluno e sai pela porta ----------
    var camSeguir = null;
    // Câmera acompanha quem está andando (professor ou o Cachola).
    function seguirProfessor(dt) {
      var raiz = est.seguir || S.professor.raiz;
      if (!camSeguir) camSeguir = { pos: new THREE.Vector3(), alvo: new THREE.Vector3() };
      var rp = raiz.position;
      var px = Math.max(-4.6, rp.x);
      camSeguir.pos.set(px * 0.6 + 0.4, 3.9, rp.z + 5.4);
      camSeguir.alvo.set(px, 1.0, rp.z - 0.4);
      var k = 1 - Math.exp(-dt * 3);
      S.camera.position.lerp(camSeguir.pos, k);
      est.alvoAtual.lerp(camSeguir.alvo, k);
      S.camera.lookAt(est.alvoAtual);
    }

    S.cenaFinal = function (aoFim) {
      S.fase = 'cena';
      S.teclas = {};
      S.joy.x = 0;
      S.joy.z = 0;
      S.ui.mostrarHud(false);
      if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
      var dirAlvo = new THREE.Vector3();
      S.camera.getWorldDirection(dirAlvo);
      var cfg = (S.faseAtual && S.faseAtual.final) || {};
      est = {
        aoFim: aoFim,
        falas: cfg.falas(),
        tomadas: tomadasDa(cfg),
        etapa: 'dialogo',
        virarAluno: false,
        tempo: 0,
        alvoAtual: S.camera.position.clone().add(dirAlvo.multiplyScalar(4)),
        ui: montarUi()
      };
      est.ui.titulo.textContent = 'MISSÕES CONCLUÍDAS!';
      etiquetas(false);
      // Depois da fala, o professor pode sair andando (a câmera acompanha).
      if (cfg.sair) est.aposFalas = function () {
        est.etapa = 'seguir';
        S.professorSair(function () {
          if (est) setTimeout(function () { terminar(false); }, 350);
        });
      };
      if (cfg.sair) est.aoPular = function () {
        S.professorSumir();
      };
      S.atualizarCena = atualizar;
      mostrarFala(0);
    };

    function atualizar(dt) {
      if (!est) return;
      est.tempo += dt;
      var p = S.personagem;
      if (est.fecharPorta && p.raiz.position.x > -4.3 && S.mundo.porta) {
        S.mundo.porta.alvo = 0;
        est.fecharPorta = false;
      }
      if (est.etapa === 'chegada') {
        // O aluno entra andando até a mesa do professor (como se fosse o joystick).
        var dx = DESTINO.x - p.raiz.position.x;
        var dz = DESTINO.z - p.raiz.position.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.12 || est.tempo > 5) {
          chegar();
        } else {
          var f = Math.min(1, dist / 0.6);
          S.joy.x = dx / dist * Math.max(0.35, f);
          S.joy.z = dz / dist * Math.max(0.35, f);
        }
      } else if (est.etapa === 'dialogo') {
        // Na abertura o aluno fica de frente para o professor.
        if (est.virarAluno) {
          p.angulo += (Math.PI / 2 - p.angulo) * Math.min(1, dt * 8);
          p.raiz.rotation.y = p.angulo;
        }
        var f2 = est.falas[est.falaAtual];
        if (!est.completa) {
          est.letras = Math.min(f2.texto.length, est.letras + dt * 42);
          est.ui.texto.textContent = f2.texto.slice(0, Math.floor(est.letras));
          S.voz.acompanhar(f2.quem, f2.texto, est, Math.floor(est.letras));
          if (est.letras >= f2.texto.length) {
            est.completa = true;
            est.ui.seguir.style.visibility = 'visible';
          }
        }
      }
      var andando = guiarAluno(dt);
      S.atualizarMovimento(dt);
      if (andando === 'virar') virarAluno(dt);
      else if (est.etapa === 'dialogo' && !andando) p.raiz.rotation.y = p.angulo;
      if (est.etapa === 'seguir') seguirProfessor(dt);
      else atualizarCamera(dt);
      if (est.etapa === 'saida') {
        est.fimEm -= dt;
        if (est.fimEm <= 0) concluir();
      }
    }

    // Roteiros da fase 1.
    S.fases.laboratorio.abertura = { falas: roteiro, inicio: S.CFG.inicio };
    S.fases.laboratorio.final = {
      sair: true,
      falas: function () {
        return [
          { quem: 'prof', tomada: 'despedida', gesto: 'aceno', texto: 'Que bom que você conseguiu, ' + S.primeiroNome() + '! Vamos para o segundo laboratório agora! Siga-me!' }
        ];
      }
    };

    // Espaço / Enter / E avançam; Esc pula a cena.
    window.addEventListener('keydown', function (e) {
      if (S.fase !== 'cena' || !est || (S.ui.configAberta && S.ui.configAberta())) return;
      var k = (e.key || '').toLowerCase();
      if (k === ' ' || k === 'enter' || k === 'e') {
        e.preventDefault();
        if (!e.repeat) avancar();
      } else if (k === 'escape') {
        e.preventDefault();
        terminar(true);
      }
    });
  });


  /* ================================================================== */
  secao('F2A-sala-servidor', function () {
    // Fase 2: laboratório com sala do servidor separada por divisória,
    // canaleta com 3 pontas de cabo esperando tomadas keystone e 3 PCs.
    var F2 = S.f2 = {
      PCS: [
        { nome: 'PC-01', x: -3.9 },
        { nome: 'PC-02', x: -1.3 },
        { nome: 'PC-03', x: 1.3 }
      ],
      BANCADA_Z: -2.6,
      PAREDE_Z: -4.5,
      DIV: { x: 2.6, z: -0.8, alt: 2.1, porta0: 3.6, porta1: 4.65, portaAlt: 1.95 }
    };

    function texto(ctx, t, x, y, cor, fonte, alinhar) {
      ctx.fillStyle = cor;
      ctx.font = fonte;
      ctx.textAlign = alinhar || 'left';
      ctx.fillText(t, x, y);
    }

    // ---- Divisória e porta da sala do servidor ----------------------------
    function montarDivisoria() {
      var C = S.COR;
      var D = F2.DIV;
      var mDiv = S.mat(0xdfe4ea);
      var mFaixa = S.mat(C.azul);
      var e = 0.1;
      var L2 = S.SALA.largura / 2;
      var P2 = S.SALA.profundidade / 2;
      // Parede da frente (com o vão da porta) e parede lateral.
      var trechos = [[D.x, D.porta0], [D.porta1, L2]];
      trechos.forEach(function (t) {
        var larg = t[1] - t[0];
        var cx = (t[0] + t[1]) / 2;
        S.caixa(larg, D.alt, e, mDiv, cx, D.alt / 2, D.z);
        S.caixa(larg, 0.5, 0.02, mFaixa, cx, 0.25, D.z + e / 2 + 0.011, null, true);
        S.colisor(cx, D.z, larg, e);
      });
      S.caixa(D.porta1 - D.porta0, D.alt - D.portaAlt, e, mDiv, (D.porta0 + D.porta1) / 2, (D.alt + D.portaAlt) / 2, D.z, null, true);
      var compLado = D.z + P2;
      S.caixa(e, D.alt, compLado, mDiv, D.x, D.alt / 2, -P2 + compLado / 2);
      S.caixa(0.02, 0.5, compLado, mFaixa, D.x - e / 2 - 0.011, 0.25, -P2 + compLado / 2, null, true);
      S.colisor(D.x, -P2 + compLado / 2, e, compLado);
      S.caixa(e + 0.04, 0.05, compLado + 0.04, S.mat(C.laranja), D.x, D.alt + 0.02, -P2 + compLado / 2, null, true);
      S.caixa(L2 - D.x + 0.04, 0.05, e + 0.04, S.mat(C.laranja), (D.x + L2) / 2, D.alt + 0.02, D.z, null, true);

      // Placa "SALA DO SERVIDOR".
      var tex = S.textura(128, 24, function (ctx, w, h) {
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, h - 3, w, 3);
        texto(ctx, 'SALA DO SERVIDOR', w / 2, 15, '#FFFFFF', 'bold 11px Arial', 'center');
      });
      var placa = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.18), new THREE.MeshLambertMaterial({ map: tex }));
      placa.position.set((D.x + D.porta0) / 2, 1.65, D.z + e / 2 + 0.012);
      S.adicionar(placa);

      // Porta com dobradiça (abre para dentro da sala do servidor).
      var larg = D.porta1 - D.porta0;
      var dob = S.grupo(D.porta0, 0, D.z);
      var folha = S.caixa(larg, D.portaAlt, 0.05, S.mat(C.madeiraEscura), larg / 2, D.portaAlt / 2, 0, dob);
      var mMac = S.mat(C.metal);
      var m1 = S.caixa(0.16, 0.05, 0.05, mMac, larg - 0.15, 0.98, 0.05, dob, true);
      var m2 = S.caixa(0.16, 0.05, 0.05, mMac, larg - 0.15, 0.98, -0.05, dob, true);
      var visor = S.caixa(0.3, 0.42, 0.06, S.mat(0xa9d6f5, { emissive: 0x4f86b5, emissiveIntensity: 0.3 }), larg / 2, 1.45, 0, dob, true);
      S.colisor((D.porta0 + D.porta1) / 2, D.z, larg, e);
      F2.porta = {
        dobradica: dob,
        aberta: false,
        angulo: 0,
        alvo: 0,
        colisor: S.colisores[S.colisores.length - 1]
      };
      F2.porta.info = S.interativo([folha, m1, m2, visor], {
        id: 'portaServidor',
        nome: 'Porta da sala do servidor',
        ancora: new THREE.Vector3((D.porta0 + D.porta1) / 2, 0, D.z + 0.75)
      });
    }

    // Abre/fecha a porta. Não fecha com alguém no vão.
    F2.alternarPorta = function () {
      var p = F2.porta;
      var D = F2.DIV;
      if (p.aberta) {
        var pos = S.personagem.raiz.position;
        if (pos.x > D.porta0 - 0.1 && pos.x < D.porta1 + 0.1 && Math.abs(pos.z - D.z) < 0.45) {
          S.aviso('Saia da passagem para fechar a porta.', 'alerta');
          return;
        }
        p.aberta = false;
        p.alvo = 0;
        S.colisores.push(p.colisor);
      } else {
        p.aberta = true;
        S.som('porta');
        p.alvo = 1.45;
        var i = S.colisores.indexOf(p.colisor);
        if (i >= 0) S.colisores.splice(i, 1);
      }
    };

    F2.atualizarPorta = function (dt) {
      var p = F2.porta;
      if (!p || p.angulo === p.alvo) return;
      p.angulo += (p.alvo - p.angulo) * Math.min(1, dt * 5);
      if (Math.abs(p.alvo - p.angulo) < 0.002) p.angulo = p.alvo;
      p.dobradica.rotation.y = p.angulo;
    };

    // ---- Rack, servidor e console --------------------------------------
    function montarSalaServidor() {
      var C = S.COR;
      var rx = 5.3;
      var rz = -3.95;
      var g = S.grupo(rx, 0, rz);
      var mRack = S.mat(C.metalEscuro);
      [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]].forEach(function (p) {
        S.caixa(0.05, 1.9, 0.05, mRack, p[0], 0.95, p[1], g);
      });
      S.caixa(0.66, 0.05, 0.62, mRack, 0, 1.9, 0, g);
      S.caixa(0.66, 0.08, 0.62, mRack, 0, 0.04, 0, g);
      S.caixa(0.6, 1.85, 0.02, mRack, 0, 0.95, -0.28, g, true);
      S.colisor(rx, rz, 0.75, 0.7);

      function frente(largPx, altPx, larg, alt, prof, y, corLado) {
        var tex = S.textura(largPx, altPx, null);
        var mLado = S.mat(corLado);
        var mats = [mLado, mLado, mLado, mLado, new THREE.MeshLambertMaterial({ map: tex }), mLado];
        var malha = new THREE.Mesh(new THREE.BoxGeometry(larg, alt, prof), mats);
        malha.position.set(0, y, 0.02);
        malha.castShadow = true;
        g.add(malha);
        return { tex: tex, malha: malha };
      }
      F2.rack = {
        roteador: frente(128, 16, 0.5, 0.06, 0.3, 1.75, 0xe9edf2),
        patch: frente(128, 16, 0.56, 0.06, 0.1, 1.55, 0x2a3038),
        sw: frente(128, 16, 0.56, 0.06, 0.32, 1.42, 0x3a434f),
        servidor: frente(128, 32, 0.56, 0.14, 0.5, 0.75, 0x30363f)
      };
      // Cabos do patch panel para o switch (já instalados).
      for (var i = 0; i < 4; i++) {
        S.caixa(0.012, 0.13, 0.012, S.mat(C.caboAzul), -0.2 + i * 0.03, 1.49, 0.22, g, true);
      }

      // Mesa do console com monitor e teclado.
      var cx = 3.4;
      var cz = -3.95;
      var mesa = S.grupo(cx, 0, cz);
      S.caixa(1.0, 0.05, 0.6, S.mat(C.madeira), 0, 0.76, 0, mesa);
      S.caixa(0.05, 0.74, 0.5, S.mat(C.metalEscuro), -0.45, 0.37, 0, mesa);
      S.caixa(0.05, 0.74, 0.5, S.mat(C.metalEscuro), 0.45, 0.37, 0, mesa);
      S.colisor(cx, cz, 1.0, 0.6);
      var mPreto = S.mat(C.plastico);
      S.caixa(0.2, 0.02, 0.14, mPreto, 0, 0.79, -0.12, mesa);
      S.caixa(0.05, 0.18, 0.05, mPreto, 0, 0.88, -0.15, mesa);
      var moldura = S.caixa(0.62, 0.4, 0.05, mPreto, 0, 1.15, -0.13, mesa);
      F2.texConsole = S.textura(96, 56, null);
      var telaC = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({ map: F2.texConsole }));
      telaC.position.set(0, 1.15, -0.103);
      mesa.add(telaC);
      var teclado = S.caixa(0.44, 0.02, 0.14, mPreto, 0, 0.79, 0.12, mesa, true);
      // Cadeira do console.
      var cad = S.grupo(0, 0, 0.62, mesa);
      S.caixa(0.44, 0.06, 0.42, S.mat(C.azul), 0, 0.46, 0, cad);
      S.caixa(0.44, 0.46, 0.05, S.mat(C.azul), 0, 0.74, 0.2, cad);
      S.caixa(0.05, 0.42, 0.05, mRack, 0, 0.23, 0, cad);

      F2.infoServidor = S.interativo([F2.rack.servidor.malha, moldura, telaC, teclado], {
        id: 'servidor',
        nome: 'Servidor SRV-01',
        ancora: new THREE.Vector3(4.0, 0, -2.85)
      });
      F2.desenharRack();
    }

    F2.desenharRack = function () {
      var srv = F2.srv;
      var R = F2.rack;
      if (!R) return;
      R.roteador.tex.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#E9EDF2';
        ctx.fillRect(0, 0, w, h);
        texto(ctx, 'ROTEADOR', 4, 11, '#0B4F9C', 'bold 8px Arial');
        ctx.fillStyle = '#123';
        ctx.fillRect(60, 3, 54, 10);
        texto(ctx, '192.168.0.1', 87, 11, '#6BF08E', '7px Arial', 'center');
        ctx.fillStyle = '#39FF6A';
        ctx.fillRect(118, 6, 4, 4);
      });
      R.patch.tex.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#2A3038';
        ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 12; i++) {
          ctx.fillStyle = '#0A0C0F';
          ctx.fillRect(8 + i * 9.5, 5, 7, 6);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(8 + i * 9.5, 2, 7, 1);
        }
      });
      R.sw.tex.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#3A434F';
        ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 12; i++) {
          var x = 8 + i * 9.5;
          ctx.fillStyle = '#0A0C0F';
          ctx.fillRect(x, 6, 7, 7);
          var aceso = (i < 3 && F2.tomadas && F2.tomadas[i] && F2.tomadas[i].instalada && S.pcs[F2.PCS[i].nome].estado.ligado) ||
            (i === 11 && srv && srv.ligado) || i === 10;
          ctx.fillStyle = aceso ? '#39FF6A' : '#1D2A1F';
          ctx.fillRect(x + 2, 2, 3, 2);
        }
      });
      R.servidor.tex.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#30363F';
        ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 4; i++) {
          ctx.fillStyle = '#1A1E24';
          ctx.fillRect(6 + i * 18, 6, 15, 20);
          ctx.fillStyle = srv && srv.ligado ? '#39FF6A' : '#2A3530';
          ctx.fillRect(8 + i * 18, 22, 2, 2);
        }
        texto(ctx, 'SRV-01', 100, 14, '#FFFFFF', 'bold 9px Arial', 'center');
        ctx.fillStyle = srv && srv.ligado ? '#39FF6A' : '#2A3530';
        ctx.beginPath();
        ctx.arc(100, 23, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (F2.texConsole) {
        F2.texConsole.redesenhar(function (ctx, w, h) {
          if (!srv || !srv.ligado) {
            ctx.fillStyle = '#04070C';
            ctx.fillRect(0, 0, w, h);
            texto(ctx, 'SRV-01', w / 2, h / 2 + 4, '#1A2534', 'bold 11px Arial', 'center');
            return;
          }
          ctx.fillStyle = '#1F3B5C';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#0B4F9C';
          ctx.fillRect(0, 0, w, 10);
          texto(ctx, 'Gerenciador do Servidor', 3, 8, '#FFFFFF', 'bold 7px Arial');
          var itens = [
            ['IP fixo', srv.configurado],
            ['DHCP', srv.dhcp.ativo],
            ['DNS', F2.dnsPronto()],
            ['HTTPS', srv.https.ativo]
          ];
          itens.forEach(function (it, i) {
            ctx.fillStyle = it[1] ? '#1E8E3E' : '#6A7586';
            ctx.fillRect(4, 14 + i * 10, 6, 6);
            texto(ctx, it[0], 14, 20 + i * 10, '#FFFFFF', '7px Arial');
          });
        });
      }
    };

    // ---- Canaleta e as 3 pontas de cabo / tomadas -----------------------
    function montarCanaleta() {
      var C = S.COR;
      var z = F2.PAREDE_Z + 0.06;
      var mCan = S.mat(0xf2f4f7);
      S.caixa(8.3, 0.08, 0.06, mCan, -1.45, 0.42, z, null, true);
      F2.tomadas = F2.PCS.map(function (p, i) {
        var tx = p.x + 0.45;
        var g = S.grupo(tx, 0.3, z + 0.02);
        // Caixa aberta com a ponta do cabo pendurada.
        var caixa = S.caixa(0.12, 0.14, 0.05, S.mat(0x8a96a6), 0, 0, 0, g, true);
        var ponta = S.cilindro(0.014, 0.014, 0.26, 5, S.mat(C.caboAzul), 0.03, -0.14, 0.04, g);
        ponta.rotation.z = 0.35;
        var fios = S.caixa(0.04, 0.04, 0.02, S.mat(0xf7861d), 0.07, -0.27, 0.04, g, true);
        // Espelho com a keystone (aparece depois de instalar).
        var espelho = S.caixa(0.12, 0.16, 0.03, S.mat(0xffffff), 0, 0, 0.01, g, true);
        var ks = S.caixa(0.05, 0.05, 0.02, S.mat(C.caboAzul), 0, 0.02, 0.03, g, true);
        espelho.visible = false;
        ks.visible = false;
        // Área de clique maior que a peça (fica invisível).
        var alvo = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.25), new THREE.MeshBasicMaterial({ visible: false }));
        alvo.position.set(0, 0, 0.05);
        g.add(alvo);
        var t = { n: i + 1, pc: p.nome, grupo: g, caixa: caixa, ponta: ponta, fios: fios, espelho: espelho, ks: ks, instalada: false, x: tx, z: z };
        t.info = S.interativo([alvo, caixa, ponta], {
          id: 'tomada:' + (i + 1),
          nome: 'Ponto de rede ' + (i + 1) + ' (' + p.nome + ')',
          tomada: t,
          ancora: new THREE.Vector3(tx, 0, F2.PAREDE_Z + 0.75)
        });
        return t;
      });
    }

    // Mostra o espelho e liga o patch cord do PC até a tomada.
    F2.instalarTomada = function (t) {
      t.instalada = true;
      t.caixa.visible = false;
      t.ponta.visible = false;
      t.fios.visible = false;
      t.espelho.visible = true;
      t.ks.visible = true;
      var pc = S.pcs[t.pc];
      var a = S.posMundo(pc.porta);
      var b = new THREE.Vector3(t.x, 0.32, t.z + 0.06);
      var curva = new THREE.CatmullRomCurve3([
        a,
        new THREE.Vector3(a.x, a.y - 0.25, a.z - 0.12),
        new THREE.Vector3((a.x + b.x) / 2, 0.06, (a.z + b.z) / 2),
        new THREE.Vector3(b.x, 0.1, b.z + 0.12),
        b
      ]);
      var tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.016, 4), S.mat(S.COR.caboAzul));
      S.adicionar(tubo);
      pc.estado.conectado = true;
      pc.estado.portaSwitch = 'tomada ' + t.n;
      S.mundo.desenharTela(pc);
      F2.desenharRack();
    };

    // ---- Bancada com as keystones e a punch down -------------------------
    function montarBancadaKeystone() {
      var C = S.COR;
      var bx = -4.9;
      var bz = 0.9;
      var g = S.grupo(bx, 0, bz);
      var mPe = S.mat(C.metalEscuro);
      S.caixa(1.6, 0.05, 0.8, S.mat(C.madeira), 0, 0.76, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, -0.72, 0.37, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, 0.72, 0.37, 0, g);
      S.colisor(bx, bz, 1.6, 0.8);
      var topo = S.grupo(0, 0.785, 0, g);
      var caixa = S.caixa(0.3, 0.1, 0.22, S.mat(0xd9dee4), -0.45, 0.05, 0.1, topo);
      var kits = [];
      for (var i = 0; i < 3; i++) {
        kits.push(S.caixa(0.06, 0.05, 0.06, S.mat(C.caboAzul), -0.55 + i * 0.1, 0.12, 0.1, topo));
      }
      var cabo = S.caixa(0.05, 0.22, 0.05, S.mat(0xf2c200), 0.25, 0.04, 0.15, topo);
      cabo.rotation.z = Math.PI / 2;
      var ponteira = S.caixa(0.08, 0.02, 0.02, S.mat(C.metal), 0.41, 0.04, 0.15, topo, true);
      var espelhos = S.caixa(0.14, 0.03, 0.18, S.mat(0xffffff), 0.6, 0.015, 0.0, topo);
      F2.kitMalhas = kits;
      S.interativo([caixa, cabo, ponteira, espelhos].concat(kits), {
        id: 'kitKeystone',
        nome: 'Keystones e ferramenta punch down',
        ancora: new THREE.Vector3(bx + 0.1, 0, bz + 0.9)
      });
      S.mundo.criarCartaz(g, bx, bz);
    }

    // ---- Montagem da sala inteira ----------------------------------------
    F2.montarSala = function () {
      S.mundo.montarSala({ quadroX: -1.3, placaX: -4.55, janelas: [-2.8, 0.75, 2.6] });
      montarDivisoria();
    };
    F2.montarEquipamentos = function () {
      montarSalaServidor();
      F2.PCS.forEach(function (p) {
        S.mundo.criarPc(p.nome, p.x, F2.BANCADA_Z, true, 1.8);
      });
      montarCanaleta();
      montarBancadaKeystone();
    };
  });


  /* ================================================================== */
  secao('F2B-estado-e-missoes', function () {
    var F2 = S.f2;
    var J = S.jogo;
    var DOMINIO = 'senac.lan';
    var SITE = 'intranet.' + DOMINIO;
    var ARQUIVO = 'boasvindas.html';
    var IP_SRV = '192.168.0.10';
    F2.DOMINIO = DOMINIO;
    F2.SITE = SITE;
    F2.ARQUIVO = ARQUIVO;
    F2.IP_SRV = IP_SRV;

    F2.reiniciar = function () {
      F2.kit = false;
      F2.siteAberto = false;
      F2.srv = {
        nome: 'SRV-01',
        ligado: false,
        configurado: false,
        ip: null,
        mascara: null,
        gateway: null,
        dnsLocal: null,
        dhcp: { ativo: false, inicio: null, fim: null, mascara: null, gateway: null, dns: null, concessoes: {} },
        dns: { registros: [{ nome: 'srv01', ip: IP_SRV, fixo: true }] },
        https: { ativo: false, porta: null, cert: null }
      };
    };
    F2.reiniciar();

    function pc(n) { return S.pcs[n].estado; }
    function nomesPcs() { return F2.PCS.map(function (p) { return p.nome; }); }
    function contar(fn) { return nomesPcs().filter(function (n) { return fn(pc(n)); }).length; }
    F2.tomadasInstaladas = function () {
      return (F2.tomadas || []).filter(function (t) { return t.instalada; }).length;
    };
    F2.dnsPronto = function () {
      return F2.srv.dns.registros.some(function (r) { return r.nome === 'intranet' && r.ip === IP_SRV; });
    };
    function alvosServidor() {
      return F2.porta && !F2.porta.aberta && S.personagem && S.personagem.raiz.position.z > F2.DIV.z ? ['portaServidor'] : ['servidor'];
    }

    F2.MISSOES = [
      {
        id: 'srvLigar',
        quadro: 'Ligar o servidor SRV-01',
        texto: 'Entre na sala do servidor (abra a porta) e ligue o servidor SRV-01.',
        feita: function () { return F2.srv.ligado; },
        alvos: alvosServidor,
        dica1: 'A sala do servidor fica no fundo, à direita. Abra a porta e use o servidor (rack/console).',
        dica2: 'Na frente do servidor, aperte o botão de energia (círculo com um traço em cima).'
      },
      {
        id: 'srvIp',
        quadro: 'IP fixo no servidor (.10)',
        texto: 'No console do servidor, dê a ele o IP fixo 192.168.0.10 (aba Rede).',
        feita: function () { return F2.srv.configurado; },
        alvos: alvosServidor,
        dica1: 'Servidores usam IP fixo: os PCs precisam saber sempre onde ele está.',
        dica2: 'IP 192.168.0.10 · Máscara 255.255.255.0 · Gateway 192.168.0.1 (roteador) · DNS 127.0.0.1 (ele mesmo).'
      },
      {
        id: 'kit',
        quadro: 'Pegar keystones + punch down',
        texto: 'Pegue as keystones e a ferramenta punch down na bancada perto da porta.',
        feita: function () { return F2.kit || F2.tomadasInstaladas() === 3; },
        alvos: function () { return ['kitKeystone']; },
        dica1: 'A bancada de ferramentas fica à esquerda, perto da porta de entrada.',
        dica2: 'Use a bancada: você leva as 3 keystones e a ferramenta de uma vez.'
      },
      {
        id: 'tomadas',
        quadro: 'Instalar 3 tomadas keystone',
        texto: function () { return 'Instale as tomadas keystone nos pontos de rede da parede (' + F2.tomadasInstaladas() + '/3).'; },
        feita: function () { return F2.tomadasInstaladas() === 3; },
        alvos: function () {
          return (F2.tomadas || []).filter(function (t) { return !t.instalada; }).map(function (t) { return 'tomada:' + t.n; });
        },
        dica1: 'Os pontos de rede ficam na canaleta da parede do fundo, atrás de cada PC.',
        dica2: 'Na keystone, siga a linha B da etiqueta (T-568B): branco-laranja, laranja, branco-verde, azul, branco-azul, verde, branco-marrom, marrom.'
      },
      {
        id: 'dhcp',
        quadro: 'Configurar o DHCP',
        texto: 'No servidor, crie o escopo DHCP para entregar IPs automáticos aos PCs.',
        feita: function () { return F2.srv.dhcp.ativo; },
        alvos: alvosServidor,
        dica1: 'Aba DHCP do Gerenciador: defina a faixa de IPs que os PCs vão receber.',
        dica2: 'Ex.: de 192.168.0.100 a 192.168.0.150 · Máscara 255.255.255.0 · Gateway 192.168.0.1 · DNS 192.168.0.10.'
      },
      {
        id: 'dns',
        quadro: 'DNS: ' + SITE,
        texto: 'No DNS do servidor, crie o nome ' + SITE + ' apontando para o servidor.',
        feita: function () { return F2.dnsPronto(); },
        alvos: alvosServidor,
        dica1: 'Aba DNS: adicione um registro do tipo A na zona ' + DOMINIO + '.',
        dica2: 'Nome do host: intranet · Endereço IP: 192.168.0.10 (o próprio servidor).'
      },
      {
        id: 'https',
        quadro: 'Publicar o site com HTTPS',
        texto: 'Publique o site do servidor com HTTPS (porta e certificado certos).',
        feita: function () { return F2.srv.https.ativo; },
        alvos: alvosServidor,
        dica1: 'Aba HTTPS: escolha a porta do HTTPS e o certificado com o nome do site.',
        dica2: 'HTTPS usa a porta 443 e o certificado precisa ser de ' + SITE + '.'
      },
      {
        id: 'pcsLigar',
        quadro: 'Ligar os 3 PCs',
        texto: function () { return 'Ligue os três computadores (' + contar(function (e) { return e.ligado; }) + '/3).'; },
        feita: function () { return contar(function (e) { return e.ligado; }) === 3; },
        alvos: function () {
          return nomesPcs().filter(function (n) { return !pc(n).ligado; }).map(function (n) { return 'pc:' + n; });
        },
        dica1: 'Os três PCs ficam na fileira de bancadas do fundo.',
        dica2: 'Em cada PC, aperte o botão de energia do gabinete.'
      },
      {
        id: 'pcsDhcp',
        quadro: 'IP automático (DHCP) nos 3 PCs',
        texto: function () { return 'Em cada PC, escolha "Obter IP automaticamente" e receba o IP do DHCP (' + contar(function (e) { return e.dhcp; }) + '/3).'; },
        feita: function () { return contar(function (e) { return e.dhcp; }) === 3; },
        alvos: function () {
          return nomesPcs().filter(function (n) { return !pc(n).dhcp; }).map(function (n) { return 'pc:' + n; });
        },
        dica1: 'Use o PC → Configurações de Rede → "Obter endereço IP automaticamente (DHCP)".',
        dica2: 'Se o PC ficar com 169.254.x.x, o DHCP não respondeu: confira a tomada keystone e o escopo no servidor.'
      },
      {
        id: 'site',
        quadro: 'Abrir o site pelo nome',
        texto: 'Num dos PCs, abra o Navegador e acesse https://' + SITE + '/' + ARQUIVO,
        feita: function () { return F2.siteAberto; },
        alvos: function () { return ['pc:PC-01']; },
        dica1: 'Use um PC → Navegador e digite o endereço pelo nome (não pelo IP).',
        dica2: 'Endereço: https://' + SITE + '/' + ARQUIVO
      }
    ];
  });

  /* ================================================================== */
  secao('F2C-acoes', function () {
    var F2 = S.f2;
    var J = S.jogo;
    var MG = S.minigames;

    F2.rotulo = function (info) {
      if (info.id === 'portaServidor') return F2.porta.aberta ? 'Fechar a porta da sala do servidor' : 'Abrir a porta da sala do servidor';
      if (info.id === 'servidor') return F2.srv.ligado ? 'Usar o servidor (console)' : 'Ligar o servidor';
      if (info.id === 'kitKeystone') return F2.kit ? 'Keystones (já pegou)' : 'Pegar keystones e punch down';
      if (info.tomada) {
        var t = info.tomada;
        if (t.instalada) return 'Ponto de rede ' + t.n + ' (instalado)';
        return J.mao && J.mao.tipo === 'keystone' ? 'Instalar keystone no ponto ' + t.n : 'Ver ponto de rede ' + t.n;
      }
      if (info.pc) return info.pc.estado.ligado ? 'Usar ' + info.pc.nome : 'Ligar ' + info.pc.nome;
      return null;
    };

    F2.usar = function (info) {
      if (info.id === 'portaServidor') return F2.alternarPorta();
      if (info.id === 'servidor') return usarServidor();
      if (info.id === 'kitKeystone') return pegarKit();
      if (info.tomada) return usarTomada(info.tomada);
      if (info.pc) return usarPc(info.pc);
    };

    function usarServidor() {
      if (!F2.srv.ligado) {
        MG.gabinete({ nome: 'servidor SRV-01' }, function () {
          F2.srv.ligado = true;
          F2.desenharRack();
          S.aviso('Servidor ligado! Agora configure-o pelo console.', 'ok', 3000);
          J.atualizarMissoes();
        });
        return;
      }
      MG.servidor();
    }

    function pegarKit() {
      if (F2.kit || F2.tomadasInstaladas() === 3) {
        S.aviso(F2.tomadasInstaladas() === 3 ? 'As três tomadas já foram instaladas.' : 'Você já está com as keystones e a punch down.', 'info');
        return;
      }
      F2.kit = true;
      S.som('pegar');
      F2.kitMalhas.forEach(function (m) { m.visible = false; });
      J.definirMao({ tipo: 'keystone', rotulo: '3 keystones + punch down' });
      S.aviso('Você pegou 3 keystones e a ferramenta punch down. Vá até os pontos de rede da parede.', 'ok', 3600);
      J.atualizarMissoes();
    }

    function usarTomada(t) {
      if (t.instalada) {
        S.aviso('Ponto ' + t.n + ': keystone instalada e ' + t.pc + ' conectado com patch cord.', 'info');
        return;
      }
      if (!F2.kit) {
        S.aviso('O cabo já está passado, mas falta a tomada. Pegue as keystones e a punch down na bancada.', 'alerta', 3600);
        return;
      }
      MG.keystone(t, function () {
        F2.instalarTomada(t);
        var restam = 3 - F2.tomadasInstaladas();
        if (!restam) J.definirMao(null);
        else J.definirMao({ tipo: 'keystone', rotulo: restam + ' keystone' + (restam > 1 ? 's' : '') + ' + punch down' });
        S.aviso('Tomada ' + t.n + ' instalada e ' + t.pc + ' conectado!' + (restam ? ' Faltam ' + restam + '.' : ''), 'ok', 3200);
        J.atualizarMissoes();
      });
    }

    function usarPc(pc) {
      if (!pc.estado.ligado) {
        MG.gabinete(pc, function () {
          S.ligarPc(pc, true);
          F2.desenharRack();
          S.aviso(pc.nome + ' ligado.', 'ok', 2000);
          J.atualizarMissoes();
        });
        return;
      }
      MG.desktopFase2(pc);
    }

    // Fim da fase 2: o professor chama o aluno para o Lab 3 e sai pela porta.
    F2.concluir = function () {
      J.encerrarFase('Site aberto pelo nome, com HTTPS!', function () {
        S.fase = 'jogo';
        S.pausado = false;
        S.ui.mostrarHud(true);
        S.ui.atualizarControlesToque();
        J.liberarSaida();
      });
    };

    F2.resumo = function () {
      var d = F2.srv.dhcp;
      return 'Servidor ' + F2.IP_SRV + ' · DHCP ' + d.inicio + ' a ' + d.fim + ' · DNS ' + F2.SITE + ' → ' + F2.IP_SRV +
        ' · HTTPS porta 443 · PCs: ' + F2.PCS.map(function (p) { return p.nome + ' ' + S.pcs[p.nome].estado.ip; }).join(', ');
    };
  });

  /* ================================================================== */
  secao('F2D-keystone', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var J = S.jogo;

    // Keystone: a etiqueta tem duas linhas de cores (A e B). O aluno encaixa
    // cada fio no contato certo seguindo a linha B (T-568B), bate com a
    // punch down e encaixa no espelho.
    // opcoes.semPatch: só monta a tomada (o patch cord vem depois, na fase 3).
    MG.keystone = function (t, aoConcluir, opcoes) {
      opcoes = opcoes || {};
      var m = S.ui.abrirModal('Tomada keystone · ponto ' + t.n + ' (' + t.pc + ')', { largura: '760px' });
      var ap = S.ui.compacto();
      var erros = 0;
      var selecionado = null;
      var colocados = [];
      S.el('div', { marginBottom: '8px' },
        'Escolha um fio e toque no contato da keystone. Cada contato tem duas cores na etiqueta: siga a linha B (T-568B), o mesmo padrão dos cabos.', m.corpo);

      var corpoK = S.el('div', {
        background: '#0F1C30',
        border: '3px solid #071430',
        borderRadius: '10px',
        padding: ap ? '8px' : '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: ap ? '6px' : '10px'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);

      function marca(f, rotulo, pai) {
        var l = S.el('div', { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: rotulo === 'B' ? '#FFFFFF' : '#8FA3BC' }, null, pai);
        S.el('span', { width: '10px' }, rotulo, l);
        // Faixa horizontal: listras verticais deixam o "branco-x" visível.
        var faixa = S.el('div', {
          width: (ap ? 30 : 40) + 'px',
          height: S.cfg.daltonismo ? '14px' : '12px',
          background: f.listrado ? 'repeating-linear-gradient(90deg, #F4F4F4 0px, #F4F4F4 5px, ' + f.cor + ' 5px, ' + f.cor + ' 9px)' : f.cor,
          border: '2px solid #071430',
          borderRadius: '3px',
          boxSizing: 'border-box'
        }, null, l);
        MG.marcarFio(faixa, f, true);
      }

      var slots = [];
      for (var i = 0; i < 8; i++) {
        (function (i) {
          var b = S.el('button', {
            background: '#1B2B44',
            border: '2px solid #4A5D7A',
            borderRadius: '8px',
            padding: ap ? '4px' : '6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: '#FFFFFF',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }, null, corpoK);
          b.type = 'button';
          b.setAttribute('aria-label', 'Contato ' + (i + 1));
          S.el('div', { fontSize: '11px', fontWeight: '700' }, 'Contato ' + (i + 1), b);
          marca(S.T568A[i], 'A', b);
          marca(S.T568B[i], 'B', b);
          var vaga = S.el('div', { height: ap ? '14px' : '18px', width: '80%', border: '2px dashed #4A5D7A', borderRadius: '4px', boxSizing: 'border-box' }, null, b);
          b.addEventListener('click', S.protegido('keystone:slot', function () { colocar(i); }));
          slots.push({ botao: b, vaga: vaga, fio: null });
        })(i);
      }

      var bandeja = S.el('div', { display: 'flex', flexWrap: 'wrap', gap: ap ? '6px' : '8px', marginTop: '10px' }, null, m.corpo);
      var botoesFio = {};
      S.embaralhar(S.T568B).forEach(function (f) {
        var b = S.el('button', {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#071733',
          border: '2px solid ' + C.borda,
          borderRadius: '8px',
          padding: ap ? '4px 8px' : '6px 10px',
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          touchAction: 'manipulation'
        }, null, bandeja);
        b.type = 'button';
        b.setAttribute('aria-label', f.nome);
        MG.desenharFio(f, 14, ap ? 22 : 26, b, true);
        S.el('span', null, f.nome, b);
        b.addEventListener('click', function () {
          if (b.disabled) return;
          selecionado = f;
          Object.keys(botoesFio).forEach(function (k) { botoesFio[k].style.borderColor = C.borda; });
          b.style.borderColor = C.laranja;
          msg('Fio ' + f.nome + ' na mão: toque no contato certo.', 'info');
        });
        botoesFio[f.id] = b;
      });

      var acoes = S.el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }, null, m.corpo);
      var bBater = S.ui.botao('Bater os fios com a punch down', 'primario', bater, acoes);
      bBater.style.display = 'none';
      var bEncaixar = S.ui.botao(opcoes.semPatch ? 'Encaixar a keystone no espelho ▶' : 'Encaixar no espelho e ligar o patch cord do ' + t.pc + ' ▶', 'primario', encaixar, acoes);
      bEncaixar.style.display = 'none';

      function colocar(i) {
        var s = slots[i];
        if (s.fio) return;
        if (!selecionado) {
          msg('Primeiro escolha um fio na bandeja abaixo.', 'info');
          return;
        }
        var certo = S.T568B[i];
        var f = selecionado;
        if (f.id !== certo.id) {
          J.erros++;
          erros++;
          var corA = S.T568A[i];
          msg(f.id === corA.id
            ? '✖ Essa é a cor da linha A (T-568A). Os cabos foram feitos em T-568B: siga a linha B da etiqueta.'
            : '✖ O contato ' + (i + 1) + ' pede ' + certo.nome + ' (linha B).', 'erro');
          if (erros === 2) MG.referencia(m.corpo, ap);
          return;
        }
        s.fio = f;
        S.som('fio');
        S.estilo(s.vaga, MG.fio(f, 0, 0));
        S.estilo(s.vaga, { width: '80%', height: ap ? '14px' : '18px', border: '2px solid #071430' });
        MG.marcarFio(s.vaga, f, true);
        s.botao.style.borderColor = '#1E8E3E';
        botoesFio[f.id].disabled = true;
        botoesFio[f.id].style.opacity = '0.35';
        selecionado = null;
        colocados.push(i);
        if (colocados.length === 8) {
          msg('Todos os fios no lugar! Agora bata com a punch down para prender e cortar as sobras.', 'ok');
          bBater.style.display = '';
        } else {
          msg('Certo! ' + colocados.length + '/8 fios.', 'ok');
        }
      }

      function bater() {
        S.som('punch');
        bBater.style.display = 'none';
        slots.forEach(function (s) {
          s.vaga.style.borderColor = '#F2C200';
        });
        msg('Tac! Fios presos e sobras cortadas. Agora encaixe a keystone no espelho da parede.', 'ok');
        bEncaixar.style.display = '';
      }

      function encaixar() {
        S.som('plugue');
        bEncaixar.style.display = 'none';
        msg(opcoes.semPatch ? '✔ Tomada ' + t.n + ' montada e encaixada no espelho!' : '✔ Keystone encaixada no espelho e ' + t.pc + ' ligado com patch cord!', 'ok');
        setTimeout(function () {
          m.fechar(true);
          aoConcluir();
        }, 900);
      }
    };
  });

  /* ================================================================== */
  secao('F2E-gerenciador-servidor', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var J = S.jogo;
    var F2 = S.f2;

    function caixaInfo(texto, pai, tipo) {
      return S.el('div', {
        background: tipo === 'aviso' ? '#FFF4D6' : '#E3EEFB',
        border: '2px solid ' + (tipo === 'aviso' ? '#D9A21B' : '#7FA7D9'),
        borderRadius: '6px',
        padding: '6px 8px',
        marginBottom: '8px',
        fontSize: '12px',
        color: tipo === 'aviso' ? '#5A4300' : '#14365F'
      }, texto, pai);
    }

    // Botões de escolha (melhor que <select> no celular).
    function escolhas(pai, opcoes, valor, aoMudar) {
      var linha = S.el('div', { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }, null, pai);
      var atual = valor;
      var bs = opcoes.map(function (o) {
        var b = S.el('button', {
          padding: '6px 10px',
          borderRadius: '6px',
          border: '2px solid #8A96A6',
          background: '#FFFFFF',
          color: '#10203A',
          fontWeight: '700',
          fontSize: '12px',
          cursor: 'pointer',
          touchAction: 'manipulation'
        }, o.rotulo, linha);
        b.type = 'button';
        b.addEventListener('click', function () {
          atual = o.valor;
          marcar();
          if (aoMudar) aoMudar(atual);
        });
        return { b: b, v: o.valor };
      });
      function marcar() {
        bs.forEach(function (x) {
          var on = x.v === atual;
          x.b.style.background = on ? '#0B4F9C' : '#FFFFFF';
          x.b.style.color = on ? '#FFFFFF' : '#10203A';
          x.b.style.borderColor = on ? '#071430' : '#8A96A6';
        });
      }
      marcar();
      return { valor: function () { return atual; } };
    }

    MG.servidor = function (abaInicial) {
      var srv = F2.srv;
      var m = S.ui.abrirModal('SRV-01 · Gerenciador do Servidor', { largura: '760px' });
      var chips = S.el('div', { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }, null, m.corpo);
      var abas = S.el('div', { display: 'flex', gap: '4px', flexWrap: 'wrap' }, null, m.corpo);
      var painel = S.el('div', {
        background: '#F2F5F9',
        color: '#10203A',
        border: '3px solid #071430',
        borderRadius: '0 8px 8px 8px',
        padding: '12px 14px'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);
      var LISTA = [
        { id: 'rede', nome: 'Rede (IP fixo)', ok: function () { return srv.configurado; }, montar: abaRede },
        { id: 'dhcp', nome: 'DHCP', ok: function () { return srv.dhcp.ativo; }, montar: abaDhcp },
        { id: 'dns', nome: 'DNS', ok: function () { return F2.dnsPronto(); }, montar: abaDns },
        { id: 'https', nome: 'HTTPS (site)', ok: function () { return srv.https.ativo; }, montar: abaHttps }
      ];
      var botoesAba = {};

      function desenharChips() {
        chips.textContent = '';
        LISTA.forEach(function (a) {
          var ok = a.ok();
          S.el('div', {
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            background: ok ? '#1F7A3E' : '#3A4556',
            color: '#FFFFFF'
          }, (ok ? '✔ ' : '○ ') + a.nome.split(' ')[0], chips);
        });
      }

      LISTA.forEach(function (a) {
        var b = S.ui.botao(a.nome, 'secundario', function () { abrir(a.id); }, abas);
        S.estilo(b, { padding: '7px 12px', fontSize: '13px', borderRadius: '8px 8px 0 0', borderBottom: 'none' });
        botoesAba[a.id] = b;
      });

      function abrir(id) {
        msg('');
        painel.textContent = '';
        LISTA.forEach(function (a) {
          var on = a.id === id;
          botoesAba[a.id].style.background = on ? '#F2F5F9' : C.painel2;
          botoesAba[a.id].style.color = on ? '#0B4F9C' : C.branco;
        });
        var a = LISTA.filter(function (x) { return x.id === id; })[0];
        a.montar();
        desenharChips();
      }

      function errou(texto, campo) {
        J.erros++;
        msg('✖ ' + texto, 'erro');
        if (campo && campo.marcarErro) {
          campo.marcarErro(true);
          campo.focar();
        }
      }

      function concluiu(texto, proxima) {
        msg('✔ ' + texto, 'ok');
        F2.desenharRack();
        desenharChips();
        J.atualizarMissoes();
        if (proxima) setTimeout(function () { if (m.fundo.isConnected) abrir(proxima); }, 900);
      }

      function exigeIp() {
        if (srv.configurado) return false;
        caixaInfo('Primeiro dê um IP fixo ao servidor (aba Rede). Um servidor de DHCP, DNS ou site não pode ter IP que muda.', painel, 'aviso');
        S.ui.botao('Ir para a aba Rede', 'primario', function () { abrir('rede'); }, painel);
        return true;
      }

      function grade(pai) {
        return S.el('div', { display: 'grid', gridTemplateColumns: 'minmax(120px, auto) minmax(0, 1fr)', gap: '6px 10px', alignItems: 'center' }, null, pai);
      }
      function vazio(campos) {
        var v = campos.filter(function (f) { return !f.completo(); })[0];
        if (v) {
          msg('Preencha as 4 partes de cada endereço.', 'info');
          v.marcarErro(true);
          v.focar();
        }
        return !!v;
      }
      function limpar(campos) {
        campos.forEach(function (f) { f.marcarErro(false); });
      }
      function ultimo(ip) { return Number(ip.split('.')[3]); }

      // ---- Aba Rede: IP fixo do servidor ----
      function abaRede() {
        S.el('div', { fontWeight: '700', color: '#0B4F9C', marginBottom: '6px' }, 'Adaptador Ethernet · IP fixo do servidor', painel);
        caixaInfo('Missão: o servidor fica em 192.168.0.10. O gateway é o roteador (192.168.0.1) e o DNS do próprio servidor é ele mesmo.', painel);
        var g = grade(painel);
        var fIp = MG.campoIp(g, 'Endereço IP', srv.ip, salvar);
        var fMasc = MG.campoIp(g, 'Máscara', srv.mascara, salvar);
        var fGw = MG.campoIp(g, 'Gateway padrão', srv.gateway, salvar);
        var fDns = MG.campoIp(g, 'DNS preferencial', srv.dnsLocal, salvar);
        var acoes = S.el('div', { marginTop: '10px' }, null, painel);
        S.ui.botao('Aplicar', 'primario', salvar, acoes);
        function salvar() {
          var cs = [fIp, fMasc, fGw, fDns];
          limpar(cs);
          if (vazio(cs)) return;
          var ip = fIp.valor();
          if (!MG.ipValido(ip)) return errou('IP inválido: cada parte vai de 0 a 255.', fIp);
          if (ip === S.REDE.gateway) return errou('O .1 é o roteador. Dois aparelhos com o mesmo IP geram conflito.', fIp);
          if (ip !== F2.IP_SRV) return errou('A missão pede o IP 192.168.0.10 para o servidor.', fIp);
          if (fMasc.valor() !== S.REDE.mascara) return errou('A máscara desta rede é 255.255.255.0.', fMasc);
          if (fGw.valor() !== S.REDE.gateway) return errou('O gateway é o roteador: 192.168.0.1.', fGw);
          var dns = fDns.valor();
          if (dns !== '127.0.0.1' && dns !== F2.IP_SRV) return errou('O servidor DNS da rede é este próprio servidor: use 127.0.0.1 ou 192.168.0.10.', fDns);
          srv.ip = ip;
          srv.mascara = fMasc.valor();
          srv.gateway = fGw.valor();
          srv.dnsLocal = dns;
          srv.configurado = true;
          concluiu('Servidor agora é 192.168.0.10 (IP fixo).', 'dhcp');
        }
      }

      // ---- Aba DHCP ----
      function abaDhcp() {
        S.el('div', { fontWeight: '700', color: '#0B4F9C', marginBottom: '6px' }, 'Servidor DHCP · Escopo IPv4', painel);
        if (exigeIp()) return;
        var d = srv.dhcp;
        if (d.ativo) caixaInfo('Escopo ativo: ' + d.inicio + ' a ' + d.fim + '. Você pode ajustar e aplicar de novo.', painel);
        else caixaInfo('O DHCP entrega IP, máscara, gateway e DNS para os PCs automaticamente. Escolha uma faixa que não inclua o roteador (.1) nem o servidor (.10). Sugestão: .100 a .150.', painel);
        var g = grade(painel);
        var fIni = MG.campoIp(g, 'IP inicial', d.inicio || '192.168.0.', salvar);
        var fFim = MG.campoIp(g, 'IP final', d.fim || '192.168.0.', salvar);
        var fMasc = MG.campoIp(g, 'Máscara', d.mascara, salvar);
        var fGw = MG.campoIp(g, 'Roteador (gateway)', d.gateway, salvar);
        var fDns = MG.campoIp(g, 'Servidor DNS', d.dns, salvar);
        var acoes = S.el('div', { marginTop: '10px' }, null, painel);
        S.ui.botao(d.ativo ? 'Aplicar alterações' : 'Ativar escopo', 'primario', salvar, acoes);
        function salvar() {
          var cs = [fIni, fFim, fMasc, fGw, fDns];
          limpar(cs);
          if (vazio(cs)) return;
          var ini = fIni.valor();
          var fim = fFim.valor();
          var R = S.REDE;
          if (!MG.ipValido(ini)) return errou('IP inicial inválido.', fIni);
          if (!MG.ipValido(fim)) return errou('IP final inválido.', fFim);
          if (ini.indexOf(R.prefixo) !== 0 || fim.indexOf(R.prefixo) !== 0) return errou('A faixa precisa estar na rede 192.168.0.x.', ini.indexOf(R.prefixo) !== 0 ? fIni : fFim);
          var a = ultimo(ini);
          var b = ultimo(fim);
          if (a === 0 || b === 255) return errou('O .0 é o endereço da rede e o .255 é o broadcast: não entram na faixa.', a === 0 ? fIni : fFim);
          if (a > b) return errou('O IP inicial precisa ser menor que o final.', fIni);
          if (b - a + 1 < 3) return errou('A faixa precisa ter pelo menos 3 IPs (um para cada PC).', fFim);
          if (a <= 1 && b >= 1) return errou('A faixa inclui o .1, que é o roteador: daria conflito de IP.', fIni);
          if (a <= 10 && b >= 10) return errou('A faixa inclui o .10, que é o próprio servidor: daria conflito de IP.', fIni);
          if (fMasc.valor() !== R.mascara) return errou('A máscara é 255.255.255.0.', fMasc);
          if (fGw.valor() !== R.gateway) return errou('O gateway que os PCs recebem é o roteador: 192.168.0.1.', fGw);
          if (fDns.valor() !== F2.IP_SRV) return errou('O DNS que os PCs devem usar é este servidor: 192.168.0.10.', fDns);
          d.inicio = ini;
          d.fim = fim;
          d.mascara = fMasc.valor();
          d.gateway = fGw.valor();
          d.dns = fDns.valor();
          d.ativo = true;
          d.concessoes = {};
          concluiu('Escopo DHCP ativo: ' + ini + ' a ' + fim + '.', 'dns');
        }
      }

      // ---- Aba DNS ----
      function abaDns() {
        S.el('div', { fontWeight: '700', color: '#0B4F9C', marginBottom: '6px' }, 'Servidor DNS · Zona ' + F2.DOMINIO, painel);
        if (exigeIp()) return;
        caixaInfo('O DNS traduz nomes em IPs. Crie um registro tipo A para o site: os PCs vão digitar ' + F2.SITE + ' e o DNS responde com o IP do servidor.', painel);
        var tabela = S.el('div', { border: '2px solid #C5CFDB', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', overflow: 'hidden' }, null, painel);
        function linha(c, cab) {
          var l = S.el('div', {
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.4fr) 50px minmax(0,1fr)',
            gap: '6px',
            padding: '5px 8px',
            background: cab ? '#DCE5F0' : '#FFFFFF',
            fontWeight: cab ? '700' : '400',
            fontFamily: cab ? C.fonte : C.mono,
            fontSize: cab ? '12px' : '13px'
          }, null, tabela);
          c.forEach(function (x) { S.el('div', { overflow: 'hidden', textOverflow: 'ellipsis' }, x, l); });
        }
        linha(['Nome', 'Tipo', 'Endereço'], true);
        srv.dns.registros.forEach(function (r) { linha([r.nome + '.' + F2.DOMINIO, 'A', r.ip]); });
        S.el('div', { fontWeight: '700', fontSize: '13px', marginBottom: '6px' }, 'Novo registro (tipo A)', painel);
        var g = grade(painel);
        S.el('div', { fontSize: '13px', fontWeight: '700' }, 'Nome do host', g);
        var linhaNome = S.el('div', { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }, null, g);
        var inpNome = S.el('input', {
          width: '9em',
          padding: '7px 6px',
          fontSize: '16px',
          fontFamily: C.mono,
          border: '2px solid #8A96A6',
          borderRadius: '4px',
          userSelect: 'text',
          webkitUserSelect: 'text'
        }, null, linhaNome);
        inpNome.type = 'text';
        inpNome.setAttribute('autocapitalize', 'none');
        inpNome.setAttribute('autocorrect', 'off');
        inpNome.spellcheck = false;
        inpNome.placeholder = 'nome';
        inpNome.setAttribute('aria-label', 'Nome do host');
        S.el('span', { fontFamily: C.mono, fontWeight: '700' }, '.' + F2.DOMINIO, linhaNome);
        var fIp = MG.campoIp(g, 'Endereço IP', '', salvar);
        var acoes = S.el('div', { marginTop: '10px' }, null, painel);
        S.ui.botao('Adicionar registro', 'primario', salvar, acoes);
        inpNome.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); salvar(); } });
        function salvar() {
          fIp.marcarErro(false);
          inpNome.style.borderColor = '#8A96A6';
          var nome = inpNome.value.trim().toLowerCase().replace(/\.$/, '');
          if (nome.slice(-(F2.DOMINIO.length + 1)) === '.' + F2.DOMINIO) nome = nome.slice(0, -(F2.DOMINIO.length + 1));
          if (!nome) {
            msg('Digite o nome do host.', 'info');
            inpNome.focus();
            return;
          }
          if (!fIp.completo()) {
            msg('Preencha o IP do registro.', 'info');
            fIp.marcarErro(true);
            fIp.focar();
            return;
          }
          if (!/^[a-z0-9-]+$/.test(nome)) {
            inpNome.style.borderColor = '#D63A33';
            return errou('Nomes de host usam só letras, números e hífen (sem espaço nem acento).');
          }
          if (nome !== 'intranet') {
            inpNome.style.borderColor = '#D63A33';
            return errou('O site precisa responder em ' + F2.SITE + ': o nome do host é "intranet".');
          }
          var ip = fIp.valor();
          if (ip !== F2.IP_SRV) return errou('O site está neste servidor: o registro precisa apontar para 192.168.0.10.', fIp);
          if (F2.dnsPronto()) {
            msg('Esse registro já existe.', 'info');
            return;
          }
          srv.dns.registros.push({ nome: nome, ip: ip });
          concluiu('Registro criado: ' + F2.SITE + ' → ' + ip + '.', 'https');
        }
      }

      // ---- Aba HTTPS ----
      function abaHttps() {
        S.el('div', { fontWeight: '700', color: '#0B4F9C', marginBottom: '6px' }, 'Servidor Web · Site "Intranet Senac"', painel);
        if (exigeIp()) return;
        var h = srv.https;
        S.el('div', { fontSize: '13px', marginBottom: '8px' }, '📄 Arquivos do site: ' + F2.ARQUIVO + ' (já está no servidor)', painel);
        S.el('div', { fontWeight: '700', fontSize: '13px', marginBottom: '4px' }, 'Protocolo e porta', painel);
        var porta = escolhas(painel, [
          { rotulo: 'HTTP · porta 80', valor: 80 },
          { rotulo: 'HTTPS · porta 443', valor: 443 },
          { rotulo: 'porta 8080', valor: 8080 }
        ], h.porta);
        S.el('div', { fontWeight: '700', fontSize: '13px', marginBottom: '4px' }, 'Certificado digital', painel);
        var cert = escolhas(painel, [
          { rotulo: 'Sem certificado', valor: 'nenhum' },
          { rotulo: '🔒 srv01.' + F2.DOMINIO, valor: 'srv01' },
          { rotulo: '🔒 ' + F2.SITE, valor: 'intranet' }
        ], h.cert);
        var acoes = S.el('div', { marginTop: '6px' }, null, painel);
        S.ui.botao(h.ativo ? 'Site no ar ✔ (aplicar de novo)' : 'Iniciar o site', 'primario', salvar, acoes);
        function salvar() {
          var p = porta.valor();
          var c = cert.valor();
          if (!p) return msg('Escolha a porta do site.', 'info');
          if (!c) return msg('Escolha o certificado.', 'info');
          if (p === 80) return errou('Porta 80 é HTTP, sem criptografia. O site seguro (HTTPS) usa a porta 443.');
          if (p === 8080) return errou('8080 não é a porta padrão do HTTPS: o navegador procuraria o site na 443.');
          if (c === 'nenhum') return errou('Sem certificado não existe HTTPS: é ele que permite a conexão criptografada.');
          if (c !== 'intranet') return errou('O certificado precisa ter o mesmo nome que os PCs vão digitar (' + F2.SITE + '), senão o navegador mostra alerta de segurança.');
          h.porta = p;
          h.cert = c;
          h.ativo = true;
          concluiu('Site publicado em https://' + F2.SITE + ' (porta 443).');
        }
      }

      var primeira = abaInicial || (LISTA.filter(function (a) { return !a.ok(); })[0] || LISTA[0]).id;
      abrir(primeira);
    };
  });

  /* ================================================================== */
  secao('F2F-pcs-dhcp-navegador', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var J = S.jogo;
    var F2 = S.f2;

    MG.desktopFase2 = function (pc) {
      return MG.areaDeTrabalho(pc.nome + ' · área de trabalho', [
        { n: 'Navegador', s: '🌐', abrir: function (c) { navegador(pc, c); } },
        { n: 'Configurações de Rede', s: '⚙', abrir: function (c) { redeDhcp(pc, c); } },
        { n: 'Prompt de Comando', s: '⌨', abrir: function (c) { terminalFase2(pc, c); } },
        { n: 'Arquivos', s: '📁', t: 'Nada importante aqui.' },
        { n: 'Lixeira', s: '🗑', t: 'A lixeira está vazia.' }
      ]);
    };

    // Pede IP ao DHCP do servidor (Discover → Offer → Request → Ack).
    function pedirDhcp(pc) {
      var e = pc.estado;
      var srv = F2.srv;
      if (!e.conectado) return { erro: 'cabo' };
      if (!srv.ligado || !srv.configurado || !srv.dhcp.ativo) {
        e.ip = '169.254.' + (10 + Math.floor(Math.random() * 200)) + '.' + (2 + Math.floor(Math.random() * 250));
        e.mascara = '255.255.0.0';
        e.gateway = null;
        e.dns = null;
        e.dhcp = false;
        e.configurado = false;
        e.apipa = true;
        return { erro: 'apipa' };
      }
      var d = srv.dhcp;
      var ip = d.concessoes[pc.nome];
      if (!ip) {
        var usados = Object.keys(d.concessoes).map(function (k) { return d.concessoes[k]; });
        var base = d.inicio.split('.').slice(0, 3).join('.');
        for (var n = Number(d.inicio.split('.')[3]); n <= Number(d.fim.split('.')[3]); n++) {
          var cand = base + '.' + n;
          if (usados.indexOf(cand) < 0) {
            ip = cand;
            break;
          }
        }
        d.concessoes[pc.nome] = ip;
      }
      e.ip = ip;
      e.mascara = d.mascara;
      e.gateway = d.gateway;
      e.dns = d.dns;
      e.dhcp = true;
      e.apipa = false;
      e.configurado = true;
      return { ok: true };
    }

    function redeDhcp(pc, ctx) {
      var e = pc.estado;
      var janela = ctx.abrirJanela('⚙ Configurações de Rede · Ethernet (' + (e.conectado ? 'cabo conectado' : 'sem cabo') + ')');
      var automatico = true;
      var opcoes = S.el('div', { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', fontSize: '13px' }, null, janela);
      function radio(rotulo, auto) {
        var l = S.el('label', { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }, null, opcoes);
        var r = S.el('input', { width: '18px', height: '18px' }, null, l);
        r.type = 'radio';
        r.name = 'modo-ip2-' + pc.nome;
        r.checked = auto === automatico;
        S.el('span', null, rotulo, l);
        r.addEventListener('change', function () { automatico = auto; });
      }
      radio('Obter endereço IP automaticamente (DHCP)', true);
      radio('Usar o seguinte endereço IP (fixo / manual)', false);
      var status = S.el('div', {
        fontFamily: C.mono,
        fontSize: '12px',
        background: '#FFFFFF',
        border: '2px solid #C5CFDB',
        borderRadius: '6px',
        padding: '6px 8px',
        whiteSpace: 'pre-wrap',
        minHeight: '20px'
      }, e.dhcp
        ? 'IP ' + e.ip + ' (DHCP) · Gateway ' + e.gateway + ' · DNS ' + e.dns
        : e.apipa ? 'IP ' + e.ip + ' (APIPA: o DHCP não respondeu)' : 'Sem endereço IP.', janela);
      var acoes = S.el('div', { display: 'flex', gap: '8px', marginTop: '10px' }, null, janela);
      var bSalvar = S.ui.botao(e.dhcp ? 'Renovar concessão' : 'Salvar', 'primario', salvar, acoes);
      S.ui.botao('Cancelar', 'claro', function () { ctx.fecharJanela(); }, acoes);

      function salvar() {
        if (!automatico) {
          J.erros++;
          ctx.msg('✖ Nesta rede os PCs recebem IP pelo DHCP do servidor. Escolha "Obter endereço IP automaticamente".', 'erro');
          return;
        }
        bSalvar.disabled = true;
        var passos = ['DHCP Discover: procurando um servidor DHCP…'];
        status.textContent = passos[0];
        setTimeout(function () {
          if (!janela.isConnected) return;
          var r = pedirDhcp(pc);
          bSalvar.disabled = false;
          S.mundo.desenharTela(pc);
          if (r.erro === 'cabo') {
            status.textContent = 'Cabo de rede desconectado.';
            ctx.msg('O ' + pc.nome + ' ainda não está na rede: instale a tomada keystone do ponto dele (o patch cord é ligado junto).', 'erro');
            return;
          }
          if (r.erro === 'apipa') {
            status.textContent = 'Nenhuma resposta do DHCP.\nIP automático privado (APIPA): ' + pc.estado.ip;
            ctx.msg('O DHCP não respondeu e o Windows se deu um IP 169.254.x.x (APIPA), que não acessa a rede. Ligue e configure o DHCP no servidor e tente de novo.', 'erro');
            J.atualizarMissoes();
            return;
          }
          status.textContent = [
            'DHCP Discover → Offer → Request → Ack',
            'IP recebido: ' + e.ip,
            'Máscara: ' + e.mascara + ' · Gateway: ' + e.gateway,
            'Servidor DNS: ' + e.dns
          ].join('\n');
          ctx.msg('✔ ' + pc.nome + ' recebeu o IP ' + e.ip + ' do servidor DHCP!', 'ok');
          bSalvar.textContent = 'Renovar concessão';
          J.atualizarMissoes();
        }, 900);
      }
    }

    // Resolve um nome pelo DNS do servidor (ou devolve o próprio IP).
    function resolver(pc, host) {
      var e = pc.estado;
      if (MG.ipValido(host)) return { ip: host };
      if (!e.dns) return { erro: 'semdns' };
      var srv = F2.srv;
      if (!srv.ligado || !srv.configurado) return { erro: 'semdns' };
      var h = host.toLowerCase().replace(/\.$/, '');
      var reg = srv.dns.registros.filter(function (r) { return r.nome + '.' + F2.DOMINIO === h; })[0];
      return reg ? { ip: reg.ip, nome: h } : { erro: 'nx' };
    }

    function responde(pc, ip) {
      var e = pc.estado;
      if (ip === e.ip || ip === '127.0.0.1') return true;
      if (!e.dhcp) return false;
      if (ip === S.REDE.gateway) return true;
      if (ip === F2.IP_SRV) return F2.srv.ligado && F2.srv.configurado;
      return F2.PCS.some(function (p) {
        var o = S.pcs[p.nome].estado;
        return o.dhcp && o.ip === ip;
      });
    }

    function terminalFase2(pc, ctx) {
      var e = pc.estado;
      MG.terminal(ctx, {
        ajuda: [
          'ipconfig            mostra a configuração de rede',
          'ping <IP ou nome>   testa se outro aparelho responde',
          'nslookup <nome>     pergunta ao DNS o IP de um nome',
          'cls                 limpa a tela'
        ],
        executar: function (cmd, args, escrever) {
          if (cmd === 'ipconfig') {
            if (e.dhcp) {
              escrever(['Adaptador Ethernet:', '   DHCP Habilitado. . . . . . . : Sim', '   Endereço IPv4. . . . . . . . : ' + e.ip,
                '   Máscara de Sub-rede. . . . . : ' + e.mascara, '   Gateway Padrão . . . . . . . : ' + e.gateway,
                '   Servidor DHCP. . . . . . . . : ' + F2.IP_SRV, '   Servidores DNS . . . . . . . : ' + e.dns]);
            } else if (e.apipa) {
              escrever(['Adaptador Ethernet:', '   Endereço IPv4 de Autoconfiguração: ' + e.ip, '   (o DHCP não respondeu)']);
            } else {
              escrever(['Adaptador Ethernet:', e.conectado ? '   Sem endereço IP. Configure a rede.' : '   Mídia desconectada (sem cabo).']);
            }
            return true;
          }
          if (cmd === 'nslookup') {
            var nome = args[0];
            if (!nome) {
              escrever(['Uso: nslookup <nome>   (ex.: nslookup ' + F2.SITE + ')']);
              return true;
            }
            var r = resolver(pc, nome);
            if (r.erro === 'semdns') escrever(['*** Não foi possível contatar o servidor DNS. Este PC recebeu IP pelo DHCP?']);
            else if (r.erro === 'nx') escrever(['Servidor:  srv01.' + F2.DOMINIO, 'Address:  ' + F2.IP_SRV, '', '*** srv01.' + F2.DOMINIO + ' não encontrou ' + nome + ': Non-existent domain']);
            else escrever(['Servidor:  srv01.' + F2.DOMINIO, 'Address:  ' + F2.IP_SRV, '', 'Nome:     ' + (r.nome || nome), 'Address:  ' + r.ip]);
            return true;
          }
          if (cmd !== 'ping') return false;
          var alvo = args[0] || '';
          if (!alvo) {
            escrever(['Uso: ping <IP ou nome>']);
            return true;
          }
          if (!e.ip) {
            escrever(['Falha geral. Este PC não tem IP.']);
            return true;
          }
          var res = resolver(pc, alvo);
          if (res.erro) {
            escrever(['A solicitação ping não pôde encontrar o host ' + alvo + '. Verifique o nome e tente novamente.']);
            return true;
          }
          escrever(MG.saidaPing(res.ip, responde(pc, res.ip), res.nome));
          return true;
        }
      });
    }

    // ---- Navegador ----
    function navegador(pc, ctx) {
      var j = ctx.abrirJanela('Navegador', null);
      var barra = S.el('div', { display: 'flex', gap: '6px', marginBottom: '8px' }, null, j);
      var inp = S.el('input', {
        flex: '1 1 auto',
        minWidth: '0',
        padding: '7px 10px',
        fontSize: '16px',
        border: '2px solid #8A96A6',
        borderRadius: '999px',
        userSelect: 'text',
        webkitUserSelect: 'text'
      }, null, barra);
      inp.type = 'text';
      inp.inputMode = 'url';
      inp.setAttribute('autocapitalize', 'none');
      inp.setAttribute('autocorrect', 'off');
      inp.setAttribute('enterkeyhint', 'go');
      inp.spellcheck = false;
      inp.placeholder = 'Digite um endereço';
      inp.setAttribute('aria-label', 'Endereço');
      var bIr = S.ui.botao('Ir', 'primario', ir, barra);
      S.estilo(bIr, { padding: '6px 14px' });
      var pagina = S.el('div', {
        background: '#FFFFFF',
        border: '2px solid #C5CFDB',
        borderRadius: '6px',
        minHeight: '150px',
        padding: '14px',
        fontSize: '14px',
        color: '#10203A'
      }, null, j);
      S.el('div', { color: '#6A7586' }, 'Nova guia', pagina);
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); ir(); } });
      if (!S.toque) setTimeout(function () { inp.focus(); }, 30);

      function erroPagina(titulo, codigo, explicacao) {
        pagina.textContent = '';
        S.el('div', { fontSize: '34px' }, '😕', pagina);
        S.el('div', { fontWeight: '700', fontSize: '17px', margin: '6px 0' }, titulo, pagina);
        S.el('div', { fontFamily: C.mono, fontSize: '12px', color: '#6A7586', marginBottom: '8px' }, codigo, pagina);
        if (explicacao) S.el('div', { fontSize: '13px', background: '#FFF4D6', border: '2px solid #D9A21B', borderRadius: '6px', padding: '6px 8px' }, '💡 ' + explicacao, pagina);
      }

      function ir() {
        var e = pc.estado;
        var bruto = inp.value.trim().toLowerCase();
        if (!bruto) return;
        var mt = bruto.match(/^(?:(https?):\/\/)?([^\/:\s]+)(?::(\d+))?(\/[^\s]*)?$/);
        if (!mt) return erroPagina('Endereço inválido', 'ERR_INVALID_URL', 'Exemplo de endereço: https://' + F2.SITE + '/' + F2.ARQUIVO);
        var proto = mt[1] || 'https';
        var host = mt[2];
        var porta = mt[3] ? Number(mt[3]) : (proto === 'https' ? 443 : 80);
        var caminho = mt[4] || '/';
        inp.value = proto + '://' + host + (mt[3] ? ':' + mt[3] : '') + caminho;
        pagina.textContent = 'Carregando…';
        setTimeout(function () {
          if (!j.isConnected) return;
          if (!e.ip || e.apipa) {
            return erroPagina('Sem conexão com a rede', 'ERR_NETWORK_CHANGED',
              e.apipa ? 'Este PC está com IP 169.254.x.x: o DHCP não respondeu.' : 'Este PC ainda não tem IP. Use Configurações de Rede → DHCP.');
          }
          var r = resolver(pc, host);
          if (r.erro === 'semdns') return erroPagina('Não foi possível acessar ' + host, 'DNS_PROBE_FINISHED_NO_INTERNET', 'O PC não sabe qual é o servidor DNS. Ele recebeu IP pelo DHCP?');
          if (r.erro === 'nx') return erroPagina('Não foi possível encontrar o endereço IP de ' + host, 'DNS_PROBE_FINISHED_NXDOMAIN',
            F2.dnsPronto() ? 'Esse nome não existe no DNS. O site é ' + F2.SITE + '.' : 'O DNS do servidor ainda não tem o registro ' + F2.SITE + '.');
          var ip = r.ip;
          var srv = F2.srv;
          if (ip !== F2.IP_SRV || !srv.ligado || !srv.configurado) {
            return erroPagina(host + ' recusou a conexão', 'ERR_CONNECTION_REFUSED', ip === S.REDE.gateway ? 'Esse é o roteador, não o servidor do site.' : 'Não há um site nesse endereço.');
          }
          var h = srv.https;
          if (!h.ativo || porta !== 443 || proto !== 'https') {
            return erroPagina(host + ' recusou a conexão', 'ERR_CONNECTION_REFUSED',
              h.ativo ? 'O site só está publicado em HTTPS, na porta 443. Use https://' : 'O site ainda não foi publicado: configure o HTTPS no servidor.');
          }
          if (host !== F2.SITE) {
            return erroPagina('Sua conexão não é particular', 'NET::ERR_CERT_COMMON_NAME_INVALID',
              'O certificado é de ' + F2.SITE + ', mas você acessou por ' + host + '. Use o nome do site (é para isso que serve o DNS).');
          }
          if (caminho !== '/' && caminho !== '/' + F2.ARQUIVO) {
            return erroPagina('404 · Arquivo não encontrado', 'HTTP 404', 'O arquivo do site é ' + F2.ARQUIVO + '.');
          }
          paginaOk(host);
        }, 500);
      }

      function paginaOk(host) {
        inp.value = 'https://' + host + '/' + F2.ARQUIVO;
        pagina.textContent = '';
        var cab = S.el('div', { display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '4px solid ' + C.laranja, paddingBottom: '8px', marginBottom: '10px' }, null, pagina);
        var logo = S.ui.logo(cab, 30);
        if (logo) logo.style.flex = '0 0 auto';
        S.el('div', { fontWeight: '700', fontSize: '18px', color: '#0B4F9C' }, 'Intranet Senac', cab);
        S.el('div', { fontWeight: '700', fontSize: '16px', marginBottom: '6px' }, '🔒 Bem-vindo(a) à Intranet do Senac!', pagina);
        S.el('div', { fontSize: '13px', lineHeight: '1.5' },
          'Se você está lendo isto, o PC recebeu IP pelo DHCP, encontrou o servidor pelo DNS (' + F2.SITE + ' → ' + F2.IP_SRV + ') e abriu o arquivo ' + F2.ARQUIVO + ' por uma conexão HTTPS criptografada.', pagina);
        var jaTinha = F2.siteAberto;
        F2.siteAberto = true;
        ctx.msg('✔ Site aberto pelo nome, com cadeado de HTTPS!' + (jaTinha ? '' : ' Feche a janela para continuar.'), 'ok');
        J.atualizarMissoes();
      }
    }
  });

  /* ================================================================== */
  secao('F2G-registro-da-fase', function () {
    var F2 = S.f2;

    S.registrarFase('servidores', {
      numero: 2,
      nome: 'Laboratório 2 · Servidor',
      proxima: 'cabeamento',
      titulo: 'Servidor',
      resumoCurto: 'Instale tomadas keystone e configure um servidor com DHCP, DNS e HTTPS. Depois, abra o site pelo nome.',
      missaoCurta: 'Ligue o servidor, instale as keystones, configure DHCP, DNS e HTTPS e abra o site pelo nome num PC.',
      missaoLonga: 'Coloque um servidor na rede: dê a ele IP fixo, instale as 3 tomadas keystone (T-568B), ative DHCP, DNS e HTTPS, deixe os PCs pegarem IP sozinhos e abra https://intranet.senac.lan no navegador. O quadro mostra as etapas.',
      usar: F2.usar,
      rotulo: F2.rotulo,
      concluir: function () { F2.concluir(); },
      resumo: F2.resumo,
      textoConcluido: 'Tudo funcionando: DHCP, DNS e HTTPS!',
      etapas: [
        ['Preparando as missões…', function () {
          F2.reiniciar();
          S.jogo.reiniciar(F2.MISSOES);
        }],
        ['Construindo o laboratório 2…', function () { F2.montarSala(); }],
        ['Instalando o servidor e os PCs…', function () { F2.montarEquipamentos(); }],
        ['Chamando o professor e o aluno…', function () {
          S.criarProfessor();
          S.criarPersonagem(S.aluno.nome, S.aluno.genero);
          S.mundo.montarCaboMao();
          S.mundo.montarSeta();
        }]
      ],
      atualizar: function (dt) { F2.atualizarPorta(dt); },
      desmontar: function () {
        if (S.esconderBalaoProfessor) S.esconderBalaoProfessor();
        F2.porta = null;
        F2.rack = null;
        F2.tomadas = null;
        F2.texConsole = null;
      },
      abertura: {
        titulo: 'LABORATÓRIO 2 · SERVIDOR',
        portaAberta: true,
        inicio: { x: -5.35, z: 3.0 },
        tomadas: {
          abertura: { pos: [-1.2, 4.6, 8.6], alvo: [-4.2, 0.8, 2.4] },
          servidor: { pos: [2.6, 3.7, 1.7], alvo: [4.5, 0.9, -2.7] },
          pontos: { pos: [-0.25, 1.3, -3.3], alvo: [-0.85, 0.3, -4.45] },
          keystones: { pos: [-3.3, 2.1, 3.0], alvo: [-4.9, 0.85, 0.9] },
          pcs: { pos: [-1.3, 2.7, 0.9], alvo: [-1.3, 0.9, -2.7] },
          quadro: { pos: [-1.3, 2.3, -0.8], alvo: [-1.3, 1.7, -4.5] }
        },
        falas: function () {
          var n = S.primeiroNome();
          var bv = S.aluno.genero === 'f' ? 'Bem-vinda' : 'Bem-vindo';
          return [
            { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: bv + ' ao Laboratório 2, ' + n + '! Agora a nossa rede vai ganhar um servidor.' },
            { quem: 'prof', tomada: 'servidor', gesto: 'apontar', texto: 'Atrás daquela porta fica a sala do servidor. Ligue o servidor e dê a ele um IP fixo: 192.168.0.10.' },
            { quem: 'prof', tomada: 'pontos', gesto: 'apontar', texto: 'Os cabos já estão passados pela canaleta, mas as pontas na parede estão sem tomada. São três pontos, um para cada PC.' },
            { quem: 'prof', tomada: 'keystones', gesto: 'apontar', texto: 'Pegue as keystones e a punch down na bancada. Na keystone, siga a linha B da etiqueta: é o T-568B, o mesmo padrão dos cabos.' },
            { quem: 'prof', tomada: 'servidor', gesto: 'falar', texto: 'No servidor você ativa três serviços: o DHCP entrega IP automático, o DNS transforma nomes em IPs e o HTTPS publica o site com segurança.' },
            { quem: 'prof', tomada: 'pcs', gesto: 'apontar', texto: 'Depois ligue os três PCs e deixe eles pegarem IP sozinhos, pelo DHCP.' },
            { quem: 'prof', tomada: 'quadro', gesto: 'falar', texto: 'Para fechar, abra o navegador num PC e acesse https://' + F2.SITE + '/' + F2.ARQUIVO + '. Se a página abrir, tudo funcionou!' },
            { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: 'Boa sorte, ' + n + '!' },
            { quem: 'aluno', tomada: 'aluno', texto: 'Partiu configurar esse servidor!' }
          ];
        }
      },
      final: {
        sair: true,
        falas: function () {
          var n = S.primeiroNome();
          return [
            { quem: 'prof', tomada: 'despedida', gesto: 'aceno', texto: 'Parabéns, ' + n + '! O PC pegou IP pelo DHCP, achou o servidor pelo DNS e abriu o site com HTTPS.' },
            { quem: 'prof', tomada: 'despedida', gesto: 'falar', texto: 'Agora vem o último desafio: cabeamento estruturado. Siga-me!' }
          ];
        }
      }
    });
  });


  /* ================================================================== */
  secao('K01-cachola', function () {
    // Cachola: o gato preto de olhos verdes, mascote da plataforma Cachola
    // do Senac. Dorme no canto da sala da fase 1; acordado, solta um fato
    // científico curioso e "abre a cachola" (a cabeça) enquanto fala.
    var FATOS = [
      'Com o IPv6 existem cerca de 340 undecilhões de endereços IP. Dividindo pelos 8 bilhões de pessoas, dá uns 42 octilhões de endereços para cada uma!',
      'O IPv4 tem só 4,3 bilhões de endereços: menos do que o número de pessoas no planeta. Por isso surgiram o NAT e o IPv6.',
      'Dentro da fibra óptica a luz viaja a uns 200 mil km por segundo. Dá para dar cinco voltas na Terra em um segundo!',
      'Mais de 95% dos dados que cruzam os oceanos passam por cabos submarinos, não por satélites.',
      'Os pares do cabo UTP são trançados para cancelar interferências eletromagnéticas. É física pura dentro do seu cabo de rede!',
      'A Ethernet foi inventada em 1973, por Robert Metcalfe, no laboratório Xerox PARC.',
      'A primeira mensagem da ARPANET, em 1969, era para ser "LOGIN". O sistema travou depois do "LO".',
      'O primeiro "bug" de computador registrado foi uma mariposa de verdade, presa num relé do computador Harvard Mark II, em 1947.',
      'O DNS foi criado em 1983. Antes dele, os nomes de todos os computadores da rede ficavam num único arquivo, o HOSTS.TXT.',
      'O Wi-Fi de 2,4 GHz usa a mesma faixa de frequência do forno de micro-ondas. Por isso o micro-ondas às vezes atrapalha o sinal.',
      'Nós, gatos, ronronamos em frequências entre 25 e 150 Hz.',
      'Gatos dormem, em média, de 12 a 16 horas por dia. Ou seja: eu estou trabalhando direitinho.',
      'Gatos têm uma terceira pálpebra, a membrana nictitante, que protege e umedece os olhos.',
      'Meus olhos brilham no escuro por causa do tapetum lucidum, uma camada que reflete a luz de volta para a retina.',
      'Gatos pretos podem ficar meio avermelhados de tanto tomar sol: a luz desbota o pigmento escuro do pelo.',
      'O cérebro humano tem cerca de 86 bilhões de neurônios.',
      'Um raio aquece o ar a uns 30 mil graus Celsius: cerca de cinco vezes a temperatura da superfície do Sol.',
      'O polvo tem três corações e sangue azul, por causa de uma proteína com cobre, a hemocianina.',
      'A Lua se afasta da Terra cerca de 3,8 centímetros por ano. Medem isso com laser refletido em espelhos deixados lá.',
      'A banana é levemente radioativa por causa do potássio-40. Mas relaxa: precisaria de milhões delas para fazer mal.'
    ];
    S.FATOS_CACHOLA = FATOS;

    var POS = { x: 5.35, z: 0.9 };
    var c = null;
    var balao = null;
    var balaoAte = 0;
    var vTmp = null;

    function mat(cor, op) { return S.mat(cor, op); }

    S.criarCachola = function () {
      var C = S.COR;
      var preto = mat(0x15161a);
      var pretoClaro = mat(0x24262c);
      // Almofada laranja (Senac) onde ele dorme.
      var almofada = S.cilindro(0.34, 0.36, 0.07, 8, mat(C.laranja), POS.x, 0.035, POS.z);
      almofada.receiveShadow = true;
      S.cilindro(0.26, 0.26, 0.075, 8, mat(0xffb15c), POS.x, 0.04, POS.z);
      S.colisor(POS.x, POS.z, 0.6, 0.6);

      var raiz = S.grupo(POS.x, 0.07, POS.z);
      raiz.rotation.y = -0.75; // de frente para a sala (e para a câmera)
      var tronco = S.caixa(0.19, 0.16, 0.36, preto, 0, 0.1, 0, raiz);
      // Cabeça (com a "tampa" da cachola articulada atrás).
      var cab = S.grupo(0, 0.12, 0.22, raiz);
      S.caixa(0.18, 0.12, 0.15, preto, 0, 0, 0, cab);
      S.caixa(0.08, 0.045, 0.04, pretoClaro, 0, -0.03, 0.085, cab, true);
      S.caixa(0.022, 0.016, 0.01, mat(0xd98aa0), 0, -0.012, 0.106, cab, true); // nariz
      var tampaPiv = S.grupo(0, 0.06, -0.075, cab);
      var tampa = S.caixa(0.18, 0.035, 0.15, preto, 0, 0.0175, 0.075, tampaPiv);
      [-0.055, 0.055].forEach(function (x) {
        var orelha = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), preto);
        orelha.position.set(x, 0.07, 0.06);
        orelha.rotation.y = Math.PI / 4;
        orelha.castShadow = true;
        tampaPiv.add(orelha);
      });
      // "Cérebro" que brilha quando ele abre a cachola.
      // Coleira laranja com a plaquinha do nome.
      S.caixa(0.2, 0.03, 0.16, mat(C.laranja), 0, -0.065, -0.005, cab, true);
      S.caixa(0.035, 0.035, 0.012, mat(0xf2c200), 0, -0.09, 0.08, cab, true);
      var cerebro = S.caixa(0.12, 0.05, 0.1, S.matUnico(0xff8fb3, { emissive: 0xff5c95, emissiveIntensity: 0.9 }), 0, 0.055, 0, cab, true);
      cerebro.visible = false;
      // Olhos verdes (fechados = risquinho escuro).
      var mOlho = S.matUnico(0x39ff6a, { emissive: 0x2bd458, emissiveIntensity: 0.8 });
      var olhos = [-0.045, 0.045].map(function (x) {
        return S.caixa(0.04, 0.03, 0.01, mOlho, x, 0.015, 0.078, cab, true);
      });
      // Patas.
      var patas = [[-0.06, 0.13], [0.06, 0.13], [-0.06, -0.13], [0.06, -0.13]].map(function (p) {
        var piv = S.grupo(p[0], 0.1, p[1], raiz);
        S.caixa(0.05, 0.12, 0.05, preto, 0, -0.06, 0, piv);
        return piv;
      });
      // Rabo em dois segmentos.
      var rabo1 = S.grupo(0, 0.1, -0.18, raiz);
      S.caixa(0.04, 0.04, 0.16, preto, 0, 0, -0.08, rabo1);
      var rabo2 = S.grupo(0, 0, -0.16, rabo1);
      S.caixa(0.035, 0.035, 0.14, preto, 0, 0, -0.07, rabo2);

      // Etiqueta com o nome.
      var etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.texturaNome('Cachola', 'rgba(30,140,70,0.9)'), depthTest: false, transparent: true }));
      etiqueta.scale.set(1.0, 0.155, 1);
      etiqueta.position.set(0, 0.62, 0);
      etiqueta.renderOrder = 10;
      raiz.add(etiqueta);

      // "Z"s subindo enquanto ele dorme.
      var texZ = S.textura(16, 16, function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('z', w / 2, 13);
      });
      var zs = [0, 1, 2].map(function (i) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texZ, transparent: true, depthWrite: false }));
        sp.scale.set(0.12, 0.12, 1);
        S.adicionar(sp);
        return { sp: sp, fase: i / 3 };
      });

      // Área de clique maior que o gato.
      var alvo = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
      alvo.position.set(0, 0.25, 0);
      raiz.add(alvo);
      c = {
        raiz: raiz,
        tronco: tronco,
        cab: cab,
        tampa: tampaPiv,
        cerebro: cerebro,
        olhos: olhos,
        mOlho: mOlho,
        patas: patas,
        rabo1: rabo1,
        rabo2: rabo2,
        zs: zs,
        estado: 'dormindo', // dormindo | sentado | falando | andando | foi
        conversou: false,
        cliques: 0,
        t: 0,
        passo: 0,
        caminho: null,
        colisor: S.colisores[S.colisores.length - 1]
      };
      c.info = S.interativo([alvo, tronco], {
        id: 'cachola',
        nome: 'Cachola (o gato)',
        ancora: new THREE.Vector3(POS.x - 0.8, 0, POS.z)
      });
      definirOlhos(false);
      atualizarPose(1);
    };

    S.removerCachola = function () {
      c = null;
      if (balao) balao.style.display = 'none';
    };

    function definirOlhos(abertos) {
      c.olhos.forEach(function (o) { o.scale.y = abertos ? 1 : 0.25; });
      c.mOlho.color.setHex(abertos ? 0x39ff6a : 0x0b0c0e);
      c.mOlho.emissive.setHex(abertos ? 0x2bd458 : 0x000000);
    }

    // Poses: valores-alvo para tronco, cabeça, patas e rabo.
    var POSES = {
      // pf/pt: patas da frente e de trás → [altura do encaixe, tamanho, inclinação]
      dormindo: { troncoY: 0.08, troncoRot: 0, cabY: 0.08, cabZ: 0.2, cabRot: 0.35, pf: [0.1, 0.15, 0], pt: [0.1, 0.15, 0], rabo1: 1.3, rabo2: 1.2, raboX: 0 },
      // Sentado: o peito sobe, então as patas da frente ficam maiores e
      // inclinadas até o chão; as de trás dobram por baixo do corpo.
      sentado: { troncoY: 0.15, troncoRot: -0.55, cabY: 0.33, cabZ: 0.16, cabRot: 0, pf: [0.2, 1.75, -0.18], pt: [0.07, 0.75, -1.15], rabo1: 1.0, rabo2: 0.6, raboX: 0 },
      andando: { troncoY: 0.17, troncoRot: 0, cabY: 0.26, cabZ: 0.22, cabRot: -0.1, pf: [0.1, 1, 0], pt: [0.1, 1, 0], rabo1: 0, rabo2: 0.3, raboX: -0.9 }
    };
    function atualizarPose(k) {
      var nome = c.estado === 'andando' ? 'andando' : (c.estado === 'dormindo' || c.estado === 'foi') ? 'dormindo' : 'sentado';
      var p = POSES[nome];
      function lerp(a, b) { return a + (b - a) * k; }
      c.tronco.position.y = lerp(c.tronco.position.y, p.troncoY);
      c.tronco.rotation.x = lerp(c.tronco.rotation.x, p.troncoRot);
      c.cab.position.y = lerp(c.cab.position.y, p.cabY);
      c.cab.position.z = lerp(c.cab.position.z, p.cabZ);
      c.cab.rotation.x = lerp(c.cab.rotation.x, p.cabRot);
      c.patas.forEach(function (pt, i) {
        var cfg = i < 2 ? p.pf : p.pt;
        pt.position.y = lerp(pt.position.y, cfg[0]);
        pt.scale.y = lerp(pt.scale.y, cfg[1]);
        if (nome !== 'andando') pt.rotation.x = lerp(pt.rotation.x, cfg[2]);
      });
      c.rabo1.rotation.y = lerp(c.rabo1.rotation.y, p.rabo1);
      c.rabo2.rotation.y = lerp(c.rabo2.rotation.y, p.rabo2);
      c.rabo1.rotation.x = lerp(c.rabo1.rotation.x, p.raboX);
    }

    S.atualizarCachola = function (dt) {
      if (!c || c.estado === 'foi') return;
      c.t += dt;
      atualizarPose(Math.min(1, dt * 6));
      var dormindo = c.estado === 'dormindo';
      // Respiração e "Z"s.
      c.tronco.scale.y = 1 + (dormindo ? Math.sin(c.t * 2.2) * 0.06 : 0);
      c.zs.forEach(function (z) {
        z.sp.visible = dormindo;
        if (!dormindo) return;
        var f = (c.t * 0.35 + z.fase) % 1;
        z.sp.position.set(c.raiz.position.x + 0.05 + f * 0.15, 0.3 + f * 0.55, c.raiz.position.z + Math.sin(f * 6) * 0.05);
        z.sp.material.opacity = Math.sin(f * Math.PI);
        z.sp.scale.setScalar(0.08 + f * 0.08);
      });
      // Falando: abre a cachola, o cérebro pulsa, cabeça e rabo balançam.
      var falando = c.estado === 'falando';
      var alvoTampa = falando ? -1.15 : 0;
      c.tampa.rotation.x += (alvoTampa - c.tampa.rotation.x) * Math.min(1, dt * 8);
      c.cerebro.visible = c.tampa.rotation.x < -0.2;
      if (c.cerebro.visible) {
        var pulso = 1 + Math.sin(c.t * 9) * 0.12;
        c.cerebro.scale.set(pulso, pulso, pulso);
        c.cerebro.material.emissiveIntensity = 0.7 + Math.sin(c.t * 9) * 0.3;
      }
      if (falando) {
        c.cab.rotation.z = Math.sin(c.t * 3) * 0.15;
        c.rabo2.rotation.y += Math.sin(c.t * 6) * 0.04;
      } else {
        c.cab.rotation.z *= 1 - Math.min(1, dt * 6);
      }
      if (c.estado === 'andando' && c.caminho) andar(dt);
      atualizarBalao();
    };

    // ---- Caminhada até a porta ----------------------------------------------
    function andar(dt) {
      var pos = c.raiz.position;
      var alvo = c.caminho[0];
      var dx = alvo[0] - pos.x;
      var dz = alvo[1] - pos.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      var passo = 2.0 * dt;
      if (d <= passo) {
        pos.x = alvo[0];
        pos.z = alvo[1];
        c.caminho.shift();
      } else {
        pos.x += dx / d * passo;
        pos.z += dz / d * passo;
        var ang = Math.atan2(dx, dz);
        var dif = ang - c.raiz.rotation.y;
        while (dif > Math.PI) dif -= Math.PI * 2;
        while (dif < -Math.PI) dif += Math.PI * 2;
        c.raiz.rotation.y += dif * Math.min(1, dt * 10);
      }
      c.passo += dt * 14;
      c.patas.forEach(function (pt, i) {
        pt.rotation.x = Math.sin(c.passo + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6;
      });
      if (pos.x < -2.5 && S.mundo.porta) S.mundo.abrirPorta();
      if (!c.caminho.length) {
        c.caminho = null;
        c.estado = 'foi';
        c.raiz.visible = false;
        c.zs.forEach(function (z) { z.sp.visible = false; });
        // Fecha a porta de novo (se ela ainda não foi liberada no fim da fase).
        if (S.mundo.porta && !S.mundo.porta.liberada) S.mundo.porta.alvo = 0;
        var fn = c.aoSair;
        c.aoSair = null;
        if (fn) fn();
      }
    }

    function sairDaSala(aoSair) {
      c.estado = 'andando';
      c.raiz.position.y = 0;
      c.aoSair = aoSair;
      c.caminho = [[4.4, 0.9], [2.9, 2.45], [-4.6, 2.95], [-5.7, 3.0], [-7.0, 3.0]];
      var i = S.colisores.indexOf(c.colisor);
      if (i >= 0) S.colisores.splice(i, 1);
      delete S.mundo.objetos.cachola;
      for (var k = S.interativos.length - 1; k >= 0; k--) {
        var info = S.interativos[k].userData.info;
        if (info && info.id === 'cachola') S.interativos.splice(k, 1);
      }
    }

    // Pular a cena: o gato some direto (sem tentar andar por um caminho vazio).
    function sumir() {
      if (!c || c.estado === 'foi') return;
      if (c.estado !== 'andando') sairDaSala(null);
      c.aoSair = null;
      c.caminho = null;
      c.estado = 'foi';
      c.raiz.visible = false;
      c.zs.forEach(function (z) { z.sp.visible = false; });
      if (S.mundo.porta && !S.mundo.porta.liberada) S.mundo.porta.alvo = 0;
    }

    // ---- Balão "ZzZz" -------------------------------------------------------
    function falarBalao(texto, ms) {
      if (!balao) {
        balao = S.el('div', {
          position: 'absolute',
          zIndex: '6',
          transform: 'translate(-50%, -100%)',
          background: '#FFFFFF',
          color: '#10203A',
          border: '3px solid #1E8C46',
          borderRadius: '12px',
          padding: '5px 10px',
          fontWeight: '700',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          display: 'none'
        }, '', S.raiz);
      }
      balao.textContent = texto;
      if (/^Z/.test(texto)) S.som('ronco');
      balaoAte = S.agora() + (ms || 1600);
      atualizarBalao();
    }
    function atualizarBalao() {
      if (!balao) return;
      if (!c || S.agora() > balaoAte || S.pausado || c.estado === 'foi') {
        balao.style.display = 'none';
        return;
      }
      if (!vTmp) vTmp = new THREE.Vector3();
      vTmp.set(c.raiz.position.x, 0.75, c.raiz.position.z).project(S.camera);
      if (vTmp.z > 1 || Math.abs(vTmp.x) > 1.1 || Math.abs(vTmp.y) > 1.1) {
        balao.style.display = 'none';
        return;
      }
      balao.style.left = ((vTmp.x + 1) / 2 * S.raiz.clientWidth) + 'px';
      balao.style.top = Math.max(50, (1 - vTmp.y) / 2 * S.raiz.clientHeight - 6) + 'px';
      balao.style.display = 'block';
    }

    // ---- Interação ----------------------------------------------------------
    S.rotuloCachola = function () {
      if (!c) return 'Cachola';
      return c.conversou ? 'Cutucar o Cachola' : 'Ver o gato';
    };

    S.usarCachola = function () {
      if (!c || c.estado === 'foi' || S.emCena()) return;
      if (!c.conversou) return cenaApresentacao();
      c.cliques++;
      if (c.cliques >= 10) return cenaVaiEmbora();
      falarBalao(c.cliques >= 6 ? 'ZzZzZz… (grrr)' : 'ZzZzZz…', 1600);
      c.tronco.scale.y = 1.12;
    };

    // Marca do aluno nas cenas: ao lado do gato, olhando para ele.
    var MARCA_ALUNO = { x: POS.x - 0.9, z: POS.z - 0.25, angulo: Math.PI / 2 };

    var GATO = [POS.x, 0.35, POS.z];
    var TOMADAS = {
      gato: { pos: [POS.x - 0.75, 0.72, POS.z + 1.05], alvo: [POS.x, 0.3, POS.z] },
      alunoGato: { pos: [POS.x + 0.35, 1.4, POS.z - 1.3], alvo: [POS.x - 0.9, 1.25, POS.z - 0.25] },
      prof: { pos: [2.3, 2.35, 4.45], alvo: [5.1, 1.45, 3.2] }
    };

    // O professor já saiu da sala (ou está saindo)?
    function semProfessor() {
      var pr = S.professor;
      return !pr || pr.foi || !!pr.caminho;
    }

    function cenaApresentacao() {
      c.conversou = true;
      var fato = FATOS[Math.floor(Math.random() * FATOS.length)];
      if (semProfessor()) return cenaSozinho(fato);
      S.cenaCurta({
        tomadas: TOMADAS,
        posAluno: MARCA_ALUNO,
        falas: [
          { quem: 'aluno', tomada: 'alunoGato', texto: 'Que gato é esse?' },
          { quem: 'prof', tomada: 'prof', gesto: 'explicar', olhar: GATO, texto: 'Esse é o Cachola, é o nosso mascote da plataforma Cachola do SENAC.' },
          { quem: 'cachola', tomada: 'gato', texto: '!!', acao: function () {
            c.estado = 'sentado';
            definirOlhos(true);
          } },
          { quem: 'aluno', tomada: 'alunoGato', texto: 'Eita, ele acordou!' },
          { quem: 'cachola', tomada: 'gato', texto: fato, acao: function () { c.estado = 'falando'; } },
          { quem: 'aluno', tomada: 'alunoGato', texto: 'Eita! O que ele tá fazendo?', acao: function () { c.estado = 'falando'; } },
          { quem: 'prof', tomada: 'prof', gesto: 'falar', olhar: GATO, texto: 'Ele está abrindo sua Cachola, ué!' },
          { quem: 'aluno', tomada: 'gato', texto: 'Sinistro...', acao: function () {
            c.estado = 'dormindo';
            definirOlhos(false);
          } }
        ],
        aoPular: function () {
          c.estado = 'dormindo';
          definirOlhos(false);
        }
      });
    }

    // Sem o Herick na sala: o aluno descobre o gato sozinho.
    function cenaSozinho(fato) {
      S.cenaCurta({
        tomadas: TOMADAS,
        posAluno: MARCA_ALUNO,
        falas: [
          { quem: 'aluno', tomada: 'alunoGato', texto: 'Um gato? Aqui na coleira diz que o nome dele é Cachola...' },
          { quem: 'cachola', tomada: 'gato', texto: '!!', acao: function () {
            c.estado = 'sentado';
            definirOlhos(true);
          } },
          { quem: 'cachola', tomada: 'gato', texto: fato, acao: function () { c.estado = 'falando'; } },
          { quem: 'cachola', tomada: 'gato', texto: 'Zzz...', acao: function () {
            c.estado = 'dormindo';
            definirOlhos(false);
          } },
          { quem: 'aluno', tomada: 'alunoGato', texto: 'Acho que entendi por que o nome dele é Cachola....' }
        ],
        aoPular: function () {
          c.estado = 'dormindo';
          definirOlhos(false);
        }
      });
    }

    function cenaVaiEmbora() {
      S.cenaCurta({
        tomadas: TOMADAS,
        seguir: c.raiz,
        falas: [
          { quem: 'cachola', tomada: 'gato', texto: 'Vou é dormir em outro lugar....', acao: function () {
            c.estado = 'sentado';
            definirOlhos(true);
          } }
        ],
        aposFalas: function (fim) {
          sairDaSala(fim);
        },
        aoPular: sumir,
        aoFim: function () {
          if (S.reacaoProfessor && !semProfessor()) S.reacaoProfessor('Vacilo com o Cachola, hein...');
        }
      });
    }

    S.cachola = function () { return c; };
  });


  /* ================================================================== */
  secao('K02-segredo-carlos', function () {
    // Easter egg da fase 1: PC-03 (3x) + PC-04 (1x) + logo do Senac (5x)
    // chamam o professor Carlos, que entra pela porta com um "presente".
    var PELE = '#EBB98F';
    var CABELO = '#2B1A10';
    var BARBA = '#3A2416';
    var CAMISA = '#6E4B3A';
    var JEANS = '#3E5C80';
    var c = null;
    var cont = null;

    function px(ctx, cor, x, y, l, a) {
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, l || 1, a || 1);
    }

    function texRosto() {
      return S.textura(16, 16, function (ctx) {
        px(ctx, PELE, 0, 0, 16, 16);
        px(ctx, CABELO, 0, 0, 16, 2);
        px(ctx, CABELO, 0, 2, 2, 1);
        px(ctx, CABELO, 14, 2, 2, 1);
        px(ctx, CABELO, 3, 5, 4, 1); // sobrancelhas
        px(ctx, CABELO, 9, 5, 4, 1);
        px(ctx, '#2E1A0F', 4, 7, 2, 2); // olhos
        px(ctx, '#2E1A0F', 10, 7, 2, 2);
        px(ctx, '#F1E6DA', 5, 7, 1, 1);
        px(ctx, '#F1E6DA', 11, 7, 1, 1);
        px(ctx, 'rgba(120,60,30,0.28)', 7, 8, 2, 3); // nariz
        // Barba curta e bigode.
        px(ctx, 'rgba(58,36,22,0.75)', 0, 8, 1, 6);
        px(ctx, 'rgba(58,36,22,0.75)', 15, 8, 1, 6);
        px(ctx, 'rgba(58,36,22,0.85)', 1, 12, 14, 4);
        px(ctx, BARBA, 5, 11, 6, 1);
        px(ctx, '#B06A58', 6, 12, 4, 1); // boca
      });
    }

    function texLado(frenteEsq) {
      return S.textura(16, 16, function (ctx) {
        function p(cor, x, y, l, a) { px(ctx, cor, frenteEsq ? x : 16 - x - (l || 1), y, l, a); }
        p(PELE, 0, 0, 16, 16);
        p(CABELO, 0, 0, 16, 3);
        p(CABELO, 10, 3, 6, 6);
        p(CABELO, 5, 3, 2, 5);
        p('rgba(58,36,22,0.8)', 0, 12, 8, 4);
        p('#D9A47C', 8, 7, 2, 3);
      });
    }

    function texPapel() {
      return S.textura(64, 84, function (ctx, w, h) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, 0, w, 4);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0B4F9C';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('50 QUESTÕES', w / 2, 15);
        ctx.font = 'bold 11px Arial';
        ctx.fillText('PORTUGOL', w / 2, 27);
        ctx.fillStyle = '#9AA5B1';
        for (var y = 34; y < 70; y += 5) ctx.fillRect(6, y, w - 12, 1);
        ctx.fillStyle = '#D63A33';
        ctx.font = 'bold 7px Arial';
        ctx.fillText('ENTREGA: HOJE!', w / 2, 79);
      });
    }

    function criar() {
      var mPele = S.mat(parseInt(PELE.slice(1), 16));
      var mCabelo = S.mat(parseInt(CABELO.slice(1), 16));
      var mCamisa = S.mat(parseInt(CAMISA.slice(1), 16));
      var mJeans = S.mat(parseInt(JEANS.slice(1), 16));
      var mTenis = S.mat(0x2a2a2a);
      var raiz = S.grupo(-7.0, 0, 3.0);
      raiz.rotation.y = Math.PI / 2;
      var corpo = S.grupo(0, 0, 0, raiz);
      function perna(x) {
        var piv = S.grupo(x, 0.74, 0, corpo);
        S.caixa(0.23, 0.6, 0.25, mJeans, 0, -0.3, 0, piv);
        S.caixa(0.25, 0.12, 0.33, mTenis, 0, -0.66, 0.04, piv);
        return piv;
      }
      var pE = perna(-0.14);
      var pD = perna(0.14);
      S.caixa(0.64, 0.6, 0.36, mCamisa, 0, 1.04, 0, corpo);
      function braco(x) {
        var piv = S.grupo(x, 1.28, 0, corpo);
        S.caixa(0.2, 0.26, 0.22, mCamisa, 0, -0.1, 0, piv);
        S.caixa(0.16, 0.3, 0.17, mPele, 0, -0.37, 0, piv);
        var mao = S.caixa(0.17, 0.15, 0.17, mPele, 0, -0.58, 0, piv);
        return { piv: piv, mao: mao };
      }
      var bE = braco(-0.43);
      var bD = braco(0.43);
      S.caixa(0.2, 0.06, 0.18, mPele, 0, 1.37, 0, corpo);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.5), [
        new THREE.MeshLambertMaterial({ map: texLado(true) }),
        new THREE.MeshLambertMaterial({ map: texLado(false) }),
        mCabelo, mPele,
        new THREE.MeshLambertMaterial({ map: texRosto() }),
        mCabelo
      ]);
      cab.position.set(0, 1.62, 0);
      cab.castShadow = true;
      corpo.add(cab);
      // Cabelo curto com um topete.
      S.caixa(0.58, 0.1, 0.54, mCabelo, 0, 1.92, -0.01, corpo);
      S.caixa(0.36, 0.06, 0.2, mCabelo, -0.06, 1.98, 0.1, corpo, true);
      S.caixa(0.58, 0.26, 0.06, mCabelo, 0, 1.78, -0.25, corpo, true);
      // Papel: frente com o texto e verso branco (dois planos, o texto
      // nunca aparece espelhado).
      var papel = new THREE.Group();
      var frente = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.22), new THREE.MeshBasicMaterial({ map: texPapel() }));
      var verso = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.22), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }));
      verso.rotation.y = Math.PI;
      verso.position.z = -0.002;
      papel.add(frente);
      papel.add(verso);
      papel.position.set(0, -0.62, 0.14);
      papel.rotation.x = -0.4;
      bD.piv.add(papel);
      var etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.texturaNome('Prof. Carlos', 'rgba(110,75,58,0.92)'), depthTest: false, transparent: true }));
      etiqueta.scale.set(1.3, 0.2, 1);
      etiqueta.position.set(0, 2.3, 0);
      etiqueta.renderOrder = 10;
      etiqueta.visible = false;
      raiz.add(etiqueta);
      c = { raiz: raiz, corpo: corpo, pE: pE, pD: pD, bE: bE.piv, bD: bD.piv, papel: papel, caminho: null, passo: 0, braco: 0 };
    }

    S.carlos = function () { return c; };
    S.removerCarlos = function () { c = null; cont = null; };

    // Anda pelos pontos do caminho; a porta abre quando ele se aproxima.
    function andarPara(pontos, aoChegar) {
      c.caminho = pontos.slice();
      c.aoChegar = aoChegar;
    }

    function atualizar(dt) {
      if (!c) return;
      var anda = !!c.caminho;
      if (anda) {
        var pos = c.raiz.position;
        var alvo = c.caminho[0];
        var dx = alvo[0] - pos.x;
        var dz = alvo[1] - pos.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        var passo = (c.vel || 2.3) * dt;
        if (d <= passo) {
          pos.x = alvo[0];
          pos.z = alvo[1];
          c.caminho.shift();
        } else {
          pos.x += dx / d * passo;
          pos.z += dz / d * passo;
          var ang = Math.atan2(dx, dz);
          var dif = ang - c.raiz.rotation.y;
          while (dif > Math.PI) dif -= Math.PI * 2;
          while (dif < -Math.PI) dif += Math.PI * 2;
          c.raiz.rotation.y += dif * Math.min(1, dt * 10);
        }
        if (pos.x < -4 && S.mundo.porta) S.mundo.abrirPorta();
        if (!c.caminho.length) {
          c.caminho = null;
          anda = false;
          var fn = c.aoChegar;
          c.aoChegar = null;
          if (fn) fn();
        }
      }
      c.passo += anda ? dt * 9 : 0;
      var bal = anda ? Math.sin(c.passo) * 0.6 : 0;
      var k = Math.min(1, dt * 12);
      c.pE.rotation.x += (bal - c.pE.rotation.x) * k;
      c.pD.rotation.x += (-bal - c.pD.rotation.x) * k;
      c.bE.rotation.x += (-bal * 0.7 - c.bE.rotation.x) * k;
      c.bD.rotation.x += ((c.braco || bal * 0.7) - c.bD.rotation.x) * k;
      c.corpo.position.y = anda ? Math.abs(Math.sin(c.passo)) * 0.04 : 0;
    }

    // ---- Contagem do segredo ------------------------------------------------
    S.prepararSegredo = function () {
      cont = { passo: 0, feito: false };
      if (S.mundo.placa) {
        S.interativo(S.mundo.placa, {
          id: 'logoSenac',
          nome: 'Logo do Senac',
          ancora: new THREE.Vector3(S.mundo.placa.position.x, 0, -3.7)
        });
      }
    };

    // Sequência obrigatória: PC-03 (3x) → PC-04 (1x) → logo do Senac (5x).
    // Qualquer passo fora de ordem recomeça a contagem.
    var SEQUENCIA = ['pc:PC-03', 'pc:PC-03', 'pc:PC-03', 'pc:PC-04', 'logoSenac', 'logoSenac', 'logoSenac', 'logoSenac', 'logoSenac'];
    S.segredo = function (id) {
      if (!cont || cont.feito || !S.faseAtual || S.faseAtual.id !== 'laboratorio') return;
      if (id !== 'pc:PC-03' && id !== 'pc:PC-04' && id !== 'logoSenac') return;
      if (SEQUENCIA[cont.passo || 0] === id) cont.passo = (cont.passo || 0) + 1;
      else cont.passo = id === SEQUENCIA[0] ? 1 : 0;
      if (cont.passo === SEQUENCIA.length) {
        cont.feito = true;
        var tentar = S.protegido('segredo', function () {
          if (S.fase !== 'jogo' || S.ui.modalAberto() || S.emCena()) {
            setTimeout(tentar, 300);
            return;
          }
          cena();
        });
        setTimeout(tentar, 600);
      }
    };

    // ---- A cena ---------------------------------------------------------------
    // O aluno fica perto da placa do Senac, de frente; o Carlos para a uma
    // boa distância, só se aproxima para entregar o papel e depois volta.
    var ALUNO = { x: 3.1, z: -3.6 };
    var LONGE = [3.1, -1.35]; // onde o Carlos conversa (≈2,2 m do aluno)
    var PERTO = [3.1, -2.65]; // onde ele para para entregar
    var ENTRADA = [[-5.4, 3.0], [3.2, 2.3], [3.2, -0.8]];

    function cena() {
      if (!c) criar();
      var p = S.personagem;
      p.bracoFixo = null;
      c.raiz.visible = true;
      c.raiz.position.set(-7.0, 0, 3.0);
      c.raiz.rotation.y = Math.PI / 2;
      c.papel.visible = true;
      c.braco = 0;
      c.vel = 2.8;
      var estado = { entregue: false, voltou: false };

      function olharAluno() {
        c.raiz.rotation.y = Math.PI; // de frente para o aluno
      }
      function noLugar() {
        c.caminho = null;
        c.raiz.position.set(LONGE[0], 0, LONGE[1]);
        olharAluno();
      }
      function papelNaMao() {
        p.maoD.add(c.papel);
        c.papel.position.set(0, -0.06, 0.16);
        c.papel.rotation.set(-0.5, 0, 0);
      }
      function entregar() {
        if (estado.entregue) return;
        estado.entregue = true;
        papelNaMao();
        p.bracoFixo = -1.0;
        c.braco = 0;
      }
      // Aproxima, entrega e volta para o lugar.
      function aproximarEEntregar() {
        if (estado.entregue) return;
        andarPara([PERTO], function () {
          olharAluno();
          c.braco = -1.35;
          setTimeout(function () {
            if (!c || !c.raiz.visible) return;
            entregar();
            setTimeout(function () {
              if (!c || !c.raiz.visible) return;
              andarPara([LONGE], function () {
                olharAluno();
                estado.voltou = true;
              });
            }, 450);
          }, 600);
        });
      }
      // Garante o estado final da entrega (se o aluno avançar rápido).
      function concluirEntrega() {
        entregar();
        if (!estado.voltou) {
          estado.voltou = true;
          noLugar();
        }
      }
      // Zoom: o papel fica na frente do aluno, virado para a câmera.
      var CAM_PAPEL = [ALUNO.x + 0.12, 1.42, ALUNO.z + 0.82];
      function mostrarPapel() {
        S.alunoNoLugar();
        concluirEntrega();
        S.adicionar(c.papel);
        c.papel.position.set(ALUNO.x + 0.08, 1.18, ALUNO.z + 0.34);
        c.papel.rotation.set(0, 0, 0);
        c.papel.lookAt(CAM_PAPEL[0], CAM_PAPEL[1], CAM_PAPEL[2]);
      }
      function limpar() {
        c.papel.visible = false;
        p.bracoFixo = null;
        c.raiz.visible = false;
        c.caminho = null;
        if (S.mundo.porta && !S.mundo.porta.liberada) S.mundo.porta.alvo = 0;
      }

      var nome = S.primeiroNome();
      S.cenaCurta({
        seguir: c.raiz,
        // O aluno anda até perto da placa e fica de frente (para a câmera do jogo).
        posAluno: { x: ALUNO.x, z: ALUNO.z, angulo: 0 },
        aoFim: function () {
          if (S.reacaoProfessor) S.reacaoProfessor('O professor Carlos é assim mesmo, liga não...');
        },
        tomadas: {
          entrada: { pos: [0.6, 4.6, 6.2], alvo: [-0.6, 0.6, 0.6] },
          dupla: { pos: [5.8, 2.15, -2.45], alvo: [3.1, 1.1, -2.5] },
          carlos: { pos: [3.95, 2.65, -4.3], alvo: [3.1, 1.35, -1.35] },
          aluno: { pos: [1.75, 2.5, -0.3], alvo: [3.1, 1.3, -3.6] },
          papel: { pos: CAM_PAPEL, alvo: [ALUNO.x + 0.08, 1.18, ALUNO.z + 0.34] }
        },
        falas: [
          { quem: 'carlos', tomada: 'entrada', texto: 'Ei, ' + nome + ', você está aqui!', acao: function () {
            andarPara(ENTRADA.concat([LONGE]), olharAluno);
          } },
          { quem: 'aluno', tomada: 'aluno', texto: 'Professor Carlos?', acao: noLugar },
          { quem: 'carlos', tomada: 'dupla', texto: 'Tenho um presente para você.', acao: function () {
            noLugar();
            aproximarEEntregar();
          } },
          { quem: 'aluno', tomada: 'papel', texto: 'O que é isso?', acao: mostrarPapel },
          { quem: 'carlos', tomada: 'carlos', texto: '50tão. 50 questões em Portugol. Tem que me entregar hoje ainda.', acao: function () {
            concluirEntrega();
            papelNaMao();
          } },
          { quem: 'aluno', tomada: 'aluno', texto: '....' }
        ],
        aposFalas: function (fim) {
          concluirEntrega();
          papelNaMao();
          var volta = ENTRADA.slice().reverse().concat([[-7.2, 3.0]]);
          andarPara(volta, function () {
            limpar();
            fim();
          });
        },
        aoPular: limpar
      });
    }

    // Integra ao laço da fase 1 (junto com o Cachola).
    var atualizarCachola = S.atualizarCachola;
    S.atualizarCachola = function (dt) {
      atualizarCachola(dt);
      atualizar(dt);
    };
  });


  /* ================================================================== */
  secao('F3A-sala-cabeamento', function () {
    // Fase 3: cabeamento estruturado em "L". Três PCs na parede do fundo e
    // três na parede da esquerda. O feixe sai do rack (canto do fundo, à
    // direita), corre pela parede do fundo, vira o canto e segue pela
    // parede da esquerda. Tudo na parede é posicionado por "s": a distância
    // percorrida ao longo da rota, a partir da saída do rack.
    var F3 = S.f3 = {
      FIO_Y: 0.85, // acima das bancadas: dá para ver por cima dos monitores
      ZP: -4.43, // frente da parede do fundo
      XP: -5.93, // frente da parede da esquerda
      SAIDA_X: 4.6, // onde os cabos saem do rack para a parede (s = 0)
      CANTO: 10.53, // s do canto do fundo à esquerda
      S_FIM: 16.3,
      // Bancadas afastadas da parede: sobra um corredor atrás delas para o
      // aluno chegar até os X, as tomadas e a canaleta.
      PCS: [
        { nome: 'PC-01', x: 2.8, z: -2.0, parede: 'fundo' },
        { nome: 'PC-02', x: 1.0, z: -2.0, parede: 'fundo' },
        { nome: 'PC-03', x: -0.8, z: -2.0, parede: 'fundo' },
        { nome: 'PC-04', x: -3.6, z: -2.2, parede: 'esquerda' },
        { nome: 'PC-05', x: -3.6, z: -0.4, parede: 'esquerda' },
        { nome: 'PC-06', x: -3.6, z: 1.4, parede: 'esquerda' }
      ],
      // Ordem da rota: A, P1, P2, P3, B, (canto), P4, C, P5, P6.
      // A fica a 70 cm do rack (longe do switch).
      PRESILHAS: [
        { id: 'A', s: 0.7 },
        { id: 'B', s: 6.5 },
        { id: 'C', s: 13.26 }
      ],
      TRECHOS: [[0, 5.6], [5.6, 10.53], [10.53, 13.4], [13.4, 16.3]],
      CORREDOR: 0.6, // onde o aluno fica: 60 cm da parede
      ALCANCE: 1.2
    };
    // Tomada de cada PC: fica do lado do gabinete (40 cm).
    F3.PCS.forEach(function (p) {
      p.rot = p.parede === 'esquerda' ? Math.PI / 2 : 0;
      p.s = p.parede === 'esquerda' ? F3.CANTO + (p.z - 0.4 - F3.ZP) : F3.SAIDA_X - (p.x + 0.4);
    });

    // Posição na parede para um "s" da rota.
    F3.naRota = function (s) {
      if (s <= F3.CANTO) {
        var x = F3.SAIDA_X - s;
        // Referência: no corredor, ao lado do objeto (45 cm à esquerda), para
        // o corpo do aluno não esconder o X da câmera, que fica atrás dele.
        return { x: x, z: F3.ZP, rot: 0, normal: new THREE.Vector3(0, 0, 1), ancora: new THREE.Vector3(x - 0.45, 0, F3.ZP + F3.CORREDOR) };
      }
      var z = F3.ZP + (s - F3.CANTO);
      return { x: F3.XP, z: z, rot: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0), ancora: new THREE.Vector3(F3.XP + F3.CORREDOR, 0, z) };
    };
    F3.pontoRota = function (s, y, afastar) {
      var r = F3.naRota(s);
      return new THREE.Vector3(r.x, y, r.z).addScaledVector(r.normal, afastar || 0);
    };
    // Grupo encostado na parede, girado para "olhar" para dentro da sala.
    function grupoParede(s, desloc) {
      var r = F3.naRota(s);
      var g = S.grupo(r.x + r.normal.x * (desloc || 0), F3.FIO_Y, r.z + r.normal.z * (desloc || 0));
      g.rotation.y = r.rot;
      return g;
    }

    // Distância do aluno até um trecho da parede (de s0 a s1), medida no
    // corredor. Usada na canaleta, que é comprida.
    function distParede(s0, s1) {
      var a = new THREE.Vector3();
      var b = new THREE.Vector3();
      return function (p) {
        var melhor = Infinity;
        // Divide o trecho no canto para medir cada parede em linha reta.
        var cortes = s0 < F3.CANTO && s1 > F3.CANTO ? [[s0, F3.CANTO], [F3.CANTO, s1]] : [[s0, s1]];
        cortes.forEach(function (c) {
          a.copy(F3.pontoRota(c[0], 0, F3.CORREDOR));
          b.copy(F3.pontoRota(c[1], 0, F3.CORREDOR));
          var abx = b.x - a.x;
          var abz = b.z - a.z;
          var l2 = abx * abx + abz * abz;
          var t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2)) : 0;
          var dx = p.x - (a.x + abx * t);
          var dz = p.z - (a.z + abz * t);
          melhor = Math.min(melhor, Math.sqrt(dx * dx + dz * dz));
        });
        return melhor;
      };
    }

    function txt(ctx, t, x, y, cor, fonte) {
      ctx.fillStyle = cor;
      ctx.font = fonte;
      ctx.textAlign = 'center';
      ctx.fillText(t, x, y);
    }

    function hitbox(l, a, p, pai, x, y, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set(x || 0, y || 0, z || 0);
      pai.add(m);
      return m;
    }

    // ---- Rack com o switch e a porta da sala do servidor ------------------
    function montarRack() {
      var C = S.COR;
      var rx = 4.95;
      var rz = -3.95;
      var g = S.grupo(rx, 0, rz);
      var mRack = S.mat(C.metalEscuro);
      [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]].forEach(function (p) {
        S.caixa(0.05, 1.8, 0.05, mRack, p[0], 0.9, p[1], g);
      });
      S.caixa(0.66, 0.05, 0.62, mRack, 0, 1.8, 0, g);
      S.caixa(0.66, 0.08, 0.62, mRack, 0, 0.04, 0, g);
      S.caixa(0.6, 1.75, 0.02, mRack, 0, 0.9, -0.28, g, true);
      S.colisor(rx, rz, 0.75, 0.7);
      F3.texSwitch = S.textura(256, 28, null);
      var mLado = S.mat(0x3a434f);
      var sw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.32), [mLado, mLado, mLado, mLado, new THREE.MeshLambertMaterial({ map: F3.texSwitch }), mLado]);
      sw.position.set(0, 1.0, 0);
      sw.castShadow = true;
      g.add(sw);
      F3.infoSwitch = S.interativo([sw, hitbox(0.7, 0.5, 0.5, g, 0, 1.0, 0.1)], {
        id: 'switch3',
        nome: 'Switch (24 Fast + 2 Gigabit)',
        ancora: new THREE.Vector3(rx - 0.4, 0, rz + 1.15)
      });
      // Uplink do servidor: vem do teto descendo encostado na parede, por
      // trás do rack, passa por baixo do switch (encostado nele) e sobe
      // para a Gi0/1 na frente.
      var ux = rx + 0.18;
      var zp = -4.4; // encostado na parede do fundo
      var yb = 0.957; // logo abaixo do switch (fundo em 0,975)
      var mUplink = S.mat(C.laranja);
      var curva = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ux, 2.88, zp),
        new THREE.Vector3(ux, 1.4, zp),
        new THREE.Vector3(ux, 1.02, zp),
        new THREE.Vector3(ux, yb + 0.012, zp + 0.06),
        new THREE.Vector3(ux, yb, -4.2),
        new THREE.Vector3(ux, yb, rz),
        new THREE.Vector3(ux, yb, rz + 0.15),
        new THREE.Vector3(ux, yb + 0.012, rz + 0.2),
        new THREE.Vector3(ux, 1.0, rz + 0.205),
        new THREE.Vector3(ux, 1.0, rz + 0.165)
      ], false, 'centripetal');
      S.adicionar(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 0.016, 5), mUplink));
      var mCalha = S.mat(0x9aa4b0);
      // Eletrocalha no alto da parede do fundo até a parede do servidor.
      S.caixa(0.08, 0.14, 0.06, mCalha, ux, 2.92, zp + 0.01, null, true);
      S.caixa(6.0 - ux + 0.05, 0.08, 0.14, mCalha, (ux + 6.0) / 2, 2.95, -4.37, null, true);
      S.caixa(6.0 - ux, 0.025, 0.025, mUplink, (ux + 6.0) / 2, 2.9, -4.33, null, true);

      // Porta (fechada) da sala do servidor, com placa.
      S.caixa(0.06, 2.1, 1.0, S.mat(C.madeiraEscura), 5.95, 1.05, -2.45, null, true);
      S.caixa(0.08, 0.06, 0.16, S.mat(C.metal), 5.9, 1.0, -2.1, null, true);
      var texPlaca = S.textura(128, 32, function (ctx, w, h) {
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, h - 3, w, 3);
        txt(ctx, 'SALA DO SERVIDOR', w / 2, 13, '#FFFFFF', 'bold 10px Arial');
        txt(ctx, 'DHCP ativo · 192.168.0.10', w / 2, 25, '#6BF08E', '8px Arial');
      });
      var placa = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.24), new THREE.MeshLambertMaterial({ map: texPlaca }));
      placa.position.set(5.9, 2.35, -2.45);
      placa.rotation.y = -Math.PI / 2;
      S.adicionar(placa);
      F3.desenharSwitch();
    }

    F3.desenharSwitch = function () {
      if (!F3.texSwitch) return;
      F3.texSwitch.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#3A434F';
        ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 24; i++) {
          var col = Math.floor(i / 2);
          var x = 6 + col * 17;
          var y = i % 2 ? 15 : 4;
          ctx.fillStyle = '#0A0C0F';
          ctx.fillRect(x, y, 12, 9);
          var usada = F3.portas && F3.portas.indexOf('Fa0/' + (i + 1)) >= 0;
          if (usada) {
            ctx.fillStyle = '#2D7FE0';
            ctx.fillRect(x + 3, y + 2, 6, 5);
            ctx.fillStyle = F3.pcsComLink && F3.pcsComLink('Fa0/' + (i + 1)) ? '#39FF6A' : '#FFB020';
            ctx.fillRect(x, y - 2, 3, 2);
          }
        }
        // Gigabit: Gi0/1 é o uplink do servidor.
        ctx.fillStyle = '#7A4A10';
        ctx.fillRect(214, 4, 16, 20);
        ctx.fillRect(234, 4, 16, 20);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(218, 8, 8, 10);
        ctx.fillStyle = '#39FF6A';
        ctx.fillRect(214, 1, 4, 2);
      });
    };

    // ---- Pontos de fixação (X na parede), 3 presilhas em cada -------------
    F3.PREGOS = 3;
    function montarPresilhas() {
      var texX = S.textura(16, 16, function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#D63A33';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(3, 3);
        ctx.lineTo(13, 13);
        ctx.moveTo(13, 3);
        ctx.lineTo(3, 13);
        ctx.stroke();
      });
      F3.presilhas = F3.PRESILHAS.map(function (p, i) {
        var r = F3.naRota(p.s);
        var g = grupoParede(p.s);
        var marca = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), new THREE.MeshBasicMaterial({ map: texX, transparent: true }));
        marca.position.z = 0.005;
        g.add(marca);
        var pecas = [];
        for (var k = 0; k < F3.PREGOS; k++) {
          var px = (k - (F3.PREGOS - 1) / 2) * 0.07;
          var pc = S.caixa(0.03, 0.07, 0.035, S.mat(0xf2f4f7), px, 0, 0.02, g, true);
          var prego = S.caixa(0.012, 0.012, 0.014, S.mat(0x9aa4b0), px, 0.04, 0.032, g, true);
          pc.visible = false;
          prego.visible = false;
          pecas.push(pc, prego);
        }
        var alvo = hitbox(0.5, 0.45, 0.3, g, 0, 0, 0.1);
        var pres = { id: p.id, n: i + 1, s: p.s, x: r.x, z: r.z, grupo: g, marca: marca, pecas: pecas, pregadas: 0, pronta: false, passou: false };
        pres.info = S.interativo([alvo, marca], {
          id: 'presilha:' + p.id,
          nome: 'Ponto de fixação ' + p.id,
          presilha: pres,
          ancora: r.ancora,
          alcance: F3.ALCANCE
        });
        return pres;
      });
    }

    F3.pregarVisual = function (pres) {
      pres.pecas.forEach(function (pc, k) { pc.visible = Math.floor(k / 2) < pres.pregadas; });
      pres.marca.visible = !pres.pronta;
    };

    // ---- Pontos de rede (onde chegam os cabos e ficam as tomadas) ----------
    function montarPontos() {
      var C = S.COR;
      F3.tomadas = F3.PCS.map(function (p, i) {
        var r = F3.naRota(p.s);
        var g = grupoParede(p.s, 0.02);
        var caixa = S.caixa(0.12, 0.14, 0.05, S.mat(0x8a96a6), 0, 0, 0, g, true);
        var ponta = S.cilindro(0.014, 0.014, 0.24, 5, S.mat(C.caboAzul), 0.03, -0.13, 0.04, g);
        ponta.rotation.z = 0.35;
        ponta.visible = false;
        var espelho = S.caixa(0.12, 0.16, 0.03, S.mat(0xffffff), 0, 0, 0.01, g, true);
        var ks = S.caixa(0.05, 0.05, 0.02, S.mat(C.caboAzul), 0, 0.02, 0.03, g, true);
        espelho.visible = false;
        ks.visible = false;
        var etiqueta = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({
          map: S.textura(32, 16, function (ctx, w, h) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            txt(ctx, 'P' + (i + 1), w / 2, 12, '#0B4F9C', 'bold 11px Arial');
          })
        }));
        etiqueta.position.set(0, 0.12, 0.03);
        g.add(etiqueta);
        var alvo = hitbox(0.4, 0.4, 0.3, g, 0, 0, 0.1);
        var t = { n: i + 1, pc: p.nome, s: p.s, x: r.x, z: r.z, normal: r.normal, grupo: g, caixa: caixa, ponta: ponta, espelho: espelho, ks: ks, cabo: false, instalada: false, patch: false };
        t.info = S.interativo([alvo, caixa], {
          id: 'ponto:' + (i + 1),
          nome: 'Ponto de rede ' + (i + 1) + ' (' + p.nome + ')',
          ponto: t,
          ancora: r.ancora,
          alcance: F3.ALCANCE
        });
        return t;
      });
    }

    F3.caboNoPonto = function (t) {
      t.cabo = true;
      t.ponta.visible = true;
    };
    F3.tomadaPronta = function (t) {
      t.instalada = true;
      t.caixa.visible = false;
      t.ponta.visible = false;
      t.espelho.visible = true;
      t.ks.visible = true;
    };
    // Patch cord do PC até a tomada (na parede atrás da bancada).
    F3.ligarPatch = function (t) {
      t.patch = true;
      var pc = S.pcs[t.pc];
      var n = t.normal;
      var a = S.posMundo(pc.porta);
      var b = new THREE.Vector3(t.x, F3.FIO_Y - 0.03, t.z).addScaledVector(n, 0.1);
      // Desce por trás da bancada, corre pelo chão e sobe até a tomada.
      var chao1 = a.clone().addScaledVector(n, -0.3);
      chao1.y = 0.04;
      var chao2 = b.clone().addScaledVector(n, 0.25);
      chao2.y = 0.04;
      var curva = new THREE.CatmullRomCurve3([
        a,
        a.clone().addScaledVector(n, -0.12).add(new THREE.Vector3(0, -0.15, 0)),
        chao1,
        chao2,
        b.clone().addScaledVector(n, 0.1).add(new THREE.Vector3(0, -0.35, 0)),
        b
      ], false, 'centripetal');
      S.adicionar(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.016, 4), S.mat(0xf2c200)));
      pc.estado.conectado = true;
      pc.estado.portaSwitch = 'ponto ' + t.n;
      S.mundo.desenharTela(pc);
      F3.desenharSwitch();
    };

    // ---- Feixe de cabos na parede (refeito a cada avanço) -----------------
    var tuboFeixe = null;
    F3.redesenharFeixe = function (ateS) {
      if (tuboFeixe) {
        tuboFeixe.parent.remove(tuboFeixe);
        S.liberar(tuboFeixe);
        tuboFeixe = null;
      }
      if (ateS === null || ateS === undefined) return;
      var y = F3.FIO_Y;
      var pts = [
        new THREE.Vector3(4.95, 0.98, -3.75),
        new THREE.Vector3(4.75, 0.9, -4.25),
        F3.pontoRota(0, y, 0)
      ];
      // Vira o canto com dois pontos colados nele (curva justa).
      if (ateS > F3.CANTO - 0.12) {
        pts.push(F3.pontoRota(F3.CANTO - 0.12, y, 0));
        pts.push(new THREE.Vector3(F3.XP + 0.02, y, F3.ZP + 0.02));
        if (ateS > F3.CANTO + 0.12) pts.push(F3.pontoRota(F3.CANTO + 0.12, y, 0));
      }
      var fim = F3.pontoRota(Math.max(0.05, ateS), y, 0);
      if (fim.distanceTo(pts[pts.length - 1]) > 0.04) pts.push(fim);
      var curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      tuboFeixe = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 0.03, 5), S.mat(S.COR.caboAzul));
      S.adicionar(tuboFeixe);
    };

    // ---- Canaleta em 4 trechos ---------------------------------------------
    function montarCanaleta() {
      var mFantasma = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false });
      F3.trechos = F3.TRECHOS.map(function (tr, i) {
        var larg = tr[1] - tr[0];
        var meio = (tr[0] + tr[1]) / 2;
        // O trecho todo fica numa parede só: usa o lado do meio.
        var r = F3.naRota(meio);
        var g = grupoParede(meio, -0.01);
        var fantasma = new THREE.Mesh(new THREE.BoxGeometry(larg, 0.1, 0.07), mFantasma.clone());
        fantasma.visible = false;
        g.add(fantasma);
        var solida = S.caixa(larg, 0.1, 0.07, S.mat(0xf2f4f7), 0, 0, 0, g, true);
        solida.visible = false;
        var alvo = hitbox(larg, 0.3, 0.3, g, 0, 0, 0.1);
        var t = { n: i + 1, de: tr[0], ate: tr[1], grupo: g, fantasma: fantasma, solida: solida, pronta: false };
        t.info = S.interativo([alvo], {
          id: 'canaleta:' + (i + 1),
          nome: 'Trecho ' + (i + 1) + ' da canaleta',
          trecho: t,
          ancora: r.ancora,
          distReal: distParede(tr[0] + 0.1, tr[1] - 0.1),
          alcance: F3.ALCANCE
        });
        return t;
      });
    }
    F3.mostrarGuiasCanaleta = function (sim) {
      (F3.trechos || []).forEach(function (t) { t.fantasma.visible = sim && !t.pronta; });
    };
    F3.canaletaPronta = function (t) {
      t.pronta = true;
      t.fantasma.visible = false;
      t.solida.visible = true;
    };

    // ---- Bancada: martelo + presilhas, keystones, patch cords --------------
    // Fica do lado direito, perto da mesa do professor.
    F3.BANCADA = { x: 4.6, z: 1.2 };
    function montarBancada() {
      var C = S.COR;
      var bx = F3.BANCADA.x;
      var bz = F3.BANCADA.z;
      var g = S.grupo(bx, 0, bz);
      var mPe = S.mat(C.metalEscuro);
      S.caixa(1.6, 0.05, 0.8, S.mat(C.madeira), 0, 0.76, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, -0.72, 0.37, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, 0.72, 0.37, 0, g);
      S.colisor(bx, bz, 1.6, 0.8);
      var topo = S.grupo(0, 0.785, 0, g);
      // Martelo e caixinha de presilhas (à esquerda).
      var cabo = S.caixa(0.04, 0.03, 0.26, S.mat(C.madeiraEscura), -0.55, 0.02, 0.12, topo);
      var cabeca = S.caixa(0.12, 0.05, 0.05, S.mat(C.metal), -0.55, 0.03, 0.0, topo);
      var caixaPres = S.caixa(0.16, 0.06, 0.12, S.mat(0xd9dee4), -0.32, 0.03, 0.15, topo);
      F3.kitPresilhas = [cabo, cabeca, caixaPres];
      S.interativo([cabo, cabeca, caixaPres], {
        id: 'kitPresilhas',
        nome: 'Martelo e presilhas',
        ancora: new THREE.Vector3(bx - 0.35, 0, bz + 0.9)
      });
      // Rolo com os 6 cabos UTP (atrás, à esquerda): pega uma vez só.
      var roloCabos = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 4, 10), S.mat(C.caboAzul));
      roloCabos.rotation.x = Math.PI / 2;
      roloCabos.position.set(-0.3, 0.05, -0.14);
      roloCabos.castShadow = true;
      topo.add(roloCabos);
      var etiq = S.caixa(0.08, 0.02, 0.05, S.mat(0xffffff), -0.3, 0.1, -0.14, topo, true);
      F3.kitCabos = [roloCabos, etiq];
      S.interativo(F3.kitCabos, {
        id: 'kitCabos',
        nome: 'Rolo com 6 cabos UTP',
        ancora: new THREE.Vector3(bx - 0.25, 0, bz + 0.9)
      });
      // Keystones + punch down (meio).
      var ks = [];
      for (var i = 0; i < 3; i++) ks.push(S.caixa(0.06, 0.05, 0.06, S.mat(C.caboAzul), 0.02 + i * 0.08, 0.03, 0.18, topo));
      var punch = S.caixa(0.05, 0.05, 0.2, S.mat(0xf2c200), 0.12, 0.03, 0.0, topo);
      F3.kitKeystone = ks.concat([punch]);
      S.interativo(F3.kitKeystone, {
        id: 'kitKeystone3',
        nome: 'Keystones e punch down',
        ancora: new THREE.Vector3(bx + 0.1, 0, bz + 0.9)
      });
      // Patch cords (rolo amarelo, à direita).
      var rolo = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 4, 10), S.mat(0xf2c200));
      rolo.rotation.x = Math.PI / 2;
      rolo.position.set(0.52, 0.05, 0.1);
      rolo.castShadow = true;
      topo.add(rolo);
      F3.kitPatch = [rolo];
      S.interativo([rolo], {
        id: 'kitPatch',
        nome: 'Patch cords prontos',
        ancora: new THREE.Vector3(bx + 0.45, 0, bz + 0.9)
      });
      S.mundo.criarCartaz(g, bx, bz);
    }

    // Quadro no canto esquerdo do fundo, mais alto: longe dos X e das tomadas.
    F3.montarSala = function () {
      S.mundo.montarSala({ quadroX: -3.9, quadroY: 1.98, placaX: 1.0, janelas: [-0.2, 2.6] });
    };
    F3.montarEquipamentos = function () {
      montarRack();
      F3.PCS.forEach(function (p) {
        S.mundo.criarPc(p.nome, p.x, p.z, true, 1.5, p.rot);
      });
      montarPresilhas();
      montarPontos();
      montarCanaleta();
      montarBancada();
    };
    F3.limpar = function () {
      tuboFeixe = null;
      F3.texSwitch = null;
      F3.presilhas = F3.tomadas = F3.trechos = null;
    };
  });


  /* ================================================================== */
  secao('F3B-estado-e-missoes', function () {
    var F3 = S.f3;

    F3.reiniciar = function () {
      F3.kitPres = false;
      F3.kitCabosOk = false;
      F3.kitKs = false;
      F3.kitPatchOk = false;
      F3.portas = [];
      F3.restantes = 0; // cabos ainda na mão (feixe)
      F3.feixeAte = null; // até onde o feixe já foi preso na parede (s da rota)
    };
    F3.reiniciar();

    function pcs() { return F3.PCS.map(function (p) { return S.pcs[p.nome].estado; }); }
    function conta(lista, fn) { return (lista || []).filter(fn).length; }
    F3.presilhasProntas = function () { return conta(F3.presilhas, function (p) { return p.pronta; }); };
    F3.cabosNosPontos = function () { return conta(F3.tomadas, function (t) { return t.cabo; }); };
    F3.canaletasProntas = function () { return conta(F3.trechos, function (t) { return t.pronta; }); };
    F3.tomadasProntas = function () { return conta(F3.tomadas, function (t) { return t.instalada; }); };
    F3.patches = function () { return conta(F3.tomadas, function (t) { return t.patch; }); };
    F3.pcsComLink = function (porta) {
      var i = F3.portas.indexOf(porta);
      if (i < 0 || !F3.tomadas) return false;
      var t = F3.tomadas[i];
      return t && t.patch && S.pcs[t.pc].estado.ligado;
    };

    // Ordem do caminho, a partir do switch (s crescente).
    F3.rota = function () {
      var itens = [];
      (F3.presilhas || []).forEach(function (p) { itens.push({ tipo: 'presilha', s: p.s, obj: p }); });
      (F3.tomadas || []).forEach(function (t) { itens.push({ tipo: 'ponto', s: t.s, obj: t }); });
      return itens.sort(function (a, b) { return a.s - b.s; });
    };
    // Para chegar num ponto, o feixe precisa ter passado pelas presilhas antes dele.
    F3.presilhasAntes = function (s) {
      return (F3.presilhas || []).filter(function (p) { return p.s < s; });
    };
    // O cabo da mão sai de onde o feixe termina agora: a última presilha
    // ou o último ponto de rede em que o aluno deixou cabo.
    F3.ancoraFeixe = function () {
      return F3.pontoRota(F3.feixeAte || 0, F3.FIO_Y, 0.08);
    };

    F3.proximoDaRota = function () {
      var r = F3.rota();
      for (var i = 0; i < r.length; i++) {
        var it = r[i];
        if (it.tipo === 'presilha' && !it.obj.passou) return it;
        if (it.tipo === 'ponto' && !it.obj.cabo) return it;
      }
      return null;
    };
    function proximoDaRota() {
      var r = F3.rota();
      for (var i = 0; i < r.length; i++) {
        var it = r[i];
        if (it.tipo === 'presilha' && !it.obj.passou) return 'presilha:' + it.obj.id;
        if (it.tipo === 'ponto' && !it.obj.cabo) return 'ponto:' + it.obj.n;
      }
      return null;
    }

    F3.MISSOES = [
      {
        id: 'kitPres',
        quadro: 'Pegar martelo e presilhas',
        texto: 'Pegue o martelo e as presilhas na bancada da direita.',
        feita: function () { return F3.kitPres || F3.presilhasProntas() === 3; },
        alvos: function () { return ['kitPresilhas']; },
        dica1: 'A bancada de ferramentas fica à direita, perto da mesa do professor.',
        dica2: 'Use o martelo e a caixinha de presilhas na bancada.'
      },
      {
        id: 'presilhas',
        quadro: 'Pregar presilhas (3 pontos)',
        texto: function () { return 'Pregue 3 presilhas em cada X da parede, na ordem A, B e C (' + F3.presilhasProntas() + '/3).'; },
        feita: function () { return F3.presilhasProntas() === 3; },
        alvos: function () { var p = F3.proximaPresilha(); return p ? ['presilha:' + p.id] : []; },
        dica1: 'Os X vermelhos ficam na parede, atrás das bancadas: A e B no fundo, C na lateral esquerda. Ande pelo corredor atrás das mesas até ficar de frente para o X.',
        dica2: 'Comece pelo A (perto do rack), depois B e por último C. Martele com o marcador dentro da faixa verde.'
      },
      {
        id: 'cabos',
        quadro: 'Pegar os 6 cabos',
        texto: 'Pegue o rolo com os 6 cabos UTP na bancada.',
        feita: function () { return F3.kitCabosOk || F3.portas.length === 6; },
        alvos: function () { return ['kitCabos']; },
        dica1: 'O rolo azul de cabos fica na bancada de ferramentas, à direita.',
        dica2: 'Pegue o rolo uma vez só: ele já tem os 6 cabos.'
      },
      {
        id: 'switch',
        quadro: '6 cabos no switch',
        texto: 'Leve os 6 cabos até o switch do rack e conecte em portas Fast.',
        feita: function () { return F3.portas.length === 6; },
        alvos: function () { return ['switch3']; },
        dica1: 'O switch está no rack, no canto do fundo à direita.',
        dica2: 'Use portas Fast (Fa0/1 a Fa0/24). A Gigabit laranja é o uplink do servidor.'
      },
      {
        id: 'feixe',
        quadro: 'Passar o feixe até os 6 pontos',
        texto: function () { return 'Passe o feixe pelas presilhas e deixe um cabo em cada ponto de rede (' + F3.cabosNosPontos() + '/6).'; },
        feita: function () { return F3.cabosNosPontos() === 6; },
        alvos: function () { var a = proximoDaRota(); return a ? [a] : []; },
        dica1: 'Pelo corredor atrás das mesas, saindo do switch: presilha A, pontos 1, 2 e 3, presilha B, ponto 4, presilha C, pontos 5 e 6.',
        dica2: 'Um ponto só recebe cabo depois que o feixe passa pelas presilhas entre ele e o switch.'
      },
      {
        id: 'canaleta',
        quadro: 'Canaleta nos 4 trechos',
        texto: function () { return 'Esconda os cabos: instale a canaleta nos 4 trechos da parede (' + F3.canaletasProntas() + '/4).'; },
        feita: function () { return F3.canaletasProntas() === 4; },
        alvos: function () { return (F3.trechos || []).filter(function (t) { return !t.pronta; }).map(function (t) { return 'canaleta:' + t.n; }); },
        dica1: 'Os trechos aparecem como uma faixa branca transparente sobre os cabos.',
        dica2: 'Em cada trecho: fixe a base e feche a tampa.'
      },
      {
        id: 'kitKs',
        quadro: 'Pegar keystones',
        texto: 'Pegue as keystones e a ferramenta punch down na bancada.',
        feita: function () { return F3.kitKs || F3.tomadasProntas() === 6; },
        alvos: function () { return ['kitKeystone3']; },
        dica1: 'Estão no meio da bancada de ferramentas, à direita.',
        dica2: 'Caixinha azul com as keystones e a punch down amarela.'
      },
      {
        id: 'keystones',
        quadro: 'Montar 6 tomadas keystone',
        texto: function () { return 'Monte as tomadas keystone nos 6 pontos (' + F3.tomadasProntas() + '/6).'; },
        feita: function () { return F3.tomadasProntas() === 6; },
        alvos: function () { return (F3.tomadas || []).filter(function (t) { return !t.instalada; }).map(function (t) { return 'ponto:' + t.n; }); },
        dica1: 'Siga a linha B da etiqueta da keystone (T-568B).',
        dica2: 'Branco-laranja, laranja, branco-verde, azul, branco-azul, verde, branco-marrom, marrom.'
      },
      {
        id: 'patch',
        quadro: 'Patch cords nos 6 PCs',
        texto: function () { return (F3.kitPatchOk ? 'Ligue cada PC à sua tomada com um patch cord' : 'Pegue os patch cords na bancada e ligue os PCs às tomadas') + ' (' + F3.patches() + '/6).'; },
        feita: function () { return F3.patches() === 6; },
        alvos: function () {
          if (!F3.kitPatchOk) return ['kitPatch'];
          return (F3.tomadas || []).filter(function (t) { return !t.patch; }).map(function (t) { return 'ponto:' + t.n; });
        },
        dica1: 'O rolo amarelo de patch cords fica na bancada.',
        dica2: 'Em cada ponto: encaixe na keystone e depois na porta RJ45 (a maior, de 8 contatos) atrás do PC. A RJ11 é de telefone.'
      },
      {
        id: 'ligar',
        quadro: 'Ligar os 6 PCs',
        texto: function () { return 'Ligue os seis computadores (' + conta(pcs(), function (e) { return e.ligado; }) + '/6).'; },
        feita: function () { return conta(pcs(), function (e) { return e.ligado; }) === 6; },
        alvos: function () { return F3.PCS.filter(function (p) { return !S.pcs[p.nome].estado.ligado; }).map(function (p) { return 'pc:' + p.nome; }); },
        dica1: 'Use cada PC e aperte o botão de energia do gabinete.',
        dica2: 'O botão de energia tem o círculo com um traço em cima.'
      },
      {
        id: 'dhcp',
        quadro: 'IP automático nos 6 PCs',
        texto: function () { return 'Em cada PC, peça IP automático ao servidor DHCP (' + conta(pcs(), function (e) { return e.dhcp; }) + '/6).'; },
        feita: function () { return conta(pcs(), function (e) { return e.dhcp; }) === 6; },
        alvos: function () { return F3.PCS.filter(function (p) { return !S.pcs[p.nome].estado.dhcp; }).map(function (p) { return 'pc:' + p.nome; }); },
        dica1: 'Use o PC já ligado e clique em "Obter IP automaticamente".',
        dica2: 'O servidor da outra sala entrega IPs a partir de 192.168.0.100.'
      }
    ];
  });

  /* ================================================================== */
  secao('F3C-acoes', function () {
    var F3 = S.f3;
    var J = S.jogo;
    var MG = S.minigames;

    function rotuloMao() {
      if (!J.mao) return;
      if (J.mao.tipo === 'feixe') J.definirMao({ tipo: 'feixe', rotulo: 'Feixe com ' + F3.restantes + ' cabo' + (F3.restantes > 1 ? 's' : '') });
    }

    // Presilhas são pregadas na ordem A, B, C.
    F3.proximaPresilha = function () {
      return (F3.presilhas || []).filter(function (p) { return !p.pronta; })[0] || null;
    };

    F3.rotulo = function (info) {
      var mao = J.mao;
      if (info.id === 'kitCabos') return F3.kitCabosOk ? 'Cabos (já pegou)' : 'Pegar os 6 cabos UTP';
      if (info.id === 'kitPresilhas') return F3.kitPres ? 'Martelo e presilhas (já pegou)' : 'Pegar martelo e presilhas';
      if (info.id === 'kitKeystone3') return F3.kitKs ? 'Keystones (já pegou)' : 'Pegar keystones e punch down';
      if (info.id === 'kitPatch') return F3.kitPatchOk ? 'Patch cords (já pegou)' : 'Pegar patch cords';
      if (info.id === 'switch3') return F3.portas.length === 6 ? 'Ver switch' : mao && mao.tipo === 'cabos6' ? 'Conectar os 6 cabos no switch' : 'Switch (traga os cabos)';
      if (info.presilha) {
        var p = info.presilha;
        if (!p.pronta) return 'Pregar presilhas no ponto ' + p.id;
        return mao && mao.tipo === 'feixe' && !p.passou ? 'Passar o feixe pela presilha ' + p.id : 'Presilhas ' + p.id;
      }
      if (info.ponto) {
        var t = info.ponto;
        if (!t.cabo) return mao && mao.tipo === 'feixe' ? 'Deixar um cabo no ponto ' + t.n : 'Ponto de rede ' + t.n;
        if (!t.instalada) return 'Montar a tomada do ponto ' + t.n;
        if (!t.patch) return 'Ligar patch cord no ' + t.pc;
        return 'Ponto ' + t.n + ' (pronto)';
      }
      if (info.trecho) return info.trecho.pronta ? 'Canaleta (instalada)' : 'Instalar a canaleta (trecho ' + info.trecho.n + ')';
      if (info.pc) return info.pc.estado.ligado ? 'Usar ' + info.pc.nome : 'Ligar ' + info.pc.nome;
      return null;
    };

    F3.usar = function (info) {
      if (info.id === 'kitPresilhas') {
        if (F3.kitPres) return S.aviso('Você já pegou isso.', 'info');
        pegar('kitPres', F3.kitPresilhas, 'Você pegou o martelo e as presilhas. Vá até cada X na parede, por trás das bancadas.');
        J.definirMao({ tipo: 'martelo', rotulo: 'Martelo e presilhas' });
        F3.marteloNaMao(true);
        return;
      }
      if (info.id === 'kitKeystone3') {
        if (F3.canaletasProntas() < 4) return S.aviso('Primeiro passe os cabos e esconda tudo na canaleta.', 'alerta', 3200);
        return pegar('kitKs', F3.kitKeystone, 'Você pegou as keystones e a punch down. Monte as tomadas nos 6 pontos.');
      }
      if (info.id === 'kitPatch') {
        if (F3.tomadasProntas() < 6) return S.aviso('Os patch cords entram depois que as 6 tomadas estiverem montadas.', 'alerta', 3200);
        return pegar('kitPatchOk', F3.kitPatch, 'Você pegou 6 patch cords. Ligue cada PC à tomada atrás dele.');
      }
      if (info.id === 'kitCabos') {
        if (F3.kitCabosOk) return S.aviso('Você já pegou os 6 cabos.', 'info');
        if (F3.presilhasProntas() < 3) return S.aviso('Primeiro pregue as presilhas nos 3 X da parede.', 'alerta', 3000);
        pegar('kitCabosOk', F3.kitCabos, 'Você pegou 6 cabos UTP. Leve até o switch no rack.');
        J.definirMao({ tipo: 'cabos6', rotulo: '6 cabos UTP' });
        return;
      }
      if (info.id === 'switch3') return usarSwitch();
      if (info.presilha) return usarPresilha(info.presilha);
      if (info.ponto) return usarPonto(info.ponto);
      if (info.trecho) return usarTrecho(info.trecho);
      if (info.pc) return usarPc(info.pc);
    };

    function pegar(flag, malhas, texto) {
      if (F3[flag]) return S.aviso('Você já pegou isso.', 'info');
      F3[flag] = true;
      S.som('pegar');
      (malhas || []).forEach(function (m) { m.visible = false; });
      S.aviso(texto, 'ok', 3400);
      J.atualizarMissoes();
    }

    function usarPresilha(p) {
      if (!p.pronta) {
        if (!F3.kitPres) return S.aviso('Pegue o martelo e as presilhas na bancada primeiro.', 'alerta', 3000);
        var vez = F3.proximaPresilha();
        if (vez && vez !== p) {
          J.errou('Você pulou a presilha ' + vez.id + '! Pregue na ordem: A, depois B, depois C.');
          return;
        }
        MG.martelo(p, function () {
          p.pronta = true;
          F3.pregarVisual(p);
          if (F3.presilhasProntas() === 3) {
            // Terminou: guarda o martelo e libera o resto da sala.
            F3.marteloNaMao(false);
            J.definirMao(null);
            S.aviso('Os 3 pontos estão com presilhas! Martelo guardado.', 'ok', 3000);
          } else {
            S.aviso('Presilhas do ponto ' + p.id + ' pregadas! Faltam ' + (3 - F3.presilhasProntas()) + '.', 'ok', 2400);
          }
          J.atualizarMissoes();
        });
        return;
      }
      if (!J.mao || J.mao.tipo !== 'feixe') {
        return S.aviso(p.passou ? 'O feixe já passa por aqui.' : F3.portas.length < 6 ? 'Conecte os 6 cabos no switch para começar a passar o feixe.' : 'Presilhas prontas para receber o feixe.', 'info', 2600);
      }
      if (p.passou) return S.aviso('O feixe já passou por esta presilha.', 'info');
      if (!F3.naOrdem(p)) return;
      p.passou = true;
      S.som('fio');
      F3.feixeAte = Math.max(F3.feixeAte || 0, p.s);
      F3.redesenharFeixe(F3.feixeAte);
      S.mundo.definirCaboMao(F3.ancoraFeixe());
      S.aviso('Feixe preso na presilha ' + p.id + '.', 'ok', 2000);
      J.progresso();
    }

    function usarPonto(t) {
      var mao = J.mao;
      if (!t.cabo) {
        if (!mao || mao.tipo !== 'feixe') {
          return S.aviso(F3.portas.length < 6 ? 'O cabo deste ponto sai do switch: conecte os 6 cabos no rack primeiro.' : 'Traga o feixe de cabos até aqui.', 'info', 3000);
        }
        if (!F3.naOrdem(t)) return;
        F3.caboNoPonto(t);
        S.som('fio');
        F3.restantes--;
        F3.feixeAte = Math.max(F3.feixeAte || 0, t.s);
        F3.redesenharFeixe(F3.feixeAte);
        if (F3.restantes <= 0) {
          J.definirMao(null);
          F3.mostrarGuiasCanaleta(true);
          S.aviso('Os 6 cabos chegaram! Agora esconda tudo na canaleta.', 'ok', 3400);
        } else {
          rotuloMao();
          S.mundo.definirCaboMao(F3.ancoraFeixe());
          S.aviso('Cabo deixado no ponto ' + t.n + '. Faltam ' + F3.restantes + '.', 'ok', 2200);
        }
        J.atualizarMissoes();
        return;
      }
      if (!t.instalada) {
        if (F3.canaletasProntas() < 4) return S.aviso('Primeiro esconda os cabos na canaleta.', 'alerta', 3000);
        if (!F3.kitKs) return S.aviso('Pegue as keystones e a punch down na bancada.', 'alerta', 3000);
        MG.keystone(t, function () {
          F3.tomadaPronta(t);
          S.aviso('Tomada ' + t.n + ' montada!', 'ok', 2200);
          J.atualizarMissoes();
        }, { semPatch: true });
        return;
      }
      if (!t.patch) {
        if (!F3.kitPatchOk) return S.aviso('Pegue os patch cords na bancada.', 'alerta', 3000);
        MG.patchCord(t, function () {
          F3.ligarPatch(t);
          S.aviso(t.pc + ' ligado à tomada ' + t.n + ' com patch cord.', 'ok', 2400);
          J.atualizarMissoes();
        });
        return;
      }
      S.aviso('Ponto ' + t.n + ': tudo pronto.', 'info');
    }

    function usarTrecho(tr) {
      if (tr.pronta) return S.aviso('Este trecho já tem canaleta.', 'info');
      if (F3.cabosNosPontos() < 6) return S.aviso('A canaleta entra depois que os 6 cabos estiverem no lugar.', 'alerta', 3000);
      MG.canaleta(tr, function () {
        F3.canaletaPronta(tr);
        S.aviso('Trecho ' + tr.n + ' com canaleta!', 'ok', 2200);
        J.atualizarMissoes();
      });
    }

    // O feixe segue a rota sem pular nada: se o aluno tenta um item lá na
    // frente, é erro e o jogo diz o que ficou para trás.
    F3.naOrdem = function (obj) {
      var esperado = F3.proximoDaRota();
      if (!esperado || esperado.obj === obj) return true;
      var puladas = (F3.presilhas || []).filter(function (q) { return !q.passou && q.s < obj.s; });
      if (puladas.length) {
        J.errou('Você pulou a presilha ' + puladas[0].id + '! Passe o feixe por ela antes de seguir.');
      } else if (esperado.tipo === 'ponto') {
        J.errou('Você pulou o ponto ' + esperado.obj.n + '! Deixe um cabo nele antes de seguir.');
      } else {
        J.errou('Siga a ordem da parede: agora é a presilha ' + esperado.obj.id + '.');
      }
      return false;
    };

    function usarSwitch() {
      if (F3.portas.length === 6) return S.aviso('Os 6 cabos já estão no switch.', 'info');
      if (!J.mao || J.mao.tipo !== 'cabos6') return S.aviso('Pegue o rolo com os 6 cabos na bancada primeiro.', 'alerta', 3000);
      MG.switch3(function (portas) {
        F3.portas = portas;
        F3.restantes = 6;
        F3.feixeAte = 0;
        F3.desenharSwitch();
        F3.redesenharFeixe(0);
        J.definirMao({ tipo: 'feixe', rotulo: 'Feixe com 6 cabos' });
        S.mundo.definirCaboMao(F3.ancoraFeixe());
        S.aviso('6 cabos no switch! Leve o feixe pela parede: presilha A primeiro.', 'ok', 3600);
        J.atualizarMissoes();
      });
    }

    function usarPc(pc) {
      if (!pc.estado.ligado) {
        MG.gabinete(pc, function () {
          S.ligarPc(pc, true);
          F3.desenharSwitch();
          S.aviso(pc.nome + ' ligado.', 'ok', 2000);
          J.atualizarMissoes();
        });
        return;
      }
      MG.dhcpRapido(pc);
    }

    // Martelo na mão do aluno (no lugar do rolo de cabo).
    var martelo = null;
    F3.marteloNaMao = function (sim) {
      var p = S.personagem;
      if (!p) return;
      if (sim && !martelo) {
        martelo = new THREE.Group();
        var cabo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), S.mat(S.COR.madeiraEscura));
        var cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), S.mat(S.COR.metal));
        cabeca.position.y = 0.17;
        martelo.add(cabo, cabeca);
        martelo.position.set(0, -0.62, 0.1);
        martelo.rotation.x = Math.PI / 2;
        p.rolo.parent.add(martelo);
      }
      if (martelo) martelo.visible = !!sim;
      if (sim) p.rolo.visible = false;
      p.bracoFixo = sim ? -0.5 : undefined;
    };

    F3.soltarMartelo = function () {
      martelo = null;
      if (S.personagem) S.personagem.bracoFixo = undefined;
    };

    // Com o martelo, só os X; com o feixe, só presilhas e pontos de rede.
    F3.permite = function (info) {
      var mao = J.mao;
      if (!mao || info.id === 'professor') return true;
      if (mao.tipo === 'martelo') return !!info.presilha;
      if (mao.tipo === 'cabos6') return info.id === 'switch3';
      if (mao.tipo === 'feixe') return !!(info.presilha || info.ponto);
      return true;
    };
    F3.avisoBloqueado = function () {
      if (J.mao && J.mao.tipo === 'martelo') return 'Você está com o martelo: pregue as presilhas nos X da parede primeiro.';
      if (J.mao && J.mao.tipo === 'cabos6') return 'Você está com os 6 cabos: leve até o switch no rack.';
      return 'Você está com o feixe: passe pelas presilhas e deixe um cabo em cada ponto.';
    };

    // Easter egg: usar o professor com o martelo na mão.
    F3.usarProfessor = function () {
      if (!J.mao || J.mao.tipo !== 'martelo' || !S.professor || S.emCena()) return false;
      S.cenaCurta({
        manterGesto: true,
        posAluno: { x: 3.4, z: 3.05, angulo: Math.PI / 2 },
        tomadas: {
          prof: { pos: [3.0, 1.95, 4.15], alvo: [5.2, 1.5, 3.3] },
          aluno: { pos: [5.6, 2.0, 2.15], alvo: [3.4, 1.2, 3.05] }
        },
        falas: [
          { quem: 'prof', tomada: 'prof', gesto: 'susto', texto: 'Você... não vai usar isso em mim, né?' },
          { quem: 'aluno', tomada: 'aluno', texto: 'Foi mal, professor, cliquei para interagir no lugar errado...' }
        ],
        aoFim: function () {
          if (S.reacaoProfessor) S.reacaoProfessor('Ufa... Os X ficam na parede, viu? Lá atrás das mesas.');
        }
      });
      return true;
    };

    F3.concluir = function () {
      J.encerrarFase('Os 6 PCs estão na rede!', function () {
        S.ui.mostrarFim(3);
      });
    };

    F3.resumo = function () {
      return 'Switch: ' + F3.portas.join(', ') + ' · Presilhas A, B e C · Canaleta em 4 trechos · ' +
        F3.PCS.map(function (p) { return p.nome + ' ' + S.pcs[p.nome].estado.ip; }).join(' · ');
    };
  });

  /* ================================================================== */
  secao('F3D-minigames', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var J = S.jogo;

    // Martelo: o marcador sobe e desce em velocidade constante; martele com
    // ele dentro da faixa verde. O acerto é conferido na posição que está na
    // tela (a mesma que o aluno vê) e a batida conta no momento em que o
    // dedo/botão desce, sem esperar soltar.
    MG.martelo = function (pres, aoConcluir) {
      var TOTAL = S.f3.PREGOS || 3;
      var VEL = [0.75, 0.88, 1.0]; // fração do trilho por segundo
      var TAM = [0.26, 0.22, 0.19]; // tamanho da faixa verde
      var FOLGA = 0.025;
      // Acessibilidade (coordenação motora): marcador mais lento e faixa maior.
      if (S.cfg.marteloAssistido) {
        VEL = [0.42, 0.48, 0.54];
        TAM = [0.4, 0.36, 0.33];
        FOLGA = 0.05;
      }
      var m = S.ui.abrirModal('Ponto ' + pres.id + ' · pregar ' + TOTAL + ' presilhas', { largura: '540px' });
      var ap = S.ui.compacto();
      S.el('div', { marginBottom: '8px' }, 'Martele quando o marcador estiver na faixa verde. Fora dela a presilha entorta.', m.corpo);
      var area = S.el('div', { display: 'flex', gap: '18px', alignItems: 'center', justifyContent: 'center' }, null, m.corpo);
      var alt = ap ? 150 : 210;
      var trilho = S.el('div', {
        position: 'relative',
        width: '52px',
        height: alt + 'px',
        background: '#1B2B44',
        border: '3px solid #071430',
        borderRadius: '8px',
        flex: '0 0 auto',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'pointer'
      }, null, area);
      var verde = S.el('div', { position: 'absolute', left: '0', right: '0', background: '#2EAA4A', boxShadow: 'inset 0 0 0 2px #6BF08E' }, null, trilho);
      var marcador = S.el('div', { position: 'absolute', left: '-2px', right: '-2px', top: '0', height: '8px', background: C.laranja, border: '2px solid #071430', boxSizing: 'border-box', willChange: 'transform' }, null, trilho);
      var lado = S.el('div', { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }, null, area);
      // Pedaço de parede com as presilhas aparecendo a cada batida certa.
      var parede = S.el('div', { position: 'relative', width: '150px', height: '54px', background: '#E4E9EF', border: '3px solid #071430', borderRadius: '6px', overflow: 'hidden' }, null, lado);
      S.el('div', { position: 'absolute', left: '0', right: '0', top: '22px', height: '6px', background: '#2D7FE0', opacity: '0.35' }, null, parede);
      var icones = [];
      for (var i = 0; i < TOTAL; i++) {
        var slot = S.el('div', { position: 'absolute', top: '10px', left: (20 + i * 44) + 'px', width: '22px', height: '30px', borderRadius: '4px', border: '2px dashed #8A96A6', boxSizing: 'border-box' }, null, parede);
        icones.push(slot);
      }
      var bMart = S.ui.botao('🔨 Martelar', 'primario', null, lado);
      bMart.setAttribute('data-som', 'nao');
      S.estilo(bMart, { fontSize: ap ? '16px' : '18px', padding: ap ? '10px 22px' : '14px 30px', touchAction: 'none' });
      bMart.setAttribute('aria-label', 'Martelar');
      S.el('div', { fontSize: '12px', color: C.cinza }, S.toque ? 'Toque no botão ou na barra' : 'Clique, toque ou aperte Espaço', lado);
      if (S.cfg.marteloAssistido) S.el('div', { fontSize: '11px', color: C.verde, fontWeight: '700' }, 'Martelo assistido ligado', lado);
      var msg = MG.mensagem(m.corpo);
      var feitas = 0;
      var zona = { ini: 0, fim: 0 };
      var pos = Math.random() * 0.3;
      function marcarIcone(k) {
        S.estilo(icones[k], { background: '#F2F4F7', border: '3px solid #071430', boxShadow: 'inset 0 -6px 0 #9AA4B0' });
        S.el('div', { width: '8px', height: '8px', margin: '3px auto 0', borderRadius: '50%', background: '#5B6675' }, null, icones[k]);
      }
      // Se o aluno fechou no meio, continua de onde parou.
      while (feitas < Math.min(TOTAL - 1, pres.pregadas || 0)) marcarIcone(feitas++);
      var dir = 1;
      var ultimo = performance.now();
      var congelaAte = 0;
      var trava = 0;

      function novaZona() {
        var tam = TAM[Math.min(feitas, TAM.length - 1)];
        // Longe de onde o marcador está agora, para não ganhar de graça.
        var tent = 0;
        do {
          zona.ini = 0.06 + Math.random() * (0.88 - tam);
          tent++;
        } while (tent < 8 && pos >= zona.ini - 0.08 && pos <= zona.ini + tam + 0.08);
        zona.fim = zona.ini + tam;
        verde.style.top = (zona.ini * 100) + '%';
        verde.style.height = ((zona.fim - zona.ini) * 100) + '%';
      }
      function desenhar() {
        var y = pos * (alt - 6) - 4;
        marcador.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
      }
      function laco(agora) {
        if (!m.fundo.isConnected) return;
        var dt = Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
        ultimo = agora;
        if (agora >= congelaAte && feitas < TOTAL) {
          pos += dir * VEL[Math.min(feitas, VEL.length - 1)] * dt;
          if (pos >= 1) { pos = 2 - pos; dir = -1; }
          if (pos <= 0) { pos = -pos; dir = 1; }
          desenhar();
        }
        requestAnimationFrame(laco);
      }
      function martelar() {
        var agora = performance.now();
        if (feitas >= TOTAL || agora < trava || agora < congelaAte) return;
        if (pos >= zona.ini - FOLGA && pos <= zona.fim + FOLGA) {
          S.som('martelo');
          marcarIcone(feitas);
          feitas++;
          pres.pregadas = feitas;
          S.f3.pregarVisual(pres);
          verde.style.background = '#6BF08E';
          setTimeout(function () { verde.style.background = '#2EAA4A'; }, 180);
          if (feitas === TOTAL) {
            msg('✔ As ' + TOTAL + ' presilhas do ponto ' + pres.id + ' estão pregadas!', 'ok');
            setTimeout(function () { m.fechar(true); aoConcluir(); }, 650);
            return;
          }
          msg('Pá! Presilha ' + feitas + '/' + TOTAL + ' firme.', 'ok');
          congelaAte = agora + 300;
          novaZona();
        } else {
          J.erros++;
          S.som('marteloErro');
          trava = agora + 450;
          msg('✖ Torta! Martele com o marcador dentro do verde.', 'erro');
          trilho.style.borderColor = '#D63A33';
          setTimeout(function () { trilho.style.borderColor = '#071430'; }, 300);
        }
      }
      // Conta na descida do dedo/botão do mouse (o "click" só vem ao soltar).
      function aoApertar(ev) {
        if (ev.button !== undefined && ev.button > 0) return;
        ev.preventDefault();
        S.protegido('martelo', martelar)();
      }
      bMart.addEventListener('pointerdown', aoApertar);
      trilho.addEventListener('pointerdown', aoApertar);
      function tecla(ev) {
        if (!m.fundo.isConnected) {
          window.removeEventListener('keydown', tecla);
          return;
        }
        if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          if (!ev.repeat) martelar();
        }
      }
      window.addEventListener('keydown', tecla);
      novaZona();
      desenhar();
      requestAnimationFrame(function (t) { ultimo = t; laco(t); });
      MG.marteloAtual = { zona: zona, posicao: function () { return pos; }, martelar: martelar };
    };

    // Patch cord: 1) encaixa na keystone da parede; 2) escolhe a porta certa
    // na traseira do PC (as outras portas contam erro).
    MG.patchCord = function (t, aoConcluir) {
      var m = S.ui.abrirModal('Patch cord · tomada P' + t.n + ' ↔ ' + t.pc, { largura: '640px' });
      var ap = S.ui.compacto();
      var passo = S.el('div', { marginBottom: '8px' }, '', m.corpo);
      var area = S.el('div', { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);
      var encaixado = false;
      var feito = false;

      function painel(titulo) {
        var c = S.el('div', {
          flex: '1 1 240px', background: '#071733', border: '3px solid ' + C.borda, borderRadius: '8px',
          padding: ap ? '8px' : '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
        }, null, area);
        S.el('div', { fontSize: '12px', fontWeight: '700', color: C.laranja, letterSpacing: '0.06em', alignSelf: 'flex-start' }, titulo, c);
        return c;
      }

      // ---- 1. Tomada na parede ---------------------------------------------
      var pParede = painel('1 · TOMADA P' + t.n + ' (PAREDE)');
      var cena = S.el('div', { position: 'relative', width: '200px', height: ap ? '118px' : '140px' }, null, pParede);
      var espelho = S.el('div', {
        position: 'absolute', left: '62px', top: '6px', width: '76px', height: ap ? '100px' : '118px',
        background: '#F4F6F9', border: '3px solid #9AA5B1', borderRadius: '8px', boxSizing: 'border-box'
      }, null, cena);
      S.el('div', { position: 'absolute', left: '0', right: '0', top: '6px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#0B4F9C' }, 'P' + t.n, espelho);
      var ks = S.el('button', {
        position: 'absolute', left: '19px', top: ap ? '30px' : '38px', width: '32px', height: '32px',
        background: '#2D7FE0', border: '3px solid #071430', borderRadius: '4px', cursor: 'pointer', padding: '0'
      }, null, espelho);
      ks.type = 'button';
      ks.setAttribute('aria-label', 'Encaixar na keystone');
      var furoKs = MG.portaRJ(ks, 'rj45', 0.62);
      S.estilo(furoKs, { marginTop: '5px', background: '#2D7FE0', padding: '2px', width: 'auto', height: 'auto', display: 'inline-block' });
      // Ponta RJ45 do patch cord (amarelo), esperando para entrar.
      var plugue = S.el('div', {
        position: 'absolute', left: '80px', top: ap ? '84px' : '100px', width: '26px', height: '30px',
        transition: 'transform .3s ease', pointerEvents: 'none'
      }, null, cena);
      S.el('div', { width: '20px', height: '16px', margin: '0 auto', background: 'rgba(230,240,255,0.9)', border: '2px solid #9AA5B1', borderRadius: '2px' }, null, plugue);
      S.el('div', { width: '10px', height: '22px', margin: '0 auto', background: '#F2C200', borderRadius: '0 0 3px 3px' }, null, plugue);
      plugue.style.transform = 'translate(4px, 22px)';

      ks.addEventListener('click', S.protegido('patch:keystone', function () {
        if (encaixado) return msg('Já está encaixado na tomada.', 'info');
        encaixado = true;
        S.som('plugue');
        plugue.style.transform = 'translate(4px, ' + (ap ? '-40px' : '-48px') + ')';
        ks.style.boxShadow = '0 0 0 3px ' + C.verde;
        msg('Clique! Patch cord encaixado na keystone da tomada P' + t.n + '.', 'ok');
        atualizarPasso();
      }));

      // ---- 2. Traseira do PC -------------------------------------------------
      var pPc = painel('2 · TRASEIRA DO ' + t.pc);
      var traseira = S.el('div', {
        display: 'grid', gridTemplateColumns: 'repeat(4, 52px)', gap: '8px', justifyContent: 'center',
        background: '#3A434F', border: '3px solid #071430', borderRadius: '6px', padding: '10px'
      }, null, pPc);
      var PORTAS = [
        { id: 'rj45', nome: 'Porta RJ45', certa: true },
        { id: 'rj11', nome: 'Porta RJ11', dica: 'Essa é a RJ11, de telefone/modem: é menor e tem só 4 contatos. A de rede é a RJ45, com 8.' },
        { id: 'usb', nome: 'Porta USB', dica: 'Essa é uma USB (teclado, mouse, pendrive).' },
        { id: 'usb2', nome: 'Porta USB 2', dica: 'Essa é uma USB (teclado, mouse, pendrive).' },
        { id: 'hdmi', nome: 'Porta HDMI', dica: 'Essa é a HDMI: saída de vídeo para o monitor.' },
        { id: 'vga', nome: 'Porta VGA', dica: 'Essa é a VGA: vídeo analógico para monitor antigo.' },
        { id: 'audio', nome: 'Saída de áudio', dica: 'Essa é a saída de áudio (verde), para fone ou caixa de som.' },
        { id: 'mic', nome: 'Entrada de microfone', dica: 'Essa é a entrada de microfone (rosa).' }
      ];
      function desenho(b, id) {
        var d = function (estilo) { return S.el('div', estilo, null, b); };
        var base = { margin: '0 auto', boxSizing: 'border-box' };
        if (id === 'rj45' || id === 'rj11') {
          MG.portaRJ(b, id, 1);
        } else if (id === 'usb' || id === 'usb2') {
          d(Object.assign({ width: '30px', height: '12px', background: '#0A0C0F', border: '3px solid #C9D2DC', borderRadius: '1px', borderBottomWidth: '6px', borderBottomColor: '#2D7FE0' }, base));
        } else if (id === 'hdmi') {
          d(Object.assign({ width: '34px', height: '12px', background: '#0A0C0F', border: '3px solid #C9D2DC', clipPath: 'polygon(0 0,100% 0,100% 60%,85% 100%,15% 100%,0 60%)' }, base));
        } else if (id === 'vga') {
          d(Object.assign({ width: '36px', height: '18px', background: '#2D5FA8', border: '3px solid #C9D2DC', clipPath: 'polygon(0 0,100% 0,90% 100%,10% 100%)' }, base));
        } else {
          d(Object.assign({ width: '20px', height: '20px', borderRadius: '50%', background: id === 'audio' ? '#3BB54A' : '#E888B0', border: '5px solid #0A0C0F' }, base));
        }
      }
      S.embaralhar(PORTAS).forEach(function (p) {
        var b = S.el('button', {
          height: '44px', background: '#2B333E', border: '2px solid #5B6675', borderRadius: '4px',
          cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation'
        }, null, traseira);
        b.type = 'button';
        b.setAttribute('aria-label', p.nome);
        b.title = p.nome;
        desenho(b, p.id);
        b.addEventListener('click', S.protegido('patch:porta', function () {
          if (feito) return;
          if (!encaixado) return msg('Primeiro encaixe a outra ponta na keystone da parede.', 'info');
          if (!p.certa) {
            J.erros++;
            b.style.borderColor = C.vermelho;
            setTimeout(function () { b.style.borderColor = '#5B6675'; }, 500);
            return msg('✖ Porta errada! ' + p.dica, 'erro');
          }
          feito = true;
          S.som('plugue');
          b.style.borderColor = C.verde;
          b.style.background = '#1E5A2E';
          msg('✔ Encaixado na placa de rede (RJ45) do ' + t.pc + '!', 'ok');
          atualizarPasso();
          setTimeout(function () { m.fechar(true); aoConcluir(); }, 750);
        }));
      });
      S.el('div', { fontSize: '11px', color: C.cinza }, 'Encontre a porta de rede do computador.', pPc);

      function atualizarPasso() {
        passo.textContent = feito ? 'Pronto!' : !encaixado
          ? 'Passo 1: clique na keystone da tomada para encaixar o patch cord.'
          : 'Passo 2: agora encaixe a outra ponta na porta certa atrás do ' + t.pc + '.';
        pParede.style.borderColor = encaixado ? C.verde : C.laranja;
        pPc.style.borderColor = feito ? C.verde : encaixado ? C.laranja : C.borda;
        pPc.style.opacity = encaixado ? '1' : '0.6';
      }
      atualizarPasso();
    };

    // Switch: 6 cabos em portas Fast (a Gi0/1 já é o uplink do servidor).
    MG.switch3 = function (aoConcluir) {
      var m = S.ui.abrirModal('Switch · conectar os 6 cabos', { largura: '700px' });
      S.el('div', { marginBottom: '8px' }, 'Encaixe os 6 cabos em portas Fast Ethernet. As Gigabit (laranja) são para uplink.', m.corpo);
      var painel = S.el('div', {
        display: 'grid',
        gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
        gap: '4px',
        background: '#3A434F',
        border: '3px solid #071430',
        borderRadius: '8px',
        padding: '8px'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);
      var escolhidas = [];
      function porta(nome, rotulo, giga, usada) {
        var b = S.el('button', {
          height: '34px',
          background: usada ? C.laranja : giga ? '#7A4A10' : '#0A0C0F',
          border: '2px solid ' + (giga ? C.laranja : '#5B6675'),
          borderRadius: '3px',
          color: '#FFFFFF',
          fontSize: '10px',
          fontWeight: '700',
          cursor: 'pointer',
          padding: '0',
          touchAction: 'manipulation'
        }, rotulo, painel);
        b.type = 'button';
        b.setAttribute('aria-label', nome);
        b.addEventListener('click', S.protegido('switch3', function () {
          if (usada) return msg('Gi0/1 já está ocupada: é o uplink que leva até o servidor.', 'info');
          if (giga) {
            J.erros++;
            return msg('✖ As portas Gigabit ficam para uplink. Os PCs vão em portas Fast.', 'erro');
          }
          if (escolhidas.indexOf(nome) >= 0) return msg('Essa porta já tem cabo.', 'info');
          escolhidas.push(nome);
          S.som('plugue');
          b.style.background = '#2D7FE0';
          b.textContent = '●';
          msg('Cabo ' + escolhidas.length + '/6 em ' + nome + '.', 'ok');
          if (escolhidas.length === 6) {
            setTimeout(function () { m.fechar(true); aoConcluir(escolhidas.slice()); }, 600);
          }
        }));
      }
      for (var i = 1; i <= 24; i++) {
        porta('Fa0/' + i, String(i), false, false);
        if (i === 12) porta('Gi0/1', 'G1', true, true);
        if (i === 24) porta('Gi0/2', 'G2', true, false);
      }
    };

    // Canaleta: fixa a base sob os cabos e fecha a tampa.
    MG.canaleta = function (tr, aoConcluir) {
      var m = S.ui.abrirModal('Canaleta · trecho ' + tr.n + ' de 4', { largura: '560px' });
      S.el('div', { marginBottom: '8px' }, 'Primeiro fixe a base na parede, por trás dos cabos. Depois encaixe a tampa.', m.corpo);
      var parede = S.el('div', {
        position: 'relative',
        height: '120px',
        background: '#E4E9EF',
        border: '3px solid #071430',
        borderRadius: '8px',
        overflow: 'hidden'
      }, null, m.corpo);
      S.el('div', { position: 'absolute', left: '0', right: '0', bottom: '0', height: '40px', background: '#0B4F9C' }, null, parede);
      var base = S.el('div', { position: 'absolute', left: '6%', right: '6%', top: '38px', height: '34px', border: '4px solid #FFFFFF', borderTop: 'none', borderRadius: '0 0 4px 4px', boxSizing: 'border-box', opacity: '0', transition: 'opacity .3s' }, null, parede);
      for (var i = 0; i < 6; i++) {
        S.el('div', { position: 'absolute', left: '0', right: '0', top: (44 + i * 4) + 'px', height: '3px', background: '#2D7FE0' }, null, parede);
      }
      var tampa = S.el('div', { position: 'absolute', left: '6%', right: '6%', top: '34px', height: '40px', background: '#F2F4F7', border: '2px solid #9AA5B1', borderRadius: '4px', boxSizing: 'border-box', transform: 'translateY(-90px)', transition: 'transform .35s ease' }, null, parede);
      var msg = MG.mensagem(m.corpo);
      var acoes = S.el('div', { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }, null, m.corpo);
      var bBase = S.ui.botao('1. Fixar a base', 'primario', function () {
        if (bBase.disabled) return;
        S.som('parafuso');
        base.style.opacity = '1';
        bBase.disabled = true;
        bBase.style.opacity = '0.5';
        bTampa.disabled = false;
        bTampa.style.opacity = '1';
        msg('Base parafusada na parede, com os cabos dentro.', 'ok');
      }, acoes);
      var bTampa = S.ui.botao('2. Fechar a tampa', 'primario', function () {
        if (bTampa.disabled) return;
        S.som('tampa');
        tampa.style.transform = 'translateY(0)';
        bTampa.disabled = true;
        msg('✔ Tampa encaixada: cabos escondidos e protegidos!', 'ok');
        setTimeout(function () { m.fechar(true); aoConcluir(); }, 700);
      }, acoes);
      bTampa.disabled = true;
      bTampa.style.opacity = '0.5';
    };

    // PC da fase 3: um clique pede IP ao DHCP do servidor da outra sala.
    MG.dhcpRapido = function (pc) {
      var e = pc.estado;
      var m = S.ui.abrirModal(pc.nome + ' · rede', { largura: '480px' });
      var caixa = S.el('div', {
        background: '#F2F5F9',
        color: '#10203A',
        border: '3px solid #071430',
        borderRadius: '8px',
        padding: '12px 14px',
        fontFamily: C.mono,
        fontSize: '13px',
        whiteSpace: 'pre-wrap',
        minHeight: '60px'
      }, e.dhcp ? 'IP ' + e.ip + ' (DHCP)\nGateway ' + e.gateway + ' · DNS ' + e.dns : 'Sem endereço IP.', m.corpo);
      var msg = MG.mensagem(m.corpo);
      var acoes = S.el('div', { marginTop: '10px' }, null, m.corpo);
      var b = S.ui.botao(e.dhcp ? '🔄 Renovar IP' : '🔄 Obter IP automaticamente', 'primario', function () {
        if (!e.conectado) {
          msg('Sem cabo: ligue o patch cord deste PC na tomada atrás dele.', 'erro');
          return;
        }
        b.disabled = true;
        caixa.textContent = 'DHCP Discover…';
        var linhas = ['DHCP Discover…', 'DHCP Offer (servidor 192.168.0.10)', 'DHCP Request', 'DHCP Ack'];
        linhas.forEach(function (l, i) {
          setTimeout(function () {
            if (!m.fundo.isConnected) return;
            caixa.textContent = linhas.slice(0, i + 1).join('\n');
            S.som('bip');
            if (i === linhas.length - 1) concluir();
          }, 280 * (i + 1));
        });
      }, acoes);
      function concluir() {
        if (!e.dhcp) {
          var usados = S.f3.PCS.map(function (p) { return S.pcs[p.nome].estado.ip; });
          var n = 100;
          while (usados.indexOf('192.168.0.' + n) >= 0) n++;
          e.ip = '192.168.0.' + n;
          e.mascara = '255.255.255.0';
          e.gateway = '192.168.0.1';
          e.dns = '192.168.0.10';
          e.dhcp = true;
          e.configurado = true;
        }
        caixa.textContent += '\n\nIP ' + e.ip + ' · Máscara ' + e.mascara + '\nGateway ' + e.gateway + ' · DNS ' + e.dns;
        S.mundo.desenharTela(pc);
        S.f3.desenharSwitch();
        msg('✔ ' + pc.nome + ' recebeu o IP ' + e.ip + '!', 'ok');
        b.disabled = false;
        b.textContent = '🔄 Renovar IP';
        J.atualizarMissoes();
      }
    };
  });

  /* ================================================================== */
  secao('F3E-registro-da-fase', function () {
    var F3 = S.f3;

    S.registrarFase('cabeamento', {
      numero: 3,
      nome: 'Laboratório 3 · Cabeamento estruturado',
      titulo: 'Cabeamento',
      proxima: 'realidade',
      resumoCurto: 'Pregue presilhas, passe 6 cabos do switch até a parede, instale canaleta e tomadas e coloque 6 PCs na rede.',
      missaoCurta: 'Pregue presilhas, passe o feixe de 6 cabos, instale canaleta e keystones, ligue os PCs e peça IP automático.',
      missaoLonga: 'Faça o cabeamento estruturado de 6 computadores: pregue as presilhas na parede, conecte 6 cabos no switch, passe o feixe até os 6 pontos, esconda tudo na canaleta, monte as tomadas keystone, ligue os patch cords e coloque os PCs na rede com IP automático.',
      usar: F3.usar,
      rotulo: F3.rotulo,
      permite: function (info) { return F3.permite(info); },
      usarProfessor: function () { return F3.usarProfessor(); },
      avisoBloqueado: function (info) { return F3.avisoBloqueado(info); },
      concluir: function () { F3.concluir(); },
      resumo: F3.resumo,
      textoConcluido: 'Cabeamento estruturado completo!',
      etapas: [
        ['Preparando as missões…', function () {
          F3.reiniciar();
          S.jogo.reiniciar(F3.MISSOES);
        }],
        ['Construindo o laboratório 3…', function () { F3.montarSala(); }],
        ['Instalando o rack, a parede e os 6 PCs…', function () { F3.montarEquipamentos(); }],
        ['Chamando o professor e o aluno…', function () {
          S.criarProfessor();
          S.criarPersonagem(S.aluno.nome, S.aluno.genero);
          S.mundo.montarCaboMao();
          S.mundo.montarSeta();
        }]
      ],
      desmontar: function () {
        if (S.esconderBalaoProfessor) S.esconderBalaoProfessor();
        F3.soltarMartelo();
        F3.limpar();
      },
      abertura: {
        titulo: 'LABORATÓRIO 3 · CABEAMENTO',
        portaAberta: true,
        inicio: { x: -5.35, z: 3.0 },
        tomadas: {
          abertura: { pos: [-1.2, 4.6, 8.6], alvo: [-4.2, 0.8, 2.4] },
          rack: { pos: [2.5, 2.6, -0.4], alvo: [4.95, 1.7, -3.95] },
          presilhas: { pos: [0.6, 3.6, 1.6], alvo: [-1.6, 0.85, -3.6] },
          parede: { pos: [1.6, 4.2, 3.2], alvo: [-2.4, 0.85, -2.6] },
          bancada: { pos: [2.3, 2.7, 2.2], alvo: [4.7, 0.8, 1.0] },
          pcs: { pos: [1.2, 5.0, 4.6], alvo: [-1.4, 0.6, -1.6] }
        },
        falas: function () {
          var n = S.primeiroNome();
          return [
            { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: 'Último laboratório, ' + n + '! Agora é cabeamento estruturado: seis computadores com tudo organizado.' },
            { quem: 'prof', tomada: 'rack', gesto: 'apontar', texto: 'O servidor já está pronto, na outra sala. É deste switch que saem os seis cabos, um para cada PC.' },
            { quem: 'prof', tomada: 'bancada', gesto: 'apontar', texto: 'Pegue o martelo e as presilhas na bancada. Lá também ficam o rolo com os seis cabos, as keystones e os patch cords.' },
            { quem: 'prof', tomada: 'presilhas', gesto: 'apontar', texto: 'Tem três X marcados na parede: dois no fundo e um na lateral. Vá pelo corredor atrás das mesas e pregue três presilhas em cada X. Martele no verde, senão entorta!' },
            { quem: 'prof', tomada: 'parede', gesto: 'explicar', texto: 'Depois pegue o rolo com os seis cabos na bancada, conecte no switch e leve o feixe pela parede, sem pular nenhuma presilha, deixando um cabo em cada ponto.' },
            { quem: 'prof', tomada: 'parede', gesto: 'falar', texto: 'Com os cabos no lugar, esconda tudo na canaleta e monte as seis tomadas keystone.' },
            { quem: 'prof', tomada: 'pcs', gesto: 'apontar', texto: 'São três PCs no fundo e três na lateral. Por fim, ligue cada um na tomada com um patch cord, ligue os computadores e peça IP automático.' },
            { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: 'Boa sorte, ' + n + '!' },
            { quem: 'aluno', tomada: 'aluno', texto: 'Bora organizar esses cabos!' }
          ];
        }
      },
      final: {
        sair: false,
        falas: function () {
          var n = S.primeiroNome();
          return [
            { quem: 'prof', tomada: 'despedida', gesto: 'aceno', texto: 'Parabéns, ' + n + '! Cabeamento estruturado completo: seis PCs na rede e nenhum fio aparecendo.' },
            { quem: 'prof', tomada: 'despedida', gesto: 'falar', texto: 'Você concluiu os três laboratórios. Já pode se considerar um técnico de redes!' }
          ];
        }
      }
    });
  });


  /* ================================================================== */
  secao('A01-motor-de-audio', function () {
    // Todos os sons são sintetizados com Web Audio: nenhum arquivo é baixado
    // (funciona igual no Canva e no pendrive). Três canais com volume próprio
    // (efeitos, falas, música) passam por um compressor que segura os picos.
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var A = S.audio = { ctx: null };
    var bus = {};
    var ruido = null;
    // Nível de referência de cada canal: a música fica atrás dos efeitos e falas.
    var NIVEL = { efeitos: 1.0, falas: 0.95, musica: 0.5 };

    function iniciar() {
      if (A.ctx || !Ctx) return A.ctx;
      try {
        var ctx = new Ctx();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.18;
        var mestre = ctx.createGain();
        mestre.gain.value = 0.95;
        comp.connect(mestre);
        mestre.connect(ctx.destination);
        ['efeitos', 'falas', 'musica'].forEach(function (n) {
          var g = ctx.createGain();
          g.gain.value = 0;
          g.connect(comp);
          bus[n] = g;
        });
        // 1 s de ruído branco reaproveitado por todos os sons "de impacto".
        ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        var d = ruido.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        A.ctx = ctx;
        A.aplicarVolumes();
      } catch (e) {
        registrarErro('audio', e);
        A.ctx = null;
      }
      return A.ctx;
    }

    // Curva quadrática: o meio do controle soa como "metade" do volume.
    function ganho(v) {
      v = Math.max(0, Math.min(1, Number(v) || 0));
      return v * v;
    }
    A.aplicarVolumes = function () {
      if (!A.ctx) return;
      var t = A.ctx.currentTime;
      bus.efeitos.gain.setTargetAtTime(ganho(S.cfg.volEfeitos) * NIVEL.efeitos, t, 0.03);
      bus.falas.gain.setTargetAtTime(ganho(S.cfg.volFalas) * NIVEL.falas, t, 0.03);
      bus.musica.gain.setTargetAtTime(ganho(S.cfg.volMusica) * NIVEL.musica, t, 0.08);
    };

    A.pronto = function () {
      return !!A.ctx && A.ctx.state === 'running';
    };

    // O navegador só libera som depois de um toque/clique/tecla.
    function destravar() {
      var ctx = iniciar();
      if (!ctx) return;
      if (ctx.state !== 'running' && ctx.resume) {
        try { ctx.resume().catch(function () {}); } catch (e) { /* ignora */ }
      }
      if (A.iniciarMusica) A.iniciarMusica();
    }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
      window.addEventListener(ev, function () {
        try { destravar(); } catch (e) { registrarErro('audio:destravar', e); }
      }, true);
    });
    A.destravar = destravar;

    // ---- Blocos de construção -------------------------------------------
    // Tom com envelope: { f, f2, t, dur, vol, tipo, ataque, filtro, q, canal, vib }
    A.tom = function (o) {
      var ctx = A.ctx;
      var t0 = ctx.currentTime + (o.t || 0);
      var osc = ctx.createOscillator();
      osc.type = o.tipo || 'sine';
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || o.dur));
      var g = ctx.createGain();
      var ataque = o.ataque || 0.004;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(o.vol, t0 + ataque);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      var saida = g;
      osc.connect(g);
      if (o.filtro) {
        var fl = ctx.createBiquadFilter();
        fl.type = o.filtro;
        fl.frequency.value = o.ff || 2000;
        fl.Q.value = o.q || 0.8;
        g.connect(fl);
        saida = fl;
      }
      saida.connect(o.destino || A._destino || bus[o.canal || 'efeitos']);
      osc.start(t0);
      osc.stop(t0 + o.dur + 0.05);
      return osc;
    };
    // Ruído filtrado: { t, dur, vol, filtro, ff, ff2, q, ataque, canal }
    A.ruido = function (o) {
      var ctx = A.ctx;
      var t0 = ctx.currentTime + (o.t || 0);
      var src = ctx.createBufferSource();
      src.buffer = ruido;
      src.loop = true;
      var fl = ctx.createBiquadFilter();
      fl.type = o.filtro || 'bandpass';
      fl.frequency.setValueAtTime(o.ff || 2000, t0);
      if (o.ff2) fl.frequency.exponentialRampToValueAtTime(o.ff2, t0 + o.dur);
      fl.Q.value = o.q || 1;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(o.vol, t0 + (o.ataque || 0.002));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      src.connect(fl);
      fl.connect(g);
      g.connect(o.destino || A._destino || bus[o.canal || 'efeitos']);
      src.start(t0, Math.random() * 0.5);
      src.stop(t0 + o.dur + 0.05);
      return src;
    };
    A.bus = bus;
  });

  /* ================================================================== */
  secao('A02-efeitos', function () {
    var A = S.audio;
    var tom = function (o) { return A.tom(o); };
    var ruido = function (o) { return A.ruido(o); };

    // Cada som: função que toca + legenda (para quem joga sem ouvir) +
    // intervalo mínimo entre repetições. Os volumes foram medidos para
    // ficarem no mesmo nível percebido (ver teste_sons.py).
    var SONS = {
      clique: {
        g: 1.43,
        min: 0.035,
        tocar: function () {
          tom({ f: 1750, f2: 1200, dur: 0.035, vol: 0.13, tipo: 'square', filtro: 'lowpass', ff: 3200 });
          ruido({ dur: 0.02, vol: 0.06, filtro: 'highpass', ff: 3000 });
        }
      },
      tecla: {
        g: 3.1,
        min: 0.025,
        tocar: function () {
          ruido({ dur: 0.028, vol: 0.13, filtro: 'bandpass', ff: 2600 + Math.random() * 900, q: 2.5 });
          tom({ f: 420 + Math.random() * 60, dur: 0.03, vol: 0.05, tipo: 'triangle' });
        }
      },
      ok: {
        g: 1.66,
        min: 0.12,
        legenda: 'som de acerto',
        tocar: function () {
          tom({ f: 880, dur: 0.11, vol: 0.12, tipo: 'triangle' });
          tom({ f: 1318.5, t: 0.08, dur: 0.18, vol: 0.12, tipo: 'triangle' });
        }
      },
      erro: {
        g: 1.07,
        min: 0.15,
        legenda: 'som de erro',
        tocar: function () {
          tom({ f: 233, f2: 220, dur: 0.14, vol: 0.13, tipo: 'square', filtro: 'lowpass', ff: 900 });
          tom({ f: 175, f2: 160, t: 0.13, dur: 0.24, vol: 0.13, tipo: 'square', filtro: 'lowpass', ff: 800 });
        }
      },
      missao: {
        g: 1.55,
        min: 0.3,
        legenda: 'missão concluída!',
        tocar: function () {
          [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
            tom({ f: f, t: i * 0.075, dur: i === 3 ? 0.42 : 0.14, vol: 0.1, tipo: 'square', filtro: 'lowpass', ff: 2600 });
            tom({ f: f / 2, t: i * 0.075, dur: i === 3 ? 0.42 : 0.14, vol: 0.06, tipo: 'triangle' });
          });
        }
      },
      vitoria: {
        g: 1.08,
        min: 1,
        legenda: 'música de vitória',
        tocar: function () {
          var notas = [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36], [783.99, 0.6], [1046.5, 0.72]];
          notas.forEach(function (n, i) {
            var fim = i === notas.length - 1;
            tom({ f: n[0], t: n[1], dur: fim ? 0.8 : 0.2, vol: 0.1, tipo: 'square', filtro: 'lowpass', ff: 2800 });
            tom({ f: n[0] / 2, t: n[1], dur: fim ? 0.8 : 0.2, vol: 0.07, tipo: 'triangle' });
          });
          [261.63, 329.63, 392].forEach(function (f) {
            tom({ f: f, t: 0.72, dur: 0.9, vol: 0.045, tipo: 'triangle' });
          });
        }
      },
      // Tesoura do alicate: dois "tchic" + a capa sendo puxada.
      corte: {
        g: 3.1,
        min: 0.2,
        legenda: '✂ cabo cortado',
        tocar: function () {
          [0, 0.16].forEach(function (t) {
            ruido({ t: t, dur: 0.07, vol: 0.32, filtro: 'bandpass', ff: 5200, ff2: 2800, q: 3 });
            tom({ t: t, f: 3400, f2: 2200, dur: 0.05, vol: 0.06, tipo: 'square', filtro: 'bandpass', ff: 3000, q: 2 });
          });
          ruido({ t: 0.34, dur: 0.22, vol: 0.16, filtro: 'bandpass', ff: 1400, ff2: 3200, q: 1.2, ataque: 0.05 });
        }
      },
      // Cachola surgindo na realidade aumentada (brilho subindo).
      aparecer: {
        g: 1.4,
        min: 0.2,
        legenda: 'Cachola apareceu',
        tocar: function () {
          [659.25, 880, 1174.66, 1567.98].forEach(function (f, i) {
            tom({ f: f, t: i * 0.05, dur: 0.16, vol: 0.08, tipo: 'triangle' });
          });
          ruido({ dur: 0.25, vol: 0.06, filtro: 'highpass', ff: 5000, ataque: 0.05 });
        }
      },
      // Capa do cabo sendo cortada em volta e puxada.
      decapar: {
        g: 2.4,
        min: 0.3,
        legenda: 'capa do cabo sendo puxada',
        tocar: function () {
          ruido({ dur: 0.06, vol: 0.3, filtro: 'bandpass', ff: 4800, q: 3 });
          ruido({ t: 0.08, dur: 0.38, vol: 0.14, filtro: 'bandpass', ff: 700, ff2: 2600, q: 1.4, ataque: 0.12 });
          tom({ t: 0.1, f: 260, f2: 520, dur: 0.32, vol: 0.03, tipo: 'triangle', ataque: 0.1 });
        }
      },
      // Alicate de crimpar: catraca + o estalo final do conector.
      crimpar: {
        g: 1.9,
        min: 0.3,
        legenda: 'alicate crimpando o conector',
        tocar: function () {
          for (var i = 0; i < 5; i++) {
            ruido({ t: i * 0.055, dur: 0.025, vol: 0.2, filtro: 'bandpass', ff: 2600, q: 4 });
          }
          ruido({ t: 0.3, dur: 0.07, vol: 0.32, filtro: 'bandpass', ff: 1800, q: 1.5 });
          tom({ t: 0.3, f: 820, f2: 600, dur: 0.12, vol: 0.1, tipo: 'square', filtro: 'lowpass', ff: 1800 });
        }
      },
      fio: {
        g: 2.2,
        min: 0.03,
        tocar: function () {
          tom({ f: 2300, f2: 1700, dur: 0.03, vol: 0.09, tipo: 'triangle' });
          ruido({ dur: 0.018, vol: 0.09, filtro: 'highpass', ff: 4000 });
        }
      },
      // Conector RJ45 entrando na porta: "clic-clac".
      plugue: {
        g: 1.9,
        min: 0.12,
        legenda: 'clique do conector encaixando',
        tocar: function () {
          ruido({ dur: 0.012, vol: 0.32, filtro: 'highpass', ff: 3500 });
          tom({ f: 2600, f2: 1800, dur: 0.035, vol: 0.1, tipo: 'square', filtro: 'bandpass', ff: 2400, q: 3 });
          ruido({ t: 0.07, dur: 0.03, vol: 0.28, filtro: 'bandpass', ff: 1600, q: 2 });
          tom({ t: 0.07, f: 900, f2: 700, dur: 0.05, vol: 0.08, tipo: 'triangle' });
        }
      },
      // Botão de energia + o bipe de quando o computador liga.
      ligar: {
        g: 2.0,
        min: 0.3,
        legenda: 'equipamento ligando (bipe)',
        tocar: function () {
          ruido({ dur: 0.02, vol: 0.25, filtro: 'bandpass', ff: 1500, q: 2 });
          tom({ t: 0.03, f: 140, f2: 420, dur: 0.45, glide: 0.4, vol: 0.06, tipo: 'sawtooth', filtro: 'lowpass', ff: 900, ataque: 0.15 });
          tom({ t: 0.42, f: 1046.5, dur: 0.16, vol: 0.09, tipo: 'square', filtro: 'lowpass', ff: 3000 });
        }
      },
      // Martelada certa: pancada grave + o "tim" do metal.
      martelo: {
        g: 0.77,
        min: 0.08,
        legenda: '🔨 martelada',
        tocar: function () {
          tom({ f: 170, f2: 55, dur: 0.16, vol: 0.42, tipo: 'sine' });
          ruido({ dur: 0.07, vol: 0.38, filtro: 'lowpass', ff: 1400 });
          ruido({ dur: 0.03, vol: 0.25, filtro: 'highpass', ff: 3000 });
          tom({ t: 0.005, f: 2650, dur: 0.28, vol: 0.05, tipo: 'sine', ataque: 0.002 });
          tom({ t: 0.005, f: 3730, dur: 0.18, vol: 0.03, tipo: 'sine', ataque: 0.002 });
        }
      },
      // Martelada torta: pancada abafada e um "bóim".
      marteloErro: {
        g: 0.86,
        min: 0.08,
        legenda: '🔨 martelada torta',
        tocar: function () {
          tom({ f: 140, f2: 60, dur: 0.14, vol: 0.4, tipo: 'sine' });
          ruido({ dur: 0.06, vol: 0.32, filtro: 'lowpass', ff: 900 });
          tom({ t: 0.04, f: 330, f2: 190, dur: 0.38, vol: 0.09, tipo: 'triangle', vib: true });
          tom({ t: 0.04, f: 345, f2: 200, dur: 0.38, vol: 0.06, tipo: 'triangle' });
        }
      },
      // Punch down: "tac" de mola.
      punch: {
        g: 2.66,
        min: 0.2,
        legenda: 'tac da punch down',
        tocar: function () {
          [0, 0.14, 0.28].forEach(function (t) {
            ruido({ t: t, dur: 0.03, vol: 0.32, filtro: 'bandpass', ff: 2200, q: 2 });
            tom({ t: t, f: 1250, f2: 600, dur: 0.06, vol: 0.09, tipo: 'square', filtro: 'lowpass', ff: 2400 });
          });
        }
      },
      // Parafusadeira fixando a base da canaleta.
      parafuso: {
        g: 1.6,
        min: 0.4,
        legenda: 'parafusadeira',
        tocar: function () {
          var ctx = A.ctx;
          var t0 = ctx.currentTime;
          var osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110, t0);
          osc.frequency.linearRampToValueAtTime(190, t0 + 0.2);
          osc.frequency.linearRampToValueAtTime(170, t0 + 0.55);
          var lfo = ctx.createOscillator();
          lfo.frequency.value = 38;
          var lfoG = ctx.createGain();
          lfoG.gain.value = 0.025;
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.06, t0 + 0.06);
          g.gain.setValueAtTime(0.06, t0 + 0.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.62);
          lfo.connect(lfoG);
          lfoG.connect(g.gain);
          var fl = ctx.createBiquadFilter();
          fl.type = 'lowpass';
          fl.frequency.value = 1500;
          osc.connect(fl);
          fl.connect(g);
          g.connect(A._destino || A.bus.efeitos);
          osc.start(t0);
          lfo.start(t0);
          osc.stop(t0 + 0.7);
          lfo.stop(t0 + 0.7);
          ruido({ t: 0.6, dur: 0.04, vol: 0.2, filtro: 'bandpass', ff: 1800, q: 2 });
        }
      },
      // Tampa da canaleta encaixando.
      tampa: {
        g: 3.5,
        min: 0.2,
        legenda: 'tampa encaixando',
        tocar: function () {
          ruido({ dur: 0.12, vol: 0.12, filtro: 'bandpass', ff: 900, ff2: 2400, q: 1.2, ataque: 0.04 });
          ruido({ t: 0.13, dur: 0.035, vol: 0.34, filtro: 'bandpass', ff: 2000, q: 1.8 });
          tom({ t: 0.13, f: 700, f2: 520, dur: 0.07, vol: 0.08, tipo: 'triangle' });
        }
      },
      // Pegou um item da bancada.
      pegar: {
        g: 2.3,
        min: 0.2,
        legenda: 'pegou um item',
        tocar: function () {
          ruido({ dur: 0.16, vol: 0.12, filtro: 'bandpass', ff: 500, ff2: 2200, q: 1.5, ataque: 0.05 });
          tom({ t: 0.08, f: 660, dur: 0.09, vol: 0.09, tipo: 'triangle' });
          tom({ t: 0.15, f: 990, dur: 0.14, vol: 0.09, tipo: 'triangle' });
        }
      },
      bip: {
        g: 2.1,
        min: 0.06,
        legenda: 'bipe',
        tocar: function () {
          tom({ f: 1000, dur: 0.07, vol: 0.07, tipo: 'square', filtro: 'lowpass', ff: 2500 });
        }
      },
      // Porta abrindo (rangido curto).
      porta: {
        g: 3.05,
        min: 0.6,
        legenda: 'porta rangendo',
        tocar: function () {
          var ctx = A.ctx;
          var t0 = ctx.currentTime;
          var osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(95, t0);
          osc.frequency.linearRampToValueAtTime(140, t0 + 0.25);
          osc.frequency.linearRampToValueAtTime(110, t0 + 0.6);
          var fl = ctx.createBiquadFilter();
          fl.type = 'bandpass';
          fl.frequency.value = 750;
          fl.Q.value = 6;
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.16, t0 + 0.08);
          g.gain.setValueAtTime(0.13, t0 + 0.45);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
          osc.connect(fl);
          fl.connect(g);
          g.connect(A._destino || A.bus.efeitos);
          osc.start(t0);
          osc.stop(t0 + 0.75);
        }
      },
      // Toca aqui!
      toca: {
        g: 2.4,
        min: 0.3,
        legenda: '✋ toca aqui!',
        tocar: function () {
          ruido({ dur: 0.09, vol: 0.38, filtro: 'bandpass', ff: 1300, q: 1.1 });
          ruido({ t: 0.012, dur: 0.06, vol: 0.2, filtro: 'highpass', ff: 2500 });
        }
      },
      // Gato roncando (Cachola dormindo).
      ronco: {
        g: 1.2,
        min: 0.8,
        legenda: 'gato roncando',
        tocar: function () {
          for (var i = 0; i < 2; i++) {
            ruido({ t: i * 0.55, dur: 0.42, vol: 0.12, filtro: 'lowpass', ff: 420, ataque: 0.2 });
            tom({ t: i * 0.55, f: 70, f2: 60, dur: 0.42, vol: 0.06, tipo: 'sawtooth', filtro: 'lowpass', ff: 300, ataque: 0.2 });
          }
        }
      }
    };
    A.SONS = SONS;

    var ultimo = {};
    var ultimoEspecifico = 0;
    S.som = function (nome) {
      var s = SONS[nome];
      if (!s) return;
      var agora = S.agora() / 1000;
      if (ultimo[nome] && agora - ultimo[nome] < (s.min || 0)) return;
      ultimo[nome] = agora;
      if (nome !== 'clique' && nome !== 'tecla') ultimoEspecifico = agora;
      if (s.legenda && S.legenda) S.legenda(s.legenda);
      if (!A.pronto()) return;
      tocarComGanho(s);
    };
    // Cada som passa por um ganho próprio (s.g) medido para igualar os níveis.
    function tocarComGanho(s) {
      var g = A.ctx.createGain();
      g.gain.value = s.g || 1;
      g.connect(A.bus.efeitos);
      A._destino = g;
      try { s.tocar(); } catch (e) { registrarErro('som', e); }
      A._destino = null;
      setTimeout(function () { try { g.disconnect(); } catch (e) { /* ignora */ } }, 3000);
    }
    A.tocarComGanho = tocarComGanho;

    // Acerto/erro "genérico" das mensagens e avisos: não toca se um som
    // específico (martelo, conector…) acabou de tocar para a mesma ação.
    S.somGenerico = function (tipo) {
      if (tipo !== 'ok' && tipo !== 'erro') return;
      var agora = S.agora() / 1000;
      if (tipo === 'ok' && agora - ultimoEspecifico < 1.3) return;
      if (tipo === 'erro' && agora - (ultimo.erro || 0) < 0.3) return;
      S.som(tipo);
    };

    // Cliques em qualquer botão da interface (menus, ranking, janelas).
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b || b.disabled || b.getAttribute('data-som') === 'nao') return;
      S.som('clique');
    }, true);
    // Teclas digitadas nos campos (nome, IP, terminal).
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) return;
      if (t.type === 'range') return;
      if (e.key && (e.key.length === 1 || e.key === 'Backspace')) S.som('tecla');
    }, true);
  });

  /* ================================================================== */
  secao('A03-musica', function () {
    // Musiquinha em loop no estilo dos videogames antigos (8 compassos,
    // dó – lá menor – fá – sol). No menu toca só a melodia; no jogo entra a
    // bateria. A cada volta a melodia alterna de oitava para não cansar.
    var A = S.audio;
    var BPM = 100;
    var SEMI = 60 / BPM / 4; // duração de uma semicolcheia
    var ACORDES = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
    var _ = null;
    var MELODIA = [
      [64, _, 67, _, 72, _, 67, 64],
      [64, _, 60, _, 57, _, 60, _],
      [65, _, 69, _, 72, _, 69, 65],
      [67, _, 62, _, 59, _, 62, _],
      [64, 67, 72, _, 71, _, 67, _],
      [69, _, 67, 64, 60, _, _, _],
      [65, _, 64, _, 62, _, 60, _],
      [62, _, 59, _, 55, _, _, _]
    ];
    var mus = { timer: null, passo: 0, volta: 0, prox: 0 };

    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

    function nota(o, t) {
      var ctx = A.ctx;
      var osc = ctx.createOscillator();
      osc.type = o.tipo;
      osc.frequency.value = hz(o.m);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      var saida = g;
      osc.connect(g);
      if (o.ff) {
        var fl = ctx.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = o.ff;
        g.connect(fl);
        saida = fl;
      }
      saida.connect(A.bus.musica);
      osc.start(t);
      osc.stop(t + o.dur + 0.05);
    }
    function batida(t, tipo) {
      var ctx = A.ctx;
      if (tipo === 'bumbo') {
        var osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.32, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(g);
        g.connect(A.bus.musica);
        osc.start(t);
        osc.stop(t + 0.2);
      } else {
        A.ruido({ t: t - ctx.currentTime, dur: tipo === 'caixa' ? 0.09 : 0.03, vol: tipo === 'caixa' ? 0.09 : 0.05, filtro: tipo === 'caixa' ? 'bandpass' : 'highpass', ff: tipo === 'caixa' ? 1800 : 7000, q: 0.8, destino: A.bus.musica });
      }
    }

    function agendar(passo, t) {
      var compasso = Math.floor(passo / 16) % 8;
      var pos = passo % 16;
      var ac = ACORDES[compasso];
      var jogo = S.fase === 'jogo' || S.fase === 'cena';
      // Baixo: fundamental, quinta e oitava.
      if (pos % 4 === 0) {
        var bx = [ac[0] - 12, ac[0] - 12, ac[2] - 12, ac[0]][pos / 4];
        nota({ m: bx, tipo: 'triangle', vol: 0.3, dur: SEMI * 3.2 }, t);
      }
      // Acorde "pluck" nos contratempos.
      if (pos === 4 || pos === 12) {
        ac.forEach(function (m) { nota({ m: m + 12, tipo: 'square', vol: 0.028, dur: SEMI * 1.6, ff: 1400 }, t); });
      }
      // Melodia (colcheias).
      if (pos % 2 === 0) {
        var m = MELODIA[compasso][pos / 2];
        if (m !== null) {
          var oitava = mus.volta % 2 === 1 ? 12 : 0;
          nota({ m: m + oitava, tipo: 'square', vol: 0.07, dur: SEMI * 1.8, ff: 2600 }, t);
          nota({ m: m + oitava, tipo: 'triangle', vol: 0.05, dur: SEMI * 1.8 }, t + 0.004);
        }
      }
      if (jogo) {
        if (pos === 0 || pos === 8 || (pos === 10 && compasso % 2 === 1)) batida(t, 'bumbo');
        if (pos === 4 || pos === 12) batida(t, 'caixa');
        if (pos % 2 === 0) batida(t, 'chimbal');
      }
    }

    function laco() {
      var ctx = A.ctx;
      if (!ctx || ctx.state !== 'running') return;
      if (S.cfg.volMusica <= 0) {
        mus.prox = ctx.currentTime + 0.05;
        return;
      }
      if (mus.prox < ctx.currentTime) mus.prox = ctx.currentTime + 0.06;
      while (mus.prox < ctx.currentTime + 0.18) {
        try { agendar(mus.passo, mus.prox); } catch (e) { registrarErro('musica', e); }
        mus.passo++;
        if (mus.passo % 128 === 0) mus.volta++;
        mus.prox += SEMI;
      }
    }

    A.iniciarMusica = function () {
      if (mus.timer || !A.ctx) return;
      mus.prox = A.ctx.currentTime + 0.1;
      mus.timer = setInterval(laco, 40);
    };
    A.musicaTocando = function () { return !!mus.timer; };
    A._agendarMusica = agendar; // usado pelo teste de volume (teste_sons.py)
    A._semi = SEMI;
  });

  /* ================================================================== */
  secao('A04-vozes', function () {
    // Vozes "embaralhadas" (como Animalese, do Animal Crossing): cada letra
    // vira um bipe com a vogal mais próxima, no tom de cada personagem.
    // Opcional: ler as falas em voz alta com a voz do próprio sistema.
    var A = S.audio;
    var FORMANTES = {
      a: [730, 1090], e: [530, 1840], i: [300, 2250], o: [570, 840], u: [320, 870]
    };
    var PERFIS = {
      prof: { f: 128, onda: 'sawtooth', fm: 1.0, varia: 3, vol: 0.7, pitchTts: 0.85 },
      carlos: { f: 104, onda: 'sawtooth', fm: 0.92, varia: 2, vol: 0.82, pitchTts: 0.7 },
      alunoM: { f: 170, onda: 'sawtooth', fm: 1.08, varia: 3, vol: 0.64, pitchTts: 1.05 },
      alunoF: { f: 262, onda: 'sawtooth', fm: 1.2, varia: 3, vol: 0.6, pitchTts: 1.35 },
      cachola: { f: 560, onda: 'triangle', fm: 1.4, varia: 4, vol: 0.32, gato: true, pitchTts: 1.8 }
    };
    function perfil(quem) {
      if (quem === 'aluno') return S.aluno && S.aluno.genero === 'f' ? PERFIS.alunoF : PERFIS.alunoM;
      return PERFIS[quem] || PERFIS.prof;
    }
    function semAcento(c) {
      return c.normalize ? c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : c.toLowerCase();
    }
    function ehLetra(c) {
      return /[a-zà-ú]/i.test(c);
    }
    // Vogal da sílaba: a própria letra, ou a próxima vogal do texto.
    function vogalEm(texto, i) {
      for (var k = i; k < Math.min(texto.length, i + 4); k++) {
        var c = semAcento(texto.charAt(k));
        if (FORMANTES[c]) return c;
      }
      return 'a';
    }

    function blip(p, letra, vogal, t, final) {
      var ctx = A.ctx;
      var cod = semAcento(letra).charCodeAt(0) || 97;
      var semi = ((cod * 7) % 5 - 2) * (p.varia / 2) + (Math.random() - 0.5);
      var f = p.f * Math.pow(2, semi / 12);
      var dur = p.gato ? 0.12 : 0.075;
      var osc = ctx.createOscillator();
      osc.type = p.onda;
      osc.frequency.setValueAtTime(f, t);
      if (p.gato) {
        osc.frequency.linearRampToValueAtTime(f * 1.35, t + dur * 0.4);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + dur);
      } else {
        osc.frequency.exponentialRampToValueAtTime(f * (final === '?' ? 1.25 : 0.93), t + dur);
      }
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(p.vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var fm = FORMANTES[vogal] || FORMANTES.a;
      osc.connect(g);
      [[fm[0], 5, 1], [fm[1], 7, 0.7]].forEach(function (fr) {
        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = fr[0] * p.fm;
        bp.Q.value = fr[1];
        var gg = ctx.createGain();
        gg.gain.value = fr[2] * 2.2;
        g.connect(bp);
        bp.connect(gg);
        gg.connect(A.bus.falas);
      });
      osc.start(t);
      osc.stop(t + dur + 0.03);
      return osc;
    }

    // ---- Leitura em voz alta (síntese de voz do sistema) -----------------
    var tts = window.speechSynthesis || null;
    var vozPt = null;
    function escolherVoz() {
      if (!tts || vozPt) return vozPt;
      var vs = [];
      try { vs = tts.getVoices() || []; } catch (e) { vs = []; }
      vozPt = vs.filter(function (v) { return /^pt[-_]BR/i.test(v.lang); })[0] ||
        vs.filter(function (v) { return /^pt/i.test(v.lang); })[0] || null;
      return vozPt;
    }
    if (tts && tts.addEventListener) {
      try { tts.addEventListener('voiceschanged', function () { vozPt = null; escolherVoz(); }); } catch (e) { /* ignora */ }
    }
    S.voz.lerDisponivel = function () { return !!(tts && window.SpeechSynthesisUtterance); };
    S.voz.temVozPt = function () { return !!escolherVoz(); };
    function ler(quem, texto) {
      if (!S.voz.lerDisponivel()) return false;
      try {
        tts.cancel();
        var u = new window.SpeechSynthesisUtterance(texto.replace(/[✋✔✖🎉🧡💡]/g, ''));
        u.lang = 'pt-BR';
        var v = escolherVoz();
        if (v) u.voice = v;
        u.rate = 1.05;
        u.pitch = perfil(quem).pitchTts;
        u.volume = Math.max(0, Math.min(1, S.cfg.volFalas));
        tts.speak(u);
        S.voz.ultimaLeitura = texto;
        return true;
      } catch (e) {
        return false;
      }
    }

    S.voz.ler = function (quem, texto) {
      if (S.cfg.volFalas > 0) ler(quem, texto);
    };

    var agendados = [];
    function pararBlips() {
      agendados.forEach(function (o) { try { o.stop(); } catch (e) { /* já parou */ } });
      agendados = [];
    }
    S.voz.parar = function () {
      pararBlips();
      if (tts) { try { tts.cancel(); } catch (e) { /* ignora */ } }
    };

    // Fala da cena (caixa de diálogo com o texto aparecendo letra por letra).
    S.voz.fala = function (quem, texto, estado) {
      estado.vozProx = 0;
      estado.vozUlt = 0;
      estado.vozLida = false;
      pararBlips();
      if (S.cfg.lerVoz && S.cfg.volFalas > 0) estado.vozLida = ler(quem, texto);
      else if (tts) { try { tts.cancel(); } catch (e) { /* ignora */ } }
    };
    // Chamado a cada quadro com quantas letras já apareceram. Os bipes são
    // agendados pelo tempo de cada letra (42 por segundo), então a voz não
    // fica "picotada" em computador lento.
    var LETRAS_POR_SEG = 42;
    S.voz.acompanhar = function (quem, texto, estado, letras) {
      var antes = estado.vozUlt || 0;
      estado.vozUlt = letras;
      // Texto completado de uma vez (clique para pular): não fala o resto.
      if (estado.vozLida || !A.pronto() || S.cfg.volFalas <= 0 || letras - antes > 14) {
        estado.vozProx = Math.max(estado.vozProx, letras);
        return;
      }
      var p = perfil(quem);
      var base = A.ctx.currentTime + 0.01;
      while (estado.vozProx < letras) {
        var i = estado.vozProx;
        var c = texto.charAt(i);
        if (ehLetra(c)) {
          var fim = texto.length - i < 6 ? texto.slice(-1) : '';
          agendados.push(blip(p, c, vogalEm(texto, i), base + Math.max(0, (i - antes) / LETRAS_POR_SEG), fim));
          estado.vozProx += p.gato ? 4 : 3;
        } else {
          estado.vozProx += 1;
        }
      }
      if (agendados.length > 60) agendados.splice(0, agendados.length - 60);
    };
    // Fala de balão (sem letra por letra): toca a frase inteira de uma vez.
    S.voz.frase = function (quem, texto) {
      if (S.cfg.lerVoz && S.cfg.volFalas > 0 && ler(quem, texto)) return;
      if (!A.pronto() || S.cfg.volFalas <= 0) return;
      pararBlips();
      var p = perfil(quem);
      var t = A.ctx.currentTime + 0.02;
      var passo = p.gato ? 0.13 : 0.07;
      var n = 0;
      for (var i = 0; i < texto.length && n < 26; i++) {
        var c = texto.charAt(i);
        if (!ehLetra(c)) continue;
        agendados.push(blip(p, c, vogalEm(texto, i), t, texto.length - i < 6 ? texto.slice(-1) : ''));
        t += passo;
        n++;
        i += p.gato ? 3 : 2;
      }
    };
    // Para os testes.
    S.voz.PERFIS = PERFIS;
    S.voz.blipTeste = function (quem, letra, t) {
      return blip(perfil(quem), letra, vogalEm(letra, 0), A.ctx.currentTime + 0.01 + (t || 0), '');
    };
  });

  /* ================================================================== */
  secao('A05-legendas', function () {
    // Legendas de sons (acessibilidade): mostra o que soou, por 1,8 s.
    var camada = null;
    S.legenda = function (texto) {
      if (!S.cfg.legendas || !S.raiz) return;
      if (!camada) {
        camada = S.el('div', {
          position: 'absolute',
          left: '12px',
          zIndex: '27',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: 'flex-start',
          pointerEvents: 'none'
        }, null, S.raiz);
        camada.setAttribute('aria-live', 'polite');
      }
      // No celular fica acima do joystick (ou do botão USAR, se trocados).
      camada.style.bottom = S.toque && S.fase === 'jogo' ? (S.cfg.botoesGrandes ? '200px' : '165px') : '14px';
      var itens = camada.children;
      for (var i = 0; i < itens.length; i++) {
        if (itens[i].getAttribute('data-txt') === texto) {
          clearTimeout(itens[i]._t);
          itens[i]._t = setTimeout(remover(itens[i]), 1800);
          return;
        }
      }
      while (camada.children.length >= 3) camada.firstChild.remove();
      var el = S.el('div', {
        background: 'rgba(0,0,0,0.82)',
        color: '#FFFFFF',
        border: '2px solid ' + S.CSS.laranja,
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '13px',
        fontWeight: '700',
        fontFamily: S.CSS.fonte,
        transition: 'opacity .3s ease'
      }, '🔊 [' + texto + ']', camada);
      el.setAttribute('data-txt', texto);
      el._t = setTimeout(remover(el), 1800);
    };
    function remover(el) {
      return function () {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 320);
      };
    }
  });


  /* ================================================================== */
  secao('G01-acessibilidade', function () {
    var C = S.CSS;

    // ---- Estilos globais: foco visível (teclado) e botões maiores ---------
    var css = document.createElement('style');
    css.textContent =
      '#sim-root button:focus-visible,#sim-root select:focus-visible,#sim-root input:focus-visible,#sim-root [tabindex]:focus-visible{outline:3px solid #FFD36B !important;outline-offset:2px}' +
      '#sim-root.sim-botoes-grandes .sim-btn{min-height:46px;min-width:46px}' +
      '#sim-root input[type=range].sim-volume{-webkit-appearance:none;appearance:none;height:10px;border-radius:6px;background:#071733;border:2px solid #2F5C99;outline:none}' +
      '#sim-root input[type=range].sim-volume::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:26px;height:26px;border-radius:50%;background:#F7941D;border:3px solid #071430;cursor:pointer}' +
      '#sim-root input[type=range].sim-volume::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#F7941D;border:3px solid #071430;cursor:pointer}';
    document.head.appendChild(css);

    // ---- Daltonismo: símbolos ✔/✖ junto das cores de acerto e erro --------
    S.marcarSimbolo = function (texto, tipo) {
      if (!S.cfg.daltonismo || !texto) return texto;
      var t = String(texto);
      if (tipo === 'erro' && !/^[✖✗❌]/.test(t)) return '✖ ' + t;
      if (tipo === 'ok' && !/^[✔✓✅🎉]/.test(t)) return '✔ ' + t;
      return t;
    };

    // ---- Texto maior: escala todos os tamanhos de fonte em px ----------------
    // Funciona com qualquer tela (as fontes são definidas no próprio elemento):
    // guarda o tamanho original e aplica a escala, inclusive em elementos novos.
    var escala = 1;
    var observador = null;
    function aplicarFonte(el, base) {
      var v = (Math.round(base * escala * 10) / 10) + 'px';
      el.setAttribute('data-fs-set', v);
      if (el.style.fontSize !== v) el.style.fontSize = v;
    }
    function escalar(el) {
      if (!el || el.nodeType !== 1 || el === S.raiz || !el.style) return;
      if (el.getAttribute('data-fs') === 'fixo') return;
      var fs = el.style.fontSize;
      if (!fs || fs.slice(-2) !== 'px') return;
      if (fs === el.getAttribute('data-fs-set')) return;
      var base = parseFloat(fs);
      if (!(base > 0)) return;
      el.setAttribute('data-fs-base', String(base));
      aplicarFonte(el, base);
    }
    function escalarArvore(raiz) {
      escalar(raiz);
      if (!raiz.querySelectorAll) return;
      var lista = raiz.querySelectorAll('[style]');
      for (var i = 0; i < lista.length; i++) escalar(lista[i]);
    }
    S.definirEscalaTexto = function (e) {
      e = Number(e) || 1;
      if (!S.raiz) return;
      var antes = escala;
      escala = e;
      // Sem o observador ligado, algum tamanho pode ter mudado: atualiza a base.
      if (!observador) escalarArvore(S.raiz);
      // Reaplica sobre o tamanho original guardado.
      var guardados = S.raiz.querySelectorAll('[data-fs-base]');
      for (var i = 0; i < guardados.length; i++) aplicarFonte(guardados[i], parseFloat(guardados[i].getAttribute('data-fs-base')));
      S.raiz.style.fontSize = (16 * escala) + 'px';
      if (escala !== 1 && !observador && window.MutationObserver) {
        observador = new MutationObserver(function (lista) {
          for (var k = 0; k < lista.length; k++) {
            var m = lista[k];
            if (m.type === 'attributes') escalar(m.target);
            else for (var j = 0; j < m.addedNodes.length; j++) escalarArvore(m.addedNodes[j]);
          }
        });
        observador.observe(S.raiz, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
      } else if (escala === 1 && observador) {
        observador.disconnect();
        observador = null;
      }
      if (antes !== escala && S.redimensionar && S.fase === 'jogo') S.redimensionar();
    };
    S.escalaTexto = function () { return escala; };

    // ---- Contorno forte nos objetos ---------------------------------------
    var COR_FORTE = 0xff9a1f;
    var matContorno = null;
    function contornos(info, ligado) {
      if (!info || !info.meshes) return;
      info.meshes.forEach(function (m) {
        if (!m || !m.isMesh || !m.geometry) return;
        // Áreas de clique invisíveis (ex.: a caixa em volta do gato) não ganham borda.
        var mats = Array.isArray(m.material) ? m.material : [m.material];
        if (!m.visible || mats.every(function (x) { return !x || x.visible === false || x.opacity === 0; })) return;
        var c = m.userData.contorno;
        if (!c && ligado) {
          if (!matContorno) matContorno = new THREE.MeshBasicMaterial({ color: COR_FORTE, side: THREE.BackSide });
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          var bb = m.geometry.boundingBox;
          var sx = bb.max.x - bb.min.x;
          var sy = bb.max.y - bb.min.y;
          var sz = bb.max.z - bb.min.z;
          var esc = m.getWorldScale ? m.getWorldScale(new THREE.Vector3()) : { x: 1, y: 1, z: 1 };
          // Borda de ~3 cm em volta de cada peça, qualquer que seja o tamanho.
          function f(tam, e) { return Math.min(1.35, 1 + 0.06 / Math.max(0.04, tam * Math.abs(e || 1))); }
          c = new THREE.Mesh(m.geometry, matContorno);
          c.scale.set(f(sx, esc.x), f(sy, esc.y), f(sz, esc.z));
          c.position.set((bb.max.x + bb.min.x) / 2 * (1 - c.scale.x), (bb.max.y + bb.min.y) / 2 * (1 - c.scale.y), (bb.max.z + bb.min.z) / 2 * (1 - c.scale.z));
          c.raycast = function () {};
          c.renderOrder = -1;
          m.add(c);
          m.userData.contorno = c;
        }
        if (c) c.visible = !!ligado;
      });
    }
    var destacarOriginal = null;
    var acesos = [];
    function instalarContorno() {
      if (destacarOriginal || !S.destacar) return;
      destacarOriginal = S.destacar;
      S.destacar = function (info, ligado) {
        if (!info) return;
        destacarOriginal(info, ligado);
        if (S.cfg.contorno && ligado) {
          info.meshes.forEach(function (m) {
            (Array.isArray(m.material) ? m.material : [m.material]).forEach(function (mat) {
              if (mat && mat.emissive) {
                mat.emissive.setHex(0x8a4a00);
                mat.emissiveIntensity = 1;
              }
            });
          });
        }
        contornos(info, S.cfg.contorno && ligado);
        var i = acesos.indexOf(info);
        if (ligado && i < 0) acesos.push(info);
        if (!ligado && i >= 0) acesos.splice(i, 1);
      };
    }
    instalarContorno();

    // Com contorno forte, o objeto que o [E]/USAR vai usar também fica aceso
    // (ajuda no celular e para quem joga só pelo teclado).
    var proximoAceso = null;
    S.atualizarContornoProximo = function () {
      var alvo = S.cfg.contorno && S.fase === 'jogo' && !S.pausado && S.jogo && S.jogo.melhorProximo ? S.jogo.melhorProximo() : null;
      if (alvo !== proximoAceso) {
        if (proximoAceso) S.destacar(proximoAceso, false);
        proximoAceso = alvo;
      }
      if (alvo) S.destacar(alvo, true);
    };
    S.apagarContornos = function () {
      acesos.slice().forEach(function (info) { S.destacar(info, false); });
      proximoAceso = null;
    };
    if (S.jogo && S.jogo.atualizarPrompt) {
      var promptOriginal = S.jogo.atualizarPrompt;
      var ultimo = 0;
      S.jogo.atualizarPrompt = function () {
        promptOriginal.apply(this, arguments);
        var agora = S.agora();
        if (agora - ultimo < 120) return;
        ultimo = agora;
        if (S.cfg.contorno || proximoAceso) S.atualizarContornoProximo();
      };
    }

    // ---- Aplica tudo ----------------------------------------------------------
    S.aplicarConfig = function () {
      var c = S.cfg;
      if (S.audio && S.audio.aplicarVolumes) S.audio.aplicarVolumes();
      if (S.raiz) {
        S.raiz.classList.toggle('sim-botoes-grandes', !!c.botoesGrandes);
        S.raiz.classList.toggle('sim-daltonismo', !!c.daltonismo);
      }
      S.definirEscalaTexto(c.texto);
      if (!c.contorno && S.apagarContornos) S.apagarContornos();
      if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
      if (!c.lerVoz && S.voz && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
      }
    };
    S.aplicarConfig();
  });

  /* ================================================================== */
  secao('G02-tela-configuracoes', function () {
    var C = S.CSS;

    // ---- Botão ⚙ fixo no canto superior direito ---------------------------
    var engrenagem = S.el('button', {
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: '36',
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'rgba(19, 52, 101, 0.92)',
      color: '#FFFFFF',
      border: '3px solid #071430',
      boxShadow: '0 3px 0 #071430',
      padding: '0',
      cursor: 'pointer',
      touchAction: 'manipulation',
      display: 'none'
    }, null, S.raiz);
    engrenagem.type = 'button';
    engrenagem.className = 'sim-btn';
    engrenagem.setAttribute('aria-label', 'Configurações');
    engrenagem.title = 'Configurações (sons e acessibilidade)';
    engrenagem.appendChild(iconeEngrenagem(24));
    engrenagem.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    engrenagem.addEventListener('click', S.protegido('config:abrir', function () { S.ui.mostrarConfig(); }));
    S.ui.engrenagem = engrenagem;

    function iconeEngrenagem(tam) {
      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', String(tam));
      svg.setAttribute('height', String(tam));
      svg.setAttribute('aria-hidden', 'true');
      svg.style.display = 'block';
      svg.style.margin = 'auto';
      svg.style.pointerEvents = 'none';
      var p = document.createElementNS(NS, 'path');
      // Engrenagem de 8 dentes com furo no meio.
      var d = '';
      for (var i = 0; i < 8; i++) {
        var a0 = (i / 8) * Math.PI * 2 - 0.2;
        var a1 = a0 + 0.4;
        var a2 = a0 + Math.PI / 4;
        var pt = function (a, r) { return (12 + Math.cos(a) * r).toFixed(2) + ' ' + (12 + Math.sin(a) * r).toFixed(2); };
        d += (i === 0 ? 'M' : 'L') + pt(a0, 10.4) + 'L' + pt(a1, 10.4) + 'L' + pt(a1 + 0.12, 7.6) + 'L' + pt(a2 - 0.08, 7.6);
      }
      d += 'Z M12 8.6 A3.4 3.4 0 1 0 12 15.4 A3.4 3.4 0 1 0 12 8.6 Z';
      p.setAttribute('d', d);
      p.setAttribute('fill', 'currentColor');
      p.setAttribute('fill-rule', 'evenodd');
      svg.appendChild(p);
      return svg;
    }

    // Aparece nos menus e no jogo; some atrás de janelas (que têm o próprio
    // fechar no mesmo canto), do ranking e da pausa (que tem o botão próprio).
    var telaCfg = null;
    function atualizarEngrenagem() {
      var fase = S.fase;
      var mostrar = !telaCfg && !S.ui.modalAberto() &&
        ['login', 'fases', 'comandos', 'jogo', 'cena'].indexOf(fase) >= 0;
      if (mostrar) {
        var telas = S.raiz.querySelectorAll('[data-tela]');
        for (var i = 0; i < telas.length; i++) {
          if (Number(telas[i].getAttribute('data-tela')) >= 40) { mostrar = false; break; }
        }
      }
      var v = mostrar ? 'block' : 'none';
      if (engrenagem.style.display !== v) engrenagem.style.display = v;
      var tam = S.toque || S.ui.compacto() ? '40px' : '44px';
      if (engrenagem.style.width !== tam) {
        engrenagem.style.width = tam;
        engrenagem.style.height = tam;
      }
    }
    setInterval(function () {
      try { atualizarEngrenagem(); } catch (e) { /* ignora */ }
    }, 150);
    S.ui.atualizarEngrenagem = atualizarEngrenagem;

    // ---- Componentes da tela ----------------------------------------------
    function secaoTitulo(pai, texto, icone) {
      S.el('div', {
        fontSize: '12px', fontWeight: '700', color: C.laranja, letterSpacing: '0.06em',
        margin: '14px 0 6px', borderBottom: '2px solid ' + C.borda, paddingBottom: '4px'
      }, (icone ? icone + ' ' : '') + texto, pai);
    }

    function controleVolume(pai, rotulo, chave, aoMudar) {
      var linha = S.el('div', { display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0' }, null, pai);
      var id = 'sim-vol-' + chave;
      var lab = S.el('label', { flex: '0 0 auto', width: '150px', fontSize: '14px', fontWeight: '700' }, rotulo, linha);
      lab.setAttribute('for', id);
      var r = S.el('input', { flex: '1 1 auto', minWidth: '80px', cursor: 'pointer', touchAction: 'none' }, null, linha);
      r.type = 'range';
      r.id = id;
      r.className = 'sim-volume';
      r.min = '0';
      r.max = '100';
      r.step = '5';
      r.value = String(Math.round(S.cfg[chave] * 100));
      var val = S.el('div', { flex: '0 0 auto', width: '46px', textAlign: 'right', fontFamily: C.mono, fontWeight: '700', fontSize: '14px' }, '', linha);
      function mostrar() {
        var v = Number(r.value);
        val.textContent = v === 0 ? 'mudo' : v + '%';
        r.setAttribute('aria-valuetext', val.textContent);
      }
      mostrar();
      r.addEventListener('input', function () {
        S.cfg[chave] = Number(r.value) / 100;
        mostrar();
        S.aplicarConfig();
        S.salvarConfig();
      });
      r.addEventListener('change', function () {
        if (aoMudar) aoMudar();
      });
      return r;
    }

    // Interruptor liga/desliga acessível (role="switch").
    function interruptor(pai, titulo, descricao, chave, opcoes) {
      opcoes = opcoes || {};
      var linha = S.el('div', {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', margin: '6px 0',
        background: '#071733', border: '2px solid ' + C.borda, borderRadius: '8px'
      }, null, pai);
      var txt = S.el('div', { flex: '1 1 auto', minWidth: '0' }, null, linha);
      S.el('div', { fontSize: '14px', fontWeight: '700' }, titulo, txt);
      if (descricao) S.el('div', { fontSize: '12px', color: C.cinza, lineHeight: '1.35', marginTop: '2px' }, descricao, txt);
      if (opcoes.aviso) S.el('div', { fontSize: '12px', color: C.amarelo, lineHeight: '1.35', marginTop: '2px' }, opcoes.aviso, txt);
      var b = S.el('button', {
        flex: '0 0 auto', width: '62px', height: '34px', borderRadius: '17px', border: '3px solid #071430',
        position: 'relative', cursor: 'pointer', padding: '0', touchAction: 'manipulation', transition: 'background .15s'
      }, null, linha);
      b.type = 'button';
      b.className = 'sim-btn';
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-label', titulo);
      var bola = S.el('div', {
        position: 'absolute', top: '3px', width: '22px', height: '22px', borderRadius: '50%',
        background: '#FFFFFF', transition: 'left .15s', pointerEvents: 'none'
      }, null, b);
      function desenhar() {
        var on = !!S.cfg[chave];
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.style.background = on ? '#1E8E3E' : '#4A5D7A';
        bola.style.left = on ? '33px' : '4px';
        b.title = on ? 'Ligado' : 'Desligado';
      }
      desenhar();
      if (opcoes.desabilitado) {
        b.disabled = true;
        b.style.opacity = '0.45';
        b.style.cursor = 'not-allowed';
      }
      b.addEventListener('click', S.protegido('config:' + chave, function () {
        S.cfg[chave] = !S.cfg[chave];
        desenhar();
        S.aplicarConfig();
        S.salvarConfig();
        if (opcoes.aoMudar) opcoes.aoMudar(S.cfg[chave]);
      }));
      return b;
    }

    // Botões de escolha (tamanho do texto).
    function escolha(pai, titulo, descricao, chave, itens, aoMudar) {
      var bloco = S.el('div', {
        padding: '8px 10px', margin: '6px 0', background: '#071733', border: '2px solid ' + C.borda, borderRadius: '8px'
      }, null, pai);
      S.el('div', { fontSize: '14px', fontWeight: '700' }, titulo, bloco);
      if (descricao) S.el('div', { fontSize: '12px', color: C.cinza, marginTop: '2px' }, descricao, bloco);
      var grupo = S.el('div', { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }, null, bloco);
      grupo.setAttribute('role', 'radiogroup');
      grupo.setAttribute('aria-label', titulo);
      var botoes = [];
      function marcar() {
        botoes.forEach(function (x) {
          var sel = S.cfg[chave] === x.valor;
          x.b.style.background = sel ? C.laranja : C.painel2;
          x.b.style.color = sel ? '#10203A' : C.branco;
          x.b.setAttribute('aria-checked', sel ? 'true' : 'false');
        });
      }
      itens.forEach(function (it) {
        var b = S.el('button', {
          flex: '1 1 90px', padding: '7px 8px', border: '3px solid #071430', borderRadius: '6px',
          fontFamily: C.fonte, fontWeight: '700', fontSize: it.tam, cursor: 'pointer', touchAction: 'manipulation'
        }, it.rotulo, grupo);
        b.type = 'button';
        b.className = 'sim-btn';
        b.setAttribute('role', 'radio');
        b.setAttribute('data-fs', 'fixo');
        b.addEventListener('click', S.protegido('config:' + chave, function () {
          S.cfg[chave] = it.valor;
          marcar();
          S.aplicarConfig();
          S.salvarConfig();
          if (aoMudar) aoMudar();
        }));
        botoes.push({ b: b, valor: it.valor });
      });
      marcar();
    }

    // ---- Tela de configurações ------------------------------------------------
    S.ui.mostrarConfig = function (abaInicial) {
      if (telaCfg) return;
      if (S.fase === 'jogo') {
        S.pausado = true;
        S.teclas = {};
        S.joy.x = 0;
        S.joy.z = 0;
        if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
      }
      var emCena = S.fase === 'cena';
      if (emCena) S.pausarRelogio();
      var ap = S.ui.telaApertada();
      var t = S.ui.tela(70, '600px');
      if (ap) S.ui.compactarTela(t);
      telaCfg = t;
      atualizarEngrenagem();
      t.cartao.setAttribute('role', 'dialog');
      t.cartao.setAttribute('aria-label', 'Configurações');
      // Durante a cena, cliques aqui não podem avançar o diálogo.
      t.fundo.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

      var cab = S.el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }, null, t.cartao);
      S.el('div', { fontSize: ap ? '18px' : '21px', fontWeight: '700' }, '⚙ Configurações', cab);
      var bX = S.ui.botao('Fechar', 'secundario', fechar, cab);
      bX.style.padding = '6px 12px';

      var abas = S.el('div', { display: 'flex', gap: '6px', marginBottom: '4px' }, null, t.cartao);
      abas.setAttribute('role', 'tablist');
      var conteudo = S.el('div', null, null, t.cartao);
      var botoesAba = {};
      var aba = abaInicial || 'sons';
      [['sons', '🔊 Sons'], ['acessibilidade', '♿ Acessibilidade']].forEach(function (a) {
        var b = S.el('button', {
          flex: '1 1 0', padding: ap ? '8px' : '10px', borderRadius: '8px 8px 0 0', border: '3px solid #071430',
          borderBottom: 'none', fontFamily: C.fonte, fontWeight: '700', fontSize: '15px', cursor: 'pointer', touchAction: 'manipulation'
        }, a[1], abas);
        b.type = 'button';
        b.className = 'sim-btn';
        b.setAttribute('role', 'tab');
        b.addEventListener('click', function () {
          aba = a[0];
          desenhar();
        });
        botoesAba[a[0]] = b;
      });

      function desenhar() {
        Object.keys(botoesAba).forEach(function (k) {
          var sel = k === aba;
          botoesAba[k].style.background = sel ? C.laranja : C.painel2;
          botoesAba[k].style.color = sel ? '#10203A' : C.branco;
          botoesAba[k].setAttribute('aria-selected', sel ? 'true' : 'false');
        });
        conteudo.textContent = '';
        var painel = S.el('div', {
          border: '3px solid #071430', borderRadius: '0 0 8px 8px', background: '#0B1F3E', padding: ap ? '6px 10px 10px' : '8px 14px 14px'
        }, null, conteudo);
        painel.setAttribute('role', 'tabpanel');
        if (aba === 'sons') montarSons(painel);
        else montarAcessibilidade(painel);
      }

      function montarSons(p) {
        S.el('div', { fontSize: '13px', color: C.cinza, marginTop: '6px' }, 'Arraste para aumentar ou diminuir. Todo o caminho para a esquerda = mudo.', p);
        controleVolume(p, '🔔 Efeitos', 'volEfeitos', function () { S.som('plugue'); });
        controleVolume(p, '🗣 Falas', 'volFalas', function () {
          S.voz.frase('prof', 'Olá! Assim fica bom?');
        });
        controleVolume(p, '🎵 Música', 'volMusica', null);
        S.el('div', { fontSize: '12px', color: C.cinza, marginTop: '6px', lineHeight: '1.4' },
          'Efeitos: cliques, ferramentas e objetos. Falas: as vozes dos personagens. Música: a trilha do jogo.', p);
        if (!S.audio || !S.audio.ctx) {
          S.el('div', { fontSize: '12px', color: C.amarelo, marginTop: '6px' }, 'Este navegador não liberou o som. Toque em qualquer lugar da tela para ativar.', p);
        }
      }

      function montarAcessibilidade(p) {
        secaoTitulo(p, 'CORES (DALTONISMO)', '🎨');
        interruptor(p, 'Modo daltonismo', 'Siglas nos fios (BL = branco-laranja, L = laranja, BV, A, BA, V, BM, M) e símbolos ✔/✖ junto do verde e do vermelho.', 'daltonismo');

        secaoTitulo(p, 'AUDIÇÃO', '👂');
        interruptor(p, 'Legendas de sons', 'Mostra no canto da tela o que soou: martelada, conector encaixando, erro, missão concluída…', 'legendas', {
          aoMudar: function (on) { if (on) S.legenda('legendas de sons ligadas'); }
        });

        secaoTitulo(p, 'VISÃO', '👁');
        escolha(p, 'Tamanho do texto', 'Vale para missões, janelas, falas e avisos.', 'texto', [
          { rotulo: 'Normal', valor: 1, tam: '14px' },
          { rotulo: 'Grande', valor: 1.2, tam: '16px' },
          { rotulo: 'Muito grande', valor: 1.35, tam: '18px' }
        ]);
        interruptor(p, 'Contorno forte nos objetos', 'Borda laranja grossa no objeto sob o mouse e no objeto mais próximo que você pode usar.', 'contorno');
        var semVoz = !S.voz.lerDisponivel || !S.voz.lerDisponivel();
        interruptor(p, 'Ler as falas em voz alta', 'Os personagens e as novas missões são lidos com a voz do próprio aparelho (no lugar das vozes do jogo).', 'lerVoz', {
          desabilitado: semVoz,
          aviso: semVoz ? 'Este navegador não tem leitura em voz alta.' : (S.voz.temVozPt && !S.voz.temVozPt() ? 'Se não houver voz em português instalada no aparelho, ele usa a voz padrão.' : null),
          aoMudar: function (on) { if (on) S.voz.ler('prof', 'Leitura em voz alta ligada.'); }
        });

        secaoTitulo(p, 'COORDENAÇÃO MOTORA', '✋');
        interruptor(p, 'Martelo assistido', 'No minigame do martelo, o marcador anda mais devagar e a faixa verde fica maior.', 'marteloAssistido');
        interruptor(p, 'Botões maiores', 'Joystick, botão USAR e botões das janelas maiores (melhor para tocar no celular).', 'botoesGrandes');
        interruptor(p, 'Joystick do lado direito', 'Troca de lado o joystick e o botão USAR (para canhotos).', 'joystickDireita');
        S.el('div', { fontSize: '12px', color: C.cinza, lineHeight: '1.45', marginTop: '8px' },
          '⌨ Os menus e as janelas também funcionam só pelo teclado: Tab para passar de um botão para outro, Enter ou Espaço para escolher e Esc para fechar.', p);
      }

      var rod = S.el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }, null, t.cartao);
      S.ui.botao('Restaurar padrão', 'secundario', function () {
        for (var k in S.CFG_PADRAO) S.cfg[k] = S.CFG_PADRAO[k];
        S.salvarConfig();
        S.aplicarConfig();
        desenhar();
      }, rod);
      var bOk = S.ui.botao('Pronto ✔', 'primario', fechar, rod);
      bOk.style.flex = '1 1 160px';

      function tecla(e) {
        if (!t.fundo.isConnected) {
          window.removeEventListener('keydown', tecla, true);
          return;
        }
        if ((e.key || '').toLowerCase() === 'escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
          fechar();
        }
      }
      window.addEventListener('keydown', tecla, true);

      function fechar() {
        window.removeEventListener('keydown', tecla, true);
        t.fechar();
        telaCfg = null;
        if (emCena) S.retomarRelogio();
        if (S.fase === 'jogo') {
          // Volta ao jogo só se nada mais (pausa, janela) estiver aberto.
          S.pausado = !!(S.ui.modalAberto() || (S.telaPausa && S.telaPausa.fundo.isConnected));
          if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
        }
        atualizarEngrenagem();
        try { S.raiz.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
      }

      desenhar();
      setTimeout(function () { try { botoesAba[aba].focus({ preventScroll: true }); } catch (e) { /* ignora */ } }, 30);
      return { fechar: fechar };
    };
    S.ui.configAberta = function () { return !!telaCfg; };
  });


  /* ================================================================== */
  secao('F4A-sala-realidade', function () {
    // Laboratório 4: realidade aumentada. Na parede há um botão que liga a
    // câmera e coloca o Cachola "em cima" do que o aluno estiver vendo.
    // Três modos, do melhor para o mais simples (o jogo escolhe sozinho):
    //  1. WebXR (immersive-ar): o Cachola fica preso na mesa/chão de verdade.
    //  2. Câmera + sensores do celular: a imagem da câmera ao fundo e o
    //     Cachola gira junto com o aparelho (não acompanha passos).
    //  3. Sem câmera (bloqueada/negada): uma mesa virtual, para a aula seguir.
    var F4 = S.f4 = {
      BOTAO: { x: 4.45, y: 1.25, z: -4.44 },
      TAMANHO: 0.75 // o Cachola da AR é um gato jovem (~35 cm)
    };

    F4.reiniciar = function () {
      F4.arAberto = false; // já abriu a câmera (qualquer modo)
      F4.colocou = false; // já colocou o Cachola em algum lugar
      F4.fatos = 0; // fatos ouvidos
      F4.modosUsados = {};
      F4.xrSuportado = null;
      F4.verificarXR();
    };

    // Pergunta cedo se o aparelho tem AR "de verdade": na hora do clique a
    // resposta já está pronta (o pedido da sessão precisa do toque do aluno).
    F4.verificarXR = function () {
      try {
        if (navigator.xr && navigator.xr.isSessionSupported) {
          navigator.xr.isSessionSupported('immersive-ar').then(function (sim) {
            F4.xrSuportado = !!sim;
          }, function () { F4.xrSuportado = false; });
          return;
        }
      } catch (e) { /* ignora */ }
      F4.xrSuportado = false;
    };

    F4.MISSOES = [
      {
        id: 'botao',
        quadro: 'Apertar o botão de AR na parede',
        texto: 'Aperte o botão de Realidade Aumentada na parede.',
        feita: function () { return F4.arAberto; },
        alvos: function () { return ['botaoAR']; },
        dica1: 'O botão laranja fica na parede do fundo, à direita, perto da mesa do professor.',
        dica2: 'Chegue perto do painel "REALIDADE AUMENTADA" e use (E ou USAR).'
      },
      {
        id: 'colocar',
        quadro: 'Colocar o Cachola em cima de algo',
        texto: 'Tire uma foto de uma mesa (ou do chão) e toque nela para colocar o Cachola.',
        feita: function () { return F4.colocou; },
        alvos: function () { return ['botaoAR']; },
        dica1: 'Use o botão da parede de novo e tire (ou escolha) uma foto.',
        dica2: 'Com a foto na tela, toque em cima da mesa: o Cachola aparece ali. Os botões ➖ ➕ ↻ ajustam o tamanho e a direção.'
      },
      {
        id: 'fato',
        quadro: 'Acordar o Cachola e ouvir um fato',
        texto: 'Toque no Cachola para ele acordar e contar um fato.',
        feita: function () { return F4.fatos >= 1; },
        alvos: function () { return ['botaoAR']; },
        dica1: 'Abra a foto, coloque o Cachola e toque em cima dele.',
        dica2: 'Ele dorme o tempo todo: toque bem em cima do gato para ele acordar.'
      }
    ];

    // Textura com um ícone de câmera desenhado em pixels.
    function texturaPainel() {
      return S.textura(64, 96, function (ctx, w, h) {
        ctx.fillStyle = '#0E2547';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, 0, w, 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('REALIDADE', w / 2, 16);
        ctx.fillText('AUMENTADA', w / 2, 27);
        // câmera
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(18, 74, 28, 16);
        ctx.fillRect(25, 71, 10, 4);
        ctx.fillStyle = '#0E2547';
        ctx.fillRect(28, 77, 8, 10);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(30, 79, 4, 6);
      });
    }

    F4.montarSala = function () {
      S.mundo.montarSala({ quadroX: -2.2, placaX: 1.6 });
      var C = S.COR;
      var b = F4.BOTAO;
      // Painel na parede com o botão grande.
      var painel = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.93), new THREE.MeshLambertMaterial({ map: texturaPainel() }));
      painel.position.set(b.x, b.y + 0.3, b.z + 0.035);
      S.adicionar(painel);
      S.caixa(0.7, 1.0, 0.04, S.mat(C.azulEscuro), b.x, b.y + 0.3, b.z + 0.01, null, true);
      var botao = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), S.matUnico(C.laranja, { emissive: 0x7a3c00, emissiveIntensity: 0.6 }));
      botao.rotation.x = Math.PI / 2;
      botao.position.set(b.x, b.y + 0.33, b.z + 0.08);
      S.adicionar(botao);
      F4.botaoMalha = botao;
      S.interativo([botao, painel], {
        id: 'botaoAR',
        nome: 'Botão de Realidade Aumentada',
        ancora: new THREE.Vector3(b.x - 0.1, 0, -3.65)
      });

      // Mesas no meio da sala (como as que o aluno vai usar no mundo real).
      var mTampo = S.mat(C.madeira);
      var mPe = S.mat(C.metalEscuro);
      [[-3.2, -1.2], [0.0, -1.2], [-1.6, 1.0]].forEach(function (p) {
        S.caixa(1.6, 0.06, 0.8, mTampo, p[0], 0.75, p[1]);
        [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]].forEach(function (q) {
          S.caixa(0.05, 0.72, 0.05, mPe, p[0] + q[0], 0.36, p[1] + q[1]);
        });
        S.colisor(p[0], p[1], 1.6, 0.8);
      });
      // Almofada vazia do Cachola (ele está "na realidade aumentada").
      S.cilindro(0.34, 0.36, 0.07, 8, S.mat(C.laranja), 5.35, 0.035, 0.9);
      S.cilindro(0.26, 0.26, 0.075, 8, S.mat(0xffb15c), 5.35, 0.04, 0.9);
      S.colisor(5.35, 0.9, 0.6, 0.6);
    };

    // O botão pulsa até ser usado pela primeira vez.
    F4.atualizar = function () {
      var b = F4.botaoMalha;
      if (!b || !b.material) return;
      var t = S.agora() / 1000;
      b.material.emissiveIntensity = F4.arAberto ? 0.35 : 0.45 + Math.sin(t * 4) * 0.35;
    };
  });

  /* ================================================================== */
  secao('F4B-cachola-ar', function () {
    // Modelo do Cachola só para a realidade aumentada (tamanho real: ~45 cm).
    // Materiais próprios: não dependem do cache da sala.
    var F4 = S.f4;

    F4.criarGato = function () {
      function mat(cor, op) {
        var p = { color: cor };
        if (op) for (var k in op) p[k] = op[k];
        return new THREE.MeshLambertMaterial(p);
      }
      function caixa(l, a, p, m, x, y, z, pai) {
        var me = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m);
        me.position.set(x, y, z);
        pai.add(me);
        return me;
      }
      function grupo(x, y, z, pai) {
        var g = new THREE.Group();
        g.position.set(x, y, z);
        pai.add(g);
        return g;
      }
      var raiz = new THREE.Group();
      var preto = mat(0x15161a);
      var pretoClaro = mat(0x24262c);
      // Sombra suave no chão (ajuda o gato a "pousar" na superfície).
      var cs = document.createElement('canvas');
      cs.width = cs.height = 64;
      var cx = cs.getContext('2d');
      var gr = cx.createRadialGradient(32, 32, 4, 32, 32, 31);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = gr;
      cx.fillRect(0, 0, 64, 64);
      var sombra = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cs), transparent: true, depthWrite: false }));
      sombra.rotation.x = -Math.PI / 2;
      sombra.position.y = 0.003;
      raiz.add(sombra);

      var tronco = caixa(0.19, 0.16, 0.36, preto, 0, 0.1, 0, raiz);
      var cab = grupo(0, 0.12, 0.22, raiz);
      caixa(0.18, 0.12, 0.15, preto, 0, 0, 0, cab);
      caixa(0.08, 0.045, 0.04, pretoClaro, 0, -0.03, 0.085, cab);
      caixa(0.022, 0.016, 0.01, mat(0xd98aa0), 0, -0.012, 0.106, cab);
      caixa(0.2, 0.03, 0.16, mat(S.COR.laranja), 0, -0.065, -0.005, cab); // coleira
      caixa(0.035, 0.035, 0.012, mat(0xf2c200), 0, -0.09, 0.08, cab); // plaquinha
      var tampaPiv = grupo(0, 0.06, -0.075, cab);
      caixa(0.18, 0.035, 0.15, preto, 0, 0.0175, 0.075, tampaPiv);
      [-0.055, 0.055].forEach(function (x) {
        var orelha = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), preto);
        orelha.position.set(x, 0.07, 0.06);
        orelha.rotation.y = Math.PI / 4;
        tampaPiv.add(orelha);
      });
      var cerebro = caixa(0.12, 0.05, 0.1, mat(0xff8fb3, { emissive: 0xff5c95, emissiveIntensity: 0.9 }), 0, 0.055, 0, cab);
      cerebro.visible = false;
      var mOlho = mat(0x39ff6a, { emissive: 0x2bd458, emissiveIntensity: 0.8 });
      var olhos = [-0.045, 0.045].map(function (x) { return caixa(0.04, 0.03, 0.01, mOlho, x, 0.015, 0.078, cab); });
      var patas = [[-0.06, 0.13], [0.06, 0.13], [-0.06, -0.13], [0.06, -0.13]].map(function (p) {
        var piv = grupo(p[0], 0.1, p[1], raiz);
        caixa(0.05, 0.12, 0.05, preto, 0, -0.06, 0, piv);
        return piv;
      });
      var rabo1 = grupo(0, 0.1, -0.18, raiz);
      caixa(0.04, 0.04, 0.16, preto, 0, 0, -0.08, rabo1);
      var rabo2 = grupo(0, 0, -0.16, rabo1);
      caixa(0.035, 0.035, 0.14, preto, 0, 0, -0.07, rabo2);
      // "z" subindo enquanto dorme.
      var cz = document.createElement('canvas');
      cz.width = cz.height = 16;
      var czx = cz.getContext('2d');
      czx.fillStyle = '#FFFFFF';
      czx.font = 'bold 14px Arial';
      czx.textAlign = 'center';
      czx.fillText('z', 8, 13);
      var texZ = new THREE.CanvasTexture(cz);
      var zs = [0, 1, 2].map(function (i) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texZ, transparent: true, depthWrite: false }));
        raiz.add(sp);
        return { sp: sp, fase: i / 3 };
      });
      // Esfera invisível para o toque (maior que o gato).
      var alvo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      alvo.position.y = 0.18;
      raiz.add(alvo);

      var POSES = {
        dormindo: { troncoY: 0.08, troncoRot: 0, cabY: 0.08, cabZ: 0.2, cabRot: 0.35, pf: [0.1, 0.15, 0], pt: [0.1, 0.15, 0], rabo1: 1.3, rabo2: 1.2 },
        sentado: { troncoY: 0.15, troncoRot: -0.55, cabY: 0.33, cabZ: 0.16, cabRot: 0, pf: [0.2, 1.75, -0.18], pt: [0.07, 0.75, -1.15], rabo1: 1.0, rabo2: 0.6 }
      };
      var g = { raiz: raiz, alvo: alvo, estado: 'dormindo', t: 0, escala: 0, mult: 1 };
      function olhosAbertos(sim) {
        olhos.forEach(function (o) { o.scale.y = sim ? 1 : 0.25; });
        mOlho.color.setHex(sim ? 0x39ff6a : 0x0b0c0e);
        mOlho.emissive.setHex(sim ? 0x2bd458 : 0x000000);
      }
      g.definir = function (estado) {
        g.estado = estado;
        olhosAbertos(estado !== 'dormindo');
      };
      g.definir('dormindo');
      g.atualizar = function (dt) {
        g.t += dt;
        // Aparece crescendo (efeito de "surgir" ao ser colocado).
        g.escala += (1 - g.escala) * Math.min(1, dt * 7);
        raiz.scale.setScalar(Math.max(0.01, g.escala) * F4.TAMANHO * g.mult);
        var p = POSES[g.estado === 'dormindo' ? 'dormindo' : 'sentado'];
        var k = Math.min(1, dt * 6);
        function l(a, b) { return a + (b - a) * k; }
        tronco.position.y = l(tronco.position.y, p.troncoY);
        tronco.rotation.x = l(tronco.rotation.x, p.troncoRot);
        cab.position.y = l(cab.position.y, p.cabY);
        cab.position.z = l(cab.position.z, p.cabZ);
        cab.rotation.x = l(cab.rotation.x, p.cabRot);
        patas.forEach(function (pt, i) {
          var c = i < 2 ? p.pf : p.pt;
          pt.position.y = l(pt.position.y, c[0]);
          pt.scale.y = l(pt.scale.y, c[1]);
          pt.rotation.x = l(pt.rotation.x, c[2]);
        });
        rabo1.rotation.y = l(rabo1.rotation.y, p.rabo1);
        rabo2.rotation.y = l(rabo2.rotation.y, p.rabo2);
        var dormindo = g.estado === 'dormindo';
        tronco.scale.y = 1 + (dormindo ? Math.sin(g.t * 2.2) * 0.06 : 0);
        zs.forEach(function (z) {
          z.sp.visible = dormindo;
          if (!dormindo) return;
          var f = (g.t * 0.35 + z.fase) % 1;
          z.sp.position.set(0.05 + f * 0.15, 0.3 + f * 0.45, Math.sin(f * 6) * 0.05);
          z.sp.material.opacity = Math.sin(f * Math.PI);
          z.sp.scale.setScalar(0.06 + f * 0.07);
        });
        var falando = g.estado === 'falando';
        tampaPiv.rotation.x += ((falando ? -1.15 : 0) - tampaPiv.rotation.x) * Math.min(1, dt * 8);
        cerebro.visible = tampaPiv.rotation.x < -0.2;
        if (cerebro.visible) {
          var pulso = 1 + Math.sin(g.t * 9) * 0.12;
          cerebro.scale.set(pulso, pulso, pulso);
        }
        cab.rotation.z = falando ? Math.sin(g.t * 3) * 0.15 : cab.rotation.z * (1 - Math.min(1, dt * 6));
      };
      g.liberar = function () {
        raiz.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
      };
      return g;
    };
  });

  /* ================================================================== */
  secao('F4C-camera-ar', function () {
    var C = S.CSS;
    var F4 = S.f4;
    var J = S.jogo;
    var ar = null; // estado da tela de AR aberta
    var ALTURA_MESA = 0.6; // no modo câmera: a mesa fica uns 60 cm abaixo do celular

    // Diagnóstico: o que o navegador (e o Canva) deixam usar.
    function politica(recurso) {
      try {
        var fp = document.permissionsPolicy || document.featurePolicy;
        if (fp && fp.allowsFeature) return fp.allowsFeature(recurso);
      } catch (e) { /* ignora */ }
      return null;
    }
    F4.diagnostico = function () {
      var dentro = false;
      try { dentro = window.self !== window.top; } catch (e) { dentro = true; }
      return {
        webxr: !!navigator.xr,
        arSuportado: F4.xrSuportado,
        politicaXR: politica('xr-spatial-tracking'),
        politicaCamera: politica('camera'),
        politicaSensores: politica('gyroscope'),
        seguro: !!window.isSecureContext,
        iframe: dentro,
        mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      };
    };
    function simNao(v) { return v === null || v === undefined ? '?' : v ? 'sim' : 'não'; }
    function textoDiag(d, extra) {
      return 'Diagnóstico · WebXR AR: ' + simNao(d.arSuportado) + ' (liberado: ' + simNao(d.politicaXR) + ')' +
        ' · câmera liberada: ' + simNao(d.politicaCamera) + ' · sensores: ' + simNao(d.politicaSensores) +
        ' · HTTPS: ' + simNao(d.seguro) + ' · dentro de iframe: ' + simNao(d.iframe) + (extra ? ' · ' + extra : '');
    }

    function fatoNovo() {
      var lista = S.FATOS_CACHOLA || ['Gatos dormem de 12 a 16 horas por dia.'];
      F4.usados = F4.usados || [];
      if (F4.usados.length >= lista.length) F4.usados = [];
      var i;
      do { i = Math.floor(Math.random() * lista.length); } while (F4.usados.indexOf(i) >= 0);
      F4.usados.push(i);
      return lista[i];
    }

    // ---- Tela (camada por cima do jogo) ----------------------------------
    function montarTela() {
      var t = {};
      t.camada = S.el('div', {
        position: 'absolute', inset: '0', zIndex: '45', background: '#000000', overflow: 'hidden', touchAction: 'none'
      }, null, S.raiz);
      t.camada.setAttribute('role', 'dialog');
      t.camada.setAttribute('aria-label', 'Realidade aumentada');
      t.video = S.el('video', {
        position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', display: 'none'
      }, null, t.camada);
      t.video.setAttribute('playsinline', '');
      t.video.setAttribute('muted', '');
      t.video.muted = true;
      t.video.autoplay = true;
      t.fotoCanvas = S.el('canvas', { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'none' }, null, t.camada);
      t.palco = S.el('div', { position: 'absolute', inset: '0' }, null, t.camada);
      // Interface (também é a "dom overlay" do WebXR).
      t.topo = S.el('div', {
        position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', gap: '8px',
        alignItems: 'flex-start', justifyContent: 'space-between', pointerEvents: 'none'
      }, null, t.camada);
      t.status = S.el('div', {
        background: 'rgba(7,20,48,0.85)', border: '2px solid ' + C.laranja, borderRadius: '8px', padding: '6px 10px',
        color: '#FFFFFF', fontSize: '13px', fontWeight: '700', lineHeight: '1.35', maxWidth: '70%', pointerEvents: 'none'
      }, 'Pedindo permissão para a câmera…', t.topo);
      t.status.setAttribute('aria-live', 'polite');
      t.sair = S.ui.botao('✕ Sair da AR', 'secundario', function () { F4.fecharAR(); }, t.topo);
      S.estilo(t.sair, { pointerEvents: 'auto', padding: '6px 12px', fontSize: '13px' });
      t.sair.addEventListener('beforexrselect', function (e) { e.preventDefault(); });
      // Fala do Cachola (embaixo).
      t.fala = S.el('div', {
        position: 'absolute', left: '50%', bottom: '60px', transform: 'translateX(-50%)', width: 'min(640px, calc(100% - 24px))',
        background: 'rgba(7,20,48,0.92)', border: '3px solid #39C46A', borderRadius: '10px', padding: '16px 14px 10px',
        color: '#FFFFFF', fontSize: '14px', fontWeight: '700', lineHeight: '1.45', display: 'none', boxSizing: 'border-box', pointerEvents: 'none'
      }, null, t.camada);
      S.el('div', {
        position: 'absolute', top: '-13px', left: '12px', background: '#39C46A', color: '#071430', border: '3px solid #071430',
        borderRadius: '6px', padding: '1px 10px', fontSize: '12px'
      }, 'Cachola', t.fala);
      t.falaTexto = S.el('div', null, '', t.fala);
      t.rodape = S.el('div', {
        position: 'absolute', left: '8px', right: '8px', bottom: '6px', display: 'flex', gap: '8px', alignItems: 'flex-end',
        justifyContent: 'space-between', pointerEvents: 'none'
      }, null, t.camada);
      t.diag = S.el('div', { fontSize: '10px', color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px #000', maxWidth: '75%', lineHeight: '1.3' }, '', t.rodape);
      t.acoes = S.el('div', { display: 'flex', gap: '6px', pointerEvents: 'auto' }, null, t.rodape);
      t.toast = S.el('div', {
        position: 'absolute', top: '58px', left: '50%', transform: 'translateX(-50%)', background: '#1F7A3E', color: '#FFFFFF',
        border: '3px solid #071430', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '700',
        display: 'none', pointerEvents: 'none', whiteSpace: 'nowrap'
      }, '', t.camada);
      return t;
    }
    function toast(texto) {
      if (!ar) return;
      ar.ui.toast.textContent = texto;
      ar.ui.toast.style.display = 'block';
      clearTimeout(ar.timerToast);
      ar.timerToast = setTimeout(function () { if (ar) ar.ui.toast.style.display = 'none'; }, 2600);
    }
    function status(texto) {
      if (ar) ar.ui.status.textContent = texto;
    }

    // ---- Cena 3D própria (outro WebGL, com fundo transparente) -----------
    function montarCena(xr) {
      var r = new THREE.WebGLRenderer({ alpha: true, antialias: !!xr });
      r.setClearColor(0x000000, 0);
      var pr = Math.min(window.devicePixelRatio || 1, 2);
      r.setPixelRatio(xr ? pr : Math.min(1, pr) * 0.75); // um pouco "pixelado", como o jogo
      S.estilo(r.domElement, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' });
      if (xr) r.xr.enabled = true;
      ar.ui.palco.appendChild(r.domElement);
      var cena = new THREE.Scene();
      cena.add(new THREE.HemisphereLight(0xffffff, 0x6a6a7a, 0.9));
      var sol = new THREE.DirectionalLight(0xffffff, 0.6);
      sol.position.set(0.5, 2, 1);
      cena.add(sol);
      var cam = new THREE.PerspectiveCamera(60, 1, 0.02, 30);
      ar.renderer = r;
      ar.cena = cena;
      ar.cam = cam;
      ar.gato = F4.criarGato();
      ar.gato.raiz.visible = false;
      cena.add(ar.gato.raiz);
      redimensionar();
    }
    function redimensionar() {
      if (ar && ar.modo === 'foto') desenharFoto();
      if (!ar || !ar.renderer || ar.modo === 'webxr') return;
      var w = Math.max(1, ar.ui.camada.clientWidth);
      var h = Math.max(1, ar.ui.camada.clientHeight);
      ar.renderer.setSize(w, h, false);
      ar.cam.aspect = w / h;
      // Câmera de celular: ~60° na vertical em pé, ~42° deitado.
      ar.cam.fov = w > h ? 44 : 60;
      ar.cam.updateProjectionMatrix();
    }

    // Coloca (ou muda de lugar) o gato, virado para quem está olhando.
    function colocarGato(pos, olhar) {
      var g = ar.gato;
      var novo = !g.raiz.visible;
      g.raiz.visible = true;
      g.raiz.position.copy(pos);
      g.raiz.rotation.y = Math.atan2(olhar.x - pos.x, olhar.z - pos.z);
      if (novo) g.escala = 0.01;
      S.som('aparecer');
      if (!F4.colocou) {
        F4.colocou = true;
        J.atualizarMissoes();
        S.som('missao');
        toast('✔ Missão: Cachola colocado!');
      }
      status('Toque no Cachola para acordá-lo. Tocar em outro lugar muda ele de lugar.');
    }

    // Toque no gato: acorda, abre a cachola e solta um fato.
    function acordar() {
      var g = ar.gato;
      if (g.estado !== 'dormindo') return;
      var fato = fatoNovo();
      g.definir('sentado');
      S.voz.frase('cachola', 'miau!');
      clearTimeout(ar.timerFato);
      ar.timerFato = setTimeout(function () {
        if (!ar) return;
        g.definir('falando');
        mostrarFala(fato);
        F4.fatos++;
        if (F4.fatos === 1) {
          J.atualizarMissoes();
          S.som('missao');
          toast('✔ Missão: fato do Cachola!');
        }
        var dur = 2500 + fato.length * 55;
        ar.timerFato = setTimeout(function () {
          if (!ar) return;
          g.definir('dormindo');
          ar.ui.fala.style.display = 'none';
          S.som('ronco');
          status('Ele dormiu de novo. Toque nele para outro fato, ou toque em "Sair da AR".');
        }, dur);
      }, 650);
    }
    function mostrarFala(texto) {
      var u = ar.ui;
      u.fala.style.display = 'block';
      u.falaTexto.textContent = '';
      var i = 0;
      clearInterval(ar.timerLetras);
      ar.timerLetras = setInterval(function () {
        if (!ar) return;
        i = Math.min(texto.length, i + 2);
        u.falaTexto.textContent = texto.slice(0, i);
        if (i >= texto.length) clearInterval(ar.timerLetras);
      }, 40);
      if (S.cfg.lerVoz && S.voz.ler) S.voz.ler('cachola', texto);
      else S.voz.frase('cachola', texto);
    }

    // ---- Modo 1: WebXR ----------------------------------------------------
    function iniciarXR() {
      var ui = ar.ui;
      return navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor'],
        domOverlay: { root: ui.camada }
      }).then(function (sessao) {
        if (!ar) { sessao.end(); return true; }
        ar.modo = 'webxr';
        F4.modosUsados.webxr = true;
        ar.sessao = sessao;
        ui.camada.style.background = 'transparent';
        montarCena(true);
        var r = ar.renderer;
        r.xr.setReferenceSpaceType('local');
        var mira = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf7941d }));
        mira.matrixAutoUpdate = false;
        mira.visible = false;
        ar.cena.add(mira);
        var fonteHit = null;
        sessao.requestReferenceSpace('viewer').then(function (vs) {
          return sessao.requestHitTestSource({ space: vs });
        }).then(function (f) { fonteHit = f; }, function (e) { registrarErro('ar:hit-test', e); });
        sessao.addEventListener('end', function () {
          if (ar && ar.sessao === sessao) {
            ar.sessao = null;
            F4.fecharAR();
          }
        });
        var origem = new THREE.Vector3();
        var direcao = new THREE.Vector3();
        var mtx = new THREE.Matrix4();
        var rc = new THREE.Raycaster();
        sessao.addEventListener('select', function (ev) {
          try {
            var ref = r.xr.getReferenceSpace();
            var pose = ev.frame && ev.frame.getPose(ev.inputSource.targetRaySpace, ref);
            if (pose && ar.gato.raiz.visible) {
              mtx.fromArray(pose.transform.matrix);
              origem.setFromMatrixPosition(mtx);
              direcao.set(0, 0, -1).transformDirection(mtx);
              rc.set(origem, direcao);
              if (rc.intersectObject(ar.gato.alvo, false).length) return acordar();
            }
            if (mira.visible) {
              var p = new THREE.Vector3().setFromMatrixPosition(mira.matrix);
              var camXR = r.xr.getCamera(ar.cam);
              colocarGato(p, new THREE.Vector3().setFromMatrixPosition(camXR.matrixWorld));
            } else {
              status('Ainda procurando uma superfície… mexa o celular devagar, apontando para a mesa ou o chão.');
            }
          } catch (e) { registrarErro('ar:select', e); }
        });
        var antes = 0;
        r.setAnimationLoop(function (t, frame) {
          var dt = antes ? Math.min(0.05, (t - antes) / 1000) : 0.016;
          antes = t;
          if (frame && fonteHit) {
            var res = frame.getHitTestResults(fonteHit);
            if (res.length) {
              var pose = res[0].getPose(r.xr.getReferenceSpace());
              mira.visible = !!pose;
              if (pose) mira.matrix.fromArray(pose.transform.matrix);
              if (!F4.colocou) status('Achei uma superfície! Toque para colocar o Cachola em cima do círculo laranja.');
            } else {
              mira.visible = false;
            }
          }
          ar.gato.atualizar(dt);
          r.render(ar.cena, ar.cam);
        });
        return r.xr.setSession(sessao).then(function () {
          status('Aponte para uma mesa ou para o chão e mexa o celular devagar até aparecer o círculo laranja.');
          ui.diag.textContent = textoDiag(F4.diagnostico(), 'modo: WebXR');
          return true;
        });
      });
    }

    // ---- Modo 2: câmera + sensores (3 graus de liberdade) -----------------
    var zee = new THREE.Vector3(0, 0, 1);
    var euler = new THREE.Euler();
    var q0 = new THREE.Quaternion();
    var q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    function orientar(q, a, b, g, o) {
      euler.set(b, a, -g, 'YXZ');
      q.setFromEuler(euler);
      q.multiply(q1);
      q.multiply(q0.setFromAxisAngle(zee, -o));
    }
    function anguloTela() {
      try {
        if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
      } catch (e) { /* ignora */ }
      return window.orientation || 0;
    }

    // iPhone: a permissão dos sensores tem de ser pedida no toque do aluno,
    // então é pedida logo ao apertar o botão (junto com a câmera).
    function pedirSensores() {
      try {
        if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
          return DeviceOrientationEvent.requestPermission().then(function (r) { return r === 'granted'; }, function () { return false; });
        }
      } catch (e) { return Promise.resolve(false); }
      return Promise.resolve(!!window.DeviceOrientationEvent);
    }

    function ligarSensores() {
      function ouvir() {
        ar.aoOrientar = function (e) {
          if (!ar || e.alpha === null || e.beta === null) return;
          if (ar.alpha0 === undefined) ar.alpha0 = e.alpha;
          ar.sensor = { a: e.alpha - ar.alpha0, b: e.beta, g: e.gamma || 0 };
        };
        window.addEventListener('deviceorientation', ar.aoOrientar);
      }
      (ar.permSensores || Promise.resolve(false)).then(function (ok) { if (ok && ar) ouvir(); });
    }

    function iniciarCameraOuVirtual(motivoXR) {
      var md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) return Promise.resolve(iniciarVirtual(!window.isSecureContext ? 'a página não é segura (precisa de HTTPS)' : 'este navegador não dá acesso à câmera', motivoXR));
      return md.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (stream) {
        if (!ar) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        ar.stream = stream;
        ar.ui.video.srcObject = stream;
        ar.ui.video.style.display = 'block';
        var p = ar.ui.video.play();
        if (p && p.catch) p.catch(function () {});
        iniciarTela('camera', motivoXR);
      }, function (err) {
        var nome = err && err.name;
        var bloqueadoCanva = F4.diagnostico().politicaCamera === false;
        var motivo = bloqueadoCanva ? 'o site onde o jogo está (Canva) não libera a câmera para ele'
          : nome === 'NotAllowedError' || nome === 'SecurityError' ? 'a permissão da câmera foi negada (libere nas configurações do navegador e tente de novo)'
            : nome === 'NotFoundError' || nome === 'OverconstrainedError' ? 'não encontrei uma câmera neste aparelho'
              : nome === 'NotReadableError' ? 'a câmera está sendo usada por outro programa'
                : 'o navegador não abriu a câmera (' + (nome || 'erro') + ')';
        iniciarVirtual(motivo, motivoXR);
      });
    }

    function iniciarVirtual(motivo, motivoXR) {
      if (!ar) return;
      ar.motivo = motivo;
      iniciarTela('virtual', motivoXR);
    }

    // ---- Modo foto (funciona dentro do Canva) -----------------------------
    // O campo de arquivo com "capture" abre a câmera do próprio celular para
    // tirar a foto; não é a câmera ao vivo, por isso o iframe do Canva deixa.
    // A foto é desenhada num canvas (o Canva bloqueia imagens por endereço).
    function desenharFoto() {
      if (!ar || !ar.foto) return;
      var c = ar.ui.fotoCanvas;
      var w = Math.max(1, ar.ui.camada.clientWidth);
      var h = Math.max(1, ar.ui.camada.clientHeight);
      var k = Math.min(1.5, window.devicePixelRatio || 1);
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      var img = ar.foto;
      var iw = img.width || img.naturalWidth;
      var ih = img.height || img.naturalHeight;
      // "cover": preenche a tela inteira cortando as sobras.
      var esc = Math.max(c.width / iw, c.height / ih);
      var dw = iw * esc;
      var dh = ih * esc;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    }
    F4.desenharFoto = desenharFoto;

    function abrirImagem(arquivo) {
      var tentativa = window.createImageBitmap ? window.createImageBitmap(arquivo) : Promise.reject(new Error('sem createImageBitmap'));
      return tentativa.catch(function () {
        return new Promise(function (ok, falha) {
          var url = URL.createObjectURL(arquivo);
          var img = new Image();
          img.onload = function () { ok(img); };
          img.onerror = function () { falha(new Error('imagem inválida')); };
          img.src = url;
        });
      });
    }

    function carregarFoto(arquivo) {
      if (!ar || !arquivo) return;
      if (arquivo.type && arquivo.type.indexOf('image/') !== 0) {
        status('Esse arquivo não é uma imagem. Escolha uma foto.');
        return;
      }
      status('Abrindo a foto…');
      abrirImagem(arquivo).then(function (img) {
        if (!ar) return;
        ar.foto = img;
        if (ar.escolha) ar.escolha.remove();
        ar.escolha = null;
        iniciarTela('foto');
      }, function () {
        status('Não consegui abrir essa imagem. Tente outra foto.');
      });
    }

    function campoFoto(captura) {
      var i = document.createElement('input');
      i.type = 'file';
      i.accept = 'image/*';
      if (captura) i.setAttribute('capture', 'environment');
      i.style.display = 'none';
      i.setAttribute('aria-hidden', 'true');
      ar.ui.camada.appendChild(i);
      i.addEventListener('change', S.protegido('ar:foto', function () {
        var f = i.files && i.files[0];
        if (f) carregarFoto(f);
        i.value = '';
      }));
      return i;
    }

    // Tela inicial: tirar foto, escolher uma foto ou usar a mesa virtual.
    function mostrarEscolha() {
      var ui = ar.ui;
      ui.camada.style.background = 'radial-gradient(ellipse at 50% 0%, #163E78 0%, #0A1A33 70%)';
      status('Realidade aumentada por foto');
      var caixa = S.el('div', {
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(460px, calc(100% - 24px))',
        background: C.painel, border: '3px solid ' + C.borda, borderRadius: '10px', padding: '16px 18px', boxSizing: 'border-box',
        color: '#FFFFFF', textAlign: 'center', boxShadow: '0 8px 0 #050E1F'
      }, null, ui.camada);
      ar.escolha = caixa;
      var compacto = S.ui.compacto();
      S.el('div', { fontSize: compacto ? '30px' : '40px', lineHeight: '1' }, '📷🐈‍⬛', caixa);
      S.el('div', { fontSize: compacto ? '16px' : '19px', fontWeight: '700', margin: '6px 0 4px' }, 'Traga o Cachola para a sua mesa', caixa);
      S.el('div', { fontSize: '13px', color: C.cinza, lineHeight: '1.45', marginBottom: compacto ? '8px' : '12px' },
        'Tire uma foto de uma mesa (ou do chão). O Cachola aparece em cima dela: toque nele para ouvir um fato.', caixa);
      var botoes = S.el('div', { display: 'flex', flexDirection: 'column', gap: '8px' }, null, caixa);
      var tirar = campoFoto(true);
      var escolher = campoFoto(false);
      if (S.toque) {
        S.ui.botao('📷 Tirar uma foto', 'primario', function () { tirar.click(); }, botoes);
        S.ui.botao('🖼 Escolher da galeria', 'secundario', function () { escolher.click(); }, botoes);
      } else {
        S.ui.botao('🖼 Escolher uma foto', 'primario', function () { escolher.click(); }, botoes);
      }
      // Câmera ao vivo: só aparece onde o site deixa (fora do Canva).
      var d = F4.diagnostico();
      if (d.politicaCamera !== false && d.mediaDevices && d.seguro) {
        S.ui.botao('🎥 Câmera ao vivo', 'secundario', function () {
          ar.permSensores = pedirSensores();
          caixa.remove();
          ar.escolha = null;
          if (F4.xrSuportado) {
            status('Abrindo a realidade aumentada (WebXR)…');
            iniciarXR().catch(function (e) {
              if (!ar) return;
              return iniciarCameraOuVirtual(e && e.name === 'SecurityError' ? 'bloqueado pelo site (iframe)' : (e && e.name) || 'recusado');
            });
          } else {
            iniciarCameraOuVirtual(null);
          }
        }, botoes);
      }
      S.ui.botao('Usar uma mesa virtual (sem foto)', 'secundario', function () {
        caixa.remove();
        ar.escolha = null;
        iniciarVirtual(null);
      }, botoes);
      F4.campos = { tirar: tirar, escolher: escolher }; // para os testes
    }

    // Ajustes do Cachola na foto: tamanho e direção.
    function controlesFoto() {
      var ui = ar.ui;
      function mini(texto, rotulo, fn) {
        var b = S.ui.botao(texto, 'secundario', fn, ui.acoes);
        S.estilo(b, { padding: '6px 10px', fontSize: '13px' });
        b.setAttribute('aria-label', rotulo);
        return b;
      }
      mini('➖', 'Cachola menor', function () { ar.gato.mult = Math.max(0.4, ar.gato.mult / 1.2); });
      mini('➕', 'Cachola maior', function () { ar.gato.mult = Math.min(3, ar.gato.mult * 1.2); });
      mini('↻', 'Girar o Cachola', function () { ar.gato.raiz.rotation.y += Math.PI / 4; });
      var b = S.ui.botao('📷 Outra foto', 'primario', function () {
        F4.fecharAR(true);
        F4.abrirAR();
      }, ui.acoes);
      S.estilo(b, { padding: '6px 10px', fontSize: '12px' });
    }

    // Modos câmera, foto e mesa virtual usam o mesmo palco: uma câmera
    // virtual olhando para a "mesa" (um plano um pouco abaixo dela).
    function iniciarTela(modo, motivoXR) {
      ar.modo = modo;
      F4.modosUsados[modo] = true;
      var ui = ar.ui;
      montarCena(false);
      var cam = ar.cam;
      cam.position.set(0, 0, 0);
      cam.rotation.set(-0.62, 0, 0, 'YXZ');
      if (modo === 'foto') {
        ui.camada.style.background = '#000000';
        ui.fotoCanvas.style.display = 'block';
        desenharFoto();
        status('Toque na foto, em cima da mesa (ou do chão), para colocar o Cachola.');
        controlesFoto();
      } else if (modo === 'virtual') {
        ui.camada.style.background = 'linear-gradient(#24364F, #10203A)';
        // Mesa virtual de madeira.
        var mesa = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.5), new THREE.MeshLambertMaterial({ color: S.COR.madeira }));
        mesa.position.set(0, -ALTURA_MESA - 0.02, -1.25);
        ar.cena.add(mesa);
        status(ar.motivo ? 'Não deu para abrir a câmera: ' + ar.motivo + '. Use a mesa virtual: toque nela para colocar o Cachola.'
          : 'Mesa virtual: toque nela para colocar o Cachola.');
        var bTentar = S.ui.botao('📷 Usar uma foto', 'primario', function () {
          F4.fecharAR(true);
          F4.abrirAR();
        }, ui.acoes);
        S.estilo(bTentar, { padding: '6px 10px', fontSize: '12px' });
      } else {
        ui.camada.style.background = '#000000';
        ligarSensores();
        status('Aponte a câmera para uma mesa e toque nela para colocar o Cachola.');
      }
      ui.diag.textContent = textoDiag(F4.diagnostico(), 'modo: ' + ({ camera: 'câmera + sensores', foto: 'foto', virtual: 'mesa virtual' }[modo]) + (motivoXR ? ' · WebXR: ' + motivoXR : ''));
      var plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), ALTURA_MESA);
      var rc = new THREE.Raycaster();
      var ndc = new THREE.Vector2();
      var ponto = new THREE.Vector3();
      ui.palco.addEventListener('pointerdown', S.protegido('ar:toque', function (e) {
        if (!ar) return;
        var rect = ui.palco.getBoundingClientRect();
        ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        rc.setFromCamera(ndc, cam);
        if (ar.gato.raiz.visible && rc.intersectObject(ar.gato.alvo, false).length) return acordar();
        if (!rc.ray.intersectPlane(plano, ponto) || ponto.distanceTo(cam.position) > 3) {
          status('Toque mais para baixo, em cima da mesa (ou do chão).');
          return;
        }
        // Muito perto da câmera o gato não cabe na tela: empurra para ~85 cm.
        var dh = Math.sqrt(ponto.x * ponto.x + ponto.z * ponto.z);
        if (dh < 0.85 && dh > 0.001) {
          ponto.x *= 0.85 / dh;
          ponto.z *= 0.85 / dh;
        }
        colocarGato(ponto.clone(), cam.position);
      }));
      var qSensor = new THREE.Quaternion();
      var antes = performance.now();
      function laco(agora) {
        if (!ar || ar.modo !== modo) return;
        ar.raf = requestAnimationFrame(laco);
        var dt = Math.min(0.05, (agora - antes) / 1000);
        antes = agora;
        if (ar.sensor) {
          orientar(qSensor, THREE.MathUtils.degToRad(ar.sensor.a), THREE.MathUtils.degToRad(ar.sensor.b), THREE.MathUtils.degToRad(ar.sensor.g), THREE.MathUtils.degToRad(anguloTela()));
          cam.quaternion.copy(qSensor);
          if (!ar.avisouSensor && modo === 'camera') {
            ar.avisouSensor = true;
            ui.diag.textContent += ' · sensores ativos';
          }
        }
        ar.gato.atualizar(dt);
        ar.renderer.render(ar.cena, cam);
      }
      ar.raf = requestAnimationFrame(laco);
    }

    // ---- Abrir / fechar ---------------------------------------------------
    F4.abrirAR = S.protegido('ar:abrir', function () {
      if (ar) return;
      S.pausado = true;
      S.teclas = {};
      S.joy.x = 0;
      S.joy.z = 0;
      if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
      if (S.limparHover) S.limparHover();
      ar = { ui: montarTela() };
      F4.emAR = true;
      if (!F4.arAberto) {
        F4.arAberto = true;
        J.atualizarMissoes();
      }
      ar.aoRedimensionar = redimensionar;
      window.addEventListener('resize', redimensionar);
      ar.aoTecla = function (e) {
        if ((e.key || '').toLowerCase() === 'escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
          F4.fecharAR();
        }
      };
      window.addEventListener('keydown', ar.aoTecla, true);
      ar.ui.diag.textContent = textoDiag(F4.diagnostico());
      mostrarEscolha();
    });

    F4.fecharAR = function (semVoltar) {
      if (!ar) return;
      var a = ar;
      ar = null;
      F4.emAR = false;
      clearTimeout(a.timerFato);
      clearTimeout(a.timerToast);
      clearInterval(a.timerLetras);
      if (a.raf) cancelAnimationFrame(a.raf);
      window.removeEventListener('resize', a.aoRedimensionar);
      window.removeEventListener('keydown', a.aoTecla, true);
      if (a.aoOrientar) window.removeEventListener('deviceorientation', a.aoOrientar);
      if (a.stream) a.stream.getTracks().forEach(function (t) { t.stop(); });
      if (a.sessao) { try { a.sessao.end(); } catch (e) { /* já terminou */ } }
      if (S.voz && S.voz.parar) S.voz.parar();
      if (a.renderer) {
        try { a.renderer.setAnimationLoop(null); } catch (e) { /* ignora */ }
        if (a.gato) a.gato.liberar();
        a.renderer.dispose();
        try { a.renderer.forceContextLoss(); } catch (e) { /* ignora */ }
      }
      a.ui.camada.remove();
      if (semVoltar) return;
      if (S.fase === 'jogo') {
        S.pausado = !!S.ui.modalAberto();
        if (S.ui.atualizarControlesToque) S.ui.atualizarControlesToque();
        try { S.raiz.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
      }
      J.atualizarMissoes();
      if (!J.concluido) {
        if (!F4.colocou) S.aviso('Você saiu antes de colocar o Cachola. Use o botão da parede de novo.', 'info', 3600);
        else if (!F4.fatos) S.aviso('Faltou acordar o Cachola! Use o botão da parede de novo e toque nele.', 'info', 3600);
      }
    };
    F4.arAtual = function () { return ar; };
  });

  /* ================================================================== */
  secao('F4D-registro-da-fase', function () {
    var F4 = S.f4;
    var C = S.CSS;

    // Fim do laboratório 4: não entra no ranking (é uma experiência).
    S.ui.mostrarFimAR = function () {
      S.fase = 'fim';
      S.pausado = true;
      S.ui.atualizarControlesToque();
      S.ui.mostrarHud(false);
      S.som('vitoria');
      var t = S.ui.tela(30, '500px');
      S.el('div', { fontSize: '13px', fontWeight: '700', color: C.laranja, letterSpacing: '0.08em' }, 'LABORATÓRIO 4 CONCLUÍDO', t.cartao);
      S.el('div', { fontSize: '24px', fontWeight: '700', margin: '4px 0 12px' }, 'O Cachola saiu da tela! 🐈‍⬛', t.cartao);
      var modos = [];
      if (F4.modosUsados.webxr) modos.push('WebXR (preso na superfície)');
      if (F4.modosUsados.camera) modos.push('câmera + sensores');
      if (F4.modosUsados.foto) modos.push('foto');
      if (F4.modosUsados.virtual) modos.push('mesa virtual');
      S.el('div', { fontSize: '14px', lineHeight: '1.5', marginBottom: '6px' }, 'Fatos que o Cachola contou: ' + F4.fatos, t.cartao);
      S.el('div', { fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }, 'Modo usado: ' + (modos.join(', ') || '—'), t.cartao);
      S.el('div', { fontSize: '12px', color: C.cinza, marginBottom: '14px', lineHeight: '1.45' },
        'Realidade aumentada mistura o virtual com a imagem da câmera. Este laboratório não entra no ranking.', t.cartao);
      var linha = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, t.cartao);
      S.estilo(S.ui.botao('Escolher outro laboratório', 'primario', function () {
        t.fechar();
        S.ui.mostrarFases();
      }, linha), { flex: '1 1 200px' });
      S.ui.botao('Jogar de novo', 'secundario', function () { window.location.reload(); }, linha);
    };

    S.registrarFase('realidade', {
      numero: 4,
      nome: 'Laboratório 4 · Realidade aumentada',
      titulo: 'Realidade aumentada',
      resumoCurto: 'Tire uma foto da sua mesa, coloque o Cachola em cima dela e toque nele para ouvir um fato. (Não entra no ranking.)',
      missaoCurta: 'Aperte o botão de AR na parede, tire uma foto da mesa, coloque o Cachola nela e toque nele.',
      missaoLonga: 'Realidade aumentada por foto: aperte o botão na parede, tire uma foto de uma mesa (ou do chão), toque na foto para colocar o Cachola em cima dela e toque nele para ele acordar e contar um fato. Este laboratório não entra no ranking.',
      usar: function (info) {
        if (info.id === 'botaoAR') return F4.abrirAR();
      },
      rotulo: function (info) {
        if (info.id === 'botaoAR') return 'Realidade Aumentada (tirar foto)';
        return null;
      },
      concluir: function () {
        S.jogo.encerrarFase('O Cachola veio para o mundo real!', function () { S.ui.mostrarFimAR(); });
      },
      textoConcluido: 'Cachola em realidade aumentada!',
      atualizar: function (dt) { F4.atualizar(dt); },
      etapas: [
        ['Preparando as missões…', function () {
          F4.reiniciar();
          S.jogo.reiniciar(F4.MISSOES);
        }],
        ['Construindo o laboratório 4…', function () { F4.montarSala(); }],
        ['Chamando o professor e o aluno…', function () {
          S.criarProfessor();
          S.criarPersonagem(S.aluno.nome, S.aluno.genero);
          S.mundo.montarCaboMao();
          S.mundo.montarSeta();
        }]
      ],
      desmontar: function () {
        if (F4.emAR) F4.fecharAR(true);
        if (S.esconderBalaoProfessor) S.esconderBalaoProfessor();
      },
      abertura: {
        titulo: 'LABORATÓRIO 4 · REALIDADE AUMENTADA',
        portaAberta: true,
        inicio: { x: -5.35, z: 3.0 },
        tomadas: {
          abertura: { pos: [-1.2, 4.6, 8.6], alvo: [-4.2, 0.8, 2.4] },
          botao: { pos: [3.0, 1.8, -1.6], alvo: [4.45, 1.45, -4.4] },
          almofada: { pos: [3.9, 1.5, 2.4], alvo: [5.35, 0.1, 0.9] },
          mesas: { pos: [-1.0, 3.2, 3.2], alvo: [-1.6, 0.7, -0.6] }
        },
        falas: function () {
          var n = S.primeiroNome();
          return [
            { quem: 'prof', tomada: 'dupla', gesto: 'aceno', texto: 'Bem-vindo ao Laboratório 4, ' + n + '! Hoje é diferente: vamos trazer o Cachola para o mundo real.' },
            { quem: 'prof', tomada: 'almofada', gesto: 'apontar', texto: 'Viu? A almofada dele está vazia. Ele está te esperando do outro lado da câmera.' },
            { quem: 'prof', tomada: 'botao', gesto: 'apontar', texto: 'Aperte aquele botão laranja na parede e tire uma foto de uma mesa de verdade, ou do chão.' },
            { quem: 'prof', tomada: 'mesas', gesto: 'explicar', texto: 'Depois toque na foto, em cima da mesa: o Cachola aparece ali. Dá para aumentar, diminuir e girar ele.' },
            { quem: 'prof', tomada: 'dupla', gesto: 'falar', texto: 'Ele vai estar dormindo, claro. Toque nele que ele acorda e solta um fato.' },
            { quem: 'aluno', tomada: 'aluno', texto: 'Realidade aumentada? Bora!' }
          ];
        }
      },
      final: {
        sair: false,
        falas: function () {
          var n = S.primeiroNome();
          return [
            { quem: 'prof', tomada: 'despedida', gesto: 'aceno', texto: 'Mandou bem, ' + n + '! Isso é realidade aumentada: o virtual em cima de uma imagem do mundo real.' },
            { quem: 'prof', tomada: 'despedida', gesto: 'falar', texto: 'E o Cachola? Já voltou a dormir, como sempre.' }
          ];
        }
      }
    });
  });

})();

(function () {
  var ESPERADAS = ["B01-constantes","B02-utilitarios","U01-raiz-e-tema","U02-modal-e-avisos","U03-login","U04-comandos","U05-carregamento","U06-hud","U09-atualizacoes","D01-dados-ranking","D02-tela-ranking","D03-area-professor","W01-render-base","W02-sala","W03-bancadas-e-pcs","W04-rack-switch-roteador","W05-ferramentas-e-cabos","P01-personagem","P02-movimento-camera","P03-professor","E01-teclado-mouse","E02-controles-toque","J01-estado-e-missoes","J02-acoes","M01-minigames-base","M02-crimpagem","M03-portas","M04-configuracao-ip","F01-tela-final","L01-carregamento","L02-laco-e-qualidade","L03-inicio","C01-cena-abertura","F2A-sala-servidor","F2B-estado-e-missoes","F2C-acoes","F2D-keystone","F2E-gerenciador-servidor","F2F-pcs-dhcp-navegador","F2G-registro-da-fase","K01-cachola","K02-segredo-carlos","F3A-sala-cabeamento","F3B-estado-e-missoes","F3C-acoes","F3D-minigames","F3E-registro-da-fase","A01-motor-de-audio","A02-efeitos","A03-musica","A04-vozes","A05-legendas","G01-acessibilidade","G02-tela-configuracoes","F4A-sala-realidade","F4B-cachola-ar","F4C-camera-ar","F4D-registro-da-fase"];
  var painel = null;
  var timer = null;
  var gpu = null;
  function obterGpu() {
    if (gpu !== null) return gpu;
    gpu = '?';
    try {
      var gl = window.__SIM.renderer.getContext();
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (e) { gpu = '?'; }
    return gpu;
  }
  function desenhar() {
    var S = window.__SIM || {};
    var marcas = window.__SIM_MARCAS || [];
    var faltando = ESPERADAS.filter(function (m) { return marcas.indexOf(m) < 0; });
    var erros = window.__SIM_ERROS || [];
    painel.textContent = '';
    function linha(t, cor) { var d = document.createElement('div'); d.textContent = t; if (cor) d.style.color = cor; painel.appendChild(d); }
    linha('DIAGNÓSTICO AO VIVO (F9 fecha)', '#F7941D');
    linha('Versão do jogo: ' + (S.versao || '?') + ' · carregador: ' + (window.__SIM_CARREGADOR || '?') + ' · origem: ' + (window.__SIM_ORIGEM || '?'));
    var d = S.desempenho;
    if (d && (S.fase === 'jogo' || S.fase === 'cena')) {
      var cor = d.media >= 50 ? '#6BF08E' : d.media >= 28 ? '#FFD36B' : '#FF7676';
      linha('FPS agora: ' + d.fps.toFixed(0) + ' · média 3 s: ' + d.media.toFixed(1), cor);
      linha('FPS mínimo 3 s: ' + d.minimo.toFixed(0) + ' (pior quadro ' + d.piorQuadroMs.toFixed(0) + ' ms)', d.piorQuadroMs > 50 ? '#FF7676' : '#FFFFFF');
      linha('Draw calls: ' + d.drawCalls + ' · triângulos: ' + d.triangulos.toLocaleString('pt-BR'));
      linha('Resolução 3D: ' + d.resolucao + ' · sombras: ' + (d.sombras ? 'sim' : 'não') + ' · escala ' + d.escala);
      var mem = S.renderer.info.memory;
      linha('Memória GPU: ' + mem.geometries + ' geometrias · ' + mem.textures + ' texturas');
      linha('GPU: ' + obterGpu());
    } else if (S.fase === 'jogo' || S.fase === 'cena') {
      linha('Medindo… (o 3D fica parado com janelas abertas)', '#AFC2D8');
    } else {
      linha('O desempenho aparece quando o laboratório estiver rodando.', '#AFC2D8');
    }
    linha('Seções: ' + (ESPERADAS.length - faltando.length) + '/' + ESPERADAS.length + (faltando.length ? ' · faltando: ' + faltando.join(', ') : ''), faltando.length ? '#FF7676' : '#6BF08E');
    linha('Erros: ' + (erros.length || 'nenhum'), erros.length ? '#FF7676' : '#6BF08E');
    erros.slice(-6).forEach(function (e) { linha('• ' + e, '#FF7676'); });
    linha('Ranking: ' + (S.dados ? (S.dados.offline ? 'offline (fora do Canva)' : 'Canva Sheets') : '?'));
    if (S.perdasDeContexto) linha('3D reiniciado pelo navegador: ' + S.perdasDeContexto + 'x (pouca memória)', '#FFD36B');
  }
  function montar() {
    painel = document.createElement('div');
    var s = painel.style;
    s.position = 'absolute'; s.left = '8px'; s.bottom = '8px'; s.zIndex = '99'; s.maxWidth = '420px';
    s.background = 'rgba(6,22,44,0.95)'; s.border = '2px solid #F7941D'; s.borderRadius = '8px';
    s.padding = '10px 12px'; s.font = '12px/1.45 Arial, sans-serif'; s.color = '#FFFFFF';
    s.maxHeight = '70%'; s.overflow = 'auto'; s.pointerEvents = 'none';
    (document.getElementById('sim-root') || document.body).appendChild(painel);
    desenhar();
    timer = setInterval(desenhar, 500);
  }
  if (window.__SIM) window.__SIM.alternarVerificacao = function () {
    if (painel) { clearInterval(timer); painel.remove(); painel = null; } else montar();
  };
})();
