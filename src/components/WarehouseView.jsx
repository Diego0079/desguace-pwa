import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LayoutGrid, Loader2, Car, MapPin, ChevronDown, ChevronRight, Move, Package, X } from 'lucide-react';
import Toast from './Toast'; // Importar nuevo Toast

const ZONES = ['Patio A', 'Patio B', 'Nave 1', 'Nave 2'];
const HEIGHT_ORDER = ['Suelo', 'A', 'B', 'C', 'D'];

export default function WarehouseView({ onSelectVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(ZONES[0]);
  const [openAisle, setOpenAisle] = useState(null);
  const [movingVehicle, setMovingVehicle] = useState(null);
  const [toast, setToast] = useState(null); // Estado para notificaciones

  useEffect(() => { fetchVehicles(); }, [selectedZone]);

  const fetchVehicles = async () => {
    setLoading(true);
    setOpenAisle(null);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('zone', selectedZone)
      .or('status.is.null,status.neq.prensado');
      
    if (!error) setVehicles(data);
    setLoading(false);
  };

  const aislesData = useMemo(() => {
    const grouped = {};
    for(let i=1; i<=10; i++) grouped[i] = [];
    vehicles.forEach(v => {
      const aisle = parseInt(v.aisle, 10) || 0;
      if (!grouped[aisle]) grouped[aisle] = [];
      grouped[aisle].push(v);
    });
    for (let aisle in grouped) {
      grouped[aisle].sort((a, b) => HEIGHT_ORDER.indexOf(a.position) - HEIGHT_ORDER.indexOf(b.position));
    }
    return Object.entries(grouped).map(([aisle, cars]) => ({ aisle: parseInt(aisle, 10), cars })).sort((a, b) => a.aisle - b.aisle).filter(a => a.aisle > 0);
  }, [vehicles]);

  const totalCars = vehicles.length;
  const totalParts = vehicles.reduce((acc, v) => acc + Object.values(v.parts || {}).filter(p => p?.status || p === true).length, 0);

  const handleQuickMove = async () => {
    if (!movingVehicle) return;
    const { id, newZone, newAisle, newPosition } = movingVehicle;
    
    const { error } = await supabase
      .from('vehicles')
      .update({ zone: newZone, aisle: String(newAisle), position: newPosition })
      .eq('id', id);

    if (!error) {
      if(navigator.vibrate) navigator.vibrate(50);
      setMovingVehicle(null);
      setToast({ message: '¡Vehículo movido con éxito!', type: 'success' }); // Toast
      fetchVehicles(); 
    } else {
      setToast({ message: 'Error al mover el vehículo', type: 'error' }); // Toast
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      
      {/* TOAST NOTIFICATION */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Cabecera fija */}
      <div className="flex-shrink-0 p-4 pt-6 pb-2 border-b-4 border-yellow-500 bg-zinc-950">
        <div className="mb-4">
          <p className="text-green-600 font-bold text-xs uppercase tracking-widest">Desguaces</p>
          <h1 className="text-3xl font-black text-green-500 uppercase tracking-tight leading-none flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-yellow-400" /> Planta
          </h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {ZONES.map(zone => (
            <button
              key={zone}
              onClick={() => { setSelectedZone(zone); setMovingVehicle(null); }}
              className={`px-4 py-2 rounded font-black text-xs uppercase tracking-wider transition-all border-b-4 active:border-b-0 active:mt-1 ${
                selectedZone === zone 
                  ? 'bg-green-700 text-yellow-400 border-green-900 shadow-[0_0_10px_rgba(22,163,74,0.3)]' 
                  : 'bg-zinc-800 text-zinc-500 border-zinc-950 hover:bg-zinc-700'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        {!loading && (
          <div className="flex gap-4 mt-3 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1 text-zinc-500"><Car className="w-3.5 h-3.5" /> {totalCars} Vehículos</span>
            <span className="flex items-center gap-1 text-green-500"><Package className="w-3.5 h-3.5" /> {totalParts} Piezas</span>
          </div>
        )}
      </div>

      {/* MODAL DE MOVIMIENTO RÁPIDO (CENTRADO) */}
      {movingVehicle && (
         <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setMovingVehicle(null)}>
            <div className="bg-zinc-900 p-6 rounded-xl border-4 border-yellow-500 w-full max-w-md shadow-[0_0_30px_rgba(234,179,8,0.2)]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-yellow-400 font-black uppercase tracking-widest flex items-center gap-2 text-lg"><Move className="w-5 h-5"/> Mover</h3>
                <button onClick={() => setMovingVehicle(null)} className="text-zinc-500 hover:text-white active:text-yellow-500 transition-colors"><X className="w-6 h-6"/></button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <select value={movingVehicle.newZone} onChange={(e) => setMovingVehicle({...movingVehicle, newZone: e.target.value})} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm w-full text-zinc-300 focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none col-span-3 font-bold">
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <select value={movingVehicle.newAisle} onChange={(e) => setMovingVehicle({...movingVehicle, newAisle: e.target.value})} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm w-full text-zinc-300 focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none font-bold">
                  {Array.from({length: 10}, (_, i) => i + 1).map(i => <option key={i} value={i}>P. {i}</option>)}
                </select>
                <select value={movingVehicle.newPosition} onChange={(e) => setMovingVehicle({...movingVehicle, newPosition: e.target.value})} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm w-full text-zinc-300 focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none col-span-2 font-bold">
                  {HEIGHT_ORDER.map(h => <option key={h} value={h}>Altura: {h}</option>)}
                </select>
              </div>

              <button onClick={handleQuickMove} className="w-full bg-green-700 hover:bg-green-600 active:bg-green-800 font-black py-4 rounded text-green-100 border-b-4 border-green-900 active:border-b-0 active:mt-1 transition-all uppercase tracking-widest">
                Confirmar Movimiento
              </button>
            </div>
          </div>
      )}

      {/* LISTADO DE PASILLOS */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-12 h-12 animate-spin text-green-600" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {aislesData.map(({ aisle, cars }) => {
            const isOpen = openAisle === aisle;
            return (
              <div key={aisle} className="bg-zinc-900 rounded-lg border-2 border-zinc-800 overflow-hidden">
                <button onClick={() => setOpenAisle(isOpen ? null : aisle)} className={`w-full flex justify-between items-center p-4 transition-colors ${isOpen ? 'bg-green-900/20 border-b-2 border-green-800' : 'hover:bg-zinc-800'}`}>
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-yellow-400"/> : <ChevronRight className="w-5 h-5 text-zinc-500"/>}
                    <h3 className="font-black text-green-400 uppercase tracking-widest text-lg">Pasillo {aisle}</h3>
                  </div>
                  <span className="bg-zinc-950 text-yellow-500 text-xs font-mono px-2 py-1 rounded border border-yellow-800/50">{cars.length} uds</span>
                </button>

                {isOpen && (
                  <div className="p-4 space-y-3 bg-zinc-950/50">
                    {cars.length === 0 ? (
                      <div className="text-center text-zinc-700 py-4 font-bold uppercase text-sm">Pasillo vacío</div>
                    ) : (
                      cars.map(v => {
                        const availableParts = Object.values(v.parts || {}).filter(p => p?.status || p === true).length;
                        const isSoldOut = availableParts === 0;
                        return (
                          <div key={v.id} className={`flex bg-zinc-900 rounded-lg overflow-hidden border-l-4 shadow-md ${isSoldOut ? 'border-red-500 opacity-50' : 'border-yellow-500'}`}>
                            <div onClick={() => onSelectVehicle(v.id)} className="w-24 md:w-32 h-24 md:h-28 flex-shrink-0 bg-zinc-800 cursor-pointer active:bg-zinc-700">
                              {v.image_url ? <img src={v.image_url} alt="Coche" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Car className="w-8 h-8 text-zinc-700" /></div>}
                            </div>
                            <div className="flex-1 p-3 flex flex-col justify-between">
                              <div>
                                <h4 className="font-black text-zinc-200 text-sm truncate uppercase">{v.brand} {v.model}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="bg-green-900/40 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-800/50 font-mono">ALT: {v.position}</span>
                                  <span className={`text-[10px] font-bold ${isSoldOut ? 'text-red-500' : 'text-zinc-500'}`}>{availableParts} pz</span>
                                </div>
                              </div>
                              <button onClick={() => setMovingVehicle({ id: v.id, newZone: v.zone, newAisle: v.aisle, newPosition: v.position })} className="mt-2 self-end flex items-center gap-1 text-xs font-black uppercase tracking-wider text-yellow-500 bg-zinc-950 hover:bg-zinc-800 py-1 px-2 rounded border border-zinc-700 active:bg-zinc-950 transition-colors">
                                <Move className="w-3 h-3"/> Mover
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}