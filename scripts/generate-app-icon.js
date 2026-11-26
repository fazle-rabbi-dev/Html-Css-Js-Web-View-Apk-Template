#!/usr/bin/env node
/**
 * Generate the launcher PNGs for this APK from a single source image.
 *
 *   bun scripts/generate-app-icon.js                 # uses ./icon.png
 *   bun scripts/generate-app-icon.js design/generated/icon.png
 *   bun scripts/generate-app-icon.js icon.png --inset 0.667 --bg "#0A0D0C"
 *   bun scripts/generate-app-icon.js icon.png --play-store
 *
 * Output (overwritten):
 *   res/mipmap-mdpi/ic_launcher.png      48 x 48
 *   res/mipmap-hdpi/ic_launcher.png      72 x 72
 *   res/mipmap-xhdpi/ic_launcher.png     96 x 96
 *   res/mipmap-xxhdpi/ic_launcher.png   144 x 144
 *   res/mipmap-xxxhdpi/ic_launcher.png  192 x 192
 *   playstore-icon.png                  512 x 512   (only with --play-store)
 *
 * Notes
 * - These are the legacy / toast bitmaps. The API 26+ icon is still the
 *   adaptive vector pair (`res/mipmap-anydpi-v26/ic_launcher.xml` +
 *   `res/drawable/ic_launcher_foreground.xml`), generated separately.
 * - `--inset` pads the art inside the canvas, e.g. `0.667` = art scaled to
 *   72/108 of the canvas so it lines up with the adaptive safe zone.
 * - `--bg` fills that padding with a flat colour; without it padding stays
 *   transparent.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');

const DENSITIES = [
	['mdpi', 48],
	['hdpi', 72],
	['xhdpi', 96],
	['xxhdpi', 144],
	['xxxhdpi', 192],
];

function loadSharp() {
	const candidates = [
		'sharp',
		path.join(os.homedir(), '.bun', 'install', 'global', 'node_modules', 'sharp'),
		process.env.BUN_INSTALL &&
			path.join(process.env.BUN_INSTALL, 'install', 'global', 'node_modules', 'sharp'),
	].filter(Boolean);

	for (const candidate of candidates) {
		try {
			return require(candidate);
		} catch {
			/* try next */
		}
	}

	console.error(
		'[icon] sharp not found.\n' +
			'       Install it with: bun add -g sharp\n' +
			'       (searched local node_modules and the bun global prefix)',
	);
	process.exit(1);
}

function parseArgs(argv) {
	const opts = {
		input: null,
		inset: 0,
		bg: null,
		playStore: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--inset') opts.inset = Number(argv[++i]);
		else if (arg === '--bg') opts.bg = argv[++i];
		else if (arg === '--play-store') opts.playStore = true;
		else if (arg === '-h' || arg === '--help') {
			console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`[icon] unknown option: ${arg}`);
			process.exit(1);
		} else opts.input = arg;
	}

	if (!Number.isFinite(opts.inset) || opts.inset < 0 || opts.inset >= 1) {
		console.error('[icon] --inset must be a number in [0, 1)');
		process.exit(1);
	}

	return opts;
}

/** Render one square icon. */
async function render(sharp, source, size, opts) {
	const content = Math.max(1, Math.round(size * (1 - opts.inset)));

	let art = await sharp(source)
		.resize(content, content, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png()
		.toBuffer();

	if (content === size) return sharp(art).png().toBuffer();

	const left = Math.floor((size - content) / 2);
	const top = Math.floor((size - content) / 2);
	const background = opts.bg
		? sharp({ create: { width: size, height: size, channels: 4, background: opts.bg } })
		: sharp({
				create: {
					width: size,
					height: size,
					channels: 4,
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				},
			});

	return background
		.composite([{ input: art, left, top }])
		.png()
		.toBuffer();
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const source = path.resolve(ROOT, opts.input || 'icon.png');

	if (!fs.existsSync(source)) {
		console.error(`[icon] source image not found: ${source}`);
		process.exit(1);
	}

	const sharp = loadSharp();
	const meta = await sharp(source).metadata();
	console.log(`[icon] source: ${path.relative(ROOT, source)} (${meta.width}x${meta.height})`);

	for (const [density, size] of DENSITIES) {
		const dir = path.join(ROOT, 'res', `mipmap-${density}`);
		fs.mkdirSync(dir, { recursive: true });
		const out = path.join(dir, 'ic_launcher.png');
		fs.writeFileSync(out, await render(sharp, source, size, opts));
		console.log(`[icon] ${path.relative(ROOT, out)} (${size}x${size})`);
	}

	if (opts.playStore) {
		const out = path.join(ROOT, 'playstore-icon.png');
		fs.writeFileSync(out, await render(sharp, source, 512, opts));
		console.log(`[icon] ${path.relative(ROOT, out)} (512x512)`);
	}

	console.log('[icon] done. Keep res/drawable/ic_launcher_foreground.xml in sync.');
}

main().catch((err) => {
	console.error('[icon] failed:', err.message);
	process.exit(1);
});
