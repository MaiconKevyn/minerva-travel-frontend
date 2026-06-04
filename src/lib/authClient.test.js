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
