const fs = require('fs');

const unmoddedPlayerPath = process.argv[2];
const moddedPlayerPath = process.argv[3];
if (!unmoddedPlayerPath || !moddedPlayerPath) {{
	return console.error("Usage: node index.js path-to-unmodded-player path-for-modded-player-to-go [paths-to-mod.js-files]");
}}
const modPaths = [];
for (let i = 4; i < process.argv.length; i++) {
	const path = process.argv[i];
	modPaths.push(path);
}

function extractFunction(string,startIndex) {
	const result = {};
	// Find parameter names. Does not work for functions without ( before parameters.
	//     `e => {}` and similar will not work, but I don't think there are any like that
	//     that I actually need to extract.
	let startedToFindParameterNames = false;
	let index;
	for (index = startIndex; index-startIndex<"function(".length; index++) {
		const c = string[index];
		if (c == "(") {
			startedToFindParameterNames = true;
			break;
		}
	}
	if (!startedToFindParameterNames)
		throw `Could not find parameter names for function at ${startIndex}`;
	const parameterNames = [];
	let currentParameterName = "";
	while(index++) {
		const c = string[index];
		if (c == "," || c == ")") {
			parameterNames.push(currentParameterName);
			currentParameterName = "";
			if (c == ",")
				continue;
			break;
		}
		currentParameterName+=c;
	}
	result.parameterNames = parameterNames;
	//Find function body
	for (;string[index] != "{";index++) {}
	result.bodyStartIndex = index;
	let unclosedPairsOfCurlyBraces = 1;
	let body = ""
	for (; unclosedPairsOfCurlyBraces > 0; index++) {
		const c = string[index];
		if (c == "{") {
			unclosedPairsOfCurlyBraces++;
		} else if (c == "}") {
			unclosedPairsOfCurlyBraces--;
		}
		body += c;
	}
	result.body = body;
	result.bodyEndIndex = index;
	return result;
}

function replaceHSExecutableExecuteBlock(unmoddedPlayer) {
	const regex = /[a-z]\.prototype\.executeBlock=function\([a-z],[a-z]\)/g
	let hasFoundMatch = false;
	while (match = regex.exec(unmoddedPlayer)) {
		if (hasFoundMatch)
			throw "Found multiple matches for executeBlock when trying to modify HSExecutable.prototype.executeBlock"
		hasFoundMatch = true;
		const oldExecuteBlocks = extractFunction(unmoddedPlayer,match.index+"e.prototype.executeBlock=".length);
		const newBody = oldExecuteBlocks.body
			.replace(/default:([^}]+)/,`default:executeModdedMethod((t)=>{$1},${oldExecuteBlocks.parameterNames[0]},${oldExecuteBlocks.parameterNames[1]});`)
			.replace(/.\.HS/g,"HS");
		return unmoddedPlayer.substr(0,oldExecuteBlocks.bodyStartIndex)+newBody+unmoddedPlayer.substr(oldExecuteBlocks.bodyEndIndex,unmoddedPlayer.length);
	}
	if (!hasFoundMatch) {
		throw "Could not find HSExecutable.prototype.executeBlock";
	}
}

function applyModOrWriteFile(moddedPlayer,amountOfModsApplied) {
	if (modPaths.length > amountOfModsApplied) {
		fs.readFile(modPaths[amountOfModsApplied],(error, f) => {
			if (error)
				throw error;
			applyModOrWriteFile(moddedPlayer+"\n/*mod*/\n"+f.toString(),amountOfModsApplied+1);
		});
	} else {
		fs.writeFile(moddedPlayerPath,moddedPlayer, error => {
			if (error) {
				throw error;
			}
		})
	}
}
let unmoddedPlayer;
fs.readFile(unmoddedPlayerPath, (error, f) => {
	if (error) {
		return console.error(error);
	}
	unmoddedPlayer = f.toString();
	fs.readFile("premod.js", (error, f) => {
		if (error)
			return console.error(error);
		let moddedPlayer = f.toString();
		moddedPlayer += "\n"+replaceHSExecutableExecuteBlock(unmoddedPlayer);
		applyModOrWriteFile(moddedPlayer,0);
	});
});