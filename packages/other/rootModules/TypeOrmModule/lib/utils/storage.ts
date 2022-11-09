import { DataSource } from "typeorm";
import { DEFAULT_DS_TOKEN } from "../module";
import { DataSourceToken, EntityClassOrSchema } from "../interface";
import { getDataSourceToken } from "./tokens";
import { isDataSourceToken } from "./validator";

class DatabaseStorage {
	protected static readonly storage = new Map<string, EntityClassOrSchema[]>();
	protected static readonly datasourceTokensStorage = new Map<string, string[]>();
	static default = { original: "", prefix: DEFAULT_DS_TOKEN };

	static addEntityByDataSource(
		DataSource: DataSourceToken | string,
		Entity: EntityClassOrSchema[] | EntityClassOrSchema,
	): void {
		const token = isDataSourceToken(DataSource) ? (DataSource as string) : getDataSourceToken(DataSource);

		if (token) {
			let entities = this.storage.get(token);
			if (!entities) {
				entities = Array.isArray(Entity) ? [...Entity] : [Entity];
				this.storage.set(token, entities);
			} else {
				if (Array.isArray(Entity)) {
					Entity.forEach((entity) => {
						if (!entities?.includes(entity)) {
							entities?.push(entity);
						}
					});
				} else {
					if (!entities?.includes(Entity)) entities?.push(Entity);
				}
			}
		}
	}

	static getEntitiesByDataSource(DataSource: DataSourceToken): EntityClassOrSchema[] | undefined {
		const token = getDataSourceToken(DataSource);

		if (token) {
			return this.storage.get(token);
		}
	}

	static HasDataSource(Token?: string): boolean {
		if (Token) {
			const datasourceTokens = this.datasourceTokensStorage.get("DATASOURCE__TOKENS") ?? [];
			return datasourceTokens.find((token) => token === Token) !== undefined;
		}
		return false;
	}

	static getDataSource(
		DataSource?: DataSourceToken,
	): string | undefined | string[] | { original: string; prefix: string } {
		const datasourceTokens = this.datasourceTokensStorage.get("DATASOURCE__TOKENS") ?? [];

		if (datasourceTokens.length > 1 && datasourceTokens.length > 0) {
			if (DataSource) {
				const Token = getDataSourceToken(DataSource);
				if (Token) {
					return datasourceTokens.find((token) => token === Token);
				}
			}
		}
		return this.default.prefix;
	}

	static getDataSourceTokenByIndex(index: number): string {
		const tokens = this.datasourceTokensStorage.get("DATASOURCE__TOKENS");
		return tokens ? tokens[index] : DEFAULT_DS_TOKEN;
	}

	static addDataSourceToken(dataSource: DataSource | string): string | undefined {
		const isToken = typeof dataSource === "string" && dataSource.startsWith("DATASOURCE");
		const tokens = this.datasourceTokensStorage.get("DATASOURCE__TOKENS") ?? [];

		let Token;
		if (isToken) Token = dataSource;
		else if (dataSource instanceof DataSource) {
			Token = getDataSourceToken(dataSource);
		}
		if (Token) {
			this.datasourceTokensStorage.set("DATASOURCE__TOKENS", [...tokens, Token]);

			const canHasDefault = tokens.length <= 1;
			if (canHasDefault) {
				this.default.original = Token;
				Token = DEFAULT_DS_TOKEN;
			}
			return Token;
		}
	}
}

export { DatabaseStorage };
