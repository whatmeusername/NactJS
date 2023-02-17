import { serverSettings } from "./interface";
import { NactServer } from "./NactApplication";

import { config } from "dotenv";
config();

function createNactApp(transferModuleKey?: string, serverSetting?: serverSettings): NactServer {
	const server = new NactServer(transferModuleKey, serverSetting);

	process.on("SIGINT", () => {
		server.emit("close");
		process.exit(0);
	});
	process.on("SIGQUIT", () => {
		server.emit("close");
		process.exit(0);
	});
	process.on("SIGTERM", () => {
		server.emit("close");
		process.exit(0);
	});

	return server;
}

export { createNactApp };
