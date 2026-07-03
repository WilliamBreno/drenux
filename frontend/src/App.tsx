import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EsqueciSenha } from './pages/EsqueciSenha';
import { RedefinirSenha } from './pages/RedefinirSenha';
import { Home } from './pages/Home';
import { CardapioPublico } from './pages/CardapioPublico';
import { Login } from './pages/Login';
import { Cadastro } from './pages/Cadastro';
import { RotaProtegida } from './components/RotaProtegida';
import { Dashboard } from './pages/admin/Dashboard';
import { Inicio } from './pages/admin/Inicio';
import { Produtos } from './pages/admin/Produtos';
import { Categorias } from './pages/admin/Categorias';
import { Pedidos } from './pages/admin/Pedidos';
import { Cupons } from './pages/admin/Cupons';
import { Configuracoes } from './pages/admin/Configuracoes';

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
              <Route path="cupons" element={<Cupons />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
          </Route>

          <Route path="/:slug" element={<CardapioPublico />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;