<script>
  import { onMount } from 'svelte';
  import { admin } from '#lib/api.js';

  let { campana, alCambiar } = $props();

  let lista = $state([]);
  let filtro = $state('');
  let msg = $state('');

  const visibles = $derived(
    lista.filter((v) => v.nombre.toLowerCase().includes(filtro.trim().toLowerCase()))
  );

  async function cargar() {
    try {
      const v = await admin('ventas', { campana });
      if (Array.isArray(v)) lista = v.slice().reverse();
    } catch {
      msg = 'Sin conexión';
    }
  }
  onMount(cargar);

  async function estado(v, nuevo) {
    if (nuevo === 'anulado' && !confirm(`¿Anular la venta de ${v.nombre}?`)) return;
    const r = await admin('estadoVenta', { id: v.id, estado: nuevo });
    msg = r.error ?? '';
    await cargar();
    alCambiar();
  }

  const ETI = { pagado: '✅ Pagado', pendiente: '⏳ Pendiente', anulado: '🚫 Anulado' };
</script>

<section class="caja">
  <input bind:value={filtro} placeholder="🔍 Buscar por nombre…" />
  {#if msg}<div class="msg err">{msg}</div>{/if}
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
          <button class="chico" onclick={() => estado(v, 'pagado')}>Pagado</button>
        {/if}
        {#if v.estado !== 'anulado'}
          <button class="chico rojo" onclick={() => estado(v, 'anulado')}>Anular</button>
        {/if}
      </div>
    </div>
  {/each}
</section>