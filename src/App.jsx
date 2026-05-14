import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import VehicleForm from './components/VehicleForm';
import VehicleList from './components/VehicleList';
import VehicleDetail from './components/VehicleDetail';
import WarehouseView from './components/WarehouseView';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { Search, PlusSquare, LayoutGrid, LogOut, Loader2, Settings } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('list');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // 🚀 PASO 1: Solo cargar la sesión (Rápido, no bloquea)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Error de sesión:", error);
      } finally {
        setLoadingAuth(false); // ¡La app ya carga!
      }
    };

    initAuth();

    // Escuchar cambios de Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🚀 PASO 2: Comprobar el rol EN SEGUNDO PLANO cuando haya sesión
  useEffect(() => {
    if (session?.user) {
      checkUserRole(session.user.id);
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  const checkUserRole = async (userId) => {
    try {
      const { data, error } = await supabase.from('operators').select('role, is_active').eq('id', userId).single();
      
      if (error) {
        console.log("Aviso: No se pudo leer el rol (quizás falta la columna en SQL)", error.message);
        return;
      }

      // Si está despedido, le echamos
      if (data && data.is_active === false) {
        await supabase.auth.signOut();
        return;
      }

      setIsAdmin(data?.role === 'admin');
    } catch (err) {
      console.error("Error checkeando rol:", err);
    }
  };

  const goToDetail = useCallback((id) => {
    setSelectedVehicleId(id);
    setView('detail');
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      {!session ? (
        <Login />
      ) : (
        <>
          {view === 'list' && <VehicleList onSelectVehicle={goToDetail} />}
          {view === 'form' && <VehicleForm />}
          {view === 'warehouse' && <WarehouseView onSelectVehicle={goToDetail} />}
          {view === 'admin' && isAdmin && <AdminPanel />}
          {view === 'detail' && <VehicleDetail vehicleId={selectedVehicleId} goBack={() => setView('list')} />}

                    <nav className="fixed bottom-0 left-0 right-0 bg-green-950 border-t-4 border-yellow-400 flex justify-around py-3 px-1 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] print:hidden">
            <button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'list' ? 'text-yellow-400' : 'text-green-800'}`}>
              <Search className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Stock</span>
            </button>
            <button onClick={() => setView('warehouse')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'warehouse' ? 'text-yellow-400' : 'text-green-800'}`}>
              <LayoutGrid className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Zona</span>
            </button>
            <button onClick={() => setView('form')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'form' ? 'text-yellow-400' : 'text-green-800'}`}>
              <PlusSquare className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Entrada</span>
            </button>
            
            {/* El botón de Admin aparecerá solito al detectar tu rol */}
            {isAdmin && (
              <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'admin' ? 'text-yellow-400' : 'text-green-800'}`}>
                <Settings className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
              </button>
            )}

            <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500 hover:text-red-400 active:text-red-600 transition-colors">
              <LogOut className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Salir</span>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}