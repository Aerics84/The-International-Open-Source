import { customColors, RemoteData } from 'international/constants'
import { getRange, randomTick } from 'international/utils'

export class RemoteCoreAttacker extends Creep {
    constructor(creepID: Id<Creep>) {
        super(creepID)
    }

    public get dying() {
        // Inform as dying if creep is already recorded as dying

        if (this._dying !== undefined) return this._dying

        // Stop if creep is spawning

        if (this.spawning) return false

        // If the creep's remaining ticks are more than the estimated spawn time, inform false

        if (this.ticksToLive > this.body.length * CREEP_SPAWN_TIME) return false

        // Record creep as dying

        return (this._dying = true)
    }

    preTickManager(): void {
        if (randomTick() && !this.getActiveBodyparts(MOVE)) this.suicide()

        const role = this.role as 'remoteCoreAttacker'

        if (!this.findRemote()) return
        if (this.dying) return

        // Reduce remote need

        Memory.rooms[this.memory.RN].data[RemoteData[role]] -= 1

        const commune = this.commune

        // Add the creep to creepsOfRemote relative to its remote

        if (commune.creepsOfRemote[this.memory.RN]) commune.creepsOfRemote[this.memory.RN][role].push(this.name)
    }

    /**
     * Finds a remote
     */
    findRemote?(): boolean {
        if (
            this.memory.RN &&
            Memory.rooms[this.memory.RN].T === 'remote' &&
            Memory.rooms[this.memory.RN].CN === this.commune.name
        )
            return true

        // Otherwise, get the creep's role

        const role = this.role as 'remoteCoreAttacker'

        // Get remotes by their efficacy

        const remoteNamesByEfficacy = this.commune.remoteNamesBySourceEfficacy

        // Loop through each remote name

        for (const roomName of remoteNamesByEfficacy) {
            // Get the remote's memory using its name

            const roomMemory = Memory.rooms[roomName]

            // If the needs of this remote are met, iterate

            if (roomMemory.data[RemoteData[role]] <= 0) continue

            // Otherwise assign the remote to the creep and inform true

            this.memory.RN = roomName
            roomMemory.data[RemoteData[role]] -= 1

            return true
        }

        // Inform false

        return false
    }

    /**
     * Find and attack cores
     */
    advancedAttackCores?(): boolean {
        const { room } = this

        // If there are no cores

        if (!room.structures.invaderCore.length) return false

        // Find the closest core

        const closestCore = room.structures.invaderCore[0]

        // If the creep at the core

        if (getRange(this.pos.x, closestCore.pos.x, this.pos.y, closestCore.pos.y) === 1) {
            this.say('🗡️C')

            this.attack(closestCore)
            return true
        }

        // Otherwise say the intention and create a moveRequest to the creep's harvestPos, and inform the attempt

        this.say('⏩C')

        this.createMoveRequest({
            origin: this.pos,
            goals: [{ pos: closestCore.pos, range: 1 }],
            avoidEnemyRanges: true,
        })

        return true
    }

    static remoteCoreAttackerManager(room: Room, creepsOfRole: string[]) {
        for (const creepName of creepsOfRole) {
            const creep: RemoteCoreAttacker = Game.creeps[creepName]

            // Try to find a remote

            if (!creep.findRemote()) {
                // If the room is the creep's commune

                if (room.name === creep.commune.name) {
                    // Advanced recycle and iterate

                    creep.advancedRecycle()
                    continue
                }

                // Otherwise, have the creep make a moveRequest to its commune and iterate

                creep.createMoveRequest({
                    origin: creep.pos,
                    goals: [
                        {
                            pos: creep.commune.anchor,
                            range: 5,
                        },
                    ],
                })

                continue
            }

            creep.say(creep.memory.RN)

            if (creep.advancedAttackCores()) continue

            // If the creep is its remote

            if (room.name === creep.memory.RN) {
                delete creep.memory.RN
                continue
            }

            // Otherwise, create a moveRequest to its remote

            creep.createMoveRequest({
                origin: creep.pos,
                goals: [
                    {
                        pos: new RoomPosition(25, 25, creep.memory.RN),
                        range: 25,
                    },
                ],
                typeWeights: {
                    enemy: Infinity,
                    ally: Infinity,
                    keeper: Infinity,
                    enemyRemote: Infinity,
                    allyRemote: Infinity,
                },
                avoidAbandonedRemotes: true,
            })
        }
    }
}
