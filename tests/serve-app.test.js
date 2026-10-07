const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createAppServer } = require('../scripts/serve_app');

test('local preview survives malformed URLs and denies encoded traversal outside each asset root', async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (path) => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: server.address().port, path }, (response) => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  assert.equal(await request('/%ZZ'), 400);
  assert.equal(await request('/%00'), 400);
  assert.equal(await request('/source/..%2fpackage.json'), 403);
  assert.equal(await request('/media/private-reference/..%5c..%5c..%5cpackage.json'), 403);
  assert.equal(await request('/..%2fdist-other%2fsecret.json'), 403);
  assert.equal(await request('/missing-image.jpg'), 404);
});
