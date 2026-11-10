import { Module } from "@nestjs/common";
import { PersistenceModule } from "../../database/persistence.module";
import { GetCurrentUserHandler } from "./handlers/get-current-user.handler";
import { UsersController } from "./users.controller";

@Module({
  imports: [PersistenceModule],
  controllers: [UsersController],
  providers: [GetCurrentUserHandler],
})
export class UsersModule {}
