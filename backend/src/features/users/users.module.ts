import { Module } from "@nestjs/common";
import { PersistenceModule } from "@/database/persistence.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [PersistenceModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
