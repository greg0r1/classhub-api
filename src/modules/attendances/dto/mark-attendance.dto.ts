import { IsBoolean, IsUUID, IsOptional, IsString } from 'class-validator';

export class MarkAttendanceDto {
  @IsUUID()
  course_id: string;

  @IsUUID()
  user_id: string;

  @IsBoolean()
  actual_attendance: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
