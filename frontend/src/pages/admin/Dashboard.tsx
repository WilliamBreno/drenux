import { Outlet } from 'react-router-dom';

// Layout do painel administrativo. A navegação lateral de verdade entra
// numa etapa futura — por enquanto só garante que as sub-rotas
// (produtos, categorias, pedidos, configurações) renderizam dentro dele.
export function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <span className="font-semibold">Painel admin</span>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
