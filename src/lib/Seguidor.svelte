<script>
  import { onMount } from 'svelte';
  import { adminGo, fechaAdmin } from '#lib/api.js';
  import Participante from './Participante.svelte';

  let { campana, activa, bloqueada = false, alCambiar } = $props();

  let participante = $state(null);
  let selector = $state(0);
  let nota = $state('');
  let enviando = $state(false);
  let resp = $state(null);
  let lista = $state([]);
  async function cargar() {
    try { lista = await adminGo(`/seguidores?campanaId=${campana}`); }
    catch (e) { resp = { error: e.message }; }
  }
  onMount(cargar);

  async function enviar(e) {
    e.preventDefault();
    if (enviando || !participante || !activa || bloqueada) return;
    enviando = true;
    resp = null;
    try {
      const r = await adminGo('/seguidores', { method: 'POST', body: { campanaId: campana, participanteId: participante.id, nota } });
      resp = { ok: `✅ ${r.nombre} anotado` };
      lista = [r, ...lista];
      participante = null;
      selector++;
      nota = '';
      alCambiar(); // sin await
    } catch (e) {
      resp = { error: e.message };
    } finally {
      enviando = false;
    }
  }
</script>

{#if !activa}
  <div class="msg err">Las ventas de esta campaña están cerradas. Usa "Reabrir ventas" si necesitas anotar más.</div>
{:else if bloqueada}
  <div class="msg err">Este registro está bloqueado porque ya comenzó un sorteo de este grupo.</div>
{:else}
  <form class="caja" onsubmit={enviar}>
    {#key selector}
      <Participante id="s-nombre" etiqueta="Nombre del seguidor" bind:value={participante} disabled={enviando} />
    {/key}

    <label class="campo" for="s-nota">Nota (opcional)</label>
    <input id="s-nota" bind:value={nota} placeholder="Ej: like y comentario en el post del horno" />
    <button class="btn" disabled={enviando || !participante}>
      {enviando ? 'Guardando…' : 'Anotar seguidor'}
    </button>
  </form>
  {#if resp?.ok}<div class="msg ok">{resp.ok}</div>{/if}
{/if}
{#if resp?.error}<div class="msg err">{resp.error}</div>{/if}

<section class="caja">
  <strong>⭐ {lista.length} anotados</strong>
  {#each lista as s}
    <div class="item"><span>{s.nombre}</span><small>{fechaAdmin(s.fecha)}</small></div>
  {/each}
</section>