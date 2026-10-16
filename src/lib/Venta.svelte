<script>
  import { adminGo } from '#lib/api.js';
  import Participante from './Participante.svelte';

  let { campana, activa, bloqueada = false, combos, alCambiar } = $props();

  let participante = $state(null);
  let selector = $state(0);
  let combo = $state('');
  let cantidad = $state(1);
  let estado = $state('pagado');
  let enviando = $state(false);
  let resp = $state(null);
  async function enviar(e) {
    e.preventDefault();
    if (enviando || !participante || !activa || bloqueada) return;
    enviando = true;
    resp = null;
    try {
      const r = await adminGo('/ventas', { method: 'POST', body: {
        campanaId: campana, participanteId: participante.id,
        ...(combo ? { comboId: combo } : { cantidad }), estado
      } });
      resp = { ok: r };
      participante = null;
      selector++;
      alCambiar(); // sin await: no hace esperar al botón
    } catch (e) {
      resp = { error: e.message };
    } finally {
      enviando = false;
    }
  }
</script>

{#if !activa}
  <div class="msg err">
    Las ventas de esta campaña están cerradas. Usa "Reabrir ventas" arriba si necesitas registrar más.
  </div>
{:else if bloqueada}
  <div class="msg err">Este registro está bloqueado porque ya comenzó un sorteo de este grupo.</div>
{:else}
  <form class="caja" onsubmit={enviar}>
    {#key selector}
      <Participante id="v-nombre" etiqueta="Nombre del cliente" bind:value={participante} disabled={enviando} />
    {/key}

    <label class="campo" for="v-combo">¿Qué compró?</label>
    <select id="v-combo" bind:value={combo}>
      <option value="">Números sueltos</option>
      {#each combos as k}
        <option value={k.id}>Combo {k.nombre} (paga {k.pagados}, recibe {k.total})</option>
      {/each}
    </select>

    {#if !combo}
      <label class="campo" for="v-cant">Cantidad de números</label>
      <input id="v-cant" type="number" min="1" max="200" bind:value={cantidad} />
    {/if}

    <label class="campo" for="v-estado">Pago</label>
    <select id="v-estado" bind:value={estado}>
      <option value="pagado">✅ Ya pagó</option>
      <option value="pendiente">⏳ Pendiente</option>
    </select>

    <button class="btn" disabled={enviando || !participante}>
      {enviando ? 'Guardando…' : 'Registrar venta'}
    </button>
  </form>

  {#if resp?.ok}
    {@const v = resp.ok}
    <div class="msg ok">
      ✅ <strong>{v.nombre}</strong><br />
      {v.combo === 'Individual' ? 'Números sueltos' : 'Combo ' + v.combo} ·
      {v.estado === 'pagado' ? 'pagado' : 'pendiente'}<br />
      Sus números: <strong>#{v.desde}</strong> al <strong>#{v.hasta}</strong> ({v.total})
    </div>
  {/if}
  {#if resp?.error}<div class="msg err">{resp.error}</div>{/if}
{/if}