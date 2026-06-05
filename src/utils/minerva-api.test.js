import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendGuideLandmarks,
  buildLandmarkMapsUrl,
  inferCatalogDestinationIds,
  mapParsedLandmarksToParsedData,
  mapRecommendationToParsedData,
  splitQuickSuggestionLandmarks,
} from './minerva-api.js';

const catalog = {
  destinations: [
    {
      id: 'paris',
      city: 'Paris',
      country: 'Franca',
      landmarks: [],
    },
    {
      id: 'lisbon',
      city: 'Lisboa',
      country: 'Portugal',
      landmarks: [],
    },
    {
      id: 'london',
      city: 'Londres',
      country: 'Inglaterra',
      landmarks: [],
    },
    {
      id: 'cambridge',
      city: 'Cambridge',
      country: 'Inglaterra',
      landmarks: [],
    },
  ],
};

test('inferCatalogDestinationIds detects catalog cities in free text', () => {
  const ids = inferCatalogDestinationIds(
    'Vamos visitar Lisboa e depois Paris com as crianças.',
    catalog,
  );

  assert.deepEqual(ids, ['paris', 'lisbon']);
});

test('inferCatalogDestinationIds only matches country when it maps to one catalog destination', () => {
  assert.deepEqual(inferCatalogDestinationIds('Queremos ir para Portugal.', catalog), ['lisbon']);
  assert.deepEqual(inferCatalogDestinationIds('Queremos ir para Inglaterra.', catalog), []);
});

test('mapRecommendationToParsedData keeps day metadata and alternatives editable', () => {
  const data = mapRecommendationToParsedData(
    {
      selected_landmarks: ['lisbon:oceanario'],
      days: [
        {
          day: 1,
          title: 'Dia 1 em Lisboa',
          destination_ids: ['lisbon'],
          stops: [
            {
              selection_id: 'lisbon:oceanario',
              destination_id: 'lisbon',
              name: 'Oceanario',
              city: 'Lisboa',
              country: 'Portugal',
              description: ['Um aquario gigante.'],
              image: 'assets/oceanario.png',
              duration_minutes: 120,
              family_tip: 'Otimo para curiosos por animais.',
              match_reasons: ['Interesse da familia: animais.'],
              categories: ['animals'],
            },
          ],
        },
      ],
      alternatives: [
        {
          selection_id: 'lisbon:yellow-tram',
          destination_id: 'lisbon',
          name: 'Eletrico amarelo',
          city: 'Lisboa',
          country: 'Portugal',
          description: ['Um bondinho famoso.'],
          image: 'assets/tram.png',
          duration_minutes: 45,
          family_tip: 'Transforma deslocamento em passeio.',
          match_reasons: ['Bom ponto para apresentar a cidade as criancas.'],
          categories: ['rides'],
        },
      ],
    },
    catalog,
  );

  assert.deepEqual(data.selectedLandmarks, ['lisbon:oceanario']);
  assert.deepEqual(data.destinations, [{ id: 'lisbon', city: 'Lisboa', country: 'Portugal' }]);
  assert.equal(data.landmarks[0].id, 'lisbon:oceanario');
  assert.equal(data.landmarks[0].itinerary_day, 1);
  assert.equal(data.landmarks[0].is_catalog_landmark, true);
  assert.equal(data.landmarks[1].id, 'lisbon:yellow-tram');
  assert.equal(data.landmarks[1].is_alternative, true);
});

test('mapRecommendationToParsedData treats Google Places stops as custom landmarks', () => {
  const data = mapRecommendationToParsedData(
    {
      recommendation_source: 'google_places',
      selected_landmarks: ['google:abc123'],
      days: [
        {
          day: 1,
          title: 'Dia 1 em Roma',
          destination_ids: ['google-roma'],
          stops: [
            {
              selection_id: 'google:abc123',
              destination_id: 'google-roma',
              name: 'Coliseu',
              city: 'Roma',
              country: 'Italia',
              description: ['Um anfiteatro historico.'],
              image: null,
              image_attributions: [
                {
                  display_name: 'Maria Fotografa',
                  uri: 'https://example.com/maria',
                },
              ],
              google_maps_uri: 'https://maps.google.com/?cid=abc123',
              formatted_address: 'Piazza del Colosseo, Roma',
              duration_minutes: 90,
              family_tip: 'Procure os arcos gigantes.',
              match_reasons: ['Interesse da familia: historia.'],
              categories: ['history'],
            },
          ],
        },
      ],
      alternatives: [],
    },
    catalog,
  );

  assert.deepEqual(data.destinations, [{ id: 'google-roma', city: 'Roma', country: 'Italia' }]);
  assert.equal(data.landmarks[0].id, 'google:abc123');
  assert.equal(data.landmarks[0].is_catalog_landmark, false);
  assert.equal(data.landmarks[0].google_maps_uri, 'https://maps.google.com/?cid=abc123');
  assert.equal(data.landmarks[0].maps_url, 'https://maps.google.com/?cid=abc123');
  assert.deepEqual(data.landmarks[0].image_attributions, [
    {
      display_name: 'Maria Fotografa',
      uri: 'https://example.com/maria',
    },
  ]);
});

test('buildLandmarkMapsUrl falls back to a Google Maps search query', () => {
  assert.equal(
    buildLandmarkMapsUrl({
      name: 'Torre Eiffel',
      city: 'Paris',
      country: 'Franca',
    }),
    'https://www.google.com/maps/search/?api=1&query=Torre%20Eiffel%20Paris%20Franca',
  );
});

test('mapParsedLandmarksToParsedData flattens manual landmarks without itinerary suggestions', () => {
  const data = mapParsedLandmarksToParsedData({
    selected_landmarks: ['custom-paris:torre-eiffel', 'custom-paris:louvre'],
    destinations: [
      {
        id: 'custom-paris',
        city: 'Paris',
        country: 'Franca',
        landmarks: [
          {
            id: 'torre-eiffel',
            selection_id: 'custom-paris:torre-eiffel',
            name: 'Torre Eiffel',
            description: ['Visita ja planejada pela familia.'],
            confidence: 0.94,
          },
          {
            id: 'louvre',
            selection_id: 'custom-paris:louvre',
            name: 'Louvre',
            description: ['Museu citado no roteiro.'],
            confidence: 0.88,
          },
        ],
      },
    ],
  });

  assert.deepEqual(data.destinations, [{ id: 'custom-paris', city: 'Paris', country: 'Franca' }]);
  assert.deepEqual(data.selectedLandmarks, ['custom-paris:torre-eiffel', 'custom-paris:louvre']);
  assert.equal(data.landmarks[0].id, 'custom-paris:torre-eiffel');
  assert.equal(data.landmarks[0].destination_id, 'custom-paris');
  assert.equal(data.landmarks[0].is_catalog_landmark, false);
  assert.equal(data.landmarks[0].itinerary_day, null);
  assert.equal(data.landmarks[0].description, 'Visita ja planejada pela familia.');
  assert.equal(
    data.landmarks[0].maps_url,
    'https://www.google.com/maps/search/?api=1&query=Torre%20Eiffel%20Paris%20Franca',
  );
});

test('splitQuickSuggestionLandmarks separates primary cards from alternatives', () => {
  const sections = splitQuickSuggestionLandmarks([
    { id: 'primary-1', is_alternative: false },
    { id: 'alternative-1', is_alternative: true },
    { id: 'primary-2' },
  ]);

  assert.deepEqual(sections.primary.map((item) => item.id), ['primary-1', 'primary-2']);
  assert.deepEqual(sections.alternatives.map((item) => item.id), ['alternative-1']);
});

test('appendGuideLandmarks sends catalog ids and custom fallback separately', () => {
  const formData = new FormData();

  appendGuideLandmarks(formData, {
    landmarks: [
      {
        id: 'lisbon:oceanario',
        is_catalog_landmark: true,
        name: 'Oceanario',
        city: 'Lisboa',
        country: 'Portugal',
      },
      {
        id: 'custom-rome:colosseum',
        is_catalog_landmark: false,
        name: 'Colosseum',
        city: 'Rome',
        country: 'Italy',
      },
    ],
  });

  assert.deepEqual(formData.getAll('selected_landmarks'), ['lisbon:oceanario']);
  assert.equal(
    formData.get('custom_landmarks'),
    JSON.stringify([
      {
        name: 'Colosseum',
        city: 'Rome',
        country: 'Italy',
        description: [],
      },
    ]),
  );
});
