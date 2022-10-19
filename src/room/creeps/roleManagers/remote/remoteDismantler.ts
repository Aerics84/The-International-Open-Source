import { RemoteData } from 'international/constants'
import { findObjectWithID, getRange, randomTick } from 'international/utils'

export class RemoteDismantler extends Creep {
    constructor(creepID: Id<Creep>) {
        super(creepID)
    }

    public get dying() {
        // Inform as dying if creep is already recorded as dying

        if (this._dying) return true

        // Stop if creep is spawning

        if (!this.ticksToLive) return false

        // If the creep's remaining ticks are more than the estimated spawn time, inform false

        if (this.ticksToLive > this.body.length * CREEP_SPAWN_TIME) return false

        // Record creep as dying

        return (this._dying = true)
    }

    preTickManager() {
        if (randomTick() && !this.getActiveBodyparts(MOVE)) this.suicide()
        if (!this.memory.RN) return

        const role = this.role as 'remoteDismantler'

        // If the creep's remote no longer is managed by its commune

        if (!Memory.rooms[this.commune.name].remotes.includes(this.memory.RN)) {
            // Delete it from memory and try to find a new one

            delete this.memory.RN
            if (!this.findRemote()) return
        }

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
        const creep = this

        // If the creep already has a remote, inform true

        if (creep.memory.RN) return true

        // Otherwise, get the creep's role

        const role = creep.role as 'remoteDismantler'

        // Get remotes by their efficacy

        const remoteNamesByEfficacy = creep.commune?.remoteNamesBySourceEfficacy

        // Loop through each remote name

        for (const roomName of remoteNamesByEfficacy) {
            // Get the remote's memory using its name

            const roomMemory = Memory.rooms[roomName]

            // If the needs of this remote are met, iterate

            if (roomMemory.data[RemoteData[role]] <= 0) continue

            // Otherwise assign the remote to the creep and inform true

            creep.memory.RN = roomName
            roomMemory.data[RemoteData[role]] -= 1

            return true
        }

        // Inform false

        return false
    }

    /**
     * Find and attack structures
     */
    advancedDismantle?(): boolean {
        const { room } = this

        let target
        let range

        if (this.memory.dismantleTarget) {
            target = findObjectWithID(this.memory.dismantleTarget)

            if (target) {
                range = getRange(this.pos.x, target.pos.x, this.pos.y, target.pos.y)

                if (range > 1) {
                    this.createMoveRequest({
                        origin: this.pos,
                        goals: [
                            {
                                pos: target.pos,
                                range: 1,
                            },
                        ],
                        avoidEnemyRanges: true,
                    })

                    return true
                }

                this.dismantle(target)
                return true
            }
        }

        let targets: Structure[] = room.actionableWalls

        targets = targets.concat(room.dismantleTargets)

        if (targets.length) {
            target = this.pos.findClosestByPath(targets, { ignoreRoads: true, ignoreCreeps: true })

            range = getRange(this.pos.x, target.pos.x, this.pos.y, target.pos.y)

            if (range > 1) {
                this.createMoveRequest({
                    origin: this.pos,
                    goals: [
                        {
                            pos: target.pos,
                            range: 1,
                        },
                    ],
                    avoidEnemyRanges: true,
                })

                return true
            }

            this.memory.dismantleTarget = target.id

            this.dismantle(target)
            return true
        }

        return false
    }

    static remoteDismantlerManager(room: Room, creepsOfRole: string[]) {
        for (const creepName of creepsOfRole) {
            const creep: RemoteDismantler = Game.creeps[creepName]

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
                            pos: new RoomPosition(25, 25, creep.commune.name),
                            range: 25,
                        },
                    ],
                })

                continue
            }

            creep.say(creep.memory.RN)

            // If the creep is its remote

            if (room.name === creep.memory.RN) {
                if (creep.advancedDismantle()) continue
                continue
            }

            // Otherwise, create a moveRequest to its remote

            if (creep.createMoveRequest({
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
            }) === 'unpathable') {

                Memory.rooms[creep.memory.RN].data[RemoteData.abandon] = 1500
            }
        }
    }
}
