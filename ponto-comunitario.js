/* Ponto de Internet Comunitário · Residencial Ataliba — gerado por build.js, não edite à mão */
(function () {
  'use strict';

  /* ---- 00-base.js ---- */
  /* Ponto de Internet Comunitário · Residencial Ataliba — simulação 3D (Three.js, visual PS1/PS2) */

  var S = window.__PONTO = {
    versao: '0.1.0',
    marcas: [],
    erros: [],
    fase: 'inicio', // inicio → comandos → carregando → cena → jogo → fim
    pausado: true,
    teclas: {},
    joy: { x: 0, z: 0 },
    toque: false,
    aluno: { nome: '', genero: 'm' }
  };

  function registrarErro(origem, e) {
    var msg = (e && e.message) ? e.message : String(e);
    S.erros.push(origem + ': ' + msg);
    if (window.console && console.error) console.error('[PONTO]', origem, e);
    if (S.mostrarFalha) S.mostrarFalha();
  }
  S.registrarErro = registrarErro;

  // Cada seção registra a marca antes de rodar: a marca prova que o código chegou
  // inteiro ao navegador; um erro dentro dela é problema de execução (painel F9).
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
    // Logo Senac em pixels (paleta + run-length): o Canva bloqueia imagens "data:".
    S.LOGO_DADOS = {"w":96,"h":57,"p":[[0,0,0,0],[81,137,186,163],[10,86,157,255],[102,152,196,156],[110,157,198,105],[76,133,184,255],[142,178,208,82],[247,175,102,255],[240,138,31,255],[180,205,221,41]],"d":"0X11210131410Z0t11270Z0r2b11410Z0k512f31610Z0f612j51410Z0d310646035126410Z0u61022201410Z0x110Z0g728773084101910Z068n710Z039103718u710Z028z710V728C720P758u710X758p720Z04748m7103910Z04738k0Z0e718h710Z0g8g710Z0i718d710Z0k728b0Z0m73880Z0o7485710Z0p75830Z0q780Z0r750Z0u740Z0v730Z0w720Z0x710Z0Z0Z0Z0761311231610Z0p611128110Z0e916141324103312a110Z0c41112602112b110Z0a412901412c110c410125114191099141112511410f2301316108312a012731416201320a312b4107312a51610b61273106512a516126610f91512d3105112d0b612961031129314201260h2f1103112f41096129519101412841044126610e3127032702412h91086151294101275191062711610b612611053126022641033126110c31265131270811291131081125110711250126410531260d11265126410a2d0141032608912551250826610795012d0a91512e310191261107112b1107260361112l510c61512d11012q082602312n0f9101312b512q082631112p0j41112y08265126024163412d610l312c0e1125082c1107265126510b910b2b310d1125082c079126312731081122410951250126310c1125082c610611264111275191051125314104914126013127014261071125082d61041127410129114102112a0228022a3107112508260128012a41022b522j41032931071125082641112i410291512a01412h4105112731075125082602312902264104112903412d3161076111253107310123014107312401410261112511410211012301610611270541315101245131410e63910U4131115201"};

    S.COR = {
      azul: 0x0b4f9c,
      azulEscuro: 0x08326a,
      laranja: 0xf7941d,
      ceu: 0xb9cad9,
      grama: 0x6a9a45,
      asfalto: 0x55585c,
      calcada: 0xbdb8ad,
      concreto: 0xcbc7bd,
      terra: 0xc47a43,
      telha: 0x8f9498,
      metal: 0x9aa4b0,
      metalEscuro: 0x2a3038,
      plastico: 0x1f2329,
      plasticoClaro: 0xd9dee4,
      madeira: 0xa87a4f,
      madeiraEscura: 0x6b4a2e,
      folha: 0x3f7d33,
      folhaEscura: 0x2b5a26,
      tronco: 0x7a5a3c,
      central: 0x8fd6c4,
      centralEscuro: 0x5fae9d,
      abrigo: 0x9d95d8,
      banco: 0xdca582,
      ledVerde: 0x39ff6a,
      ledAmbar: 0xffb020,
      ledVermelho: 0xff3b30,
      ledApagado: 0x1d2a1f,
      caboAzul: 0x2d7fe0,
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

    S.CFG = {
      velocidade: 4.2, // m/s na rua
      velocidadeDentro: 2.7, // m/s dentro de casa e da central
      raio: 0.3,
      alcance: 2.0,
      alturaRender: 360, // resolução interna baixa = visual de PS1 e leveza
      alturaRenderToque: 300,
      dica1: 45, // segundos na mesma missão até a primeira dica + seta laranja
      dica2: 120
    };

    // Planta do bairro (metros). x cresce para o leste, z para o sul.
    S.MAPA = {
      ruas: [
        { nome: 'Estr. do Monte Cristo', x0: -34, x1: 48, z0: -31, z1: -25 },
        { nome: 'Rua A', x0: -34, x1: 48, z0: -3, z1: 3 },
        { nome: 'Rua Principal', x0: -34, x1: 48, z0: 25, z1: 31 },
        { nome: 'Rua B', x0: -34, x1: -28, z0: -31, z1: 31 },
        { nome: 'Rua C', x0: -3, x1: 3, z0: -31, z1: 31 },
        { nome: 'Rua D', x0: 28, x1: 34, z0: -31, z1: 31 }
      ],
      condominios: [
        { id: 1, nome: 'Condomínio 1', blocos: [19, 20], x0: -28, x1: -3, z0: 3, z1: 25, acessivel: true, portaoLado: 'leste' },
        { id: 2, nome: 'Condomínio 2', blocos: [21, 22], x0: 3, x1: 28, z0: 3, z1: 25 },
        { id: 3, nome: 'Condomínio 3', blocos: [15, 16], x0: -28, x1: -3, z0: -25, z1: -3 },
        { id: 4, nome: 'Condomínio 4', blocos: [17, 18], x0: 3, x1: 28, z0: -25, z1: -3 }
      ],
      ponto: { x0: 34, x1: 48, z0: 3, z1: 25 },
      terreno: { x0: 34, x1: 48, z0: -25, z1: -3 },
      escolaX: 48,
      limites: { x0: -33.6, x1: 47.6, z0: -30.6, z1: 30.6 }
    };

    // Ponto de Internet Comunitário (terreno ao lado da escola, entre a Rua A e a Rua Principal).
    S.PONTO = {
      laje: { x0: 35, x1: 47.3, z0: 8.2, z1: 15.6, y: 0.08 },
      // Abrigo: banco encostado no painel, mesa na frente, tomadas de rede nas pontas do banco.
      banco: { x0: 38.4, x1: 40.4, z: 10.22 },
      mesa: { x0: 38.3, x1: 40.5, z0: 10.8, z1: 11.4, alt: 0.74 },
      keystones: [
        { id: 'keystoneE', x: 38.05, z: 10.22, lado: 'esquerdo', sentarX: 38.85 },
        { id: 'keystoneD', x: 40.75, z: 10.22, lado: 'direito', sentarX: 39.95 }
      ],
      central: { x0: 43.0, x1: 46.6, z0: 9.0, z1: 12.8, porta0: 45.2, porta1: 46.2, alt: 2.5 },
      poste: { x: 42.15, z: 13.6 },
      arvore: { x: 36.2, z: 10.2 },
      chegada: { x0: 34.2, x1: 47.6, z0: 3.2, z1: 24.8 }
    };

    // Apartamento do aluno: Condomínio 1, Bloco 19 (térreo), porta virada para o pátio.
    S.CASA = { bloco: 19, apto: 3, porta: { x: -12.6, z: 10.0 }, saida: { x: -12.6, z: 10.95 } };

    // O apartamento por dentro fica longe do bairro (só uma das áreas aparece por vez).
    S.APTO = { ox: 300, oz: 0, largura: 6.4, profundidade: 5, altura: 2.7 };

    // A central por dentro também é uma área separada (maior que a casinha vista de fora).
    S.CENTRAL = { ox: 600, oz: 0, largura: 7.6, profundidade: 5.8, altura: 2.9 };
  });

  /* ================================================================== */
  secao('B02-utilitarios', function () {
    S.estilo = function (el, estilos) {
      for (var k in estilos) {
        if (Object.prototype.hasOwnProperty.call(estilos, k)) el.style[k] = estilos[k];
      }
      return el;
    };

    // Elementos sempre via JS e com estilo inline (o Canva não interfere).
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

    S.hashTexto = function (txt) {
      var h = 0x811c9dc5;
      for (var i = 0; i < txt.length; i++) {
        h ^= txt.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return h;
    };

    // Números "aleatórios" repetíveis: o bairro sai igual toda vez.
    S.rng = function (semente) {
      var a = semente >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
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

    S.agora = function () {
      return performance.now();
    };

    S.difAngulo = function (a, b) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    };

    S.suave = function (t) {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    };

    S.dentro = function (r, x, z) {
      return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
    };

    S.ehToque = function () {
      try {
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      } catch (e) { /* ignora */ }
      return (navigator.maxTouchPoints || 0) > 0 && !(window.matchMedia && window.matchMedia('(hover: hover)').matches);
    };

    S.horaAgora = function () {
      var d = new Date();
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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

    S.primeiroNome = function () {
      var n = ((S.aluno && S.aluno.nome) || 'Aluno').trim().split(/\s+/)[0];
      return n.charAt(0).toUpperCase() + n.slice(1);
    };

    // Ícones em SVG (não dependem das fontes do aparelho).
    var ICONES = {
      telaCheia: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5'],
      mapa: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14', 'M15 6v14'],
      energia: ['M12 3v8', 'M6.6 6.6a7.6 7.6 0 1 0 10.8 0'],
      seta: ['M12 3l7 16-7-4-7 4z']
    };
    S.icone = function (nome, tamanho, espessura) {
      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', String(tamanho));
      svg.setAttribute('height', String(tamanho));
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', String(espessura || 2.4));
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


  /* ---- 10-ui.js ---- */

  /* ================================================================== */
  secao('U01-raiz-e-tema', function () {
    var C = S.CSS;
    var raiz = document.createElement('div');
    raiz.id = 'ponto-root';
    raiz.setAttribute('tabindex', '0');
    S.estilo(raiz, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
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
    document.body.style.margin = '0';

    // O Canva pode deixar o iframe mais alto que a tela (celular deitado).
    // Faixas invisíveis + IntersectionObserver mostram a parte visível, e o jogo se encaixa nela.
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
    S.ui.compacto = function () {
      return S.raiz.clientHeight < 520;
    };
    S.ui.telaApertada = function () {
      return S.raiz.clientHeight < 520 || S.raiz.clientWidth < 560;
    };

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
        claro: { fundo: '#E9EEF5', texto: '#10203A', sombra: '#8D9BB0' },
        verde: { fundo: '#2FA35A', texto: C.branco, sombra: '#1B6436' }
      }[tipo || 'primario'];
      var b = S.el('button', {
        background: cores.fundo,
        color: cores.texto,
        border: '3px solid #071430',
        borderRadius: '6px',
        boxShadow: '0 4px 0 ' + cores.sombra,
        padding: S.ui.compacto() ? '7px 12px' : '10px 18px',
        fontFamily: C.fonte,
        fontWeight: '700',
        fontSize: S.ui.compacto() ? '14px' : '15px',
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
        fontSize: '16px',
        fontFamily: C.fonte,
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
      input.addEventListener('focus', function () { input.style.borderColor = C.laranja; });
      input.addEventListener('blur', function () { input.style.borderColor = C.borda; });
      return { wrap: wrap, input: input };
    };

    // Tela cheia com cartão central rolável (início, comandos, final).
    S.ui.tela = function (z, larguraMax) {
      var fundo = S.ui.camada(z || 30, {
        background: 'radial-gradient(ellipse at 50% 0%, #163E78 0%, #0A1A33 65%)',
        overflowY: 'auto',
        touchAction: 'pan-y',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: S.ui.telaApertada() ? '6px' : '18px',
        boxSizing: 'border-box'
      });
      var cartao = S.ui.cartao(fundo, {
        width: '100%',
        maxWidth: larguraMax || '460px',
        margin: 'auto 0',
        padding: S.ui.telaApertada() ? '12px 14px' : '22px 24px'
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

    // Cortina preta para trocar de lugar (sair de casa, entrar na central…).
    // carregando = true mostra uma tela de carregamento com barra.
    S.ui.cortina = function (texto, carregando, noMeio, depois) {
      var c = S.ui.camada(45, {
        background: carregando ? 'radial-gradient(ellipse at 50% 0%, #163E78 0%, #0A1A33 65%)' : '#000',
        opacity: '0',
        transition: 'opacity .3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: '17px',
        pointerEvents: 'auto'
      });
      S.el('div', null, texto || '', c);
      var cheio = null;
      if (carregando) {
        var barra = S.el('div', { width: 'min(320px, 70%)', height: '16px', background: '#071733', border: '3px solid ' + C.borda, borderRadius: '4px', overflow: 'hidden' }, null, c);
        cheio = S.el('div', { height: '100%', width: '0%', background: C.laranja, transition: 'width .9s ease' }, null, barra);
      }
      setTimeout(function () {
        c.style.opacity = '1';
        if (cheio) cheio.style.width = '100%';
      }, 20);
      setTimeout(S.protegido('cortina', function () {
        if (noMeio) noMeio();
        setTimeout(function () {
          c.style.opacity = '0';
          setTimeout(function () {
            c.remove();
            if (depois) S.protegido('cortina:depois', depois)();
          }, 330);
        }, carregando ? 700 : 250);
      }), carregando ? 450 : 350);
    };
  });

  /* ================================================================== */
  secao('U02-modal-e-avisos', function () {
    var C = S.CSS;
    var modalAtual = null;

    // Janela 2D por cima do 3D. Enquanto aberta o 3D para de renderizar.
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

    // Avisos rápidos.
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
      camadaAviso.style.maxWidth = baixo && S.toque ? 'calc(100% - 300px)' : 'min(560px, calc(100% - 24px))';
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

    // Aviso para girar o celular (telas de toque na vertical).
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
          animation: 'ponto-girar 1.6s ease-in-out infinite'
        }, null, guarda);
        cel.setAttribute('aria-hidden', 'true');
        S.el('div', { fontSize: '20px', fontWeight: '700' }, 'Gire o celular', guarda);
        S.el('div', { fontSize: '15px', color: C.cinza, maxWidth: '280px' }, 'A simulação funciona com o celular na horizontal (paisagem).', guarda);
      } else if (!retrato && guarda) {
        guarda.remove();
        guarda = null;
      }
    };
    var estiloAnim = document.createElement('style');
    estiloAnim.textContent = '@keyframes ponto-girar{0%,20%{transform:rotate(0)}50%,70%{transform:rotate(-90deg)}100%{transform:rotate(0)}}' +
      '@keyframes ponto-pulsar{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}' +
      '@keyframes ponto-piscar{0%,100%{opacity:1}50%{opacity:.35}}';
    document.head.appendChild(estiloAnim);

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
  secao('U03-inicio', function () {
    var C = S.CSS;

    S.ui.mostrarInicio = function () {
      S.fase = 'inicio';
      var ap = S.ui.telaApertada();
      var deitado = ap && S.raiz.clientWidth >= 560;
      var t = S.ui.tela(30, deitado ? '780px' : '470px');
      S.telaInicio = t;
      t.modo = String(ap) + '|' + String(deitado);

      var corpo = S.el('div', deitado
        ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }
        : null, null, t.cartao);
      var colA = S.el('div', null, null, corpo);
      var colB = deitado ? S.el('div', null, null, corpo) : colA;

      var cab = S.el('div', { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: ap ? '8px' : '14px' }, null, colA);
      var selo = S.el('div', {
        width: ap ? '40px' : '50px',
        height: ap ? '40px' : '50px',
        flex: '0 0 auto',
        borderRadius: '10px',
        background: C.laranja,
        color: '#10203A',
        border: '3px solid #071430',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: ap ? '20px' : '24px'
      }, '📶', cab);
      selo.setAttribute('aria-hidden', 'true');
      var tit = S.el('div', null, null, cab);
      S.el('div', { fontSize: ap ? '17px' : '21px', fontWeight: '700', lineHeight: '1.15' }, 'Ponto de Internet Comunitário', tit);
      S.el('div', { fontSize: ap ? '11px' : '12px', color: C.laranja, fontWeight: '700', letterSpacing: '0.06em' }, 'RESIDENCIAL ATALIBA · SIMULAÇÃO', tit);

      S.el('div', { fontSize: ap ? '12px' : '13px', color: C.cinza, lineHeight: '1.45', marginBottom: ap ? '8px' : '14px' },
        'Um morador está sem internet em casa e precisa enviar a atividade da escola. Veja como o ponto gratuito com internet via satélite, criado pelos alunos da EETI em parceria com o Senac, resolve o problema.', colA);
      if (deitado || !ap) {
        var parceria = S.el('div', { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: ap ? '0' : '14px' }, null, colA);
        S.ui.logo(parceria, ap ? 22 : 28);
        S.el('div', { fontSize: '11px', color: C.cinza, lineHeight: '1.3' }, 'Projeto dos alunos da EETI\nem parceria com o Senac', parceria).style.whiteSpace = 'pre-line';
      }

      var nome = S.ui.campo('SEU NOME (OPCIONAL)', colB, { placeholder: 'Ex.: Maria', max: 30 });
      if (ap) {
        nome.wrap.style.marginBottom = '8px';
        nome.input.style.padding = '7px 10px';
      }
      nome.input.value = S.armazenar('ponto-nome') || '';

      var genero = S.armazenar('ponto-genero') === 'f' ? 'f' : 'm';
      var blocoPers = S.el('div', { marginBottom: ap ? '10px' : '16px' }, null, colB);
      S.el('div', { fontSize: ap ? '11px' : '13px', fontWeight: '700', color: C.cinza, marginBottom: '6px', letterSpacing: '0.04em' }, 'PERSONAGEM', blocoPers);
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

      function comecar() {
        var n = nome.input.value.trim().replace(/\s+/g, ' ');
        S.aluno.nome = n || (genero === 'f' ? 'Moradora' : 'Morador');
        S.aluno.genero = genero;
        S.armazenar('ponto-nome', n);
        S.armazenar('ponto-genero', genero);
        t.fechar();
        S.ui.mostrarComandos(true);
      }
      var bComecar = S.ui.botao('Começar ▶', 'primario', comecar, colB);
      bComecar.style.width = '100%';
      nome.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          comecar();
        }
      });
      S.el('div', { fontSize: '10px', color: '#5F7896', marginTop: '10px', textAlign: 'right' },
        'versão ' + S.versao + (window.__PONTO_CARREGADOR ? ' · carregador ' + window.__PONTO_CARREGADOR : ''), t.cartao);
      t.guardar = function () {
        S.armazenar('ponto-nome', nome.input.value);
        S.armazenar('ponto-genero', genero);
      };
      if (!S.toque) setTimeout(function () { nome.input.focus(); }, 50);
    };

    S.ui.reorganizarInicio = function () {
      var t = S.telaInicio;
      if (S.fase !== 'inicio' || !t || !t.fundo.isConnected) return;
      var ap = S.ui.telaApertada();
      var modo = String(ap) + '|' + String(ap && S.raiz.clientWidth >= 560);
      if (modo === t.modo) return;
      t.guardar();
      t.fechar();
      S.ui.mostrarInicio();
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

    // inicio = true: vem da tela inicial e leva ao jogo; false: consulta durante o jogo.
    S.ui.mostrarComandos = function (inicio) {
      if (inicio) S.fase = 'comandos';
      var ap = S.ui.telaApertada();
      var t = S.ui.tela(inicio ? 30 : 40, '640px');
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
      if (!S.toque || !ap) {
        var pc = bloco('Computador', !S.toque);
        linhaComando(pc, 'W A S D', 'Andar (ou setas ↑ ↓ ← →)', ap);
        linhaComando(pc, 'E', 'Usar o objeto mais próximo', ap);
        linhaComando(pc, 'CLIQUE', 'Usar o objeto clicado', ap);
        linhaComando(pc, 'M', 'Abrir o mapa do bairro', ap);
        linhaComando(pc, 'ESC', 'Fechar janela', ap);
        linhaComando(pc, 'H', 'Ver estes comandos', ap);
      }
      if (S.toque || !ap) {
        var cel = bloco('Celular (na horizontal)', S.toque);
        linhaComando(cel, 'JOYSTICK', 'Arraste no canto esquerdo para andar', ap);
        linhaComando(cel, 'USAR', 'Botão laranja: usar o objeto próximo', ap);
        linhaComando(cel, 'MAPA', 'Botão do mapa, acima do USAR', ap);
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
        ? 'Envie sua atividade online. Se a internet de casa falhar, use o Ponto de Internet Comunitário do bairro.'
        : 'Você mora no Residencial Ataliba e precisa enviar sua atividade online para o professor. Se a internet de casa falhar, use o Ponto de Internet Comunitário: ligue o ponto na central, conecte o notebook no banco e envie o trabalho.', obj);
      if (!ap) S.el('div', { color: C.cinza, marginTop: '6px', fontSize: '13px' }, 'Não tem tempo nem ranking: é uma simulação. Se travar numa etapa, aparece uma dica e uma seta laranja.', obj);

      var rodape = S.el('div', { display: 'flex', gap: '10px', marginTop: ap ? '10px' : '16px', flexWrap: 'wrap' }, null, t.cartao);
      if (inicio) {
        var bVoltar = S.ui.botao('Voltar', 'secundario', function () {
          t.fechar();
          S.ui.mostrarInicio();
        }, rodape);
        bVoltar.style.flex = '0 0 auto';
        var bComecar = S.ui.botao('Entrar na simulação ▶', 'primario', function () {
          if (S.toque && S.podeTelaCheia() && !document.fullscreenElement) S.alternarTelaCheia();
          t.fechar();
          S.iniciarCarregamento();
        }, rodape);
        bComecar.style.flex = '1 1 200px';
      } else {
        S.pausado = true;
        var bFechar = S.ui.botao('Voltar à simulação', 'primario', function () {
          t.fechar();
          S.telaPausa = null;
          if (!S.ui.modalAberto() && S.fase === 'jogo') S.pausado = false;
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
      S.el('div', { fontSize: '18px', fontWeight: '700', marginBottom: '12px' }, 'Montando o Residencial Ataliba…', t.cartao);
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
      if (hud.camada) return;
      hud.camada = S.el('div', { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', zIndex: '5', pointerEvents: 'none' }, null, S.raiz);

      // Objetivo (canto superior esquerdo).
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
      hud.numero = S.el('div', { color: C.laranja, fontWeight: '700', fontSize: '12px', letterSpacing: '0.06em' }, 'OBJETIVO 1/7', topo);
      hud.local = S.el('div', { color: C.cinza, fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, '', topo);
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

      // Bússola: aponta o caminho até o ponto (depois que o mapa foi aberto).
      hud.bussola = S.el('div', {
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'none',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(14, 37, 71, 0.92)',
        border: '3px solid ' + C.laranja,
        borderRadius: '999px',
        padding: '4px 12px 4px 6px',
        fontWeight: '700',
        fontSize: '13px'
      }, null, hud.camada);
      hud.seta = S.el('div', { width: '26px', height: '26px', color: C.laranja, transition: 'transform .15s linear' }, null, hud.bussola);
      hud.seta.appendChild(S.icone('seta', 26, 2.2));
      hud.seta.firstChild.setAttribute('fill', C.laranja);
      hud.distancia = S.el('div', null, '', hud.bussola);

      // Item na mão + botões (canto superior direito).
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
      var bMapa = S.ui.botao('', 'secundario', function () { S.minigames.mapa(); }, hud.direita);
      S.estilo(bMapa, { padding: '6px 10px' });
      bMapa.appendChild(S.icone('mapa', 18, 2.2));
      bMapa.setAttribute('aria-label', 'Mapa do bairro');
      hud.bMapa = bMapa;
      if (S.toque && S.podeTelaCheia()) {
        var bCheia = S.ui.botao('', 'secundario', S.alternarTelaCheia, hud.direita);
        S.estilo(bCheia, { padding: '6px 10px' });
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
        background: 'rgba(7, 20, 48, 0.55)',
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

    // No celular as caixas ficam menores para sobrar mais vista do 3D.
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
      hud.local.style.fontSize = t ? '9px' : '11px';
      hud.texto.style.fontSize = t ? '11px' : '14px';
      hud.dica.style.fontSize = t ? '10px' : '12px';
      S.estilo(hud.prompt, { fontSize: t ? '11px' : '14px', padding: t ? '5px 11px' : '7px 14px' });
      hud.mao.style.fontSize = t ? '10px' : '12px';
    };

    S.ui.mostrarHud = function (sim) {
      if (hud.camada) hud.camada.style.display = sim ? 'block' : 'none';
    };

    S.ui.definirMissao = function (indice, total, texto) {
      definirTexto('num', hud.numero, indice ? 'OBJETIVO ' + indice + '/' + total : 'CONCLUÍDO');
      definirTexto('txt', hud.texto, texto);
    };

    S.ui.definirLocal = function (texto) {
      if (hud.local) definirTexto('local', hud.local, texto || '');
    };

    S.ui.definirDica = function (texto) {
      if (!hud.dica) return;
      if (!texto) {
        hud.dica.style.display = 'none';
        cache.dica = null;
        return;
      }
      definirTexto('dica', hud.dica, '💡 ' + texto);
      hud.dica.style.display = 'block';
    };

    S.ui.definirMao = function (texto) {
      if (!hud.mao) return;
      if (!texto) {
        hud.mao.style.display = 'none';
        return;
      }
      hud.mao.textContent = '🎒 ' + texto;
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

    // angulo: 0 = para cima na tela. metros: distância até o ponto.
    S.ui.definirBussola = function (angulo, metros) {
      if (!hud.bussola) return;
      if (angulo === null) {
        hud.bussola.style.display = 'none';
        cache.bussola = null;
        return;
      }
      hud.bussola.style.display = 'flex';
      hud.seta.style.transform = 'rotate(' + (angulo * 180 / Math.PI).toFixed(0) + 'deg)';
      definirTexto('dist', hud.distancia, 'Ponto de internet · ' + Math.max(1, Math.round(metros)) + ' m');
    };

    S.ui.destacarMapa = function (sim) {
      if (!hud.bMapa) return;
      hud.bMapa.style.animation = sim ? 'ponto-pulsar 1s ease-in-out infinite' : 'none';
      hud.bMapa.style.background = sim ? C.laranja : C.painel2;
      hud.bMapa.style.color = sim ? '#10203A' : C.branco;
    };
  });

  /* ================================================================== */
  secao('U07-controles-toque', function () {
    var C = S.CSS;
    var ctrl = null;

    S.ui.criarControlesToque = function () {
      if (ctrl) return;
      ctrl = {};
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
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var max = r.width / 2 - 10;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > max) {
          dx = dx / d * max;
          dy = dy / d * max;
        }
        ctrl.pino.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        var nx = dx / max;
        var ny = dy / max;
        if (Math.sqrt(nx * nx + ny * ny) < 0.18) {
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

      ctrl.mapa = S.el('button', {
        position: 'absolute',
        right: '40px',
        bottom: '146px',
        width: '66px',
        height: '46px',
        borderRadius: '10px',
        background: C.painel2,
        color: C.branco,
        border: '3px solid #071430',
        fontFamily: C.fonte,
        fontWeight: '700',
        fontSize: '13px',
        zIndex: '6',
        touchAction: 'manipulation'
      }, 'MAPA', S.raiz);
      ctrl.mapa.type = 'button';
      ctrl.mapa.addEventListener('click', S.protegido('toque:mapa', function () {
        if (S.fase === 'jogo' && !S.pausado) S.minigames.mapa();
      }));
      S.ui.atualizarControlesToque();
    };

    S.ui.atualizarControlesToque = function () {
      if (!ctrl) return;
      var mostrar = S.toque && S.fase === 'jogo' && !S.pausado;
      ctrl.base.style.display = mostrar ? 'block' : 'none';
      ctrl.usar.style.display = mostrar ? 'block' : 'none';
      ctrl.mapa.style.display = mostrar ? 'block' : 'none';
      if (S.hud && S.hud.prompt) S.hud.prompt.style.bottom = S.toque ? '20px' : '14px';
    };

    window.addEventListener('touchstart', function () {
      if (!S.toque) {
        S.toque = true;
        if (S.fase === 'jogo' || S.fase === 'cena') {
          S.ui.criarControlesToque();
          S.ui.ajustarHudToque();
          if (S.limparHover) S.limparHover();
          if (S.redimensionar) S.redimensionar();
        }
        S.ui.verificarOrientacao();
      }
    }, { passive: true });
  });


  /* ---- 20-render.js ---- */

  /* ================================================================== */
  secao('W01-render-base', function () {
    var cacheMat = {};
    S.mundo = {};

    // Lambert = iluminação por vértice, barata e com cara de PS1.
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
    S.matTex = function (tex, opcoes) {
      var p = { map: tex };
      if (opcoes) for (var k in opcoes) p[k] = opcoes[k];
      return new THREE.MeshLambertMaterial(p);
    };

    // Textura desenhada num canvas, sempre com pixels nítidos.
    S.textura = function (largura, altura, desenhar, repetir) {
      var c = document.createElement('canvas');
      c.width = largura;
      c.height = altura;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      var t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      if (repetir) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repetir[0], repetir[1]);
      }
      t.__ctx = ctx;
      t.redesenhar = function (fn) {
        (fn || desenhar)(ctx, largura, altura);
        t.needsUpdate = true;
      };
      if (desenhar) desenhar(ctx, largura, altura);
      return t;
    };

    S.quandoLogo = function (fn) {
      fn(S.logoCanvas());
    };

    // ---- Áreas: o bairro e o apartamento. Só uma aparece por vez. ----------
    S.areas = {};
    S.montando = null;
    S.area = null;
    S.colisores = [];
    S.interativos = [];

    S.criarArea = function (id) {
      var g = new THREE.Group();
      g.name = 'area:' + id;
      g.visible = false;
      S.cena.add(g);
      var a = { id: id, grupo: g, colisores: [], malhas: [], objetos: {}, oclusores: [] };
      S.areas[id] = a;
      S.montando = a;
      return a;
    };

    S.usarArea = function (id) {
      for (var k in S.areas) {
        if (Object.prototype.hasOwnProperty.call(S.areas, k)) S.areas[k].grupo.visible = k === id;
      }
      var a = S.areas[id];
      S.area = a;
      S.ambiente(id);
      S.colisores = a.colisores;
      S.interativos = a.malhas;
      if (S.limparHover) S.limparHover();
      return a;
    };

    // Rua: céu nublado. Dentro de casa e da central: tudo fora do cômodo é preto.
    S.ambiente = function (id) {
      var cor = id === 'bairro' ? S.COR.ceu : 0x000000;
      S.cena.background.setHex(cor);
      S.cena.fog.color.setHex(cor);
    };

    S.objetos = function () {
      return S.area ? S.area.objetos : {};
    };

    function pai(p) {
      return p || S.montando.grupo;
    }

    S.adicionar = function (obj, p) {
      pai(p).add(obj);
      return obj;
    };

    S.caixa = function (l, a, p, material, x, y, z, grupo, semSombra) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), material);
      m.position.set(x || 0, y || 0, z || 0);
      if (!semSombra) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      pai(grupo).add(m);
      return m;
    };

    S.cilindro = function (rt, rb, a, seg, material, x, y, z, grupo) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, a, seg || 6), material);
      m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true;
      pai(grupo).add(m);
      return m;
    };

    S.plano = function (l, a, material, x, y, z, grupo) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(l, a), material);
      m.position.set(x || 0, y || 0, z || 0);
      pai(grupo).add(m);
      return m;
    };

    // Plano deitado no chão (rua, calçada, grama…).
    S.chao = function (x0, x1, z0, z1, y, material, grupo) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), material);
      m.rotation.x = -Math.PI / 2;
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      m.receiveShadow = true;
      pai(grupo).add(m);
      return m;
    };

    S.grupo = function (x, y, z, grupo) {
      var g = new THREE.Group();
      g.position.set(x || 0, y || 0, z || 0);
      pai(grupo).add(g);
      return g;
    };

    // Colisor em coordenadas do mundo (caixa alinhada aos eixos).
    S.colisor = function (x, z, largura, profundidade, area) {
      var r = S.CFG.raio;
      var c = {
        minX: x - largura / 2 - r,
        maxX: x + largura / 2 + r,
        minZ: z - profundidade / 2 - r,
        maxZ: z + profundidade / 2 + r
      };
      (area || S.montando).colisores.push(c);
      return c;
    };
    S.colisorRet = function (x0, x1, z0, z1, area) {
      return S.colisor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, area);
    };
    S.removerColisor = function (c, area) {
      var lista = (area || S.area).colisores;
      var i = lista.indexOf(c);
      if (i >= 0) lista.splice(i, 1);
    };

    // Objetos clicáveis. Materiais clonados para o destaque acender só este objeto.
    S.interativo = function (meshes, info) {
      if (!Array.isArray(meshes)) meshes = [meshes];
      var area = S.montando;
      info.meshes = meshes;
      info.area = area.id;
      meshes.forEach(function (m) {
        m.material = Array.isArray(m.material)
          ? m.material.map(function (mm) { return mm.clone(); })
          : m.material.clone();
        m.userData.info = info;
        area.malhas.push(m);
      });
      area.objetos[info.id] = info;
      return info;
    };

    S.removerInterativo = function (id, areaId) {
      var area = S.areas[areaId || (S.area && S.area.id)];
      if (!area || !area.objetos[id]) return;
      delete area.objetos[id];
      for (var k = area.malhas.length - 1; k >= 0; k--) {
        var info = area.malhas[k].userData.info;
        if (info && info.id === id) area.malhas.splice(k, 1);
      }
    };

    // Prédios que somem um pouco quando ficam entre a câmera e o personagem.
    S.oclusor = function (meshes) {
      var o = { meshes: meshes, opacidade: 1, alvo: 1 };
      meshes.forEach(function (m) { m.userData.oclusor = o; });
      S.montando.oclusores.push(o);
      return o;
    };

    S.posMundo = function (obj, local) {
      obj.updateWorldMatrix(true, false);
      var v = local ? local.clone() : new THREE.Vector3();
      return obj.localToWorld(v);
    };

    S.montarRenderer = function () {
      // Compatibilidade com versões novas do Three.js (mantém o visual do r128).
      try {
        if (THREE.ColorManagement && 'enabled' in THREE.ColorManagement) THREE.ColorManagement.enabled = false;
      } catch (e) { /* ignora */ }
      var r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      try {
        if ('useLegacyLights' in r) r.useLegacyLights = true;
        if ('outputColorSpace' in r && THREE.LinearSRGBColorSpace) r.outputColorSpace = THREE.LinearSRGBColorSpace;
      } catch (e) { /* ignora */ }
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

      // Celular com pouca memória: o navegador pode derrubar o WebGL.
      var avisoContexto = null;
      r.domElement.addEventListener('webglcontextlost', function (ev) {
        ev.preventDefault();
        S.contextoPerdido = true;
        S.perdasDeContexto = (S.perdasDeContexto || 0) + 1;
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
      }, false);

      S.cena = new THREE.Scene();
      S.cena.background = new THREE.Color(S.COR.ceu);
      S.cena.fog = new THREE.Fog(S.COR.ceu, 34, 80);
      S.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 95);

      // Dia nublado (como nas fotos do bairro).
      S.luzCeu = new THREE.HemisphereLight(0xeef3f8, 0x6c7a58, 0.78);
      S.cena.add(S.luzCeu);
      var sol = new THREE.DirectionalLight(0xfff6e6, 0.55);
      sol.castShadow = true;
      sol.shadow.mapSize.set(1024, 1024);
      var sc = sol.shadow.camera;
      sc.left = -16;
      sc.right = 16;
      sc.top = 16;
      sc.bottom = -16;
      sc.near = 1;
      sc.far = 50;
      sol.shadow.bias = -0.002;
      S.cena.add(sol);
      S.cena.add(sol.target);
      S.sol = sol;

      S.qualidade = { sombras: true, escala: 1 };
      S.redimensionar();
      if (window.ResizeObserver) {
        new ResizeObserver(function () { S.redimensionar(); }).observe(S.raiz);
      }
    };

    // A sombra acompanha o personagem (o bairro é grande demais para uma sombra só).
    S.posicionarSol = function (x, z) {
      S.sol.position.set(x + 8, 18, z + 6);
      S.sol.target.position.set(x, 0, z);
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
      S.camera.fov = w / h < 1.4 ? 58 : 50;
      S.camera.updateProjectionMatrix();
    };
  });


  /* ---- 30-texturas.js ---- */

  /* ================================================================== */
  secao('T01-texturas', function () {
    var T = S.tex = {};

    function ruido(ctx, w, h, cores, qtd, rnd) {
      rnd = rnd || Math.random;
      for (var i = 0; i < qtd; i++) {
        ctx.fillStyle = cores[Math.floor(rnd() * cores.length)];
        ctx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
      }
    }
    T.ruido = ruido;

    T.grama = function (rx, rz) {
      var rnd = S.rng(11);
      return S.textura(32, 32, function (ctx, w, h) {
        ctx.fillStyle = '#6A9A45';
        ctx.fillRect(0, 0, w, h);
        ruido(ctx, w, h, ['#5B8A3A', '#7BAA52', '#4F7E33', '#88B45C'], 260, rnd);
      }, [rx, rz]);
    };

    T.asfalto = function (rx, rz) {
      var rnd = S.rng(21);
      return S.textura(32, 32, function (ctx, w, h) {
        ctx.fillStyle = '#55585C';
        ctx.fillRect(0, 0, w, h);
        ruido(ctx, w, h, ['#4A4D51', '#606368', '#6A6C70', '#3F4246'], 300, rnd);
        ctx.fillStyle = 'rgba(30,30,30,0.25)';
        ctx.fillRect(4, 18, 9, 5); // remendo
      }, [rx, rz]);
    };

    T.calcada = function (rx, rz) {
      var rnd = S.rng(31);
      return S.textura(16, 16, function (ctx, w, h) {
        ctx.fillStyle = '#BDB8AD';
        ctx.fillRect(0, 0, w, h);
        ruido(ctx, w, h, ['#B0AA9E', '#C8C3B8', '#A69F92'], 60, rnd);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, w, 1);
        ctx.fillRect(0, 0, 1, h);
      }, [rx, rz]);
    };

    T.concreto = function (rx, rz) {
      var rnd = S.rng(41);
      return S.textura(16, 16, function (ctx, w, h) {
        ctx.fillStyle = '#CBC7BD';
        ctx.fillRect(0, 0, w, h);
        ruido(ctx, w, h, ['#BDB8AE', '#D6D2C9', '#B3AEA3'], 50, rnd);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, w, 1);
      }, [rx, rz]);
    };

    T.terra = function (rx, rz) {
      var rnd = S.rng(51);
      return S.textura(32, 32, function (ctx, w, h) {
        ctx.fillStyle = '#C47A43';
        ctx.fillRect(0, 0, w, h);
        ruido(ctx, w, h, ['#B56C38', '#D48B52', '#A5622F', '#CF9A6A'], 280, rnd);
      }, [rx, rz]);
    };

    T.telha = function (rx, rz, semente) {
      var rnd = S.rng(semente || 61);
      return S.textura(16, 32, function (ctx, w, h) {
        ctx.fillStyle = '#8F9498';
        ctx.fillRect(0, 0, w, h);
        for (var x = 0; x < w; x += 4) {
          ctx.fillStyle = '#A3A8AC';
          ctx.fillRect(x, 0, 2, h);
          ctx.fillStyle = '#7C8185';
          ctx.fillRect(x + 3, 0, 1, h);
        }
        ruido(ctx, w, h, ['rgba(60,70,50,0.6)', 'rgba(40,40,40,0.5)'], 30, rnd);
      }, [rx, rz]);
    };

    // Grade de ferro (transparente entre as barras): usar com alphaTest.
    T.grade = function (rx, rz, cor) {
      return S.textura(16, 16, function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = cor || '#3C4148';
        for (var x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
        ctx.fillRect(0, 0, w, 2);
        ctx.fillRect(0, h - 2, w, 2);
      }, [rx, rz]);
    };

    T.zinco = function (rx, rz, cor) {
      return S.textura(16, 16, function (ctx, w, h) {
        ctx.fillStyle = cor || '#8C98A3';
        ctx.fillRect(0, 0, w, h);
        for (var x = 0; x < w; x += 3) {
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x, 0, 1, h);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x + 2, 0, 1, h);
        }
        ctx.fillStyle = 'rgba(120,70,30,0.35)';
        ctx.fillRect(2, 10, 5, 4);
      }, [rx, rz]);
    };

    // ---- Fachadas dos blocos (estilo das fotos do Ataliba) -----------------
    var BRANCO = '#E7E5DF';
    var BEGE = '#D9C6AC';
    var CREME = '#E6D9BF';
    var AMARELO = '#E3C35A';
    var AZULCINZA = '#C2C9D2';
    var LILAS = '#B9A9C9';
    T.CORES_BLOCO = { BRANCO: BRANCO, BEGE: BEGE, CREME: CREME, AMARELO: AMARELO, AZULCINZA: AZULCINZA, LILAS: LILAS };

    function janelaVeneziana(ctx, x, y, l, a) {
      ctx.fillStyle = '#F1F0EC';
      ctx.fillRect(x - 1, y - 1, l + 2, a + 2);
      ctx.fillStyle = '#9AA3AB';
      ctx.fillRect(x, y, l, a);
      ctx.fillStyle = '#6E777F';
      for (var yy = y + 1; yy < y + a; yy += 2) ctx.fillRect(x, yy, l, 1);
      ctx.fillStyle = '#5B636B';
      ctx.fillRect(x + Math.floor(l / 2), y, 1, a);
    }
    function janelaGrade(ctx, x, y, l, a) {
      ctx.fillStyle = '#F1F0EC';
      ctx.fillRect(x - 1, y - 1, l + 2, a + 2);
      ctx.fillStyle = '#3B4A55';
      ctx.fillRect(x, y, l, a);
      ctx.fillStyle = '#7FA0B5';
      ctx.fillRect(x + 1, y + 1, Math.floor(l / 2) - 1, 2);
      ctx.fillStyle = '#C9CED3';
      for (var xx = x + 1; xx < x + l; xx += 2) ctx.fillRect(xx, y, 1, a);
      ctx.fillRect(x, y + Math.floor(a / 2), l, 1);
    }
    function porta(ctx, x, y, l, a, cor) {
      ctx.fillStyle = '#F1F0EC';
      ctx.fillRect(x - 1, y - 1, l + 2, a + 1);
      ctx.fillStyle = cor || '#3A3F45';
      ctx.fillRect(x, y, l, a);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (var xx = x + 1; xx < x + l; xx += 2) ctx.fillRect(xx, y + 2, 1, Math.floor(a * 0.45));
      ctx.fillStyle = '#C9CED3';
      ctx.fillRect(x + l - 2, y + Math.floor(a * 0.55), 1, 2);
    }
    function sujeira(ctx, w, h, rnd) {
      // Mofo e sujeira de chuva perto do chão e escorrendo das janelas.
      for (var x = 0; x < w; x++) {
        var alt = 2 + Math.floor(rnd() * 5);
        ctx.fillStyle = 'rgba(70,64,52,' + (0.18 + rnd() * 0.2).toFixed(2) + ')';
        ctx.fillRect(x, h - alt, 1, alt);
      }
      for (var i = 0; i < w / 6; i++) {
        var sx = Math.floor(rnd() * w);
        var sy = Math.floor(rnd() * h * 0.7);
        ctx.fillStyle = 'rgba(80,80,70,' + (0.08 + rnd() * 0.12).toFixed(2) + ')';
        ctx.fillRect(sx, sy, 1, 4 + Math.floor(rnd() * 10));
      }
    }

    // unidades: quantas "casas" de 4 m a fachada tem. portas: true na frente.
    T.fachada = function (semente, unidades, comPortas, coresFixas) {
      var rnd = S.rng(semente);
      var W = unidades * 40;
      var H = 64;
      var paleta = [BEGE, AMARELO, AZULCINZA, BRANCO, CREME, BEGE];
      var info = { unidades: [] };
      var tex = S.textura(W, H, function (ctx) {
        ctx.fillStyle = BRANCO;
        ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < unidades; i++) {
          var x0 = i * 40;
          var corA = coresFixas ? coresFixas[0] : (rnd() < 0.5 ? BEGE : rnd() < 0.5 ? BRANCO : CREME);
          var corB = coresFixas ? coresFixas[1] : paleta[Math.floor(rnd() * paleta.length)];
          ctx.fillStyle = corA;
          ctx.fillRect(x0, 34, 40, 30);
          ctx.fillStyle = corB;
          ctx.fillRect(x0, 10, 40, 20);
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(x0, 0, 1, H);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(x0, 32, 40, 1);
          // Andar de cima: venezianas ou varanda aberta.
          janelaVeneziana(ctx, x0 + 6, 12, 9, 14);
          var varanda = rnd() < 0.28;
          if (varanda) {
            ctx.fillStyle = '#2A2E33';
            ctx.fillRect(x0 + 21, 11, 14, 18);
            ctx.fillStyle = '#596068';
            for (var gx = x0 + 21; gx < x0 + 35; gx += 2) ctx.fillRect(gx, 21, 1, 8);
            if (rnd() < 0.7) {
              ctx.fillStyle = ['#C8323B', '#2F6FC0', '#E8E8E8', '#F2A33A'][Math.floor(rnd() * 4)];
              ctx.fillRect(x0 + 24 + Math.floor(rnd() * 6), 14, 4, 6);
            }
          } else {
            janelaVeneziana(ctx, x0 + 23, 13, 11, 12);
          }
          // Térreo: porta (na frente) e janela com grade.
          if (comPortas) {
            porta(ctx, x0 + 5, 42, 8, 22, rnd() < 0.2 ? '#5E7F86' : '#3A3F45');
            janelaGrade(ctx, x0 + 20, 43, 15, 11);
          } else {
            janelaGrade(ctx, x0 + 6, 44, 10, 9);
            janelaVeneziana(ctx, x0 + 26, 41, 6, 6);
          }
          info.unidades.push({ varanda: varanda, corA: corA, corB: corB });
        }
        sujeira(ctx, W, H, rnd);
      });
      tex.info = info;
      return tex;
    };

    T.empena = function (semente, cor) {
      var rnd = S.rng(semente);
      return S.textura(32, 64, function (ctx, w, h) {
        ctx.fillStyle = cor || BRANCO;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, 32, w, 1);
        if (rnd() < 0.6) janelaGrade(ctx, 10, 44, 10, 8);
        sujeira(ctx, w, h, rnd);
      });
    };

    // Texto em pixels (letreiros, placas).
    T.texto = function (largura, altura, texto, opcoes) {
      opcoes = opcoes || {};
      return S.textura(largura, altura, function (ctx, w, h) {
        if (opcoes.fundo) {
          ctx.fillStyle = opcoes.fundo;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.clearRect(0, 0, w, h);
        }
        if (opcoes.faixa) {
          ctx.fillStyle = opcoes.faixa;
          ctx.fillRect(0, h - 3, w, 3);
        }
        ctx.fillStyle = opcoes.cor || '#FFFFFF';
        ctx.font = (opcoes.fonte || 'bold 10px Arial');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var linhas = String(texto).split('\n');
        var lh = h / (linhas.length + 0.2);
        linhas.forEach(function (l, i) {
          ctx.fillText(l, w / 2, lh * (i + 0.6) + (opcoes.desloc || 0));
        });
      });
    };
  });


  /* ---- 40-bairro.js ---- */

  /* ================================================================== */
  secao('W02-bairro-chao-e-ruas', function () {
    var B = S.bairro = {};
    var M = S.MAPA;

    B.montarChao = function () {
      var T = S.tex;
      // Grama de base e um tom mais escuro onde começa a mata.
      S.chao(-95, 105, -80, 80, -0.01, S.matTex(T.grama(60, 48)));
      var mMata = S.mat(0x3e6b2c);
      S.chao(-95, 105, -80, -33, 0.0, mMata);
      S.chao(-95, 105, 33, 80, 0.0, mMata);
      S.chao(-95, -36, -33, 33, 0.0, mMata);

      // Ruas.
      var mAsf = S.matTex(T.asfalto(1, 1));
      M.ruas.forEach(function (r) {
        var m = S.chao(r.x0, r.x1, r.z0, r.z1, 0.012, mAsf.clone());
        m.material.map = T.asfalto((r.x1 - r.x0) / 4, (r.z1 - r.z0) / 4);
      });
      // Bueiros.
      var mBueiro = S.mat(0x7c7c74);
      [[-6, 0.4], [14, -0.6], [0.6, 14], [31, 6]].forEach(function (p) {
        S.chao(p[0] - 0.4, p[0] + 0.4, p[1] - 0.3, p[1] + 0.3, 0.016, mBueiro);
      });

      // Calçadas em volta de cada condomínio e do terreno do ponto.
      var T2 = S.tex;
      M.condominios.concat([{ x0: M.ponto.x0, x1: M.ponto.x1, z0: M.ponto.z0, z1: M.ponto.z1 }]).forEach(function (c) {
        var e = 1.2;
        var mc = S.matTex(T2.calcada(1, 1));
        [[c.x0, c.x1, c.z0, c.z0 + e], [c.x0, c.x1, c.z1 - e, c.z1], [c.x0, c.x0 + e, c.z0 + e, c.z1 - e], [c.x1 - e, c.x1, c.z0 + e, c.z1 - e]].forEach(function (s) {
          var m = S.chao(s[0], s[1], s[2], s[3], 0.02, mc.clone());
          m.material.map = T2.calcada((s[1] - s[0]) / 1.2, (s[3] - s[2]) / 1.2);
        });
      });

      // Terreno de terra batida ao norte da Rua A (o laranja da foto de satélite).
      var t = M.terreno;
      S.chao(t.x0 + 0.5, t.x1 - 1, t.z0 + 1, t.z1 - 0.5, 0.015, S.matTex(T.terra((t.x1 - t.x0) / 5, (t.z1 - t.z0) / 5)));
    };
  });

  /* ================================================================== */
  secao('W03-blocos', function () {
    var B = S.bairro;
    var T = S.tex;
    var ALTURA = 5.6;
    var SUBIDA = 0.75;
    var BEIRAL = 0.35;

    // Prisma do sótão (a parte triangular entre a laje e o telhado).
    function prisma(L, D, rise, material, grupo) {
      var forma = new THREE.Shape();
      forma.moveTo(-D / 2, 0);
      forma.lineTo(D / 2, 0);
      forma.lineTo(0, rise);
      forma.lineTo(-D / 2, 0);
      var geo = new THREE.ExtrudeGeometry(forma, { depth: L, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      geo.translate(-L / 2, 0, 0);
      var m = new THREE.Mesh(geo, material);
      m.castShadow = true;
      grupo.add(m);
      return m;
    }
    B.prisma = prisma;

    // Telhado de duas águas ao longo do eixo x.
    function telhado(L, D, rise, beiral, mat, grupo, y0) {
      var meio = D / 2 + beiral;
      var ang = Math.atan(rise / (D / 2));
      var larg = meio / Math.cos(ang);
      var malhas = [];
      [1, -1].forEach(function (lado) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(L + beiral * 2, 0.07, larg), mat);
        m.position.set(0, y0 + rise - (meio * Math.tan(ang)) / 2 + 0.04, lado * meio / 2);
        m.rotation.x = lado * ang;
        m.castShadow = true;
        m.receiveShadow = true;
        grupo.add(m);
        malhas.push(m);
      });
      return malhas;
    }
    B.telhado = telhado;

    // Bloco de 2 andares (como os do Ataliba). frenteSul: portas viradas para +z.
    B.bloco = function (cx, cz, L, D, frenteSul, semente, opcoes) {
      opcoes = opcoes || {};
      var rnd = S.rng(semente * 7 + 3);
      var g = S.grupo(cx, 0, cz);
      var unidades = Math.round(L / 4);
      var texFrente = T.fachada(semente, unidades, true, opcoes.cores);
      var texFundo = T.fachada(semente + 100, unidades, false, opcoes.cores);
      var texEmp = T.empena(semente + 7);
      var mEmp = S.matTex(texEmp);
      var mTopo = S.matUnico(0xd9d6cf);
      var mF = S.matTex(texFrente);
      var mT = S.matTex(texFundo);
      var mats = [mEmp, mEmp.clone(), mTopo, mTopo, frenteSul ? mF : mT, frenteSul ? mT : mF];
      var corpo = new THREE.Mesh(new THREE.BoxGeometry(L, ALTURA, D), mats);
      corpo.position.y = ALTURA / 2;
      corpo.castShadow = true;
      corpo.receiveShadow = true;
      g.add(corpo);
      var sotao = prisma(L, D, SUBIDA, S.matUnico(0xe2e0da), g);
      sotao.position.y = ALTURA;
      var tel = telhado(L, D, SUBIDA, BEIRAL, S.matTex(T.telha(L / 1.2, 1, semente)), g, ALTURA);
      // Faixa escura da calha.
      var calha = S.caixa(L + 0.2, 0.12, D + 0.1, S.matUnico(0xb9b5ad), 0, ALTURA - 0.05, 0, g, true);

      var malhasOclusao = [corpo, sotao, calha].concat(tel);
      var lado = frenteSul ? 1 : -1;
      // Ar-condicionados, antenas parabólicas e roupas no varal.
      var mAr = S.mat(0xe9ecef);
      var mGrelha = S.mat(0x7f868e);
      for (var i = 0; i < unidades; i++) {
        var x = -L / 2 + i * 4;
        if (rnd() < 0.55) {
          var ladoAr = rnd() < 0.5 ? lado : -lado;
          var ar = S.caixa(0.62, 0.42, 0.42, mAr, x + 2.4 + rnd() * 0.8, 3.6 + rnd() * 0.6, ladoAr * (D / 2 + 0.21), g);
          S.caixa(0.5, 0.3, 0.02, mGrelha, ar.position.x, ar.position.y, ladoAr * (D / 2 + 0.43), g, true);
        }
        if (rnd() < 0.18) B.parabolica(g, x + 1.8, 4.3, lado * (D / 2 + 0.3), lado);
      }
      S.colisor(cx, cz, L, D);
      S.oclusor(malhasOclusao);
      return { grupo: g, corpo: corpo, x0: cx - L / 2, x1: cx + L / 2, z0: cz - D / 2, z1: cz + D / 2, frenteZ: cz + lado * D / 2 };
    };

    B.parabolica = function (grupo, x, y, z, lado) {
      var mBranco = S.mat(0xd8dade);
      var prato = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.08, 0.14, 10), mBranco);
      prato.position.set(x, y, z + lado * 0.15);
      prato.rotation.x = lado * 1.15;
      prato.rotation.z = 0.25;
      prato.castShadow = true;
      grupo.add(prato);
      S.caixa(0.05, 0.05, 0.5, S.mat(0x555a60), x, y - 0.18, z, grupo, true);
      return prato;
    };
  });

  /* ================================================================== */
  secao('W04-veiculos-e-plantas', function () {
    var B = S.bairro;

    // Carro "blocado" (ao longo do eixo x local).
    B.carro = function (x, z, rot, cor) {
      var g = S.grupo(x, 0, z);
      g.rotation.y = rot || 0;
      var mCor = S.mat(cor);
      var mVidro = S.mat(0x23303d);
      var mPneu = S.mat(0x1a1a1a);
      S.caixa(3.8, 0.55, 1.66, mCor, 0, 0.62, 0, g);
      S.caixa(2.0, 0.5, 1.48, mCor, -0.25, 1.14, 0, g);
      S.caixa(1.86, 0.36, 1.5, mVidro, -0.25, 1.15, 0, g, true);
      S.caixa(2.02, 0.36, 1.2, mVidro, -0.25, 1.15, 0, g, true);
      S.caixa(0.04, 0.12, 0.3, S.mat(0xfff3c4), 1.91, 0.72, 0.55, g, true);
      S.caixa(0.04, 0.12, 0.3, S.mat(0xfff3c4), 1.91, 0.72, -0.55, g, true);
      S.caixa(0.04, 0.12, 0.3, S.mat(0xb3121b), -1.91, 0.74, 0.58, g, true);
      S.caixa(0.04, 0.12, 0.3, S.mat(0xb3121b), -1.91, 0.74, -0.58, g, true);
      S.caixa(0.03, 0.12, 0.38, S.mat(0xe9eef2), -1.92, 0.5, 0, g, true); // placa
      [[1.2, 0.8], [1.2, -0.8], [-1.25, 0.8], [-1.25, -0.8]].forEach(function (p) {
        var r = S.cilindro(0.3, 0.3, 0.22, 8, mPneu, p[0], 0.3, p[1], g);
        r.rotation.x = Math.PI / 2;
      });
      var giro = Math.abs(Math.sin(rot || 0)) > 0.7;
      S.colisor(x, z, giro ? 1.7 : 3.9, giro ? 3.9 : 1.7);
      return g;
    };

    B.moto = function (x, z, rot, cor) {
      var g = S.grupo(x, 0, z);
      g.rotation.y = rot || 0;
      var mPneu = S.mat(0x1a1a1a);
      [0.66, -0.66].forEach(function (px) {
        var r = S.cilindro(0.3, 0.3, 0.1, 8, mPneu, px, 0.3, 0, g);
        r.rotation.x = Math.PI / 2;
      });
      S.caixa(0.9, 0.24, 0.22, S.mat(cor), 0.05, 0.62, 0, g);
      S.caixa(0.5, 0.1, 0.24, S.mat(0x141414), -0.3, 0.8, 0, g);
      S.caixa(0.32, 0.22, 0.26, S.mat(cor), 0.32, 0.8, 0, g);
      S.caixa(0.06, 0.45, 0.06, S.mat(0x5a5f66), 0.62, 0.78, 0, g, true);
      S.caixa(0.05, 0.05, 0.62, S.mat(0x2a2a2a), 0.62, 1.0, 0, g, true);
      S.caixa(0.6, 0.16, 0.1, S.mat(0x8a8f96), -0.2, 0.36, 0.14, g, true); // escapamento
      var giro = Math.abs(Math.sin(rot || 0)) > 0.7;
      S.colisor(x, z, giro ? 0.6 : 1.9, giro ? 1.9 : 0.6);
      return g;
    };

    B.palmeira = function (x, z, altura, semente) {
      var rnd = S.rng(semente || 1);
      altura = altura || 4.5;
      var g = S.grupo(x, 0, z);
      var mTronco = S.matUnico(0x8a7558);
      var inclina = (rnd() - 0.5) * 0.25;
      var segs = 4;
      var topo = new THREE.Vector3(0, 0, 0);
      for (var i = 0; i < segs; i++) {
        var h = altura / segs;
        var c = S.cilindro(0.14 - i * 0.012, 0.17 - i * 0.012, h, 6, mTronco, topo.x, topo.y + h / 2, 0, g);
        c.rotation.z = inclina * (i + 1) * 0.5;
        topo.x += Math.sin(-c.rotation.z) * h;
        topo.y += Math.cos(c.rotation.z) * h;
      }
      var copa = S.grupo(topo.x, topo.y, 0, g);
      var mFolha = S.matUnico(0x4c8a35);
      var mFolhaE = S.matUnico(0x3a6f2a);
      var n = 8;
      for (var k = 0; k < n; k++) {
        var piv = S.grupo(0, 0, 0, copa);
        piv.rotation.y = k * Math.PI * 2 / n + rnd() * 0.3;
        var folha = S.caixa(0.34, 0.05, 2.1, k % 2 ? mFolha : mFolhaE, 0, -0.35, 0.95, piv);
        folha.rotation.x = 0.45 + rnd() * 0.25;
      }
      S.cilindro(0.2, 0.12, 0.35, 6, mTronco, 0, -0.1, 0, copa);
      S.colisor(x, z, 0.4, 0.4);
      oclusorDoGrupo(g);
      return g;
    };

    // Toda a árvore vira um "oclusor": fica translúcida quando tapa o personagem.
    function oclusorDoGrupo(g) {
      var ms = [];
      g.traverse(function (o) { if (o.isMesh) ms.push(o); });
      S.oclusor(ms);
    }
    B.oclusorDoGrupo = oclusorDoGrupo;

    // Árvore de copa redonda (low poly, como a da maquete).
    B.arvore = function (x, z, escala, cor) {
      escala = escala || 1;
      var g = S.grupo(x, 0, z);
      var mTronco = S.matUnico(S.COR.tronco);
      S.cilindro(0.16 * escala, 0.26 * escala, 2.4 * escala, 6, mTronco, 0, 1.2 * escala, 0, g);
      var copa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), S.matUnico(cor || S.COR.folha));
      copa.scale.set(1.35 * escala, 0.85 * escala, 1.25 * escala);
      copa.position.y = 3.0 * escala;
      copa.castShadow = true;
      g.add(copa);
      S.colisor(x, z, 0.5 * escala, 0.5 * escala);
      oclusorDoGrupo(g);
      return g;
    };

    B.pinheiro = function (x, z, escala) {
      escala = escala || 1;
      var g = S.grupo(x, 0, z);
      S.cilindro(0.12, 0.18, 1.2, 6, S.matUnico(S.COR.tronco), 0, 0.6, 0, g);
      var mF = S.matUnico(0x5b8f3c);
      [[1.3, 1.9, 1.9], [1.0, 1.7, 3.0], [0.7, 1.5, 4.0]].forEach(function (c) {
        var cone = new THREE.Mesh(new THREE.ConeGeometry(c[0] * escala, c[1] * escala, 6), mF);
        cone.position.y = c[2] * escala;
        cone.castShadow = true;
        g.add(cone);
      });
      S.colisor(x, z, 0.4, 0.4);
      oclusorDoGrupo(g);
      return g;
    };

    B.arbusto = function (x, z, escala, cor) {
      var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * (escala || 1), 0), S.mat(cor || 0x447d2f));
      m.position.set(x, 0.35 * (escala || 1), z);
      m.scale.y = 0.75;
      m.castShadow = true;
      S.adicionar(m);
      return m;
    };

    // Mata em volta do bairro: muitas árvores em 2 chamadas de desenho (instanced).
    B.montarMata = function () {
      var rnd = S.rng(2024);
      var pontos = [];
      function regiao(x0, x1, z0, z1, passo) {
        for (var x = x0; x < x1; x += passo) {
          for (var z = z0; z < z1; z += passo) {
            pontos.push([x + (rnd() - 0.5) * passo * 0.9, z + (rnd() - 0.5) * passo * 0.9, rnd()]);
          }
        }
      }
      regiao(-90, 100, -72, -35, 3.4);
      regiao(-90, 100, 48, 80, 3.4);
      regiao(-90, -38, -35, 35, 3.4);
      regiao(66, 100, -35, 35, 3.6);
      var geoA = new THREE.IcosahedronGeometry(2.2, 0);
      var geoB = new THREE.ConeGeometry(1.7, 5.5, 6);
      var listaA = pontos.filter(function (p) { return p[2] < 0.65; });
      var listaB = pontos.filter(function (p) { return p[2] >= 0.65; });
      var mA = new THREE.InstancedMesh(geoA, new THREE.MeshLambertMaterial({ color: 0xffffff }), listaA.length);
      var mB = new THREE.InstancedMesh(geoB, new THREE.MeshLambertMaterial({ color: 0xffffff }), listaB.length);
      var obj = new THREE.Object3D();
      var cor = new THREE.Color();
      var verdes = [0x2f5f25, 0x3a6e2b, 0x447a30, 0x2a5321, 0x4f8536];
      listaA.forEach(function (p, i) {
        var s = 0.9 + rnd() * 0.9;
        obj.position.set(p[0], 3.2 * s + 1.5, p[1]);
        obj.scale.set(s * 1.3, s, s * 1.2);
        obj.rotation.set(0, rnd() * 6, 0);
        obj.updateMatrix();
        mA.setMatrixAt(i, obj.matrix);
        if (mA.setColorAt) mA.setColorAt(i, cor.setHex(verdes[Math.floor(rnd() * verdes.length)]));
      });
      listaB.forEach(function (p, i) {
        var s = 0.9 + rnd() * 0.8;
        obj.position.set(p[0], 2.75 * s, p[1]);
        obj.scale.set(s, s, s);
        obj.rotation.set(0, rnd() * 6, 0);
        obj.updateMatrix();
        mB.setMatrixAt(i, obj.matrix);
        if (mB.setColorAt) mB.setColorAt(i, cor.setHex(verdes[Math.floor(rnd() * verdes.length)]));
      });
      [mA, mB].forEach(function (m) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        S.adicionar(m);
      });
      B.mata = { a: mA, b: mB, total: pontos.length };
    };
  });

  /* ================================================================== */
  secao('W05-condominios', function () {
    var B = S.bairro;
    var T = S.tex;

    // Muro baixo + grade, com abertura (portão) opcional.
    function muro(x0, z0, x1, z1, abertura, portaoFechado, info) {
      var horizontal = Math.abs(z1 - z0) < 0.01;
      var trechos = [];
      var a0 = horizontal ? x0 : z0;
      var a1 = horizontal ? x1 : z1;
      if (abertura) {
        trechos.push([a0, abertura[0]]);
        trechos.push([abertura[1], a1]);
      } else {
        trechos.push([a0, a1]);
      }
      var mMuro = S.mat(0xe4e1da);
      trechos.forEach(function (t) {
        var comp = t[1] - t[0];
        if (comp <= 0.05) return;
        var meio = (t[0] + t[1]) / 2;
        var px = horizontal ? meio : x0;
        var pz = horizontal ? z0 : meio;
        S.caixa(horizontal ? comp : 0.16, 0.55, horizontal ? 0.16 : comp, mMuro, px, 0.275, pz);
        var mGrade = new THREE.MeshLambertMaterial({ map: T.grade(comp / 0.9, 1), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
        var g = S.plano(comp, 1.25, mGrade, px, 1.17, pz);
        if (!horizontal) g.rotation.y = Math.PI / 2;
        S.colisor(px, pz, horizontal ? comp : 0.16, horizontal ? 0.16 : comp);
      });
      // Pilares do portão.
      if (abertura) {
        var mPilar = S.mat(0xd2cec5);
        [abertura[0], abertura[1]].forEach(function (a) {
          S.caixa(0.3, 1.9, 0.3, mPilar, horizontal ? a : x0, 0.95, horizontal ? z0 : a);
        });
        var comp2 = abertura[1] - abertura[0];
        var meio2 = (abertura[0] + abertura[1]) / 2;
        var mPortao = new THREE.MeshLambertMaterial({ map: T.grade(comp2 / 0.6, 1.4, '#2C4B6E'), alphaTest: 0.5, side: THREE.DoubleSide });
        if (portaoFechado) {
          var pg = S.plano(comp2, 1.75, mPortao, horizontal ? meio2 : x0, 0.92, horizontal ? z0 : meio2);
          if (!horizontal) pg.rotation.y = Math.PI / 2;
          S.colisor(horizontal ? meio2 : x0, horizontal ? z0 : meio2, horizontal ? comp2 : 0.2, horizontal ? 0.2 : comp2);
          if (info) {
            var alvo = S.caixa(horizontal ? comp2 : 0.3, 1.8, horizontal ? 0.3 : comp2, new THREE.MeshBasicMaterial({ visible: false }), pg.position.x, 0.9, pg.position.z, null, true);
            S.interativo([alvo], info);
          }
        } else {
          // Portão aberto, encostado no muro.
          var aberto = S.plano(comp2 / 2, 1.75, mPortao, 0, 0.92, 0);
          if (horizontal) {
            aberto.position.set(abertura[0] + comp2 / 4, 0.92, z0 + 0.25);
          } else {
            aberto.rotation.y = Math.PI / 2;
            aberto.position.set(x0 - 0.25, 0.92, abertura[0] + comp2 / 4);
          }
        }
      }
    }
    B.muro = muro;

    function varal(x0, z, comp, rnd) {
      var mPoste = S.mat(0x6b6f75);
      S.caixa(0.06, 1.8, 0.06, mPoste, x0, 0.9, z, null, true);
      S.caixa(0.06, 1.8, 0.06, mPoste, x0 + comp, 0.9, z, null, true);
      var pts = [new THREE.Vector3(x0, 1.75, z), new THREE.Vector3(x0 + comp / 2, 1.62, z), new THREE.Vector3(x0 + comp, 1.75, z)];
      var linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x333333 }));
      S.adicionar(linha);
      var cores = [0xc8323b, 0x2f6fc0, 0xf2f2f2, 0xf2a33a, 0x7a3fa0, 0x3fa06a];
      for (var i = 0; i < 4; i++) {
        var pano = S.plano(0.45 + rnd() * 0.3, 0.55 + rnd() * 0.3, new THREE.MeshLambertMaterial({ color: cores[Math.floor(rnd() * cores.length)], side: THREE.DoubleSide }), x0 + 0.4 + i * (comp - 0.8) / 3, 1.38, z);
        pano.castShadow = true;
      }
    }

    function garagem(x, z, comp, prof, rnd) {
      // Cobertura de garagem com estrutura de madeira e telha (como na foto).
      var mPoste = S.mat(0x8a7a64);
      var g = S.grupo(x, 0, z);
      [[-comp / 2, -prof / 2], [comp / 2, -prof / 2], [-comp / 2, prof / 2], [comp / 2, prof / 2]].forEach(function (p) {
        S.caixa(0.12, 2.3, 0.12, mPoste, p[0], 1.15, p[1], g);
      });
      var tel = S.caixa(comp + 0.4, 0.06, prof + 0.4, S.matTex(T.zinco(comp, prof, '#8D9AA3')), 0, 2.35, 0, g);
      tel.rotation.x = 0.06;
      S.oclusor([tel]);
      return g;
    }

    // Condomínio: dois blocos de frente um para o outro, pátio no meio, muro com portão.
    B.condominio = function (c) {
      var rnd = S.rng(c.id * 97);
      var L = 20;
      var D = 5.5;
      var cx = (c.x0 + c.x1) / 2;
      var zA = c.z0 + 1.6 + D / 2;
      var zB = c.z1 - 1.6 - D / 2;
      var cores = {
        1: [[T.CORES_BLOCO.BEGE, T.CORES_BLOCO.BEGE], [T.CORES_BLOCO.BRANCO, T.CORES_BLOCO.AMARELO]],
        2: [null, null],
        3: [[T.CORES_BLOCO.CREME, T.CORES_BLOCO.AZULCINZA], null],
        4: [null, [T.CORES_BLOCO.BRANCO, T.CORES_BLOCO.LILAS]]
      }[c.id];
      var bA = B.bloco(cx, zA, L, D, true, c.id * 10 + 1, { cores: c.id === 1 ? null : cores[0] });
      var bB = B.bloco(cx, zB, L, D, false, c.id * 10 + 2, { cores: cores[1] });
      c.blocosMontados = [bA, bB];

      // Número dos blocos pintado na empena (como "BLOCO 88" na foto).
      [[bA, c.blocos[0]], [bB, c.blocos[1]]].forEach(function (par) {
        var b = par[0];
        var lado = c.portaoLado === 'oeste' || (c.id === 2 || c.id === 4) ? -1 : 1;
        var tex = T.texto(48, 16, 'BLOCO ' + par[1], { cor: '#3B4C66', fonte: 'bold 9px Arial' });
        var p = S.plano(1.6, 0.55, new THREE.MeshLambertMaterial({ map: tex, transparent: true }), lado > 0 ? b.x1 + 0.012 : b.x0 - 0.012, 4.6, (b.z0 + b.z1) / 2);
        p.rotation.y = lado * Math.PI / 2;
      });

      // Pátio: faixas de concreto (estacionamento) e passeio na frente das portas.
      var mConc = S.matTex(T.concreto(1, 1));
      var pz0 = bA.z1;
      var pz1 = bB.z0;
      S.chao(bA.x0, bA.x1, pz0, pz0 + 1.3, 0.025, mConc);
      S.chao(bB.x0, bB.x1, pz1 - 1.3, pz1, 0.025, mConc);
      var meioZ = (pz0 + pz1) / 2;
      for (var v = 0; v < 4; v++) {
        var vx = bA.x0 + 2.5 + v * 5;
        S.chao(vx - 1.2, vx - 0.6, pz0 + 1.6, pz1 - 1.6, 0.024, mConc);
        S.chao(vx + 0.6, vx + 1.2, pz0 + 1.6, pz1 - 1.6, 0.024, mConc);
      }

      // Muro em volta. O portão fica no lado do pátio.
      var ins = 0.35;
      var X0 = c.x0 + ins;
      var X1 = c.x1 - ins;
      var Z0 = c.z0 + ins;
      var Z1 = c.z1 - ins;
      var portao = [meioZ - 2.6, meioZ + 2.6];
      var lesteTemPortao = c.id === 1 || c.id === 3;
      var infoPortao = c.acessivel ? null : { id: 'portao:' + c.id, nome: 'Portão do ' + c.nome, condominio: c, ancora: new THREE.Vector3(lesteTemPortao ? X1 + 1.0 : X0 - 1.0, 0, meioZ) };
      muro(X0, Z0, X1, Z0, null);
      muro(X0, Z1, X1, Z1, null);
      muro(X1, Z0, X1, Z1, lesteTemPortao ? portao : null, !c.acessivel, infoPortao);
      muro(X0, Z0, X0, Z1, lesteTemPortao ? null : portao, !c.acessivel, infoPortao);
      c.portao = { x: lesteTemPortao ? X1 : X0, z: meioZ };

      // Vida do condomínio: carros, motos, palmeiras, varal e garagem.
      var coresCarro = [0xc8202a, 0xe9e9ea, 0x9aa1a8, 0x23272c, 0x2a5aa8];
      var vagas = [0, 1, 2, 3].filter(function () { return rnd() < 0.55; });
      if (c.id === 1) vagas = [0, 1];
      vagas.forEach(function (vg, i) {
        var vx = bA.x0 + 2.5 + vg * 5;
        B.carro(vx, meioZ + (rnd() - 0.5) * 0.6, Math.PI / 2 + (rnd() < 0.5 ? 0 : Math.PI), coresCarro[(c.id + i * 2) % coresCarro.length]);
      });
      B.moto(bA.x1 - 1.2, pz0 + 1.0, 0.1, [0xe3b21a, 0xc8202a, 0x1f1f1f, 0x2a5aa8][c.id % 4]);
      if (rnd() < 0.7) B.moto(bB.x0 + 3.5, pz1 - 1.0, Math.PI - 0.2, [0x1f1f1f, 0xe3b21a, 0x2a5aa8][c.id % 3]);
      B.palmeira(X0 + 1.2, meioZ - 1.8, 4.6 + rnd(), c.id * 3);
      if (c.id !== 1) B.palmeira(X1 - 1.2, meioZ + 1.8, 4.2 + rnd(), c.id * 3 + 1);
      varal(bB.x1 - 5.5, pz1 - 2.0, 3.2, rnd);
      garagem(bB.x0 + 6.4, pz1 - 1.7, 3.2, 2.8, rnd);
      for (var a = 0; a < 5; a++) B.arbusto(bA.x0 + rnd() * L, pz0 + 1.45 + rnd() * 0.2, 0.6 + rnd() * 0.5);
      return c;
    };
  });

  /* ================================================================== */
  secao('W06-postes-placas-escola', function () {
    var B = S.bairro;
    var T = S.tex;

    B.poste = function (x, z) {
      var g = S.grupo(x, 0, z);
      var mConc = S.mat(0xa9a7a0);
      S.caixa(0.22, 8.2, 0.22, mConc, 0, 4.1, 0, g);
      S.caixa(1.6, 0.1, 0.12, mConc, 0, 7.6, 0, g, true);
      S.caixa(0.3, 0.45, 0.3, S.mat(0x7d8288), 0.25, 6.9, 0, g, true); // transformador da rua
      S.colisor(x, z, 0.3, 0.3);
      return new THREE.Vector3(x, 7.62, z);
    };

    // Fios com "barriga" entre os postes.
    B.fio = function (a, b, queda, cor) {
      var pts = [];
      for (var i = 0; i <= 8; i++) {
        var t = i / 8;
        pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * (queda || 0.6), a.z + (b.z - a.z) * t));
      }
      var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: cor || 0x1c1c1c }));
      l.frustumCulled = false;
      S.adicionar(l);
      return l;
    };

    function naRua(x, z) {
      return S.MAPA.ruas.some(function (r) { return x > r.x0 - 0.4 && x < r.x1 + 0.4 && z > r.z0 - 0.4 && z < r.z1 + 0.4; });
    }

    B.montarPostes = function () {
      // Postes ao longo da Rua A (lado norte) e da Rua C (lado leste).
      var anterior = null;
      for (var x = -31; x <= 46; x += 11) {
        if (naRua(x, -3.6)) continue;
        var topo = B.poste(x, -3.6);
        if (anterior) {
          B.fio(new THREE.Vector3(anterior.x - 0.6, anterior.y, anterior.z), new THREE.Vector3(topo.x - 0.6, topo.y, topo.z), 0.7);
          B.fio(new THREE.Vector3(anterior.x + 0.6, anterior.y, anterior.z), new THREE.Vector3(topo.x + 0.6, topo.y, topo.z), 0.8);
        }
        anterior = topo;
      }
      anterior = null;
      for (var z = -27; z <= 30; z += 11) {
        if (Math.abs(z + 3.6) < 3 || naRua(3.6, z)) continue;
        var t2 = B.poste(3.6, z);
        if (anterior) {
          B.fio(new THREE.Vector3(anterior.x, anterior.y, anterior.z - 0.6), new THREE.Vector3(t2.x, t2.y, t2.z - 0.6), 0.7);
          B.fio(new THREE.Vector3(anterior.x, anterior.y, anterior.z + 0.6), new THREE.Vector3(t2.x, t2.y, t2.z + 0.6), 0.8);
        }
        anterior = t2;
      }
    };

    // Placa com nome de rua (ajuda a se localizar com o mapa).
    B.placaRua = function (x, z, texto, rotY, cor) {
      var g = S.grupo(x, 0, z);
      g.rotation.y = rotY || 0;
      S.caixa(0.08, 2.6, 0.08, S.mat(0x5a5f66), 0, 1.3, 0, g);
      var tex = T.texto(64, 16, texto, { fundo: cor || '#1F5FA8', cor: '#FFFFFF', fonte: 'bold 9px Arial', faixa: '#FFFFFF' });
      var mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
      var p = S.plano(1.3, 0.34, mat, 0, 2.45, 0.05, g);
      p.castShadow = true;
      S.colisor(x, z, 0.2, 0.2);
      return g;
    };

    B.lixeira = function (x, z) {
      var g = S.grupo(x, 0, z);
      S.caixa(0.08, 0.9, 0.08, S.mat(0x6b6f75), 0, 0.45, 0, g, true);
      S.caixa(0.7, 0.45, 0.45, S.matTex(T.zinco(1, 1, '#8B5A44')), 0, 1.1, 0, g);
      S.colisor(x, z, 0.5, 0.4);
    };

    // Muro da escola (EETI) no fim da rua, depois do ponto.
    B.montarEscola = function () {
      var X = S.MAPA.escolaX + 0.2;
      var mMuro = S.matUnico(0xe9e6df);
      S.caixa(0.25, 2.3, 62, mMuro, X, 1.15, 0);
      S.caixa(0.27, 0.35, 62, S.mat(0x2f6fc0), X, 0.6, 0, null, true);
      S.colisorRet(X - 0.2, X + 0.2, -31, 31);
      // Mural colorido.
      var texMural = S.textura(256, 40, function (ctx, w, h) {
        ctx.fillStyle = '#E9E6DF';
        ctx.fillRect(0, 0, w, h);
        var cores = ['#F7941D', '#2F6FC0', '#3FA06A', '#E3C35A', '#C8323B'];
        for (var i = 0; i < 16; i++) {
          ctx.fillStyle = cores[i % cores.length];
          ctx.fillRect(i * 16, 31 + (i % 2) * 2, 16, 9);
        }
        ctx.fillStyle = '#0B4F9C';
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px Arial';
        ctx.fillText('E.E.T.I.', w / 2, 13);
        ctx.font = 'bold 10px Arial';
        ctx.fillText('ESCOLA ESTADUAL DE TEMPO INTEGRAL', w / 2, 26);
      });
      var mural = S.plano(14, 2.2, new THREE.MeshLambertMaterial({ map: texMural }), X - 0.14, 1.15, -12);
      var mural2 = S.plano(12, 1.9, new THREE.MeshLambertMaterial({ map: texMural }), X - 0.14, 1.1, 20.5);
      mural2.rotation.y = -Math.PI / 2;
      mural.rotation.y = -Math.PI / 2;
      // Prédio da escola atrás do muro.
      var gEsc = S.grupo(57, 0, -6);
      var texEsc = S.textura(64, 32, function (ctx, w, h) {
        ctx.fillStyle = '#E8ECF1';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2F6FC0';
        ctx.fillRect(0, 13, w, 3);
        ctx.fillStyle = '#3B4A55';
        for (var x = 2; x < w; x += 8) {
          ctx.fillRect(x, 4, 5, 6);
          ctx.fillRect(x, 20, 5, 6);
        }
      });
      var mEsc = S.matTex(texEsc);
      var corpo = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 40), [mEsc, mEsc, S.mat(0xb8bcc2), mEsc, mEsc, mEsc]);
      corpo.position.y = 3.5;
      corpo.castShadow = true;
      gEsc.add(corpo);
      var gTel = S.grupo(0, 0, 0, gEsc);
      gTel.rotation.y = Math.PI / 2;
      B.telhado(40, 10, 1.1, 0.4, S.matTex(T.telha(30, 2, 9)), gTel, 7);
    };
  });


  /* ---- 42-ponto.js ---- */

  /* ================================================================== */
  secao('W07-ponto-comunitario', function () {
    var B = S.bairro;
    var T = S.tex;
    var P = S.PONTO;
    var PT = S.ponto = {};

    function ledMat() {
      return S.matUnico(S.COR.ledApagado, { emissive: 0x000000, emissiveIntensity: 0 });
    }
    PT.ledMat = ledMat;
    PT.acenderLed = function (mat, cor) {
      if (cor === null || cor === undefined) {
        mat.color.setHex(S.COR.ledApagado);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      } else {
        mat.color.setHex(cor);
        mat.emissive.setHex(cor);
        mat.emissiveIntensity = 0.9;
      }
    };

    // ---- Laje e placa ------------------------------------------------------
    function laje() {
      var L = P.laje;
      var m = S.caixa(L.x1 - L.x0, L.y, L.z1 - L.z0, S.matTex(T.concreto((L.x1 - L.x0) / 1.5, (L.z1 - L.z0) / 1.5)), (L.x0 + L.x1) / 2, L.y / 2, (L.z0 + L.z1) / 2);
      m.castShadow = false;
      S.chao(L.x0 - 1.4, L.x0, 11.2, 12.8, 0.03, S.matTex(T.concreto(1, 1)));
    }

    // Placa: logo do Senac numa coluna branca à esquerda, texto à direita.
    function placaPonto() {
      var g = S.grupo(35.6, 0, 16.6);
      g.rotation.y = -0.35;
      var mPoste = S.mat(0x3b4048);
      S.caixa(0.1, 1.9, 0.1, mPoste, -0.95, 0.95, 0, g);
      S.caixa(0.1, 1.9, 0.1, mPoste, 0.95, 0.95, 0, g);
      var tex = S.textura(128, 64, function (ctx, w, h) {
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, h - 5, w, 5);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, 4, 34, h - 13);
        ctx.fillStyle = '#0B4F9C';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EETI', 21, 46);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('PONTO DE INTERNET', 83, 14);
        ctx.fillText('COMUNITÁRIO', 83, 25);
        ctx.fillStyle = '#FFD36B';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('Wi-Fi e cabo GRÁTIS', 83, 37);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '7px Arial';
        ctx.fillText('internet via satélite', 83, 48);
      });
      S.quandoLogo(function (img) {
        tex.__ctx.drawImage(img, 6, 10, 30, 18);
        tex.needsUpdate = true;
      });
      var mAz = S.mat(0x0b4f9c);
      var placa = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 0.06), [mAz, mAz, mAz, mAz, S.matTex(tex), mAz]);
      placa.position.y = 1.55;
      placa.castShadow = true;
      g.add(placa);
      S.colisor(35.6, 16.6, 2.1, 0.4);
    }

    // ---- Abrigo: banco encostado no painel e mesa na frente ------------------
    function abrigo() {
      var y = P.laje.y;
      var mAb = S.mat(S.COR.abrigo);
      var mAbE = S.mat(0x7f77bd);
      S.caixa(4.0, 1.7, 0.2, mAb, 39.4, 0.85 + y, 9.65);
      [37.65, 41.15].forEach(function (x) {
        S.cilindro(0.06, 0.06, 2.55, 6, mAbE, x, 1.3 + y, 12.0);
        S.colisor(x, 12.0, 0.15, 0.15);
      });
      // Cobertura curva (em gomos) para não molhar quem senta; fica translúcida se tapar a câmera.
      var mTeto = S.matUnico(S.COR.abrigo);
      var gomos = [[9.45, 2.55, -0.35], [10.35, 2.72, -0.08], [11.25, 2.72, 0.08], [12.15, 2.55, 0.35]].map(function (gm) {
        var c = S.caixa(4.3, 0.08, 0.95, mTeto, 39.4, gm[1] + y, gm[0]);
        c.rotation.x = gm[2];
        return c;
      });
      S.oclusor(gomos);

      // Banco de madeira (assento + encosto) colado no painel.
      var mBanco = S.mat(S.COR.banco);
      var mBancoE = S.mat(0xc98d68);
      var b = P.banco;
      var bx = (b.x0 + b.x1) / 2;
      var bl = b.x1 - b.x0;
      S.caixa(bl, 0.1, 0.44, mBanco, bx, 0.45 + y, b.z);
      S.caixa(bl, 0.42, 0.08, mBancoE, bx, 0.78 + y, b.z - 0.24);
      [b.x0 + 0.12, b.x1 - 0.12].forEach(function (x) {
        S.caixa(0.08, 0.4, 0.38, mBancoE, x, 0.2 + y, b.z);
      });
      // Mesa na frente do banco (onde fica o notebook).
      var me = P.mesa;
      var mx = (me.x0 + me.x1) / 2;
      var mz = (me.z0 + me.z1) / 2;
      var mMesa = S.mat(0xe6b48c);
      S.caixa(me.x1 - me.x0, 0.06, me.z1 - me.z0, mMesa, mx, me.alt + y, mz);
      [[me.x0 + 0.08, me.z0 + 0.08], [me.x1 - 0.08, me.z0 + 0.08], [me.x0 + 0.08, me.z1 - 0.08], [me.x1 - 0.08, me.z1 - 0.08]].forEach(function (p) {
        S.caixa(0.07, me.alt, 0.07, mBancoE, p[0], me.alt / 2 + y, p[1]);
      });
      S.colisorRet(37.8, 41.0, 9.5, me.z1);
      PT.sentar = { y: 0.5 + y, z: b.z + 0.02 };

      // Tomadas de rede (keystone): um pedestal em cada ponta do banco.
      PT.keystones = {};
      P.keystones.forEach(function (k) {
        var g = S.grupo(k.x, y, k.z);
        var pedestal = S.caixa(0.22, 0.62, 0.24, S.mat(0x8f97a3), 0, 0.31, 0, g);
        S.caixa(0.24, 0.04, 0.26, S.mat(0x6c7480), 0, 0.64, 0, g, true);
        var espelho = S.caixa(0.14, 0.18, 0.02, S.mat(0xffffff), 0, 0.46, 0.13, g, true);
        S.caixa(0.06, 0.05, 0.02, S.mat(S.COR.caboAzul), 0, 0.48, 0.145, g, true);
        var led = ledMat();
        S.caixa(0.025, 0.025, 0.02, led, 0.045, 0.415, 0.145, g, true);
        var tex = T.texto(32, 10, 'REDE', { cor: '#3B4C66', fonte: 'bold 7px Arial' });
        var et = S.plano(0.14, 0.045, new THREE.MeshBasicMaterial({ map: tex, transparent: true }), 0, 0.575, 0.131, g);
        et.renderOrder = 2;
        PT.keystones[k.id] = {
          def: k,
          led: led,
          info: S.interativo([pedestal, espelho], {
            id: k.id,
            nome: 'Tomada de rede (keystone) do lado ' + k.lado + ' do banco',
            keystone: k,
            ancora: new THREE.Vector3(k.x + (k.lado === 'esquerdo' ? 0.3 : -0.3), 0, 12.05),
            setaY: 1.1
          })
        };
      });
    }

    // ---- Poste T com luminárias e câmera de segurança ----------------------
    function posteLuz() {
      var x = P.poste.x;
      var z = P.poste.z;
      var y = P.laje.y;
      var mPoste = S.mat(0x8a83c9);
      S.caixa(0.32, 0.25, 0.32, mPoste, x, 0.12 + y, z);
      S.caixa(0.14, 3.2, 0.14, mPoste, x, 1.7 + y, z);
      S.caixa(1.3, 0.1, 0.12, mPoste, x, 3.3 + y, z);
      PT.lampadas = [];
      [-0.6, 0.6].forEach(function (dx) {
        S.caixa(0.22, 0.14, 0.22, mPoste, x + dx, 3.32 + y, z);
        var m = S.matUnico(0xf2f2ea, { emissive: 0x000000 });
        S.caixa(0.16, 0.03, 0.16, m, x + dx, 3.24 + y, z, null, true);
        PT.lampadas.push(m);
      });
      S.colisor(x, z, 0.35, 0.35);
      camera(x - 0.12, 2.75 + y, z - 0.1, -2.2);
    }

    function camera(x, y, z, rotY) {
      var g = S.grupo(x, y, z);
      g.rotation.y = rotY;
      S.caixa(0.12, 0.12, 0.26, S.mat(0xf0f0f0), 0, 0, 0.12, g, true);
      S.caixa(0.07, 0.07, 0.03, S.mat(0x111111), 0, 0, 0.26, g, true);
      var led = ledMat();
      S.caixa(0.025, 0.025, 0.02, led, 0.04, 0.05, 0.25, g, true);
      PT.ledsCamera = PT.ledsCamera || [];
      PT.ledsCamera.push(led);
    }

    // ---- Central vista de fora (por dentro é outra área, maior) -------------
    function central() {
      var C = P.central;
      var y = P.laje.y;
      var H = C.alt;
      var mParede = S.matUnico(S.COR.central);
      var cx = (C.x0 + C.x1) / 2;
      var cz = (C.z0 + C.z1) / 2;
      var largX = C.x1 - C.x0;
      var largZ = C.z1 - C.z0;
      // Casinha fechada com a porta e o letreiro na frente.
      var corpo = S.caixa(largX, H, largZ, mParede, cx, y + H / 2, cz);
      S.colisorRet(C.x0, C.x1, C.z0, C.z1);
      var rodape = S.caixa(largX + 0.04, 0.3, largZ + 0.04, S.matUnico(S.COR.centralEscuro), cx, y + 0.15, cz, null, true);
      var gTeto = S.grupo(cx, y, cz);
      var sot = B.prisma(largX, largZ, 0.7, S.matUnico(S.COR.central), gTeto);
      sot.position.y = H;
      var tel = B.telhado(largX, largZ, 0.7, 0.25, S.matUnico(S.COR.centralEscuro), gTeto, H);
      S.oclusor([corpo, rodape, sot].concat(tel));

      var texLet = S.textura(96, 24, function (ctx, w) {
        ctx.clearRect(0, 0, w, 24);
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4E9C8A';
        ctx.fillText('CENTRAL', w / 2 + 1, 19);
        ctx.fillStyle = '#B9EADF';
        ctx.fillText('CENTRAL', w / 2, 18);
      });
      S.plano(1.8, 0.45, new THREE.MeshLambertMaterial({ map: texLet, transparent: true }), (C.x0 + C.porta0) / 2, y + 1.75, C.z1 + 0.012);
      var texAviso = T.texto(64, 32, 'PONTO DESLIGADO?\nLigue o\ntransformador', { fundo: '#FFF4D6', cor: '#5A4300', fonte: 'bold 7px Arial' });
      S.plano(0.42, 0.21, new THREE.MeshLambertMaterial({ map: texAviso }), C.porta0 - 0.35, y + 1.25, C.z1 + 0.013);

      // Porta: usar = entrar na central.
      var larg = C.porta1 - C.porta0;
      var folha = S.caixa(larg, 2.02, 0.05, S.mat(0x3f7f72), (C.porta0 + C.porta1) / 2, y + 1.01, C.z1 + 0.03);
      var mac = S.caixa(0.1, 0.05, 0.08, S.mat(S.COR.metal), C.porta1 - 0.14, y + 1.0, C.z1 + 0.07, null, true);
      S.interativo([folha, mac], {
        id: 'portaCentral',
        nome: 'Porta da central',
        ancora: new THREE.Vector3((C.porta0 + C.porta1) / 2, 0, C.z1 + 0.8),
        setaY: 4.1
      });
      PT.entradaCentral = { x: (C.porta0 + C.porta1) / 2, z: C.z1 + 0.85 };

      // Antena parabólica no telhado (internet via satélite).
      var gAnt = S.grupo(45.7, y + H + 0.35, C.z0 + 0.6);
      var prato = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.1, 0.14, 12), S.mat(0xe8eaee));
      prato.rotation.x = 0.9;
      prato.position.y = 0.45;
      prato.castShadow = true;
      gAnt.add(prato);
      S.caixa(0.06, 0.6, 0.06, S.mat(0x5a5f66), 0, 0.15, -0.05, gAnt, true);
      S.caixa(0.04, 0.04, 0.45, S.mat(0x5a5f66), 0, 0.62, 0.22, gAnt, true);
      S.caixa(0.08, 0.08, 0.1, S.mat(0x333333), 0, 0.66, 0.45, gAnt, true);

      camera(C.x0 + 0.05, y + 2.35, C.z1 + 0.05, -0.75);
      // Luz em cima da porta (acende com o transformador).
      PT.luzPorta = S.matUnico(0xe8ecec, { emissive: 0x000000 });
      S.caixa(0.3, 0.08, 0.1, PT.luzPorta, (C.porta0 + C.porta1) / 2, y + 2.25, C.z1 + 0.06, null, true);
    }

    // Entrada de energia: poste na calçada da Rua A, fio direto até o fundo da central.
    function energia() {
      var C = P.central;
      var topo = B.poste(45.3, 3.8);
      var chegada = new THREE.Vector3(45.3, P.laje.y + C.alt + 0.55, C.z0 - 0.05);
      B.fio(new THREE.Vector3(topo.x, topo.y - 1.2, topo.z), chegada, 0.8, 0x111111);
      S.caixa(0.08, 0.6, 0.08, S.mat(0x5a5f66), chegada.x, chegada.y - 0.28, chegada.z, null, true);
      S.caixa(0.3, 0.4, 0.15, S.mat(0xd8dade), 45.3, P.laje.y + 1.6, C.z0 - 0.08, null, true); // medidor
    }

    PT.montar = function () {
      laje();
      placaPonto();
      abrigo();
      posteLuz();
      central();
      energia();
      B.arvore(P.arvore.x, P.arvore.z, 1.0, 0x5d9a3e);
      B.pinheiro(41.9, 8.7, 0.95);
      B.arbusto(36.0, 14.7, 1.0);
      B.arbusto(46.6, 14.9, 0.8);
      B.lixeira(42.9, 15.0);
    };
  });

  /* ================================================================== */
  secao('W08-montar-bairro', function () {
    var B = S.bairro;
    B.montarDetalhes = function () {
      // Porta do seu apartamento (Bloco 19, térreo).
      var casa = S.CASA;
      var porta = S.caixa(0.8, 1.95, 0.06, S.mat(0x5e7f86), casa.porta.x, 0.975, casa.porta.z + 0.03);
      var tex = S.tex.texto(32, 12, '19-' + casa.apto, { fundo: '#F1F0EC', cor: '#3B4C66', fonte: 'bold 8px Arial' });
      S.plano(0.3, 0.12, new THREE.MeshLambertMaterial({ map: tex }), casa.porta.x + 0.65, 1.7, casa.porta.z + 0.012);
      S.chao(casa.porta.x - 0.5, casa.porta.x + 0.5, casa.porta.z + 0.06, casa.porta.z + 0.6, 0.03, S.mat(0x8a6a4a));
      S.interativo([porta], {
        id: 'portaCasa',
        nome: 'Porta da sua casa (Bloco 19, apto ' + casa.apto + ')',
        ancora: new THREE.Vector3(casa.porta.x, 0, casa.porta.z + 0.9)
      });
      // Placas de rua (ajudam a seguir o mapa).
      B.placaRua(-3.6, 3.7, 'RUA C', 0);
      B.placaRua(3.7, 3.7, 'RUA A', 0);
      B.placaRua(27.6, 3.7, 'RUA D', 0);
      B.placaRua(34.4, 3.7, 'PONTO WI-FI ↓', 0, '#B8650A');
      B.placaRua(-3.6, 24.3, 'RUA PRINCIPAL', 0);
      // Palmeiras e árvores (nas calçadas e nos condomínios, fora das ruas).
      B.palmeira(-26.6, 5.2, 5.2, 77);
      B.palmeira(-4.6, 23.4, 4.8, 78);
      B.palmeira(35.4, 20.5, 5.0, 79);
      B.arvore(41.0, -20.0, 1.1);
      B.arvore(36.0, -14.0, 0.9);
      B.arvore(46.5, 21.0, 1.0);
      B.arvore(37.0, 23.5, 0.8);
      B.lixeira(-3.9, 18.6);
      // Carros e motos parados no canto da rua.
      B.carro(-18, 30.0, 0, 0xc8202a);
      B.carro(14, -2.1, Math.PI, 0xe9e9ea);
      B.moto(33.2, 18, Math.PI / 2, 0xe3b21a);
      B.carro(-2.1, -14, Math.PI / 2, 0x9aa1a8);
    };
  });


  /* ---- 45-apto.js ---- */

  /* ================================================================== */
  secao('W09-apartamento', function () {
    var A = S.apto = {};
    var T = S.tex;
    var O = S.APTO;

    A.montar = function () {
      var ox = O.ox;
      var oz = O.oz;
      var L2 = O.largura / 2;
      var P2 = O.profundidade / 2;
      var H = O.altura;
      A.ret = { x0: ox - L2, x1: ox + L2, z0: oz - P2, z1: oz + P2 };

      // Piso de cerâmica.
      var texPiso = S.textura(16, 16, function (ctx, w, h) {
        ctx.fillStyle = '#D8CBB4';
        ctx.fillRect(0, 0, w, h);
        T.ruido(ctx, w, h, ['#CDBFA6', '#E1D6C2'], 40, S.rng(5));
        ctx.fillStyle = '#B9AB92';
        ctx.fillRect(0, 0, w, 1);
        ctx.fillRect(0, 0, 1, h);
      }, [O.largura / 0.6, O.profundidade / 0.6]);
      S.chao(ox - L2, ox + L2, oz - P2, oz + P2, 0, S.matTex(texPiso));
      // Chão escuro em volta (o "vazio" fora da casa).
      S.chao(ox - 12, ox + 12, oz - 10, oz + 10, -0.02, S.mat(0x0d1626));

      // Paredes com barrado (como as casas dos blocos).
      var texParede = S.textura(32, 32, function (ctx, w, h) {
        ctx.fillStyle = '#DCE6D5';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#9DBFA4';
        ctx.fillRect(0, h - 11, w, 11);
        ctx.fillStyle = '#7FA488';
        ctx.fillRect(0, h - 12, w, 1);
        T.ruido(ctx, w, h, ['rgba(0,0,0,0.04)'], 30, S.rng(8));
      });
      function parede(l, p, x, z, rep) {
        var t = texParede.clone();
        t.wrapS = THREE.RepeatWrapping;
        t.repeat.set(rep, 1);
        t.needsUpdate = true;
        return S.caixa(l, H, p, S.matTex(t), x, H / 2, z);
      }
      parede(O.largura + 0.24, 0.12, ox, oz - P2 - 0.06, O.largura / 1.6);
      parede(0.12, O.profundidade, ox + L2 + 0.06, oz, O.profundidade / 1.6);
      // Parede esquerda com o vão da porta (z 0.9 a 1.8).
      var p0 = oz + 0.9;
      var p1 = oz + 1.8;
      parede(0.12, p0 - (oz - P2), ox - L2 - 0.06, (oz - P2 + p0) / 2, 2);
      parede(0.12, oz + P2 - p1, ox - L2 - 0.06, (p1 + oz + P2) / 2, 0.5);
      S.caixa(0.12, H - 2.1, p1 - p0, S.mat(0xdce6d5), ox - L2 - 0.06, 2.1 + (H - 2.1) / 2, (p0 + p1) / 2, null, true);
      // Parede da frente só como mureta (vista de maquete).
      S.caixa(O.largura + 0.24, 0.35, 0.12, S.mat(0x9dbfa4), ox, 0.175, oz + P2 + 0.06);
      S.colisorRet(ox - L2 - 1, ox + L2 + 1, oz - P2 - 1, oz - P2);
      S.colisorRet(ox + L2, ox + L2 + 1, oz - P2 - 1, oz + P2 + 1);
      S.colisorRet(ox - L2 - 1, ox + L2 + 1, oz + P2, oz + P2 + 1);
      S.colisorRet(ox - L2 - 1, ox - L2, oz - P2 - 1, p0);
      S.colisorRet(ox - L2 - 1, ox - L2, p1, oz + P2 + 1);

      // Porta de saída.
      var porta = S.caixa(0.06, 2.05, p1 - p0 - 0.04, S.mat(0x5e7f86), ox - L2 - 0.02, 1.025, (p0 + p1) / 2);
      var mac = S.caixa(0.08, 0.05, 0.12, S.mat(S.COR.metal), ox - L2 + 0.04, 1.0, p1 - 0.15, null, true);
      S.colisorRet(ox - L2 - 0.2, ox - L2 + 0.05, p0, p1);
      S.interativo([porta, mac], {
        id: 'portaApto',
        nome: 'Porta de casa',
        ancora: new THREE.Vector3(ox - L2 + 0.7, 0, (p0 + p1) / 2)
      });
      A.saida = { x: ox - L2 + 0.75, z: (p0 + p1) / 2, angulo: Math.PI / 2 };

      // Janela de veneziana na parede do fundo.
      var texJanela = S.textura(32, 24, function (ctx, w, h) {
        ctx.fillStyle = '#F1F0EC';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#B9CAD9';
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#8FAF7A';
        ctx.fillRect(2, h - 9, w - 4, 7);
        ctx.fillStyle = '#9AA3AB';
        ctx.fillRect(2, 2, 11, h - 4);
        ctx.fillStyle = '#6E777F';
        for (var y = 3; y < h - 2; y += 2) ctx.fillRect(2, y, 11, 1);
        ctx.fillStyle = '#C9CED3';
        for (var x = 3; x < w - 2; x += 3) ctx.fillRect(x, 2, 1, h - 4);
      });
      S.plano(1.3, 1.0, S.matTex(texJanela), ox + 1.1, 1.65, oz - P2 + 0.005);

      // Pôster da escola e relógio.
      var texPoster = T.texto(32, 40, 'EETI\n2026', { fundo: '#2F6FC0', cor: '#FFD36B', fonte: 'bold 9px Arial', faixa: '#F7941D' });
      S.plano(0.5, 0.62, S.matTex(texPoster), ox - 2.6, 1.75, oz - P2 + 0.005);
      var relogio = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 10), S.mat(0xf2f2f2));
      relogio.rotation.x = Math.PI / 2;
      relogio.position.set(ox - 0.4, 2.15, oz - P2 + 0.02);
      S.adicionar(relogio);

      // Mesa de estudos com o notebook.
      var mMesa = S.mat(0xa87a4f);
      var mx = ox - 1.4;
      var mz = oz - P2 + 0.32;
      S.caixa(1.5, 0.05, 0.6, mMesa, mx, 0.75, mz);
      [[-0.7, -0.25], [0.7, -0.25], [-0.7, 0.25], [0.7, 0.25]].forEach(function (p) {
        S.caixa(0.05, 0.73, 0.05, S.mat(0x4a3a2a), mx + p[0], 0.365, mz + p[1]);
      });
      S.colisorRet(mx - 0.75, mx + 0.75, oz - P2, mz + 0.3);
      var cadeira = S.grupo(mx + 0.05, 0, mz + 0.72);
      var mCad = S.mat(0x2f6fc0);
      S.caixa(0.44, 0.06, 0.42, mCad, 0, 0.46, 0, cadeira);
      S.caixa(0.44, 0.46, 0.05, mCad, 0, 0.74, 0.2, cadeira);
      S.caixa(0.05, 0.42, 0.05, S.mat(0x333333), 0, 0.23, 0, cadeira, true);
      A.cadeira = cadeira;

      // Notebook (vai junto para o ponto).
      var gNb = S.grupo(mx - 0.1, 0.775, mz - 0.02);
      A.texNotebook = S.textura(48, 30, null);
      A.desenharTelaNotebook('desligado');
      var base = S.caixa(0.42, 0.025, 0.3, S.mat(0x3b4048), 0, 0.012, 0, gNb);
      var pivTela = S.grupo(0, 0.025, -0.15, gNb);
      pivTela.rotation.x = -0.25;
      var tampa = S.caixa(0.42, 0.28, 0.018, S.mat(0x3b4048), 0, 0.14, 0, pivTela);
      var tela = S.plano(0.38, 0.24, new THREE.MeshBasicMaterial({ map: A.texNotebook }), 0, 0.14, 0.011, pivTela);
      A.notebook = gNb;
      S.interativo([base, tampa, tela], {
        id: 'notebook',
        nome: 'Seu notebook',
        ancora: new THREE.Vector3(mx - 0.1, 0, mz + 0.95)
      });

      // Estante com o roteador de casa e o cabo de rede.
      var ex = ox - L2 + 0.25;
      var ez = oz - 0.9;
      var mEst = S.mat(0xd8d2c4);
      S.caixa(0.4, 1.6, 0.04, mEst, ex, 0.8, ez - 0.55);
      S.caixa(0.4, 1.6, 0.04, mEst, ex, 0.8, ez + 0.55);
      [0.04, 0.6, 1.15, 1.6].forEach(function (y) {
        S.caixa(0.4, 0.04, 1.14, mEst, ex, y, ez, null, true);
      });
      S.colisorRet(ex - 0.2, ex + 0.25, ez - 0.6, ez + 0.6);
      // Livros.
      [[0xc8323b, -0.35], [0x2f6fc0, -0.25], [0x3fa06a, -0.16], [0xe3c35a, -0.05]].forEach(function (lv) {
        S.caixa(0.22, 0.3, 0.08, S.mat(lv[0]), ex, 0.77, ez + lv[1], null, true);
      });
      // Roteador de casa (luz vermelha: sem sinal do provedor).
      var gRo = S.grupo(ex, 1.17, ez + 0.2);
      var roteador = S.caixa(0.26, 0.05, 0.18, S.mat(0x22262b), 0, 0.025, 0, gRo);
      S.cilindro(0.008, 0.01, 0.18, 4, S.mat(0x22262b), -0.1, 0.13, -0.05, gRo);
      A.ledRoteador = S.matUnico(S.COR.ledVermelho, { emissive: S.COR.ledVermelho, emissiveIntensity: 0.9 });
      S.caixa(0.02, 0.015, 0.03, A.ledRoteador, 0.13, 0.03, 0.04, gRo, true);
      S.caixa(0.02, 0.015, 0.03, S.matUnico(S.COR.ledVerde, { emissive: S.COR.ledVerde, emissiveIntensity: 0.8 }), 0.13, 0.03, -0.02, gRo, true);
      S.interativo([roteador], {
        id: 'roteadorCasa',
        nome: 'Roteador de casa',
        ancora: new THREE.Vector3(ex + 0.85, 0, ez + 0.2)
      });
      // Cabo UTP enrolado.
      var rolo = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 4, 8), S.mat(S.COR.caboAzul));
      rolo.rotation.x = Math.PI / 2;
      rolo.position.set(ex, 0.65, ez + 0.25);
      S.adicionar(rolo);
      A.rolo = rolo;
      S.interativo([rolo], {
        id: 'cabo',
        nome: 'Cabo de rede (UTP)',
        ancora: new THREE.Vector3(ex + 0.85, 0, ez + 0.25)
      });

      // Cama, guarda-roupa, tapete e ventilador.
      var bx = ox + L2 - 0.55;
      var bz = oz - P2 + 1.1;
      S.caixa(1.0, 0.3, 2.0, S.mat(0x8a6a4a), bx, 0.15, bz);
      S.caixa(0.96, 0.16, 1.96, S.mat(0xf0ece2), bx, 0.38, bz, null, true);
      S.caixa(0.98, 0.1, 1.2, S.mat(0x3fa06a), bx, 0.47, bz + 0.35, null, true);
      S.caixa(0.6, 0.12, 0.35, S.mat(0xffffff), bx, 0.52, bz - 0.72, null, true);
      S.colisorRet(bx - 0.5, bx + 0.5, bz - 1.0, bz + 1.0);
      var gx = ox + L2 - 0.35;
      var gz = oz + P2 - 0.9;
      S.caixa(0.6, 2.0, 1.3, S.mat(0xc9b08a), gx, 1.0, gz);
      S.caixa(0.02, 1.9, 0.02, S.mat(0x7a6040), gx - 0.31, 1.0, gz, null, true);
      S.colisorRet(gx - 0.3, gx + 0.3, gz - 0.65, gz + 0.65);
      S.chao(ox - 0.9, ox + 1.1, oz - 0.2, oz + 1.4, 0.006, S.mat(0xb8574a));
      var gVent = S.grupo(ox + 1.6, 0, oz - 1.6);
      S.cilindro(0.15, 0.18, 0.05, 8, S.mat(0x33373d), 0, 0.03, 0, gVent);
      S.caixa(0.04, 0.9, 0.04, S.mat(0x33373d), 0, 0.5, 0, gVent, true);
      var helice = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 10), S.mat(0xd9dee4));
      helice.rotation.x = Math.PI / 2 - 0.2;
      helice.rotation.z = 0.5;
      helice.position.set(0, 1.0, 0.04);
      gVent.add(helice);
      S.colisor(ox + 1.6, oz - 1.6, 0.4, 0.4);

      A.inicio = { x: ox - 1.0, z: oz - 0.75, angulo: Math.PI };
    };

    // Tela do notebook (desligado, área de trabalho, sem internet, online).
    A.desenharTelaNotebook = function (estado) {
      A.texNotebook.redesenhar(function (ctx, w, h) {
        if (estado === 'desligado') {
          ctx.fillStyle = '#05070B';
          ctx.fillRect(0, 0, w, h);
          return;
        }
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1A2534';
        ctx.fillRect(0, h - 5, w, 5);
        ctx.fillStyle = '#FFFFFF';
        for (var i = 0; i < 3; i++) ctx.fillRect(3, 3 + i * 7, 5, 4);
        if (estado === 'offline') {
          ctx.fillStyle = '#F2F2F2';
          ctx.fillRect(12, 4, 32, 20);
          ctx.fillStyle = '#C9443D';
          ctx.fillRect(26, 8, 4, 4);
          ctx.fillStyle = '#5A6575';
          ctx.fillRect(18, 15, 20, 2);
          ctx.fillRect(21, 19, 14, 1);
        } else if (estado === 'online') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(12, 4, 32, 20);
          ctx.fillStyle = '#2F6FC0';
          ctx.fillRect(12, 4, 32, 4);
          ctx.fillStyle = '#39C46A';
          ctx.fillRect(24, 12, 8, 6);
        }
        ctx.fillStyle = estado === 'online' ? '#39FF6A' : '#FF7676';
        ctx.fillRect(w - 5, h - 4, 3, 3);
      });
    };
  });


  /* ---- 46-central.js ---- */

  /* ================================================================== */
  secao('W10-central-por-dentro', function () {
    // A central por dentro: maior e organizada (área separada, como a casa).
    var CI = S.centralInt = {};
    var T = S.tex;
    var O = S.CENTRAL;
    var PT = S.ponto;

    CI.montar = function () {
      var ox = O.ox;
      var oz = O.oz;
      var L2 = O.largura / 2;
      var P2 = O.profundidade / 2;
      var H = O.altura;

      // Piso de porcelanato cinza.
      var texPiso = S.textura(16, 16, function (ctx, w, h) {
        ctx.fillStyle = '#B9BEC4';
        ctx.fillRect(0, 0, w, h);
        T.ruido(ctx, w, h, ['#AEB3B9', '#C4C9CE'], 30, S.rng(71));
        ctx.fillStyle = '#9AA0A7';
        ctx.fillRect(0, 0, w, 1);
        ctx.fillRect(0, 0, 1, h);
      }, [O.largura / 0.8, O.profundidade / 0.8]);
      S.chao(ox - L2, ox + L2, oz - P2, oz + P2, 0, S.matTex(texPiso));

      // Paredes: barrado verde-água (a cor da central) e faixa laranja.
      var texParede = S.textura(32, 32, function (ctx, w, h) {
        ctx.fillStyle = '#EEF4F2';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#5FAE9D';
        ctx.fillRect(0, h - 11, w, 11);
        ctx.fillStyle = '#F7941D';
        ctx.fillRect(0, h - 13, w, 2);
      });
      function parede(l, p, x, z, rep) {
        var t = texParede.clone();
        t.wrapS = THREE.RepeatWrapping;
        t.repeat.set(rep, 1);
        t.needsUpdate = true;
        return S.caixa(l, H, p, S.matTex(t), x, H / 2, z);
      }
      parede(O.largura + 0.24, 0.12, ox, oz - P2 - 0.06, O.largura / 1.4);
      parede(0.12, O.profundidade, ox + L2 + 0.06, oz, O.profundidade / 1.4);
      var p0 = oz + 1.3;
      var p1 = oz + 2.3;
      parede(0.12, p0 - (oz - P2), ox - L2 - 0.06, (oz - P2 + p0) / 2, 3);
      parede(0.12, oz + P2 - p1, ox - L2 - 0.06, (p1 + oz + P2) / 2, 0.5);
      S.caixa(0.12, H - 2.1, p1 - p0, S.mat(0xeef4f2), ox - L2 - 0.06, 2.1 + (H - 2.1) / 2, (p0 + p1) / 2, null, true);
      S.caixa(O.largura + 0.24, 0.35, 0.12, S.mat(0x5fae9d), ox, 0.175, oz + P2 + 0.06);
      S.colisorRet(ox - L2 - 1, ox + L2 + 1, oz - P2 - 1, oz - P2);
      S.colisorRet(ox + L2, ox + L2 + 1, oz - P2 - 1, oz + P2 + 1);
      S.colisorRet(ox - L2 - 1, ox + L2 + 1, oz + P2, oz + P2 + 1);
      S.colisorRet(ox - L2 - 1, ox - L2, oz - P2 - 1, p0);
      S.colisorRet(ox - L2 - 1, ox - L2, p1, oz + P2 + 1);

      // Porta de saída (parede da esquerda, perto da frente).
      var porta = S.caixa(0.06, 2.05, p1 - p0 - 0.04, S.mat(0x3f7f72), ox - L2 - 0.02, 1.025, (p0 + p1) / 2);
      S.caixa(0.08, 0.05, 0.12, S.mat(S.COR.metal), ox - L2 + 0.04, 1.0, p1 - 0.15, null, true);
      S.interativo([porta], {
        id: 'portaSaidaCentral',
        nome: 'Porta da central (sair)',
        ancora: new THREE.Vector3(ox - L2 + 0.7, 0, (p0 + p1) / 2)
      });
      CI.entrada = { x: ox - L2 + 0.75, z: (p0 + p1) / 2, angulo: Math.PI / 2 };

      // ---- Transformador (parede da esquerda) ----
      var tz = oz - 0.7;
      var gTr = S.grupo(ox - L2 + 0.28, 0, tz);
      var texTr = S.textura(40, 64, function (ctx, w, h) {
        ctx.fillStyle = '#8E979F';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#7A838B';
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#5E666E';
        for (var yy = 6; yy < 20; yy += 3) ctx.fillRect(6, yy, w - 12, 1);
        ctx.fillStyle = '#FFD200';
        ctx.beginPath();
        ctx.moveTo(20, 25);
        ctx.lineTo(30, 41);
        ctx.lineTo(10, 41);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(19, 29, 2, 7);
        ctx.fillRect(19, 37, 2, 2);
        ctx.font = 'bold 6px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TRANSFORMADOR', 20, 51);
        ctx.fillText('220 V', 20, 58);
      });
      var mTr = S.mat(0x8e979f);
      var trafo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 1.1), [S.matTex(texTr), mTr, mTr, mTr, mTr, mTr]);
      trafo.position.set(0, 0.85, 0);
      trafo.castShadow = true;
      gTr.add(trafo);
      S.caixa(0.52, 0.08, 1.12, S.mat(0x5e666e), 0, 0.04, 0, gTr, true);
      var alavancaPiv = S.grupo(0.27, 0.95, 0.38, gTr);
      var alavanca = S.caixa(0.06, 0.32, 0.07, S.mat(0xc9443d), 0, 0.14, 0, alavancaPiv, true);
      alavancaPiv.rotation.z = -0.6;
      var ledTr = PT.ledMat();
      S.caixa(0.02, 0.06, 0.06, ledTr, 0.255, 1.45, -0.38, gTr, true);
      S.colisorRet(ox - L2, ox - L2 + 0.6, tz - 0.6, tz + 0.6);
      PT.transformador = { piv: alavancaPiv, led: ledTr };
      S.interativo([trafo, alavanca], {
        id: 'transformador',
        nome: 'Transformador da central',
        ancora: new THREE.Vector3(ox - L2 + 1.2, 0, tz),
        setaY: 2.2
      });
      // Extintor ao lado.
      var gEx = S.grupo(ox - L2 + 0.22, 0, tz + 1.0);
      S.cilindro(0.11, 0.11, 0.55, 8, S.mat(0xc8202a), 0, 0.42, 0, gEx);
      S.cilindro(0.04, 0.05, 0.12, 6, S.mat(0x222222), 0, 0.75, 0, gEx);
      S.colisor(ox - L2 + 0.22, tz + 1.0, 0.25, 0.25);
      // Eletroduto do transformador até o rack.
      var mDuto = S.mat(0x7d868f);
      S.caixa(0.06, H - 1.75, 0.06, mDuto, ox - L2 + 0.1, 1.7 + (H - 1.7) / 2, tz, null, true);
      S.caixa(0.06, 0.06, tz - (oz - P2) - 0.1, mDuto, ox - L2 + 0.1, H - 0.15, (tz + oz - P2) / 2, null, true);
      S.caixa(3.05, 0.06, 0.06, mDuto, ox - L2 + 1.6, H - 0.15, oz - P2 + 0.1, null, true);

      // ---- Rack de piso (parede do fundo) ----
      var rx = ox - 0.7;
      var rz = oz - P2 + 0.45;
      var gR = S.grupo(rx, 0, rz);
      PT.texRack = S.textura(48, 112, null);
      var mRk = S.mat(0x1d2127);
      var rack = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.0, 0.8), [mRk, mRk, mRk, mRk, S.matTex(PT.texRack), mRk]);
      rack.position.set(0, 1.04, 0);
      rack.castShadow = true;
      gR.add(rack);
      S.caixa(0.96, 0.08, 0.84, S.mat(0x2a3038), 0, 0.04, 0, gR, true);
      // Porta de vidro fumê.
      var vidro = S.plano(0.86, 1.92, new THREE.MeshLambertMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.16 }), 0, 1.04, 0.405, gR);
      vidro.renderOrder = 3;
      S.caixa(0.03, 0.3, 0.03, S.mat(0xc9ced3), 0.38, 1.1, 0.42, gR, true);
      // Logo "SAT" e eletrocalha subindo para a antena.
      var mCalha = S.mat(0x9aa4b0);
      S.caixa(0.3, H - 2.08, 0.12, mCalha, 0.2, 2.08 + (H - 2.08) / 2, -0.32, gR, true);
      [0xf7941d, 0x2d7fe0, 0x39c46a].forEach(function (c, i) {
        S.caixa(0.02, H - 2.08, 0.02, S.mat(c), 0.12 + i * 0.07, 2.08 + (H - 2.08) / 2, -0.24, gR, true);
      });
      var texSat = T.texto(64, 16, 'ANTENA SATÉLITE ↑', { fundo: '#0B4F9C', cor: '#FFFFFF', fonte: 'bold 7px Arial' });
      S.plano(0.5, 0.13, new THREE.MeshLambertMaterial({ map: texSat }), rx + 0.2, 2.55, oz - P2 + 0.01);
      S.colisorRet(rx - 0.5, rx + 0.5, oz - P2, rz + 0.42);
      S.interativo([rack], {
        id: 'rack',
        nome: 'Rack: switch e roteador via satélite',
        ancora: new THREE.Vector3(rx, 0, rz + 1.2),
        setaY: 2.6
      });
      // Luminária de parede em cima do rack.
      PT.luzRack = S.matUnico(0xdfe6e6, { emissive: 0x000000 });
      S.caixa(1.0, 0.06, 0.12, PT.luzRack, rx, H - 0.35, oz - P2 + 0.07, null, true);

      // Placa do projeto na parede do fundo.
      var texPlaca = S.textura(96, 48, function (ctx, w, h) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0B4F9C';
        ctx.fillRect(0, 0, w, 14);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CENTRAL DO PONTO', w / 2, 10);
        ctx.fillStyle = '#0B4F9C';
        ctx.font = 'bold 7px Arial';
        ctx.fillText('Internet Comunitária', 60, 26);
        ctx.fillText('Residencial Ataliba', 60, 35);
        ctx.fillStyle = '#F7941D';
        ctx.fillText('EETI + Senac', 60, 44);
      });
      S.quandoLogo(function (img) {
        texPlaca.__ctx.drawImage(img, 4, 19, 26, 15);
        texPlaca.needsUpdate = true;
      });
      S.plano(1.4, 0.7, S.matTex(texPlaca), ox + 1.25, 1.8, oz - P2 + 0.01);

      // Armário baixo com caixas de keystone e um vaso de planta.
      S.caixa(1.2, 0.8, 0.5, S.mat(0xd9dee4), ox + 1.25, 0.4, oz - P2 + 0.27);
      S.caixa(0.02, 0.7, 0.02, S.mat(0x8a96a6), ox + 1.25, 0.42, oz - P2 + 0.53, null, true);
      S.caixa(0.3, 0.18, 0.22, S.mat(0x2d7fe0), ox + 0.95, 0.89, oz - P2 + 0.27);
      S.caixa(0.3, 0.12, 0.22, S.mat(0xf2a33a), ox + 1.4, 0.86, oz - P2 + 0.27);
      S.colisorRet(ox + 0.65, ox + 1.85, oz - P2, oz - P2 + 0.52);
      S.cilindro(0.18, 0.14, 0.36, 8, S.mat(0xb8574a), ox + L2 - 0.35, 0.18, oz - P2 + 0.35);
      var folhas = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), S.mat(0x3fa06a));
      folhas.position.set(ox + L2 - 0.35, 0.65, oz - P2 + 0.35);
      S.adicionar(folhas);
      S.colisor(ox + L2 - 0.35, oz - P2 + 0.35, 0.4, 0.4);

      // ---- Mesa de monitoramento e TV grande (parede da direita) ----
      var dz = oz - 0.2;
      var mMesa = S.mat(0xd9a0c8);
      S.caixa(0.8, 0.06, 2.0, mMesa, ox + L2 - 0.4, 0.76, dz);
      S.caixa(0.76, 0.72, 0.06, mMesa, ox + L2 - 0.4, 0.37, dz - 0.95);
      S.caixa(0.76, 0.72, 0.06, mMesa, ox + L2 - 0.4, 0.37, dz + 0.95);
      S.caixa(0.22, 0.03, 0.5, S.mat(0x2a2f36), ox + L2 - 0.55, 0.8, dz, null, true);
      S.caixa(0.1, 0.03, 0.07, S.mat(0x2a2f36), ox + L2 - 0.55, 0.8, dz + 0.4, null, true);
      S.colisorRet(ox + L2 - 0.82, ox + L2, dz - 1.0, dz + 1.0);
      var cad = S.grupo(ox + L2 - 1.2, 0, dz);
      S.caixa(0.46, 0.06, 0.46, S.mat(0x2f6fc0), 0, 0.46, 0, cad);
      S.caixa(0.06, 0.5, 0.46, S.mat(0x2f6fc0), -0.22, 0.74, 0, cad);
      S.caixa(0.05, 0.42, 0.05, S.mat(0x555555), 0, 0.23, 0, cad, true);

      var gTv = S.grupo(ox + L2 - 0.05, 1.85, dz);
      gTv.rotation.y = -Math.PI / 2;
      var moldura = S.caixa(2.3, 1.36, 0.06, S.mat(0x15171b), 0, 0, -0.02, gTv);
      PT.tv = { grupo: gTv, telas: [], rotulos: [] };
      var desligada = new THREE.MeshBasicMaterial({ color: 0x050607 });
      PT.tv.desligada = desligada;
      var nomes = ['CAM 1 · BANCO', 'CAM 2 · ENTRADA', 'CAM 3 · RUA D', 'CAM 4 · FUNDOS'];
      for (var i = 0; i < 4; i++) {
        var qx = (i % 2 ? 0.555 : -0.555);
        var qy = (i < 2 ? 0.32 : -0.32);
        var tela = S.plano(1.08, 0.62, desligada, qx, qy, 0.012, gTv);
        PT.tv.telas.push(tela);
        var texR = T.texto(96, 12, nomes[i] + '  ● REC', { cor: '#FFFFFF', fonte: 'bold 7px Arial' });
        var rot = S.plano(0.5, 0.06, new THREE.MeshBasicMaterial({ map: texR, transparent: true }), qx - 0.25, qy + 0.26, 0.016, gTv);
        rot.visible = false;
        PT.tv.rotulos.push(rot);
      }
      S.interativo([moldura].concat(PT.tv.telas), {
        id: 'tv',
        nome: 'TV das câmeras de segurança',
        ancora: new THREE.Vector3(ox + L2 - 1.5, 0, dz + 1.3),
        setaY: 2.9
      });
      PT.luzTv = S.matUnico(0xdfe6e6, { emissive: 0x000000 });
      S.caixa(0.12, 0.06, 1.6, PT.luzTv, ox + L2 - 0.07, H - 0.3, dz, null, true);

      camerasDeSeguranca();
      CI.camera = { pos: new THREE.Vector3(ox, 5.1, oz + 6.3), alvo: new THREE.Vector3(ox, 0.55, oz - 0.45) };
      CI.tomadaRack = { pos: [rx + 0.9, 1.75, rz + 2.1], alvo: [rx, 1.2, rz] };
      CI.tomadaTv = { pos: [ox + 0.6, 1.9, dz + 1.6], alvo: [ox + L2, 1.8, dz] };
      PT.desenharRack();
    };

    // ---- Câmeras de segurança: o bairro renderizado em texturas pequenas ----
    function camerasDeSeguranca() {
      var P = S.PONTO;
      var defs = [
        { pos: [P.poste.x - 0.1, 2.85, P.poste.z - 0.15], alvo: [39.3, 0.5, 10.5] },
        { pos: [P.central.x0 + 0.05, 2.45, P.central.z1 + 0.1], alvo: [35.5, 0.5, 15.5] },
        { pos: [35.1, 3.2, 8.4], alvo: [31, 0, 16] },
        { pos: [44.8, 3.6, 8.6], alvo: [40, 0, 3] }
      ];
      PT.feeds = defs.map(function (d, i) {
        var cam = new THREE.PerspectiveCamera(62, 1.74, 0.1, 55);
        cam.position.set(d.pos[0], d.pos[1], d.pos[2]);
        cam.lookAt(d.alvo[0], d.alvo[1], d.alvo[2]);
        var rt = new THREE.WebGLRenderTarget(112, 64, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
        return { cam: cam, rt: rt, mat: new THREE.MeshBasicMaterial({ map: rt.texture }), tela: PT.tv.telas[i] };
      });
      PT.feedVez = 0;
    }

    PT.ligarTv = function (ligada) {
      PT.tv.telas.forEach(function (t, i) {
        t.material = ligada ? PT.feeds[i].mat : PT.tv.desligada;
      });
      PT.tv.rotulos.forEach(function (r) { r.visible = ligada; });
    };

    // Uma câmera a cada dois quadros, e só quando o jogador está na central.
    var quadro = 0;
    PT.atualizarTv = function () {
      if (!S.estado || !S.estado.energia || !PT.feeds || !S.area || S.area.id !== 'central') return;
      quadro++;
      if (quadro % 2) return;
      var f = PT.feeds[PT.feedVez];
      PT.feedVez = (PT.feedVez + 1) % PT.feeds.length;
      var bairro = S.areas.bairro.grupo;
      var dentro = S.areas.central.grupo;
      bairro.visible = true;
      dentro.visible = false;
      S.ambiente('bairro');
      var sombra = S.renderer.shadowMap.autoUpdate;
      S.renderer.shadowMap.autoUpdate = false;
      S.renderer.setRenderTarget(f.rt);
      S.renderer.render(S.cena, f.cam);
      S.renderer.setRenderTarget(null);
      S.renderer.shadowMap.autoUpdate = sombra;
      bairro.visible = false;
      dentro.visible = true;
      S.ambiente('central');
    };

    // ---- LEDs do rack (switch, roteador via satélite, nobreak) ---------------
    PT.desenharRack = function () {
      if (!PT.texRack) return;
      var E = S.estado || {};
      var t = S.agora() / 1000;
      var ligado = !!E.energia;
      var online = ligado && E.satelite === 'online';
      PT.texRack.redesenhar(function (ctx, w, h) {
        ctx.fillStyle = '#16191E';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#3A3F46';
        ctx.fillRect(2, 0, 2, h);
        ctx.fillRect(w - 4, 0, 2, h);
        // Roteador via satélite.
        ctx.fillStyle = '#E9EDF2';
        ctx.fillRect(6, 6, w - 12, 9);
        ctx.fillStyle = '#0B4F9C';
        ctx.font = 'bold 5px Arial';
        ctx.fillText('SAT', 8, 13);
        var leds = [
          ligado ? '#39FF6A' : '#2A3530',
          !ligado ? '#2A3530' : online ? '#39FF6A' : (Math.sin(t * 8) > 0 ? '#FFB020' : '#2A3530'),
          online ? '#39FF6A' : '#2A3530',
          online && Math.sin(t * 11) > 0 ? '#39FF6A' : (online ? '#1F9A40' : '#2A3530')
        ];
        leds.forEach(function (c, i) {
          ctx.fillStyle = c;
          ctx.fillRect(22 + i * 5, 9, 3, 2);
        });
        // Patch panel com etiquetas.
        ctx.fillStyle = '#2B3036';
        ctx.fillRect(6, 20, w - 12, 9);
        for (var i = 0; i < 6; i++) {
          ctx.fillStyle = '#F1F0EC';
          ctx.fillRect(8 + i * 5.5, 21, 4, 2);
          ctx.fillStyle = '#0A0C0F';
          ctx.fillRect(8 + i * 5.5, 24, 4, 3);
        }
        // Patch cords coloridos descendo para o switch.
        var cores = ['#2D7FE0', '#2D7FE0', '#F7941D', '#39C46A', '#2D7FE0', '#E9E9EA'];
        cores.forEach(function (c, i) {
          ctx.fillStyle = c;
          ctx.fillRect(9 + i * 5.5, 27, 2, 11);
        });
        // Switch.
        ctx.fillStyle = '#3A434F';
        ctx.fillRect(6, 38, w - 12, 10);
        for (var k = 0; k < 8; k++) {
          var x = 8 + k * 4.2;
          ctx.fillStyle = '#0A0C0F';
          ctx.fillRect(x, 42, 3, 4);
          var usado = k < 4 || (k === 4 && E.conectadoCabo);
          var pisca = online && usado && Math.sin(t * 9 + k * 1.7) > 0;
          ctx.fillStyle = ligado && usado ? (pisca ? '#39FF6A' : '#1F9A40') : '#1D2A1F';
          ctx.fillRect(x, 39, 2, 2);
        }
        // Organizador de cabos.
        ctx.fillStyle = '#23272D';
        ctx.fillRect(6, 52, w - 12, 6);
        ctx.fillStyle = '#3A3F46';
        for (var m = 8; m < w - 8; m += 4) ctx.fillRect(m, 53, 2, 4);
        // Espaço vazio e nobreak embaixo.
        ctx.fillStyle = '#1E2227';
        ctx.fillRect(6, 62, w - 12, 26);
        ctx.fillStyle = '#2A2F36';
        ctx.fillRect(6, 90, w - 12, 18);
        ctx.fillStyle = ligado ? '#2FA35A' : '#1D2A1F';
        ctx.fillRect(10, 94, 14, 8);
        ctx.fillStyle = ligado ? '#CFF5D9' : '#26302A';
        ctx.font = '5px Arial';
        ctx.fillText(ligado ? '100%' : '', 12, 100);
        ctx.fillStyle = '#AFC2D8';
        ctx.fillText('NOBREAK', 27, 100);
      });
    };
  });


  /* ---- 50-personagem.js ---- */

  /* ================================================================== */
  secao('P01-personagem', function () {
    var PELES = ['#F2C9A5', '#DDA67E', '#BF8159', '#946042', '#62402A'];
    var CABELOS = ['#1C140F', '#3B2416', '#6B4423', '#C9A15A', '#0E0E0E'];
    var CAMISAS = ['#2F6FC0', '#C8323B', '#3FA06A', '#F2A33A', '#7A3FA0', '#E9E9EA', '#1F2329', '#E3C35A'];

    function texturaRosto(pele, feminino) {
      return S.textura(16, 16, function (ctx) {
        ctx.fillStyle = pele;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#16120F';
        if (feminino) {
          ctx.fillRect(4, 5, 3, 1);
          ctx.fillRect(9, 5, 3, 1);
          ctx.fillRect(4, 7, 2, 3);
          ctx.fillRect(10, 7, 2, 3);
          ctx.fillRect(3, 7, 1, 1);
          ctx.fillRect(12, 7, 1, 1);
          ctx.fillStyle = 'rgba(214, 90, 90, 0.35)';
          ctx.fillRect(3, 10, 2, 1);
          ctx.fillRect(11, 10, 2, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(7, 9, 2, 2);
          ctx.fillStyle = '#B5475A';
          ctx.fillRect(6, 12, 4, 1);
          ctx.fillRect(7, 13, 2, 1);
        } else {
          ctx.fillRect(3, 5, 4, 1);
          ctx.fillRect(9, 5, 4, 1);
          ctx.fillRect(4, 7, 2, 3);
          ctx.fillRect(10, 7, 2, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(7, 9, 2, 2);
          ctx.fillStyle = '#7A3B2E';
          ctx.fillRect(6, 12, 4, 1);
        }
      });
    }

    // Camiseta simples com uma faixa (roupa de casa, sem uniforme).
    function texturaCamisa(cor, frente) {
      return S.textura(32, 32, function (ctx) {
        ctx.fillStyle = cor;
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(11, 0, 10, 3);
        if (frente) {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillRect(10, 11, 12, 2);
          ctx.fillRect(13, 15, 6, 2);
        }
      });
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
    S.texturaNome = texturaNome;

    // Personagem "blocado", com visual gerado pelo nome.
    S.criarPersonagem = function (nome, genero) {
      var feminino = genero === 'f';
      var h = S.hashTexto(nome || 'aluno');
      var pele = PELES[h % PELES.length];
      var cabelo = CABELOS[(h >>> 3) % CABELOS.length];
      var estilo = (h >>> 6) % 3;
      var camisa = CAMISAS[(h >>> 9) % CAMISAS.length];

      var mPele = S.mat(parseInt(pele.slice(1), 16));
      var mCabelo = S.mat(parseInt(cabelo.slice(1), 16));
      var mCalca = S.mat(feminino ? 0x30466e : 0x3e5c80);
      var mTenis = S.mat(0xf4f4f4);
      var mSola = S.mat(0x222222);
      var mCamisa = S.mat(parseInt(camisa.slice(1), 16));
      var mFrente = new THREE.MeshLambertMaterial({ map: texturaCamisa(camisa, true) });
      var mCostas = new THREE.MeshLambertMaterial({ map: texturaCamisa(camisa, false) });
      var mRosto = new THREE.MeshLambertMaterial({ map: texturaRosto(pele, feminino) });

      var raiz = new THREE.Group();
      S.cena.add(raiz);
      var corpo = new THREE.Group();
      raiz.add(corpo);

      function g(x, y, z, p) {
        var gr = new THREE.Group();
        gr.position.set(x, y, z);
        p.add(gr);
        return gr;
      }
      function perna(x) {
        var piv = g(x, 0.74, 0, corpo);
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
        var piv = g(x, 1.27, 0, corpo);
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
      if (feminino) {
        if (estilo === 0) {
          S.caixa(0.56, 0.14, 0.52, mCabelo, 0, 1.91, -0.01, corpo);
          S.caixa(0.56, 0.08, 0.06, mCabelo, 0, 1.83, 0.23, corpo);
          S.caixa(0.58, 0.8, 0.1, mCabelo, 0, 1.52, -0.25, corpo);
          S.caixa(0.07, 0.56, 0.3, mCabelo, -0.285, 1.6, -0.07, corpo);
          S.caixa(0.07, 0.56, 0.3, mCabelo, 0.285, 1.6, -0.07, corpo);
        } else if (estilo === 1) {
          S.caixa(0.56, 0.14, 0.52, mCabelo, 0, 1.91, -0.01, corpo);
          S.caixa(0.56, 0.34, 0.08, mCabelo, 0, 1.73, -0.25, corpo);
          S.caixa(0.06, 0.22, 0.3, mCabelo, -0.28, 1.78, -0.08, corpo);
          S.caixa(0.06, 0.22, 0.3, mCabelo, 0.28, 1.78, -0.08, corpo);
          S.caixa(0.18, 0.06, 0.16, S.mat(0xf7941d), 0, 1.84, -0.32, corpo);
          S.caixa(0.16, 0.5, 0.14, mCabelo, 0, 1.56, -0.34, corpo);
        } else {
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

      // Notebook embaixo do braço esquerdo e cabo enrolado na mão direita.
      var nbMao = S.caixa(0.05, 0.36, 0.26, S.mat(0x3b4048), -0.05, -0.42, 0.06, bE.piv);
      nbMao.visible = false;
      var rolo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 4, 8), S.mat(S.COR.caboAzul));
      rolo.position.set(0, -0.6, 0.12);
      rolo.visible = false;
      bD.piv.add(rolo);

      var etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNome(nome), depthTest: false, transparent: true }));
      etiqueta.scale.set(1.3, 0.2, 1);
      etiqueta.position.set(0, 2.32, 0);
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
        nbMao: nbMao,
        rolo: rolo,
        etiqueta: etiqueta,
        fase: 0,
        angulo: Math.PI,
        andando: false,
        sentado: false,
        digitando: false
      };
    };

    S.personagemCarregando = function (notebook, cabo) {
      var p = S.personagem;
      if (!p) return;
      p.nbMao.visible = !!notebook;
      p.rolo.visible = !!cabo;
    };

    S.posicionarPersonagem = function (x, z, angulo) {
      var p = S.personagem;
      p.raiz.position.set(x, S.alturaChao(x, z), z);
      if (angulo !== undefined) {
        p.angulo = angulo;
        p.raiz.rotation.y = angulo;
      }
    };
  });

  /* ================================================================== */
  secao('P02-movimento-camera', function () {
    var desejada = null;
    var alvo = null;
    var alvoAtual = null;

    S.alturaChao = function (x, z) {
      if (S.area && S.area.id === 'bairro' && S.dentro(S.PONTO.laje, x, z)) return S.PONTO.laje.y;
      return 0;
    };

    function livre(x, z) {
      if (S.area && S.area.id === 'bairro') {
        var L = S.MAPA.limites;
        if (x < L.x0 || x > L.x1 || z < L.z0 || z > L.z1) return false;
      }
      var cs = S.colisores;
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return false;
      }
      return true;
    }
    S.posicaoLivre = livre;

    S.velocidadeAtual = function () {
      if (S.area && S.area.id !== 'bairro') return S.CFG.velocidadeDentro;
      return S.CFG.velocidade;
    };

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
      var quer = len > 0.15;
      if (p.sentado && quer && S.fase === 'jogo') S.jogo.levantar();
      p.andando = quer && !p.sentado;
      if (p.andando) {
        dx /= len;
        dz /= len;
        var passo = S.velocidadeAtual() * intensidade * dt;
        var pos = p.raiz.position;
        var nx = pos.x + dx * passo;
        var nz = pos.z + dz * passo;
        if (livre(nx, pos.z)) pos.x = nx;
        if (livre(pos.x, nz)) pos.z = nz;
        p.angulo += S.difAngulo(p.angulo, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
        p.raiz.rotation.y = p.angulo;
        p.fase += dt * 10 * intensidade;
        if (S.jogo) S.jogo.registrarAtividade();
      }
      p.raiz.position.y += (S.alturaChao(p.raiz.position.x, p.raiz.position.z) - p.raiz.position.y) * Math.min(1, dt * 15);
      var k = Math.min(1, dt * 14);
      if (p.sentado) {
        p.pernaE.rotation.x += (-Math.PI / 2 - p.pernaE.rotation.x) * k;
        p.pernaD.rotation.x += (-Math.PI / 2 - p.pernaD.rotation.x) * k;
        var dig = p.digitando ? Math.sin(S.agora() / 90) * 0.06 : 0;
        p.bracoE.rotation.x += (-0.9 + dig - p.bracoE.rotation.x) * k;
        p.bracoD.rotation.x += (-0.9 - dig - p.bracoD.rotation.x) * k;
        p.corpo.position.y += (-0.22 - p.corpo.position.y) * k;
        return;
      }
      var bal = p.andando ? Math.sin(p.fase) * 0.65 : 0;
      p.pernaE.rotation.x += (bal - p.pernaE.rotation.x) * k;
      p.pernaD.rotation.x += (-bal - p.pernaD.rotation.x) * k;
      var alvoE = p.nbMao.visible ? -0.15 : -bal * 0.8;
      var alvoD = p.gestoAte && S.agora() < p.gestoAte ? -2.85 : p.rolo.visible ? -0.45 : bal * 0.8;
      p.bracoE.rotation.x += (alvoE - p.bracoE.rotation.x) * k;
      p.bracoD.rotation.x += (alvoD - p.bracoD.rotation.x) * k;
      p.bracoE.rotation.z += ((p.nbMao.visible ? -0.12 : 0) - p.bracoE.rotation.z) * k;
      p.corpo.position.y = p.andando ? Math.abs(Math.sin(p.fase)) * 0.05 : Math.sin(S.agora() / 600) * 0.008;
    };

    // Posição da câmera de jogo para cada situação (rua, central, casa, sentado).
    S.poseCamera = function (pos, saidaPos, saidaAlvo) {
      var p = S.personagem;
      var esticada = S.camera.aspect < 1.5 ? 1.15 : 1;
      // Dentro de casa e da central: câmera fixa, enquadrando o cômodo inteiro.
      if (S.area && S.area.id === 'apto') {
        var O = S.APTO;
        saidaPos.set(O.ox, 4.7 * esticada, O.oz + 5.5 * esticada);
        saidaAlvo.set(O.ox, 0.45, O.oz - 0.45);
        return;
      }
      if (S.area && S.area.id === 'central') {
        var CI = S.centralInt.camera;
        saidaPos.set(CI.pos.x, CI.pos.y * esticada, CI.pos.z + (esticada - 1) * 5);
        saidaAlvo.copy(CI.alvo);
        return;
      }
      if (p && p.sentado) {
        saidaPos.set(pos.x + 0.9, 2.1, pos.z + 3.0 * esticada);
        saidaAlvo.set(pos.x - 0.1, 0.95, pos.z + 0.3);
        return;
      }
      saidaPos.set(pos.x, 8.6 * esticada, pos.z + 8.4 * esticada);
      saidaAlvo.set(pos.x, 0.9, pos.z - 0.9);
    };

    S.atualizarCamera = function (dt, imediato) {
      if (!desejada) {
        desejada = new THREE.Vector3();
        alvo = new THREE.Vector3();
        alvoAtual = new THREE.Vector3();
      }
      S.poseCamera(S.personagem.raiz.position, desejada, alvo);
      if (imediato) {
        S.camera.position.copy(desejada);
        alvoAtual.copy(alvo);
      } else {
        var k = 1 - Math.exp(-dt * 5);
        S.camera.position.lerp(desejada, k);
        alvoAtual.lerp(alvo, k);
      }
      S.camera.lookAt(alvoAtual);
    };

    // ---- Prédios na frente do personagem ficam transparentes -------------
    var ray = null;
    var vAlvo = null;
    var vDir = null;
    S.atualizarOclusao = function (dt) {
      var a = S.area;
      if (!a || !a.oclusores.length) return;
      if (!ray) {
        ray = new THREE.Raycaster();
        vAlvo = new THREE.Vector3();
        vDir = new THREE.Vector3();
        a.malhasOclusao = null;
      }
      if (!a.malhasOclusao) {
        a.malhasOclusao = [];
        a.oclusores.forEach(function (o) {
          o.mats = [];
          o.meshes.forEach(function (m) {
            a.malhasOclusao.push(m);
            (Array.isArray(m.material) ? m.material : [m.material]).forEach(function (mt) {
              if (o.mats.indexOf(mt) < 0) o.mats.push(mt);
            });
          });
        });
      }
      a.oclusores.forEach(function (o) { o.alvo = 1; });
      var p = S.personagem.raiz.position;
      [1.0, 1.9].forEach(function (altura) {
        vAlvo.set(p.x, p.y + altura, p.z);
        vDir.subVectors(vAlvo, S.camera.position);
        var dist = vDir.length();
        vDir.normalize();
        ray.set(S.camera.position, vDir);
        ray.far = dist - 0.3;
        ray.intersectObjects(a.malhasOclusao, false).forEach(function (h) {
          var o = h.object.userData.oclusor;
          if (o) o.alvo = 0.25;
        });
      });
      a.oclusores.forEach(function (o) {
        if (Math.abs(o.opacidade - o.alvo) < 0.01) return;
        o.opacidade += (o.alvo - o.opacidade) * Math.min(1, dt * 8);
        if (Math.abs(o.opacidade - o.alvo) < 0.01) o.opacidade = o.alvo;
        var transp = o.opacidade < 0.99;
        o.mats.forEach(function (mt) {
          if (mt.transparent !== transp) {
            mt.transparent = transp;
            mt.needsUpdate = true;
          }
          mt.opacity = o.opacidade;
          mt.depthWrite = !transp;
        });
      });
    };
  });


  /* ---- 60-entrada.js ---- */

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
      if (digitando(e) && k !== 'escape') return;
      if (BLOQUEAR.indexOf(k) >= 0) e.preventDefault();
      if (k === 'escape') {
        var m = S.ui.modalAberto();
        if (m && m.cancelavel !== false) m.fechar();
        else if (S.telaPausa && S.telaPausa.fundo.isConnected) {
          S.telaPausa.fechar();
          S.telaPausa = null;
          S.pausado = !!S.ui.modalAberto() || S.fase !== 'jogo';
        }
        return;
      }
      if (S.fase !== 'jogo' || S.pausado) return;
      S.teclas[k] = true;
      if (e.repeat) return;
      if (k === 'e' || k === 'enter') S.jogo.usarProximo();
      if (k === 'h') S.ui.mostrarComandos(false);
      if (k === 'm') S.minigames.mapa();
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
        ray.far = 40;
        var hits = ray.intersectObjects(S.interativos, false);
        for (var i = 0; i < hits.length; i++) {
          var o = hits[i].object;
          // Prédio transparente na frente não bloqueia o clique.
          if (!o.visible) continue;
          return o.userData.info;
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
      if (S.renderer) S.renderer.domElement.style.cursor = info ? 'pointer' : 'default';
    }

    S.atualizarHover = function () {
      if (!mouse || !mouseMudou || S.toque) return;
      mouseMudou = false;
      definirHover(S.pausado ? null : S.pick());
      S.atualizarDicaMouse(hoverAtual, mouseTela);
    };

    S.limparHover = function () {
      definirHover(null);
      if (S.atualizarDicaMouse) S.atualizarDicaMouse(null, null);
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
      etiqueta.style.left = Math.min(pos.x + 14, S.raiz.clientWidth - 180) + 'px';
      etiqueta.style.top = (pos.y + 16) + 'px';
      etiqueta.style.display = 'block';
    };
  });


  /* ---- 70-jogo.js ---- */

  /* ================================================================== */
  secao('J01-estado-e-objetivos', function () {
    var E = S.estado = {
      viuOffline: false,
      tentouEnviar: false,
      pegouNotebook: false,
      pegouCabo: false,
      chegouPonto: false,
      viuMapa: false,
      energia: false,
      energiaEm: 0,
      satelite: 'desligado', // desligado | conectando | online
      conectadoCabo: false,
      keystone: null,
      redeConectada: false,
      ip: null,
      enviado: false,
      livre: false
    };

    var J = S.jogo = {
      indice: -1,
      progressoEm: 0,
      nivelDica: 0,
      dicas: 0,
      concluido: false
    };

    function naArea(id) {
      return S.area && S.area.id === id;
    }

    J.MISSOES = [
      {
        id: 'enviar1',
        texto: 'Use o notebook na mesa do quarto para enviar a sua atividade online.',
        feita: function () { return E.tentouEnviar; },
        alvos: function () { return ['notebook']; },
        dica1: 'O notebook está na mesa, perto da janela. Chegue perto e aperte E (ou USAR).',
        dica2: 'No notebook, abra o Navegador para entrar no Portal do Aluno.'
      },
      {
        id: 'pegar',
        texto: function () {
          var n = (E.pegouNotebook ? 1 : 0) + (E.pegouCabo ? 1 : 0);
          return 'Pegue o notebook e o seu cabo de rede (UTP) para levar ao ponto (' + n + '/2).';
        },
        feita: function () { return E.pegouNotebook && E.pegouCabo; },
        alvos: function () {
          var l = [];
          if (!E.pegouNotebook) l.push('notebook');
          if (!E.pegouCabo) l.push('cabo');
          return l;
        },
        dica1: 'O cabo de rede azul está na estante, embaixo do roteador.',
        dica2: 'Use o notebook (na mesa) e o cabo azul (na estante) para levar os dois.'
      },
      {
        id: 'ir',
        texto: 'Vá até o Ponto de Internet Comunitário. Aperte M (ou MAPA) para ver o caminho.',
        feita: function () { return E.chegouPonto; },
        alvos: function () { return naArea('apto') ? ['portaApto'] : ['@ponto']; },
        dica1: 'Abra o mapa: o ponto fica no terreno ao lado da escola (EETI), entre a Rua A e a Rua Principal.',
        dica2: 'Saia pelo portão do condomínio, suba a Rua C até a Rua A, siga a Rua A até a Rua D e desça: o ponto fica à direita.'
      },
      {
        id: 'energia',
        texto: 'O ponto está desligado. Entre na central e ligue o transformador.',
        feita: function () { return E.energia; },
        alvos: function () { return naArea('central') ? ['transformador'] : ['portaCentral']; },
        dica1: 'A central é a casinha verde com o letreiro CENTRAL. Use a porta para entrar.',
        dica2: 'O transformador é o painel cinza na parede da esquerda, dentro da central. Use-o e ligue a alavanca.'
      },
      {
        id: 'conectar',
        texto: 'Volte ao banco coberto e conecte o notebook numa tomada de rede (keystone) do lado do banco.',
        feita: function () { return E.conectadoCabo; },
        alvos: function () { return ['keystoneE', 'keystoneD']; },
        dica1: 'As tomadas de rede ficam nos pedestais, uma em cada ponta do banco.',
        dica2: 'Use uma das tomadas: o cabo vai da porta RJ45 do notebook até a tomada.'
      },
      {
        id: 'rede',
        texto: 'No notebook, clique no ícone de rede e conecte em "WiFi Comunitário Senac" (sem senha).',
        feita: function () { return E.redeConectada; },
        alvos: function () { return ['notebookBanco']; },
        dica1: 'Use o notebook no banco. O ícone de rede fica no canto da barra de tarefas.',
        dica2: 'Escolha "WiFi Comunitário Senac" e clique em Conectar. O IP chega sozinho (DHCP).'
      },
      {
        id: 'enviar',
        texto: 'Abra o Navegador, entre no Portal do Aluno e envie a atividade para o professor.',
        feita: function () { return E.enviado; },
        alvos: function () { return ['notebookBanco']; },
        dica1: 'No notebook, abra o Navegador. Agora a página do portal vai carregar.',
        dica2: 'No Portal do Aluno, clique em "Enviar atividade".'
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
      var novo = -1;
      for (var i = 0; i < J.MISSOES.length; i++) {
        if (!J.MISSOES[i].feita()) {
          novo = i;
          break;
        }
      }
      var mudou = novo !== J.indice;
      var anterior = J.indice;
      J.indice = novo;
      if (novo === -1) {
        S.ui.definirMissao(0, J.MISSOES.length, E.livre
          ? 'Explore o bairro à vontade. O ponto fica aberto para todo mundo.'
          : 'Atividade enviada!');
        if (mudou) J.progresso();
        if (!J.concluido) {
          J.concluido = true;
          J.concluir();
        }
        return;
      }
      var m = J.MISSOES[novo];
      S.ui.definirMissao(novo + 1, J.MISSOES.length, typeof m.texto === 'function' ? m.texto() : m.texto);
      if (mudou) {
        J.progresso();
        if (anterior >= 0) S.aviso('✔ Feito! Próximo: ' + (typeof m.texto === 'function' ? m.texto() : m.texto), 'ok', 3400);
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
        if (m.id === 'ir') S.ui.destacarMapa(true);
      }
      if (J.nivelDica > 0) {
        var alvos = m.alvos();
        var alvo = null;
        for (var i = 0; i < alvos.length && !alvo; i++) {
          alvo = alvos[i].charAt(0) === '@' ? S.mundo.pontosFixos[alvos[i]] : S.objetos()[alvos[i]];
          if (alvo && alvo.area && alvo.area !== S.area.id) alvo = null;
        }
        if (alvo !== S.mundo.seta.alvo) S.mundo.apontar(alvo);
      }
    };

    J.distancia = function (info) {
      var p = S.personagem.raiz.position;
      var dx = info.ancora.x - p.x;
      var dz = info.ancora.z - p.z;
      return Math.sqrt(dx * dx + dz * dz);
    };

    // Objeto mais adequado ao alcance: prioriza os alvos do objetivo atual.
    J.melhorProximo = function () {
      var m = J.missaoAtual();
      var alvos = m ? m.alvos() : [];
      var melhor = null;
      var melhorNota = Infinity;
      var objs = S.objetos();
      for (var id in objs) {
        if (!Object.prototype.hasOwnProperty.call(objs, id)) continue;
        var info = objs[id];
        var d = J.distancia(info);
        if (d > (info.alcance || S.CFG.alcance)) continue;
        var nota = d + (alvos.indexOf(id) >= 0 ? 0 : 1.2);
        if (nota < melhorNota) {
          melhorNota = nota;
          melhor = info;
        }
      }
      return melhor;
    };

    J.rotulo = function (info) {
      switch (info.id) {
        case 'notebook':
          if (!E.tentouEnviar) return 'Usar o notebook';
          return 'Pegar o notebook';
        case 'cabo': return E.tentouEnviar ? 'Pegar o cabo de rede' : 'Ver o cabo de rede';
        case 'roteadorCasa': return 'Ver o roteador de casa';
        case 'portaApto': return 'Sair de casa';
        case 'portaCasa': return 'Entrar em casa';
        case 'portaCentral': return 'Entrar na central';
        case 'portaSaidaCentral': return 'Sair da central';
        case 'transformador': return E.energia ? 'Ver o transformador (ligado)' : 'Ligar o transformador';
        case 'rack': return 'Ver o rack (switch e roteador)';
        case 'tv': return 'Ver as câmeras';
        case 'keystoneE':
        case 'keystoneD':
          if (E.conectadoCabo) return E.keystone === info.id ? 'Sentar e usar o notebook' : 'Tomada de rede livre';
          return 'Conectar o notebook na tomada';
        case 'notebookBanco': return 'Usar o notebook';
      }
      if (info.condominio) return 'Ver o portão';
      return 'Usar ' + info.nome;
    };

    var ultimoPrompt = 0;
    J.atualizarPrompt = function () {
      var agora = S.agora();
      if (agora - ultimoPrompt < 120) return;
      ultimoPrompt = agora;
      var info = S.personagem.sentado ? null : J.melhorProximo();
      S.ui.definirPrompt(info ? J.rotulo(info) : (S.personagem.sentado ? 'Usar o notebook (ande para levantar)' : null));
    };

    J.usarProximo = function () {
      if (S.personagem.sentado) {
        S.minigames.notebook('ponto');
        return;
      }
      var info = J.melhorProximo();
      if (info) J.usar(info, false);
      else S.aviso('Chegue perto de um objeto para usar.', 'info', 1800);
    };

    J.definirMao = function () {
      var itens = [];
      if (E.pegouNotebook && !E.conectadoCabo) itens.push('Notebook');
      if (E.pegouCabo && !E.conectadoCabo) itens.push('cabo UTP');
      S.ui.definirMao(itens.length ? itens.join(' + ') : null);
      S.personagemCarregando(E.pegouNotebook && !E.conectadoCabo, E.pegouCabo && !E.conectadoCabo);
    };

    // Rótulo do lugar onde o personagem está (canto do objetivo).
    J.lugar = function () {
      if (!S.area) return '';
      if (S.area.id === 'apto') return 'Sua casa · Bloco ' + S.CASA.bloco + ', apto ' + S.CASA.apto;
      if (S.area.id === 'central') return 'Central do Ponto Comunitário';
      var p = S.personagem.raiz.position;
      if (S.dentro(S.MAPA.ponto, p.x, p.z)) return 'Ponto de Internet Comunitário';
      var cs = S.MAPA.condominios;
      for (var i = 0; i < cs.length; i++) {
        if (S.dentro(cs[i], p.x, p.z)) return cs[i].nome + (cs[i].acessivel ? ' (o seu)' : '');
      }
      var rs = S.MAPA.ruas;
      for (var k = 0; k < rs.length; k++) {
        if (S.dentro(rs[k], p.x, p.z)) return rs[k].nome;
      }
      return 'Residencial Ataliba';
    };
  });

  /* ================================================================== */
  secao('J02-acoes', function () {
    var E = S.estado;
    var J = S.jogo;
    var P = S.PONTO;

    J.usar = S.protegido('jogo:usar', function (info) {
      if (S.fase !== 'jogo' || S.pausado) return;
      if (J.distancia(info) > (info.alcance || S.CFG.alcance)) {
        S.aviso('Chegue mais perto: ' + info.nome, 'info', 2000);
        return;
      }
      J.registrarAtividade();
      if (info.condominio) {
        S.aviso('Esse é o ' + info.condominio.nome + ' (blocos ' + info.condominio.blocos.join(' e ') + '). O portão fica trancado: só os moradores têm a chave.', 'info', 4200);
        return;
      }
      var acao = ACOES[info.id];
      if (acao) acao(info);
    });

    var ACOES = {
      notebook: function () {
        if (!E.tentouEnviar) {
          S.minigames.notebook('casa');
          return;
        }
        if (!E.pegouNotebook) {
          E.pegouNotebook = true;
          S.apto.notebook.visible = false;
          S.removerInterativo('notebook', 'apto');
          J.definirMao();
          S.aviso('Notebook desligado e guardado na mochila.', 'ok', 2400);
          J.atualizarMissoes();
        }
      },
      cabo: function () {
        if (!E.tentouEnviar) {
          S.aviso('Seu cabo de rede (UTP), com conector RJ45 nas pontas. Por enquanto, a atividade vem primeiro.', 'info', 3600);
          return;
        }
        E.pegouCabo = true;
        S.apto.rolo.visible = false;
        S.removerInterativo('cabo', 'apto');
        J.definirMao();
        S.aviso('Cabo de rede guardado. Ele vai ligar o notebook na tomada do ponto.', 'ok', 3000);
        J.atualizarMissoes();
      },
      roteadorCasa: function () {
        S.minigames.roteadorCasa();
      },
      portaApto: function () {
        if (!E.tentouEnviar) {
          S.aviso('Antes de sair, use o notebook para enviar a atividade.', 'alerta', 3000);
          return;
        }
        if (!E.pegouNotebook || !E.pegouCabo) {
          S.aviso('Pegue o notebook e o cabo de rede antes de sair.', 'alerta', 3000);
          return;
        }
        J.trocarArea('bairro', S.CASA.saida.x, S.CASA.saida.z, 0, 'Saindo de casa…');
      },
      portaCasa: function () {
        J.trocarArea('apto', S.apto.saida.x, S.apto.saida.z, S.apto.saida.angulo, 'Entrando em casa…');
      },
      portaCentral: function () {
        var e = S.centralInt.entrada;
        J.trocarArea('central', e.x, e.z, e.angulo, 'Entrando na central…', true);
      },
      portaSaidaCentral: function () {
        var e = S.ponto.entradaCentral;
        J.trocarArea('bairro', e.x, e.z, 0, 'Saindo da central…');
      },
      transformador: function () {
        if (E.energia) {
          S.aviso('O transformador já está ligado: ele alimenta o rack, as tomadas, as câmeras e a luz.', 'info', 3600);
          return;
        }
        S.minigames.transformador(J.ligarEnergia);
      },
      rack: function () {
        S.minigames.rack();
      },
      tv: function () {
        if (!E.energia) {
          S.aviso('A TV das câmeras está desligada: o ponto está sem energia.', 'info', 3000);
          return;
        }
        S.aviso('As 4 câmeras de segurança vigiam o banco, a entrada e a rua. As imagens aparecem nesta TV.', 'info', 4200);
      },
      keystoneE: usarKeystone,
      keystoneD: usarKeystone,
      notebookBanco: function () {
        J.sentar(E.keystone);
        S.minigames.notebook('ponto');
      }
    };

    function usarKeystone(info) {
      var k = info.keystone;
      if (!E.energia) {
        S.aviso('Essa tomada de rede está sem sinal: o ponto está desligado. Ligue o transformador na central.', 'alerta', 3800);
        return;
      }
      if (E.conectadoCabo) {
        if (E.keystone === k.id) {
          J.sentar(k.id);
          S.minigames.notebook('ponto');
        } else {
          S.aviso('Seu notebook já está ligado na outra tomada. Essa fica livre para outra pessoa.', 'info', 3200);
        }
        return;
      }
      S.minigames.conectarNotebook(k, function () {
        E.conectadoCabo = true;
        E.keystone = k.id;
        J.definirMao();
        S.ponto.colocarNotebook(k);
        J.sentar(k.id);
        J.atualizarMissoes();
        setTimeout(S.protegido('abrirNotebook', function () {
          if (S.fase === 'jogo' && !S.ui.modalAberto()) S.minigames.notebook('ponto');
        }), 700);
      });
    }

    // ---- Sentar no banco -------------------------------------------------
    J.sentar = function (keystoneId) {
      var k = P.keystones.filter(function (x) { return x.id === keystoneId; })[0] || P.keystones[0];
      var p = S.personagem;
      p.sentado = true;
      p.raiz.position.set(k.sentarX, S.PONTO.laje.y, S.ponto.sentar.z);
      p.angulo = 0;
      p.raiz.rotation.y = 0;
    };

    J.levantar = function () {
      var p = S.personagem;
      if (!p.sentado) return;
      p.sentado = false;
      p.digitando = false;
      p.raiz.position.z = 12.05;
      p.corpo.position.y = 0;
    };

    // ---- Troca de área (casa ↔ bairro) ------------------------------------
    J.trocarArea = function (id, x, z, angulo, texto, carregando) {
      S.fase = 'cena';
      S.teclas = {};
      S.joy.x = 0;
      S.joy.z = 0;
      S.ui.atualizarControlesToque();
      S.ui.cortina(texto, carregando, function () {
        S.usarArea(id);
        S.posicionarPersonagem(x, z, angulo);
        if (id === 'apto') S.posicionarSol(S.APTO.ox, S.APTO.oz);
        else if (id === 'central') S.posicionarSol(S.CENTRAL.ox, S.CENTRAL.oz);
        else S.posicionarSol(x, z);
        S.atualizarCamera(0, true);
        S.mundo.apontar(null);
        J.nivelDica = 0;
      }, function () {
        S.fase = 'jogo';
        S.pausado = !!S.ui.modalAberto();
        S.ui.atualizarControlesToque();
        J.atualizarMissoes();
        if (id === 'bairro' && !E.viuMapa && !E.chegouPonto) {
          S.ui.destacarMapa(true);
          S.aviso('Aperte M (ou o botão do mapa) para ver onde fica o ponto.', 'info', 4200);
        }
      });
    };

    // ---- Energia: o transformador liga tudo ---------------------------------
    J.ligarEnergia = function () {
      var PT = S.ponto;
      E.energia = true;
      E.energiaEm = S.agora();
      E.satelite = 'conectando';
      PT.acenderLed(PT.transformador.led, S.COR.ledVerde);
      PT.lampadas.forEach(function (m) {
        m.emissive.setHex(0xfff2c0);
        m.emissiveIntensity = 1;
      });
      [PT.luzRack, PT.luzTv, PT.luzPorta].forEach(function (m) {
        m.emissive.setHex(0xf4f8f8);
        m.emissiveIntensity = 0.9;
      });
      PT.transformador.piv.rotation.z = 0.6;
      PT.ledsCamera.forEach(function (m) { PT.acenderLed(m, S.COR.ledVermelho); });
      for (var k in PT.keystones) {
        if (Object.prototype.hasOwnProperty.call(PT.keystones, k)) PT.acenderLed(PT.keystones[k].led, S.COR.ledAmbar);
      }
      PT.ligarTv(true);
      PT.desenharRack();
      J.atualizarMissoes();
      S.aviso('Energia ligada! O roteador está se conectando ao satélite…', 'ok', 3600);
      S.cenaCurta({
        falas: [
          { quem: 'aluno', tomada: S.centralInt.tomadaRack, texto: 'As luzes do rack acenderam! O roteador está procurando o satélite...' },
          { quem: 'aluno', tomada: S.centralInt.tomadaTv, texto: 'E a TV das câmeras ligou. Agora é só voltar para o banco e conectar o notebook.' }
        ]
      });
    };

    J.atualizarSatelite = function () {
      if (E.satelite === 'conectando' && S.agora() - E.energiaEm > 4500) {
        E.satelite = 'online';
        var PT = S.ponto;
        for (var k in PT.keystones) {
          if (Object.prototype.hasOwnProperty.call(PT.keystones, k)) PT.acenderLed(PT.keystones[k].led, S.COR.ledVerde);
        }
        if (S.fase === 'jogo') S.aviso('📡 Roteador conectado ao satélite: internet no ar!', 'ok', 3400);
      }
    };

    // ---- Chegada ao ponto ------------------------------------------------
    J.verificarChegada = function () {
      if (E.chegouPonto || !S.area || S.area.id !== 'bairro') return;
      var p = S.personagem.raiz.position;
      if (!S.dentro(P.chegada, p.x, p.z)) return;
      E.chegouPonto = true;
      S.ui.definirBussola(null);
      S.ui.destacarMapa(false);
      J.atualizarMissoes();
      S.cenaCurta({
        falas: [
          { quem: 'aluno', tomada: { pos: [33.2, 3.6, 18.6], alvo: [41.2, 1.1, 10.8] }, texto: 'Cheguei! Esse é o Ponto de Internet Comunitário: banco coberto, tomadas de rede e a central.' },
          { quem: 'aluno', tomada: { pos: [38.5, 1.5, 12.7], alvo: [38.05, 0.5, 10.3] }, texto: 'Hmm... as luzinhas das tomadas estão apagadas. O ponto está desligado.' },
          { quem: 'aluno', tomada: { pos: [41.6, 2.3, 16.2], alvo: [44.6, 1.4, 12.8] }, texto: 'A placa na porta da central diz para ligar o transformador. Vou lá!' }
        ]
      });
    };

    // ---- Fim ---------------------------------------------------------------
    J.concluir = function () {
      if (E.livre) return;
      var esperar = S.protegido('fim', function () {
        if (S.ui.modalAberto() || S.fase !== 'jogo') {
          setTimeout(esperar, 250);
          return;
        }
        S.cenaCurta({
          titulo: 'ATIVIDADE ENVIADA!',
          falas: [
            { quem: 'aluno', tomada: 'sentado', texto: 'Pronto! Atividade enviada para o professor, e ainda deu tempo!' },
            { quem: 'aluno', tomada: { pos: [37.0, 2.4, 17.5], alvo: [42.5, 1.4, 10.5] }, texto: 'Valeu, ponto comunitário! Internet de graça aqui no Ataliba ajuda todo mundo a estudar.' }
          ],
          aoFim: function () { S.ui.mostrarFim(); }
        });
      });
      setTimeout(esperar, 600);
    };
  });

  /* ================================================================== */
  secao('J03-mundo-vivo', function () {
    var E = S.estado;
    var J = S.jogo;
    var P = S.PONTO;
    var PT = S.ponto;

    // Notebook em cima da mesa do abrigo, com o cabo até a tomada do banco.
    PT.colocarNotebook = function (k) {
      var y = P.laje.y;
      var g = new THREE.Group();
      g.position.set(k.sentarX, y + P.mesa.alt + 0.03, (P.mesa.z0 + P.mesa.z1) / 2 - 0.05);
      g.rotation.y = Math.PI; // tela virada para quem está sentado no banco
      S.areas.bairro.grupo.add(g);
      var base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.3), S.mat(0x3b4048));
      base.position.y = 0.012;
      g.add(base);
      var piv = new THREE.Group();
      piv.position.set(0, 0.025, -0.15);
      piv.rotation.x = -0.3;
      g.add(piv);
      var tampa = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.018), S.mat(0x3b4048));
      tampa.position.y = 0.14;
      piv.add(tampa);
      var tela = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), new THREE.MeshBasicMaterial({ map: S.apto.texNotebook }));
      tela.position.set(0, 0.14, 0.011);
      piv.add(tela);
      PT.nb = { grupo: g, k: k };
      S.apto.desenharTelaNotebook(E.redeConectada ? 'online' : 'desktop');
      // Cabo: sai da tomada do pedestal, passa por baixo da mesa e sobe até o notebook.
      g.updateMatrixWorld(true);
      var a = new THREE.Vector3(k.x, y + 0.48, k.z + 0.16);
      var b = S.posMundo(g, new THREE.Vector3(k.lado === 'esquerdo' ? 0.21 : -0.21, 0.012, 0));
      var lado = k.lado === 'esquerdo' ? 1 : -1;
      var curva = new THREE.CatmullRomCurve3([
        a,
        new THREE.Vector3(a.x, y + 0.2, a.z + 0.25),
        new THREE.Vector3(a.x + lado * 0.15, y + 0.04, P.mesa.z0 + 0.1),
        new THREE.Vector3(b.x - lado * 0.05, y + 0.3, P.mesa.z0 + 0.2),
        new THREE.Vector3(b.x - lado * 0.03, b.y - 0.02, b.z),
        b
      ]);
      var cabo = new THREE.Mesh(new THREE.TubeGeometry(curva, 20, 0.012, 4, false), S.mat(S.COR.caboAzul));
      S.areas.bairro.grupo.add(cabo);
      var anterior = S.montando;
      S.montando = S.areas.bairro;
      S.interativo([base, tampa, tela], {
        id: 'notebookBanco',
        nome: 'Seu notebook (na mesa)',
        ancora: new THREE.Vector3(k.sentarX, 0, 12.05),
        setaY: 1.4
      });
      S.montando = anterior;
    };

    // Seta laranja que pula em cima do próximo alvo (dicas).
    S.mundo.montarSeta = function () {
      var seta = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.6, 4),
        new THREE.MeshLambertMaterial({ color: S.COR.laranja, emissive: S.COR.laranja, emissiveIntensity: 0.6 })
      );
      seta.rotation.x = Math.PI;
      seta.visible = false;
      S.cena.add(seta);
      S.mundo.seta = { malha: seta, alvo: null };
      S.mundo.pontosFixos = {
        '@ponto': { area: 'bairro', pos: new THREE.Vector3(40.4, 3.4, 12.4) }
      };
    };

    S.mundo.apontar = function (alvo) {
      var s = S.mundo.seta;
      if (!s) return;
      s.alvo = alvo || null;
      s.malha.visible = !!alvo;
    };

    S.mundo.atualizarSeta = function (t) {
      var s = S.mundo.seta;
      if (!s || !s.alvo) return;
      var x;
      var y;
      var z;
      if (s.alvo.pos) {
        x = s.alvo.pos.x;
        y = s.alvo.pos.y;
        z = s.alvo.pos.z;
      } else {
        var caixa = new THREE.Box3();
        s.alvo.meshes.forEach(function (m) { caixa.expandByObject(m); });
        var c = new THREE.Vector3();
        caixa.getCenter(c);
        x = c.x;
        y = s.alvo.setaY !== undefined ? s.alvo.setaY : caixa.max.y + 0.4;
        z = c.z;
      }
      s.malha.position.set(x, y + Math.abs(Math.sin(t * 4)) * 0.2, z);
      s.malha.rotation.y = t * 2;
    };

    // ---- Caminho até o ponto (mapa e bússola) -----------------------------
    var NOS = {};
    var ARESTAS = [];
    function no(id, x, z) { NOS[id] = { id: id, x: x, z: z }; }
    [-31, 0, 31].forEach(function (x) {
      [-28, 0, 28].forEach(function (z) { no(x + ',' + z, x, z); });
    });
    no('0,14', 0, 14);
    no('31,14', 31, 14);
    no('-31,14', -31, 14);
    no('ponto', 37.0, 12.2);
    function ligar(a, b) { ARESTAS.push([a, b]); }
    [-28, 0, 28].forEach(function (z) {
      ligar('-31,' + z, '0,' + z);
      ligar('0,' + z, '31,' + z);
    });
    [-31, 0, 31].forEach(function (x) {
      ligar(x + ',-28', x + ',0');
      ligar(x + ',0', x + ',14');
      ligar(x + ',14', x + ',28');
    });
    ligar('31,14', 'ponto');

    function dist(a, b) {
      var dx = a.x - b.x;
      var dz = a.z - b.z;
      return Math.sqrt(dx * dx + dz * dz);
    }

    function dijkstra(inicios) {
      // inicios: [{id, custo}] → menor caminho até 'ponto'.
      var d = {};
      var ant = {};
      var feito = {};
      Object.keys(NOS).forEach(function (k) { d[k] = Infinity; });
      inicios.forEach(function (i) {
        if (i.custo < d[i.id]) {
          d[i.id] = i.custo;
          ant[i.id] = null;
        }
      });
      for (;;) {
        var u = null;
        Object.keys(NOS).forEach(function (k) {
          if (!feito[k] && d[k] < Infinity && (u === null || d[k] < d[u])) u = k;
        });
        if (u === null || u === 'ponto') break;
        feito[u] = true;
        ARESTAS.forEach(function (a) {
          var v = a[0] === u ? a[1] : a[1] === u ? a[0] : null;
          if (!v || feito[v]) return;
          var c = d[u] + dist(NOS[u], NOS[v]);
          if (c < d[v]) {
            d[v] = c;
            ant[v] = u;
          }
        });
      }
      var caminho = [];
      var cur = 'ponto';
      while (cur) {
        caminho.unshift(NOS[cur]);
        cur = ant[cur];
      }
      return caminho;
    }

    function projetar(p, a, b) {
      var abx = b.x - a.x;
      var abz = b.z - a.z;
      var t = ((p.x - a.x) * abx + (p.z - a.z) * abz) / (abx * abx + abz * abz);
      t = Math.max(0, Math.min(1, t));
      return { x: a.x + abx * t, z: a.z + abz * t };
    }

    // Lista de pontos (x, z) do lugar atual até o ponto de internet.
    S.caminhoAtePonto = function (x, z) {
      var c1 = S.MAPA.condominios[0];
      var prefixo = [];
      var inicio = { x: x, z: z };
      if (S.area && S.area.id === 'apto') {
        inicio = { x: S.CASA.saida.x, z: S.CASA.saida.z };
      }
      if (S.dentro(c1, inicio.x, inicio.z)) {
        prefixo = [inicio, { x: inicio.x, z: 14 }, { x: c1.x1 - 0.4, z: 14 }];
        var cam = dijkstra([{ id: '0,14', custo: 0 }]);
        return prefixo.concat(cam);
      }
      // Na rua: projeta no trecho de rua mais perto.
      var melhor = null;
      ARESTAS.forEach(function (a) {
        var pr = projetar(inicio, NOS[a[0]], NOS[a[1]]);
        var dd = dist(pr, inicio);
        if (!melhor || dd < melhor.d) melhor = { d: dd, pr: pr, a: a };
      });
      var cam2 = dijkstra([
        { id: melhor.a[0], custo: dist(melhor.pr, NOS[melhor.a[0]]) },
        { id: melhor.a[1], custo: dist(melhor.pr, NOS[melhor.a[1]]) }
      ]);
      // Se já passou do primeiro nó (está entre ele e o próximo), corta o vaivém.
      if (cam2.length > 1) {
        var n0 = cam2[0];
        var n1 = cam2[1];
        var noTrecho = (melhor.a[0] === n0.id && melhor.a[1] === n1.id) || (melhor.a[1] === n0.id && melhor.a[0] === n1.id);
        if (noTrecho) cam2.shift();
      }
      return [inicio, melhor.pr].concat(cam2);
    };

    var ultimaBussola = 0;
    J.atualizarBussola = function () {
      var m = J.missaoAtual();
      if (!m || m.id !== 'ir' || S.area.id !== 'bairro' || (!E.viuMapa && J.nivelDica < 1)) {
        S.ui.definirBussola(null);
        return;
      }
      var agora = S.agora();
      if (agora - ultimaBussola < 200) return;
      ultimaBussola = agora;
      var p = S.personagem.raiz.position;
      var cam = S.caminhoAtePonto(p.x, p.z);
      var total = 0;
      for (var i = 1; i < cam.length; i++) total += dist(cam[i - 1], cam[i]);
      var alvo = cam[cam.length - 1];
      for (var k = 1; k < cam.length; k++) {
        if (dist(cam[k], p) > 2.2) {
          alvo = cam[k];
          break;
        }
      }
      S.ui.definirBussola(Math.atan2(alvo.x - p.x, -(alvo.z - p.z)), total);
    };

    // Tudo o que muda sozinho no bairro a cada quadro.
    var ultimoRack = 0;
    S.atualizarMundo = function (dt) {
      var agora = S.agora();
      J.atualizarSatelite();
      if (S.area && S.area.id === 'bairro' && S.personagem) {
        var p = S.personagem.raiz.position;
        S.posicionarSol(p.x, p.z);
      }
      if (S.area && S.area.id === 'central' && E.energia && agora - ultimoRack > 120) {
        ultimoRack = agora;
        PT.desenharRack();
      }
      S.mundo.atualizarSeta(agora / 1000);
    };
  });


  /* ---- 75-telas2d.js ---- */

  /* ================================================================== */
  secao('M01-telas-base', function () {
    var C = S.CSS;
    var MG = S.minigames = {};

    MG.mensagem = function (pai) {
      var el = S.el('div', { minHeight: '20px', marginTop: '10px', fontWeight: '700', fontSize: '14px' }, '', pai);
      return function (texto, tipo) {
        el.textContent = texto || '';
        el.style.color = tipo === 'erro' ? C.vermelho : tipo === 'ok' ? C.verde : C.amarelo;
      };
    };

    MG.caixaInfo = function (texto, pai, tipo) {
      return S.el('div', {
        background: tipo === 'aviso' ? '#FFF4D6' : '#E3EEFB',
        border: '2px solid ' + (tipo === 'aviso' ? '#D9A21B' : '#7FA7D9'),
        borderRadius: '6px',
        padding: '6px 8px',
        margin: '8px 0',
        fontSize: '12px',
        color: tipo === 'aviso' ? '#5A4300' : '#14365F',
        lineHeight: '1.4'
      }, texto, pai);
    };

    // Bolinha de LED para os painéis 2D.
    MG.led = function (pai, cor, rotulo) {
      var w = S.el('div', { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700' }, null, pai);
      var l = S.el('div', { width: '10px', height: '10px', borderRadius: '50%', background: cor, border: '1px solid #071430', boxShadow: cor === '#2A3530' ? 'none' : '0 0 6px ' + cor }, null, w);
      S.el('span', null, rotulo, w);
      return l;
    };
  });

  /* ================================================================== */
  secao('M02-notebook', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var E = S.estado;
    var J = S.jogo;
    var ARQUIVO = 'minha_atividade.pdf';
    var PORTAL = 'portal.aluno.eeti';

    // modo 'casa': internet de casa caiu. modo 'ponto': conectado no ponto comunitário.
    MG.notebook = function (modo) {
      var casa = modo === 'casa';
      var p = S.personagem;
      if (!casa) p.digitando = true;
      S.apto.desenharTelaNotebook(casa ? 'desktop' : (E.redeConectada ? 'online' : 'desktop'));
      var m = S.ui.abrirModal('Notebook · área de trabalho', {
        largura: '760px',
        aoFechar: function () {
          p.digitando = false;
          if (casa) {
            S.apto.desenharTelaNotebook(E.viuOffline ? 'offline' : 'desktop');
            if (E.viuOffline && !E.tentouEnviar) S.cenaPensamento();
          } else {
            S.apto.desenharTelaNotebook(E.redeConectada ? 'online' : 'desktop');
          }
        }
      });
      var ap = S.ui.compacto();
      var tela = S.el('div', {
        background: 'linear-gradient(160deg, #0B4F9C, #062A55)',
        border: '3px solid #071430',
        borderRadius: '8px',
        minHeight: ap ? '200px' : '300px',
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }, null, m.corpo);
      var area = S.el('div', { flex: '1 1 auto', padding: ap ? '8px' : '12px', position: 'relative' }, null, tela);
      var icones = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, area);
      var janelaAtual = null;

      function abrirJanela(titulo, larguraMax) {
        if (janelaAtual) janelaAtual.remove();
        var j = S.el('div', {
          background: '#F2F5F9',
          color: '#10203A',
          border: '3px solid #071430',
          borderRadius: '8px',
          marginTop: '10px',
          maxWidth: larguraMax || 'none',
          overflow: 'hidden'
        }, null, area);
        var topo = S.el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#DCE5F0', padding: '4px 6px 4px 10px', gap: '8px' }, null, j);
        S.el('div', { fontWeight: '700', fontSize: '13px', color: '#0B4F9C' }, titulo, topo);
        var x = S.ui.botao('✕', 'claro', function () {
          j.remove();
          janelaAtual = null;
        }, topo);
        S.estilo(x, { padding: '1px 8px', fontSize: '12px', boxShadow: 'none' });
        x.setAttribute('aria-label', 'Fechar ' + titulo);
        var corpo = S.el('div', { padding: ap ? '8px 10px' : '12px 14px' }, null, j);
        janelaAtual = j;
        return corpo;
      }

      function icone(nome, simbolo, aoAbrir) {
        var b = S.el('button', {
          width: '86px',
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
        S.el('div', { fontSize: '26px', lineHeight: '1' }, simbolo, b);
        S.el('div', { fontSize: '11px', fontWeight: '700', textAlign: 'center', lineHeight: '1.15' }, nome, b);
        b.addEventListener('click', S.protegido('notebook:' + nome, aoAbrir));
        return b;
      }

      // ---- Barra de tarefas com o ícone de rede ----
      var barra = S.el('div', {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(7,20,48,0.92)',
        padding: '4px 8px',
        gap: '8px'
      }, null, tela);
      S.el('div', { fontSize: '12px', color: '#AFC2D8', fontWeight: '700' }, '⊞  ' + S.aluno.nome, barra);
      var direita = S.el('div', { display: 'flex', alignItems: 'center', gap: '10px' }, null, barra);
      var bRede = S.el('button', {
        background: 'transparent',
        border: '2px solid transparent',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: '12px',
        fontWeight: '700',
        padding: '3px 8px',
        cursor: 'pointer',
        touchAction: 'manipulation'
      }, '', direita);
      bRede.type = 'button';
      S.el('div', { fontSize: '12px', color: '#AFC2D8', fontFamily: C.mono }, S.horaAgora(), direita);

      function atualizarIconeRede() {
        if (casa) {
          bRede.textContent = '🌐✖ Sem internet';
          bRede.style.color = '#FF9A9A';
        } else if (E.redeConectada) {
          bRede.textContent = '🖧 WiFi Comunitário Senac ✔';
          bRede.style.color = '#6BF08E';
          bRede.style.animation = 'none';
          bRede.style.borderColor = 'transparent';
        } else {
          bRede.textContent = '🌐 Rede: clique aqui';
          bRede.style.color = '#FFD36B';
          bRede.style.borderColor = '#FFD36B';
          bRede.style.animation = 'ponto-piscar 1.2s ease-in-out infinite';
        }
      }
      atualizarIconeRede();
      bRede.addEventListener('click', S.protegido('notebook:rede', function () { painelRede(); }));

      icone('Navegador', '🌐', function () { navegador(); });
      icone('Atividade (PDF)', '📄', function () { documento(); });
      icone('Lixeira', '🗑', function () { m.msg('A lixeira está vazia.', 'info'); });
      m.msg = MG.mensagem(m.corpo);

      if (casa) m.msg('Abra o Navegador para entrar no Portal do Aluno.', 'info');
      else if (!E.redeConectada) m.msg('O cabo está ligado. Agora clique no ícone de rede, no canto da barra, e conecte.', 'info');
      else if (!E.enviado) m.msg('Conectado! Abra o Navegador e envie a atividade.', 'ok');

      // ---- Documento da atividade ----
      function documento() {
        var c = abrirJanela('📄 ' + ARQUIVO, '520px');
        S.el('div', { fontWeight: '700', fontSize: '15px', marginBottom: '4px' }, 'Atividade da semana', c);
        S.el('div', { fontSize: '13px', lineHeight: '1.45' }, 'Aluno(a): ' + S.aluno.nome + '. Atividade pronta, só falta enviar pelo Portal do Aluno até hoje à noite.', c);
        S.el('div', { fontSize: '12px', color: '#5A6575', marginTop: '6px' }, 'Arquivo: ' + ARQUIVO + ' · 1,2 MB', c);
      }

      // ---- Painel de rede ----
      function painelRede() {
        var c = abrirJanela('🌐 Rede e internet', '520px');
        if (casa) {
          linhaRede(c, '📶', 'Wi-Fi de casa', 'Conectado, sem internet', '#C9443D');
          MG.caixaInfo('O roteador de casa está ligado, mas a internet do provedor caiu. Não aparece nenhuma outra rede aqui dentro de casa.', c, 'aviso');
          return;
        }
        linhaRede(c, '🖧', 'Ethernet (cabo)', 'Cabo conectado na tomada do banco', '#1F7A3E');
        var redes = S.el('div', { marginTop: '8px' }, null, c);
        S.el('div', { fontSize: '12px', fontWeight: '700', color: '#5A6575', marginBottom: '4px' }, 'REDES DISPONÍVEIS', redes);
        var item = S.el('div', {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          background: '#FFFFFF',
          border: '2px solid ' + (E.redeConectada ? '#1F7A3E' : '#7FA7D9'),
          borderRadius: '8px',
          padding: '8px 10px'
        }, null, redes);
        var esq = S.el('div', null, null, item);
        S.el('div', { fontWeight: '700', fontSize: '14px' }, '📶 WiFi Comunitário Senac', esq);
        var sub = S.el('div', { fontSize: '12px', color: '#5A6575' }, E.redeConectada ? 'Conectado · IP ' + E.ip + ' (automático)' : 'Rede aberta · sem senha · ponto comunitário', esq);
        var status = S.el('div', { fontFamily: C.mono, fontSize: '12px', whiteSpace: 'pre-wrap', marginTop: '8px', color: '#14365F' }, '', c);
        if (E.redeConectada) {
          S.el('div', { fontWeight: '700', color: '#1F7A3E' }, 'Conectado ✔', item);
          status.textContent = 'IP: ' + E.ip + '  ·  Gateway: 192.168.0.1\nDNS: automático  ·  Internet: via satélite';
          return;
        }
        var bCon = S.ui.botao('Conectar', 'primario', function () {
          bCon.disabled = true;
          bCon.style.opacity = '0.6';
          var passos = ['Conectando em "WiFi Comunitário Senac"…', 'Rede aberta: não precisa de senha.', 'Pedindo endereço IP automaticamente (DHCP)…'];
          var i = 0;
          (function prox() {
            if (!c.isConnected) return;
            if (i < passos.length) {
              status.textContent += (i ? '\n' : '') + passos[i++];
              setTimeout(prox, 650);
              return;
            }
            if (E.satelite !== 'online') {
              status.textContent += '\nConectado, mas SEM INTERNET: o roteador ainda está se ligando ao satélite.';
              m.msg('Aguarde alguns segundos (veja as luzes do rack) e tente de novo.', 'erro');
              bCon.disabled = false;
              bCon.style.opacity = '1';
              return;
            }
            E.redeConectada = true;
            E.ip = '192.168.0.' + (100 + (S.hashTexto(S.aluno.nome) % 90));
            status.textContent += '\nIP recebido: ' + E.ip + '\nInternet: OK (via satélite) ✔';
            sub.textContent = 'Conectado · IP ' + E.ip + ' (automático)';
            item.style.borderColor = '#1F7A3E';
            bCon.remove();
            S.el('div', { fontWeight: '700', color: '#1F7A3E' }, 'Conectado ✔', item);
            atualizarIconeRede();
            S.apto.desenharTelaNotebook('online');
            m.msg('✔ Conectado! O roteador entregou o IP sozinho. Agora abra o Navegador.', 'ok');
            J.atualizarMissoes();
          })();
        }, item);
      }

      function linhaRede(pai, simbolo, nome, texto, cor) {
        var l = S.el('div', { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }, null, pai);
        S.el('div', { fontSize: '22px' }, simbolo, l);
        var t = S.el('div', null, null, l);
        S.el('div', { fontWeight: '700', fontSize: '14px' }, nome, t);
        S.el('div', { fontSize: '12px', color: cor, fontWeight: '700' }, texto, t);
      }

      // ---- Navegador ----
      function navegador() {
        var c = abrirJanela('Navegador');
        var barraEnd = S.el('div', {
          background: '#FFFFFF',
          border: '2px solid #8A96A6',
          borderRadius: '999px',
          padding: '5px 12px',
          fontFamily: C.mono,
          fontSize: '13px',
          marginBottom: '8px',
          color: '#10203A',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }, '🔒 https://' + PORTAL + '/atividades', c);
        var pagina = S.el('div', {
          background: '#FFFFFF',
          border: '2px solid #C5CFDB',
          borderRadius: '6px',
          minHeight: ap ? '110px' : '160px',
          padding: ap ? '10px' : '14px',
          fontSize: '14px'
        }, 'Carregando…', c);
        setTimeout(S.protegido('navegador', function () {
          if (!c.isConnected) return;
          pagina.textContent = '';
          if (casa || !E.redeConectada) {
            barraEnd.textContent = 'https://' + PORTAL + '/atividades';
            semInternet(pagina);
            if (casa) {
              E.viuOffline = true;
              S.apto.desenharTelaNotebook('offline');
              m.msg('Sem internet... Feche o notebook para pensar no que fazer.', 'erro');
            } else {
              m.msg('Primeiro conecte na rede "WiFi Comunitário Senac" (ícone de rede na barra).', 'erro');
            }
            return;
          }
          portal(pagina);
        }), casa ? 900 : 500);
      }

      function semInternet(pagina) {
        S.el('div', { fontSize: '36px' }, '🔌', pagina);
        S.el('div', { fontWeight: '700', fontSize: '17px', margin: '6px 0' }, 'Sem conexão com a internet', pagina);
        S.el('div', { fontSize: '13px', color: '#5A6575', lineHeight: '1.5' }, 'Tente: verificar os cabos e o roteador · reconectar à rede', pagina);
        S.el('div', { fontFamily: C.mono, fontSize: '12px', color: '#8A96A6', marginTop: '6px' }, 'ERR_INTERNET_DISCONNECTED', pagina);
      }

      function portal(pagina) {
        var cab = S.el('div', { display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '4px solid ' + C.laranja, paddingBottom: '8px', marginBottom: '10px' }, null, pagina);
        S.el('div', { width: '34px', height: '34px', borderRadius: '8px', background: '#0B4F9C', color: '#FFD36B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }, 'EETI', cab);
        var t = S.el('div', null, null, cab);
        S.el('div', { fontWeight: '700', fontSize: '17px', color: '#0B4F9C' }, 'Portal do Aluno', t);
        S.el('div', { fontSize: '12px', color: '#5A6575' }, 'Olá, ' + S.primeiroNome() + '!', t);
        var cartao = S.el('div', { border: '2px solid #C5CFDB', borderRadius: '8px', padding: '10px 12px' }, null, pagina);
        S.el('div', { fontWeight: '700' }, 'Atividade da semana', cartao);
        S.el('div', { fontSize: '12px', color: '#C9443D', fontWeight: '700', margin: '2px 0 8px' }, 'Prazo: hoje, 23h59', cartao);
        if (E.enviado) {
          enviado(cartao);
          return;
        }
        S.el('div', { fontSize: '13px', marginBottom: '8px' }, '📎 ' + ARQUIVO + ' · 1,2 MB', cartao);
        var barraP = S.el('div', { height: '14px', background: '#E3EAF3', border: '2px solid #8A96A6', borderRadius: '4px', overflow: 'hidden', display: 'none', marginBottom: '6px' }, null, cartao);
        var cheio = S.el('div', { height: '100%', width: '0%', background: '#2FA35A' }, null, barraP);
        var txt = S.el('div', { fontSize: '12px', color: '#5A6575', minHeight: '16px' }, '', cartao);
        var bEnviar = S.ui.botao('Enviar atividade ▶', 'verde', function () {
          bEnviar.remove();
          barraP.style.display = 'block';
          var pct = 0;
          (function sobe() {
            if (!cartao.isConnected) return;
            pct += 7 + Math.random() * 9;
            cheio.style.width = Math.min(100, pct) + '%';
            txt.textContent = 'Enviando pela internet via satélite… ' + Math.min(100, Math.round(pct)) + '%';
            if (pct < 100) {
              setTimeout(sobe, 180);
              return;
            }
            E.enviado = true;
            E.protocolo = (S.hashTexto(S.aluno.nome + Date.now()) % 900000 + 100000).toString(36).toUpperCase();
            E.enviadoAs = S.horaAgora();
            barraP.remove();
            txt.remove();
            enviado(cartao);
            m.msg('✔ Atividade enviada! Feche o notebook para terminar.', 'ok');
            J.atualizarMissoes();
          })();
        }, cartao);
      }

      function enviado(cartao) {
        var ok = S.el('div', { background: '#E6F6EB', border: '2px solid #2FA35A', borderRadius: '6px', padding: '8px 10px', color: '#1B6436' }, null, cartao);
        S.el('div', { fontWeight: '700' }, '✔ Atividade enviada para o professor', ok);
        S.el('div', { fontSize: '12px' }, 'Hoje às ' + (E.enviadoAs || S.horaAgora()) + ' · protocolo #' + (E.protocolo || '000000'), ok);
      }

      return m;
    };
  });

  /* ================================================================== */
  secao('M03-equipamentos', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var E = S.estado;
    var J = S.jogo;

    MG.roteadorCasa = function () {
      var m = S.ui.abrirModal('Roteador de casa', { largura: '480px' });
      var painel = S.el('div', { display: 'flex', gap: '14px', alignItems: 'center', background: '#22262B', borderRadius: '8px', padding: '12px 14px', color: '#FFFFFF', flexWrap: 'wrap' }, null, m.corpo);
      MG.led(painel, '#39FF6A', 'ENERGIA');
      MG.led(painel, '#39FF6A', 'WI-FI');
      var l = MG.led(painel, '#FF3B30', 'INTERNET');
      l.style.animation = 'ponto-piscar 0.8s ease-in-out infinite';
      S.el('div', { marginTop: '10px' }, 'A luz INTERNET está vermelha: o sinal do provedor não está chegando. O problema é na rua, não no seu roteador.', m.corpo);
      MG.caixaInfo('Desligar e ligar o roteador não resolve quando o provedor cai. É preciso usar outra conexão.', m.corpo, 'aviso');
    };

    // Encaixar o cabo: primeiro a porta certa do notebook, depois a tomada do banco.
    MG.conectarNotebook = function (k, aoConcluir) {
      var m = S.ui.abrirModal('Conectar o notebook no ponto', { largura: '640px' });
      S.el('div', { marginBottom: '8px' }, '1) Em qual porta do notebook vai o cabo de rede (UTP)?', m.corpo);
      var painel = S.el('div', {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
        gap: '8px',
        background: '#2B3138',
        border: '3px solid #071430',
        borderRadius: '8px',
        padding: '12px'
      }, null, m.corpo);
      var msg = MG.mensagem(m.corpo);
      var portas = [
        { nome: 'USB', forma: { width: '28px', height: '11px', background: '#1d5fbf', border: '3px solid #ccc' }, dica: 'USB é para mouse, pendrive e carregar o celular.' },
        { nome: 'USB-C', forma: { width: '22px', height: '9px', background: '#111', borderRadius: '5px', border: '3px solid #ccc' }, dica: 'USB-C é para carregar e ligar acessórios.' },
        { nome: 'HDMI', forma: { width: '36px', height: '13px', background: '#000', borderRadius: '0 0 6px 6px', border: '3px solid #ccc' }, dica: 'HDMI leva imagem e som para uma TV ou monitor.' },
        { nome: 'Rede (RJ45)', forma: { width: '28px', height: '24px', background: '#000', border: '3px solid #ccc', borderRadius: '2px' }, certa: true },
        { nome: 'Fone (P2)', forma: { width: '16px', height: '16px', background: '#5cb85c', borderRadius: '50%', border: '3px solid #ccc' }, dica: 'Essa é a entrada do fone de ouvido.' },
        { nome: 'Carregador', forma: { width: '18px', height: '18px', background: '#111', borderRadius: '50%', border: '4px solid #888' }, dica: 'Essa é a entrada do carregador.' }
      ];
      var concluido = false;
      S.embaralhar(portas).forEach(function (p) {
        var b = S.el('button', {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minHeight: '70px',
          background: '#3A424C',
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
        b.addEventListener('click', S.protegido('porta-notebook', function () {
          if (concluido) return;
          if (!p.certa) {
            b.style.borderColor = C.vermelho;
            msg('✖ ' + p.dica + ' O cabo de rede usa o conector RJ45.', 'erro');
            return;
          }
          concluido = true;
          b.style.borderColor = C.verde;
          msg('Clique! Cabo encaixado no notebook.', 'ok');
          etapa2();
        }));
      });

      function etapa2() {
        var e2 = S.el('div', { marginTop: '12px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }, null, m.corpo);
        var tomada = S.el('div', { width: '74px', height: '92px', background: '#FFFFFF', border: '3px solid #071430', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#3B4C66', fontWeight: '700', fontSize: '10px' }, null, e2);
        S.el('div', null, 'REDE', tomada);
        S.el('div', { width: '30px', height: '26px', background: '#2D7FE0', border: '3px solid #10203A', borderRadius: '3px' }, null, tomada);
        var ledT = S.el('div', { width: '8px', height: '8px', borderRadius: '50%', background: E.satelite === 'online' ? '#39FF6A' : '#FFB020' }, null, tomada);
        var lado = S.el('div', { flex: '1 1 220px', fontSize: '13px', lineHeight: '1.45' }, null, e2);
        S.el('div', { marginBottom: '8px' }, '2) Agora encaixe a outra ponta na tomada de rede (keystone) do lado ' + k.lado + ' do banco.', lado);
        var b = S.ui.botao('Encaixar na tomada do banco ▶', 'primario', function () {
          b.remove();
          ledT.style.boxShadow = '0 0 8px #39FF6A';
          msg('Clique! O LED da tomada piscou: o cabo chegou no switch da central.', 'ok');
          setTimeout(function () {
            m.fechar(true);
            aoConcluir();
          }, 900);
        }, lado);
      }
    };

    MG.transformador = function (aoLigar) {
      var m = S.ui.abrirModal('Transformador da central', { largura: '620px' });
      var ap = S.ui.compacto();
      S.el('div', { marginBottom: '8px' }, 'O transformador recebe a energia da rua e alimenta tudo do ponto: rack, tomadas de rede, câmeras e iluminação.', m.corpo);
      var area = S.el('div', { display: 'flex', gap: '16px', alignItems: 'stretch', flexWrap: 'wrap' }, null, m.corpo);
      var caixa = S.el('div', {
        width: ap ? '170px' : '200px',
        minHeight: ap ? '190px' : '240px',
        background: 'linear-gradient(90deg, #7E8890, #A2ACB4 40%, #8E979F)',
        border: '4px solid #071430',
        borderRadius: '8px',
        position: 'relative',
        boxSizing: 'border-box',
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }, null, area);
      var lado = S.el('div', { flex: '1 1 220px', fontSize: '13px', lineHeight: '1.45' }, null, area);
      var msg = MG.mensagem(m.corpo);
      // Tampa fechada.
      var tampa = S.el('div', { textAlign: 'center', color: '#10203A', fontWeight: '700' }, null, caixa);
      S.el('div', { fontSize: '40px' }, '⚠', tampa);
      S.el('div', { fontSize: '12px' }, 'PERIGO · ALTA TENSÃO', tampa);
      S.el('div', { marginBottom: '8px' }, '1) Abra a tampa do painel.', lado);
      var bAbrir = S.ui.botao('Abrir a tampa', 'secundario', function () {
        bAbrir.remove();
        tampa.remove();
        abrirPainel();
      }, lado);
      MG.caixaInfo('Num ponto de verdade, a central fica trancada e só a equipe do projeto mexe no transformador.', m.corpo, 'aviso');

      function abrirPainel() {
        caixa.style.background = '#2A3038';
        var dentro = S.el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#FFFFFF' }, null, caixa);
        var leds = S.el('div', { display: 'flex', gap: '10px' }, null, dentro);
        MG.led(leds, '#39FF6A', 'ENTRADA 220V');
        var ledSaida = MG.led(leds, '#2A3530', 'SAÍDA');
        var trilho = S.el('div', { width: '60px', height: '110px', background: '#11151A', border: '3px solid #8A96A6', borderRadius: '8px', position: 'relative', cursor: 'pointer' }, null, dentro);
        var chave = S.el('div', { position: 'absolute', left: '8px', right: '8px', height: '44px', bottom: '8px', background: '#C9443D', border: '3px solid #071430', borderRadius: '6px', transition: 'bottom .25s ease' }, null, trilho);
        var rot = S.el('div', { fontWeight: '700', fontSize: '13px', color: '#FF9A9A' }, 'DESLIGADO', dentro);
        lado.textContent = '';
        S.el('div', { marginBottom: '8px' }, '2) Levante a alavanca para LIGADO.', lado);
        var ligado = false;
        function ligar() {
          if (ligado) return;
          ligado = true;
          chave.style.bottom = '52px';
          chave.style.background = '#2FA35A';
          rot.textContent = 'LIGADO';
          rot.style.color = '#6BF08E';
          ledSaida.style.background = '#39FF6A';
          ledSaida.style.boxShadow = '0 0 6px #39FF6A';
          msg('Clique! Saída de energia ligada.', 'ok');
          setTimeout(function () {
            m.fechar(true);
            aoLigar();
          }, 1000);
        }
        trilho.addEventListener('click', S.protegido('transformador', ligar));
        var b = S.ui.botao('Levantar a alavanca ▲', 'primario', ligar, lado);
        b.style.marginTop = '4px';
      }
    };

    MG.rack = function () {
      var m = S.ui.abrirModal('Rack da central', { largura: '700px' });
      var online = E.satelite === 'online';
      var fluxo = S.el('div', { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }, null, m.corpo);
      var etapas = [
        ['🛰', 'Satélite'],
        ['📡', 'Antena no telhado'],
        ['📶', 'Roteador'],
        ['🔀', 'Switch'],
        ['🪑', 'Tomadas do banco, Wi-Fi e câmeras']
      ];
      etapas.forEach(function (e, i) {
        var b = S.el('div', { background: '#071733', border: '2px solid ' + (E.energia ? (i < 2 && !online ? C.amarelo : C.verde) : C.borda), borderRadius: '8px', padding: '6px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '700', minWidth: '78px' }, null, fluxo);
        S.el('div', { fontSize: '20px' }, e[0], b);
        S.el('div', null, e[1], b);
        if (i < etapas.length - 1) S.el('div', { color: C.laranja, fontWeight: '700' }, '→', fluxo);
      });
      var st = E.energia ? (online ? 'Ligado e conectado ao satélite.' : 'Ligado, conectando ao satélite…') : 'Desligado: falta ligar o transformador.';
      S.el('div', { fontWeight: '700', color: E.energia ? (online ? C.verde : C.amarelo) : C.vermelho, marginBottom: '6px' }, 'Status: ' + st, m.corpo);
      [
        'Roteador via satélite: recebe a internet pela antena parabólica e cria a rede "WiFi Comunitário Senac" (aberta, sem senha).',
        'DHCP: o roteador entrega IP automático para quem conecta (faixa 192.168.0.100 a 192.168.0.199).',
        'Switch: distribui a rede pelos cabos até as tomadas keystone do banco e até as câmeras.',
        'Câmeras de segurança: gravam o ponto e aparecem na TV da central.'
      ].forEach(function (t) {
        S.el('div', { fontSize: '13px', margin: '4px 0', lineHeight: '1.4' }, '• ' + t, m.corpo);
      });
    };
  });

  /* ================================================================== */
  secao('M04-mapa', function () {
    var C = S.CSS;
    var MG = S.minigames;
    var E = S.estado;
    var M = S.MAPA;

    MG.mapa = function () {
      if (S.fase !== 'jogo') return;
      E.viuMapa = true;
      S.ui.destacarMapa(false);
      var m = S.ui.abrirModal('Mapa · Residencial Ataliba', { largura: '760px' });
      var ESC = 6;
      var X0 = -40;
      var Z0 = -36;
      var W = 92 * ESC;
      var H = 72 * ESC;
      var cv = S.el('canvas', {
        width: '100%',
        maxHeight: S.ui.compacto() ? '58vh' : '62vh',
        objectFit: 'contain',
        display: 'block',
        border: '3px solid #071430',
        borderRadius: '8px',
        background: '#2F5A27',
        imageRendering: 'pixelated'
      }, null, m.corpo);
      cv.width = W;
      cv.height = H;
      var ctx = cv.getContext('2d');
      function X(x) { return (x - X0) * ESC; }
      function Z(z) { return (z - Z0) * ESC; }
      function ret(r, cor) {
        ctx.fillStyle = cor;
        ctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * ESC, (r.z1 - r.z0) * ESC);
      }
      function texto(t, x, z, cor, fonte, alinhar) {
        ctx.font = fonte || 'bold 12px Arial';
        ctx.textAlign = alinhar || 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(t, X(x), Z(z));
        ctx.fillStyle = cor || '#FFFFFF';
        ctx.fillText(t, X(x), Z(z));
      }
      // Mata e grama.
      ctx.fillStyle = '#2F5A27';
      ctx.fillRect(0, 0, W, H);
      ret({ x0: -34, x1: 48, z0: -31, z1: 31 }, '#6A9A45');
      ret(M.terreno, '#C47A43');
      // Ruas.
      M.ruas.forEach(function (r) { ret(r, '#55585C'); });
      // Condomínios e blocos.
      M.condominios.forEach(function (c) {
        ret(c, c.acessivel ? '#8FB06F' : '#7E9768');
        ctx.strokeStyle = c.acessivel ? '#F7941D' : '#D8D4CA';
        ctx.lineWidth = c.acessivel ? 3 : 2;
        ctx.strokeRect(X(c.x0 + 0.35), Z(c.z0 + 0.35), (c.x1 - c.x0 - 0.7) * ESC, (c.z1 - c.z0 - 0.7) * ESC);
        (c.blocosMontados || []).forEach(function (b, i) {
          ret({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 }, '#C9C3B6');
          texto('Bloco ' + c.blocos[i], (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, '#3B4C66', 'bold 11px Arial');
        });
        texto(c.nome + (c.acessivel ? ' (o seu)' : ''), (c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2, c.acessivel ? '#FFD36B' : '#FFFFFF', 'bold 12px Arial');
      });
      // Ponto de internet.
      ret(M.ponto, '#7DA35A');
      ret(S.PONTO.laje, '#CBC7BD');
      ret({ x0: S.PONTO.central.x0, x1: S.PONTO.central.x1, z0: S.PONTO.central.z0, z1: S.PONTO.central.z1 }, '#5FAE9D');
      ret({ x0: 37.4, x1: 41.4, z0: 9.5, z1: 12.1 }, '#9D95D8');
      ret({ x0: S.PONTO.mesa.x0, x1: S.PONTO.mesa.x1, z0: S.PONTO.mesa.z0, z1: S.PONTO.mesa.z1 }, '#E6B48C');
      ctx.strokeStyle = '#F7941D';
      ctx.lineWidth = 3;
      ctx.strokeRect(X(M.ponto.x0 + 0.5), Z(M.ponto.z0 + 0.5), (M.ponto.x1 - M.ponto.x0 - 1) * ESC, (M.ponto.z1 - M.ponto.z0 - 1) * ESC);
      texto('📶 PONTO DE INTERNET', 41, 5.6, '#FFD36B', 'bold 12px Arial');
      texto('COMUNITÁRIO', 41, 7.4, '#FFD36B', 'bold 12px Arial');
      texto('banco', 39.4, 13.2, '#FFFFFF', 'bold 9px Arial');
      texto('central', 44.8, 14.0, '#FFFFFF', 'bold 9px Arial');
      // Escola.
      ret({ x0: 48, x1: 52, z0: -36, z1: 36 }, '#E8ECF1');
      texto('EETI', 50, -12, '#0B4F9C', 'bold 13px Arial');
      // Nomes das ruas.
      texto('Estr. do Monte Cristo', 8, -28, '#FFFFFF', 'bold 11px Arial');
      texto('Rua A', -16, 0, '#FFFFFF', 'bold 11px Arial');
      texto('Rua A', 16, 0, '#FFFFFF', 'bold 11px Arial');
      texto('Rua Principal', 8, 28, '#FFFFFF', 'bold 11px Arial');
      ['Rua B', 'Rua C', 'Rua D'].forEach(function (n, i) {
        var x = [-31, 0, 31][i];
        ctx.save();
        ctx.translate(X(x), Z(-14));
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(n, 0, 4);
        ctx.restore();
      });
      // Casa.
      texto('🏠', S.CASA.porta.x, S.CASA.porta.z + 1.2, '#FFFFFF', '14px Arial');

      // Caminho sugerido (até chegar no ponto).
      var p = S.personagem.raiz.position;
      if (!E.chegouPonto) {
        var cam = S.caminhoAtePonto(p.x, p.z);
        ctx.strokeStyle = '#F7941D';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        cam.forEach(function (q, i) {
          if (i) ctx.lineTo(X(q.x), Z(q.z));
          else ctx.moveTo(X(q.x), Z(q.z));
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Você está aqui.
      var ent = S.ponto.entradaCentral;
      var vx = S.area.id === 'apto' ? S.CASA.porta.x : S.area.id === 'central' ? ent.x : p.x;
      var vz = S.area.id === 'apto' ? S.CASA.porta.z : S.area.id === 'central' ? ent.z : p.z;
      ctx.fillStyle = '#2D7FE0';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X(vx), Z(vz), 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      texto(S.area.id === 'apto' ? 'Você (em casa)' : S.area.id === 'central' ? 'Você (na central)' : 'Você', vx, vz - 2.4, '#FFFFFF', 'bold 12px Arial');

      var leg = S.el('div', { display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '12px', color: C.cinza }, null, m.corpo);
      S.el('span', { color: '#6FA8F0' }, '● Você', leg);
      S.el('span', { color: C.laranja }, '- - Caminho até o ponto', leg);
      S.el('span', null, '🏠 Sua casa (Bloco 19)', leg);
      S.el('span', null, 'Norte ↑', leg);
      if (!E.chegouPonto) {
        S.el('div', { fontSize: '13px', marginTop: '6px' }, 'O ponto fica no terreno ao lado da escola (EETI), entre a Rua A e a Rua Principal. Depois de fechar o mapa, uma seta no topo da tela mostra a direção.', m.corpo);
      }
    };
  });


  /* ---- 80-cenas.js ---- */

  /* ================================================================== */
  secao('C01-cenas', function () {
    // Cenas curtas "in-game": a própria cena 3D com a câmera seguindo um roteiro
    // e uma caixa de diálogo com efeito de máquina de escrever.
    var C = S.CSS;
    var est = null;

    var FALANTES = {
      aluno: { nome: function () { return S.aluno.nome; }, cor: '#4F9BFF', texto: '#071430' },
      pensando: { nome: function () { return S.aluno.nome + ' (pensando)'; }, cor: '#9D95D8', texto: '#071430' }
    };

    function v3(a) {
      return new THREE.Vector3(a[0], a[1], a[2]);
    }

    // Tomada perto do rosto do personagem (lado: 1 direita, -1 esquerda).
    S.tomadaRosto = function (distancia, lado, altura) {
      var p = S.personagem;
      var pos = p.raiz.position;
      var a = p.angulo;
      var fx = Math.sin(a);
      var fz = Math.cos(a);
      var rx = Math.cos(a);
      var rz = -Math.sin(a);
      var d = distancia || 1.6;
      var l = (lado || 1) * 0.7;
      var y = pos.y + (p.sentado ? 1.25 : 1.55);
      return {
        pos: [pos.x + fx * d + rx * l, y + (altura || 0.25), pos.z + fz * d + rz * l],
        alvo: [pos.x, y, pos.z]
      };
    };

    function resolver(t) {
      if (t === 'jogo' || !t) {
        var pos = new THREE.Vector3();
        var alvo = new THREE.Vector3();
        S.poseCamera(S.personagem.raiz.position, pos, alvo);
        return { pos: pos, alvo: alvo };
      }
      if (t === 'sentado') {
        var r = S.tomadaRosto(1.5, -1, 0.05);
        return { pos: v3(r.pos), alvo: v3(r.alvo) };
      }
      return { pos: v3(t.pos), alvo: v3(t.alvo) };
    }

    function irPara(pos, alvo, dur) {
      est.cam = { dePos: S.camera.position.clone(), deAlvo: est.alvoAtual.clone(), paraPos: pos, paraAlvo: alvo, t: 0, dur: dur };
    }

    function atualizarCamera(dt) {
      var c = est.cam;
      if (!c) return;
      c.t += dt;
      var k = S.suave(c.t / c.dur);
      S.camera.position.lerpVectors(c.dePos, c.paraPos, k);
      est.alvoAtual.lerpVectors(c.deAlvo, c.paraAlvo, k);
      if (c.t > c.dur && est.etapa === 'dialogo') {
        S.camera.position.x += Math.min(c.t - c.dur, 6) * 0.02;
      }
      S.camera.lookAt(est.alvoAtual);
    }

    function montarUi(titulo) {
      if (S.ocultarAviso) S.ocultarAviso();
      var compacto = S.ui.compacto();
      var ui = {};
      ui.camada = S.el('div', { position: 'absolute', inset: '0', zIndex: '14', pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }, null, S.raiz);
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
      }, titulo || '', ui.camada);
      ui.pular = S.ui.botao('Pular ▸▸', 'secundario', function () { terminar(true); }, ui.camada);
      S.estilo(ui.pular, { position: 'absolute', top: compacto ? '6px' : '12px', right: compacto ? '8px' : '14px', padding: compacto ? '4px 10px' : '6px 14px', fontSize: compacto ? '12px' : '14px', zIndex: '2' });
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
      ui.texto = S.el('div', { color: '#FFFFFF', fontWeight: '700', fontSize: compacto ? '13px' : '16px', lineHeight: '1.45', minHeight: compacto ? '38px' : '46px' }, '', ui.caixa);
      ui.seguir = S.el('div', { textAlign: 'right', color: C.laranja, fontWeight: '700', fontSize: compacto ? '11px' : '12px', marginTop: '2px', visibility: 'hidden' }, S.toque ? 'toque para continuar ▶' : 'clique ou Espaço ▶', ui.caixa);
      ui.camada.addEventListener('pointerdown', S.protegido('cena:toque', function (e) {
        e.preventDefault();
        avancar();
      }));
      setTimeout(function () {
        var alt = compacto ? '6%' : '9%';
        ui.faixaCima.style.height = alt;
        ui.faixaBaixo.style.height = alt;
        if (titulo) ui.titulo.style.opacity = '1';
      }, 30);
      return ui;
    }

    function mostrarFala(i) {
      var f = est.falas[i];
      var ui = est.ui;
      est.falaAtual = i;
      est.letras = 0;
      est.completa = false;
      ui.caixa.style.display = 'block';
      if (i > 0) ui.titulo.style.opacity = '0';
      var falante = FALANTES[f.quem] || FALANTES.aluno;
      ui.caixa.style.borderColor = falante.cor;
      ui.quem.textContent = falante.nome();
      ui.quem.style.background = falante.cor;
      ui.quem.style.color = falante.texto;
      ui.texto.style.fontStyle = f.quem === 'pensando' ? 'italic' : 'normal';
      ui.texto.textContent = '';
      ui.seguir.style.visibility = 'hidden';
      if (f.acao) S.protegido('cena:acao', f.acao)();
      var t = resolver(f.tomada);
      irPara(t.pos, t.alvo, i === 0 ? 0.8 : 1.1);
      if (f.gesto && S.personagem) S.personagem.gestoAte = S.agora() + 1200;
    }

    function avancar() {
      if (!est || est.saindo) return;
      var f = est.falas[est.falaAtual];
      if (!est.completa) {
        est.letras = f.texto.length;
        return;
      }
      if (est.falaAtual + 1 < est.falas.length) mostrarFala(est.falaAtual + 1);
      else terminar(false);
    }

    function terminar(pulou) {
      if (!est || est.saindo) return;
      est.saindo = true;
      est.etapa = 'saida';
      if (pulou) {
        // Garante as ações das falas que foram puladas.
        for (var i = est.falaAtual + 1; i < est.falas.length; i++) {
          if (est.falas[i].acao) S.protegido('cena:acao', est.falas[i].acao)();
        }
      }
      var ui = est.ui;
      ui.caixa.style.display = 'none';
      ui.titulo.style.opacity = '0';
      ui.faixaCima.style.height = '0';
      ui.faixaBaixo.style.height = '0';
      ui.pular.style.display = 'none';
      ui.camada.style.pointerEvents = 'none';
      var t = resolver('jogo');
      irPara(t.pos, t.alvo, pulou ? 0.4 : 0.8);
      est.fimEm = est.cam.dur;
    }

    function concluir() {
      var cfg = est.cfg;
      est.ui.camada.remove();
      est = null;
      S.atualizarCena = null;
      S.fase = 'jogo';
      S.pausado = !!S.ui.modalAberto();
      S.ui.mostrarHud(true);
      S.ui.atualizarControlesToque();
      S.atualizarCamera(0, true);
      if (cfg.aoFim) S.protegido('cena:fim', cfg.aoFim)();
    }

    function atualizar(dt) {
      if (!est) return;
      if (est.etapa === 'dialogo') {
        var f = est.falas[est.falaAtual];
        if (!est.completa) {
          est.letras = Math.min(f.texto.length, est.letras + dt * 44);
          est.ui.texto.textContent = f.texto.slice(0, Math.floor(est.letras));
          if (est.letras >= f.texto.length) {
            est.completa = true;
            est.ui.seguir.style.visibility = 'visible';
          }
        }
      }
      atualizarCamera(dt);
      if (est.etapa === 'saida') {
        est.fimEm -= dt;
        if (est.fimEm <= 0) concluir();
      }
    }

    S.cenaCurta = function (cfg) {
      if (est) return false;
      S.fase = 'cena';
      S.teclas = {};
      S.joy.x = 0;
      S.joy.z = 0;
      S.ui.mostrarHud(false);
      S.ui.atualizarControlesToque();
      if (S.limparHover) S.limparHover();
      var dir = new THREE.Vector3();
      S.camera.getWorldDirection(dir);
      est = {
        cfg: cfg,
        falas: cfg.falas,
        etapa: 'dialogo',
        alvoAtual: S.camera.position.clone().add(dir.multiplyScalar(6)),
        ui: montarUi(cfg.titulo)
      };
      S.atualizarCena = atualizar;
      mostrarFala(0);
      return true;
    };

    S.emCena = function () {
      return !!est;
    };

    // ---- Roteiros -----------------------------------------------------------
    S.cenaAbertura = function (aoFim) {
      var O = S.APTO;
      S.cenaCurta({
        titulo: 'RESIDENCIAL ATALIBA · BLOCO ' + S.CASA.bloco,
        falas: [
          { quem: 'aluno', tomada: { pos: [O.ox + 2.2, 2.6, O.oz + 2.6], alvo: [O.ox - 1.2, 0.9, O.oz - 1.2] }, texto: 'Tenho que mandar a minha atividade online para o professor.' },
          { quem: 'aluno', tomada: S.tomadaRosto(1.6, 1), texto: 'O prazo é hoje! Deixa eu ligar o notebook...' }
        ],
        aoFim: aoFim
      });
    };

    // Depois de ver "sem internet" no navegador de casa.
    S.cenaPensamento = function () {
      var E = S.estado;
      var O = S.APTO;
      S.cenaCurta({
        falas: [
          { quem: 'pensando', tomada: S.tomadaRosto(1.5, 1), texto: 'Poxa, minha internet não está funcionando... O que eu faço agora...?' },
          { quem: 'pensando', tomada: S.tomadaRosto(1.3, -1, 0.1), gesto: true, texto: 'Ah, já sei! Tem um ponto de internet comunitário aqui perto, feito pelos alunos da EETI em parceria com o Senac, com internet via satélite!' },
          { quem: 'aluno', tomada: { pos: [O.ox - 0.8, 2.3, O.oz + 1.6], alvo: [O.ox - 2.8, 0.8, O.oz - 0.9] }, texto: 'Vou levar o meu notebook e o meu cabo de rede.' }
        ],
        aoFim: function () {
          E.tentouEnviar = true;
          S.jogo.atualizarMissoes();
        }
      });
    };

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


  /* ---- 90-fluxo.js ---- */

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

    var ETAPAS = [
      ['Ligando o motor 3D…', function () { if (!S.renderer) S.montarRenderer(); }],
      ['Abrindo as ruas do Ataliba…', function () {
        S.criarArea('bairro');
        S.bairro.montarChao();
      }],
      ['Levantando os blocos dos condomínios…', function () {
        S.MAPA.condominios.forEach(function (c) { S.bairro.condominio(c); });
      }],
      ['Plantando a mata e os postes…', function () {
        S.bairro.montarMata();
        S.bairro.montarPostes();
        S.bairro.montarEscola();
      }],
      ['Montando o Ponto de Internet Comunitário…', function () {
        S.ponto.montar();
        S.bairro.montarDetalhes();
      }],
      ['Arrumando a sua casa…', function () {
        S.criarArea('apto');
        S.apto.montar();
      }],
      ['Organizando a central do ponto…', function () {
        S.criarArea('central');
        S.centralInt.montar();
      }],
      ['Chamando você…', function () {
        S.montando = null;
        S.criarPersonagem(S.aluno.nome, S.aluno.genero);
        S.mundo.montarSeta();
      }]
    ];

    S.iniciarCarregamento = function () {
      S.fase = 'carregando';
      var tela = S.ui.mostrarCarregamento();
      if (typeof THREE === 'undefined') {
        tela.progresso(0, 'Não foi possível carregar o motor 3D (Three.js). Verifique a internet e recarregue a página.');
        registrarErro('carregamento', new Error('THREE indisponível'));
        return;
      }
      var cadeia = Promise.resolve();
      ETAPAS.forEach(function (et, i) {
        cadeia = cadeia.then(function () {
          tela.progresso(i / (ETAPAS.length + 1), et[0]);
          return passo(et[1]);
        });
      });
      cadeia.then(function () {
        tela.progresso(0.94, 'Preparando os gráficos…');
        return passo(function () {
          S.ligarEntradaCena();
          // Compila os shaders das duas áreas agora, para não engasgar depois.
          S.areas.bairro.grupo.visible = true;
          S.areas.apto.grupo.visible = true;
          S.areas.central.grupo.visible = true;
          S.posicionarPersonagem(S.apto.inicio.x, S.apto.inicio.z, S.apto.inicio.angulo);
          S.atualizarCamera(0, true);
          S.renderer.compile(S.cena, S.camera);
          S.usarArea('apto');
          S.posicionarPersonagem(S.apto.inicio.x, S.apto.inicio.z, S.apto.inicio.angulo);
          S.posicionarSol(S.APTO.ox, S.APTO.oz);
          S.atualizarCamera(0, true);
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

    S.comecarJogo = S.protegido('comecarJogo', function () {
      S.ui.criarHud();
      S.ui.mostrarHud(false);
      S.jogo.atualizarMissoes();
      S.pausado = false;
      S.cenaAbertura(S.liberarJogo);
    });

    S.liberarJogo = S.protegido('liberarJogo', function () {
      S.ui.mostrarHud(true);
      if (S.toque) S.ui.criarControlesToque();
      S.fase = 'jogo';
      S.pausado = false;
      S.teclas = {};
      S.jogo.progressoEm = S.agora();
      S.jogo.atualizarMissoes();
      S.ui.atualizarControlesToque();
      S.raiz.focus({ preventScroll: true });
      S.aviso('Use o notebook na mesa para enviar a atividade.', 'info', 3400);
    });
  });

  /* ================================================================== */
  secao('L02-laco-e-qualidade', function () {
    var relogio = null;
    var quadros = 0;
    var janelaInicio = 0;
    var errosLaco = 0;
    var ultimoLugar = 0;
    S.fpsMedio = 0;

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
      if (S.fase !== 'jogo' && S.fase !== 'cena' && S.fase !== 'fim') return;
      if (S.contextoPerdido || !S.personagem) return;
      if (!relogio) relogio = new THREE.Clock();
      var dt = Math.min(relogio.getDelta(), 0.05);
      var agora = S.agora();
      try {
        if (S.fase === 'cena') {
          S.atualizarMovimento(dt);
          if (S.atualizarCena) S.atualizarCena(dt);
          S.atualizarMundo(dt);
          S.ponto.atualizarTv();
          S.renderer.render(S.cena, S.camera);
          ajustarQualidade(agora);
          medir(agora);
          return;
        }
        if (S.pausado || S.fase !== 'jogo') {
          janelaInicio = 0;
          ultimoQuadro = 0;
          return; // com janela aberta o 3D fica parado
        }
        S.atualizarMovimento(dt);
        S.atualizarCamera(dt);
        S.atualizarOclusao(dt);
        S.atualizarHover();
        S.atualizarMundo(dt);
        S.jogo.verificarChegada();
        S.jogo.atualizarDicas();
        S.jogo.atualizarPrompt();
        S.jogo.atualizarBussola();
        if (agora - ultimoLugar > 300) {
          ultimoLugar = agora;
          S.ui.definirLocal(S.jogo.lugar());
        }
        S.ponto.atualizarTv();
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
  secao('F01-tela-final', function () {
    var C = S.CSS;

    S.ui.mostrarFim = function () {
      var E = S.estado;
      S.fase = 'fim';
      S.pausado = true;
      S.ui.atualizarControlesToque();
      S.ui.mostrarHud(false);
      var ap = S.ui.telaApertada();
      var t = S.ui.tela(30, '640px');
      S.el('div', { fontSize: '13px', fontWeight: '700', color: C.laranja, letterSpacing: '0.08em' }, 'SIMULAÇÃO CONCLUÍDA', t.cartao);
      S.el('div', { fontSize: ap ? '20px' : '24px', fontWeight: '700', margin: '4px 0 ' + (ap ? '8px' : '12px') }, 'Atividade enviada! 🎉', t.cartao);
      S.el('div', { fontSize: '13px', color: C.cinza, marginBottom: '10px' },
        'Enviada hoje às ' + (E.enviadoAs || S.horaAgora()) + ' · protocolo #' + (E.protocolo || '000000') + ' · pelo IP ' + (E.ip || '192.168.0.100') + ', no Ponto de Internet Comunitário.', t.cartao);
      S.el('div', { fontWeight: '700', marginBottom: '6px' }, 'Como o ponto funcionou', t.cartao);
      var lista = S.el('div', { display: 'grid', gridTemplateColumns: ap ? '1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '12px' }, null, t.cartao);
      [
        ['⚡', 'Energia', 'O transformador da central liga o rack, as tomadas, as câmeras e a luz.'],
        ['🛰', 'Internet via satélite', 'A antena no telhado leva a internet até o roteador, sem depender de cabo na rua.'],
        ['🔀', 'Rede', 'O switch leva o sinal às tomadas keystone do banco. O Wi-Fi é aberto, sem senha.'],
        ['🔢', 'IP automático', 'O roteador entrega IP pelo DHCP: é só conectar e usar.'],
        ['🎥', 'Segurança', 'Câmeras gravam o ponto e aparecem na TV da central.'],
        ['🤝', 'Comunidade', 'Projeto dos alunos da EETI em parceria com o Senac, grátis para o bairro.']
      ].forEach(function (it) {
        var c = S.el('div', { background: '#071733', border: '2px solid ' + C.borda, borderRadius: '8px', padding: ap ? '6px 8px' : '8px 10px' }, null, lista);
        S.el('div', { fontWeight: '700', fontSize: '13px', color: C.laranja }, it[0] + ' ' + it[1], c);
        S.el('div', { fontSize: '12px', color: C.cinza, lineHeight: '1.35' }, it[2], c);
      });
      var botoes = S.el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' }, null, t.cartao);
      var bExp = S.ui.botao('Continuar explorando o bairro', 'primario', function () {
        t.fechar();
        E.livre = true;
        S.fase = 'jogo';
        S.pausado = false;
        S.ui.mostrarHud(true);
        S.ui.atualizarControlesToque();
        S.jogo.atualizarMissoes();
      }, botoes);
      bExp.style.flex = '1 1 220px';
      var bDeNovo = S.ui.botao('Recomeçar', 'secundario', function () { window.location.reload(); }, botoes);
      bDeNovo.style.flex = '0 1 auto';
    };
  });

  /* ================================================================== */
  secao('L03-inicio', function () {
    S.toque = S.ehToque();
    if (S.ui.verificarOrientacao) S.ui.verificarOrientacao();
    window.addEventListener('resize', function () {
      if (S.redimensionar) S.redimensionar();
      else S.ui.verificarOrientacao();
      setTimeout(S.ui.reorganizarInicio, 80);
    });
    S.iniciarLaco();
    S.ui.mostrarInicio();
  });

})();

(function () {
  // Painel de diagnóstico (F9): FPS, desenho, seções carregadas e erros.
  var ESPERADAS = ["B01-constantes","B02-utilitarios","U01-raiz-e-tema","U02-modal-e-avisos","U03-inicio","U04-comandos","U05-carregamento","U06-hud","U07-controles-toque","W01-render-base","T01-texturas","W02-bairro-chao-e-ruas","W03-blocos","W04-veiculos-e-plantas","W05-condominios","W06-postes-placas-escola","W07-ponto-comunitario","W08-montar-bairro","W09-apartamento","W10-central-por-dentro","P01-personagem","P02-movimento-camera","E01-teclado-mouse","J01-estado-e-objetivos","J02-acoes","J03-mundo-vivo","M01-telas-base","M02-notebook","M03-equipamentos","M04-mapa","C01-cenas","L01-carregamento","L02-laco-e-qualidade","F01-tela-final","L03-inicio"];
  var painel = null;
  var timer = null;
  var gpu = null;
  function obterGpu() {
    if (gpu !== null) return gpu;
    gpu = '?';
    try {
      var gl = window.__PONTO.renderer.getContext();
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (e) { gpu = '?'; }
    return gpu;
  }
  function desenhar() {
    var S = window.__PONTO || {};
    var marcas = S.marcas || [];
    var faltando = ESPERADAS.filter(function (m) { return marcas.indexOf(m) < 0; });
    var erros = S.erros || [];
    painel.textContent = '';
    function linha(t, cor) { var d = document.createElement('div'); d.textContent = t; if (cor) d.style.color = cor; painel.appendChild(d); }
    linha('DIAGNÓSTICO AO VIVO (F9 fecha)', '#F7941D');
    linha('Versão: ' + (S.versao || '?') + ' · Three.js r' + (window.THREE ? THREE.REVISION : '?') + (window.__PONTO_CARREGADOR ? ' · carregador ' + window.__PONTO_CARREGADOR : ''));
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
      if (S.personagem) {
        var p = S.personagem.raiz.position;
        linha('Área: ' + (S.area ? S.area.id : '?') + ' · posição ' + p.x.toFixed(1) + ', ' + p.z.toFixed(1));
      }
    } else {
      linha('O desempenho aparece quando a simulação estiver rodando.', '#AFC2D8');
    }
    linha('Seções: ' + (ESPERADAS.length - faltando.length) + '/' + ESPERADAS.length + (faltando.length ? ' · faltando: ' + faltando.join(', ') : ''), faltando.length ? '#FF7676' : '#6BF08E');
    linha('Erros: ' + (erros.length || 'nenhum'), erros.length ? '#FF7676' : '#6BF08E');
    erros.slice(-6).forEach(function (e) { linha('• ' + e, '#FF7676'); });
    if (S.perdasDeContexto) linha('3D reiniciado pelo navegador: ' + S.perdasDeContexto + 'x (pouca memória)', '#FFD36B');
  }
  function montar() {
    painel = document.createElement('div');
    var s = painel.style;
    s.position = 'absolute'; s.left = '8px'; s.bottom = '8px'; s.zIndex = '99'; s.maxWidth = '440px';
    s.background = 'rgba(6,22,44,0.95)'; s.border = '2px solid #F7941D'; s.borderRadius = '8px';
    s.padding = '10px 12px'; s.font = '12px/1.45 Arial, sans-serif'; s.color = '#FFFFFF';
    s.maxHeight = '70%'; s.overflow = 'auto'; s.pointerEvents = 'none';
    (document.getElementById('ponto-root') || document.body).appendChild(painel);
    desenhar();
    timer = setInterval(desenhar, 500);
  }
  if (window.__PONTO) window.__PONTO.alternarVerificacao = function () {
    if (painel) { clearInterval(timer); painel.remove(); painel = null; } else montar();
  };
})();
