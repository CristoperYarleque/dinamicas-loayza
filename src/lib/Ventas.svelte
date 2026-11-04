<script>
  import { onMount } from 'svelte';
  import { adminGo } from '#lib/api.js';

  let { campana, bloqueada = false, alCambiar } = $props();

  let lista = $state([]);
  let filtro = $state('');
  let msg = $state('');
  let enviando = $state(false);

  const visibles = $derived.by(() => {
    const f = filtro.trim().toLowerCase();
    const dig = f.replace(/[\s+]/g, '');
    const porCel = /^\d+$/.test(dig);
    return lista.filter((v) =>
      porCel ? (v.celular ?? '').includes(dig) : v.nombre.toLowerCase().includes(f)
    );
  });

  const verCelular = (c) => c.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

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
  <input bind:value={filtro} placeholder="🔍 Buscar por nombre o celular…" />
  {#if msg}<div class="msg err">{msg}</div>{/if}
  {#if bloqueada}<p class="stats">Los pagos están bloqueados porque ya comenzó un sorteo de compradores.</p>{/if}
  <p class="stats">{visibles.length} ventas</p>
  {#each visibles as v (v.id)}
    <div class="item">
      <div>
        <strong>{v.nombre}</strong><br />
        {#if v.celular}
          <a class="wpp" href="https://wa.me/51{v.celular}" target="_blank" rel="noopener noreferrer"
            title="Escribir por WhatsApp">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/>
            </svg>
            {verCelular(v.celular)}
          </a><br />
        {/if}
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
<style>
  .wpp {
    display: inline-flex; align-items: center; gap: 4px;
    color: #128c4a; font-weight: 600; font-size: 0.9rem; text-decoration: none;
  }
  .wpp:hover { text-decoration: underline; }
</style>
