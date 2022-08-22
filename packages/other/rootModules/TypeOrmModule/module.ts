import { DataSource, Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import type { EntitySchema, DataSourceOptions } from "typeorm";

import type { NactRootModuleSettings, NactCustomProvider } from "../../../core/Module/index";
import { createProvider } from "../../../core/Module/index";

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

const getDataSourceToken = (DataSource: DataSourceToken): string => {
	const dbToken = typeof DataSource === "string" ? DataSource : DataSource.driver.database;
	return `typeorm-datasource-${dbToken}`;
};

class DatabaseEntityStorage {
	protected static readonly storage = new Map<string, EntityClassOrSchema[]>();

	static addEntityByDataSource(DataSource: DataSourceToken, Entity: EntityClassOrSchema[] | EntityClassOrSchema): void {
		const token = getDataSourceToken(DataSource);

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
		const token = typeof DataSource === "string" ? DataSource : DataSource.driver.database;

		if (token) {
			return this.storage.get(token);
		}
	}

	static onLastPhase() {}
}

function getDataSourceProvider(DataSource: DataSource): NactCustomProvider {
	const providerToken = getDataSourceToken(DataSource);
	return createProvider({
		providerName: providerToken,
		useClass: DataSource,
	});
}

class TypeORMModule {
	static options: { [K: string]: TypeOrmRootProviderSettings } = {};

	constructor() {}

	static async connect(
		options: TypeOrmRootProviderSettings | TypeOrmRootProviderSettings[]
	): Promise<NactRootModuleSettings> {
		const providers: NactCustomProvider[] = [];

		const initializeDataSource = async (options: TypeOrmRootProviderSettings): Promise<DataSource> => {
			const dataSource = new DataSource(options as DataSourceOptions);
			const dataSourceToken = getDataSourceToken(dataSource);

			this.options[dataSourceToken] = options;

			if (!options.autoLoadEntities) {
				const storedEntities = DatabaseEntityStorage.getEntitiesByDataSource(dataSource) ?? [];
				const dataSourceEntities = (options.entities as EntityClassOrSchema[]) ?? [];
				options.entities = [...storedEntities, ...dataSourceEntities];
			}
			await deferConnection(() => {
				dataSource.initialize();
			});

			return dataSource;
		};

		options = Array.isArray(options) ? options : [options];
		for (let i = 0; i < options.length; i++) {
			const option = options[i];
			const dataSource = await initializeDataSource(option);

			this.options[getDataSourceToken(dataSource)] = option;
			providers.push(getDataSourceProvider(dataSource));
		}

		return {
			providers: providers,
			exports: [],
		};
	}
	static async getRepositories(repositories: EntityClassOrSchema[], dataSource?: DataSource): Promise<any> {
		console.log(dataSource);
	}

	doThings() {}
}

export { TypeORMModule };
