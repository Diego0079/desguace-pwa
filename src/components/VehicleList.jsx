import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Loader2, Car, MapPin, Wrench, Filter, X, ScanLine, FolderOpen, Trash2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function VehicleList({ onSelectVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [textSearch, setTextSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => { fetchVehicles(); }, []);

  const [scrappedCount, setScrappedCount] = useState(0); // Añadir este estado al principio del componente

  const fetchVehicles = async () => {
    setLoading(true);
    
    // 1. Obtener coches activos para el stock
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .neq('status', 'prensado') // 🧊 EXCLUIR LOS PRENSADOS
      .order('created_at', { ascending: false });
      
    if (!error && data) setVehicles(data);

    // 2. Obtener el número de coches prensados para el contador
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'prensado');
      
    setScrappedCount(count || 0);
    setLoading(false);
  };

  const brands = useMemo(() => [...new Set(vehicles.map(v => v.brand).filter(Boolean))].sort(), [vehicles]);
  const models = useMemo(() => {
    let filteredVehicles = selectedBrand ? vehicles.filter(v => v.brand === selectedBrand) : vehicles;
    return [...new Set(filteredVehicles.map(v => v.model).filter(Boolean))].sort();
  }, [vehicles, selectedBrand]);

  const partsList = useMemo(() => {
    const allParts = new Set();
    vehicles.forEach(v => { if(v.parts) Object.keys(v.parts).forEach(p => allParts.add(p.replace(/_/g, ' '))); });
    return [...allParts].sort();
  }, [vehicles]);

  const filteredVehicles = vehicles.filter(v => {
    if (selectedBrand && v.brand !== selectedBrand) return false;
    if (selectedModel && v.model !== selectedModel) return false;
    if (selectedPart) {
      const partKey = selectedPart.replace(/ /g, '_');
      const partValue = v.parts?.[partKey];
      const isAvailable = typeof partValue === 'boolean' ? partValue : partValue?.status;
      if (!isAvailable) return false;
    }
    if (textSearch) {
      const term = textSearch.toLowerCase();
      if (!v.vin?.toLowerCase().includes(term) && !v.zone?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const groupedVehicles = useMemo(() => {
    const groups = {};
    filteredVehicles.forEach(v => {
      const brand = v.brand || 'Sin Marca';
      if (!groups[brand]) groups[brand] = [];
      groups[brand].push(v);
    });
    return Object.entries(groups).map(([brand, cars]) => ({ brand, cars })).sort((a, b) => a.brand.localeCompare(b.brand));
  }, [filteredVehicles]);

  const clearFilters = () => { setSelectedBrand(''); setSelectedModel(''); setSelectedPart(''); setTextSearch(''); };
  const hasActiveFilters = selectedBrand || selectedModel || selectedPart || textSearch;

  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(() => {
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode("qr-reader-element");
        scannerRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (navigator.vibrate) navigator.vibrate(200);
            scannerRef.current.stop().then(() => { setShowScanner(false); onSelectVehicle(decodedText); }).catch(() => {});
          }, () => {}
        ).catch(err => { setShowScanner(false); });
      }, 100);
      return () => { clearTimeout(timer); if (scannerRef.current && scannerRef.current.isScanning) scannerRef.current.stop().catch(() => {}); };
    } else { if (scannerRef.current && scannerRef.current.isScanning) scannerRef.current.stop().catch(() => {}); }
  }, [showScanner, onSelectVehicle]);

  return (
    <div className="p-4 pt-6 max-w-5xl mx-auto pb-24 relative">
      
      {/* CABECERA ESTILO EL CAMPÓN */}
      <div className="mb-8 border-b-4 border-yellow-500 pb-4">
        <p className="text-green-600 font-bold text-sm uppercase tracking-widest">Desguaces</p>
        <h1 className="text-4xl font-black text-green-500 uppercase tracking-tight leading-none">El Campón</h1>
        <div className="flex gap-4 mt-2">
          <p className="text-zinc-500 text-xs mt-1 font-mono uppercase">Stock Activo</p>
          {/* 🧊 Contador de chatarra */}
          {scrappedCount > 0 && (
            <p className="text-red-500 text-xs mt-1 font-mono uppercase flex items-center gap-1">
              <Trash2 className="w-3 h-3"/> {scrappedCount} En prensa
            </p>
          )}
        </div>
      </div>

      {/* PANEL DE CONTROL / FILTROS */}
      <div className="bg-zinc-900 p-4 rounded-lg border-2 border-zinc-800 mb-6 space-y-3 shadow-inner">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-zinc-400 flex items-center gap-2 uppercase text-xs tracking-widest"><Filter className="w-4 h-4 text-yellow-400" /> Filtros</h3>
          {hasActiveFilters && <button onClick={clearFilters} className="text-red-500 text-xs font-bold flex items-center gap-1"><X className="w-3 h-3" /> Borrar</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(''); }} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm w-full text-zinc-300 focus:border-yellow-400 focus:ring-yellow-400 focus:outline-none">
            <option value="">Marca</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm w-full text-zinc-300 focus:border-yellow-400 focus:ring-yellow-400 focus:outline-none">
            <option value="">Modelo</option>{models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm w-full text-zinc-300 focus:border-yellow-400 focus:ring-yellow-400 focus:outline-none">
            <option value="">Pieza</option>{partsList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="text" placeholder="Bastidor / Zona" value={textSearch} onChange={(e) => setTextSearch(e.target.value)} className="bg-zinc-950 p-3 rounded border border-zinc-700 text-sm placeholder-zinc-600 w-full text-zinc-300 focus:border-yellow-400 focus:ring-yellow-400 focus:outline-none" />
        </div>
      </div>

      {/* MODAL ESCÁNER QR */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
          <h3 className="text-yellow-400 text-xl font-black mb-4 uppercase tracking-widest">Escanear QR</h3>
          <div id="qr-reader-element" className="w-full max-w-md rounded-xl overflow-hidden border-2 border-yellow-500"></div>
          <button onClick={() => setShowScanner(false)} className="mt-6 bg-red-700 text-white font-black py-3 px-8 rounded text-lg uppercase tracking-wider border-b-4 border-red-900 active:mt-7 active:border-b-0 transition-all">Cancelar</button>
        </div>
      )}

      {/* LISTADO AGRUPADO POR MARCA */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-green-600" /></div>
      ) : (
        <div className="space-y-8">
          {groupedVehicles.length === 0 && <p className="text-center text-zinc-600 text-lg py-20 uppercase font-bold">Sin resultados</p>}
          
          {groupedVehicles.map(group => (
            <div key={group.brand}>
              {/* Cabecera de marca estilo señalética industrial */}
              <div className="flex items-center gap-3 mb-4 bg-green-900/30 border-l-4 border-green-500 p-2 rounded-r-lg">
                <FolderOpen className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider">{group.brand}</h2>
                <span className="bg-zinc-900 text-yellow-500 text-xs font-mono px-2 py-0.5 rounded border border-yellow-800/50">{group.cars.length} uds</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {group.cars.map(v => {
                  const matchedPart = selectedPart ? (Object.entries(v.parts || {}).find(([partName, partValue]) => {
                    const isAvailable = typeof partValue === 'boolean' ? partValue : partValue?.status;
                    return partName.replace(/ /g, '_') === selectedPart.replace(/ /g, '_') && isAvailable;
                  })?.[0]?.replace(/_/g, ' ')) : null;

                  return (
                    // Tarjeta estilo placa de control
                    <div key={v.id} onClick={() => onSelectVehicle(v.id)} className="bg-zinc-900 rounded-lg overflow-hidden border-l-4 border-yellow-500 shadow-md cursor-pointer active:bg-zinc-800 transition-colors flex flex-col hover:border-green-500">
                      {v.image_url ? (
                        <img src={v.image_url} alt={`${v.brand} ${v.model}`} className="w-full h-28 md:h-36 object-cover" />
                      ) : (
                        <div className="w-full h-28 md:h-36 bg-zinc-950 flex items-center justify-center"><Car className="w-10 h-10 text-zinc-800" /></div>
                      )}
                      <div className="p-3 flex-1 flex flex-col justify-between bg-zinc-900 border-t border-zinc-800">
                        <div>
                          <h3 className="text-sm md:text-base font-black leading-tight truncate text-zinc-200 uppercase">{v.model}</h3>
                          <p className="text-zinc-600 text-xs mt-0.5 truncate">{v.version}</p>
                        </div>
                        {matchedPart && (
                          <div className="mt-1.5 flex items-center gap-1 bg-yellow-900/40 w-fit px-1.5 py-0.5 rounded border border-yellow-700/50">
                            <Wrench className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-yellow-400 truncate">{matchedPart}</span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1 bg-zinc-950 w-fit px-1.5 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-green-400 whitespace-nowrap font-mono">{v.zone} / P.{v.aisle}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOTÓN ESCÁNER FLOTANTE */}
      {!showScanner && (
        <button onClick={() => setShowScanner(true)} className="fixed bottom-20 right-4 md:right-10 bg-yellow-500 hover:bg-yellow-400 p-4 rounded-full shadow-2xl shadow-yellow-500/30 active:bg-yellow-600 z-40 transition-transform active:scale-95 border-b-4 border-yellow-700 active:border-b-0 active:mt-1">
          <ScanLine className="w-8 h-8 text-zinc-950" />
        </button>
      )}
    </div>
  );
}