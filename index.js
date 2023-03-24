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

function replaceDefault(unmoddedPlayer,methodName,methodParameterCount,replacer) {
	const regex = regexForMethod(methodName,methodParameterCount);
	let hasFoundMatch = false;
	while (match = regex.exec(unmoddedPlayer)) {
		if (hasFoundMatch)
			throw `Found multiple matches for ${methodName}`;
		hasFoundMatch = true;
		const oldMethod = extractFunction(unmoddedPlayer,match.index+`e.prototype.${methodName}=`.length);
		const newBody = oldMethod.body
			.replace(/default:([^}]+)/,replacer(oldMethod))
		return unmoddedPlayer.substr(0,oldMethod.bodyStartIndex)+newBody+unmoddedPlayer.substr(oldMethod.bodyEndIndex,unmoddedPlayer.length);
	}
	if (!hasFoundMatch) {
		throw `Could not find ${methodName}`;
	}
}

function replaceHSExecutableExecuteBlock(unmoddedPlayer) {
	return replaceDefault(unmoddedPlayer,"executeBlock",2,oldExecuteBlocks =>
		`default:executeModdedMethod.apply(this,[(${oldExecuteBlocks.parameterNames[0]},${oldExecuteBlocks.parameterNames[1]})=>{$1},${oldExecuteBlocks.parameterNames[0]},${oldExecuteBlocks.parameterNames[1]}]);`
	);
}

function replaceHSMathCalculatorComputedValue(unmoddedPlayer) {
	return replaceDefault(unmoddedPlayer,"computedValue",2,oldComputedValue =>
		`default:return executeModdedParameter.apply(this,[()=>{$1},${oldComputedValue.parameterNames[0]},${oldComputedValue.parameterNames[1]}]);`
	);
}

function replaceHSStageParameterBlockTypeOfCalculation(unmoddedPlayer) {
	return replaceDefault(unmoddedPlayer,"typeOfCalculation",0,old =>
		`default:return typeOfCalculationForModdedBlock.apply(this,[()=>{$1}]);`
	);
}

function replaceHSConditionalCalculatorComputedBooleanValue(unmoddedPlayer) {
	return replaceDefault(unmoddedPlayer,"computedBooleanValue",4,old =>
		`default:return executeModdedParameter(()=>{$1},${old.parameterNames[0]},[${old.parameterNames[1]},${old.parameterNames[2]}],${old.parameterNames[3]})`
	);
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
		moddedPlayer += "\n"+replaceHSExecutableExecuteBlock(replaceHSMathCalculatorComputedValue(replaceHSStageParameterBlockTypeOfCalculation(replaceHSConditionalCalculatorComputedBooleanValue(unmoddedPlayer))));
		applyModOrWriteFile(moddedPlayer,0);
	});
});