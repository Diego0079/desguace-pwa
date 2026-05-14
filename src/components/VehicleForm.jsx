import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/compressImage';
import { Camera, Save, Loader2, MapPin, Car } from 'lucide-react';
import Toast from './Toast';

const ZONES = ['Patio A', 'Patio B', 'Nave 1', 'Nave 2'];
const AISLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const POSITIONS = ['Suelo', 'A', 'B', 'C', 'D'];
const DEFAULT_PARTS = { Motor: { status: true, image_url: null }, Caja_Cambios: { status: true, image_url: null }, Faros_Delanteros: { status: true, image_url: null }, Parachoques_Delantero: { status: true, image_url: null }, Puertas: { status: true, image_url: null }, Maletero: { status: true, image_url: null } };

export default function VehicleForm() {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [dbVehicles, setDbVehicles] = useState([]);
  const [form, setForm] = useState({ brand: '', model: '', version: '', vin: '', color: '#000000', zone: ZONES[0], aisle: AISLES[0], position: POSITIONS[0], parts: DEFAULT_PARTS });

  useEffect(() => { fetchSuggestions(); }, []);
  const fetchSuggestions = async () => { const { data } = await supabase.from('vehicles').select('brand, model, vin'); if (data) setDbVehicles(data); };

  const brands = useMemo(() => [...new Set(dbVehicles.map(v => v.brand).filter(Boolean))].sort(), [dbVehicles]);
  const models = useMemo(() => { if (!form.brand) return []; const filtered = dbVehicles.filter(v => v.brand?.toLowerCase() === form.brand.toLowerCase()); return [...new Set(filtered.map(v => v.model).filter(Boolean))].sort(); }, [dbVehicles, form.brand]);
  const isVinDuplicate = useMemo(() => { if (!form.vin) return false; return dbVehicles.some(v => v.vin?.toLowerCase() === form.vin.toLowerCase()); }, [dbVehicles, form.vin]);

  const handleChange = (e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value, ...(name === 'brand' && { model: '' }) })); };
  const handleImageCapture = async (e) => { const file = e.target.files[0]; if (!file) return; setPreview(URL.createObjectURL(file)); setImageFile(file); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isVinDuplicate) { setToast({ message: 'Bastidor duplicado.', type: 'error' }); if(navigator.vibrate) navigator.vibrate([100, 50, 100]); return; }
    setLoading(true);
    try {
      let imageUrl = null;
      if (imageFile) { const compressed = await compressImage(imageFile, 200); const fileName = `${Date.now()}_vehicle.jpg`; const { data: uploadData, error: uploadError } = await supabase.storage.from('vehicle-photos').upload(fileName, compressed, { cacheControl: '3600', upsert: false }); if (uploadError) throw uploadError; const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(uploadData.path); imageUrl = urlData.publicUrl; }
      
      // 1. Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Insertar en Base de Datos
      const { error: dbError } = await supabase.from('vehicles').insert([
        {
          brand: form.brand, model: form.model, version: form.version,
          vin: form.vin || null, color: form.color,
          zone: form.zone, aisle: form.aisle, position: form.position,
          image_url: imageUrl, parts: form.parts,
          created_by: user.id, // 🚀 NUEVO: Guardar quién lo crea
        },
      ]);

      if (dbError) { if(dbError.code === '23505') throw new Error('El bastidor ya existe en la base de datos.'); throw dbError; }
      setToast({ message: '¡Vehículo dado de alta con éxito!', type: 'success' }); if(navigator.vibrate) navigator.vibrate(100);
      setForm({ brand: '', model: '', version: '', vin: '', color: '#000000', zone: ZONES[0], aisle: AISLES[0], position: POSITIONS[0], parts: DEFAULT_PARTS }); setPreview(null); setImageFile(null); fetchSuggestions();
    } catch (error) { setToast({ message: `Error: ${error.message}`, type: 'error' }); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto p-4 pt-8 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-3xl font-black mb-8 flex items-center gap-3 justify-center uppercase tracking-tight text-green-500"><Car className="w-8 h-8 text-yellow-400" /> Entrada Vehículo</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          {preview ? (<img src={preview} alt="Preview" className="w-full h-56 object-cover rounded-xl border-2 border-zinc-700 shadow-lg" />) : (<div className="w-full h-56 bg-zinc-800 rounded-xl border-2 border-dashed border-zinc-600 flex items-center justify-center"><Camera className="w-16 h-16 text-zinc-500" /></div>)}
          <label className="w-full cursor-pointer bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-zinc-950 font-black py-5 px-4 rounded-xl flex items-center justify-center gap-3 text-xl transition-all shadow-md border-b-4 border-yellow-700 active:border-b-0 active:mt-1"><Camera className="w-7 h-7" /> Hacer Foto<input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" /></label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><input list="brands-list" type="text" name="brand" placeholder="Marca *" required value={form.brand} onChange={handleChange} className="w-full bg-zinc-900 p-4 rounded-lg border-2 border-zinc-700 text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none placeholder-zinc-600 uppercase font-bold" /><datalist id="brands-list">{brands.map(b => <option key={b} value={b} />)}</datalist></div>
          <div><input list="models-list" type="text" name="model" placeholder="Modelo *" required value={form.model} onChange={handleChange} className="w-full bg-zinc-900 p-4 rounded-lg border-2 border-zinc-700 text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none placeholder-zinc-600 uppercase font-bold" /><datalist id="models-list">{models.map(m => <option key={m} value={m} />)}</datalist></div>
        </div>
        <input type="text" name="version" placeholder="Versión / Año" value={form.version} onChange={handleChange} className="w-full bg-zinc-900 p-4 rounded-lg border-2 border-zinc-700 text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none placeholder-zinc-600 uppercase font-bold" />
        <div className="relative"><input type="text" name="vin" placeholder="Bastidor (VIN)" value={form.vin} onChange={handleChange} className={`w-full bg-zinc-900 p-4 rounded-lg border-2 text-lg focus:ring-2 focus:outline-none placeholder-zinc-600 uppercase tracking-widest font-mono ${isVinDuplicate ? 'border-red-500 text-red-400 focus:ring-red-500' : 'border-zinc-700 focus:ring-yellow-500 focus:border-yellow-500 text-zinc-200'}`} />{isVinDuplicate && (<p className="absolute -bottom-6 left-2 text-red-500 text-xs font-black uppercase tracking-wider animate-pulse">⚠️ Bastidor duplicado</p>)}</div>
        <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-lg border-2 border-zinc-700"><label className="text-lg font-black whitespace-nowrap text-zinc-400 uppercase tracking-wider">Color:</label><input type="color" name="color" value={form.color} onChange={handleChange} className="w-full h-12 rounded-lg cursor-pointer bg-transparent border-0" /></div>
        <div className="bg-zinc-900 p-5 rounded-xl space-y-4 border-2 border-zinc-700 shadow-md">
          <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-widest text-zinc-300"><MapPin className="w-6 h-6 text-yellow-400" /> Ubicación</h3>
          <select name="zone" value={form.zone} onChange={handleChange} className="w-full bg-zinc-950 p-4 rounded-lg text-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none font-bold text-zinc-300 border border-zinc-700">{ZONES.map(z => <option key={z} value={z}>{z}</option>)}</select>
          <div className="grid grid-cols-2 gap-4">
            <select name="aisle" value={form.aisle} onChange={handleChange} className="bg-zinc-950 p-4 rounded-lg text-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none font-bold text-zinc-300 border border-zinc-700">{AISLES.map(a => <option key={a} value={a}>Pasillo {a}</option>)}</select>
            <select name="position" value={form.position} onChange={handleChange} className="bg-zinc-950 p-4 rounded-lg text-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none font-bold text-zinc-300 border border-zinc-700">{POSITIONS.map(p => <option key={p} value={p}>Altura {p}</option>)}</select>
          </div>
        </div>
        <button type="submit" disabled={loading || isVinDuplicate} className="w-full bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:bg-green-900 disabled:cursor-not-allowed text-green-100 font-black py-5 rounded-xl flex items-center justify-center gap-3 text-2xl transition-all shadow-md border-b-4 border-green-900 active:border-b-0 active:mt-1 disabled:border-b-0 mt-6">{loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Save className="w-7 h-7" />}{loading ? 'Guardando...' : 'DAR DE ALTA'}</button>
      </form>
    </div>
  );
}