<script>
  import { onMount } from 'svelte';
  import { publico } from '#lib/api.js';

  let q = $state('');
  let cargando = $state(false);
  let error = $state('');
  let resultados = $state(null);
  let abiertos = $state({});
  let oficial = $state([]);
  let timer;
  let ultimo = 0;

  function alEscribir() {
    clearTimeout(timer);
    error = '';
    if (q.trim().length < 3) {
      ultimo++;
      resultados = null;
      cargando = false;
      return;
    }
    timer = setTimeout(buscar, 400);
  }

  async function buscar() {
    const mio = ++ultimo;
    cargando = true;
    try {
      const r = await publico('buscar', { q: q.trim() });
      if (mio !== ultimo) return;
      resultados = r.resultados ?? [];
      abiertos = {};
    } catch {
      if (mio !== ultimo) return;
      error = 'No pudimos conectar. Intenta de nuevo en un momento.';
    } finally {
      if (mio === ultimo) cargando = false;
    }
  }

  const numeros = (c) => Array.from({ length: Math.min(c.total, 60) }, (_, k) => c.desde + k);
  const regalo = (c) => Math.max(0, c.total - c.pagados);
  const alternar = (k) => (abiertos[k] = !abiertos[k]);

  onMount(async () => {
    try {
      const r = await publico('resultados');
      oficial = (r.sorteos ?? []).filter((s) => s.log.length).reverse().slice(0, 10);
    } catch {}
  });
</script>

<svelte:head>
  <title>Dinamicas Loayza | Verifica tus números</title>
</svelte:head>

<header class="top">🍀 Dinamicas Loayza</header>

{#snippet campana(camp, k0, previa)}
  <div class="bloque" class:previa>
    <h3 class="titulo">{previa ? '📁' : '📣'} {camp.nombre}{previa ? ' · finalizada' : ''}</h3>
    {#if camp.seguidor}<span class="badge oro">⭐ Anotado en el sorteo de seguidores</span>{/if}
    {#if camp.totalNumeros > 0}
      <p class="total">
        {previa ? 'Participaste con' : 'Participando con'} <strong>{camp.totalNumeros}</strong> números
      </p>
      {#if !previa && camp.sorpresas > 0}
        <p class="nota">
          🎁 Con tu compra pagada tienes 1 oportunidad
          {camp.sorpresas === 1 ? 'en el premio sorpresa' : `en cada uno de los ${camp.sorpresas} premios sorpresa`}
          de esta campaña.
        </p>
      {/if}
    {/if}
    {#each camp.compras as c, j}
      {@const k = `${k0}-${j}`}
      <div class="ticket" class:pendiente={c.estado === 'pendiente'}>
        <strong>🎟️ {c.combo === 'Individual' ? 'Números sueltos' : 'Combo ' + c.combo}</strong>
        <p>
          Pagaste {c.pagados} · recibes <strong>{c.total} números</strong>
          {#if regalo(c)}(incluye {regalo(c)} de regalo 🎁){/if}
        </p>
        <p class="suave">📅 {c.fecha}</p>
        {#if c.estado === 'pagado'}
          {#if previa}
            <p class="suave">Campaña finalizada</p>
          {:else}
            <p class="ok">✅ Verificado y listo para la dinámica</p>
          {/if}
          <p>Números: <strong>#{c.desde}</strong> al <strong>#{c.hasta}</strong></p>
          <button class="link" onclick={() => alternar(k)}>
            {abiertos[k] ? 'Ocultar números' : 'Ver mis números'}
          </button>
          {#if abiertos[k]}
            <div class="chips">
              {#each numeros(c) as n}<span>{n}</span>{/each}
              {#if c.total > 60}<span>…</span>{/if}
            </div>
          {/if}
        {:else}
          <p class="pend">⏳ Pendiente de confirmar el pago</p>
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

<main>
  <section class="hero">
    <h1>Verifica tus números de la suerte 🍀</h1>
    <p>Escribe tu nombre tal como lo indicaste en facebook o whatsapp</p>
    <label class="buscador">
      <span>🔍</span>
      <input
        type="search"
        bind:value={q}
        oninput={alEscribir}
        placeholder="Ingresa tu nombre..."
        autocomplete="off"
      />
    </label>
  </section>

  {#if cargando}<p class="info">Buscando…</p>{/if}
  {#if error}<p class="info error">{error}</p>{/if}

  {#if resultados}
    {#if resultados.length === 0 && !cargando}
      <p class="info">No encontramos ese nombre. Revisa cómo lo escribiste o escríbenos por facebook o whatsapp.</p>
    {/if}

    {#each resultados as p, i}
      {@const vig = p.campanas.filter((c) => c.vigente)}
      {@const ant = p.campanas.filter((c) => !c.vigente)}
      <article class="persona">
        <h2>👤 {p.nombre}</h2>
        {#each vig as camp, a}
          {@render campana(camp, `${i}-${a}`, false)}
        {/each}
        {#if !vig.length}
          <p class="nota">No tienes participación en una campaña vigente.</p>
        {/if}
        {#if ant.length}
          <button class="link" onclick={() => alternar(`ant-${i}`)}>
            {abiertos[`ant-${i}`] ? 'Ocultar' : 'Ver'} campañas anteriores ({ant.length})
          </button>
          {#if abiertos[`ant-${i}`]}
            <div class="anteriores">
              {#each ant as camp, a}
                {@render campana(camp, `${i}-p${a}`, true)}
              {/each}
            </div>
          {/if}
        {/if}
      </article>
    {/each}
  {/if}

  {#if oficial.length}
    <section class="oficial">
      <h2>📋 Registro oficial de dinámicas</h2>
      {#each oficial as s}
        <div class="sorteo">
          <h3>{s.premio} <small>{s.campana}</small></h3>
          <ol>
            {#each s.log as l}
              <li class:ganador={l.resultado === 'GANADOR'}>
                Giro {l.giro}/{s.giros}:
                {#if s.tipo === 'NUMEROS'}#{l.num} · {/if}{l.nombre} —
                {l.resultado === 'GANADOR' ? '🏆 GANADOR' : '💧 Al agua'}
              </li>
            {/each}
          </ol>
        </div>
      {/each}
    </section>
  {/if}
</main>

<style>
  .top {
    background: var(--verde-osc);
    color: white;
    text-align: center;
    padding: 14px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  main { max-width: 560px; margin: 0 auto; padding: 20px 16px 60px; }
  .hero { text-align: center; padding: 18px 0 10px; }
  h1 { font-size: 1.6rem; margin: 0 0 6px; }
  .hero p { margin: 0 0 16px; color: var(--suave); }
  .buscador {
    display: flex; align-items: center; gap: 10px;
    background: var(--tarjeta); border: 2px solid var(--borde);
    border-radius: 999px; padding: 4px 18px;
  }
  .buscador:focus-within { border-color: var(--verde); }
  .buscador input {
    flex: 1; border: 0; outline: 0; background: transparent;
    font-size: 1.1rem; padding: 12px 0;
  }
  .info { text-align: center; color: var(--suave); margin-top: 18px; }
  .error { color: var(--rojo); }
  .persona {
    background: var(--tarjeta); border: 1px solid var(--borde);
    border-radius: 18px; padding: 16px; margin-top: 18px;
  }
  .persona h2 { margin: 0 0 8px; font-size: 1.2rem; }
  .total { margin: 6px 0; font-size: 1.05rem; }
  .nota { font-size: 0.88rem; color: var(--suave); margin: 4px 0 12px; }
  .badge { display: inline-block; border-radius: 999px; padding: 4px 12px; font-size: 0.85rem; }
  .oro { background: #fff4cc; color: #7a5a00; }
  .ticket {
    border: 2px dashed var(--verde); background: var(--verde-claro);
    border-radius: 14px; padding: 12px 14px; margin-top: 12px;
  }
  .ticket.pendiente { border-color: #c9a227; background: #fff8e1; }
  .ticket p { margin: 6px 0; }
  .bloque { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--borde); }
  .titulo { margin: 0 0 6px; font-size: 1rem; color: var(--verde-osc); }
  .suave { color: var(--suave); font-size: 0.9rem; }
  .ok { color: var(--verde-osc); font-weight: 600; }
  .pend { color: #8a6d00; font-weight: 600; }
  .link {
    background: none; border: 0; padding: 4px 0;
    color: var(--verde-osc); text-decoration: underline; font-weight: 600;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chips span {
    background: white; border: 1px solid var(--verde); border-radius: 8px;
    padding: 4px 9px; font-weight: 600; font-size: 0.9rem;
  }
  .oficial { margin-top: 36px; }
  .oficial h2 { font-size: 1.15rem; }
  .sorteo {
    background: var(--tarjeta); border: 1px solid var(--borde);
    border-radius: 14px; padding: 12px 16px; margin-top: 12px;
  }
  .sorteo h3 { margin: 0 0 6px; font-size: 1rem; }
  .sorteo small { color: var(--suave); font-weight: 400; margin-left: 6px; }
  .sorteo ol { margin: 0; padding-left: 20px; }
  .sorteo li { margin: 4px 0; font-size: 0.93rem; }
  .sorteo li.ganador { font-weight: 700; color: var(--verde-osc); }
  .anteriores {
    margin-top: 10px; padding: 4px 12px 12px;
    background: #eceee9; border-radius: 14px;
  }
  .bloque.previa { border-top-color: #d3d7cf; }
  .bloque.previa .titulo { color: var(--suave); }
  .bloque.previa .total { color: var(--suave); }
  .bloque.previa .ticket { border: 2px dashed #b7bcb3; background: #f7f8f5; }
  .bloque.previa .chips span { border-color: #b7bcb3; color: var(--suave); }
  .bloque.previa .link { color: var(--suave); }
</style>