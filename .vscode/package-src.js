const fs = require('fs');
const path = require('path');

const SRC_DIRECTORY = './src';
const OUT_DIRECTORY = './out';
const ASKPASS_DIRECTORY = 'askpass';

// Copy the askpass shell scripts to the output directory
fs.readdirSync(path.join(SRC_DIRECTORY, ASKPASS_DIRECTORY)).forEach((fileName) => {
	if (fileName.endsWith('.sh')) {
		// If the file is a shell script, read its contents and write it to the output directory
		const scriptContents = fs.readFileSync(path.join(SRC_DIRECTORY, ASKPASS_DIRECTORY, fileName)).toString();
		fs.writeFileSync(path.join(OUT_DIRECTORY, ASKPASS_DIRECTORY, fileName), scriptContents);
	}
});
