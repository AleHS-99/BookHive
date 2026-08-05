import { BookOpen, FolderOpen } from 'lucide-react';

type LibrarySetupScreenProps = {
  onChooseFolder: () => void;
  saving: boolean;
  error: string | null;
};

export const LibrarySetupScreen = ({
  onChooseFolder,
  saving,
  error,
}: LibrarySetupScreenProps) => {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-app-accent/10 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-app-accent" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Configura tu biblioteca
        </h1>

        <p className="text-sm text-gray-500 mb-8">
          BookHive necesita una carpeta para almacenar tus libros.
          Por ahora, selecciona una carpeta vacía.
        </p>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onChooseFolder}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-app-accent text-gray px-5 py-3 rounded-xl font-medium hover:text-amber-700"
        >
          <FolderOpen className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Seleccionar carpeta'}
        </button>
      </div>
    </div>
  );
};