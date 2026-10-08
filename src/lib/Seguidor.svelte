<script>
  import { onMount } from 'svelte';
  import { admin } from '#lib/api.js';

  let { campana, activa, alCambiar } = $props();

  let nombre = $state('');
  let nota = $state('');
  let enviando = $state(false);
  let resp = $state(null);
  let lista = $state([]);

  async function cargar() {
    try {
      const s = await admin('seguidores', { campana });
      if (Array.isArray(s)) lista = s.slice().reverse();
    } catch {}
  }
  onMount(cargar);

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    enviando = true;
    resp = null;
    try {
      const r = await admin('seguidor', { campana, nombre, nota });
      resp = r.error ? { error: r.error } : { ok: `✅ ${r.nombre} anotado` };
      if (!r.error) {
        nombre = '';
        nota = '';
        await cargar();
        alCambiar();
      }
    } catch {
      resp = { error: 'Sin conexión. Revisa la lista antes de repetir.' };
    } finally {
      enviando = false;
    }
  }
</script>

{#if !activa}
  <div class="msg err">Las ventas de esta campaña están cerradas. Usa "Reabrir ventas" si necesitas anotar más.</div>
{:else}
  <form class="caja" onsubmit={enviar}>
    <label class="campo" for="s-nombre">Nombre del seguidor</label>
    <input id="s-nombre" bind:value={nombre} placeholder="Nombre y apellido" autocomplete="off" />
    <label class="campo" for="s-nota">Nota (opcional)</label>
    <input id="s-nota" bind:value={nota} placeholder="Ej: like y comentario en el post" />
    <button class="btn" disabled={enviando || nombre.trim().length < 3}>
      {enviando ? 'Guardando…' : 'Anotar seguidor'}
    </button>
  </form>
  {#if resp?.ok}<div class="msg ok">{resp.ok}</div>{/if}
  {#if resp?.error}<div class="msg err">{resp.error}</div>{/if}
{/if}

<section class="caja">
  <strong>⭐ {lista.length} anotados</strong>
  {#each lista as s}
    <div class="item"><span>{s.nombre}</span><small>{s.fecha}</small></div>
  {/each}
</section>