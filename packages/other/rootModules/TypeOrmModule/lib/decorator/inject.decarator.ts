import { Inject } from "../../../../../core/decorators/Inject/";
import { EntityClassOrSchema } from "../interface";
import { getDataSourceToken, getRepositoryToken } from "../utils/tokens";

/**
 * Creates injection of typeorm datasource into dependencies;
 * @param  {string} [databaseName] Used only when using two or more datasource. By default "DATASOURCE_DEFAULT" when there only one datasource.
 * @returns return Inject function
 */
function InjectDataSource(databaseName?: string): ReturnType<typeof Inject> {
	const Token = getDataSourceToken(databaseName);
	return Inject(Token);
}

/**
 * Creates injection of typeorm repository into dependencies;
 * @param  {string} [databaseName] Used only when using two or more datasource to indicate from what datasource will repository will be injected. By default "DATASOURCE_DEFAULT" when there only one datasource.
 * @returns return Inject function
 */
const InjectRepository = (Entity: EntityClassOrSchema, database?: string): ReturnType<typeof Inject> =>
	Inject(getRepositoryToken(Entity, database) as string);

export { InjectDataSource, InjectRepository };
