import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { GetCurrentUserHandler } from "./handlers/get-current-user.handler";
import { UsersController } from "./users.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [GetCurrentUserHandler],
})
export class UsersModule {}
