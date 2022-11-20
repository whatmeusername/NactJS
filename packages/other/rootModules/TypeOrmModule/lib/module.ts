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
const DEFAULT_DS_TOKEN = "DATASOURCE_DEFAULT";

class TypeORMModule {
	static options: { [K: string]: TypeOrmRootProviderSettings } = {};
	static sourceLength: number;

	constructor() {}

	/**
	 * Creating root module for creating custom providers nedeed for connecting to TypeOrm datasource(s).
	 * @param  {TypeOrmRootProviderSettings|TypeOrmRootProviderSettings[]} options Datasource connection options
	 * @returns NactRootModuleSettings returning config for creating root module
	 */
	static root(options: TypeOrmRootProviderSettings | TypeOrmRootProviderSettings[]): NactRootModuleSettings {
		const providers: NactCustomProvider[] = [];
		options = Array.isArray(options) ? options : [options];
		this.sourceLength = options.length;

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
		const providerToken = this.sourceLength > 1 ? getDataSourceToken(options) : DEFAULT_DS_TOKEN;
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
	/**
	 * Used to get repositories from datasource as providers for module;
	 * @param  {EntityClassOrSchema[]} entities TypeOrm entities to retrieve
	 * @param  {DataSource|string} [dataSource]
	 * Optional. Can be used only when using two or more datasources, indicates from what datasource will retrieve repositories.
	 * By default is has value of "DATASOURCE_DEFAULT" that indicates datasource, when there only one datasource connection.
	 * @returns NactCustomProviderSettings
	 */
	static getRepositories(
		entities: EntityClassOrSchema[],
		dataSource?: DataSource | string,
	): NactCustomProviderSettings[] {
		if (this.sourceLength > 1 && !dataSource) {
			logger.error(
				"TypeOrmModule cant use method 'getRepositories' without dataSource argument when using two or more datasources",
			);
			return [];
		}
		const DataSourceToken =
			typeof dataSource === "string"
				? getDataSourceToken(dataSource)
				: dataSource
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
