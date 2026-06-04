import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthClient, createMemoryStorage } from './authClient.js';

test('createAuthClient uses local auth when no PocketBase URL is configured', async () => {
  const storage = createMemoryStorage();
  const authClient = createAuthClient({ pocketBaseUrl: '', storage });
  const changes = [];

  const unsubscribe = authClient.subscribe((user) => {
    changes.push(user);
  });

  assert.equal(authClient.isValid, false);
  assert.equal(authClient.model, null);

  const signup = await authClient.signup('mae@example.com', 'Senha123', 'Mae');

  assert.deepEqual(signup, { success: true });
  assert.equal(authClient.isValid, false);
  assert.equal(storage.getItem('minerva_local_users').includes('Senha123'), false);

  const login = await authClient.login('mae@example.com', 'Senha123');

  assert.equal(login.success, true);
  assert.equal(authClient.isValid, true);
  assert.equal(authClient.model.email, 'mae@example.com');
  assert.equal(authClient.model.name, 'Mae');
  assert.equal(changes.at(-1).email, 'mae@example.com');

  authClient.logout();

  assert.equal(authClient.isValid, false);
  assert.equal(authClient.model, null);
  assert.equal(changes.at(-1), null);

  unsubscribe();
});

test('local auth rejects an unknown user', async () => {
  const storage = createMemoryStorage();
  const authClient = createAuthClient({ pocketBaseUrl: '', storage });

  const login = await authClient.login('mae@example.com', 'Senha123');

  assert.equal(login.success, false);
  assert.match(login.error, /credenciais/i);
  assert.equal(authClient.isValid, false);
});

test('createAuthClient uses Supabase auth when Supabase variables are configured', async () => {
  const calls = [];
  const signedInUser = {
    id: 'user-123',
    email: 'mae@example.com',
    user_metadata: { name: 'Mae' },
  };
  const supabaseClient = {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: (listener) => {
        calls.push(['onAuthStateChange']);
        supabaseClient.emitAuthChange = listener;

        return {
          data: {
            subscription: {
              unsubscribe: () => calls.push(['unsubscribe']),
            },
          },
        };
      },
      signInWithPassword: async (credentials) => {
        calls.push(['signInWithPassword', credentials]);

        return {
          data: {
            session: { user: signedInUser },
            user: signedInUser,
          },
          error: null,
        };
      },
      signUp: async (payload) => {
        calls.push(['signUp', payload]);

        return {
          data: { user: signedInUser },
          error: null,
        };
      },
      signOut: async () => {
        calls.push(['signOut']);

        return { error: null };
      },
    },
  };
  const authClient = createAuthClient({
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
    createSupabaseClient: (url, key) => {
      calls.push(['createSupabaseClient', url, key]);
      return supabaseClient;
    },
  });
  const changes = [];
  const unsubscribe = authClient.subscribe((user) => {
    changes.push(user);
  });

  await authClient.initialize();

  assert.deepEqual(calls[0], [
    'createSupabaseClient',
    'https://project.supabase.co',
    'sb_publishable_test',
  ]);
  assert.equal(authClient.isValid, false);

  const signup = await authClient.signup('mae@example.com', 'Senha123', 'Mae');
  const login = await authClient.login('mae@example.com', 'Senha123');

  assert.equal(signup.success, true);
  assert.equal(login.success, true);
  assert.equal(authClient.isValid, true);
  assert.equal(authClient.model.email, 'mae@example.com');
  assert.equal(authClient.model.name, 'Mae');
  assert.deepEqual(calls.find((call) => call[0] === 'signUp')[1], {
    email: 'mae@example.com',
    password: 'Senha123',
    options: { data: { name: 'Mae' } },
  });
  assert.deepEqual(calls.find((call) => call[0] === 'signInWithPassword')[1], {
    email: 'mae@example.com',
    password: 'Senha123',
  });

  await authClient.logout();

  assert.equal(authClient.isValid, false);
  assert.equal(authClient.model, null);
  assert.equal(changes.at(-1), null);

  unsubscribe();
  assert.equal(calls.some((call) => call[0] === 'unsubscribe'), true);
});

test('createAuthClient can read Supabase config from runtime config file', () => {
  const originalConfig = globalThis.__MINERVA_CONFIG__;
  const calls = [];

  globalThis.__MINERVA_CONFIG__ = {
    VITE_SUPABASE_URL: 'https://runtime.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_runtime',
  };

  createAuthClient({
    createSupabaseClient: (url, key) => {
      calls.push([url, key]);

      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
      };
    },
  });

  assert.deepEqual(calls, [['https://runtime.supabase.co', 'sb_publishable_runtime']]);

  if (originalConfig === undefined) {
    delete globalThis.__MINERVA_CONFIG__;
  } else {
    globalThis.__MINERVA_CONFIG__ = originalConfig;
  }
});
