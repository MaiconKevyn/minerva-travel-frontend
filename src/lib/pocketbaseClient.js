import PocketBase from 'pocketbase';

const createDisabledPocketBaseClient = () => ({
  authStore: {
    model: null,
    isValid: false,
    onChange: () => () => {},
    clear: () => {},
  },
  collection: () => ({
    getFullList: async () => [],
  }),
});

const pocketBaseUrl = import.meta.env?.VITE_POCKETBASE_URL;
const pocketbaseClient = pocketBaseUrl ? new PocketBase(pocketBaseUrl) : createDisabledPocketBaseClient();

export default pocketbaseClient;

export { pocketbaseClient };
