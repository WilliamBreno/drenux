import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EsqueciSenha } from './pages/EsqueciSenha';
import { RedefinirSenha } from './pages/RedefinirSenha';
import { Home } from './pages/Home';
import { CardapioPublico } from './pages/CardapioPublico';
import { RastrearPedido } from './pages/RastrearPedido';
import { Login } from './pages/Login';
import { Cadastro } from './pages/Cadastro';
import { RotaProtegida } from './components/RotaProtegida';
import { Dashboard } from './pages/admin/Dashboard';
import { Inicio } from './pages/admin/Inicio';
import { Produtos } from './pages/admin/Produtos';
import { Categorias } from './pages/admin/Categorias';
import { Pedidos } from './pages/admin/Pedidos';
import { CompartilharLocalizacao } from './pages/admin/CompartilharLocalizacao';
import { Cupons } from './pages/admin/Cupons';
import { Configuracoes } from './pages/admin/Configuracoes';
import { Solicitacoes } from './pages/admin/Solicitacoes';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          <Route element={<RotaProtegida />}>
            <Route path="/admin" element={<Dashboard />}>
              <Route index element={<Inicio />} />
              <Route path="inicio" element={<Inicio />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="pedidos/:id/localizacao" element={<CompartilharLocalizacao />} />
              <Route path="solicitacoes" element={<Solicitacoes />} />
              <Route path="solicitacoes/:id/localizacao" element={<CompartilharLocalizacao />} />
              <Route path="cupons" element={<Cupons />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
          </Route>

          {/* Precisa vir ANTES de "/:slug" — senão o React Router tentaria
              casar "/loja-x/pedido/5/rastrear" com a rota do cardápio,
              tratando "pedido" como se fosse um slug de loja. */}
          <Route path="/:slug/pedido/:id/rastrear" element={<RastrearPedido />} />
          <Route path="/:slug/solicitacao/:id/rastrear" element={<RastrearPedido />} />

          <Route path="/:slug" element={<CardapioPublico />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

