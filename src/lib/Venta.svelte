<script>
  import { onMount } from 'svelte';
  import { admin } from '#lib/api.js';

  let { campana, activa, combos, alCambiar } = $props();

  let nombre = $state('');
  let combo = $state('');
  let cantidad = $state(1);
  let estado = $state('pagado');
  let enviando = $state(false);
  let resp = $state(null);
  let conocidos = $state([]);

  async function nombres() {
    try {
      const v = await admin('nombres');
      if (Array.isArray(v)) conocidos = v;
    } catch {}
  }
  onMount(nombres);

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    enviando = true;
    resp = null;
    try {
      const r = await admin('venta', { campana, nombre, combo, cantidad, estado });
      resp = r.error ? { error: r.error } : { ok: r };
      if (!r.error) {
        // actualiza la lista de nombres localmente, sin pedirla otra vez al servidor
        if (!conocidos.some((c) => c.toLowerCase() === r.nombre.toLowerCase())) {
          conocidos = [...conocidos, r.nombre];
        }
        nombre = '';
        alCambiar(); // sin await: no hace esperar al botón
      }
    } catch {
      resp = { error: 'Sin conexión. Revisa la pestaña Ventas antes de repetir, por si sí se guardó.' };
    } finally {
      enviando = false;
    }
  }
</script>

{#if !activa}
  <div class="msg err">
    Las ventas de esta campaña están cerradas. Usa "Reabrir ventas" arriba si necesitas registrar más.
  </div>
{:else}
  <form class="caja" onsubmit={enviar}>
    <label class="campo" for="v-nombre">Nombre del cliente</label>
    <input
      id="v-nombre" list="v-conocidos" bind:value={nombre}
      placeholder="Nombre y apellido" autocomplete="off"
    />
    <datalist id="v-conocidos">
      {#each conocidos as n}<option value={n}></option>{/each}
    </datalist>
    <p class="stats">Si ya compró antes, elige su nombre de la lista para escribirlo igual.</p>

    <label class="campo" for="v-combo">¿Qué compró?</label>
    <select id="v-combo" bind:value={combo}>
      <option value="">Números sueltos</option>
      {#each combos as k}
        <option value={k.nombre}>Combo {k.nombre} (paga {k.pagados}, recibe {k.total})</option>
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

    <button class="btn" disabled={enviando || nombre.trim().length < 3}>
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