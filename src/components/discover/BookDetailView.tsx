import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
} from 'lucide-react';
import { DiscoverBook, DiscoverBookDetail, DownloadLink } from '../../types';
import { LectulandiaService } from '../../services/lectulandia.service';
import { formatBytes } from '../../utils/format';
import { clsx } from 'clsx';

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

export const BookDetailView = ({
  book,
  detail,
  loading,
  error,
  onBack,
}: {
  book: DiscoverBook;
  detail: DiscoverBookDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) => {
  const [downloadStates, setDownloadStates] = useState<
    Record<string, DownloadState>
  >({});
  const [downloadMessages, setDownloadMessages] = useState<
    Record<string, string>
  >({});

  const handleDownload = async (link: DownloadLink) => {
    setDownloadStates((prev) => ({ ...prev, [link.url]: 'downloading' }));
    setDownloadMessages((prev) => ({ ...prev, [link.url]: '' }));

    try {
      const result = await LectulandiaService.downloadBook(link.url);

      setDownloadStates((prev) => ({ ...prev, [link.url]: 'done' }));
      setDownloadMessages(
        (prev) => ({
          ...prev,
          [link.url]: `Descargado: ${result.fileName} (${formatBytes(result.bytes)}). Agregado a tu biblioteca.`,
        })
      );
    } catch (err) {
      console.error('Error descargando:', err);

      setDownloadStates((prev) => ({ ...prev, [link.url]: 'error' }));
      setDownloadMessages(
        (prev) => ({
          ...prev,
          [link.url]: err instanceof Error ? err.message : String(err),
        })
      );
    }
  };


  const getDownloadButtonClasses = (format: string, state: DownloadState) => {
    const base =
      'flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed';

    if (state === 'downloading') {
      return clsx(base, 'bg-gray-200 text-gray-500');
    }

    if (state === 'done') {
      return clsx(base, 'bg-green-100 text-green-700 border border-green-200');
    }

    if (state === 'error') {
      return clsx(base, 'bg-red-50 text-red-600 border border-red-200');
    }

    if (format === 'epub') {
      return clsx(base, 'bg-green-600 text-white hover:bg-green-700');
    }

    if (format === 'pdf') {
      return clsx(base, 'bg-red-600 text-white hover:bg-red-700');
    }

    return clsx(base, 'bg-gray-700 text-white hover:bg-gray-800');
  };

  const coverSrc = detail?.coverUrl || book.coverUrl;

  return (
    <div className="space-y-6">
      {/* Botón volver */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">
          {detail?.title || book.title}
        </h2>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">
            Error cargando el detalle
          </p>
          <p className="text-sm text-gray-400 mt-1">{error}</p>
        </div>
      ) : detail ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="md:flex">
            {/* Portada */}
            <div className="md:w-64 shrink-0 bg-gray-50 p-6 flex items-center justify-center">
              {coverSrc ? (
                <img
                  src={coverSrc}
                  alt={detail.title}
                  className="w-48 h-auto rounded-lg shadow-md object-cover"
                />
              ) : (
                <div className="w-48 aspect-2/3 rounded-lg bg-linear-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-white/50" />
                </div>
              )}
            </div>

            {/* Información */}
            <div className="flex-1 p-6 space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {detail.title}
                </h1>
                {detail.author && (
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" />
                    {detail.author}
                  </p>
                )}
              </div>

              {/* Sinopsis */}
              {detail.synopsis && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Sinopsis
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {detail.synopsis}
                  </p>
                </div>
              )}

              {/* Opciones de descarga */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
                  Opciones de descarga
                </p>

                <div className="space-y-3 flex justify-around">
                  {detail.downloadLinks.map((link) => {
                    const state: DownloadState =
                      downloadStates[link.url] || 'idle';
                    const message = downloadMessages[link.url];

                    return (
                      <div key={link.url}>
                        <button
                          type="button"
                          onClick={() => void handleDownload(link)}
                          disabled={state === 'downloading'}
                          className={getDownloadButtonClasses(
                            link.format,
                            state
                          )}
                        >
                          {state === 'downloading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : state === 'done' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Download></Download>
                          )}
                          
                          {state === 'downloading'
                            ? 'Descargando...'
                            : state === 'done'
                              ? 'Descargado'
                              : `Descargar ${link.label.toUpperCase()}`}
                        </button>

                        {message && (
                          <p
                            className={clsx(
                              'text-xs mt-1',
                              state === 'error'
                                ? 'text-red-600'
                                : 'text-green-600'
                            )}
                          >
                            {message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};