import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const GLOBALS_CSS = path.join(SRC_DIR, 'app', 'globals.css');

test('Animated Welcome & Mint Rebrand Contract Suite', async (t) => {
  await t.test('WMR-01: AnimatedWelcome component exists and matches Korean reference design specs', () => {
    const welcomePath = path.join(COMPONENTS_DIR, 'AnimatedWelcome.tsx');
    assert.ok(fs.existsSync(welcomePath), 'AnimatedWelcome.tsx must exist');

    const content = fs.readFileSync(welcomePath, 'utf-8');

    // Mascot capybara
    assert.ok(content.includes('welcome_capybara.png'), 'References capybara mascot asset');

    // Branding: TRAVEL OS with smile curve
    assert.ok(content.includes('TRAVEL'), 'Contains TRAVEL brand text');
    assert.ok(content.includes('OS'), 'Contains OS brand text');

    // Korean Headline and subhead
    assert.ok(content.includes('여행 준비'), 'Contains 여행 준비 headline');
    assert.ok(content.includes('여기서 끝내요'), 'Contains 여기서 끝내요 headline');
    assert.ok(content.includes('Jalnan') || content.includes('Tmon'), 'Headline applies Jalnan / Tmon display font');
    assert.ok(content.includes('나라만 고르면'), 'Contains 나라만 고르면 subhead');
    assert.ok(content.includes('바로 시작할 수 있어요'), 'Contains 바로 시작할 수 있어요 subhead');

    // Country selection card
    assert.ok(content.includes('여행할 나라'), 'Contains 여행할 나라 label');
    assert.ok(content.includes('CountryFlagIcon'), 'Renders CountryFlagIcon');
    assert.ok(content.includes('변경'), 'Contains 변경 button');
    assert.ok(content.includes('CountryPickerModal'), 'Wires CountryPickerModal');

    // Primary bottom CTA
    assert.ok(content.includes('여행 시작하기'), 'Contains 여행 시작하기 CTA');

    // Floating 3D isometric cubes and mascot roaming
    assert.ok(content.includes('IsometricCube'), 'Renders 3D isometric cubes');
    assert.ok(content.includes('welcome-float'), 'Uses welcome-float animation classes');
    assert.ok(content.includes('capybara-roam'), 'Uses capybara-roam animation class for background motion');
  });

  await t.test('WMR-02: CSS design tokens and float animations in globals.css', () => {
    assert.ok(fs.existsSync(GLOBALS_CSS), 'globals.css must exist');
    const css = fs.readFileSync(GLOBALS_CSS, 'utf-8');

    // Korean display typography fonts
    assert.ok(css.includes("font-family: 'Tmon'"), 'globals.css declares @font-face for Tmon');
    assert.ok(css.includes("font-family: 'Jalnan'"), 'globals.css declares @font-face for Jalnan');

    // Mint design tokens
    assert.ok(css.includes('--os-brand: #087F8C;'), 'Contains --os-brand token');
    assert.ok(css.includes('--os-brand-hover: #066B77;'), 'Contains --os-brand-hover token');
    assert.ok(css.includes('--os-welcome-scene: #13C2D6;'), 'Contains --os-welcome-scene token');

    // GPU-friendly float and roam keyframes
    assert.ok(css.includes('@keyframes floatSlow'), 'Contains floatSlow keyframes');
    assert.ok(css.includes('.welcome-float'), 'Contains .welcome-float class');
    assert.ok(css.includes('@keyframes capybaraRoam'), 'Contains capybaraRoam keyframes');
    assert.ok(css.includes('.capybara-roam'), 'Contains .capybara-roam class');

    // Accessibility: prefers-reduced-motion
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Contains prefers-reduced-motion media query');
    assert.ok(css.includes('animation: none !important;'), 'Disables animation when reduced motion preferred');
  });

  await t.test('WMR-03: Zero legacy blue tokens (#1B64DA, #1554B8, #1652B5) in src/', () => {
    const legacyBlueRegex = /#(1B64DA|1554B8|1652B5)/i;
    const filesToCheck: string[] = [];

    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (/\.(tsx?|css)$/.test(entry.name)) {
          filesToCheck.push(fullPath);
        }
      }
    }

    walkDir(SRC_DIR);

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(ROOT_DIR, file);
      assert.strictEqual(
        legacyBlueRegex.test(content),
        false,
        `File ${relPath} must not contain legacy blue tokens (#1B64DA, #1554B8, #1652B5)`
      );
    }
  });

  await t.test('WMR-04: Zero washed-out #F2F4F6 background in components', () => {
    const componentFiles = fs.readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.tsx'));
    for (const file of componentFiles) {
      const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf-8');
      assert.strictEqual(
        content.includes('#F2F4F6'),
        false,
        `${file} must maintain pure white canvas and avoid #F2F4F6`
      );
    }
  });

  await t.test('WMR-05: TravelApp integrates AnimatedWelcome stage without altering 5-tab shell', () => {
    const travelAppPath = path.join(COMPONENTS_DIR, 'TravelApp.tsx');
    const content = fs.readFileSync(travelAppPath, 'utf-8');

    // Welcome component imported and conditionally rendered
    assert.ok(content.includes('AnimatedWelcome'), 'TravelApp imports AnimatedWelcome');
    assert.ok(content.includes('welcomeDismissed'), 'TravelApp manages welcome state');

    // Navigation retains 5 tabs
    const navPath = path.join(COMPONENTS_DIR, 'Navigation.tsx');
    const navContent = fs.readFileSync(navPath, 'utf-8');
    assert.ok(navContent.includes("'map'"), 'Navigation has map tab');
    assert.ok(navContent.includes("'translate'"), 'Navigation has translate tab');
    assert.ok(navContent.includes("'currency'"), 'Navigation has currency tab');
    assert.ok(navContent.includes("'wallet'"), 'Navigation has wallet tab');
    assert.ok(navContent.includes("'settings'"), 'Navigation has settings tab');

    // Active tab uses mint
    assert.ok(navContent.includes('#087F8C'), 'Navigation active tab uses mint #087F8C');
  });
});
