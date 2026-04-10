import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GuardiansService } from './guardians.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';

@ApiTags('guardians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Get('groups/:groupId/guardians')
  @ApiOperation({ summary: 'List guardians for a group' })
  findByGroup(@Param('groupId') groupId: string, @CurrentUser() user: JwtPayload) {
    return this.guardiansService.findByGroup(groupId, user.sub);
  }

  @Post('guardians')
  @ApiOperation({ summary: 'Add a social recovery guardian' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGuardianDto) {
    return this.guardiansService.create(user.sub, dto);
  }

  @Delete('guardians/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a guardian' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guardiansService.remove(id, user.sub);
  }
}
