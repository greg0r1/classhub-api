import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// On exclut organization_id et password car ils ne doivent pas être modifiables via update
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['organization_id', 'password'] as const),
) {}