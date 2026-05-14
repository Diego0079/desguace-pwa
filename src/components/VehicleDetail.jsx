import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/compressImage';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CheckCircle, XCircle, Plus, Loader2, Tag, Camera, ImagePlus, QrCode, Trash2, AlertTriangle, Euro } from 'lucide-react';
import Toast from './Toast';

export default function VehicleDetail({ vehicleId, goBack }) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPart, setNewPart] = useState('');
  const [uploadingPart, setUploadingPart] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showScrapConfirm, setShowScrapConfirm] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false); // Nuevo modal de venta
  const [currentSellingPart, setCurrentSellingPart] = useState(null); // Pieza que se está vendiendo
  const [salePrice, setSalePrice] = useState('');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchVehicle(); }, [vehicleId]);

  const fetchVehicle = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
    if (!error && data) {
      const normalizedParts = {};
      for (const [key, value] of Object.entries(data.parts || {})) { normalizedParts[key] = typeof value === 'boolean' ? { status: value, image_url: null } : value; }
      setVehicle({ ...data, parts: normalizedParts });
    }
    setLoading(false);
  };

  const availablePartsCount = useMemo(() => { if (!vehicle) return 0; return Object.values(vehicle.parts || {}).filter(p => p?.status || p === true).length; }, [vehicle]);

  const moveToScrapyard = async () => {
    // 1. Obtenemos el usuario que ejecuta la acción
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Actualizamos el estado del coche a prensado
    const { error } = await supabase.from('vehicles').update({ status: 'prensado' }).eq('id', vehicleId);
    
    if (!error) {
      // 3. 🚀 REGISTRAMOS QUIÉN LO HA PRENSADO
      await supabase.from('sales_log').insert([
        { 
          vehicle_id: vehicleId, 
          sold_by: user.id, 
          action_type: 'prensa', 
          part_name: null, 
          price: null 
        }
      ]);

      if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setShowScrapConfirm(false);
      setToast({ message: '🧊 Vehículo movido a Prensa', type: 'warning' });
      setTimeout(() => goBack(), 1500);
    } else {
      setToast({ message: 'Error al mover a prensa', type: 'error' });
    }
  };

  // 🚀 NUEVO: Iniciar proceso de venta (Abre el modal)
  const initiateSale = (partName) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setCurrentSellingPart(partName);
    setSalePrice('');
    setShowSaleModal(true);
  };

  // 🚀 NUEVO: Confirmar la venta (Guarda en BD y registra precio)
  const confirmSale = async () => {
    if (!currentSellingPart) return;
    
    const currentPart = vehicle.parts[currentSellingPart];
    const updatedParts = { ...vehicle.parts, [currentSellingPart]: { ...currentPart, status: false } };
    setVehicle({ ...vehicle, parts: updatedParts });

    const { error } = await supabase.from('vehicles').update({ parts: updatedParts }).eq('id', vehicleId);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('sales_log').insert([
        { vehicle_id: vehicleId, part_name: currentSellingPart, sold_by: user.id, price: salePrice || null }
      ]);

      if(navigator.vibrate) navigator.vibrate(100);
      setShowSaleModal(false);
      setToast({ message: `¡${currentSellingPart.replace(/_/g, ' ')} vendida!`, type: 'success' });

      const newAvailableCount = Object.values(updatedParts).filter(p => p?.status || p === true).length;
      if (newAvailableCount === 0) { setTimeout(() => { setShowScrapConfirm(true); }, 500); }
    } else { fetchVehicle(); }
  };

  const addCustomPart = async () => {
    if (!newPart.trim()) return;
    const formattedName = newPart.trim().charAt(0).toUpperCase() + newPart.trim().slice(1).replace(/ /g, '_');
    const updatedParts = { ...vehicle.parts, [formattedName]: { status: true, image_url: null } };
    setVehicle({ ...vehicle, parts: updatedParts }); setNewPart('');
    await supabase.from('vehicles').update({ parts: updatedParts }).eq('id', vehicleId);
  };

  const handlePartImageUpload = async (partName, event) => {
    const file = event.target.files[0]; if (!file) return; setUploadingPart(partName);
    try {
      const compressed = await compressImage(file, 150); const fileName = `parts/${Date.now()}_${partName}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('vehicle-photos').upload(fileName, compressed, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(uploadData.path);
      const updatedParts = { ...vehicle.parts, [partName]: { ...vehicle.parts[partName], image_url: urlData.publicUrl } };
      setVehicle({ ...vehicle, parts: updatedParts });
      await supabase.from('vehicles').update({ parts: updatedParts }).eq('id', vehicleId);
    } catch (error) { setToast({ message: 'Error al subir foto', type: 'error' }); } finally { setUploadingPart(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-green-500" /></div>;
  if (!vehicle) return <div className="text-center text-red-500 py-20 font-black uppercase">Vehículo no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* MODAL QR */}
      {showQr && (<div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setShowQr(false)}><div className="bg-zinc-900 p-8 rounded-xl border-4 border-yellow-500 flex flex-col items-center gap-4 max-w-sm w-full shadow-[0_0_30px_rgba(234,179,8,0.2)]" onClick={e => e.stopPropagation()}><h3 className="text-yellow-400 font-black text-xl uppercase tracking-widest">Código QR</h3><div className="bg-white p-4 rounded-lg mt-2"><QRCodeSVG value={vehicle.id} size={220} level="H" /></div><p className="text-green-500 font-black text-lg mt-2 uppercase">{vehicle.brand} {vehicle.model}</p><button onClick={() => setShowQr(false)} className="mt-4 bg-zinc-950 text-zinc-300 font-black py-3 px-8 w-full border-b-4 border-zinc-800 active:border-b-0 active:mt-5 transition-all uppercase tracking-wider">Cerrar</button></div></div>)}
      
      {/* MODAL PRENSA */}
      {showScrapConfirm && (<div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setShowScrapConfirm(false)}><div className="bg-zinc-900 p-8 rounded-xl border-4 border-red-600 flex flex-col items-center gap-5 max-w-sm w-full shadow-[0_0_30px_rgba(220,38,38,0.3)]" onClick={e => e.stopPropagation()}><AlertTriangle className="w-16 h-16 text-red-500" /><h3 className="text-red-500 font-black text-2xl uppercase tracking-widest text-center">¿Mover a Prensa?</h3><p className="text-zinc-400 text-sm text-center uppercase font-bold">Este coche se quedará fuera del stock activo.</p><div className="flex gap-3 w-full mt-4"><button onClick={() => setShowScrapConfirm(false)} className="flex-1 bg-zinc-800 text-zinc-400 font-black py-4 rounded border-b-4 border-zinc-900 active:border-b-0 active:mt-1 transition-all uppercase">Cancelar</button><button onClick={moveToScrapyard} className="flex-1 bg-red-700 text-red-100 font-black py-4 rounded border-b-4 border-red-900 active:border-b-0 active:mt-1 transition-all uppercase">Prensar</button></div></div></div>)}

      {/* 🚀 MODAL DE VENTA (Precio) */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setShowSaleModal(false)}>
          <div className="bg-zinc-900 p-8 rounded-xl border-4 border-yellow-500 flex flex-col items-center gap-5 max-w-sm w-full shadow-[0_0_30px_rgba(234,179,8,0.2)]" onClick={e => e.stopPropagation()}>
            <Euro className="w-16 h-16 text-yellow-400" />
            <h3 className="text-yellow-400 font-black text-2xl uppercase tracking-widest text-center">Vendiendo: <br/>{currentSellingPart?.replace(/_/g, ' ')}</h3>
            <div className="w-full">
              <label className="text-zinc-400 text-xs font-black uppercase tracking-widest block mb-2">Precio de venta (€)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Ej: 25.50" 
                value={salePrice} 
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full bg-zinc-950 p-4 rounded-lg border-2 border-zinc-700 text-3xl text-center font-black text-green-400 focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={() => setShowSaleModal(false)} className="flex-1 bg-zinc-800 text-zinc-400 font-black py-4 rounded border-b-4 border-zinc-900 active:border-b-0 active:mt-1 transition-all uppercase">Cancelar</button>
              <button onClick={confirmSale} className="flex-1 bg-green-700 text-green-100 font-black py-4 rounded border-b-4 border-green-900 active:border-b-0 active:mt-1 transition-all uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-yellow-500 font-black text-sm uppercase tracking-widest active:text-yellow-400"><ArrowLeft className="w-6 h-6" /> Volver</button>
        <div className="flex gap-2">
          <button onClick={() => setShowQr(true)} className="flex items-center gap-2 bg-green-900/50 py-2 px-3 rounded text-xs font-black uppercase tracking-wider text-green-400 border-2 border-green-800 active:bg-green-900 transition-colors"><QrCode className="w-4 h-4" /> QR</button>
          <button onClick={() => setShowScrapConfirm(true)} className="flex items-center gap-2 bg-red-900/50 py-2 px-3 rounded text-xs font-black uppercase tracking-wider text-red-400 border-2 border-red-800 active:bg-red-800 transition-colors"><Trash2 className="w-4 h-4" /> Prensa</button>
        </div>
      </div>

      {/* FICHA COCHE */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden border-l-4 border-yellow-500 mb-6 shadow-xl">
        {vehicle.image_url && <img src={vehicle.image_url} alt="Coche" className="w-full h-48 object-cover" />}
        <div className="p-5 bg-zinc-900 border-t-2 border-zinc-800 flex justify-between items-center">
          <div><h1 className="text-3xl font-black text-green-500 uppercase tracking-tight">{vehicle.brand} {vehicle.model}</h1><p className="text-zinc-500 font-bold text-sm mt-1 uppercase">{vehicle.version} | {vehicle.color}</p></div>
          <div className={`text-right p-2 rounded-lg border-2 ${availablePartsCount === 0 ? 'bg-red-900/30 border-red-800 text-red-500' : 'bg-green-900/30 border-green-800 text-green-500'}`}><p className="text-3xl font-black leading-none">{availablePartsCount}</p><p className="text-[10px] font-black uppercase tracking-widest">Piezas</p></div>
        </div>
        {availablePartsCount === 0 && (<div className="bg-yellow-900/40 border-t-2 border-yellow-800 p-3 flex items-center gap-3 justify-center"><AlertTriangle className="w-5 h-5 text-yellow-500" /><span className="text-yellow-500 font-black uppercase text-sm tracking-wider">Vehículo vacío - Listo para prensa</span></div>)}
      </div>

      <h2 className="text-lg font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-zinc-400 border-b-2 border-zinc-800 pb-2"><Tag className="w-5 h-5 text-yellow-400" /> Despiece del Vehículo</h2>
      
      {/* GRID PIEZAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.entries(vehicle.parts).map(([name, partData]) => (
          <div key={name} className={`rounded-lg overflow-hidden transition-all border-l-4 shadow-md ${partData.status ? 'border-yellow-500 bg-zinc-900' : 'border-red-800 bg-zinc-950 opacity-50'}`}>
            <div className="relative w-full h-28 md:h-32 bg-zinc-800 flex items-center justify-center">
              {partData.image_url ? (<img src={partData.image_url} alt={name} className="w-full h-full object-cover" />) : (<div className="flex flex-col items-center text-zinc-700"><ImagePlus className="w-8 h-8 mb-1" /><span className="text-[9px] font-bold uppercase">Sin foto</span></div>)}
              {uploadingPart === name && <div className="absolute inset-0 bg-zinc-950/90 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-yellow-400" /></div>}
              <div className="absolute bottom-1.5 right-1.5 flex gap-2">
                <label className={`cursor-pointer p-1.5 bg-yellow-500 rounded shadow-md active:bg-yellow-600 transition-colors ${uploadingPart ? 'opacity-50 pointer-events-none' : ''}`}><Camera className="w-4 h-4 text-zinc-950" /><input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handlePartImageUpload(name, e)} className="hidden" /></label>
                
                {/* 🚀 Cambiamos el botón: Si está disponible, muestra el botón de Vender. Si no, el de Recuperar */}
                {partData.status ? (
                  <button onClick={() => initiateSale(name)} className="p-1.5 rounded shadow-md transition-colors bg-red-700 text-red-200 active:bg-red-800">
                    <Euro className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => initiateSale(name)} className="p-1.5 rounded shadow-md transition-colors bg-green-700 text-green-200 active:bg-green-800">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              {partData.status && (<div className="absolute top-1.5 left-1.5 bg-green-800 text-yellow-400 text-[9px] font-black px-1.5 py-0.5 rounded-sm shadow uppercase tracking-wider border border-green-900">OK</div>)}
            </div>
            <div className="p-2 bg-zinc-950 border-t border-zinc-800"><h3 className={`text-xs md:text-sm font-black text-center truncate uppercase ${!partData.status ? 'line-through text-red-500' : 'text-zinc-300'}`}>{name.replace(/_/g, ' ')}</h3></div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 p-4 rounded-lg border-2 border-zinc-800 flex gap-3 shadow-inner">
        <input type="text" placeholder="Nueva pieza (Ej: Alternador)" value={newPart} onChange={(e) => setNewPart(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomPart()} className="flex-1 bg-zinc-950 p-3 rounded border border-zinc-700 focus:border-yellow-500 focus:ring-yellow-500 focus:outline-none placeholder-zinc-600 text-zinc-300 uppercase font-bold text-sm" />
        <button onClick={addCustomPart} className="bg-green-700 hover:bg-green-600 active:bg-green-800 p-4 rounded font-black transition-colors border-b-4 border-green-900 active:border-b-0 active:mt-1 text-green-100"><Plus className="w-6 h-6" /></button>
      </div>
    </div>
  );
}