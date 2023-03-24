const RESERVED_INVALID_USER_ID = 2;
const PETRICHOR_CURRENT_MOD_CONFIG = {
	userId: RESERVED_INVALID_USER_ID,
	modId: 0,
	modName: "UNCONFIGURED MOD"
}
const MODDED_METHOD_BLOCKS = {}
const MODDED_PARAMETER_BLOCKS = {}
function executeModdedMethod(defaultCallback,stageMethod,t) {
	if (stageMethod.type < 0) {
		if (MODDED_METHOD_BLOCKS[stageMethod.type]) {
			MODDED_METHOD_BLOCKS[stageMethod.type](stageMethod,t);
		} else {
			console.error(`Attempting to execute unknown modded block with id ${stageMethod.type}`,stageMethod)
		}
	} else {
		defaultCallback(t);
	}
}

function setModConfig(config) {
	if (config.userId < 0 || config.userId == 2) {
		return console.error("Bad user id, must be greater than 0 and must not equal 2");
	} else if (config.modId < 0) {
		return console.error("Bad modId, must be positive integer");
	} else if (config.modName.length == 0) {
		return console.error("Mod needs name");
	} else {
		PETRICHOR_CURRENT_MOD_CONFIG.userId = config.userId;
		PETRICHOR_CURRENT_MOD_CONFIG.modId = config.modId;
		PETRICHOR_CURRENT_MOD_CONFIG.modName = config.modName
		PETRICHOR_CURRENT_MOD_CONFIG.addedBlockIds = [];
		PETRICHOR_CURRENT_MOD_CONFIG.addedBlockNames = [];
	}
}
function newBlock(blockConfig) {
	// {
	// 	id: 0,
	// 	name: "TestBlock",
	// 	method: (params) => {
	// 		console.log(params);
	// 	}
	// }
	if (PETRICHOR_CURRENT_MOD_CONFIG.userId == 2) {
		return console.error("Cannot add new block because mod is not configured.");
	}
	if (PETRICHOR_CURRENT_MOD_CONFIG.addedBlockIds.indexOf(blockConfig.id) != -1) {
		return console.error("Cannot add new block, its id was already used.");
	}
	if (PETRICHOR_CURRENT_MOD_CONFIG.addedBlockNames.indexOf(blockConfig.name) != -1) {
		return console.error("Cannot add new block, its name was already used.")
	}
	const actualId = parseInt((-PETRICHOR_CURRENT_MOD_CONFIG.userId).toString()+PETRICHOR_CURRENT_MOD_CONFIG.modId.toString()+blockConfig.id.toString());
	if (actualId > -100) {
		return console.error(`Problem adding block. Its actual id ended up being ${actualId} which did not make sense.`);
	}
	const actualName = PETRICHOR_CURRENT_MOD_CONFIG.userId.toString()+PETRICHOR_CURRENT_MOD_CONFIG.modName+blockConfig.name;
	console.log(actualId,actualName);
	// Add to enum
	HSBlockType[actualId] = actualName;
	HSBlockType[actualName] = actualId;
	if (blockConfig.method) {
		console.log(`Adding new method block ${blockConfig.name} into mod ${PETRICHOR_CURRENT_MOD_CONFIG.modName}`);
		MODDED_METHOD_BLOCKS[actualId] = blockConfig.method;
	}
}