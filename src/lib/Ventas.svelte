<script>
  import { onMount } from 'svelte';
  import { adminGo } from '#lib/api.js';

  let { campana, bloqueada = false, alCambiar } = $props();

  let lista = $state([]);
  let filtro = $state('');
  let msg = $state('');
  let enviando = $state(false);

  const visibles = $derived(
    lista.filter((v) => v.nombre.toLowerCase().includes(filtro.trim().toLowerCase()))
  );

  async function cargar() {
    try {
      const v = await adminGo(`/ventas?campanaId=${campana}`);
      if (Array.isArray(v)) lista = v;
    } catch (e) {
      msg = e.message;
    }
  }
  onMount(cargar);

  async function estado(v, nuevo) {
    if (enviando || bloqueada) return;
    if (nuevo === 'anulado' && !confirm(`¿Anular la venta de ${v.nombre}?`)) return;
    enviando = true;
    msg = '';
    try {
      await adminGo(`/ventas/${v.id}/estado`, { method: 'PATCH', body: { estado: nuevo } });
      await cargar();
      await alCambiar();
    } catch (e) { msg = e.message; }
    finally { enviando = false; }
  }

  const ETI = { pagado: '✅ Pagado', pendiente: '⏳ Pendiente', anulado: '🚫 Anulado' };
</script>

<section class="caja">
  <input bind:value={filtro} placeholder="🔍 Buscar por nombre…" />
  {#if msg}<div class="msg err">{msg}</div>{/if}
  {#if bloqueada}<p class="stats">Los pagos están bloqueados porque ya comenzó un sorteo de compradores.</p>{/if}
  <p class="stats">{visibles.length} ventas</p>
  {#each visibles as v (v.id)}
    <div class="item">
      <div>
        <strong>{v.nombre}</strong><br />
        <small>
          {v.combo === 'Individual' ? 'Sueltos' : 'Combo ' + v.combo} · #{v.desde}–#{v.hasta} ·
          {ETI[v.estado] ?? v.estado}
        </small>
      </div>
      <div>
        {#if v.estado !== 'pagado'}
          <button disabled={enviando || bloqueada} class="chico" onclick={() => estado(v, 'pagado')}>Pagado</button>
        {/if}
        {#if v.estado !== 'anulado'}
          <button disabled={enviando || bloqueada} class="chico rojo" onclick={() => estado(v, 'anulado')}>Anular</button>
        {/if}
      </div>
    </div>
  {/each}
</section>