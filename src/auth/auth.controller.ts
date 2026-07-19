import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { SignInCredentialsDto } from './dto/signin-credentials.dto';


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post("/sign-up")
    signUp(@Body() authCredentialsDto: AuthCredentialsDto): Promise<void> {
        return this.authService.signUp(authCredentialsDto);
    }

    @Post("/sign-in")
    signIn(@Body() signInCredentialsDto: SignInCredentialsDto): Promise<{ accessToken: string }> {
        return this.authService.signIn(signInCredentialsDto);
    }
}
