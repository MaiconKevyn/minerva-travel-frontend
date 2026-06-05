import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ExternalLink, MapPin, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  clearGoogleMarkers,
  googleMapsBrowserKey,
  googleMapsMapId,
  loadGoogleMaps,
} from '@/utils/google-maps.js';
import { mappableLandmarks } from '@/utils/minerva-api.js';

const createPlaceMarkerContent = (landmark) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary shadow-lg';

  if (landmark.image) {
    const image = document.createElement('img');
    image.src = landmark.image;
    image.alt = landmark.name;
    image.className = 'h-full w-full object-cover';
    wrapper.appendChild(image);
    return wrapper;
  }

  const icon = document.createElement('span');
  icon.className = 'text-sm font-bold text-white';
  icon.textContent = landmark.name?.slice(0, 1) || '?';
  wrapper.appendChild(icon);
  return wrapper;
};

const PlaceMapModal = ({
  open,
  landmark,
  mapsUrl,
  isSelected,
  onToggle,
  onClose,
}) => {
  const apiKey = googleMapsBrowserKey();
  const mapId = googleMapsMapId();
  const mapElementRef = useRef(null);
  const markerRef = useRef(null);
  const [loadError, setLoadError] = useState('');

  const mapLandmark = useMemo(() => mappableLandmarks(landmark ? [landmark] : [])[0], [landmark]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !apiKey || !mapLandmark || !mapElementRef.current) {
      return undefined;
    }

    let cancelled = false;

    const drawMap = async () => {
      try {
        setLoadError('');
        const google = await loadGoogleMaps(apiKey);
        const { Map } = await google.maps.importLibrary('maps');
        const markerLibrary = mapId
          ? await google.maps.importLibrary('marker').catch(() => ({}))
          : {};
        const position = { lat: mapLandmark.latitude, lng: mapLandmark.longitude };
        const map = new Map(mapElementRef.current, {
          center: position,
          zoom: 15,
          ...(mapId ? { mapId } : {}),
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });

        if (cancelled) {
          return;
        }

        clearGoogleMarkers([markerRef.current]);

        markerRef.current = markerLibrary.AdvancedMarkerElement
          ? new markerLibrary.AdvancedMarkerElement({
            map,
            position,
            title: mapLandmark.name,
            content: createPlaceMarkerContent(mapLandmark),
          })
          : new google.maps.Marker({
            map,
            position,
            title: mapLandmark.name,
          });
      } catch (error) {
        console.error('Google Maps place modal load error:', error);
        if (!cancelled) {
          setLoadError('Nao foi possivel carregar o mapa deste local.');
        }
      }
    };

    drawMap();

    return () => {
      cancelled = true;
      clearGoogleMarkers([markerRef.current]);
      markerRef.current = null;
    };
  }, [apiKey, mapId, mapLandmark, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Mapa de ${landmark?.name || 'local'}`}
        className="max-h-[94vh] w-full overflow-hidden rounded-t-[28px] border border-border bg-background text-foreground shadow-2xl sm:max-w-3xl sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Localizacao
            </p>
            <h2 className="truncate text-2xl font-serif font-bold">
              {landmark?.name}
            </h2>
            <p className="truncate text-sm font-medium text-muted-foreground">
              {[landmark?.city, landmark?.country].filter(Boolean).join(', ')}
            </p>
          </div>
          <Button onClick={onClose} variant="outline" className="h-10 w-10 shrink-0 rounded-full p-0">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px]">
          <section className="relative min-h-[340px] bg-muted">
            {apiKey && mapLandmark && !loadError && (
              <div ref={mapElementRef} className="h-full min-h-[340px] w-full" />
            )}

            {!apiKey && (
              <div className="flex h-full min-h-[340px] items-center justify-center p-6 text-center">
                <div className="max-w-sm rounded-2xl border border-border bg-background p-5 shadow-sm">
                  <MapPin className="mx-auto mb-3 h-9 w-9 text-primary" />
                  <h3 className="mb-2 font-serif text-xl font-bold">Mapa nao configurado</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure `VITE_GOOGLE_MAPS_BROWSER_KEY` para abrir o mapa dentro do site.
                  </p>
                </div>
              </div>
            )}

            {apiKey && !mapLandmark && (
              <div className="flex h-full min-h-[340px] items-center justify-center p-6 text-center">
                <div className="max-w-sm rounded-2xl border border-border bg-background p-5 shadow-sm">
                  <MapPin className="mx-auto mb-3 h-9 w-9 text-secondary" />
                  <h3 className="mb-2 font-serif text-xl font-bold">Coordenadas indisponiveis</h3>
                  <p className="text-sm text-muted-foreground">
                    Este local ainda nao tem latitude e longitude para mapa embutido.
                  </p>
                </div>
              </div>
            )}

            {loadError && (
              <div className="flex h-full min-h-[340px] items-center justify-center p-6 text-center">
                <div className="max-w-sm rounded-2xl border border-border bg-background p-5 shadow-sm">
                  <MapPin className="mx-auto mb-3 h-9 w-9 text-destructive" />
                  <h3 className="mb-2 font-serif text-xl font-bold">Erro ao carregar</h3>
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4 border-t border-border p-5 sm:border-l sm:border-t-0">
            {landmark?.image && (
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <img src={landmark.image} alt={landmark.name} className="h-full w-full object-cover" />
              </div>
            )}

            <p className="text-sm leading-relaxed text-muted-foreground">
              {landmark?.description || 'Veja onde este ponto fica antes de decidir se ele entra no roteiro.'}
            </p>

            <div className="grid gap-3">
              {onToggle && (
                <Button
                  onClick={() => onToggle(landmark.id)}
                  className={cn(
                    'rounded-full py-6 font-bold',
                    isSelected
                      ? 'bg-muted text-foreground hover:bg-muted/80'
                      : 'bg-primary text-white hover:bg-primary/90'
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Remover do roteiro
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Adicionar ao roteiro
                    </>
                  )}
                </Button>
              )}

              {mapsUrl && (
                <Button asChild variant="outline" className="rounded-full py-6 font-bold">
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Abrir no Google Maps
                  </a>
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlaceMapModal;
