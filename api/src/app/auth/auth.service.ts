import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from './entities/user.entity';

type JwtPayload = {
  sub: number;
  username: string;
};

export type AuthUserProfile = {
  id: number;
  username: string;
  createdAt: Date;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUser();
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getProfile(userId: number): Promise<AuthUserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found.');
    }

    return this.toProfile(user);
  }

  async findUserById(userId: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  private async validateUser(
    username: string,
    password: string,
  ): Promise<UserEntity> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.username) = LOWER(:username)', {
        username: username.trim(),
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return user;
  }

  private async seedAdminUser(): Promise<void> {
    const existingAdmin = await this.userRepository.findOne({
      where: { username: DEFAULT_ADMIN_USERNAME },
    });

    if (existingAdmin) {
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    const adminUser = this.userRepository.create({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
    });

    await this.userRepository.save(adminUser);
    this.logger.log(`Seeded default admin user "${DEFAULT_ADMIN_USERNAME}".`);
  }

  private toProfile(user: UserEntity): AuthUserProfile {
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }
}
