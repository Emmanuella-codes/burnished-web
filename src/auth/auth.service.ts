import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { EmailService } from './services/email.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signUp(
    signUpDto: SignUpDto,
  ): Promise<{ user: User; token: string; message: string }> {
    const { firstname, lastname, email, password } = signUpDto;
    const verificationToken = uuidv4();

    if (!firstname) throw new BadRequestException('First name is required');
    if (!lastname) throw new BadRequestException('Last name is required');
    if (!email) throw new BadRequestException('Email is required');
    if (!password) throw new BadRequestException('Password is required');

    // check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // create new user
    const user = this.userRepository.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
    });

    user.verificationToken = verificationToken;
    await this.userRepository.save(user);

    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }

    const token = this.generateToken(user);
    delete user.password;

    return {
      user,
      token,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });
    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }
    user.isVerified = true;
    user.verificationToken = null;
    await this.userRepository.save(user);
    return { message: 'Email verified successfully' };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; token: string; message: string }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Email does not exist');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password does not match');
    }

    const token = this.generateToken(user);
    delete user.password;

    return { user, token, message: 'Login successfull' };
  }

  async googleLogin(user: any): Promise<{ token: string }> {
    const { firstname, lastname, email } = user;

    let existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (!existingUser) {
      existingUser = this.userRepository.create({
        email,
        firstname: firstname,
        lastname: lastname,
        isVerified: true,
      });
      await this.userRepository.save(existingUser);
    }

    const token = this.generateToken(existingUser);
    return { token };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return {
        message:
          'If an account exists with this email, you will receive a password reset link.',
      };
    }

    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await this.userRepository.save(user);
    await this.emailService.sendPasswordResetEmail(email, resetToken);
    return {
      message:
        'If an account exists with this email, you will receive a password reset link.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: resetPasswordDto.token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successful' };
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.userID },
    });

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userID: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }
}
