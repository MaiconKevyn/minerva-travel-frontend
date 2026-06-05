import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, ExternalLink, MapPin, Plus, Route, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  clearGoogleMarkers,
  googleMapsBrowserKey,
  googleMapsMapId,
  loadGoogleMaps,
} from '@/utils/google-maps.js';
import { mappableLandmarks } from '@/utils/minerva-api.js';

const createMarkerContent = (landmark, isSelected) => {
  const wrapper = document.createElement('button');
  wrapper.type = 'button';
  wrapper.className = [
    'relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 shadow-lg transition-transform',
    isSelected ? 'border-primary bg-primary' : 'border-white bg-secondary',
  ].join(' ');
  wrapper.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';

  if (landmark.image) {
    const image = document.createElement('img');
    image.src = landmark.image;
    image.alt = landmark.name;
    image.className = 'h-full w-full object-cover';
    wrapper.appendChild(image);
  } else {
    const label = document.createElement('span');
    label.className = 'text-sm font-bold text-white';
    label.textContent = landmark.name?.slice(0, 1) || '?';
    wrapper.appendChild(label);
  }

  const status = document.createElement('span');
  status.className = [
    'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white',
    isSelected ? 'bg-primary' : 'bg-secondary',
  ].join(' ');
  status.textContent = isSelected ? 'OK' : '+';
  wrapper.appendChild(status);

  return wrapper;
};

const MapOverviewModal = ({
  open,
  landmarks,
  selectedLandmarks,
  onToggleLandmark,
  onClose,
}) => {
  const apiKey = googleMapsBrowserKey();
  const mapId = googleMapsMapId();
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [loadError, setLoadError] = useState('');
  const [activeLandmarkId, setActiveLandmarkId] = useState('');

  const selectedSet = useMemo(() => new Set(selectedLandmarks), [selectedLandmarks]);
  const mapLandmarks = useMemo(() => mappableLandmarks(landmarks), [landmarks]);
  const activeLandmark = (
    mapLandmarks.find((landmark) => landmark.id === activeLandmarkId) ||
    mapLandmarks[0]
  );

  useEffect(() => {
    if (!open || mapLandmarks.length === 0) {
      return;
    }
    const activeStillExists = mapLandmarks.some((landmark) => landmark.id === activeLandmarkId);
    if (!activeLandmarkId || !activeStillExists) {
      setActiveLandmarkId(mapLandmarks[0].id);
    }
  }, [activeLandmarkId, mapLandmarks, open]);

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
    if (!open || !apiKey || mapLandmarks.length === 0 || !mapElementRef.current) {
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
        const first = mapLandmarks[0];
        const map = new Map(mapElementRef.current, {
          center: { lat: first.latitude, lng: first.longitude },
          zoom: 12,
          ...(mapId ? { mapId } : {}),
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        if (cancelled) {
          return;
        }

        mapRef.current = map;
        clearGoogleMarkers(markersRef.current);

        const bounds = new google.maps.LatLngBounds();
        const nextMarkers = mapLandmarks.map((landmark) => {
          const position = { lat: landmark.latitude, lng: landmark.longitude };
          bounds.extend(position);

          if (markerLibrary.AdvancedMarkerElement) {
            const marker = new markerLibrary.AdvancedMarkerElement({
              map,
              position,
              title: landmark.name,
              content: createMarkerContent(landmark, selectedSet.has(landmark.id)),
            });
            marker.addListener('click', () => setActiveLandmarkId(landmark.id));
            return marker;
          }

          const marker = new google.maps.Marker({
            map,
            position,
            title: landmark.name,
            label: selectedSet.has(landmark.id) ? 'OK' : '+',
          });
          marker.addListener('click', () => setActiveLandmarkId(landmark.id));
          return marker;
        });

        markersRef.current = nextMarkers;
        map.fitBounds(bounds, 80);
      } catch (error) {
        console.error('Google Maps load error:', error);
        if (!cancelled) {
          setLoadError('Nao foi possivel carregar o mapa.');
        }
      }
    };

    drawMap();

    return () => {
      cancelled = true;
      clearGoogleMarkers(markersRef.current);
      markersRef.current = [];
    };
  }, [apiKey, mapId, mapLandmarks, open, selectedSet]);

  if (!open) {
    return null;
  }

  const selected = activeLandmark ? selectedSet.has(activeLandmark.id) : false;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background text-foreground">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Mapa da viagem
            </p>
            <h2 className="text-xl font-serif font-bold md:text-2xl">
              Distancia visual entre os pontos
            </h2>
          </div>
          <Button onClick={onClose} variant="outline" className="h-10 w-10 rounded-full p-0">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_380px]">
          <section className="relative min-h-[420px] bg-muted">
            {apiKey && mapLandmarks.length > 0 && !loadError && (
              <div ref={mapElementRef} className="h-full min-h-[420px] w-full" />
            )}

            {!apiKey && (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center">
                <div className="max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
                  <MapPin className="mx-auto mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-serif font-bold">Mapa nao configurado</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Configure `VITE_GOOGLE_MAPS_BROWSER_KEY` no frontend para ativar o mapa embutido.
                  </p>
                </div>
              </div>
            )}

            {apiKey && mapLandmarks.length === 0 && (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center">
                <div className="max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
                  <MapPin className="mx-auto mb-4 h-10 w-10 text-secondary" />
                  <h3 className="mb-2 text-xl font-serif font-bold">Sem coordenadas ainda</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    O mapa aparece quando os locais retornam com latitude e longitude.
                  </p>
                </div>
              </div>
            )}

            {loadError && (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center">
                <div className="max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
                  <MapPin className="mx-auto mb-4 h-10 w-10 text-destructive" />
                  <h3 className="mb-2 text-xl font-serif font-bold">Erro ao carregar mapa</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{loadError}</p>
                </div>
              </div>
            )}

            <div className="absolute left-4 top-4 rounded-full bg-background/90 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur">
              {mapLandmarks.length} pontos no mapa
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto border-l border-border bg-background">
            {activeLandmark && (
              <div className="border-b border-border p-5">
                <div className="mb-4 aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                  {activeLandmark.image ? (
                    <img
                      src={activeLandmark.image}
                      alt={activeLandmark.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <MapPin className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      {activeLandmark.city}
                    </p>
                    <h3 className="text-2xl font-serif font-bold">{activeLandmark.name}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {activeLandmark.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {activeLandmark.duration_minutes && (
                      <Badge variant="outline" className="rounded-full">
                        <Clock3 className="mr-1 h-3.5 w-3.5" />
                        {activeLandmark.duration_minutes} min
                      </Badge>
                    )}
                    {selected && (
                      <Badge className="rounded-full bg-primary text-white">No roteiro</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <Button
                      onClick={() => onToggleLandmark(activeLandmark.id)}
                      className={cn(
                        'rounded-full py-6 font-bold',
                        selected
                          ? 'bg-muted text-foreground hover:bg-muted/80'
                          : 'bg-primary text-white hover:bg-primary/90'
                      )}
                    >
                      {selected ? (
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
                    {activeLandmark.maps_url && (
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full py-6 font-bold"
                      >
                        <a href={activeLandmark.maps_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-5 w-5" />
                          Abrir no Google Maps
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold">Pontos da regiao</h4>
                <Route className="h-5 w-5 text-secondary" />
              </div>

              {mapLandmarks.map((landmark) => {
                const itemSelected = selectedSet.has(landmark.id);
                const itemActive = activeLandmark?.id === landmark.id;

                return (
                  <button
                    type="button"
                    key={landmark.id}
                    onClick={() => setActiveLandmarkId(landmark.id)}
                    className={cn(
                      'flex w-full gap-3 rounded-2xl border p-3 text-left transition-all',
                      itemActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-muted/40'
                    )}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {landmark.image ? (
                        <img src={landmark.image} alt={landmark.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <MapPin className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{landmark.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{landmark.city}</p>
                      <p className="mt-1 text-xs font-bold text-primary">
                        {itemSelected ? 'Selecionado' : 'Sugerido'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MapOverviewModal;
