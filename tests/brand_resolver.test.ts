import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { BRAND_CONFIG } from '../src/brand/config.js';
import { resolveFontPaths } from '../src/brand/resolver.js';

test('Brand Config: default values are correctly initialized', () => {
  assert.strictEqual(BRAND_CONFIG.identity.name, 'findiacs');
  assert.strictEqual(BRAND_CONFIG.colors.primary, '#0F172A');
});

test('Font Resolver: returns valid descriptors when fonts exist', () => {
  const fonts = resolveFontPaths();
  
  assert.ok(fonts.Roboto);
  assert.ok(fonts[BRAND_CONFIG.fonts.header]);
  assert.ok(fonts[BRAND_CONFIG.fonts.body]);
  
  // Verify paths are absolute
  assert.ok(path.isAbsolute(fonts.Roboto.normal));
  assert.ok(fonts.Roboto.normal.includes('node_modules'));
});

test('Font Resolver: falls back to Roboto if premium fonts are missing', () => {
  // Temporarily rename assets/fonts
  const originalPath = path.join(process.cwd(), 'assets/fonts');
  const tempPath = path.join(process.cwd(), 'assets/fonts_temp');
  
  if (fs.existsSync(originalPath)) {
    fs.renameSync(originalPath, tempPath);
  }
  
  try {
    const fonts = resolveFontPaths();
    // In fallback mode, RoyalSerif.normal should point to Roboto-Medium.ttf (or similar)
    assert.ok(fonts[BRAND_CONFIG.fonts.header].normal.includes('Roboto-Medium.ttf'));
    assert.ok(fonts[BRAND_CONFIG.fonts.body].normal.includes('Roboto-Regular.ttf'));
  } finally {
    // Restore
    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, originalPath);
    }
  }
});
