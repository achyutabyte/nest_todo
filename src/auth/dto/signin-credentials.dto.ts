import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SignInCredentialsDto {
    @IsString()
    @IsNotEmpty({ message: 'Username should not be empty.' })
    @MinLength(4, { message: 'Username must be at least 4 characters long.' })
    @MaxLength(20, { message: 'Username cannot be longer than 20 characters.' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: 'Password should not be empty.' })
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    @MaxLength(32, { message: 'Password cannot be longer than 32 characters.' })
    password: string;
}
