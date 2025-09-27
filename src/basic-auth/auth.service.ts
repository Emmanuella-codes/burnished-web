import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async issueToken(name: string) {
    const payload = { name, role: 'user' };
    const token = await this.jwtService.signAsync(payload);
    return { access_token: token };
  }
}
