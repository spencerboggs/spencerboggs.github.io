// Builds the /pc-check pages and their .bat downloads.
// Usage: node pc-check/_engine/build.mjs
// Each .bat embeds a gzipped copy of engine.ps1 with its profile.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outDir = path.join(root, 'pc-check');
const enginePath = path.join(here, 'engine.ps1');

const PLATFORMS = {
  am3: {
    id: 'am3',
    name: 'AM3',
    long: 'AM3 / AM3+',
    sockets: ['AM3', 'AM3+'],
    chipsets: ['760G', '770', '780G', '785G', '790GX', '880G', '890GX', '890FX', '870', '970', '990X', '990FX', 'A78', 'A88X', 'A68H'],
    cpuVendor: 'AMD',
    cpuW: 125,
    cpuLine: 'Phenom II or FX at the base clock Windows reports',
    cpuNote: '125 W FX parts are limited by the board VRM before the cooler; a 4+1 phase board will throttle them.',
    ramGens: ['DDR3'],
    ramTarget: 1866,
    ramMinGB: 8,
    ramLine: 'DDR3-1600 or 1866, both channels populated',
    ramNote: 'FX runs DDR3-1866 with two sticks. Four sticks usually drop to 1600, and one stick halves the bandwidth.',
    pcieLine: 'PCIe 2.0 x16 from the CPU',
    pcieNote: 'A current card works in a 2.0 x16 slot but is link-limited. That is the platform, not a fault.',
    boardLine: '700 / 800 / 900-series chipset',
    storageNvme: 900,
    storageSata: 500,
    storageHdd: 120,
    storageLine: 'SATA SSD near 500 MB/s, or a hard drive near 120 MB/s',
    storageNote: 'Most AM3 boards cannot boot from NVMe. Any NVMe result here is a PCIe add-in card.',
    psuRec: 550,
    biosNote: 'AM3 boards have not had BIOS updates in years; the date is informational.',
    tempLine: 'CPU under 50 C idle, under 85 C after load',
  },
  am4: {
    id: 'am4',
    name: 'AM4',
    long: 'AM4 (Ryzen 1000-5000)',
    sockets: ['AM4'],
    chipsets: ['A320', 'B350', 'X370', 'B450', 'X470', 'A520', 'B550', 'X570', 'TRX40'],
    cpuVendor: 'AMD',
    cpuW: 105,
    cpuLine: 'Ryzen at its base clock, boost allowed',
    cpuNote: 'All-core boost depends on the cooler and the board power limits (PPT, TDC, EDC). A 65 W part and a 105 W part do not hold the same clock.',
    ramGens: ['DDR4'],
    ramTarget: 3200,
    ramMinGB: 16,
    ramLine: 'DDR4-3200, two channels, 16 GB or more',
    ramNote: 'DDR4-3200 is the usual target. 3600 needs a 500-series board and a 3000 or 5000 chip; above that the memory controller runs out of ratio.',
    pcieLine: 'PCIe 4.0 x16 on 500-series with a Ryzen 3000/5000, otherwise 3.0 x16',
    pcieNote: 'Generation follows the board and CPU. Width matters more: x8 cuts a few percent, x4 cuts much more.',
    boardLine: '300 / 400 / 500-series chipset',
    storageNvme: 3500,
    storageSata: 500,
    storageHdd: 120,
    storageLine: 'NVMe near 3,500 MB/s (Gen3) or 5,000 MB/s (Gen4), SATA SSD near 500 MB/s',
    storageNote: 'A Gen4 drive in a Gen3 slot is expected to read at Gen3 speed. That is a slot limit, not a drive fault.',
    psuRec: 650,
    biosNote: 'AGESA updates matter on AM4 for memory compatibility. Compare the BIOS date with the vendor page.',
    tempLine: 'CPU under 50 C idle, under 85 C after load',
  },
  am5: {
    id: 'am5',
    name: 'AM5',
    long: 'AM5 (Ryzen 7000-9000)',
    sockets: ['AM5'],
    chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E', 'B840', 'B850', 'X870', 'X870E'],
    cpuVendor: 'AMD',
    cpuW: 120,
    cpuLine: 'Ryzen at its base clock, boost until the temperature or package limit',
    cpuNote: 'Ryzen 7000 and 9000 boost until they hit the thermal or package-power limit. All-core clocks sit below the single-core boost number by design.',
    ramGens: ['DDR5'],
    ramTarget: 6000,
    ramMinGB: 32,
    ramLine: 'DDR5-6000, two channels, 32 GB or more',
    ramNote: 'DDR5-6000 CL30 is the default target for Ryzen 7000 and 9000. Above 6400 the memory controller usually leaves its 1:1 ratio.',
    pcieLine: 'PCIe 5.0 x16 from the CPU',
    pcieNote: 'A Gen4 card at Gen4 is correct. Look at width first, then at whether the slot is wired for x16.',
    boardLine: '600 / 800-series chipset',
    storageNvme: 5000,
    storageSata: 500,
    storageHdd: 120,
    storageLine: 'NVMe near 5,000 MB/s (Gen4) or 9,000 MB/s (Gen5), SATA SSD near 500 MB/s',
    storageNote: 'Only one M.2 slot is usually wired to the CPU. The second slot may run at half width through the chipset.',
    psuRec: 750,
    biosNote: 'AM5 BIOS updates carry AGESA memory training fixes. Compare the date with the vendor page.',
    tempLine: 'CPU under 50 C idle, under 85 C after load',
  },
  lga: {
    id: 'lga',
    name: 'LGA 1700 / 1851',
    long: 'Intel LGA 1700 / LGA 1851',
    sockets: ['LGA1700', 'LGA1851', 'LGA17', 'LGA18'],
    chipsets: ['Z690', 'B660', 'H610', 'Z790', 'B760', 'H770', 'Z890', 'B860', 'H810', 'W680', 'W790'],
    cpuVendor: 'Intel',
    cpuW: 150,
    cpuLine: 'Intel 12th-17th gen at its base clock, boost allowed',
    cpuNote: 'Non-K chips and B/H boards hold a lower all-core clock. A board with a low PL1 behaves the same way, and that is not a fault.',
    ramGens: ['DDR4', 'DDR5'],
    ramTarget: 6000,
    ramTargets: { DDR4: 3200, DDR5: 6000 },
    ramMinGB: 16,
    ramLine: 'DDR4-3200 or DDR5-6000, two channels, 16 GB or more',
    ramNote: 'LGA 1700 boards take one or the other, never both. LGA 1851 is DDR5 only. Four sticks on 12th-14th gen usually drop a step.',
    pcieLine: 'PCIe 5.0 x16 on Z-series, Gen4 on most B/H boards',
    pcieNote: 'Many 600/700-series boards split the x16 slot when a second M.2 is populated. Check the manual before blaming the card.',
    boardLine: '600 / 700 / 800-series chipset',
    storageNvme: 5000,
    storageSata: 500,
    storageHdd: 120,
    storageLine: 'NVMe near 5,000 MB/s (Gen4) or 9,000 MB/s (Gen5), SATA SSD near 500 MB/s',
    storageNote: 'The primary M.2 slot is usually CPU-attached; the rest share chipset or PCIe lanes.',
    psuRec: 750,
    biosNote: 'Intel microcode updates change power behaviour and stability. Compare the date with the vendor page.',
    tempLine: 'CPU under 50 C idle, under 85 C after load',
  },
};

const GPUS = {
  amd: {
    id: 'amd',
    short: 'AMD',
    label: 'AMD Radeon',
    powerW: 300,
    line: 'AMD Radeon card at full width, power limit at the card default',
    check: 'PCIe width and generation from Windows, driver date, display mode. Clocks and power limits need Adrenalin; Windows does not expose them.',
    sensor: 'No command-line sensor source. Clocks, power limits and temperature are left to Adrenalin.',
  },
  nvidia: {
    id: 'nvidia',
    short: 'NVIDIA',
    label: 'NVIDIA GeForce',
    powerW: 320,
    line: 'NVIDIA card at full width, power limit at the vBIOS default',
    check: 'PCIe width and generation, power limit against the card default, clocks, VRAM use, temperature, driver date and refresh rate (nvidia-smi).',
    sensor: 'nvidia-smi supplies clocks, power limit and temperature.',
  },
  intel: {
    id: 'intel',
    short: 'Intel',
    label: 'Intel Arc',
    powerW: 225,
    line: 'Intel Arc card at full width with Resizable BAR enabled',
    check: 'PCIe width and generation, driver date, display mode. Clocks, power and temperature need Arc Control.',
    sensor: 'No command-line sensor source. Arc Control shows clocks and power.',
  },
};

const COMBOS = [];
for (const p of Object.values(PLATFORMS)) {
  for (const g of Object.values(GPUS)) {
    COMBOS.push({ platform: p, gpu: g, slug: `${p.id}-${g.id}` });
  }
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Peak estimate: parts plus 60 W of board and drives, then 35% headroom.
function psuFor(p, g) {
  const peak = p.cpuW + g.powerW + 60;
  return Math.max(p.psuRec, Math.ceil((peak * 1.35) / 50) * 50);
}

const themeToggle = `<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch color theme" title="Switch color theme">
  <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"></path></svg>
  <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5Z"></path></svg>
</button>`;

const brand = `<a class="brand" href="/apps">
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"></rect><rect x="9.5" y="9.5" width="5" height="5" rx="0.8"></rect><path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"></path></svg>
  <span>Hardware check</span>
  <small>pc-check</small>
</a>`;

function head(title, description, canonical, cssPath = '/assets/pc-check.css') {
  return `<!DOCTYPE html>
<html lang="en" data-theme-mode="dark" data-theme-palette="azure">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${escapeHtml(description)}">
<meta name="color-scheme" content="dark light">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="canonical" href="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Idiqlat:wght@200;300;400&display=swap" rel="stylesheet">
<script src="/assets/theme.js"></script>
<link rel="stylesheet" href="${cssPath}">
<title>${escapeHtml(title)}</title>
</head>`;
}

function header(crumb) {
  return `<header class="site-header">
  <div class="container header-inner">
    ${brand}
    <div class="header-actions">
      <span class="crumb">${crumb}</span>
      <a class="btn btn-sm btn-ghost" href="/pc-check">All checks</a>
      ${themeToggle}
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <p>Spencer Boggs / pc-check</p>
    <div class="footer-links">
      <a href="/apps">Apps</a>
      <a href="/pc-check">All checks</a>
      <a href="/">Portfolio</a>
    </div>
  </div>
</footer>`;
}

function pageShell({ title, description, canonical, crumb, body }) {
  return `${head(title, description, canonical)}
<body class="hc-page">
${header(crumb)}
<main>
${body}
</main>
${footer()}
</body>
</html>
`;
}

function downloadBand(combo, batName, sizeKb) {
  const { platform, gpu, slug } = combo;
  return `<section class="container download-band" aria-labelledby="download-heading">
  <div class="download-copy">
    <p class="kicker">Windows script / ${sizeKb} KB</p>
    <h2 id="download-heading">Download and run</h2>
    <p>Double-click the file. It reads the machine, runs a short all-core load and a 192 MB disk test, writes a report to the Desktop and opens it. About twenty seconds.</p>
  </div>
  <ul class="download-points">
    <li>No installer. Windows PowerShell 5.1, already on Windows 10 and 11.</li>
    <li>Read-only: no settings, clocks or power limits are changed.</li>
    <li>Report saved as <code>pc-check-${slug}-YYYYMMDD-HHMM.txt</code></li>
    <li>Administrator rights only add thermal-zone readings.</li>
  </ul>
  <div class="download-card">
    <span class="download-file">${batName}</span>
    <a class="btn btn-primary btn-lg btn-block" href="/pc-check/scripts/${batName}" download>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"></path></svg>
      Download .bat
    </a>
    <a class="download-release" href="/pc-check">Other platforms and GPUs</a>
    <p class="download-meta">${platform.name} + ${gpu.label}<br>Windows 10 / 11, 64-bit</p>
  </div>
</section>`;
}

function comboPage(combo, batName, sizeKb) {
  const { platform: p, gpu: g, slug } = combo;
  const ramTarget = p.ramTargets ? p.ramTargets.DDR5 : p.ramTarget;
  const ramTargetLine = p.ramTargets
    ? `DDR4-${p.ramTargets.DDR4} / DDR5-${p.ramTargets.DDR5}`
    : `${p.ramGens[0]}-${p.ramTarget}`;
  const notice = p.id === 'am3' && g.id === 'intel'
    ? `<section class="container warnbox">
        <p><strong>Arc on AM3 is not a working combination.</strong> Arc depends on Resizable BAR and above-4G decoding, and AM3 boards expose neither. The script still runs and will report what it finds.</p>
      </section>`
    : p.id === 'am4' && g.id === 'intel'
      ? `<section class="container warnbox">
          <p><strong>Arc needs Resizable BAR on AM4.</strong> Turn on Resizable BAR and above-4G decoding on a 400 or 500-series board; without them the card falls back to a slower path.</p>
        </section>`
      : '';

  const rows = [
    ['CPU', p.cpuLine, `All-core load for about five seconds, frequency sampled from <code>% Processor Performance</code>. Socket, vendor, power-plan CPU cap and memory integrity come from Windows.`],
    ['Memory', p.ramLine, `Configured speed per stick, channel labels, total capacity, module part numbers. Target for this build: ${ramTargetLine}.`],
    ['Graphics', `${g.line}, ${p.pcieLine}`, g.check],
    ['Motherboard', p.boardLine, `Board and BIOS identity, socket mismatch, chipset family, BIOS age. ${p.biosNote}`],
    ['Power supply', `About ${p.cpuW} W CPU, ${g.powerW} W GPU, so ${psuFor(p, g)} W and up`, `Not readable in software. The script estimates peak draw and the 12 V current it implies, then leaves the label check to you.`],
    ['Storage', p.storageLine, `192 MB sequential write, then an uncached read on the system drive. Drive health, free space and TRIM are read from Windows.`],
    ['Thermals', p.tempLine, `ACPI thermal zones before and after the load test${g.id === 'nvidia' ? ', GPU temperature from nvidia-smi' : '; the GPU needs its vendor app'}. Thermal zones need administrator rights.`],
  ];

  const tableRows = rows.map(([a, b, c]) => `      <tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`).join('\n');

  const body = `<section class="hero">
  <div class="container hero-inner">
    <div>
      <p class="kicker">Hardware check / ${p.name.toLowerCase()} + ${g.id}</p>
      <h1>${p.name} <span class="slash">/</span> ${g.short} <em>baseline</em></h1>
      <p class="hero-lede">Reads this PC and compares the sustained CPU clock, memory speed, PCIe link, storage throughput and idle temperatures with the rates this platform should hold. Ends with the most likely software-side limiter.</p>
      <ul class="hero-tags">
        <li>Windows 10 / 11</li>
        <li>PowerShell 5.1</li>
        <li>Read-only</li>
        <li>~20 seconds</li>
      </ul>
    </div>
    <div class="hero-side">
      <div class="hero-fact">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"></rect><path d="M8 20h8M12 16v4"></path></svg>
        <p><b>Reads</b>CPU and board, memory sticks, GPU and display mode, drives, power plan.</p>
      </div>
      <div class="hero-fact">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"></path></svg>
        <p><b>Leaves alone</b>No settings, clocks, overclocks or fan curves are touched.</p>
      </div>
    </div>
  </div>
</section>

${downloadBand(combo, batName, sizeKb)}
${notice}
<div class="container hc-body">
  <section class="panel" aria-labelledby="compares">
    <header class="panel-head">
      <div>
        <p class="kicker">01. Comparison</p>
        <h2 id="compares">What this script compares</h2>
        <p>The baseline is this platform at its rated rates, not a general benchmark score.</p>
      </div>
    </header>
    <div class="panel-body">
      <div class="matrix-wrap">
      <table class="spec">
        <thead><tr><th scope="col">Part</th><th scope="col">Baseline for this build</th><th scope="col">How it is checked</th></tr></thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="panel" aria-labelledby="result">
    <header class="panel-head">
      <div>
        <p class="kicker">02. Result</p>
        <h2 id="result">How to read the output</h2>
        <p>Each line is one measured value against the baseline above.</p>
      </div>
    </header>
    <div class="panel-body">
      <ul class="legend">
        <li><span class="pill pass">PASS</span>At or above the baseline.</li>
        <li><span class="pill warn">WARN</span>Working, but below what the platform should hold.</li>
        <li><span class="pill fail">FAIL</span>Clearly outside the baseline, or the wrong part for this script.</li>
        <li><span class="pill skip">SKIP</span>Windows did not expose it, or it needs administrator rights or a vendor tool.</li>
      </ul>
      <p class="panel-copy">The summary names the first failure, or the first warning if nothing failed, and lists up to three. Order is CPU, memory, graphics, board, power, storage, thermals. If everything passes, that line says so and there is nothing further to chase.</p>
    </div>
  </section>

  <section class="panel" aria-labelledby="limits">
    <header class="panel-head">
      <div>
        <p class="kicker">03. Limits</p>
        <h2 id="limits">What it cannot tell you</h2>
      </div>
    </header>
    <div class="panel-body">
      <ul class="limits">
        <li><strong>PSU model and wattage.</strong> No Windows API exposes it. The script prints the draw it expects and the 12 V current, and you compare that with the label.</li>
        <li><strong>Temperatures on AMD and Intel GPUs.</strong> There is no command-line sensor source. ${g.sensor}</li>
        <li><strong>Other drives.</strong> Every disk is listed, but only the system drive is benchmarked.</li>
        <li><strong>Random I/O.</strong> The disk test is sequential. Boot time and game loads depend more on random reads.</li>
        <li><strong>Laptop power limits.</strong> Battery, vendor profiles and MUX switches change the numbers; the script reads whatever Windows reports at that moment.</li>
        <li><strong>Overclocks and undervolts.</strong> It reports what the machine is set to, not whether that setting is stable.</li>
      </ul>
    </div>
  </section>
</div>`;

  return pageShell({
    title: `${p.name} + ${g.short} hardware check | Spencer Boggs`,
    description: `Download a Windows script that checks a ${p.name} and ${g.label} build against its rated CPU clock, memory speed, PCIe link, storage throughput and idle temperatures.`,
    canonical: `https://spencerboggs.github.io/pc-check/${slug}/`,
    crumb: `${p.id} / ${g.id}`,
    body,
  });
}

function hubPage() {
  const rows = Object.values(PLATFORMS).map((p) => {
    const cells = Object.values(GPUS).map((g) => {
      const slug = `${p.id}-${g.id}`;
      return `<td><a class="matrix-link" href="/pc-check/${slug}"><span>${g.label}</span><small>${p.name} + ${g.short}</small></a></td>`;
    }).join('');
    return `<tr><th scope="row"><span>${p.name}</span><small>${p.ramGens.join(' / ')}</small></th>${cells}</tr>`;
  }).join('\n');

  const checks = [
    ['CPU clock', 'Rated base clock, sustained clock under an all-core load, power-plan CPU cap, memory integrity.'],
    ['Memory', 'Configured speed against the platform target, channel count, capacity, module identity.'],
    ['PCIe link', 'Width and generation the card actually trained at, plus the card default power limit on NVIDIA.'],
    ['Display', 'Current refresh rate against the maximum the adapter reports.'],
    ['Storage', 'Sequential write and uncached read on the system drive, against the speed of its class.'],
    ['Power and heat', 'Peak draw estimate, idle ACPI thermal zones and post-load temperature.'],
  ];

  const cards = checks.map(([t, d]) => `<div class="check-card"><h3>${t}</h3><p>${d}</p></div>`).join('\n');

  const body = `<section class="hero">
  <div class="container hero-inner">
    <div>
      <p class="kicker">PC scripts / 12 builds</p>
      <h1>Hardware checks <em>against rated rates.</em></h1>
      <p class="hero-lede">One script per platform and GPU vendor. Each reads the machine, compares the parts with the rates that build should hold, and names the most likely software-side limiter. No install, no changes.</p>
      <ul class="hero-tags">
        <li>12 combinations</li>
        <li>Windows 10 / 11</li>
        <li>Read-only</li>
        <li>Report to Desktop</li>
      </ul>
    </div>
    <div class="hero-side">
      <div class="hero-fact">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"></rect><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"></path></svg>
        <p><b>Per platform</b>AM3, AM4, AM5, LGA 1700 and 1851, each with the memory generation and PCIe generation it actually uses.</p>
      </div>
      <div class="hero-fact">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 19V5M4 19h16"></path><path d="m7 15 4-5 3 3 5-7"></path></svg>
        <p><b>Per GPU</b>NVIDIA reads clocks, power limit and temperature through nvidia-smi. AMD and Intel get link and display checks only.</p>
      </div>
    </div>
  </div>
</section>

<section class="container hc-body">
  <section class="panel" aria-labelledby="pick">
    <header class="panel-head">
      <div>
        <p class="kicker">01. Pick a script</p>
        <h2 id="pick">Socket on the left, GPU across the top</h2>
        <p>Each file is a single download and self-contained; nothing else is fetched at run time.</p>
      </div>
    </header>
    <div class="panel-body">
      <div class="matrix-wrap">
        <table class="matrix">
          <thead><tr><th scope="col">Platform</th><th scope="col">AMD Radeon</th><th scope="col">NVIDIA GeForce</th><th scope="col">Intel Arc</th></tr></thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
      <p class="panel-copy">Not sure which one? Every script checks the socket, chipset and GPU vendor first and reports a mismatch instead of guessing. Downloading the AM5 + NVIDIA file on an AM4 board tells you so on the first line.</p>
    </div>
  </section>

  <section class="panel" aria-labelledby="what">
    <header class="panel-head">
      <div>
        <p class="kicker">02. Coverage</p>
        <h2 id="what">What every script compares</h2>
      </div>
    </header>
    <div class="panel-body">
      <div class="check-grid">
${cards}
      </div>
    </div>
  </section>

  <section class="panel" aria-labelledby="reading">
    <header class="panel-head">
      <div>
        <p class="kicker">03. Reading it</p>
        <h2 id="reading">One summary line, then the detail</h2>
      </div>
    </header>
    <div class="panel-body">
      <ul class="legend">
        <li><span class="pill pass">PASS</span>At or above the baseline for this platform.</li>
        <li><span class="pill warn">WARN</span>Working, but below what the setup should hold.</li>
        <li><span class="pill fail">FAIL</span>Outside the baseline, or the wrong part for the script.</li>
        <li><span class="pill skip">SKIP</span>Not exposed by Windows, or needs administrator rights or a vendor tool.</li>
      </ul>
      <p class="panel-copy">The console ends with a likely limiter and up to three findings, and the same text is written to a report on the Desktop. A build that passes every row is running at the rates its parts were sold at; a failing row names the subsystem to look at before buying anything.</p>
      <ul class="limits">
        <li><strong>PSU wattage is not readable.</strong> Only the label has it. The script prints the peak draw it expects.</li>
        <li><strong>Thermal zones need administrator rights.</strong> Without them, CPU temperatures are skipped, not guessed.</li>
        <li><strong>AMD and Intel GPU sensors are not exposed.</strong> Use Adrenalin or Arc Control for clocks and power limits.</li>
        <li><strong>Only the system drive is benchmarked.</strong> Other drives are listed but not tested.</li>
      </ul>
    </div>
  </section>
</section>`;

  return pageShell({
    title: 'PC hardware checks | Spencer Boggs',
    description: 'Downloadable Windows scripts that compare a PC against its platform rated CPU clock, memory speed, PCIe link, storage throughput and idle temperatures.',
    canonical: 'https://spencerboggs.github.io/pc-check/',
    crumb: 'all builds',
    body,
  });
}

function makeBat(name, payload, slug) {
  const b64 = zlib.gzipSync(Buffer.from(payload, 'utf8'), { level: 9 }).toString('base64');
  const chunks = b64.match(/.{1,1600}/g) || [];
  const fileName = `hc-${slug}.b64`;
  const lines = [
    '@echo off',
    'setlocal',
    `title Hardware check - ${name}`,
    'echo.',
    `echo   Hardware baseline check - ${name}`,
    'echo   Reads this PC, compares it with the platform baseline, writes a report.',
    'echo.',
    `set "HCPAYLOAD=%TEMP%\\${fileName}"`,
    `> "%HCPAYLOAD%" (`,
    ...chunks.map((c) => `echo ${c}`),
    ')',
    'if not exist "%HCPAYLOAD%" goto :failed',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Join-Path $env:TEMP \'' + fileName + '\'; $b=(Get-Content -Raw $p) -replace \'\\s\',\'\'; $m=New-Object IO.MemoryStream(,[Convert]::FromBase64String($b)); $g=New-Object IO.Compression.GZipStream($m,[IO.Compression.CompressionMode]::Decompress); $r=New-Object IO.StreamReader($g,[Text.Encoding]::UTF8); $c=$r.ReadToEnd(); $r.Dispose(); & ([scriptblock]::Create($c))"',
    'set "HCCODE=%ERRORLEVEL%"',
    'del "%HCPAYLOAD%" >nul 2>nul',
    'if not "%HCCODE%"=="0" goto :failed',
    'echo.',
    'echo   Done. Press any key to close.',
    'pause >nul',
    'exit /b 0',
    ':failed',
    'echo.',
    'echo   The check did not finish. Close any security prompt and run it again.',
    'pause >nul',
    'exit /b 1',
    '',
  ];
  return lines.join('\r\n');
}

const engine = fs.readFileSync(enginePath, 'utf8');
if (!engine.includes('__PROFILE_JSON__')) throw new Error('engine.ps1 is missing its profile placeholder');

fs.mkdirSync(path.join(outDir, 'scripts'), { recursive: true });

for (const combo of COMBOS) {
  const { platform: p, gpu: g, slug } = combo;
  const profile = {
    slug,
    platform: p.name,
    platformLong: p.long,
    gpuLabel: g.label,
    gpuVendor: g.id === 'nvidia' ? 'NVIDIA' : g.id === 'amd' ? 'AMD' : 'Intel',
    cpuVendor: p.cpuVendor,
    sockets: p.sockets,
    chipsets: p.chipsets,
    ramGens: p.ramGens,
    ramTarget: p.ramTarget,
    ramTargets: p.ramTargets,
    ramMinGB: p.ramMinGB,
    ramChannels: 2,
    pcie: p.pcieLine,
    cpuW: p.cpuW,
    gpuW: g.powerW,
    psuRec: p.psuRec,
    storageNvme: p.storageNvme,
    storageSata: p.storageSata,
    storageHdd: p.storageHdd,
  };
  const payload = engine.replace('__PROFILE_JSON__', JSON.stringify(profile, null, 0));
  const batName = `check-${slug}.bat`;
  const bat = makeBat(`${p.name} + ${g.short}`, payload, slug);
  const batPath = path.join(outDir, 'scripts', batName);
  fs.writeFileSync(batPath, bat, 'utf8');
  const kb = Math.max(1, Math.round(Buffer.byteLength(bat, 'utf8') / 1024));

  const pageDir = path.join(outDir, slug);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, 'index.html'), comboPage(combo, batName, kb), 'utf8');
  console.log(`${batName}  ${kb} KB  ->  /pc-check/${slug}/`);
}

fs.writeFileSync(path.join(outDir, 'index.html'), hubPage(), 'utf8');
console.log('hub -> /pc-check/');
