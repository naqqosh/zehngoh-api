import { IsNotEmpty, Matches } from 'class-validator'

export class SendCodeDto {
  @IsNotEmpty()
  @Matches(/^\+?998\d{9}$/i, { message: 'phone must be Uzbek format like +99890xxxxxxx' })
  phone!: string
}

