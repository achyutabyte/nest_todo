import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from './user.repository';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockUserRepository = () => ({
  createUser: jest.fn(),
  findOneBy: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(),
});

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let userRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: JwtService, useFactory: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('signUp', () => {
    it('calls userRepository.createUser and returns successfully', async () => {
      userRepository.createUser.mockResolvedValue(undefined);
      
      const authCredentials = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      };

      await expect(authService.signUp(authCredentials)).resolves.not.toThrow();
      expect(userRepository.createUser).toHaveBeenCalledWith(authCredentials);
    });
  });

  describe('signIn', () => {
    const signInCredentials = {
      username: 'testuser',
      password: 'Password123!',
    };

    it('returns an access token when credentials are valid', async () => {
      const mockUser = {
        username: 'testuser',
        password: 'hashedPassword',
      };
      
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mockAccessToken');

      const result = await authService.signIn(signInCredentials);
      expect(result).toEqual({ accessToken: 'mockAccessToken' });
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ username: 'testuser' });
      expect(jwtService.sign).toHaveBeenCalledWith({ username: 'testuser' });
    });

    it('throws UnauthorizedException if username is not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.signIn(signInCredentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if password comparison fails', async () => {
      const mockUser = {
        username: 'testuser',
        password: 'hashedPassword',
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.signIn(signInCredentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
