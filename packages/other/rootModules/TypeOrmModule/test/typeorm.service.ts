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

	onApplicationShutdown() {
		this.TestDS.destroy();
	}
}

@Controller("nactmultipletypeorm")
class TestMultipleTypeORMService {
	constructor(
		@InjectDataSource("test") private TestDS1: DataSource,
		@InjectDataSource("test1") private TestDS2: DataSource,
		@InjectRepository(TypeormTestEntity, "test1") private TestRepository: Repository<TypeormTestEntity>,
	) {}

	@Get("secondisdefined")
	IsSecondDefinedDataSource() {
		return { data: this.TestDS1 instanceof DataSource && this.TestDS1.driver.database === "test" };
	}

	@Get("firstisdefined")
	IsFirstDefinedDataSource() {
		return { data: this.TestDS2 instanceof DataSource && this.TestDS2.driver.database === "test1" };
	}

	@Get("repositoryisdefined")
	async IsDefinedRepository() {
		const canRequest = Array.isArray(await this.TestRepository.find());
		const isEntityOfSelectedDS = this.TestRepository.manager.connection.driver.database === "test1";
		return { data: this.TestRepository !== undefined && canRequest && isEntityOfSelectedDS };
	}

	onApplicationShutdown() {
		this.TestDS1.destroy();
		this.TestDS2.destroy();
	}
}

export { TestTypeORMService, TestMultipleTypeORMService };
