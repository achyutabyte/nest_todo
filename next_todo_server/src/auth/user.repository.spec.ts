import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { Task } from '../tasks/task.entity';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

describe('UserRepository (Integration)', () => {
  let userRepository: UserRepository;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User, Task],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserRepository],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('createUser', () => {
    const authCredentialsDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123!',
    };

    it('hashes password and saves the user successfully', async () => {
      await userRepository.createUser(authCredentialsDto);

      // Verify stored in DB
      const dbUser = await userRepository.findOneBy({ username: 'testuser' });
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe('test@example.com');
      expect(dbUser?.password).not.toBe('Password123!');
      expect(dbUser?.password.startsWith('$2')).toBe(true);
    });

    it('throws ConflictException on duplicate username', async () => {
      await userRepository.createUser(authCredentialsDto);
      
      const duplicateUsernameDto = {
        email: 'other@example.com',
        username: 'testuser', // duplicate username
        password: 'Password123!',
      };

      await expect(userRepository.createUser(duplicateUsernameDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException on duplicate email', async () => {
      await userRepository.createUser(authCredentialsDto);
      
      const duplicateEmailDto = {
        email: 'test@example.com', // duplicate email
        username: 'otheruser',
        password: 'Password123!',
      };

      await expect(userRepository.createUser(duplicateEmailDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws InternalServerErrorException on database error', async () => {
      jest.spyOn(userRepository, 'save').mockRejectedValueOnce(new Error('Generic database error'));

      await expect(userRepository.createUser(authCredentialsDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
