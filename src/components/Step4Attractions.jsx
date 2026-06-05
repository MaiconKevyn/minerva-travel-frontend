import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Loader2,
  RefreshCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useConversationalGuide } from '@/contexts/ConversationalGuideContext.jsx';
import { Button } from '@/components/ui/button';
import {
  discoverItinerary,
  mapParsedLandmarksToParsedData,
  mapRecommendationToParsedData,
  parseLandmarks,
  splitQuickSuggestionLandmarks,
} from '@/utils/minerva-api.js';
import LandmarkCard from './LandmarkCard.jsx';
import DestinationGroup from './DestinationGroup.jsx';

const interestOptions = [
  { label: 'Parques', value: 'parques' },
  { label: 'Museus', value: 'museus' },
  { label: 'Arte', value: 'arte' },
  { label: 'Animais', value: 'animais' },
  { label: 'Comida', value: 'comida' },
  { label: 'Historia', value: 'historia' },
  { label: 'Lojas', value: 'lojas' },
  { label: 'Rio', value: 'rio' },
  { label: 'Vistas', value: 'vistas' },
];

const paceOptions = [
  { label: 'Leve', value: 'light' },
  { label: 'Equilibrado', value: 'balanced' },
  { label: 'Completo', value: 'full' },
];

const Step4Attractions = () => {
  const {
    destination,
    parsedData,
    setParsedData,
    selectedLandmarks,
    setSelectedLandmarks,
    toggleLandmarkSelection,
    recommendedItinerary,
    setRecommendedItinerary,
    itineraryPreferences,
    setItineraryPreferences,
    isLoadingLandmarks,
    setIsLoadingLandmarks,
    hasSearchedLandmarks,
    setHasSearchedLandmarks,
    nextStep,
    goBack,
  } = useConversationalGuide();

  const [error, setError] = useState(null);
  const [loadingMode, setLoadingMode] = useState('quick');
  const [resultMode, setResultMode] = useState('quick');
  const [showPreferenceSetup, setShowPreferenceSetup] = useState(false);
  const autoLoadedDestinationRef = useRef('');

  const updatePreference = (key, value) => {
    setItineraryPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInterest = (interest) => {
    setItineraryPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }));
  };

  const applyParsedResult = useCallback((mapped, mode, itinerary = null) => {
    setParsedData({
      destinations: mapped.destinations,
      landmarks: mapped.landmarks,
    });
    setSelectedLandmarks(mapped.selectedLandmarks);
    setRecommendedItinerary(itinerary);
    setResultMode(mode);
    setHasSearchedLandmarks(true);
  }, [
    setHasSearchedLandmarks,
    setParsedData,
    setRecommendedItinerary,
    setSelectedLandmarks,
  ]);

  const loadManualMappedLandmarks = useCallback(async () => {
    const parsedLandmarks = await parseLandmarks(destination);
    const mapped = mapParsedLandmarksToParsedData(parsedLandmarks);

    if (mapped.landmarks.length === 0) {
      throw new Error('Nao encontrei pontos turisticos claros no roteiro informado.');
    }

    return mapped;
  }, [destination]);

  const processManualAttractions = useCallback(async () => {
    if (!destination.trim()) return;

    setLoadingMode('manual');
    setIsLoadingLandmarks(true);
    setError(null);

    try {
      const mapped = await loadManualMappedLandmarks();

      applyParsedResult(mapped, 'manual', null);
    } catch (err) {
      console.error('Error parsing manual landmarks:', err);
      setError(err.message || 'Nao foi possivel organizar o roteiro informado.');
    } finally {
      setIsLoadingLandmarks(false);
    }
  }, [
    applyParsedResult,
    destination,
    loadManualMappedLandmarks,
    setIsLoadingLandmarks,
  ]);

  const processAttractions = useCallback(async ({
    mode = 'itinerary',
    allowManualFallback = false,
  } = {}) => {
    if (!destination.trim()) return;

    setLoadingMode(mode === 'quick' ? 'quick' : 'suggestion');
    setIsLoadingLandmarks(true);
    setError(null);

    try {
      const itinerary = await discoverItinerary({
        destination,
        days: itineraryPreferences.days,
        interests: itineraryPreferences.interests,
        pace: itineraryPreferences.pace,
        children_ages: [],
        must_see: [],
      });
      const mapped = mapRecommendationToParsedData(itinerary, null);

      applyParsedResult(mapped, mode, itinerary);
      setShowPreferenceSetup(false);
    } catch (err) {
      if (allowManualFallback) {
        try {
          const mapped = await loadManualMappedLandmarks();
          applyParsedResult(mapped, 'manual', null);
          return;
        } catch (manualErr) {
          console.error('Error parsing manual landmarks after suggestion failure:', manualErr);
        }
      }

      console.error('Error fetching landmarks:', err);
      setError(err.message || 'Nao foi possivel montar o roteiro.');
    } finally {
      setIsLoadingLandmarks(false);
    }
  }, [
    applyParsedResult,
    destination,
    itineraryPreferences.days,
    itineraryPreferences.interests,
    itineraryPreferences.pace,
    loadManualMappedLandmarks,
    setIsLoadingLandmarks,
  ]);

  useEffect(() => {
    const trimmedDestination = destination.trim();

    if (
      !trimmedDestination ||
      hasSearchedLandmarks ||
      isLoadingLandmarks ||
      error ||
      showPreferenceSetup ||
      autoLoadedDestinationRef.current === trimmedDestination
    ) {
      return;
    }

    autoLoadedDestinationRef.current = trimmedDestination;
    processAttractions({ mode: 'quick', allowManualFallback: true });
  }, [
    destination,
    error,
    hasSearchedLandmarks,
    isLoadingLandmarks,
    processAttractions,
    showPreferenceSetup,
  ]);

  const selectedCount = selectedLandmarks.length;
  const itineraryMode = Boolean(recommendedItinerary?.days?.length && resultMode === 'itinerary');
  const manualMode = resultMode === 'manual';
  const quickSections = splitQuickSuggestionLandmarks(parsedData.landmarks);
  const alternatives = quickSections.alternatives;

  const renderPreferenceSetup = () => (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
          Como voce quer montar o roteiro?
        </h2>
        <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
          {destination}
        </p>
      </div>

      <div className="bg-card dark:bg-slate-800 rounded-[32px] p-6 md:p-8 border border-border/60 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-6">
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Dias
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => updatePreference('days', day)}
                  className={`h-11 w-11 rounded-full font-bold transition-all ${
                    itineraryPreferences.days === day
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Ritmo
            </label>
            <div className="flex flex-wrap gap-3">
              {paceOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => updatePreference('pace', option.value)}
                  className={`rounded-full px-5 py-3 font-bold transition-all ${
                    itineraryPreferences.pace === option.value
                      ? 'bg-secondary text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-secondary/10 hover:text-secondary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Programas que combinam
          </label>
          <div className="flex flex-wrap gap-3">
            {interestOptions.map((interest) => {
              const selected = itineraryPreferences.interests.includes(interest.value);
              return (
                <button
                  type="button"
                  key={interest.value}
                  onClick={() => toggleInterest(interest.value)}
                  className={`rounded-full px-5 py-3 font-bold transition-all ${
                    selected
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {interest.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-4 pt-2">
          <Button onClick={goBack} variant="outline" className="rounded-full py-6 px-8 text-lg">
            <ArrowLeft className="w-5 h-5 mr-2" /> Editar destino
          </Button>
          {parsedData.landmarks.length > 0 && (
            <Button
              onClick={() => setShowPreferenceSetup(false)}
              variant="outline"
              className="rounded-full py-6 px-8 text-lg font-bold"
            >
              Voltar aos cards
            </Button>
          )}
          <Button
            onClick={() => processAttractions({ mode: 'itinerary' })}
            className="flex-1 rounded-full py-6 px-8 text-lg bg-primary hover:bg-primary/90 text-white font-bold"
          >
            Atualizar sugestao <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderItineraryDays = () => (
    <div className="space-y-10">
      {recommendedItinerary.days.map((day) => {
        const dayLandmarks = parsedData.landmarks.filter(
          (landmark) => !landmark.is_alternative && landmark.itinerary_day === day.day
        );

        if (dayLandmarks.length === 0) return null;

        return (
          <section key={day.day} className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                  Dia {day.day}
                </p>
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  {day.title}
                </h3>
                <p className="text-muted-foreground font-medium max-w-2xl">
                  {day.theme}
                </p>
              </div>
              <div className="rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground w-fit">
                {dayLandmarks.filter((landmark) => selectedLandmarks.includes(landmark.id)).length} selecionados
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {dayLandmarks.map((landmark, lIdx) => (
                <LandmarkCard
                  key={landmark.id}
                  landmark={landmark}
                  destination={{ city: landmark.city, country: landmark.country }}
                  index={lIdx}
                  isSelected={selectedLandmarks.includes(landmark.id)}
                  onToggle={toggleLandmarkSelection}
                />
              ))}
            </div>
          </section>
        );
      })}

      {alternatives.length > 0 && (
        <section className="pt-6 space-y-5 border-t border-border/60">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-secondary">
              Outras opcoes
            </p>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              Trocas e extras para o roteiro
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {alternatives.slice(0, 6).map((landmark, lIdx) => (
              <LandmarkCard
                key={landmark.id}
                landmark={landmark}
                destination={{ city: landmark.city, country: landmark.country }}
                index={lIdx}
                isSelected={selectedLandmarks.includes(landmark.id)}
                onToggle={toggleLandmarkSelection}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderQuickSuggestionCards = () => (
    <div className="space-y-12">
      {quickSections.primary.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Primeira selecao
              </p>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                Locais citados e sugestoes alinhadas
              </h3>
            </div>
            <div className="rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground w-fit">
              {quickSections.primary.filter((landmark) => selectedLandmarks.includes(landmark.id)).length} selecionados
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {quickSections.primary.map((landmark, lIdx) => (
              <LandmarkCard
                key={landmark.id}
                landmark={landmark}
                destination={{ city: landmark.city, country: landmark.country }}
                index={lIdx}
                isSelected={selectedLandmarks.includes(landmark.id)}
                onToggle={toggleLandmarkSelection}
              />
            ))}
          </div>
        </section>
      )}

      {quickSections.alternatives.length > 0 && (
        <section className="pt-6 space-y-5 border-t border-border/60">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-secondary">
              Mais possibilidades
            </p>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              Extras para considerar
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {quickSections.alternatives.slice(0, 8).map((landmark, lIdx) => (
              <LandmarkCard
                key={landmark.id}
                landmark={landmark}
                destination={{ city: landmark.city, country: landmark.country }}
                index={lIdx}
                isSelected={selectedLandmarks.includes(landmark.id)}
                onToggle={toggleLandmarkSelection}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderManualGroups = () => (
    <div className="space-y-16">
      {parsedData.destinations.map((dest, dIdx) => {
        const destLandmarks = parsedData.landmarks.filter((landmark) => landmark.destination_id === dest.id);

        if (destLandmarks.length === 0) return null;

        return (
          <DestinationGroup key={dest.id} destination={dest} index={dIdx}>
            {destLandmarks.map((landmark, lIdx) => (
              <LandmarkCard
                key={landmark.id}
                landmark={landmark}
                destination={dest}
                index={lIdx}
                isSelected={selectedLandmarks.includes(landmark.id)}
                onToggle={toggleLandmarkSelection}
              />
            ))}
          </DestinationGroup>
        );
      })}
    </div>
  );

  if (showPreferenceSetup && !isLoadingLandmarks && !error) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[60vh] py-4">
        {renderPreferenceSetup()}
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[60vh] py-4">
      <AnimatePresence mode="wait">
        {isLoadingLandmarks ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 space-y-8 text-center"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-serif font-bold text-foreground">
                {loadingMode === 'manual'
                  ? 'Organizando seu roteiro...'
                  : loadingMode === 'quick'
                    ? 'Buscando locais para sua viagem...'
                    : 'Montando seu roteiro...'}
              </h2>
              <p className="text-lg text-muted-foreground font-medium animate-pulse">
                {loadingMode === 'manual'
                  ? 'Separando os locais que voce ja informou.'
                  : loadingMode === 'quick'
                    ? 'Combinando pontos citados com sugestoes relacionadas.'
                    : 'Selecionando paradas com ritmo de familia.'}
              </p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-8 text-center max-w-lg mx-auto bg-card dark:bg-slate-800 p-10 rounded-3xl shadow-sm border border-border"
          >
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-3">Ops! Tivemos um imprevisto</h2>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
              <Button onClick={goBack} variant="outline" className="flex-1 rounded-full py-6 text-lg">
                <ArrowLeft className="w-5 h-5 mr-2" /> Editar destino
              </Button>
              <Button
                onClick={() => {
                  if (loadingMode === 'manual') {
                    processManualAttractions();
                  } else {
                    processAttractions({
                      mode: loadingMode === 'quick' ? 'quick' : 'itinerary',
                      allowManualFallback: loadingMode === 'quick',
                    });
                  }
                }}
                className="flex-1 rounded-full py-6 text-lg bg-primary hover:bg-primary/90 text-white"
              >
                <RefreshCcw className="w-5 h-5 mr-2" /> Tentar novamente
              </Button>
            </div>
          </motion.div>
        ) : !hasSearchedLandmarks ? (
          <motion.div
            key="preparing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 space-y-4 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground">
              Preparando os cards...
            </h2>
          </motion.div>
        ) : hasSearchedLandmarks && parsedData.landmarks.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-10"
          >
            <div className="text-center space-y-3 mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                {itineraryMode
                  ? 'Roteiro sugerido para a sua familia'
                  : manualMode
                    ? 'Seu roteiro informado'
                    : 'Locais encontrados para sua viagem'}
              </h2>
              <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
                {itineraryMode
                  ? recommendedItinerary.summary
                  : manualMode
                    ? 'Organizamos os pontos que voce ja citou. Selecione os locais que farao parte do guia da sua familia.'
                    : 'Inclui pontos que voce citou e sugestoes baseadas no seu texto. Selecione o que entra no guia.'}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <Button onClick={goBack} variant="outline" className="rounded-full px-6 py-3">
                  Editar destino
                </Button>
                <Button
                  onClick={() => {
                    setError(null);
                    setShowPreferenceSetup(true);
                  }}
                  className="rounded-full px-6 py-3 bg-secondary hover:bg-secondary/90 text-white"
                >
                  Sugerir roteiro com dias e categorias
                </Button>
              </div>
            </div>

            {itineraryMode
              ? renderItineraryDays()
              : manualMode
                ? renderManualGroups()
                : renderQuickSuggestionCards()}

            <div className="flex justify-center pt-16 pb-8 sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent z-10">
              <Button
                onClick={nextStep}
                disabled={selectedLandmarks.length === 0}
                className="rounded-full px-12 py-8 bg-primary hover:bg-primary/90 text-white font-bold text-xl shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Confirmar {selectedCount} {selectedCount === 1 ? 'local' : 'locais'} <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        ) : hasSearchedLandmarks ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Nenhum ponto especifico encontrado</h2>
            <p className="text-lg text-muted-foreground font-medium mb-8 max-w-md mx-auto">
              Nao conseguimos extrair monumentos exatos do seu texto. Deseja adicionar mais detalhes?
            </p>
            <Button onClick={goBack} variant="outline" className="rounded-full px-8 py-6 text-lg">
              <ArrowLeft className="w-5 h-5 mr-2" /> Editar destino
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default Step4Attractions;
