<script>
  import { onMount, tick } from 'svelte';
  import { admin } from '#lib/api.js';
  import * as son from '#lib/sonido.js';

  let { sorteoId, volver } = $props();

  const H = 96; // alto de cada fila del carrete (px)
  const DURACION = 9000; // duración máxima del giro (ms)
  const FACTOR_FINAL = 1.4; // el giro final dura esto veces más (1 = igual)
  const FILAS_POR_SEG = 13; // velocidad media: más alto = más filas, más vueltas a la lista
  const ESPERA_AUTO = 4500; // tiempo antes de quitar de la lista en modo automático (ms)

  let cargando = $state(true);
  let error = $state('');
  let sorteo = $state(null);
  let entradas = $state([]);
  let log = $state([]);
  let carrete = $state([]);
  let offset = $state(0);
  let anima = $state(false);
  let dur = $state(DURACION);
  let girando = $state(false);
  let revisando = $state(false);
  let ultimo = $state(null);
  let resaltado = $state('');
  let salidoNum = $state(null);
  let busca = $state('');
  let modo = $state('persona');
  let mezclada = $state(false);
  let listaEl = $state();
  let carreteEl = $state();
  let sonidoOn = $state(son.sonidoActivo());
  let autoQuitar = $state(true);
  let pendiente = $state(null); // { num, nombre } esperando quitarse manualmente

  const esNum = $derived(sorteo?.tipo === 'NUMEROS');
  const terminado = $derived(log.some((l) => l.resultado === 'GANADOR'));
  const proximo = $derived(log.length + 1);

  const filas = $derived.by(() => {
    const q = busca.trim().toLowerCase();
    const base = q ? entradas.filter((e) => e.nombre.toLowerCase().includes(q)) : entradas;
    if (esNum && modo === 'persona') {
      const m = new Map();
      for (const e of base) m.set(e.nombre, (m.get(e.nombre) ?? 0) + 1);
      return [...m].map(([nombre, n]) => ({ nombre, n }));
    }
    return base.map((e) => ({ nombre: e.nombre, num: e.num }));
  });

  const vacio = { nombre: '', num: '' };

  async function cargar() {
    try {
      const r = await admin('lista', { sorteo: sorteoId });
      if (r.error) {
        error = r.error;
        return;
      }
      sorteo = r.sorteo;
      entradas = r.entradas;
      log = r.log;
      ultimo = r.log.at(-1) ?? null;
      carrete = [
        vacio,
        ultimo ? { num: ultimo.num, nombre: ultimo.nombre } : { nombre: '🍀 ¿Quién será?', num: '' },
        vacio
      ];
    } catch {
      error = 'Sin conexión';
    } finally {
      cargando = false;
    }
  }
  onMount(cargar);

  function mezclar() {
    const a = entradas.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    entradas = a;
    mezclada = true;
  }

  function marcarEnLista(num) {
    const el = listaEl?.querySelector(`[data-n="${num}"]`);
    if (!el || !listaEl) return;
    listaEl.scrollTo({
      top: el.offsetTop - listaEl.clientHeight / 2 + el.clientHeight / 2,
      behavior: 'smooth'
    });
  }

  function seguirTicks() {
    let ultimaFila = 0;
    let ultimoTick = 0;
    const paso = (t) => {
      if (!girando || !carreteEl) return;
      const y = new DOMMatrixReadOnly(getComputedStyle(carreteEl).transform).m42;
      const fila = Math.floor(-y / H);
      if (fila > ultimaFila && t - ultimoTick > 28) {
        son.tick(t - ultimoTick > 150 ? 1.4 : 1);
        ultimoTick = t;
      }
      ultimaFila = Math.max(ultimaFila, fila);
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function alternarSonido() {
    sonidoOn = !sonidoOn;
    son.setSonido(sonidoOn);
    son.activar();
    if (sonidoOn) son.golpe(); // prueba rápida
  }

  function quitarDeLista() {
    if (!pendiente) return;
    const { num, nombre } = pendiente;
    entradas = entradas.filter((e) => e.num !== num);
    salidoNum = null;
    resaltado = nombre;
    pendiente = null;
    revisando = false;
  }

  async function girar() {
    if (girando || revisando || terminado || !entradas.length) return;
    son.activar(); // el clic habilita el audio del navegador
    girando = true;
    error = '';
    salidoNum = null;
    resaltado = '';
    busca = '';
    if (esNum) modo = 'numero'; // el orden real del carrete es el de la lista por número
    let r;
    try {
      // El servidor decide el resultado y lo registra; el carrete solo lo muestra
      r = await admin('girar', { sorteo: sorteoId });
    } catch {
      error = 'Sin conexión. Revisa el registro antes de repetir.';
      girando = false;
      return;
    }
    if (r.error) {
      error = r.error;
      girando = false;
      return;
    }

    // El carrete recorre la lista EN SU ORDEN ACTUAL, da las vueltas que haga falta
    // y frena en el ganador con los mismos vecinos que tiene en la lista
    const lista = entradas.slice();
    let w = lista.findIndex((e) => e.num === r.num);
    if (w < 0) {
      lista.push({ num: r.num, nombre: r.nombre });
      w = lista.length - 1;
    }
    const n = lista.length;
    dur = DURACION * (proximo === sorteo.giros ? FACTOR_FINAL : 1);
    const L = Math.max(3, Math.round((dur / 1000) * FILAS_POR_SEG)); // filas hasta el ganador
    const len = L + 2;
    const mod = (a) => ((a % n) + n) % n;
    carrete = Array.from({ length: len }, (_, k) => lista[mod(w - (len - 2) + k)]);

    anima = false;
    offset = 0;
    await tick();
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    anima = true;
    offset = -(carrete.length - 3) * H;
    son.arranque();
    seguirTicks();
    await new Promise((ok) => setTimeout(ok, dur + 150));

    son.golpe(); // el carrete se clava
    await new Promise((ok) => setTimeout(ok, 350)); // pausa de suspenso

    ultimo = { giro: r.giro, num: r.num, nombre: r.nombre, resultado: r.resultado };
    log = [...log, ultimo];
    salidoNum = r.num;
    girando = false;
    revisando = true;
    if (r.resultado === 'GANADOR') {
      son.ganador();
      festejar();
    } else {
      son.agua();
    }
    await tick();
    marcarEnLista(r.num);

    pendiente = { num: r.num, nombre: r.nombre };
    if (autoQuitar) {
      // Se deja marcado en la lista un momento y luego sale solo
      await new Promise((ok) => setTimeout(ok, ESPERA_AUTO));
      // si mientras tanto lo quitaron a mano, no hacer nada
      if (pendiente?.num === r.num) quitarDeLista();
    }
  }

  async function festejar() {
    const { default: confetti } = await import('canvas-confetti');
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
    const fin = Date.now() + 3500;
    (function lluvia() {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 } });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < fin) requestAnimationFrame(lluvia);
    })();
  }

  const pantalla = () =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
</script>

<div class="escena">
  {#if cargando}
    <p class="suave">Cargando…</p>
  {:else if !sorteo}
    <p class="suave">{error || 'No se pudo cargar la dinámica'}</p>
    <button class="top" onclick={volver}>← Volver</button>
  {:else}
    <div class="rejilla">
      <section class="escenario">
        <div class="acciones">
          <button class="top" onclick={volver} disabled={girando || revisando}>← Dinámicas</button>
          <span>
            <button class="top" onclick={() => (autoQuitar = !autoQuitar)} disabled={girando || revisando} title="Define si el número que sale se quita de la lista solo o a mano">🗑️ Quitar: {autoQuitar ? 'Auto' : 'Manual'}</button>
            <button class="top" onclick={alternarSonido}>{sonidoOn ? '🔊' : '🔇'}</button>
            <button class="top" onclick={pantalla}>⛶ Pantalla completa</button>
          </span>
        </div>

        <h1 class="premio">{sorteo.premio}</h1>

        <div class="giros">
          {#each { length: sorteo.giros } as _, i}
            {@const g = i + 1}
            {@const l = log.find((x) => x.giro === g)}
            <span class="pill" class:hecho={l} class:ahora={!l && g === proximo && !terminado}>
              {#if l}{l.resultado === 'GANADOR' ? '🏆' : '💧'}{:else}{g === sorteo.giros ? '🏆' : g}{/if}
            </span>
          {/each}
        </div>
        <p class="giroTxt">
          {#if terminado}
            Dinámica terminada
          {:else if proximo === sorteo.giros}
            🔥 ¡Giro final! ({proximo} de {sorteo.giros})
          {:else}
            Giro {proximo} de {sorteo.giros}
          {/if}
        </p>

        <div
          class="ventana"
          class:agua={!girando && ultimo?.resultado === 'AL AGUA'}
          class:gana={!girando && ultimo?.resultado === 'GANADOR'}
          style="--h:{H}px"
        >
          <div class="banda"></div>
          {#if !girando && ultimo?.resultado === 'AL AGUA'}<div class="equis">✖</div>{/if}
          <div
            class="carrete"
            bind:this={carreteEl}
            style="transform: translateY({offset}px); transition-duration: {anima ? dur : 0}ms"
          >
            {#each carrete as c}
              <div class="item">
                <span>{c.nombre}</span>
                {#if esNum && c.num !== ''}<small>#{c.num}</small>{/if}
              </div>
            {/each}
          </div>
        </div>

        {#if !girando && ultimo}
          {#if ultimo.resultado === 'AL AGUA'}
            <p class="res agua">
              💧 ¡AL AGUA!
              {#if esNum}Ese número sale del juego. Si tiene más, sigue participando…{:else}Queda fuera de esta dinámica.{/if}
            </p>
          {:else}
            <p class="res gana">🏆 ¡GANADOR! {ultimo.nombre}</p>
          {/if}
        {/if}

        {#if error}<p class="res agua">{error}</p>{/if}

        {#if terminado}
          <button class="girar" onclick={volver} disabled={revisando}>← Volver a las dinámicas</button>
        {:else}
          <button class="girar" onclick={girar} disabled={girando || revisando || !entradas.length}>
            {girando ? 'Girando…' : proximo === sorteo.giros ? '🎰 GIRO FINAL' : `🎰 Girar (giro ${proximo})`}
          </button>
        {/if}

        {#if !autoQuitar && pendiente}
          <button class="quitar" onclick={quitarDeLista}>
            🗑️ Quitar {esNum ? `#${pendiente.num} · ` : ''}{pendiente.nombre} de la lista
          </button>
        {/if}

        {#if log.length}
          <ul class="historial">
            {#each log as l}
              <li>
                Giro {l.giro}: {#if esNum}#{l.num} ·&nbsp;{/if}{l.nombre} —
                {l.resultado === 'GANADOR' ? '🏆 Ganador' : '💧 Al agua'}
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <aside class="lista">
        <h2>📋 Lista de transparencia</h2>
        <p class="grande">
          <strong>{entradas.length}</strong> {esNum ? 'números' : 'participantes'} en juego
        </p>
        <p class="orden">{mezclada ? '🔀 Lista mezclada' : '📅 Orden de ingreso'}</p>
        <div class="herr">
          <input bind:value={busca} placeholder="🔍 Buscar nombre…" />
          <button onclick={mezclar} disabled={girando || revisando}>🔀 Mezclar</button>
        </div>
        {#if esNum}
          <div class="modo">
            <button class:act={modo === 'persona'} onclick={() => (modo = 'persona')}>Por persona</button>
            <button class:act={modo === 'numero'} onclick={() => (modo = 'numero')}>Por número</button>
          </div>
        {/if}
        <ul bind:this={listaEl}>
          {#each filas as f (f.num ?? f.nombre)}
            <li
              data-n={f.num}
              class:sale={f.num !== undefined && f.num === salidoNum}
              class:res={f.nombre === resaltado}
            >
              <span>{#if esNum && f.num !== undefined}#{f.num} ·&nbsp;{/if}{f.nombre}</span>
              {#if f.n}<b>×{f.n}</b>{/if}
            </li>
          {/each}
        </ul>
      </aside>
    </div>
  {/if}
</div>

<style>
  .escena {
    background: #0a0f0b; color: #f1f5ef;
    min-height: calc(100vh - 48px); padding: 16px;
  }
  .suave { color: #9fb09b; }
  .rejilla {
    display: grid; gap: 18px; grid-template-columns: 1fr;
    max-width: 1400px; margin: 0 auto;
  }
  .escenario { order: 1; min-width: 0; }
  .lista { order: 2; min-width: 0; }
  @media (min-width: 900px) {
    .rejilla { grid-template-columns: 30% 1fr; }
    .lista { order: 1; }
    .escenario { order: 2; }
    .lista ul { max-height: calc(100vh - 330px) !important; }
  }

  .acciones { display: flex; justify-content: space-between; }
  .top {
    background: transparent; color: #9fb09b; border: 1px solid #2f4a35;
    border-radius: 8px; padding: 6px 12px;
  }
  .premio {
    text-align: center; color: var(--oro); margin: 10px 0 14px;
    font-size: clamp(1.5rem, 3.5vw, 2.4rem);
  }
  .giros { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
  .pill {
    width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
    border: 2px solid #2f4a35; color: #9fb09b; font-weight: 700;
  }
  .pill.hecho { background: #1c2b1f; }
  .pill.ahora { border-color: var(--oro); color: var(--oro); box-shadow: 0 0 14px rgba(245, 179, 1, 0.6); }
  .giroTxt { text-align: center; color: #cfe0cb; margin: 10px 0 0; font-weight: 600; }

  .ventana {
    position: relative; height: calc(var(--h) * 3); overflow: hidden;
    margin: 22px auto; max-width: 780px; background: #0f1a12;
    border: 3px solid #39ff88; border-radius: 22px;
    box-shadow: 0 0 28px rgba(57, 255, 136, 0.35);
  }
  .ventana::before, .ventana::after {
    content: ''; position: absolute; left: 0; right: 0; height: var(--h);
    z-index: 1; pointer-events: none;
  }
  .ventana::before { top: 0; background: linear-gradient(#0f1a12, transparent); }
  .ventana::after { bottom: 0; background: linear-gradient(transparent, #0f1a12); }
  .banda {
    position: absolute; left: 0; right: 0; top: var(--h); height: var(--h);
    border-top: 2px solid #39ff88; border-bottom: 2px solid #39ff88;
    background: rgba(57, 255, 136, 0.08); pointer-events: none;
  }
  .carrete {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.12, 0.7, 0.1, 1);
    will-change: transform;
  }
  .item {
    height: var(--h); display: flex; align-items: center; justify-content: center;
    gap: 14px; white-space: nowrap; font-weight: 800; padding: 0 14px;
    font-size: clamp(1.5rem, 4.6vw, 3.2rem);
  }
  .item span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .item small { font-size: 0.45em; color: #7fa88a; font-weight: 600; }

  .ventana.agua {
    border-color: var(--rojo); background: #2a0f0f; animation: tiembla 0.5s;
    box-shadow: 0 0 28px rgba(220, 38, 38, 0.5);
  }
  .ventana.agua .banda { border-color: var(--rojo); background: rgba(220, 38, 38, 0.12); }
  .ventana.gana {
    border-color: var(--oro); background: #2a2208; transform: scale(1.06);
    box-shadow: 0 0 40px rgba(245, 179, 1, 0.7); transition: transform 0.4s;
  }
  .ventana.gana .banda { border-color: var(--oro); background: rgba(245, 179, 1, 0.12); }
  .equis {
    position: absolute; inset: 0; display: grid; place-items: center; z-index: 2;
    font-size: calc(var(--h) * 2.4); color: rgba(220, 38, 38, 0.8); pointer-events: none;
  }
  @keyframes tiembla {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-14px); }
    40% { transform: translateX(12px); }
    60% { transform: translateX(-8px); }
    80% { transform: translateX(6px); }
  }

  .res { text-align: center; font-size: 1.25rem; font-weight: 700; margin: 8px 0; }
  .res.agua { color: #ff7b7b; }
  .res.gana { color: var(--oro); font-size: 1.8rem; }
  .girar {
    display: block; margin: 18px auto 0; padding: 18px 44px;
    font-size: 1.4rem; font-weight: 800; border: 0; border-radius: 16px;
    background: var(--oro); color: #1c1400; box-shadow: 0 6px 0 #a87a00;
  }
  .girar:disabled { opacity: 0.5; }
  .quitar {
    display: block; margin: 14px auto 0; padding: 8px 20px;
    font-size: 0.95rem; font-weight: 700; border: 0; border-radius: 10px;
    background: var(--rojo); color: #fff; box-shadow: 0 3px 0 #8f1f1f;
  }
  .quitar:active { transform: translateY(2px); box-shadow: 0 1px 0 #8f1f1f; }
  .historial {
    list-style: none; padding: 0; margin: 22px auto 0; max-width: 780px;
    color: #9fb09b; font-size: 0.95rem;
  }
  .historial li { padding: 4px 0; border-bottom: 1px solid #1c2b1f; }

  .lista { background: #0f1a12; border: 1px solid #1f3324; border-radius: 16px; padding: 14px; }
  .lista h2 { margin: 0 0 6px; font-size: 1.05rem; }
  .grande { margin: 4px 0 2px; color: #cfe0cb; }
  .grande strong { font-size: 2rem; color: var(--oro); }
  .orden { margin: 0 0 10px; color: #9fb09b; font-size: 0.9rem; }
  .herr { display: flex; gap: 8px; }
  .herr input {
    background: #0a0f0b; color: #f1f5ef; border-color: #2f4a35; padding: 9px 12px;
  }
  .herr button, .modo button {
    background: #1c2b1f; color: #f1f5ef; border: 1px solid #2f4a35;
    border-radius: 10px; padding: 8px 12px; white-space: nowrap;
  }
  .herr button:disabled { opacity: 0.5; }
  .modo { display: flex; gap: 6px; margin-top: 8px; }
  .modo button { flex: 1; }
  .modo button.act { background: var(--verde); border-color: var(--verde); }
  .lista ul {
    list-style: none; padding: 0; margin: 10px 0 0; max-height: 50vh;
    overflow-y: auto; position: relative;
  }
  .lista li {
    display: flex; justify-content: space-between; gap: 8px;
    padding: 8px 6px; border-bottom: 1px solid #1c2b1f; font-size: 1.05rem;
  }
  .lista li.res { background: rgba(245, 179, 1, 0.15); border-radius: 8px; }
  .lista li.sale {
    background: rgba(245, 179, 1, 0.4); outline: 2px solid var(--oro);
    border-radius: 8px; font-weight: 700;
  }
  .lista li b { color: var(--oro); }
</style>