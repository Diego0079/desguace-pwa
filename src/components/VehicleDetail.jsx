import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/compressImage';
import { QRCodeSVG } from 'qrcode.react'; // Importar generador QR
import { ArrowLeft, CheckCircle, XCircle, Plus, Loader2, Tag, Camera, ImagePlus, QrCode, X } from 'lucide-react';

export default function VehicleDetail({ vehicleId, goBack }) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPart, setNewPart] = useState('');
  const [uploadingPart, setUploadingPart] = useState(null);
  const [showQr, setShowQr] = useState(false); // Estado para modal QR
  const fileInputRef = useRef(null);

  useEffect(() => { fetchVehicle(); }, [vehicleId]);

  const fetchVehicle = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
    if (!error && data) {
      const normalizedParts = {};
      for (const [key, value] of Object.entries(data.parts || {})) {
        normalizedParts[key] = typeof value === 'boolean' ? { status: value, image_url: null } : value;
      }
      setVehicle({ ...data, parts: normalizedParts });
    }
    setLoading(false);
  };

  const togglePartStatus = async (partName) => {
    // 📳 VIBRACIÓN HÁPTICA
    if (navigator.vibrate) navigator.vibrate(100); // Vibra 100ms

    const currentPart = vehicle.parts[partName];
    const updatedParts = { ...vehicle.parts, [partName]: { ...currentPart, status: !currentPart.status } };
    setVehicle({ ...vehicle, parts: updatedParts });
    await supabase.from('vehicles').update({ parts: updatedParts }).eq('id', vehicleId);
  };

  const addCustomPart = async () => {
    if (!newPart.trim()) return;
    const formattedName = newPart.trim().charAt(0).toUpperCase() + newPart.trim().slice(1).replace(/ /g, '_');
    const updatedParts = { ...vehicle.parts, [formattedName]: { status: true, image_url: null } };
    setVehicle({ ...vehicle, parts: updatedParts });
    setNewPart('');
    await supabase.from('vehicles').update({ parts: updatedParts }).eq('id', vehicleId);
  };

  const handlePartImageUpload = async (partName, event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadingPart(partName);
    try {
      const compressed = await compressImage(file, 150);
      const fileName = `parts/${Date.now()}_${partName}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('vehicle-photos').upload(fileName, compressed, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(uploadData.path);
      const updatedParts = { ...vehicle.parts, [partName]: { ...vehicle.parts[partName], image_url: urlData.publicUrl } };
      setVehicle({ ...vehicle, parts: updatedParts });
      await supabase.from('vehicles').update({ parts: updatedParts }).eq('id', vehicleId);
    } catch (error) {
      alert('Error al subir foto: ' + error.message);
    } finally {
      setUploadingPart(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-400" /></div>;
  if (!vehicle) return <div className="text-center text-red-400 py-20">Vehículo no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6">
      
      {/* 🖨️ MODAL DEL CÓDIGO QR */}
      {showQr && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
          <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-slate-900 font-bold text-xl">Código QR del Vehículo</h3>
            <p className="text-slate-500 text-sm text-center">Imprime este código y pégalo en el salpicadero</p>
            <QRCodeSVG value={vehicle.id} size={256} level="H" />
            <p className="text-slate-900 font-bold text-lg mt-2">{vehicle.brand} {vehicle.model}</p>
            <button onClick={() => setShowQr(false)} className="mt-4 bg-slate-900 text-white font-bold py-3 px-8 rounded-xl w-full">Cerrar</button>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={goBack} className="flex items-center gap-2 text-blue-400 font-semibold text-lg active:text-blue-300">
          <ArrowLeft className="w-6 h-6" /> Volver
        </button>
        <button onClick={() => setShowQr(true)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded-xl text-sm font-semibold active:bg-slate-500">
          <QrCode className="w-5 h-5" /> Ver QR
        </button>
      </div>

      <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 mb-6">
        {vehicle.image_url && <img src={vehicle.image_url} alt="Coche" className="w-full h-48 object-cover" />}
        <div className="p-4">
          <h1 className="text-2xl font-bold">{vehicle.brand} {vehicle.model}</h1>
          <p className="text-slate-400">{vehicle.version} | {vehicle.color}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Tag className="w-6 h-6 text-yellow-400" /> Piezas del Vehículo
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.entries(vehicle.parts).map(([name, partData]) => (
          <div key={name} className={`rounded-xl border-2 overflow-hidden transition-all ${partData.status ? 'border-emerald-500/30 bg-slate-800' : 'border-red-900/30 bg-slate-800/50 opacity-60'}`}>
            <div className="relative w-full h-28 md:h-32 bg-slate-700 flex items-center justify-center">
              {partData.image_url ? (
                <img src={partData.image_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-500"><ImagePlus className="w-8 h-8 mb-1" /><span className="text-[10px]">Sin foto</span></div>
              )}
              {uploadingPart === name && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}
              <div className="absolute bottom-1.5 right-1.5 flex gap-1.5">
                <label className={`cursor-pointer p-1.5 bg-slate-900/70 backdrop-blur-sm rounded-full active:bg-slate-600 ${uploadingPart ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera className="w-4 h-4 text-white" />
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handlePartImageUpload(name, e)} className="hidden" />
                </label>
                <button onClick={() => togglePartStatus(name)} className={`p-1.5 bg-slate-900/70 backdrop-blur-sm rounded-full active:bg-slate-600 ${partData.status ? 'text-red-400' : 'text-emerald-400'}`}>
                  {partData.status ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </button>
              </div>
              {partData.status && <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md">DISPONIBLE</div>}
            </div>
            <div className="p-2 bg-slate-900/40"><h3 className={`text-xs md:text-sm font-bold text-center truncate ${!partData.status ? 'line-through text-red-400' : ''}`}>{name.replace(/_/g, ' ')}</h3></div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex gap-3">
        <input type="text" placeholder="Nueva pieza (Ej: Alternador)" value={newPart} onChange={(e) => setNewPart(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomPart()} className="flex-1 bg-slate-700 p-3 rounded-xl border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        <button onClick={addCustomPart} className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl flex items-center justify-center transition-colors"><Plus className="w-6 h-6" /></button>
      </div>
    </div>
  );
}