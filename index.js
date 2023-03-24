const fs = require('fs')

const unmoddedPlayerPath = process.argv[2];
const modPath = process.argv[3];
const moddedPlayerPath = process.argv[4];
let unmoddedPlayer;
fs.readFile(unmoddedPlayerPath, (error, f) => {
	if (error) {
		return console.error(error);
	}
	unmoddedPlayer = f.toString();
	let mod;
	fs.readFile(modPath, (error, f) => {
		if (error) {
			return console.error(error);
		}
		mod = f.toString();
		fs.readFile("modder.js", (error, data) => {
			if (error) {
				console.error(error);
			}
			fs.writeFile(moddedPlayerPath,unmoddedPlayer+data+mod,error => {
				if (error) {
					return console.error(error);
				}
			});
		});
	});
});