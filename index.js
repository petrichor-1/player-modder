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

function regexForMethod(name,parameterCount) {
	let regexString = `[a-z]\\.prototype\\.${name}=function\\(`;
	for (let i = 0; i < parameterCount; i++) {
		regexString += "[a-z]" + (i<parameterCount-1 ? "," : "");
	}
	regexString += "\\)";
	return new RegExp(regexString,"g");
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
	const regex = regexForMethod("executeBlock",2);
	let hasFoundMatch = false;
	while (match = regex.exec(unmoddedPlayer)) {
		if (hasFoundMatch)
			throw "Found multiple matches for executeBlock when trying to modify HSExecutable.prototype.executeBlock"
		hasFoundMatch = true;
		const oldExecuteBlocks = extractFunction(unmoddedPlayer,match.index+"e.prototype.executeBlock=".length);
		const newBody = oldExecuteBlocks.body
			.replace(/default:([^}]+)/,`default:executeModdedMethod((${oldExecuteBlocks.parameterNames[1]})=>{$1},${oldExecuteBlocks.parameterNames[0]},${oldExecuteBlocks.parameterNames[1]});`)
			.replace(/.\.HS/g,"HS");
		return unmoddedPlayer.substr(0,oldExecuteBlocks.bodyStartIndex)+newBody+unmoddedPlayer.substr(oldExecuteBlocks.bodyEndIndex,unmoddedPlayer.length);
	}
	if (!hasFoundMatch) {
		throw "Could not find HSExecutable.prototype.executeBlock";
	}
}

function replaceHSMathCalculatorComputedValue(unmoddedPlayer) {
	const regex = regexForMethod("computedValue",2);
	let hasFoundMatch = false;
	while (match = regex.exec(unmoddedPlayer)) {
		if (hasFoundMatch)
			throw "Found multiple matches for computedValue when trying to modify HSMathCalculator.prototype.computedValue"
		hasFoundMatch = true;
		const oldComputedValue = extractFunction(unmoddedPlayer,match.index+"e.prototype.computedValue=".length);
		//TODO: I think the first thing computedValue does is parse the
		//      parameters as numbers. Should those values be used?
		const newBody = oldComputedValue.body
			.replace(/default:([^}]+)/,`default:return executeModdedParameter(()=>{$1},${oldComputedValue.parameterNames[0]},${oldComputedValue.parameterNames[1]});`)
			.replace(/.\.HS/g,"HS");
		return unmoddedPlayer.substr(0,oldComputedValue.bodyStartIndex)+newBody+unmoddedPlayer.substr(oldComputedValue.bodyEndIndex,unmoddedPlayer.length);
	}
	if (!hasFoundMatch) {
		throw "Could not find HSMathCalculator.prototype.computedValue";
	}
}

function replaceHSStageParameterBlockTypeOfCalculation(unmoddedPlayer) {
	const regex = regexForMethod("typeOfCalculation",0);
	let hasFoundMatch = false;
	while (match = regex.exec(unmoddedPlayer)) {
		if (hasFoundMatch)
			throw "Found multiple matches for typeOfCalculation when trying to modify HSStageParameterBlock.prototype.typeOfCalculation"
		hasFoundMatch = true;
		const oldTypeOfCalculation = extractFunction(unmoddedPlayer,match.index+"e.prototype.typeOfCalculation=".length);
		const newBody = oldTypeOfCalculation.body
			.replace(/default:([^}]+)/,`default:return typeOfCalculationForModdedBlock.apply(this,[()=>{$1}]);`)
		return unmoddedPlayer.substr(0,oldTypeOfCalculation.bodyStartIndex)+newBody+unmoddedPlayer.substr(oldTypeOfCalculation.bodyEndIndex,unmoddedPlayer.length);
	}
	if (!hasFoundMatch) {
		throw "Could not find HSStageParameterBlock.prototype.typeOfCalculation";
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
		moddedPlayer += "\n"+replaceHSExecutableExecuteBlock(replaceHSMathCalculatorComputedValue(replaceHSStageParameterBlockTypeOfCalculation(unmoddedPlayer)));
		applyModOrWriteFile(moddedPlayer,0);
	});
});