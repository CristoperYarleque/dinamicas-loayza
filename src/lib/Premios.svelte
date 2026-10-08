<script>
  import { onMount } from 'svelte';
  import { admin } from '#lib/api.js';

  let { campana } = $props();

  const ETIQ = {
    NUMEROS: 'Principal',
    PERSONAS: 'Sorpresa para compradores',
    SEGUIDORES: 'Sorpresa para seguidores (gratis)'
  };

  let lista = $state([]);
  let premio = $state('');
  let tipo = $state('PRINCIPAL');
  let giros = $state(3);
  let msg = $state('');
  let enviando = $state(false);

  async function cargar() {
    try {
      const s = await admin('sorteos');
      if (Array.isArray(s)) lista = s.filter((x) => x.campana === campana);
    } catch {
      msg = 'Sin conexión';
    }
  }
  onMount(cargar);

  const alTipo = () => (giros = tipo === 'PRINCIPAL' ? 3 : 1);

  async function crear(e) {
    e.preventDefault();
    if (enviando) return;
    enviando = true;
    msg = '';
    try {
      const r = await admin('premio', { campana, premio, tipo, giros });
      msg = r.error ?? '';
      if (!r.error) premio = '';
      await cargar();
    } catch {
      msg = 'Sin conexión. Revisa la lista antes de repetir.';
    } finally {
      enviando = false;
    }
  }

  async function cambiar(s, n) {
    const r = await admin('giros', { sorteo: s.id, n });
    msg = r.error ?? '';
    await cargar();
  }
</script>

<form class="caja" onsubmit={crear}>
  <label class="campo" for="p-nombre">Premio</label>
  <input id="p-nombre" bind:value={premio} placeholder="Ej: Horno microondas" autocomplete="off" />

  <label class="campo" for="p-tipo">Tipo</label>
  <select id="p-tipo" bind:value={tipo} onchange={alTipo}>
    <option value="PRINCIPAL">🏆 Principal (por números comprados)</option>
    <option value="SORPRESA">🎁 Sorpresa para compradores (1 oportunidad por persona)</option>
    <option value="SEGUIDORES">⭐ Sorpresa gratis para seguidores</option>
  </select>

  <label class="campo" for="p-giros">Giros hasta el ganador</label>
  <input id="p-giros" type="number" min="1" max="20" bind:value={giros} />

  <button class="btn" disabled={enviando || premio.trim().length < 2}>
    {enviando ? 'Creando…' : 'Agregar premio'}
  </button>
  {#if msg}<div class="msg err">{msg}</div>{/if}
</form>

<section class="caja">
  <strong>🎁 Premios de esta campaña</strong>
  {#if !lista.length}<p class="gris">Aún no hay premios.</p>{/if}
  {#each lista as s}
    <div class="item">
      <div>
        <strong>{s.premio}</strong><br />
        <small>{ETIQ[s.tipo] ?? s.tipo}</small>
      </div>
      <div>
        {#if s.ganador}
          🏆 {s.ganador}
        {:else if s.hechos}
          Giro {s.hechos}/{s.giros}
        {:else}
          <input
            class="mini" type="number" min="1" max="20" value={s.giros}
            onchange={(e) => cambiar(s, e.currentTarget.value)}
          /> giros
        {/if}
      </div>
    </div>
  {/each}
</section>