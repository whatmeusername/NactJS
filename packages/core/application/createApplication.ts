import { NactListernerEvent, serverSettings } from "./interface";
import { NactServer } from "./NactApplication";

import { config } from "dotenv";
config();

function createNactApp(transferModuleKey?: string, serverSetting?: serverSettings): NactServer {
	const server = new NactServer(transferModuleKey, serverSetting);

	process.on("SIGINT", () => {
		server.emit(NactListernerEvent.CLOSE);
		process.exit(0);
	});
	process.on("SIGQUIT", () => {
		server.emit(NactListernerEvent.CLOSE);
		process.exit(0);
	});
	process.on("SIGTERM", () => {
		server.emit(NactListernerEvent.CLOSE);
		process.exit(0);
	});

	return server;
}

export { createNactApp };
