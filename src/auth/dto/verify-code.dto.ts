import { IsNotEmpty, Length, Matches } from "class-validator";

export class VerifyCodeDto {
  @IsNotEmpty()
  @Matches(/^\+?998\d{9}$/i)
  phone!: string;

  @IsNotEmpty()
  @Length(5, 5)
  code!: string;

  deviceInfo?: string;

  referralCode?: string;
}
