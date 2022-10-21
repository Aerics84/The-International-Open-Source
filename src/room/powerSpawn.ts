import { globalStatsUpdater } from 'international/statsManager'
import { CommuneManager } from './communeManager'
import { customLog } from '../international/utils'
import { internationalManager } from 'international/internationalManager'

export class PowerSpawnManager {
    communeManager: CommuneManager
    powerSpawn: StructurePowerSpawn

    constructor(communeManager: CommuneManager) {
        this.communeManager = communeManager
    }
    public run() {
        this.powerSpawn = this.communeManager.room.powerSpawn
        if (!this.powerSpawn) return

        this.process()
        this.advancedSpawn()
    }

    private process() {
        if (this.powerSpawn.store.getCapacity(RESOURCE_ENERGY) < POWER_SPAWN_ENERGY_RATIO) return
        if (!this.powerSpawn.store.getCapacity(RESOURCE_POWER)) return

        const result = this.powerSpawn.processPower()

        if (result === OK) globalStatsUpdater(this.powerSpawn.room.name, 'eop', POWER_SPAWN_ENERGY_RATIO)
    }

    private advancedSpawn() {

        for (let i = internationalManager.unspawnedPowerCreepNames.length; i > -1; i++) {

            const creep = Game.powerCreeps[internationalManager.unspawnedPowerCreepNames[i]]
            creep.spawn(this.powerSpawn)
            internationalManager.unspawnedPowerCreepNames.pop()
            return
        }
    }
}
