import { MigrationInterface, QueryRunner } from "typeorm";

export class DB_Init_1743847908388 implements MigrationInterface {
    name = 'DB_Init_1743847908388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "target" ("id" SERIAL NOT NULL, "code" character varying(20) NOT NULL, "host" character varying, "userAgent" character varying, "https" boolean NOT NULL DEFAULT false, "enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9d962204b13c18851ea88fc72f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."storageFileStatusEnum" AS ENUM('idle', 'pending', 'success', 'error')`);
        await queryRunner.query(`CREATE TABLE "storage" ("basePath" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "downloadCount" integer NOT NULL DEFAULT '0', "targetId" integer NOT NULL, "status" "public"."storageFileStatusEnum" NOT NULL, CONSTRAINT "PK_5179327ed8ee7caf7283c8f22b5" PRIMARY KEY ("basePath"))`);
        await queryRunner.query(`ALTER TABLE "storage" ADD CONSTRAINT "FK_eee3a3d9c1024fb4e3b12e708ba" FOREIGN KEY ("targetId") REFERENCES "target"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage" DROP CONSTRAINT "FK_eee3a3d9c1024fb4e3b12e708ba"`);
        await queryRunner.query(`DROP TABLE "storage"`);
        await queryRunner.query(`DROP TYPE "public"."storageFileStatusEnum"`);
        await queryRunner.query(`DROP TABLE "target"`);
    }

}
