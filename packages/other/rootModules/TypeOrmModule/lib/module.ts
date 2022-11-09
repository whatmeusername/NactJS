import { DataSource } from "typeorm";
import type { DataSourceOptions } from "typeorm";

import type {
	NactRootModuleSettings,
	NactCustomProvider,
	NactCustomProviderSettings,
} from "../../../../core/module/index";
import { createProvider } from "../../../../core/module";

import { getNactLogger } from "../../../../core/nact-logger";
import { EntityClassOrSchema, TypeOrmRootProviderSettings } from "./interface";
import { DatabaseStorage, getDataSourceToken, getRepositoryToken } from "./utils";

const logger = getNactLogger();

const deferConnection = async (cb: () => Promise<any> | void): Promise<void> => {
	try {
		await cb();
	} catch (err: any) {
		logger.error(`Catch error while connecting to database. Message: ${err.message}`);
	}
};

const DEFAULT_DS_TOKEN = "DATASOURCE_DEFAULT";

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
			await dataSource.initialize();
		}
		return dataSource;
	};

	protected static getDataSourceProvider(options: TypeOrmRootProviderSettings): NactCustomProvider {
		const providerToken = Object.keys(this.options).length > 1 ? getDataSourceToken(options) : DEFAULT_DS_TOKEN;
		const settings: NactCustomProviderSettings = { providerName: providerToken };

		settings.useFactory = async () => {
			const DataSource = await this.initializeDataSource(options);
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
}

export { TypeORMModule, DEFAULT_DS_TOKEN };
