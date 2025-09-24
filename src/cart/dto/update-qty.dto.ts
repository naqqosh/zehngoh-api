import { IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateQtyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number
}

