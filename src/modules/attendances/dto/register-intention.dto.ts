import { IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';

export class RegisterIntentionDto {
  @IsUUID()
  course_id: string;

  @IsUUID()
  user_id: string;

  @IsEnum(['will_attend', 'will_not_attend'])
  intention: 'will_attend' | 'will_not_attend';

  @IsOptional()
  @IsString()
  notes?: string;
}
