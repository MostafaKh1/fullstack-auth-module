import { Module } from "@nestjs/common";
import { PersistenceModule } from "../../database/persistence.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [PersistenceModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
