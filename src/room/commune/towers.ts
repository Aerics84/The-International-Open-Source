import { myColors } from 'international/constants'
import { globalStatsUpdater } from 'international/statsManager'
import { customLog, findObjectWithID, randomTick } from 'international/utils'
import { CommuneManager } from './communeManager'

export class TowerManager {
    communeManager: CommuneManager
    actionableTowerIDs: Id<StructureTower>[]

    public constructor(communeManager: CommuneManager) {
        this.communeManager = communeManager
    }

    public run() {
        // If CPU logging is enabled, get the CPU used at the start

        if (Memory.CPULogging) var managerCPUStart = Game.cpu.getUsed()

        const towers = this.communeManager.structures.tower
        if (!towers.length) {
            this.communeManager.room.towerInferiority = this.communeManager.room.enemyAttackers.length > 0
            return
        }

        this.actionableTowerIDs = []

        for (const tower of towers) {
            if (tower.store.energy < TOWER_ENERGY_COST) continue

            this.actionableTowerIDs.push(tower.id)
        }

        if (!this.attackEnemyCreeps()) return
        if (!this.healCreeps()) return
        if (!this.repairRamparts()) return
        if (!this.repairGeneral()) return

        // If CPU logging is enabled, log the CPU used by this manager

        if (Memory.CPULogging)
            customLog('Tower Manager', (Game.cpu.getUsed() - managerCPUStart).toFixed(2), undefined, myColors.lightGrey)
    }

    findAttackTarget() {
        const { room } = this.communeManager

        if (room.towerAttackTarget) return room.towerAttackTarget

        const attackTargets = room.enemyCreeps.filter(function (creep) {
            return !creep.isOnExit
        })

        if (!attackTargets.length) return false

        // Find the enemyCreep the towers can hurt the most

        let highestDamage = 0

        for (const enemyCreep of room.enemyCreeps) {
            if (enemyCreep.isOnExit) continue

            const towerDamage = enemyCreep.towerDamage
            if (towerDamage < highestDamage) continue

            room.towerAttackTarget = enemyCreep
            highestDamage = towerDamage
        }

        if (!room.towerAttackTarget) {

            this.createPowerTasks()
            room.towerInferiority = true
            return false
        }

        // If we seem to be under attack from a swarm, record that the tower needs help

        if (attackTargets.length >= 15) {

            this.createPowerTasks()
            room.towerInferiority = true
        }

        return room.towerAttackTarget
    }

    attackEnemyCreeps() {

        if (this.communeManager.room.flags.disableTowerAttacks) {
            this.communeManager.room.towerInferiority = this.communeManager.room.enemyAttackers.length > 0
            return true
        }

        if (!this.actionableTowerIDs.length) return false

        const attackTarget = this.findAttackTarget()
        if (!attackTarget) return true

        for (let i = this.actionableTowerIDs.length - 1; i >= 0; i--) {
            const tower = findObjectWithID(this.actionableTowerIDs[i])

            if (tower.attack(attackTarget) !== OK) continue

            this.actionableTowerIDs.splice(i, 1)
        }

        return true
    }

    findHealTarget() {
        const { room } = this.communeManager

        let healTargets: (Creep | PowerCreep)[]

        if (room.enemyAttackers.length) {
            healTargets = room.myDamagedCreeps.filter(creep => {
                return creep.role === 'meleeDefender' || creep.role === 'maintainer'
            })

            return healTargets[0]
        }
        // Construct heal targets from my and allied damaged creeps in the this

        healTargets = room.myDamagedCreeps.concat(room.allyDamagedCreeps)
        healTargets = healTargets.concat(room.myDamagedPowerCreeps)

        return healTargets[0]
    }

    healCreeps() {
        if (!this.actionableTowerIDs.length) return false

        const healTarget = this.findHealTarget()
        if (!healTarget) return true

        for (let i = this.actionableTowerIDs.length - 1; i >= 0; i--) {
            const tower = findObjectWithID(this.actionableTowerIDs[i])

            if (tower.heal(healTarget) !== OK) continue

            this.actionableTowerIDs.splice(i, 1)
        }

        return true
    }

    findRampartRepairTargets() {
        return this.communeManager.structures.rampart.filter(function (rampart) {
            return rampart.hits <= RAMPART_DECAY_AMOUNT
        })
    }

    repairRamparts() {
        if (!this.actionableTowerIDs.length) return false

        const repairTargets = this.findRampartRepairTargets()
        if (!repairTargets.length) return true

        for (let i = this.actionableTowerIDs.length - 1; i >= 0; i--) {
            const tower = findObjectWithID(this.actionableTowerIDs[i])

            const target = repairTargets[repairTargets.length - 1]
            if (tower.repair(target) !== OK) continue

            globalStatsUpdater(this.communeManager.room.name, 'eorwr', TOWER_ENERGY_COST)

            repairTargets.pop()

            this.actionableTowerIDs.splice(i, 1)
        }

        return true
    }

    findGeneralRepairTargets() {
        let structures: Structure[] = this.communeManager.structures.spawn
        structures = structures.concat(this.communeManager.structures.tower)

        return structures
    }

    repairGeneral() {
        if (!this.actionableTowerIDs.length) return false
        if (!randomTick(100)) return true

        const structures = this.findGeneralRepairTargets()
        if (!structures.length) return true

        for (let i = this.actionableTowerIDs.length - 1; i >= 0; i--) {
            const tower = findObjectWithID(this.actionableTowerIDs[i])

            const target = structures[structures.length - 1]

            if (tower.repair(target) !== OK) continue

            structures.pop()

            this.actionableTowerIDs.splice(i, 1)
        }

        return true
    }

    createPowerTasks() {

        if (!this.communeManager.room.myPowerCreepsAmount) return

        for (const tower of this.communeManager.structures.tower) {

            this.communeManager.room.createPowerTask(tower, PWR_OPERATE_TOWER, 1)
        }
    }
}
