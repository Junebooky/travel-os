import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { COUNTRIES } from '../src/data/countries';

describe('Country Picker Modal Contract (Issue #15 & PR #11)', () => {
  it('CP-01: COUNTRIES dataset contains the exact 8 countries in reference order', () => {
    const expectedOrder = ['JP', 'US', 'FR', 'TW', 'TH', 'VN', 'GB', 'IT'];
    const actualOrder = COUNTRIES.map((c) => c.code);

    assert.strictEqual(COUNTRIES.length, 8, 'Must have exactly 8 countries');
    assert.deepStrictEqual(actualOrder, expectedOrder, 'Countries must match reference order exactly');
  });

  it('CP-02: Every country has valid name, flag, language, and currency', () => {
    COUNTRIES.forEach((c) => {
      assert.ok(c.code && typeof c.code === 'string', `Invalid code: ${c.code}`);
      assert.ok(c.name && typeof c.name === 'string', `Invalid name for ${c.code}`);
      assert.ok(c.defaultLang && typeof c.defaultLang === 'string', `Invalid lang for ${c.code}`);
      assert.ok(c.defaultCurrency && typeof c.defaultCurrency === 'string', `Invalid currency for ${c.code}`);
      assert.ok(c.defaultCenter && typeof c.defaultCenter.lat === 'number', `Invalid lat for ${c.code}`);
      assert.ok(c.defaultCenter && typeof c.defaultCenter.lng === 'number', `Invalid lng for ${c.code}`);
    });
  });

  it('CP-03: Zero F2F4F6 occurrences in CountryPickerModal and CountryFlagSphere', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/CountryPickerModal.tsx');
    const spherePath = path.resolve(process.cwd(), 'src/components/CountryFlagSphere.tsx');

    const modalContent = fs.readFileSync(modalPath, 'utf8');
    const sphereContent = fs.readFileSync(spherePath, 'utf8');

    assert.strictEqual(modalContent.includes('#F2F4F6'), false, 'CountryPickerModal must not contain #F2F4F6');
    assert.strictEqual(modalContent.includes('#f2f4f6'), false, 'CountryPickerModal must not contain #f2f4f6');
    assert.strictEqual(sphereContent.includes('#F2F4F6'), false, 'CountryFlagSphere must not contain #F2F4F6');
    assert.strictEqual(sphereContent.includes('#f2f4f6'), false, 'CountryFlagSphere must not contain #f2f4f6');
  });

  it('CP-04: CountryPickerModal static accessibility contract', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/CountryPickerModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.ok(content.includes('role="dialog"'), 'Must have role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'Must have aria-modal="true"');
    assert.ok(content.includes('aria-labelledby="country-picker-title"'), 'Must connect title with aria-labelledby');
    assert.ok(content.includes('aria-describedby="country-picker-desc"'), 'Must connect desc with aria-describedby');
    assert.ok(content.includes('Escape'), 'Must support Escape dismissal');
    assert.ok(content.includes('aria-pressed'), 'Must indicate selected state with aria-pressed');
    assert.ok(content.includes('min-h-[52px]'), 'Close CTA must have minimum 52px height');
  });

  it('CP-05: SettingsView replaces inline modal with CountryPickerModal', () => {
    const settingsPath = path.resolve(process.cwd(), 'src/components/SettingsView.tsx');
    const content = fs.readFileSync(settingsPath, 'utf8');

    assert.ok(content.includes('CountryPickerModal'), 'SettingsView must import and render CountryPickerModal');
    assert.strictEqual(content.includes('max-w-sm w-full space-y-3 shadow-2xl animate-in zoom-in-95 max-h-[80vh]'), false, 'Old modal must be completely removed');
  });
});
