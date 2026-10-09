<script>
  import { onMount } from 'svelte';
  import { admin } from '#lib/api.js';

  let { campana, activa, alCambiar } = $props();

  let nombre = $state('');
  let nota = $state('');
  let enviando = $state(false);
  let resp = $state(null);
  let lista = $state([]);
  let conocidos = $state([]);

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const nuevo = $derived(
    nombre.trim().length >= 3 && !conocidos.some((c) => norm(c) === norm(nombre))
  );

  async function cargar() {
    try {
      const [s, n] = await Promise.all([admin('seguidores', { campana }), admin('nombres')]);
      if (Array.isArray(s)) lista = s.slice().reverse();
      if (Array.isArray(n)) conocidos = n;
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
        lista = [{ id: r.id, nombre: r.nombre, fecha: 'ahora' }, ...lista];
        if (!conocidos.some((c) => norm(c) === norm(r.nombre))) conocidos = [...conocidos, r.nombre];
        nombre = '';
        nota = '';
        alCambiar(); // sin await
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
    <input
      id="s-nombre" list="s-conocidos" bind:value={nombre}
      placeholder="Nombre y apellido" autocomplete="off"
    />
    <datalist id="s-conocidos">
      {#each conocidos as n}<option value={n}></option>{/each}
    </datalist>
    {#if nuevo}
      <p class="stats">
        ℹ️ Este nombre no está en ventas ni en seguidores. Si el cliente ya compró alguna vez,
        elígelo de la lista para escribirlo exactamente igual.
      </p>
    {:else if nombre.trim().length >= 3}
      <p class="stats">✅ Nombre ya registrado.</p>
    {/if}

    <label class="campo" for="s-nota">Nota (opcional)</label>
    <input id="s-nota" bind:value={nota} placeholder="Ej: like y comentario en el post del horno" />
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