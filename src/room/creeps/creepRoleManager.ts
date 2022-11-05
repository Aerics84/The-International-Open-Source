import './creepPrototypes/creepFunctions'
import './creepPrototypes/creepMoveFunctions'

import { creepRoles, myColors } from 'international/constants'
import { customLog } from 'international/utils'
import { Maintainer } from './roleManagers/commune/maintainer'
import { Builder } from './roleManagers/commune/builder'
import { Hauler } from './roleManagers/commune/hauler'
import { RemoteHauler } from './roleManagers/remote/remoteHauler'
import { Claimer } from './roleManagers/international/claimer'
import { AllyVanguard } from './roleManagers/international/allyVanguard'
import { HubHauler } from './roleManagers/commune/hubHaulerManager'
import { ControllerUpgrader } from './roleManagers/commune/controllerUpgrader'
import { SourceHarvester } from './roleManagers/commune/sourceHarvester'
import { MineralHarvester } from './roleManagers/commune/mineralHarvester'
import { FastFiller } from './roleManagers/commune/fastFiller'
import { MeleeDefender } from './roleManagers/commune/meleeDefender'
import { RemoteHarvester } from './roleManagers/remote/remoteSourceHarvester'
import { RemoteReserver } from './roleManagers/remote/remoteReserver'
import { RemoteDefender } from './roleManagers/remote/remoteDefender'
import { RemoteCoreAttacker } from './roleManagers/remote/remoteCoreAttacker'
import { RemoteDismantler } from './roleManagers/remote/remoteDismantler'
import { Scout } from './roleManagers/international/scout'
import { Vanguard } from './roleManagers/international/vanguard'
import { Antifa } from './roleManagers/antifa/antifa'
import { CommuneManager } from 'room/commune/communeManager'
import { RoomManager } from 'room/roomManager'
import { globalStatsUpdater } from 'international/statsManager'

// Construct managers

const managers: { [key in CreepRoles]: Function } = {
    meleeDefender: MeleeDefender.meleeDefenderManager,
    allyVanguard: AllyVanguard.allyVanguardManager,
    antifaRangedAttacker: Antifa.antifaManager,
    antifaAttacker: Antifa.antifaManager,
    antifaHealer: Antifa.antifaManager,
    antifaDismantler: Antifa.antifaManager,
    antifaDowngrader: Antifa.antifaManager,
    claimer: Claimer.claimerManager,
    remoteDefender: RemoteDefender.remoteDefenderManager,
    source1Harvester: SourceHarvester.sourceHarvesterManager,
    source2Harvester: SourceHarvester.sourceHarvesterManager,
    hauler: Hauler.haulerManager,
    maintainer: Maintainer.maintainerManager,
    fastFiller: FastFiller.fastFillerManager,
    hubHauler: HubHauler.hubHaulerManager,
    controllerUpgrader: ControllerUpgrader.controllerUpgraderManager,
    builder: Builder.builderManager,
    mineralHarvester: MineralHarvester.mineralHarvesterManager,
    remoteSourceHarvester0: RemoteHarvester.RemoteHarvesterManager,
    remoteSourceHarvester1: RemoteHarvester.RemoteHarvesterManager,
    remoteHauler: RemoteHauler.remoteHaulerManager,
    remoteReserver: RemoteReserver.remoteReserverManager,
    remoteCoreAttacker: RemoteCoreAttacker.remoteCoreAttackerManager,
    remoteDismantler: RemoteDismantler.remoteDismantlerManager,
    scout: Scout.scoutManager,
    vanguard: Vanguard.vanguardManager,
}

export class CreepRoleManager {
    roomManager: RoomManager

    constructor(roomManager: RoomManager) {
        this.roomManager = roomManager
    }

    public run() {
        const { room } = this.roomManager
        // If CPU logging is enabled, get the CPU used at the start

        if (Memory.CPULogging === true) var managerCPUStart = Game.cpu.getUsed()

        for (const role of creepRoles) this.runManager(role)

        // If CPU logging is enabled, log the CPU used by this manager

        if (Memory.CPULogging === true) {
            const cpuUsed = Game.cpu.getUsed() - managerCPUStart
            const cpuUsed2 = this.roomManager.room.myCreepsAmount ? cpuUsed / this.roomManager.room.myCreepsAmount : 0
            customLog(
                'Role Manager',
                `CPU: ${cpuUsed.toFixed(2)}, CPU Per Creep: ${cpuUsed2.toFixed(2)}`,
                myColors.white,
                myColors.lightBlue,
            )
            const statName: RoomCommuneStatNames = 'rolmcu'
            const statName2: RoomCommuneStatNames = 'rolmpccu'
            globalStatsUpdater(room.name, statName, cpuUsed)
            globalStatsUpdater(room.name, statName2, cpuUsed2)
        }
    }

    private runManager(role: CreepRoles) {
        const roleCPUStart = Game.cpu.getUsed()

        // Get the amount of creeps with the role

        const creepsOfRoleAmount = this.roomManager.room.myCreeps[role].length

        // If there are no creeps for this manager, iterate

        if (!this.roomManager.room.myCreeps[role].length) return

        // Run manager

        try {
            managers[role](this.roomManager.room, this.roomManager.room.myCreeps[role])
        } catch (err) {
            customLog(
                'Exception processing creep role: ' + role + ' in ' + this.roomManager.room.name + '. ',
                err + '\n' + (err as any).stack,
                myColors.white,
                myColors.red,
            )
        }

        // Log role stats

        customLog(
            `${role}s`,
            `Creeps: ${creepsOfRoleAmount}, CPU: ${(Game.cpu.getUsed() - roleCPUStart).toFixed(2)}, CPU Per Creep: ${(
                (Game.cpu.getUsed() - roleCPUStart) /
                creepsOfRoleAmount
            ).toFixed(2)}`,
            undefined,
        )
    }
}
