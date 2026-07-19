import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AuthCredentialsDto {
    @IsEmail({}, { message: 'Please enter a valid email address.' })
    @IsNotEmpty({ message: 'Email should not be empty.' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Username should not be empty.' })
    @MinLength(4, { message: 'Username must be at least 4 characters long.' })
    @MaxLength(20, { message: 'Username cannot be longer than 20 characters.' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: 'Password should not be empty.' })
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    @MaxLength(32, { message: 'Password cannot be longer than 32 characters.' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password is too weak. It must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character.',
    })
    password: string;
}