<script>
  import { onMount } from 'svelte';
  import { adminGo } from '#lib/api.js';
  import Escenario from './Escenario.svelte';
  import MenuAdmin from './MenuAdmin.svelte';

  const ETIQ = {
    NUMEROS: '🏆 Principal',
    PERSONAS: '🎁 Sorpresa para compradores',
    SEGUIDORES: '⭐ Sorpresa para seguidores'
  };

  let lista = $state([]);
  let abierto = $state(null);
  let cargando = $state(true);
  let error = $state('');

  const grupos = $derived.by(() => {
    const m = new Map();
    for (const s of lista) {
      if (!m.has(s.campanaId)) m.set(s.campanaId, { nombre: s.campanaNombre, premios: [] });
      m.get(s.campanaId).premios.push(s);
    }
    return [...m].sort(([a], [b]) => b - a).map(([id, grupo]) => ({ id, ...grupo }));
  });

  async function cargar() {
    cargando = true;
    error = '';
    try {
      const r = await adminGo('/premios');
      if (Array.isArray(r)) lista = r;
      else error = r?.error ?? 'Error al cargar';
    } catch (e) {
      error = e.message;
    }
    cargando = false;
  }
  onMount(cargar);

  function volver() {
    abierto = null;
    cargar();
  }
</script>

{#if abierto}
  {#key abierto}<Escenario sorteoId={abierto} {volver} />{/key}
{:else}
  <MenuAdmin actual="/dinamica" />
  <main class="cont">
    {#if cargando}<p class="gris">Cargando…</p>{/if}
    {#if error}<div class="msg err">{error}</div>{/if}
    {#if !cargando && !lista.length}
      <p class="gris">Aún no hay premios. Créalos en /admin → Premios.</p>
    {/if}

    {#each grupos as { id, nombre, premios } (id)}
      <section class="caja">
        <strong>{nombre}</strong>
        {#each premios as s (s.id)}
          <button class="fila" onclick={() => (abierto = s.id)}>
            <span>
              <strong>{s.premio}</strong><br />
              <small>{ETIQ[s.tipo] ?? s.tipo} · {s.giros} {s.giros === 1 ? 'giro' : 'giros'}</small>
            </span>
            <span>
              {s.ganador ? '🏆 ' + s.ganador : s.hechos ? `Giro ${s.hechos}/${s.giros}` : 'Por jugar ▶'}
            </span>
          </button>
        {/each}
      </section>
    {/each}
  </main>
{/if}

<style>
  .fila {
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
    width: 100%; text-align: left; background: none; border: 0;
    border-bottom: 1px solid var(--borde); padding: 12px 0;
  }
  .fila:last-child { border-bottom: 0; }
  small { color: var(--suave); }
</style>