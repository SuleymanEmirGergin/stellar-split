import { IsString, IsUrl, IsNotEmpty, Length } from 'class-validator';

export class PushSubscriptionDto {
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  endpoint: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 512)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 256)
  auth: string;
}
