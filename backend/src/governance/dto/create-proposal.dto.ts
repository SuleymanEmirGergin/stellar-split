import { IsString, IsNotEmpty, IsInt, Min, Max, IsDateString, MinLength, MaxLength, registerDecorator, ValidationOptions } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

function IsFutureDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} must be a future date`, ...options },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return new Date(value) > new Date();
        },
      },
    });
  };
}

export class CreateProposalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value))
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ default: 51 })
  @IsInt()
  @Min(1)
  @Max(100)
  threshold: number = 51;

  @ApiProperty({ description: 'ISO 8601 date string — when voting ends (must be in the future)' })
  @IsDateString()
  @IsFutureDate()
  endsAt: string;
}
