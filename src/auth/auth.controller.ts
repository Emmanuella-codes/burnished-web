import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(CustomThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto) {
    const result = await this.authService.signUp(signUpDto);
    return {
      message: result.message,
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      accessToken: result.token,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      message: result.message,
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      accessToken: result.token,
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req) {
    const result = await this.authService.googleLogin(req.user);
    return {
      message: 'Google login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      accessToken: result.token,
    };
  }

  @Get('verify/:token')
  async verifyEmail(@Param('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return { message: result.message };
  }

  @Post('forgot-password')
  @UseGuards(CustomThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    const result = await this.authService.forgotPassword(email);
    return { message: result.message };
  }

  @Post('reset-password')
  @UseGuards(CustomThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return { message: result.message };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { message: 'Only admins can access this' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: User) {
    return {
      message: 'Profile retrieved successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
