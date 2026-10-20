import { MapaPage } from './features/mapa/presentation/MapaPage'

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-2 bg-white p-4">
      <h1 className="text-3xl font-bold text-green-700">UniVendas</h1>
      <p className="text-gray-600">Vendedores do campus, perto de você.</p>
      <MapaPage />
    </main>
  )
}

export default App
