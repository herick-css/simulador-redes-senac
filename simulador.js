/* Simulador de Redes · Laboratório Senac — código do jogo (carregado pelo Canva via jsDelivr) */
(function () {
  'use strict';

  var S = window.__SIM = {
    marcas: [],
    erros: [],
    versao: '1.3.0',
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

    S.tempoDeJogo = function () {
      if (S.tempoInicio === null) return 0;
      var fim = S.tempoFinal !== null ? S.tempoFinal : S.agora();
      return (fim - S.tempoInicio) / 1000;
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
        S.ui.mostrarComandos(true);
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
        'versão ' + S.versao + (window.__SIM_CARREGADOR ? ' · carregador ' + window.__SIM_CARREGADOR : ''), t.cartao);
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
      S.el('div', null, ap
        ? 'Ligue os PCs, crimpe cabos T-568B, conecte switch e roteador e configure IPs fixos. Siga o quadro de missões.'
        : 'Monte a rede do laboratório: ligue os PCs, crimpe cabos no padrão T-568B, conecte tudo no switch e no roteador e configure IPs fixos. O quadro mostra as etapas e vai riscando o que você concluir.', obj);
      if (!ap) S.el('div', { color: C.cinza, marginTop: '6px', fontSize: '13px' }, 'O tempo conta para o ranking. Se travar numa etapa, aparece uma dica e uma seta laranja.', obj);

      var rodape = S.el('div', { display: 'flex', gap: '10px', marginTop: ap ? '10px' : '16px', flexWrap: 'wrap' }, null, t.cartao);
      if (inicio) {
        var bVoltar = S.ui.botao('Voltar', 'secundario', function () {
          t.fechar();
          S.ui.mostrarLogin();
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
        var bCheia = S.ui.botao('⛶', 'secundario', S.alternarTelaCheia, hud.direita);
        S.estilo(bCheia, { padding: '6px 12px', fontSize: '16px' });
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
        background: 'rgba(7, 20, 48, 0.94)',
        border: '3px solid ' + C.laranja,
        borderRadius: '8px',
        padding: '7px 14px',
        fontSize: '14px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100% - 320px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }, '', hud.camada);
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

    D.daTurma = function (turma) {
      return D.registros.filter(function (r) {
        if (!r || !isFinite(Number(r.tempo))) return false;
        return !turma || String(r.turma || '').toUpperCase() === turma;
      }).sort(function (a, b) {
        return Number(a.tempo) - Number(b.tempo);
      });
    };
  });

  /* ================================================================== */
  secao('D02-tela-ranking', function () {
    var C = S.CSS;

    S.ui.mostrarRanking = function (turmaInicial, sessaoDestaque) {
      var t = S.ui.tela(40, '620px');
      var turma = (turmaInicial || '').toUpperCase();

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
        var regs = D.daTurma(turma);
        status.textContent = (D.erroLeitura ? D.erroLeitura + ' ' : '') +
          (D.offline ? 'Modo offline: fora do Canva o ranking não é compartilhado. ' : '') +
          regs.length + ' resultado(s)' + (turma ? ' na turma ' + turma : '') + '.';
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
      (pai || S.cena).add(m);
      return m;
    };

    S.cilindro = function (rt, rb, a, seg, material, x, y, z, pai) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, a, seg || 6), material);
      m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true;
      (pai || S.cena).add(m);
      return m;
    };

    S.grupo = function (x, y, z, pai) {
      var g = new THREE.Group();
      g.position.set(x || 0, y || 0, z || 0);
      (pai || S.cena).add(g);
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
    S.mundo.montarSala = function () {
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
      S.cena.add(piso);

      var mParede = S.mat(C.parede);
      var mFaixa = S.mat(C.azul);
      var mListra = S.mat(C.laranja);
      var e = 0.12;
      S.caixa(L + e * 2, A, e, mParede, 0, A / 2, -P / 2 - e / 2);
      S.caixa(e, A, P, mParede, -L / 2 - e / 2, A / 2, 0);
      S.caixa(e, A, P, mParede, L / 2 + e / 2, A / 2, 0);
      S.caixa(L + e * 2, 0.4, e, mParede, 0, 0.2, P / 2 + e / 2);
      // Faixa azul + listra laranja (identidade Senac).
      S.caixa(L, 0.95, 0.02, mFaixa, 0, 0.475, -P / 2 + 0.011, null, true);
      S.caixa(0.02, 0.95, P, mFaixa, -L / 2 + 0.011, 0.475, 0, null, true);
      S.caixa(0.02, 0.95, P, mFaixa, L / 2 - 0.011, 0.475, 0, null, true);
      S.caixa(L, 0.07, 0.03, mListra, 0, 0.98, -P / 2 + 0.015, null, true);
      S.caixa(0.03, 0.07, P, mListra, -L / 2 + 0.015, 0.98, 0, null, true);
      S.caixa(0.03, 0.07, P, mListra, L / 2 - 0.015, 0.98, 0, null, true);

      // Porta (parede esquerda) e janelas (direita).
      S.caixa(0.06, 2.1, 1.05, S.mat(C.madeiraEscura), -L / 2 + 0.04, 1.05, 3.0);
      S.caixa(0.08, 0.06, 0.18, S.mat(C.metal), -L / 2 + 0.09, 1.0, 2.65, null, true);
      var mVidro = S.mat(0xa9d6f5, { emissive: 0x4f86b5, emissiveIntensity: 0.35 });
      var mCaixilho = S.mat(C.metalEscuro);
      for (var j = 0; j < 3; j++) {
        var zj = -2.8 + j * 2.6;
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
      S.caixa(1.66, 1.06, 0.05, S.mat(C.azulEscuro), 2.3, 2.05, -P / 2 + 0.03, null, true);
      var placa = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshLambertMaterial({ map: texPlaca }));
      placa.position.set(2.3, 2.05, -P / 2 + 0.06);
      S.cena.add(placa);
      var texNome = S.textura(128, 16, function (ctx, w, h) {
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LABORATÓRIO DE REDES', w / 2, 12);
      });
      var nomeLab = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshLambertMaterial({ map: texNome }));
      nomeLab.position.set(2.3, 1.38, -P / 2 + 0.06);
      S.cena.add(nomeLab);

      // Quadro branco: lista de missões que vai sendo riscada.
      S.mundo.texQuadro = S.textura(256, 128, null);
      S.caixa(3.1, 1.62, 0.05, S.mat(C.metal), -1.7, 1.75, -P / 2 + 0.03, null, true);
      var quadro = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.52), new THREE.MeshLambertMaterial({ map: S.mundo.texQuadro }));
      quadro.position.set(-1.7, 1.75, -P / 2 + 0.06);
      S.cena.add(quadro);
      S.caixa(1.0, 0.04, 0.08, S.mat(C.metal), -1.7, 0.95, -P / 2 + 0.07, null, true);
      S.interativo(quadro, {
        id: 'quadro',
        nome: 'Quadro de missões',
        ancora: new THREE.Vector3(-1.7, 0, -3.7)
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
        var dy = 9.4;
        ctx.font = '8px Arial';
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
        ctx.fillText('IP: ' + (e.ip || '—'), 4, 33);
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

    function criarPc(nome, x, z, ativo) {
      var C = S.COR;
      var b = bancada(x, z, 2.0, true);
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

      // Cartaz T-568B em pé na bancada.
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
      S.cena.add(tubo);
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
      S.cena.add(linha);
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
      S.cena.add(seta);
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

    function texturaNome(nome) {
      return S.textura(128, 20, function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        var txt = nome.length > 16 ? nome.slice(0, 15) + '…' : nome;
        var larg = Math.min(w - 2, ctx.measureText(txt).width + 10);
        ctx.fillStyle = 'rgba(7,20,48,0.85)';
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
      var alvoBracoD = S.personagem.rolo.visible ? -0.5 : bal * 0.8;
      p.bracoD.rotation.x += (alvoBracoD - p.bracoD.rotation.x) * k;
      p.corpo.position.y = p.andando ? Math.abs(Math.sin(p.fase)) * 0.05 : Math.sin(S.agora() / 600) * 0.008;
    };

    S.atualizarCamera = function (dt, imediato) {
      if (!desejada) {
        desejada = new THREE.Vector3();
        alvo = new THREE.Vector3();
      }
      var pos = S.personagem.raiz.position;
      var c = S.CFG.camera;
      var aspecto = S.camera.aspect;
      var afast = aspecto < 1.5 ? 1.15 : 1;
      var cx = Math.max(-2.4, Math.min(2.4, pos.x * 0.85)) + c.x;
      desejada.set(cx, c.y * afast, pos.z + c.z * afast);
      if (imediato) S.camera.position.copy(desejada);
      else S.camera.position.lerp(desejada, 1 - Math.exp(-dt * 5));
      alvo.set(cx, 0.9, pos.z - 0.7);
      S.camera.lookAt(alvo);
    };
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
      if (digitando(e)) return;
      if (BLOQUEAR.indexOf(k) >= 0) e.preventDefault();
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

    S.ligarEntradaCena = function () {
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

    J.MISSOES = [
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
        dica2: 'Procure o botão ⏻ no painel do roteador.'
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
        S.ui.definirMissao(J.MISSOES.length, J.MISSOES.length, 'Todas as missões concluídas! Testando a rede…');
        if (!J.concluido) J.concluirLaboratorio();
        return;
      }
      var m = J.MISSOES[novo];
      S.ui.definirMissao(novo + 1, J.MISSOES.length, m.texto);
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
        var nota = d + (alvos.indexOf(id) >= 0 ? 0 : 1.5) + (id === 'quadro' || id === 'cartaz' ? 0.6 : 0);
        if (nota < melhorNota) {
          melhorNota = nota;
          melhor = info;
        }
      }
      return melhor;
    };

    J.rotulo = function (info) {
      var mao = J.mao;
      switch (info.id) {
        case 'quadro': return 'Ver missões';
        case 'cartaz': return 'Ver cartaz T-568B';
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
      if (info.id === 'quadro') return S.minigames.quadro();
      if (info.id === 'cartaz') return S.minigames.cartaz();
      if (info.id === 'alicate') return usarAlicate();
      if (info.id === 'switch') return usarSwitch();
      if (info.id === 'roteador') return usarRoteador();
      if (info.pc) return usarPc(info.pc);
    });

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
        S.minigames.desktop(pc, function () {
          J.atualizarMissoes();
        });
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

    J.concluirLaboratorio = function () {
      J.concluido = true;
      S.tempoFinal = S.agora();
      S.ui.definirDica(null);
      S.mundo.apontar(null);
      // Teste final: um PC "pinga" o outro.
      var a = S.pcs['PC-01'].estado;
      var b = S.pcs['PC-02'].estado;
      a.ping = b.ip;
      b.ping = a.ip;
      S.mundo.desenharTela(S.pcs['PC-01']);
      S.mundo.desenharTela(S.pcs['PC-02']);
      S.aviso('ping ' + b.ip + ' → resposta OK! A rede funciona.', 'ok', 3000);
      setTimeout(S.protegido('fim', function () { S.ui.mostrarFim(); }), 2200);
    };
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
        }, (feita ? '✔ ' : atual ? '▶ ' : '□ ') + (i + 1) + '. ' + mi.texto, m.corpo);
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

    // Frente do gabinete: o aluno precisa achar o botão de ligar (⏻).
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
      function botaoRedondo(simbolo, tamanho, aria, aoClicar) {
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
          lineHeight: '1'
        }, simbolo, linhaBotoes);
        b.type = 'button';
        b.setAttribute('aria-label', aria);
        b.addEventListener('click', S.protegido('gabinete:' + aria, function () {
          if (!ligando) aoClicar(b);
        }));
        return b;
      }
      // Ordem embaralhada: o aluno precisa reconhecer o símbolo ⏻.
      var botoes = [
        ['⏻', ap ? 42 : 50, 'Botão de energia', function (b) {
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
        ['↺', ap ? 26 : 30, 'Botão de reset', function (b) {
          S.jogo.erros++;
          b.style.borderColor = '#D63A33';
          msg('✖ Esse é o Reset: ele reinicia um PC que já está ligado. Procure o botão ⏻.', 'erro');
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
      dica.textContent = 'O botão de ligar costuma ser o maior da frente do gabinete e tem o símbolo ⏻ (um círculo com um traço). O LED acende quando o PC liga.';
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
          touchAction: 'manipulation'
        }, nome === 'energia' ? '⏻' : (J.portaRoteador === nome ? '●' : ''), col);
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

    MG.desktop = function (pc, aoConcluir) {
      var m = S.ui.abrirModal(pc.nome + ' · área de trabalho', { largura: '720px' });
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
      var msg = MG.mensagem(m.corpo);
      var janela = null;

      [
        { n: 'Navegador', s: '🌐', t: 'Sem configurar a rede, a internet não abre.' },
        { n: 'Arquivos', s: '📁', t: 'Nada importante aqui.' },
        { n: 'Configurações de Rede', s: '⚙', abre: true },
        { n: 'Terminal', s: '⌨', t: 'Depois de configurar, o ping será testado automaticamente.' },
        { n: 'Lixeira', s: '🗑', t: 'A lixeira está vazia.' }
      ].forEach(function (ic) {
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
          if (ic.abre) abrirRede();
          else msg(ic.t, 'info');
        }));
      });

      function abrirRede() {
        if (janela) return;
        msg('');
        var e = pc.estado;
        janela = S.el('div', {
          background: '#F2F5F9',
          color: '#10203A',
          border: '3px solid #071430',
          borderRadius: '8px',
          marginTop: '12px',
          padding: '12px 14px'
        }, null, tela);
        S.el('div', { fontWeight: '700', marginBottom: '8px', color: '#0B4F9C' }, '⚙ Configurações de Rede · Ethernet (' + (e.portaSwitch || 'sem cabo') + ')', janela);
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

        // Campo de IP em 4 caixas com os pontos já escritos: funciona com o
        // teclado numérico do celular (no iPhone ele não tem ponto).
        function campoIp(rotulo, valor) {
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
                salvar();
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
        }
        var fIp = campoIp('Endereço IP', e.ip);
        var fMasc = campoIp('Máscara de sub-rede', e.mascara);
        var fGw = campoIp('Gateway padrão', e.gateway);

        function atualizarCampos() {
          [fIp, fMasc, fGw].forEach(function (f) { f.habilitar(modoManual); });
        }
        atualizarCampos();

        var acoes = S.el('div', { display: 'flex', gap: '8px', marginTop: '12px' }, null, janela);
        S.ui.botao('Salvar', 'primario', salvar, acoes);
        S.ui.botao('Cancelar', 'claro', function () {
          janela.remove();
          janela = null;
        }, acoes);

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
            aoConcluir();
          }, 1100);
        }
        if (!S.toque) setTimeout(function () { if (modoManual) fIp.focar(); else opcoes.querySelector('input').focus(); }, 30);
      }
    };
  });

  /* ================================================================== */
  secao('F01-tela-final', function () {
    var C = S.CSS;

    S.ui.mostrarFim = function () {
      S.fase = 'fim';
      S.pausado = true;
      S.ui.atualizarControlesToque();
      var J = S.jogo;
      var tempo = Math.round(S.tempoDeJogo() * 10) / 10;
      var sessao = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      var t = S.ui.tela(30, '520px');
      S.el('div', { fontSize: '13px', fontWeight: '700', color: C.laranja, letterSpacing: '0.08em' }, 'LABORATÓRIO CONCLUÍDO', t.cartao);
      S.el('div', { fontSize: '24px', fontWeight: '700', margin: '4px 0 14px' }, 'A rede está funcionando! 🎉', t.cartao);

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
      resumo.textContent = 'PC-01: ' + S.pcs['PC-01'].estado.ip + ' (' + S.pcs['PC-01'].estado.portaSwitch + ') · PC-02: ' +
        S.pcs['PC-02'].estado.ip + ' (' + S.pcs['PC-02'].estado.portaSwitch + ') · Uplink ' + J.portaUplink + ' → ' + J.portaRoteador +
        ' · Gateway 192.168.0.1';

      var status = S.el('div', { fontSize: '14px', fontWeight: '700', minHeight: '20px', marginBottom: '12px' }, 'Salvando no ranking…', t.cartao);
      var botoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, t.cartao);
      var bRank = S.ui.botao('🏆 Ver ranking da turma', 'primario', function () {
        S.ui.mostrarRanking(S.aluno.turma, sessao);
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
        versao: S.versao
      };
      S.ultimoRegistro = registro;

      function posicao() {
        var regs = S.dados.daTurma(S.aluno.turma);
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
                ? '✔ Resultado salvo! Você ficou em ' + p.pos + 'º de ' + p.total + ' na turma ' + S.aluno.turma + '.'
                : '✔ Resultado salvo no ranking da turma ' + S.aluno.turma + '.';
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

    S.iniciarCarregamento = function () {
      S.fase = 'carregando';
      var tela = S.ui.mostrarCarregamento();
      if (typeof THREE === 'undefined') {
        tela.progresso(0, 'Não foi possível carregar o motor 3D (Three.js). Verifique a internet e recarregue a página.');
        registrarErro('carregamento', new Error('THREE indisponível'));
        return;
      }
      var etapas = [
        ['Ligando o motor 3D…', S.montarRenderer],
        ['Construindo a sala…', S.mundo.montarSala],
        ['Montando as bancadas e os PCs…', S.mundo.montarBancadas],
        ['Instalando o rack, o switch e o roteador…', S.mundo.montarRack],
        ['Separando as ferramentas…', S.mundo.montarFerramentas],
        ['Chamando o aluno…', function () {
          S.criarPersonagem(S.aluno.nome, S.aluno.genero);
          S.mundo.montarCaboMao();
          S.mundo.montarSeta();
        }],
        ['Preparando os gráficos…', function () {
          S.ligarEntradaCena();
          S.atualizarCamera(0, true);
          // Compila todos os shaders agora, para o jogo não engasgar depois.
          S.renderer.compile(S.cena, S.camera);
          S.renderer.render(S.cena, S.camera);
        }]
      ];
      var cadeia = Promise.resolve();
      etapas.forEach(function (et, i) {
        cadeia = cadeia.then(function () {
          tela.progresso(i / etapas.length, et[0]);
          return passo(et[1]);
        });
      });
      cadeia.then(function () {
        tela.progresso(1, 'Pronto!');
        setTimeout(function () {
          tela.fechar();
          S.comecarJogo();
        }, 200);
      });
    };

    S.comecarJogo = S.protegido('comecarJogo', function () {
      S.ui.criarHud();
      if (S.toque) S.ui.criarControlesToque();
      S.fase = 'jogo';
      S.pausado = false;
      S.tempoInicio = S.agora();
      S.jogo.progressoEm = S.agora();
      S.jogo.atualizarMissoes();
      S.ui.atualizarControlesToque();
      S.raiz.focus({ preventScroll: true });
      S.aviso('Boa sorte, ' + S.aluno.nome.split(' ')[0] + '! Siga as missões do quadro.', 'info', 3200);
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
      if (S.fase !== 'jogo' && S.fase !== 'fim') return;
      if (!relogio) relogio = new THREE.Clock();
      var dt = Math.min(relogio.getDelta(), 0.05);
      var agora = S.agora();
      try {
        S.ui.atualizarHud();
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

})();

(function () {
  var ESPERADAS = ["B01-constantes","B02-utilitarios","U01-raiz-e-tema","U02-modal-e-avisos","U03-login","U04-comandos","U05-carregamento","U06-hud","D01-dados-ranking","D02-tela-ranking","W01-render-base","W02-sala","W03-bancadas-e-pcs","W04-rack-switch-roteador","W05-ferramentas-e-cabos","P01-personagem","P02-movimento-camera","E01-teclado-mouse","E02-controles-toque","J01-estado-e-missoes","J02-acoes","M01-minigames-base","M02-crimpagem","M03-portas","M04-configuracao-ip","F01-tela-final","L01-carregamento","L02-laco-e-qualidade","L03-inicio"];
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
    linha('Versão do jogo: ' + (S.versao || '?') + ' · carregador: ' + (window.__SIM_CARREGADOR || '?'));
    var d = S.desempenho;
    if (d && S.fase === 'jogo') {
      var cor = d.media >= 50 ? '#6BF08E' : d.media >= 28 ? '#FFD36B' : '#FF7676';
      linha('FPS agora: ' + d.fps.toFixed(0) + ' · média 3 s: ' + d.media.toFixed(1), cor);
      linha('FPS mínimo 3 s: ' + d.minimo.toFixed(0) + ' (pior quadro ' + d.piorQuadroMs.toFixed(0) + ' ms)', d.piorQuadroMs > 50 ? '#FF7676' : '#FFFFFF');
      linha('Draw calls: ' + d.drawCalls + ' · triângulos: ' + d.triangulos.toLocaleString('pt-BR'));
      linha('Resolução 3D: ' + d.resolucao + ' · sombras: ' + (d.sombras ? 'sim' : 'não') + ' · escala ' + d.escala);
      linha('GPU: ' + obterGpu());
    } else if (S.fase === 'jogo') {
      linha('Medindo… (o 3D fica parado com janelas abertas)', '#AFC2D8');
    } else {
      linha('O desempenho aparece quando o laboratório estiver rodando.', '#AFC2D8');
    }
    linha('Seções: ' + (ESPERADAS.length - faltando.length) + '/' + ESPERADAS.length + (faltando.length ? ' · faltando: ' + faltando.join(', ') : ''), faltando.length ? '#FF7676' : '#6BF08E');
    linha('Erros: ' + (erros.length || 'nenhum'), erros.length ? '#FF7676' : '#6BF08E');
    erros.slice(-6).forEach(function (e) { linha('• ' + e, '#FF7676'); });
    linha('Ranking: ' + (S.dados ? (S.dados.offline ? 'offline (fora do Canva)' : 'Canva Sheets') : '?'));
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
