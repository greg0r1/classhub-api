import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  last_name: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'coach', 'member'] })
  role: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  organization_id: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token d\'accès JWT (valide 15 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token (valide 30 jours)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Durée de validité du access token en secondes',
    example: 900,
  })
  expires_in: number;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
