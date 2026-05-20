import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, CurrentUser, OrgId } from '../../shared/decorators';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  getTeam(@OrgId() orgId: string) {
    return this.teamsService.getTeam(orgId);
  }

  @Post('invite')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  invite(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { email: string; role: TeamRole },
  ) {
    return this.teamsService.inviteMember(orgId, body.email, body.role, userId);
  }

  @Patch(':id/role')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  updateRole(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: TeamRole,
  ) {
    return this.teamsService.updateRole(orgId, id, role);
  }

  @Delete(':id')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  remove(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.removeMember(orgId, id);
  }
}
