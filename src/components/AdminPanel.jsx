import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, Activity, Loader2, UserPlus, UserX, ShieldCheck, Trash2, Euro, Car, Filter } from 'lucide-react';
import Toast from './Toast';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('activity');
  const [logs, setLogs] = useState([]);
  const [registrations, setRegistrations] = useState([]); // Nuevo estado para Altas
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpName, setNewOpName] = useState('');
  const [newOpPin, setNewOpPin] = useState('');

  // 🚀 Filtros para Altas
  const [filterOperator, setFilterOperator] = useState('');
  const [filterDate, setFilterDate] = useState('today');

  useEffect(() => { fetchData(); }, [activeTab, filterOperator, filterDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'activity') {
        const { data, error } = await supabase.from('sales_log').select(`created_at, part_name, price, action_type, vehicles ( brand, model ), operators ( name )`).order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        setLogs(data || []);
      } else if (activeTab === 'registrations') {
        // 🚀 Consulta para Altas con filtros
        let query = supabase.from('vehicles').select(`brand, model, version, created_at, operators ( name )`).order('created_at', { ascending: false }).limit(100);
        
        if (filterOperator) query = query.eq('created_by', filterOperator);
        
        // Filtro de Fecha
        const now = new Date();
        if (filterDate === 'today') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte('created_at', startOfDay);
        } else if (filterDate === 'week') {
          const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
          query = query.gte('created_at', startOfWeek);
        }
        // 'all' no aplica filtro

        const { data, error } = await query;
        if (error) throw error;
        setRegistrations(data || []);

      } else {
        const { data, error } = await supabase.from('operators').select('*').order('is_active', { ascending: false });
        if (error) throw error;
        setOperators(data || []);
      }
    } catch (error) {
      console.error("Error cargando datos admin:", error);
      setToast({ message: 'Error al cargar datos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    if (!newOpEmail || !newOpName || !newOpPin) return;
    const { error } = await supabase.auth.signUp({ email: newOpEmail, password: newOpPin, options: { data: { name: newOpName } } });
    if (error) { setToast({ message: 'Error al crear', type: 'error' }); } 
    else { setToast({ message: 'Operario creado', type: 'success' }); setNewOpEmail(''); setNewOpName(''); setNewOpPin(''); fetchData(); }
  };

  const toggleOperatorStatus = async (opId, currentStatus) => {
    const { error } = await supabase.from('operators').update({ is_active: !currentStatus }).eq('id', opId);
    if (!error) { setToast({ message: currentStatus ? 'Desactivado' : 'Reactivado', type: 'success' }); fetchData(); }
  };

  const todaySales = logs.filter(l => l.action_type === 'venta' && new Date(l.created_at).toDateString() === new Date().toDateString());
  const todayCash = todaySales.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const todayRegistrations = registrations.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString());

  return (
    <div className="p-4 pt-8 max-w-4xl mx-auto relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-3xl font-black mb-6 uppercase tracking-tight text-green-500 flex items-center gap-3"><Activity className="w-8 h-8 text-yellow-400" /> Panel de Control</h1>
      
      <div className="flex gap-2 mb-6 border-b-2 border-zinc-800 pb-2 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('activity')} className={`px-4 py-2 font-black uppercase text-sm tracking-wider transition-colors whitespace-nowrap ${activeTab === 'activity' ? 'text-yellow-400 border-b-4 border-yellow-500' : 'text-zinc-500'}`}><Activity className="w-4 h-4 inline mr-1"/> Ventas</button>
        <button onClick={() => setActiveTab('registrations')} className={`px-4 py-2 font-black uppercase text-sm tracking-wider transition-colors whitespace-nowrap ${activeTab === 'registrations' ? 'text-yellow-400 border-b-4 border-yellow-500' : 'text-zinc-500'}`}><Car className="w-4 h-4 inline mr-1"/> Altas</button>
        <button onClick={() => setActiveTab('operators')} className={`px-4 py-2 font-black uppercase text-sm tracking-wider transition-colors whitespace-nowrap ${activeTab === 'operators' ? 'text-yellow-400 border-b-4 border-yellow-500' : 'text-zinc-500'}`}><Users className="w-4 h-4 inline mr-1"/> Operarios</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 animate-spin text-green-500" /></div>
      ) : (
        <>
          {/* --- VENTAS --- */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="bg-green-900/30 p-4 rounded-lg border-2 border-green-800 mb-4 flex justify-between items-center">
                <div><p className="text-green-400 font-black uppercase text-sm">Caja Hoy</p></div>
                <p className="text-3xl font-black text-green-400">{todayCash.toFixed(2)}€</p>
              </div>
              {logs.map(log => {
                const isScrap = log.action_type === 'prensa';
                return (
                  <div key={log.id} className={`bg-zinc-900 p-4 rounded-lg border-l-4 shadow-md flex justify-between items-center ${isScrap ? 'border-red-500' : 'border-yellow-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isScrap ? 'bg-red-900/40' : 'bg-yellow-900/40'}`}>{isScrap ? <Trash2 className="w-6 h-6 text-red-400"/> : <Euro className="w-6 h-6 text-yellow-400"/>}</div>
                      <div>
                        <p className="text-zinc-200 font-black uppercase">{isScrap ? 'Movido a Prensa' : `Venta: ${log.part_name?.replace(/_/g, ' ')}`}</p>
                        <p className="text-zinc-500 text-sm font-bold">{log.vehicles?.brand} {log.vehicles?.model}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {!isScrap && log.price && <p className="text-emerald-400 font-black text-lg">{Number(log.price).toFixed(2)}€</p>}
                      <p className="text-blue-400 font-black text-xs uppercase">{log.operators?.name || 'Desconocido'}</p>
                      <p className="text-zinc-600 text-[10px] font-mono">{new Date(log.created_at).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 🚀 ALTAS (REGISTROS) */}
          {activeTab === 'registrations' && (
            <div className="space-y-4">
              {/* Filtros Desplegables */}
              <div className="bg-zinc-900 p-4 rounded-lg border-2 border-zinc-800 shadow-inner space-y-3">
                <h3 className="text-zinc-400 font-black uppercase tracking-widest text-xs flex items-center gap-2"><Filter className="w-4 h-4 text-yellow-400"/> Filtros</h3>
                <div className="grid grid-cols-2 gap-3">
                  <select value={filterOperator} onChange={(e) => setFilterOperator(e.target.value)} className="bg-zinc-950 p-2 rounded border border-zinc-700 text-sm focus:border-yellow-500 focus:outline-none font-bold text-zinc-200">
                    <option value="">Todos los Operarios</option>
                    {operators.filter(op => op.is_active).map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </select>
                  <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-zinc-950 p-2 rounded border border-zinc-700 text-sm focus:border-yellow-500 focus:outline-none font-bold text-zinc-200">
                    <option value="today">Hoy</option>
                    <option value="week">Última Semana</option>
                    <option value="all">Todo el tiempo</option>
                  </select>
                </div>
              </div>

              {/* Resumen Altas Hoy */}
              <div className="bg-blue-900/30 p-4 rounded-lg border-2 border-blue-800 flex justify-between items-center">
                <p className="text-blue-400 font-black uppercase text-sm">Coches Dados de Alta Hoy</p>
                <p className="text-3xl font-black text-blue-400">{todayRegistrations.length}</p>
              </div>

              {/* Lista de Altas */}
              {registrations.length === 0 ? (
                <p className="text-zinc-600 uppercase font-bold text-center py-10">Sin altas para estos filtros</p>
              ) : (
                registrations.map(v => (
                  <div key={v.id} className="bg-zinc-900 p-4 rounded-lg border-l-4 border-green-500 shadow-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-900/40"><Car className="w-6 h-6 text-green-400"/></div>
                      <div>
                        <p className="text-zinc-200 font-black uppercase">{v.brand} {v.model}</p>
                        <p className="text-zinc-500 text-sm font-bold">{v.version || 'Sin versión'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-black text-sm uppercase">{v.operators?.name || 'Desconocido'}</p>
                      <p className="text-zinc-600 text-[10px] font-mono">{new Date(v.created_at).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* --- OPERARIOS --- */}
          {activeTab === 'operators' && (
             // ... (El código de Operarios es el mismo que ya tienes, no lo repito para no saturar, solo asegúrate de dejar el que ya funcionaba)
             <div className="space-y-6">
               <div className="bg-zinc-900 p-4 rounded-lg border-2 border-green-800">
                 <h3 className="text-green-400 font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4"/> Nuevo Operario</h3>
                 <form onSubmit={handleCreateOperator} className="grid grid-cols-3 gap-3">
                   <input type="text" placeholder="Nombre" value={newOpName} onChange={(e) => setNewOpName(e.target.value)} required className="col-span-1 bg-zinc-950 p-2 rounded border border-zinc-700 text-sm focus:border-yellow-500 focus:outline-none uppercase font-bold text-zinc-200" />
                   <input type="email" placeholder="Email" value={newOpEmail} onChange={(e) => setNewOpEmail(e.target.value)} required className="col-span-2 bg-zinc-950 p-2 rounded border border-zinc-700 text-sm focus:border-yellow-500 focus:outline-none lowercase font-bold text-zinc-200" />
                   <input type="password" placeholder="PIN (5+)" value={newOpPin} onChange={(e) => setNewOpPin(e.target.value)} required className="col-span-2 bg-zinc-950 p-2 rounded border border-zinc-700 text-sm focus:border-yellow-500 focus:outline-none font-mono text-zinc-200" />
                   <button type="submit" className="bg-green-700 hover:bg-green-600 text-green-200 font-black py-2 rounded border-b-4 border-green-900 active:border-b-0 active:mt-1 transition-all uppercase text-sm">Crear</button>
                 </form>
               </div>
               <div className="space-y-2">
                 {operators.map(op => (
                   <div key={op.id} className={`bg-zinc-900 p-3 rounded-lg border-l-4 shadow-md flex items-center justify-between ${op.is_active ? 'border-green-500' : 'border-red-800 opacity-50'}`}>
                     <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl border-2 ${op.role === 'admin' ? 'bg-yellow-900/50 border-yellow-700 text-yellow-400' : 'bg-green-900/50 border-green-800 text-green-400'}`}>
                         {op.role === 'admin' ? <ShieldCheck className="w-5 h-5"/> : op.name?.charAt(0)}
                       </div>
                       <div>
                         <p className={`font-black uppercase ${!op.is_active ? 'line-through text-red-500' : 'text-zinc-200'}`}>{op.name} {op.role === 'admin' && <span className="text-[10px] lowercase text-yellow-500">(admin)</span>}</p>
                         <p className="text-zinc-600 text-xs lowercase">{op.email}</p>
                       </div>
                     </div>
                     {op.role !== 'admin' && (
                       <button onClick={() => toggleOperatorStatus(op.id, op.is_active)} className={`p-2 rounded font-black text-xs uppercase tracking-wider transition-colors border-b-2 active:border-b-0 active:mt-1 ${op.is_active ? 'bg-red-900/50 text-red-400 border-red-900 hover:bg-red-900' : 'bg-green-900/50 text-green-400 border-green-900 hover:bg-green-900'}`}>
                         {op.is_active ? <UserX className="w-5 h-5"/> : 'Reactivar'}
                       </button>
                     )}
                   </div>
                 ))}
               </div>
             </div>
          )}
        </>
      )}
    </div>
  );
}