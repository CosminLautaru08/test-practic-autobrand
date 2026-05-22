import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from './auth.constants';
import { AuthService, AuthUserProfile } from './auth.service';

type JwtPayload = {
  sub: number;
  username: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUserProfile> {
    const user = await this.authService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found.');
    }

    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }
}
