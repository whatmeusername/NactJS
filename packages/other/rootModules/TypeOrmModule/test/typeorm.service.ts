import { Controller, Get } from "@nactjs/core";
import { InjectDataSource, InjectRepository } from "../lib";
import { DataSource, Repository } from "typeorm";
import { TypeormTestEntity } from "./entity";

@Controller("nacttypeorm")
class TestTypeORMService {
	constructor(
		@InjectDataSource() private TestDS: DataSource,
		@InjectRepository(TypeormTestEntity) private TestRepository: Repository<TypeormTestEntity>,
	) {}

	@Get("dsisdefined")
	IsDefinedDataSource() {
		return { data: this.TestDS instanceof DataSource };
	}

	@Get("repositoryisdefined")
	IsDefinedRepository() {
		return { data: this.TestRepository !== undefined };
	}

	@Get("repositoryisinitialized")
	async IsInitializedRepository() {
		const canRequest = Array.isArray(await this.TestRepository.find());
		return { data: this.TestDS.hasMetadata(TypeormTestEntity) && canRequest };
	}
}

export { TestTypeORMService };
