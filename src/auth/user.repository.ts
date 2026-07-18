import { DataSource, Repository } from "typeorm";
import { User } from "./user.entity";
import { AuthCredentialsDto } from "./dto/auth-credentials.dto";
import { Injectable, ConflictException, InternalServerErrorException } from "@nestjs/common";
import * as bcrypt from "bcrypt";


@Injectable()
export class UserRepository extends Repository<User> {
    constructor(private dataSource: DataSource) {
        super(User, dataSource.createEntityManager());
    }

    async createUser(authCredentialsDto: AuthCredentialsDto): Promise<void> {
        const { email, username, password } = authCredentialsDto;
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = this.create({ email, username, password: hashedPassword });
        
        try {
            await this.save(user);
        } catch (error) {
            if (error.code === '23505') { // duplicate key value violates unique constraint
                const detail = error.detail || '';
                if (detail.includes('username')) {
                    throw new ConflictException('Username already exists');
                } else if (detail.includes('email')) {
                    throw new ConflictException('Email already exists');
                } else {
                    throw new ConflictException('Username or email already exists');
                }
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

}       