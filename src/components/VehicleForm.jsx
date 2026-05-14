import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/compressImage';
import { Camera, Save, Loader2, MapPin, Car } from 'lucide-react';

const ZONES = ['Patio A', 'Patio B', 'Nave 1', 'Nave 2'];
const AISLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const POSITIONS = ['Suelo', 'A', 'B', 'C', 'D'];

const DEFAULT_PARTS = {
  Motor: { status: true, image_url: null },
  Caja_Cambios: { status: true, image_url: null },
  Faros_Delanteros: { status: true, image_url: null },
  Parachoques_Delantero: { status: true, image_url: null },
  Puertas: { status: true, image_url: null },
  Maletero: { status: true, image_url: null },
};

export default function VehicleForm() {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Estados para autocompletado
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);

  const [form, setForm] = useState({
    brand: '', model: '', version: '', vin: '', color: '#000000',
    zone: ZONES[0], aisle: AISLES[0], position: POSITIONS[0],
    parts: DEFAULT_PARTS,
  });

  // Cargar marcas y modelos de Supabase para autocompletado
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const { data } = await supabase.from('vehicles').select('brand, model');
    if (data) {
      const uniqueBrands = [...new Set(data.map(v => v.brand).filter(Boolean))];
      setBrands(uniqueBrands.sort());
      
      const uniqueModels = [...new Set(data.map(v => v.model).filter(Boolean))];
      setModels(uniqueModels.sort());
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const compressed = await compressImage(imageFile, 200);
        const fileName = `${Date.now()}_vehicle.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-photos')
          .upload(fileName, compressed, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('vehicles').insert([
        {
          brand: form.brand, model: form.model, version: form.version,
          vin: form.vin || null, color: form.color,
          zone: form.zone, aisle: form.aisle, position: form.position,
          image_url: imageUrl, parts: form.parts,
        },
      ]);

      if (dbError) throw dbError;

      alert('¡Vehículo dado de alta con éxito!');
      setForm({ brand: '', model: '', version: '', vin: '', color: '#000000', zone: ZONES[0], aisle: AISLES[0], position: POSITIONS[0], parts: DEFAULT_PARTS });
      setPreview(null);
      setImageFile(null);
      fetchSuggestions(); // Actualizar sugerencias
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 justify-center">
        <Car className="w-8 h-8 text-blue-400" /> Entrada de Vehículo
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-56 object-cover rounded-2xl border-2 border-slate-700 shadow-lg" />
          ) : (
            <div className="w-full h-56 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center">
              <Camera className="w-16 h-16 text-slate-500" />
            </div>
          )}
          <label className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-5 px-4 rounded-2xl flex items-center justify-center gap-3 text-xl transition-colors shadow-md">
            <Camera className="w-7 h-7" /> Hacer Foto
            <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" />
          </label>
        </div>

        {/* Inputs con Autocompletado (Datalist) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input list="brands-list" type="text" name="brand" placeholder="Marca *" required value={form.brand} onChange={handleChange} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
            <datalist id="brands-list">
              {brands.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>
          <div>
            <input list="models-list" type="text" name="model" placeholder="Modelo *" required value={form.model} onChange={handleChange} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
            <datalist id="models-list">
              {models.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
        </div>
        
        <input type="text" name="version" placeholder="Versión" value={form.version} onChange={handleChange} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
        <input type="text" name="vin" placeholder="Bastidor (Opcional)" value={form.vin} onChange={handleChange} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 uppercase tracking-widest" />
        
        <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <label className="text-lg font-semibold whitespace-nowrap">Color Coche:</label>
          <input type="color" name="color" value={form.color} onChange={handleChange} className="w-full h-12 rounded-lg cursor-pointer bg-transparent border-0" />
        </div>

        <div className="bg-slate-800 p-5 rounded-2xl space-y-4 border border-slate-700 shadow-md">
          <h3 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-6 h-6 text-green-400" /> Ubicación</h3>
          <select name="zone" value={form.zone} onChange={handleChange} className="w-full bg-slate-700 p-4 rounded-xl text-lg focus:ring-2 focus:ring-green-500 focus:outline-none font-semibold">
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <select name="aisle" value={form.aisle} onChange={handleChange} className="bg-slate-700 p-4 rounded-xl text-lg focus:ring-2 focus:ring-green-500 focus:outline-none font-semibold">
              {AISLES.map(a => <option key={a} value={a}>Pasillo {a}</option>)}
            </select>
            <select name="position" value={form.position} onChange={handleChange} className="bg-slate-700 p-4 rounded-xl text-lg focus:ring-2 focus:ring-green-500 focus:outline-none font-semibold">
              {POSITIONS.map(p => <option key={p} value={p}>Altura {p}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-900 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-2xl transition-colors mt-4 shadow-lg">
          {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Save className="w-7 h-7" />}
          {loading ? 'Guardando...' : 'Dar de Alta'}
        </button>

      </form>
    </div>
  );
}