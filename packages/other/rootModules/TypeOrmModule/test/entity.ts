import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
class TypeormTestEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column("varchar")
	name: string;
}

export { TypeormTestEntity };
