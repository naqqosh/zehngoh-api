import { SetMetadata } from '@nestjs/common'
import { ROLES_KEY } from '../guards/roles.guard'

export const Roles = (...roles: ('user' | 'admin' | 'seller')[]) => SetMetadata(ROLES_KEY, roles)

