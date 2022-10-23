import { AllyCreepRequestData, ClaimRequestData, myColors } from 'international/constants'
import { advancedFindDistance, customLog } from 'international/utils'
import { internationalManager } from 'international/internationalManager'
import { CommuneManager } from './communeManager'

export class AllyCreepRequestManager {
    communeManager: CommuneManager

    constructor(communeManager: CommuneManager) {
        this.communeManager = communeManager
    }
    public run() {
        const { room } = this.communeManager

        if (!room.structures.spawn.length) return

        if (!room.memory.allyCreepRequest) return

        // If CPU logging is enabled, get the CPU used at the start

        if (Memory.CPULogging) var managerCPUStart = Game.cpu.getUsed()

        /*
        if (Memory.allyCreepRequests[this.memory.allyCreepRequest].abandon > 0) {
            delete this.memory.allyCreepRequest
            return
        }
        */

        Memory.allyCreepRequests[room.memory.allyCreepRequest].data[AllyCreepRequestData.allyVanguard] = 20

        const request = Game.rooms[room.memory.allyCreepRequest]

        if (!request) return

        // If the room is owned and not by an ally, delete the request

        if (
            request.controller &&
            request.controller.owner &&
            !Memory.allyPlayers.includes(request.controller.owner.username)
        ) {
            Memory.allyCreepRequests[room.memory.allyCreepRequest].data[AllyCreepRequestData.allyVanguard] += 1
            return
        }

        // If there are no longer ally construction sites

        if (!request.allyCSites.length) {
            delete Memory.allyCreepRequests[room.memory.allyCreepRequest]
            delete room.memory.allyCreepRequest

            return
        }

        if (request.enemyCreeps.length) {
            Memory.allyCreepRequests[room.memory.allyCreepRequest].data[AllyCreepRequestData.abandon] = 20000
            Memory.allyCreepRequests[room.memory.allyCreepRequest].data[AllyCreepRequestData.allyVanguard] = 0

            delete room.memory.allyCreepRequest
        }

        // If CPU logging is enabled, log the CPU used by this manager

        if (Memory.CPULogging)
            customLog(
                'Ally Creep Request Manager',
                (Game.cpu.getUsed() - managerCPUStart).toFixed(2),
                undefined,
                myColors.lightGrey,
            )
    }
}

Room.prototype.allyCreepRequestManager = function () {}
