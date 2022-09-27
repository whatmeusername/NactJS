import { DataSource, Entity, Column, PrimaryGeneratedColumn, EntitySchema } from "typeorm";
import type { DataSourceOptions } from "typeorm";

import type {
	NactRootModuleSettings,
	NactCustomProvider,
	NactCustomProviderSettings,
} from "../../../core/Module/index";
import { isClassInstance } from "../../../core/shared";
import { createProvider } from "../../../core/Module";
import { Inject } from "../../../core/Decorators/Inject/index";

@Entity()
class TestEntity {
	@PrimaryGeneratedColumn() id: number;
	@Column() label: string;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type TypeOrmRootProviderSettings = {
	autoLoadEntities?: boolean;
} & Writeable<Partial<DataSourceOptions>>;

import { getNactLogger } from "../../../core/nact-logger";

const logger = getNactLogger();

const deferConnection = async (cb: () => Promise<any> | void): Promise<void> => {
	try {
		await cb();
	} catch (err: any) {
		logger.error(`Catch error while connecting to database. Message: ${err.message}`);
	}
};

type DataSourceToken = string | DataSource;

//eslint-disable-next-line
type EntityClassOrSchema = Function | EntitySchema;

const getDataSourceToken = (DataSource?: DataSourceToken | TypeOrmRootProviderSettings): string => {
	if (DataSource) {
		const dbToken =
			typeof DataSource === "string"
				? DataSource
				: (DataSource as TypeOrmRootProviderSettings).database ?? DataSource.driver.database;
		const token = `DATASOURCE_${dbToken?.toLowerCase()}`;
		if (DatabaseStorage.default.original === token) return token;
	}
	return DatabaseStorage.default.prefix;
};

const getRepositoryToken = (Entity: EntityClassOrSchema, DataSource?: DataSourceToken): string | undefined => {
	let Token = DataSource ? (isDataSourceToken(DataSource) ? DataSource : getDataSourceToken(DataSource)) : null;

	if (!DataSource) {
		Token = DatabaseStorage.getDataSourceTokenByIndex(0);
	}

	let entityName = "";
	if (Entity instanceof EntitySchema) {
		entityName = Entity.options.target ? Entity.options.target.name : Entity.options.name;
	} else if (isClassInstance(Entity)) {
		entityName = Entity.name;
	}

	if (Token) {
		return `ENTITY_${entityName}_${Token}`;
	} else {
		// TODO ---
		throw new Error();
	}
};

const isDataSourceToken = (value: any): boolean => {
	return typeof value === "string" && value.startsWith("DATASOURCE");
};

const DEFAULT_DS_TOKEN = "DATASOURCE_DEFAULT";

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

class TypeORMModule {
	static options: { [K: string]: TypeOrmRootProviderSettings } = {};

	constructor() {}

	static root(options: TypeOrmRootProviderSettings | TypeOrmRootProviderSettings[]): NactRootModuleSettings {
		const providers: NactCustomProvider[] = [];
		options = Array.isArray(options) ? options : [options];

		for (let i = 0; i < options.length; i++) {
			const option = options[i];
			const dataSourceToken = getDataSourceToken(option);

			if (dataSourceToken) {
				this.options[dataSourceToken] = option;
				providers.push(this.getDataSourceProvider(option));
			}
		}

		return {
			providers: providers,
		};
	}

	protected static initializeDataSource = async (options: TypeOrmRootProviderSettings): Promise<DataSource> => {
		const dataSource = new DataSource(options as DataSourceOptions);
		const dataSourceToken = DatabaseStorage.addDataSourceToken(getDataSourceToken(dataSource));

		if (dataSourceToken) {
			this.options[dataSourceToken] = options;

			if (options.autoLoadEntities) {
				const storedEntities = DatabaseStorage.getEntitiesByDataSource(dataSource) ?? [];
				const dataSourceEntities = (options.entities as EntityClassOrSchema[]) ?? [];
				options.entities = [...storedEntities, ...dataSourceEntities];
			}
		}
		if (!dataSource.isInitialized) {
			await deferConnection(() => {
				dataSource.initialize();
			});
		}
		return dataSource;
	};

	protected static getDataSourceProvider(options: TypeOrmRootProviderSettings): NactCustomProvider {
		const providerToken = getDataSourceToken(options);
		const settings: NactCustomProviderSettings = { providerName: providerToken };

		settings.useFactory = () => {
			const DataSource = this.initializeDataSource(options);
			return DataSource;
		};

		return createProvider(settings);
	}

	static getRepositoryProvider(entity: EntityClassOrSchema, dataSourceToken: string): NactCustomProviderSettings {
		const EntityToken = getRepositoryToken(entity, dataSourceToken) as string;
		return createProvider({
			providerName: EntityToken,
			useFactory: (dataSource: DataSource) => {
				const enitityMetadata = dataSource.entityMetadatas.find((meta) => meta.target === entity);
				const isTreeEntity = typeof enitityMetadata?.treeType !== "undefined";
				let repository;
				if (isTreeEntity) {
					repository = dataSource.getTreeRepository(entity);
				} else {
					repository =
						dataSource.options.type === "mongodb" ? dataSource.getMongoRepository(entity) : dataSource.getRepository(entity);
				}
				return repository;
			},
			injectArguments: [dataSourceToken],
		});
	}

	static getRepositories(entities: EntityClassOrSchema[], dataSource?: DataSource): any {
		const DataSourceToken = dataSource
			? (DatabaseStorage.getDataSource(dataSource) as string)
			: DatabaseStorage.getDataSourceTokenByIndex(0);
		const providers = [];
		if (DataSourceToken) {
			DatabaseStorage.addEntityByDataSource(DataSourceToken, entities);
			for (let i = 0; i < entities.length; i++) {
				const entity = entities[i];
				const hasToken = getRepositoryToken(entity, DataSourceToken);
				if (hasToken) {
					providers.push(this.getRepositoryProvider(entity, DataSourceToken));
				}
			}
		}
		return providers;
	}

	doThings() {}
}

export { TypeORMModule };

const InjectDataSource = (databaseName?: string) => {
	const Token = getDataSourceToken(databaseName);
	return Inject(Token);
};

const InjectRepository = (Entity: EntityClassOrSchema, database?: string) =>
	Inject(getRepositoryToken(Entity, database) as string);

export { InjectDataSource, InjectRepository, TestEntity };
