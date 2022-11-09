import type { DataSource, DataSourceOptions, EntitySchema } from "typeorm";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type DataSourceToken = string | DataSource;

//eslint-disable-next-line
type EntityClassOrSchema = Function | EntitySchema;

type TypeOrmRootProviderSettings = {
	autoLoadEntities?: boolean;
} & Writeable<Partial<DataSourceOptions>>;

export type { DataSourceToken, EntityClassOrSchema, TypeOrmRootProviderSettings };
