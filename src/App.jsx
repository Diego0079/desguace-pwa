import React, { useState } from 'react';
import VehicleForm from './components/VehicleForm';
import VehicleList from './components/VehicleList';
import VehicleDetail from './components/VehicleDetail.jsx';
import { Car, Search, PlusSquare } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('list'); // 'list', 'form', 'detail'
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const goToDetail = (id) => {
    setSelectedVehicleId(id);
    setView('detail');
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {view === 'list' && <VehicleList onSelectVehicle={goToDetail} />}
      {view === 'form' && <VehicleForm />}
      {view === 'detail' && <VehicleDetail vehicleId={selectedVehicleId} goBack={() => setView('list')} />}

      {/* Barra de Navegación Inferior Estilo App */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-around py-3 px-4 z-50">
        <button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 ${view === 'list' ? 'text-blue-400' : 'text-slate-400'}`}>
          <Search className="w-6 h-6" />
          <span className="text-xs font-semibold">Stock</span>
        </button>
        <button onClick={() => setView('form')} className={`flex flex-col items-center gap-1 ${view === 'form' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <PlusSquare className="w-6 h-6" />
          <span className="text-xs font-semibold">Alta</span>
        </button>
      </nav>
    </div>
  );
}