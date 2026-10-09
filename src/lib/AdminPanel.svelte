<script>
  import { onMount } from 'svelte';
  import { admin } from '#lib/api.js';
  import Venta from './Venta.svelte';
  import Seguidor from './Seguidor.svelte';
  import Premios from './Premios.svelte';
  import Ventas from './Ventas.svelte';
  import Combos from './Combos.svelte';

  let campanas = $state([]);
  let combos = $state([]);
  let cargando = $state(true);
  let sel = $state('');
  let vista = $state('venta');
  let nueva = $state('');
  let aviso = $state('');

  const actual = $derived(campanas.find((c) => c.id === sel) ?? null);
  const otraActiva = $derived(campanas.find((c) => c.estado === 'activa' && c.id !== sel) ?? null);

  const TABS = [
    ['venta', '➕ Venta'],
    ['seguidor', '⭐ Seguidor'],
    ['premios', '🎁 Premios'],
    ['ventas', '📋 Ventas'],
    ['combos', '🧩 Combos']
  ];

  async function cargar() {
    try {
      const [cs, ks] = await Promise.all([admin('campanas'), admin('combos')]);
      if (Array.isArray(cs)) campanas = cs;
      if (Array.isArray(ks)) combos = ks;
      if (!campanas.some((c) => c.id === sel)) {
        sel = (campanas.find((c) => c.estado === 'activa') ?? campanas.at(-1))?.id ?? '';
      }
    } catch {
      aviso = 'Sin conexión';
    } finally {
      cargando = false;
    }
  }
  onMount(cargar);

  async function crear() {
    if (nueva.trim().length < 3) return;
    const previa = campanas.find((c) => c.estado === 'activa');
    if (previa && !confirm(`Se cerrarán las ventas de "${previa.nombre}". ¿Continuar?`)) return;
    const r = await admin('crearCampana', { nombre: nueva });
    aviso = r.error ?? '';
    if (!r.error) {
      nueva = '';
      sel = r.id;
    }
    await cargar();
  }

  async function cerrar() {
    if (!confirm(`¿Cerrar las ventas de "${actual.nombre}"? Ya no se podrán registrar ventas ni seguidores.`)) return;
    await admin('estadoCampana', { id: actual.id, estado: 'cerrada' });
    await cargar();
  }

  async function reabrir() {
    if (otraActiva && !confirm(`Se cerrarán las ventas de "${otraActiva.nombre}". ¿Continuar?`)) return;
    await admin('estadoCampana', { id: actual.id, estado: 'activa' });
    await cargar();
  }
</script>

<main class="cont">
  {#if cargando}
    <p class="gris">Cargando…</p>
  {:else}
    {#if aviso}<div class="msg err">{aviso}</div>{/if}

    <section class="caja">
      {#if campanas.length}
        <label class="campo" for="camp">Campaña</label>
        <select id="camp" bind:value={sel}>
          {#each campanas as c}
            <option value={c.id}>{c.nombre}{c.estado === 'activa' ? ' (activa)' : ''}</option>
          {/each}
        </select>
      {:else}
        <p>Aún no hay campañas. Crea la primera 👇</p>
      {/if}

      {#if actual}
        <p class="stats">
          🎟️ {actual.numeros} números · 👥 {actual.personas} personas ·
          ⏳ {actual.pendientes} pendientes · ⭐ {actual.seguidores} seguidores
        </p>
        {#if actual.estado === 'activa'}
          <button class="btn sec" onclick={cerrar}>🔒 Cerrar ventas</button>
        {:else}
          <button class="btn sec" onclick={reabrir}>🔓 Reabrir ventas</button>
        {/if}
      {/if}

      <details>
        <summary class="campo">➕ Nueva campaña</summary>
        <input bind:value={nueva} placeholder="Ej: Dinamica 15 octubre" />
        <button class="btn" onclick={crear} disabled={nueva.trim().length < 3}>Crear campaña</button>
      </details>
    </section>

    {#if actual}
      <nav class="tabs">
        {#each TABS as [id, texto]}
          <button class:act={vista === id} onclick={() => (vista = id)}>{texto}</button>
        {/each}
      </nav>

      {#key actual.id}
        {#if vista === 'venta'}
          <Venta campana={actual.id} activa={actual.estado === 'activa'} {combos} alCambiar={cargar} />
        {:else if vista === 'seguidor'}
          <Seguidor campana={actual.id} activa={actual.estado === 'activa'} alCambiar={cargar} />
        {:else if vista === 'premios'}
          <Premios campana={actual.id} />
        {:else if vista === 'ventas'}
          <Ventas campana={actual.id} alCambiar={cargar} />
        {:else}
          <Combos {combos} alCambiar={cargar} />
        {/if}
      {/key}
    {/if}
  {/if}
</main>