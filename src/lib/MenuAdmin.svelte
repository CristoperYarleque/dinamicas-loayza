<script>
  import { borrarClave } from '#lib/api.js';

  let { actual = '' } = $props();

  const items = [
    ['/', '🔍 Buscador'],
    ['/admin', '🔧 Admin'],
    ['/dinamica', '🎰 Dinámica']
  ];
</script>

<nav class="menu">
  {#each items as [ruta, texto]}
    <a href={ruta} class:act={ruta === actual}>{texto}</a>
  {/each}
</nav>

<style>
  .menu {
    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
    padding: 8px 12px; background: #e6efe3; border-bottom: 1px solid var(--borde);
  }
  a {
    padding: 6px 14px; border-radius: 999px; border: 1px solid var(--verde);
    background: white; color: var(--verde-osc); font-weight: 600;
    font-size: 0.9rem; text-decoration: none;
  }
  a.act { background: var(--verde); color: white; }
</style>