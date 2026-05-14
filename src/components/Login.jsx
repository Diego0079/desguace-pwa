import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Car, Loader2, ShieldCheck, Delete, Users } from 'lucide-react';
import Toast from './Toast';

export default function Login() {
  const [operators, setOperators] = useState([]); // Estado dinámico
  const [loadingOps, setLoadingOps] = useState(true);
  
  const [selectedOp, setSelectedOp] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // 🚀 Cargar operarios de Supabase dinámicamente
  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoadingOps(true);
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('is_active', true) // 🚀 NUEVO: Solo mostrar operarios activos
      .order('name', { ascending: true });
    if (!error && data) setOperators(data);
    setLoadingOps(false);
  };

  const handlePinInput = (num) => {
    // Permitimos hasta 6 dígitos por si usáis PINS largos
    if (pin.length < 6) {
      setPin(pin + num);
    }
  };

  const handleDeletePin = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length < 4 || !selectedOp) return; // Mínimo 4 dígitos de seguridad
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: selectedOp.email,
      password: pin,
    });

    if (error) {
      setToast({ message: 'PIN Incorrecto', type: 'error' });
      setPin('');
      if(navigator.vibrate) navigator.vibrate([100, 50, 100]); // Doble vibración de error
    }
    
    setLoading(false);
  };

  // Colores rotativos para los botones (Estilo El Campón)
  const buttonColors = [
    'bg-green-800 hover:bg-green-700 border-green-950',
    'bg-blue-800 hover:bg-blue-700 border-blue-950',
    'bg-yellow-700 hover:bg-yellow-600 border-yellow-900 text-zinc-950',
    'bg-red-800 hover:bg-red-700 border-red-950',
    'bg-zinc-700 hover:bg-zinc-600 border-zinc-900',
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="w-full max-w-md">
        {/* Cabecera */}
        <div className="text-center mb-8 border-b-4 border-yellow-500 pb-6">
          <Car className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-green-600 font-black text-sm uppercase tracking-[0.3em]">Desguaces</p>
          <h1 className="text-5xl font-black text-green-500 uppercase tracking-tight">El Campón</h1>
          <div className="flex items-center justify-center gap-2 mt-3 text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Control de Acceso</span>
          </div>
        </div>

        {!selectedOp ? (
          // --- FASE 1: LISTA DE OPERARIOS DINÁMICA ---
          <div className="space-y-4">
            <h2 className="text-zinc-400 text-center font-black uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <Users className="w-5 h-5"/> ¿Quién entra?
            </h2>
            
            {loadingOps ? (
              <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 animate-spin text-yellow-500" /></div>
            ) : operators.length === 0 ? (
              <p className="text-center text-zinc-600 uppercase font-bold">No hay operarios dados de alta</p>
            ) : (
              operators.map((op, index) => (
                <button 
                  key={op.id} 
                  onClick={() => setSelectedOp(op)}
                  className={`w-full ${buttonColors[index % buttonColors.length]} text-white font-black py-6 rounded-xl text-2xl uppercase tracking-wider border-b-4 active:border-b-0 active:mt-1 transition-all shadow-lg flex items-center justify-center gap-3`}
                >
                  {/* Coge la primera letra del nombre como "Avatar" */}
                  <div className="bg-black/20 w-10 h-10 rounded-full flex items-center justify-center text-lg">
                    {op.name?.charAt(0) || '?'}
                  </div>
                  {op.name}
                </button>
              ))
            )}
          </div>
        ) : (
          // --- FASE 2: INTRODUCIR PIN ---
          <div className="space-y-6">
            <button onClick={() => { setSelectedOp(null); setPin(''); }} className="text-zinc-500 hover:text-yellow-400 font-bold text-sm uppercase tracking-widest mb-2 transition-colors">
              ← Cambiar Operario
            </button>
            
            <h2 className="text-yellow-400 text-center font-black text-xl uppercase tracking-widest">
              Hola, {selectedOp.name}
            </h2>

            {/* Indicador de PIN (5 puntos) */}
            <div className="flex justify-center gap-4 my-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${pin.length >= i ? 'bg-yellow-500 border-yellow-500 scale-110' : 'bg-zinc-900 border-zinc-700'}`}></div>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-12 h-12 animate-spin text-yellow-500" /></div>
            ) : (
              // Teclado Numérico
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3,4,5,6,7,8,9].map(num => (
                  <button key={num} onClick={() => handlePinInput(num)} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-black text-3xl py-5 rounded-lg border-b-4 border-zinc-950 active:border-b-0 active:mt-1 transition-all">
                    {num}
                  </button>
                ))}
                <button onClick={handleDeletePin} className="bg-red-900/50 hover:bg-red-900 text-red-400 font-black text-xl py-5 rounded-lg border-b-4 border-red-950 active:border-b-0 active:mt-1 transition-all flex items-center justify-center">
                  <Delete className="w-7 h-7"/>
                </button>
                <button onClick={() => handlePinInput(0)} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-black text-3xl py-5 rounded-lg border-b-4 border-zinc-950 active:border-b-0 active:mt-1 transition-all">
                  0
                </button>
                <button onClick={handleLogin} className="bg-green-700 hover:bg-green-600 text-green-200 font-black text-xl py-5 rounded-lg border-b-4 border-green-900 active:border-b-0 active:mt-1 transition-all">
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}