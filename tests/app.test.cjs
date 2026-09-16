const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

test('built app exactly matches source', () => {
  const shell = fs.readFileSync(path.join(root, 'source/shell.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'source/app.js'), 'utf8');
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), shell.replace('__APP_SCRIPT__', script));
});

test('synthetic annotation and archive workflows', { timeout: 120000 }, async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'neshane-test-'));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 300;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 600, 300);
      const im = { id: 'one', name: 'synthetic.png', width: 600, height: 300, dataUrl: canvas.toDataURL(), entries: [
        { id: 'd', type: 'deception', text: 'Synthetic deception' },
        { id: 'h', type: 'hint', text: 'Synthetic answer hint' },
        { id: 'o', type: 'perception', text: 'Synthetic observation' },
        { id: 'm', type: 'mask', text: 'Synthetic manual mask' }
      ], boxes: [
        { id: 'd1', entryId: 'd', x: 20, y: 40, width: 60, height: 80 },
        { id: 'd2', entryId: 'd', x: 100, y: 40, width: 60, height: 80 },
        { id: 'h1', entryId: 'h', x: 200, y: 40, width: 60, height: 80 },
        { id: 'o1', entryId: 'o', x: 300, y: 40, width: 60, height: 80 },
        { id: 'm1', entryId: 'm', x: 400, y: 40, width: 60, height: 80 }
      ] };
      replaceData({ schemaVersion: 1, customMetadata: 'synthetic only', images: [im, { ...clone(im), id: 'two', name: 'blank.png', boxes: [] }] });
      mark();
    });
    const session = await page.evaluate(() => clone(data));
    const pixels = await page.evaluate(async () => {
      const source = await standaloneSource(), result = {};
      for (const variant of datasetVariants) {
        const files = await revisedFiles(variant, source, false), blob = files.get('images/0001-synthetic.png');
        const url = URL.createObjectURL(blob), pic = await loadImage(url), canvas = document.createElement('canvas');
        canvas.width = pic.width; canvas.height = pic.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(pic, 0, 0);
        const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
        result[variant] = { d: pixel(20, 80), inside: pixel(50, 80), second: pixel(130, 80), h: pixel(203, 40), o: pixel(300, 80), m: pixel(430, 80), blankUnchanged: await blobHash(files.get('images/0002-blank.png')) === await blobHash(source.fileMap.get('images/0002-blank.png')) };
        URL.revokeObjectURL(url);
      }
      return result;
    });
    const white = [255, 255, 255, 255], violet = [124, 58, 237, 255];
    for (const value of Object.values(pixels)) { assert.equal(value.blankUnchanged, true); assert.deepEqual(value.o, white); assert.deepEqual(value.m, white); }
    assert.deepEqual(pixels.hints_only.d, white);
    assert.deepEqual(pixels.hints_only.h, [21, 173, 92, 255]);
    assert.deepEqual(pixels.deceptions_only.d, [255, 53, 78, 255]);
    assert.deepEqual(pixels.deceptions_only.h, white);
    assert.deepEqual(pixels.deceptions_masked.inside, violet);
    assert.deepEqual(pixels.deceptions_masked.second, violet);
    assert.deepEqual(pixels.deceptions_masked.h, white);
    assert.equal(await page.locator('#overlay text').count(), 0);
    const downloadEvent = page.waitForEvent('download'); await page.click('#variantsExport');
    const archive = path.join(temp, 'variants.zip'); await (await downloadEvent).saveAs(archive);
    await page.waitForFunction(() => !busy);
    execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert sum("/images/" in n and not "_neshane/" in n for n in z.namelist()) == 6', archive]);
    await page.locator('#zip').setInputFiles(archive); await page.waitForFunction(() => !busy);
    assert.equal(await page.evaluate(() => data.images.length), 2);
    assert.deepEqual(await page.evaluate(() => current().entries), session.images[0].entries);
    assert.deepEqual(await page.evaluate(() => current().boxes), session.images[0].boxes);
    assert.equal(await page.evaluate(() => data.source.session.customMetadata), 'synthetic only');
    const stable = await page.evaluate(async () => {
      const files = await revisedFiles('hints_only', null, false);
      return await blobHash(files.get(current().path)) === await blobHash(sourceFiles.get(current().path));
    });
    assert.equal(stable, true);

    // Each fixture is generated in memory from a synthetic image and generic text.
    for (const layout of ['records', 'json', 'manifest', 'combined']) {
      const bytes = await page.evaluate(async layout => {
        const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 100, 100);
        const record = { problem_type: 'synthetic', website_solution: null, deceptions: ['Synthetic misleading detail'], visual_perceptions: ['Synthetic visible detail'], custom: { retain: true } };
        const files = new Map([['images/example.png', dataUrlBlob(canvas.toDataURL())]]);
        if (layout === 'manifest') {
          files.set('dataset.json', JSON.stringify([record]));
          files.set('manifest.json', JSON.stringify([{ record_index: 0, id: 'synthetic', image_filename: 'example.png' }]));
        } else if (layout === 'combined') {
          files.set('json/example.json', JSON.stringify(record));
          files.set('all_224_annotations.json', JSON.stringify([{ index: 1, image: 'images/example.png', json: 'json/example.json', annotation: record, annotation_basis: 'synthetic' }]));
          files.set('manifest.json', JSON.stringify({ synthetic: true }));
        } else files.set(layout + '/example.json', JSON.stringify(record));
        return [...new Uint8Array(await (await makeZip(files)).arrayBuffer())];
      }, layout);
      await page.locator('#zip').setInputFiles({ name: layout + '.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
      await page.waitForFunction(() => !busy);
      assert.equal(await page.evaluate(() => data.images.length), 1);
      assert.equal(await page.locator('.entry.deception').count(), 1);
      assert.equal(await page.locator('.entry.perception').count(), 1);
      assert.equal(await page.locator('.entry.hint').count(), 0);
      assert.equal(await page.evaluate(() => data.source.records[0].custom.retain), true);
      const before = await page.evaluate(() => JSON.stringify(data));
      const bad = await page.evaluate(async () => [...new Uint8Array(await (await makeZip(new Map([['records/missing.json', JSON.stringify({ deceptions: [], visual_perceptions: [] })]]))).arrayBuffer())]);
      await page.locator('#zip').setInputFiles({ name: 'missing.zip', mimeType: 'application/zip', buffer: Buffer.from(bad) });
      await page.waitForFunction(() => !busy);
      assert.equal(await page.locator('#status').getAttribute('class'), 'error');
      assert.equal(await page.evaluate(() => JSON.stringify(data)), before);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close(); fs.rmSync(temp, { recursive: true, force: true });
  }
});
