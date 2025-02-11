import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<{ user: User; token: string }> {
    const { firstname, lastname, email, password } = signUpDto;

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

    await this.userRepository.save(user);
    const token = this.generateToken(user);
    delete user.password;

    return { user, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
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

    return { user, token };
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
