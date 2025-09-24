import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateNotFoundDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  query!: string

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  pageUrl?: string
}

