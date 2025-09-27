import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { TokenRequestDto } from "./dto/token-request.dto";

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  async getToken(@Body() body: TokenRequestDto) {
    return this.authService.issueToken(body.name);
  }
}
