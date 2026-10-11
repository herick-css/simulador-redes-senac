/* Simulador de Redes · Laboratório Senac — código do jogo (carregado pelo Canva via jsDelivr) */
(function () {
  'use strict';

  var S = window.__SIM = {
    marcas: [],
    erros: [],
    versao: '2.2.0',
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
      camadaAviso.textContent = texto;
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
      var turma = S.ui.campo('CÓDIGO DA TURMA', colB, { placeholder: 'Ex.: TI2026A', max: 20, maiusculas: true });
      if (ap) {
        S.ui.compactarCampo(nome);
        S.ui.compactarCampo(turma);
      }
      nome.input.value = S.armazenar('sim-nome') || '';
      turma.input.value = S.armazenar('sim-turma') || '';
      turma.input.addEventListener('input', function () {
        var pos = turma.input.selectionStart;
        turma.input.value = turma.input.value.toUpperCase().replace(/\s+/g, '');
        try { turma.input.setSelectionRange(pos, pos); } catch (e) { /* ignora */ }
      });

      var erro = S.el('div', { color: C.vermelho, fontSize: '13px', fontWeight: '700', minHeight: ap ? '0' : '18px', marginBottom: ap ? '4px' : '8px' }, '', colB);
      var botoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, colB);

      function entrar() {
        var n = nome.input.value.trim().replace(/\s+/g, ' ');
        var tu = turma.input.value.trim().toUpperCase();
        if (n.length < 2) {
          erro.textContent = 'Digite seu nome (pelo menos 2 letras).';
          nome.input.focus();
          return;
        }
        if (tu.length < 2) {
          erro.textContent = 'Digite o código da turma.';
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
        S.ui.mostrarRanking(turma.input.value.trim().toUpperCase(), null);
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
      S.el('div', { fontSize: '10px', color: '#5F7896', marginTop: ap ? '6px' : '10px', textAlign: 'right' },
        'versão ' + S.versao + (window.__SIM_CARREGADOR ? ' · carregador ' + window.__SIM_CARREGADOR : '') + (window.__SIM_ORIGEM ? ' · ' + window.__SIM_ORIGEM : ''), t.cartao);
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
      ['laboratorio', 'servidores'].forEach(function (id) {
        var f = S.fases[id];
        if (!f) return;
        var b = S.el('button', {
          flex: '1 1 240px',
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
      var rod = S.el('div', { display: 'flex', marginTop: ap ? '10px' : '14px' }, null, t.cartao);
      S.ui.botao('Voltar', 'secundario', function () {
        t.fechar();
        S.ui.mostrarLogin();
      }, rod);
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
        linhaComando(cel, 'JOYSTICK', 'Arraste no canto esquerdo para andar', ap);
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
        right: '10px',
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

    // Resultados da turma numa fase (registros antigos, sem fase, são da fase 1).
    D.daTurma = function (turma, fase) {
      fase = fase || 1;
      return D.registros.filter(function (r) {
        if (!r || !isFinite(Number(r.tempo))) return false;
        if ((Number(r.fase) || 1) !== fase) return false;
        return !turma || String(r.turma || '').toUpperCase() === turma;
      }).sort(function (a, b) {
        return Number(a.tempo) - Number(b.tempo);
      });
    };
  });

  /* ================================================================== */
  secao('D02-tela-ranking', function () {
    var C = S.CSS;

    S.ui.mostrarRanking = function (turmaInicial, sessaoDestaque, faseInicial) {
      var t = S.ui.tela(40, '620px');
      var turma = (turmaInicial || '').toUpperCase();
      var fase = faseInicial || 1;

      var cab = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }, null, t.cartao);
      S.el('div', { fontSize: '21px', fontWeight: '700' }, '🏆 Ranking', cab);
      var bFechar = S.ui.botao('Fechar', 'secundario', function () {
        parar();
        t.fechar();
      }, cab);
      bFechar.style.padding = '6px 12px';

      var filtro = S.el('div', { display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '10px' }, null, t.cartao);
      var campo = S.ui.campo('TURMA', filtro, { placeholder: 'Todas as turmas', max: 20, maiusculas: true });
      campo.wrap.style.flex = '1 1 180px';
      campo.wrap.style.marginBottom = '0';
      campo.input.value = turma;
      campo.input.addEventListener('input', function () {
        campo.input.value = campo.input.value.toUpperCase().replace(/\s+/g, '');
        turma = campo.input.value;
        desenhar();
      });
      var bTodas = S.ui.botao('Todas', 'secundario', function () {
        campo.input.value = '';
        turma = '';
        desenhar();
      }, filtro);
      bTodas.style.padding = '8px 12px';

      // Abas: um ranking por fase.
      var abas = S.el('div', { display: 'flex', gap: '6px', marginBottom: '4px' }, null, t.cartao);
      var botoesAba = [1, 2].map(function (n) {
        var b = S.ui.botao('Fase ' + n + (n === 1 ? ' · Rede local' : ' · Servidor'), 'secundario', function () {
          fase = n;
          marcarAbas();
          desenhar();
        }, abas);
        S.estilo(b, { flex: '1 1 0', padding: '7px 8px', fontSize: '13px' });
        return b;
      });
      function marcarAbas() {
        botoesAba.forEach(function (b, i) {
          var ativa = i + 1 === fase;
          b.style.background = ativa ? C.laranja : C.painel2;
          b.style.color = ativa ? '#10203A' : C.branco;
        });
      }
      marcarAbas();
      var destaques = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '12px 0' }, null, t.cartao);
      var lista = S.el('div', null, null, t.cartao);
      var status = S.el('div', { fontSize: '12px', color: C.cinza, marginTop: '10px' }, '', t.cartao);

      function cartaoDestaque(titulo, reg, cor) {
        var c = S.el('div', {
          flex: '1 1 200px',
          background: '#071733',
          border: '3px solid ' + cor,
          borderRadius: '8px',
          padding: '8px 12px'
        }, null, destaques);
        S.el('div', { fontSize: '11px', fontWeight: '700', color: cor, letterSpacing: '0.06em' }, titulo, c);
        S.el('div', { fontSize: '15px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, reg ? String(reg.nome) : '—', c);
        S.el('div', { fontFamily: C.mono, fontSize: '14px', color: C.cinza }, reg ? S.formatarTempoLongo(Number(reg.tempo)) : '', c);
      }

      function desenhar() {
        destaques.textContent = '';
        lista.textContent = '';
        var D = S.dados;
        if (!D.carregado) {
          status.textContent = 'Carregando ranking…';
          return;
        }
        var regs = D.daTurma(turma, fase);
        status.textContent = (D.erroLeitura ? D.erroLeitura + ' ' : '') +
          (D.offline ? 'Modo offline: fora do Canva o ranking não é compartilhado. ' : '') +
          regs.length + ' resultado(s) na fase ' + fase + (turma ? ', turma ' + turma : '') + '.';
        if (!regs.length) {
          S.el('div', { padding: '18px 0', color: C.cinza, textAlign: 'center' }, 'Ainda não há resultados' + (turma ? ' para esta turma.' : '.'), lista);
          return;
        }
        cartaoDestaque('⚡ MAIS RÁPIDO', regs[0], C.verde);
        cartaoDestaque('🐢 MAIS DEMORADO', regs[regs.length - 1], C.amarelo);

        var cab = S.el('div', {
          display: 'grid',
          gridTemplateColumns: '42px minmax(0,1fr) 72px 92px',
          gap: '8px',
          fontSize: '11px',
          fontWeight: '700',
          color: C.cinza,
          padding: '0 8px 6px',
          borderBottom: '2px solid ' + C.borda
        }, null, lista);
        ['POS.', 'ALUNO', 'ERROS', 'TEMPO'].forEach(function (h, i) {
          S.el('div', { textAlign: i >= 2 ? 'right' : 'left' }, h, cab);
        });
        regs.slice(0, 50).forEach(function (r, i) {
          var meu = sessaoDestaque && r.sessao === sessaoDestaque;
          var linha = S.el('div', {
            display: 'grid',
            gridTemplateColumns: '42px minmax(0,1fr) 72px 92px',
            gap: '8px',
            alignItems: 'center',
            padding: '7px 8px',
            fontSize: '14px',
            background: meu ? '#3A2A08' : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.03)'),
            border: meu ? '2px solid ' + C.laranja : '2px solid transparent',
            borderRadius: '6px'
          }, null, lista);
          S.el('div', { fontWeight: '700', color: i < 3 ? C.laranja : C.branco }, String(i + 1).padStart(2, '0'), linha);
          var nomeEl = S.el('div', { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: meu ? '700' : '400' }, String(r.nome || '?') + (meu ? '  (você)' : ''), linha);
          if (!turma && r.turma) {
            S.el('span', { color: C.cinza, fontSize: '11px', marginLeft: '6px' }, String(r.turma), nomeEl);
          }
          S.el('div', { textAlign: 'right', color: C.cinza }, String(Number(r.erros) || 0), linha);
          S.el('div', { textAlign: 'right', fontFamily: C.mono, fontWeight: '700' }, S.formatarTempo(Number(r.tempo)) + '.' + String(Math.floor((Number(r.tempo) % 1) * 10)), linha);
        });
        if (regs.length > 50) S.el('div', { fontSize: '12px', color: C.cinza, padding: '6px 8px' }, '+ ' + (regs.length - 50) + ' resultados', lista);
      }

      var parar = S.dados.aoMudar(desenhar);
      desenhar();
      return t;
    };
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
      S.caixa(3.1, 1.62, 0.05, S.mat(C.metal), quadroX, 1.75, -P / 2 + 0.03, null, true);
      var quadro = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.52), new THREE.MeshLambertMaterial({ map: S.mundo.texQuadro }));
      quadro.position.set(quadroX, 1.75, -P / 2 + 0.06);
      S.adicionar(quadro);
      S.caixa(1.0, 0.04, 0.08, S.mat(C.metal), quadroX, 0.95, -P / 2 + 0.07, null, true);
      S.interativo(quadro, {
        id: 'quadro',
        nome: 'Quadro de missões',
        ancora: new THREE.Vector3(quadroX, 0, -3.7)
      });
    };

    S.mundo.abrirPorta = function () {
      if (S.mundo.porta) S.mundo.porta.alvo = 1.45;
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

    function bancada(x, z, largura, interativa) {
      var C = S.COR;
      var g = S.grupo(x, 0, z);
      var mTampo = S.mat(C.madeira);
      var mPe = S.mat(C.metalEscuro);
      S.caixa(largura, 0.05, 0.8, mTampo, 0, 0.76, 0, g);
      var dx = largura / 2 - 0.07;
      S.caixa(0.05, 0.74, 0.7, mPe, -dx, 0.37, 0, g);
      S.caixa(0.05, 0.74, 0.7, mPe, dx, 0.37, 0, g);
      S.caixa(largura - 0.15, 0.25, 0.02, mPe, 0, 0.55, -0.33, g, true);
      S.colisor(x, z, largura, 0.8);
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

    function criarPc(nome, x, z, ativo, largura) {
      var C = S.COR;
      var b = bancada(x, z, largura || 2.0, true);
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
        ancora: new THREE.Vector3(x - 0.2, 0, z + 0.85)
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
      var alvoBracoD = p.gestoAte && S.agora() < p.gestoAte ? -2.85 : S.personagem.rolo.visible ? -0.5 : bal * 0.8;
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

    S.criarProfessor = function () {
      gesto = null;
      tocaAqui = null;
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
      var aceno = 0;
      pr.cabeca.rotation.x = 0;
      pr.cabeca.rotation.z = 0;
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
        return hits.length ? hits[0].object.userData.info : null;
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
      var longe = S.jogo.distancia(info) > S.CFG.alcance;
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

    S.ui.atualizarControlesToque = function () {
      if (!ctrl) return;
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
        if (anterior >= 0) S.aviso('✔ Missão concluída! Próxima: ' + m.quadro, 'ok', 3200);
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

    J.distancia = function (info) {
      var p = S.personagem.raiz.position;
      var dx = info.ancora.x - p.x;
      var dz = info.ancora.z - p.z;
      return Math.sqrt(dx * dx + dz * dz);
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
        var d = J.distancia(info);
        if (d > S.CFG.alcance) continue;
        var nota = d + (alvos.indexOf(id) >= 0 ? 0 : 1.5) + (id === 'quadro' || id === 'cartaz' || id === 'professor' || id === 'cachola' ? 0.6 : 0);
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
      if (J.distancia(info) > S.CFG.alcance) {
        S.aviso('Chegue mais perto: ' + info.nome, 'info', 2000);
        return;
      }
      J.registrarAtividade();
      if (info.id === 'professor') return falarProfessor();
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
        if (S.ui.modalAberto() || S.fase !== 'jogo') {
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
      S.aviso('Siga o professor: clique na porta para ir ao Laboratório 2.', 'info', 4200);
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
      cortina.textContent = 'Indo para o Laboratório 2…';
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
          S.ui.mostrarFim(1);
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

    MG.mensagem = function (pai) {
      var el = S.el('div', {
        minHeight: '20px',
        marginTop: '10px',
        fontWeight: '700',
        fontSize: '14px'
      }, '', pai);
      return function (texto, tipo) {
        el.textContent = texto || '';
        el.style.color = tipo === 'erro' ? C.vermelho : tipo === 'ok' ? C.verde : C.amarelo;
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
        S.el('div', MG.fio(f, 20, compacta ? 44 : 60), null, col);
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

      // Etapa 1: cortar e descascar.
      var etapa1 = S.el('div', null, null, corpo);
      S.el('div', { fontSize: '15px', marginBottom: '12px' }, '1) Corte o cabo UTP da bobina e descasque a capa externa (uns 2 cm).', etapa1);
      var cabo = S.el('div', { display: 'flex', alignItems: 'center', margin: '18px 0' }, null, etapa1);
      S.el('div', { flex: '1', height: '22px', background: '#2D7FE0', border: '3px solid #071430', borderRadius: '6px 0 0 6px' }, null, cabo);
      S.el('div', { fontSize: '26px', margin: '0 8px' }, '✂', cabo);
      S.ui.botao('✂ Cortar e descascar', 'primario', function () {
        etapa1.remove();
        montarEtapa2();
      }, etapa1);

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
        var bCrimpar = S.ui.botao('Crimpar ✔', 'primario', crimpar, acoes);

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
            if (f) S.el('div', MG.fio(f, 26, altSlot - 8), null, s);
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
            S.el('div', MG.fio(f, 22, altFio), null, b);
            S.el('div', { fontSize: '10px', lineHeight: '1.1', textAlign: 'center' }, f.nome, b);
            b.addEventListener('click', S.protegido('crimp:fio', function () {
              var livre = slots.indexOf(null);
              if (livre < 0) return;
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
            if (!ok) erradas++;
          });
          tentativas++;
          if (erradas) {
            S.jogo.erros++;
            msg(erradas + ' fio(s) fora de ordem (marcados em vermelho). Tire e coloque de novo.', 'erro');
            if (tentativas >= 2) mostrarRef(false);
            return;
          }
          msg('Clique! Conector crimpado. A outra ponta foi feita igual (cabo direto).', 'ok');
          acoes.textContent = '';
          if (refBox) refBox.remove();
          S.ui.botao('Pegar o cabo ▶', 'primario', function () {
            m.fechar(true);
            aoConcluir();
          }, acoes);
        }

        desenhar();
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
        { nome: 'Rede (RJ45)', forma: { width: '30px', height: '26px', background: '#000', border: '3px solid #ccc', borderRadius: '2px' }, certa: true },
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
        var f = S.el('div', p.forma, null, b);
        f.style.boxSizing = 'border-box';
        S.el('div', null, p.nome, b);
        b.addEventListener('click', S.protegido('porta-pc', function () {
          if (p.certa) {
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
          ? { t: 'Resposta de ' + ip + ': bytes=32 tempo<1ms TTL=128', espera: 380 }
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
      S.el('div', { fontSize: '13px', fontWeight: '700', color: C.laranja, letterSpacing: '0.08em' }, 'LABORATÓRIO ' + numFase + ' CONCLUÍDO', t.cartao);
      S.el('div', { fontSize: '24px', fontWeight: '700', margin: '4px 0 14px' }, numFase === 2 ? 'Servidor no ar! 🎉' : 'A rede está funcionando! 🎉', t.cartao);

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
      var bRank = S.ui.botao('🏆 Ranking da turma · Fase ' + numFase, faseDef.proxima ? 'secundario' : 'primario', function () {
        S.ui.mostrarRanking(S.aluno.turma, sessao, numFase);
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
        }]
      ],
      atualizar: function (dt) { S.atualizarCachola(dt); },
      desmontar: function () {
        if (S.esconderBalaoProfessor) S.esconderBalaoProfessor();
        S.removerCachola();
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
      cachola: { nome: function () { return 'Cachola'; }, cor: '#39C46A', texto: '#071430' }
    };

    // Etiquetas de nome somem durante a cena (atrapalham os closes).
    function etiquetas(visiveis) {
      [S.personagem, S.professor, S.cachola && S.cachola()].forEach(function (c) {
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
        right: compacto ? '8px' : '14px',
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
      var t = est.tomadas[f.tomada];
      irPara(v3(t.pos), v3(t.alvo), i === 0 ? 0.6 : 1.1);
      var pr = S.professor || {};
      if (prof) {
        var dur = { aceno: 1.6, tocaAqui: Infinity, explicar: 3.2 }[f.gesto] || 2.6;
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
        fn();
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
      if (pulou && est.aoPular) est.aoPular();
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
      S.atualizarCena = atualizar;
      mostrarFala(0);
      return true;
    };

    S.emCena = function () { return !!est; };

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
          if (est.letras >= f2.texto.length) {
            est.completa = true;
            est.ui.seguir.style.visibility = 'visible';
          }
        }
      }
      S.atualizarMovimento(dt);
      if (est.etapa === 'dialogo') p.raiz.rotation.y = p.angulo;
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
      if (S.fase !== 'cena' || !est) return;
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

    F2.concluir = function () {
      J.encerrarFase('Site aberto pelo nome, com HTTPS!', function () {
        S.ui.mostrarFim(2);
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
    MG.keystone = function (t, aoConcluir) {
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
        S.el('div', {
          width: (ap ? 30 : 40) + 'px',
          height: '12px',
          background: f.listrado ? 'repeating-linear-gradient(90deg, #F4F4F4 0px, #F4F4F4 5px, ' + f.cor + ' 5px, ' + f.cor + ' 9px)' : f.cor,
          border: '2px solid #071430',
          borderRadius: '3px',
          boxSizing: 'border-box'
        }, null, l);
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
        S.el('div', MG.fio(f, 14, ap ? 22 : 26), null, b);
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
      var bEncaixar = S.ui.botao('Encaixar no espelho e ligar o patch cord do ' + t.pc + ' ▶', 'primario', encaixar, acoes);
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
        S.estilo(s.vaga, MG.fio(f, 0, 0));
        S.estilo(s.vaga, { width: '80%', height: ap ? '14px' : '18px', border: '2px solid #071430' });
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
        bBater.style.display = 'none';
        slots.forEach(function (s) {
          s.vaga.style.borderColor = '#F2C200';
        });
        msg('Tac! Fios presos e sobras cortadas. Agora encaixe a keystone no espelho da parede.', 'ok');
        bEncaixar.style.display = '';
      }

      function encaixar() {
        bEncaixar.style.display = 'none';
        msg('✔ Keystone encaixada no espelho e ' + t.pc + ' ligado com patch cord!', 'ok');
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
        sair: false,
        falas: function () {
          var n = S.primeiroNome();
          return [
            { quem: 'prof', tomada: 'despedida', gesto: 'aceno', texto: 'Parabéns, ' + n + '! O PC pegou IP pelo DHCP, achou o servidor pelo DNS e abriu o site com HTTPS.' },
            { quem: 'prof', tomada: 'despedida', gesto: 'falar', texto: 'Isso é uma rede de empresa de verdade. Você mandou muito bem!' }
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

    function sumir() {
      if (!c || c.estado === 'foi') return;
      if (c.estado !== 'andando') sairDaSala(null);
      c.caminho = [];
      c.raiz.position.set(-7, 0.07, 3);
      andar(0);
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

    // Coloca o aluno ao lado do gato, olhando para ele.
    function posicionarAluno() {
      var p = S.personagem;
      p.raiz.position.set(POS.x - 0.9, 0, POS.z - 0.25);
      p.angulo = Math.PI / 2;
      p.raiz.rotation.y = p.angulo;
    }

    var GATO = [POS.x, 0.35, POS.z];
    var TOMADAS = {
      gato: { pos: [POS.x - 0.75, 0.72, POS.z + 1.05], alvo: [POS.x, 0.3, POS.z] },
      alunoGato: { pos: [POS.x + 0.35, 1.4, POS.z - 1.3], alvo: [POS.x - 0.9, 1.25, POS.z - 0.25] },
      prof: { pos: [2.3, 2.35, 4.45], alvo: [5.1, 1.45, 3.2] }
    };

    function cenaApresentacao() {
      posicionarAluno();
      c.conversou = true;
      var fato = FATOS[Math.floor(Math.random() * FATOS.length)];
      S.cenaCurta({
        tomadas: TOMADAS,
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
        aoPular: sumir
      });
    }

    S.cachola = function () { return c; };
  });

})();

(function () {
  var ESPERADAS = ["B01-constantes","B02-utilitarios","U01-raiz-e-tema","U02-modal-e-avisos","U03-login","U04-comandos","U05-carregamento","U06-hud","D01-dados-ranking","D02-tela-ranking","W01-render-base","W02-sala","W03-bancadas-e-pcs","W04-rack-switch-roteador","W05-ferramentas-e-cabos","P01-personagem","P02-movimento-camera","P03-professor","E01-teclado-mouse","E02-controles-toque","J01-estado-e-missoes","J02-acoes","M01-minigames-base","M02-crimpagem","M03-portas","M04-configuracao-ip","F01-tela-final","L01-carregamento","L02-laco-e-qualidade","L03-inicio","C01-cena-abertura","F2A-sala-servidor","F2B-estado-e-missoes","F2C-acoes","F2D-keystone","F2E-gerenciador-servidor","F2F-pcs-dhcp-navegador","F2G-registro-da-fase","K01-cachola"];
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
