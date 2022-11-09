import { Inject } from "../../../../../core/decorators/Inject/";
import { EntityClassOrSchema } from "../interface";
import { getDataSourceToken, getRepositoryToken } from "../utils/tokens";

function InjectDataSource(databaseName?: string) {
	const Token = getDataSourceToken(databaseName);
	return Inject(Token);
}

const InjectRepository = (Entity: EntityClassOrSchema, database?: string) =>
	Inject(getRepositoryToken(Entity, database) as string);

export { InjectDataSource, InjectRepository };
