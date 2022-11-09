import { EntitySchema } from "typeorm";
import { isClassInstance } from "../../../../../core/shared";
import { DataSourceToken, EntityClassOrSchema, TypeOrmRootProviderSettings } from "../interface";
import { DatabaseStorage } from "./storage";
import { isDataSourceToken } from "./validator";
import { DEFAULT_DS_TOKEN } from "../module";

const getDataSourceToken = (DataSource?: DataSourceToken | TypeOrmRootProviderSettings): string => {
	if (DataSource) {
		const dbToken =
			typeof DataSource === "string"
				? DataSource
				: (DataSource as TypeOrmRootProviderSettings).database ?? DataSource.driver.database;
		const token = `DATASOURCE_${dbToken?.toLowerCase()}`;
		return token;
	}
	return DEFAULT_DS_TOKEN;
};

const getRepositoryToken = (Entity: EntityClassOrSchema, DataSource?: DataSourceToken): string | undefined => {
	const Token = DataSource
		? isDataSourceToken(DataSource)
			? DataSource
			: getDataSourceToken(DataSource)
		: DEFAULT_DS_TOKEN;

	let entityName = "";
	if (Entity instanceof EntitySchema) {
		entityName = Entity.options.target ? Entity.options.target.name : Entity.options.name;
	} else if (isClassInstance(Entity)) {
		entityName = Entity.name;
	}

	return `ENTITY_${entityName}_${DEFAULT_DS_TOKEN}`;
};

export { getDataSourceToken, getRepositoryToken };
