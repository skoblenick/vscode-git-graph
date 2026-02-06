const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const MEDIA_DIRECTORY = './media';
const STYLES_DIRECTORY = './web/styles';

const MAIN_CSS_FILE = 'main.css';
const MAIN_JS_FILE = 'main.js';
const UTILS_JS_FILE = 'utils.js';

const OUTPUT_MIN_CSS_FILE = 'out.min.css';
const OUTPUT_MIN_JS_FILE = 'out.min.js';

const DEBUG = process.argv.includes('debug');

let packageJsFiles = [path.join(MEDIA_DIRECTORY, UTILS_JS_FILE)];
fs.readdirSync(MEDIA_DIRECTORY).forEach((fileName) => {
	if (fileName.endsWith('.js') && fileName !== OUTPUT_MIN_JS_FILE && fileName !== UTILS_JS_FILE && fileName !== MAIN_JS_FILE) {
		packageJsFiles.push(path.join(MEDIA_DIRECTORY, fileName));
	}
});
packageJsFiles.push(path.join(MEDIA_DIRECTORY, MAIN_JS_FILE));

let packageCssFiles = [path.join(STYLES_DIRECTORY, MAIN_CSS_FILE)];
fs.readdirSync(STYLES_DIRECTORY).forEach((fileName) => {
	if (fileName.endsWith('.css') && fileName !== MAIN_CSS_FILE) {
		packageCssFiles.push(path.join(STYLES_DIRECTORY, fileName));
	}
});

console.log('Packaging Mode = ' + (DEBUG ? 'DEBUG' : 'PRODUCTION'));
console.log('Packaging CSS files: ' + packageCssFiles.join(', '));
console.log('Packaging JS files: ' + packageJsFiles.join(', '));

async function build() {
	let jsFileContents = '';
	packageJsFiles.forEach((fileName) => {
		jsFileContents += fs.readFileSync(fileName).toString().replace('"use strict";\r\n', '') + '\r\n';
		fs.unlinkSync(fileName);
	});
	const wrappedJs = '"use strict";\r\n(function(document, window){\r\n' + jsFileContents + '})(document, window);\r\n';

	if (DEBUG) {
		fs.writeFileSync(path.join(MEDIA_DIRECTORY, OUTPUT_MIN_JS_FILE), wrappedJs);
	} else {
		const result = await esbuild.transform(wrappedJs, {
			minify: true,
			target: 'es2015',
			loader: 'js',
		});
		fs.writeFileSync(path.join(MEDIA_DIRECTORY, OUTPUT_MIN_JS_FILE), result.code);
	}

	let cssFileContents = '';
	packageCssFiles.forEach((fileName) => {
		let contents = fs.readFileSync(fileName).toString();
		if (DEBUG) {
			cssFileContents += contents + '\r\n';
		} else {
			let lines = contents.split(/\r\n|\r|\n/g);
			for (let j = 0; j < lines.length; j++) {
				if (lines[j].startsWith('\t')) lines[j] = lines[j].substring(1);
			}
			let j = 0;
			while (j < lines.length) {
				if (lines[j].startsWith('/*') && lines[j].endsWith('*/')) {
					lines.splice(j, 1);
				} else {
					j++;
				}
			}
			cssFileContents += lines.join('');
		}
	});
	fs.writeFileSync(path.join(MEDIA_DIRECTORY, OUTPUT_MIN_CSS_FILE), cssFileContents);

	fs.readdirSync(MEDIA_DIRECTORY).forEach((fileName) => {
		if (fileName.endsWith('.js') && fileName !== OUTPUT_MIN_JS_FILE) {
			fs.unlinkSync(path.join(MEDIA_DIRECTORY, fileName));
		}
	});
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
