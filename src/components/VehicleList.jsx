import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Loader2, Car, MapPin, Wrench, Filter, X, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function VehicleList({ onSelectVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [textSearch, setTextSearch] = useState('');
  
  // Estado para el escáner QR
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (!error) setVehicles(data);
    setLoading(false);
  };

  const brands = useMemo(() => [...new Set(vehicles.map(v => v.brand).filter(Boolean))].sort(), [vehicles]);
  const models = useMemo(() => {
    let filteredVehicles = selectedBrand ? vehicles.filter(v => v.brand === selectedBrand) : vehicles;
    return [...new Set(filteredVehicles.map(v => v.model).filter(Boolean))].sort();
  }, [vehicles, selectedBrand]);

  const partsList = useMemo(() => {
    const allParts = new Set();
    vehicles.forEach(v => Object.keys(v.parts || {}).forEach(p => allParts.add(p.replace(/_/g, ' '))));
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

  const clearFilters = () => { setSelectedBrand(''); setSelectedModel(''); setSelectedPart(''); setTextSearch(''); };
  const hasActiveFilters = selectedBrand || selectedModel || selectedPart || textSearch;

  // 📷 LÓGICA DEL ESCÁNER QR
  useEffect(() => {
    let html5QrCode;
    if (showScanner) {
      html5QrCode = new Html5Qrcode("qr-reader-element");
      setIsScanning(true);
      
      html5QrCode.start(
        { facingMode: "environment" }, // Cámara trasera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Éxito: Encontró un QR. decodedText será el vehicle.id
          if (navigator.vibrate) navigator.vibrate(200); // Vibración fuerte al escanear
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            setShowScanner(false);
            onSelectVehicle(decodedText); // Navegar al coche
          }).catch(err => console.error(err));
        },
        () => {} // Ignorar errores de escaneo continuo
      ).catch(err => {
        alert("Error al acceder a la cámara: " + err);
        setShowScanner(false);
        setIsScanning(false);
      });
    }

    // Cleanup al cerrar
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => setIsScanning(false)).catch(() => {});
      }
    };
  }, [showScanner, onSelectVehicle]);

  return (
    <div className="p-4 pt-8 max-w-5xl mx-auto pb-24 relative">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Search className="w-8 h-8 text-blue-400" /> Stock Desguace
      </h1>

      {/* FILTROS */}
      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-6 space-y-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-slate-300 flex items-center gap-2"><Filter className="w-5 h-5" /> Filtros</h3>
          {hasActiveFilters && <button onClick={clearFilters} className="text-red-400 text-sm font-semibold flex items-center gap-1"><X className="w-4 h-4" /> Limpiar</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(''); }} className="bg-slate-700 p-3 rounded-xl border border-slate-600 text-sm w-full">
            <option value="">Todas las marcas</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-slate-700 p-3 rounded-xl border border-slate-600 text-sm w-full">
            <option value="">Todos los modelos</option>{models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="bg-slate-700 p-3 rounded-xl border border-slate-600 text-sm w-full">
            <option value="">Todas las piezas</option>{partsList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="text" placeholder="Bastidor / Zona..." value={textSearch} onChange={(e) => setTextSearch(e.target.value)} className="bg-slate-700 p-3 rounded-xl border border-slate-600 text-sm placeholder-slate-500 w-full" />
        </div>
      </div>

      {/* MODAL ESCÁNER QR */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <h3 className="text-white text-xl font-bold mb-4">Escanea Código QR del Coche</h3>
          <div id="qr-reader-element" className="w-full max-w-md rounded-xl overflow-hidden"></div>
          <button onClick={() => setShowScanner(false)} className="mt-6 bg-red-600 text-white font-bold py-3 px-8 rounded-xl text-lg">Cancelar Escaneo</button>
        </div>
      )}

      {/* LISTADO DE COCHES */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredVehicles.length === 0 && <p className="col-span-full text-center text-slate-500 text-lg py-10">No hay vehículos.</p>}
          {filteredVehicles.map(v => (
            <div key={v.id} onClick={() => onSelectVehicle(v.id)} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg cursor-pointer active:bg-slate-700 transition-colors flex flex-col">
              {v.image_url ? <img src={v.image_url} alt={`${v.brand} ${v.model}`} className="w-full h-28 md:h-36 object-cover" /> : <div className="w-full h-28 md:h-36 bg-slate-700 flex items-center justify-center"><Car className="w-10 h-10 text-slate-500" /></div>}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm md:text-base font-bold leading-tight truncate">{v.brand} {v.model}</h2>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{v.version}</p>
                </div>
                <div className="mt-2 flex items-center gap-1 bg-slate-900 w-fit px-1.5 py-0.5 rounded">
                  <MapPin className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-green-400 whitespace-nowrap">{v.zone} / P.{v.aisle}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📷 BOTÓN FLOTANTE ESCÁNER QR */}
      {!showScanner && (
        <button 
          onClick={() => setShowScanner(true)} 
          className="fixed bottom-20 right-4 md:right-10 bg-blue-600 hover:bg-blue-700 p-4 rounded-full shadow-2xl shadow-blue-500/40 active:bg-blue-800 z-40 transition-transform active:scale-95"
        >
          <ScanLine className="w-8 h-8 text-white" />
        </button>
      )}

    </div>
  );
}