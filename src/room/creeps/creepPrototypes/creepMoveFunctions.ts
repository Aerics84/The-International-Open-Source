import {
    defaultCreepSwampCost,
    defaultPlainCost,
    impassibleStructureTypes,
    myColors,
    offsetsByDirection,
    roomDimensions,
    TrafficPriorities,
} from 'international/constants'
import { internationalManager } from 'international/internationalManager'
import { areCoordsEqual, findAdjacentCoordsToCoord, findObjectWithID, getDirectionCoord, getRange, getRangeOfCoords } from 'international/utils'
import {
    packCoord,
    packPos,
    packPosList,
    packXYAsCoord,
    unpackCoord,
    unpackCoordAsPos,
    unpackPos,
    unpackPosList,
} from 'other/packrat'

PowerCreep.prototype.needsNewPath = Creep.prototype.needsNewPath = function (goalPos, cacheAmount, path) {
    // Inform true if there is no path

    if (!path) return true

    // Inform true if the path is at its end

    if (path.length === 0) return true

    // Inform true if there is no lastCache value in the creep's memory

    if (!this.memory.LC) return true

    // Inform true if the path is out of caching time

    if (!this.spawning && this.memory.LC + cacheAmount <= Game.time) return true

    // Inform true if the path isn't in the same room as the creep

    if (path[0].roomName !== this.room.name) return true

    if (!this.memory.GP) return true

    // Inform true if the creep's previous target isn't its current

    if (!areCoordsEqual(unpackPos(this.memory.GP), goalPos)) return true

    // If next pos in the path is not in range, inform true

    if (this.pos.getRangeTo(path[0]) > 1) return true

    // Otherwise inform false

    return false
}

PowerCreep.prototype.createMoveRequest = Creep.prototype.createMoveRequest = function (opts) {
    const { room } = this

    // Stop if the we know the creep won't move

    if (this.moveRequest) return false
    if (this.moved) return false
    if (this.fatigue > 0) return false
/*
    if (this.spawning) return false
 */
    // Assign default opts

    if (!opts.origin) opts.origin = this.pos
    if (!opts.cacheAmount) opts.cacheAmount = internationalManager.defaultMinCacheAmount

    let path: RoomPosition[]

    // If there is a path in the creep's memory

    if (this.memory.P) {
        path = unpackPosList(this.memory.P)

        // So long as the creep isn't standing on the first position in the path

        while (path[0] && areCoordsEqual(this.pos, path[0])) {
            // Remove the first pos of the path

            path.shift()
        }
    }

    // See if the creep needs a new path

    const needsNewPathResult = this.needsNewPath(opts.goals[0].pos, opts.cacheAmount, path)

    // If the creep need a new path, make one

    if (needsNewPathResult) {
        // Assign the creep to the opts

        opts.creep = this

        // Inform opts to avoid impassible structures

        opts.avoidImpassibleStructures = true
        opts.avoidStationaryPositions = true
        opts.avoidNotMyCreeps = true

        if (this.memory.R) {
            if (!opts.plainCost) opts.plainCost = defaultPlainCost * 2
            if (!opts.swampCost) opts.swampCost = defaultCreepSwampCost * 2
        }

        // Generate a new path

        path = room.advancedFindPath(opts)
        if (!path.length) return 'unpathable'

        // Limit the path's length to the cacheAmount

        path.splice(opts.cacheAmount)

        // Set the lastCache to the current tick

        this.memory.LC = Game.time

        // Show that a new path has been created

        if (Memory.roomVisuals)
            room.visual.text('NP', path[0], {
                align: 'center',
                color: myColors.lightBlue,
                opacity: 0.5,
                font: 0.5,
            })

        // So long as the creep isn't standing on the first position in the path

        while (path[0] && areCoordsEqual(this.pos, path[0])) {
            // Remove the first pos of the path

            path.shift()
        }
    }

    // Stop if there are no positions left in the path

    if (!path.length) return false

    // If visuals are enabled, visualize the path

    if (Memory.roomVisuals)
        path.length > 1
            ? room.pathVisual(path, 'lightBlue')
            : room.visual.line(this.pos, path[0], {
                  color: myColors.lightBlue,
                  opacity: 0.3,
              })

    if (path.length > 1) {
        if (Memory.roomVisuals) room.pathVisual(path, 'lightBlue')
    } else {
        if (Memory.roomVisuals)
            room.visual.line(this.pos, path[0], {
                color: myColors.lightBlue,
                opacity: 0.3,
            })
        delete this.memory.LC
    }

    // Set the creep's pathOpts to reflect this moveRequest's opts

    this.pathOpts = opts

    // Assign the goal's pos to the creep's goalPos

    this.memory.GP = packPos(opts.goals[0].pos)

    // Set the path in the creep's memory

    this.memory.P = packPosList(path)

    if (this.spawning) {

        const spawn = findObjectWithID(this.spawnID)

        const adjacentCoords = findAdjacentCoordsToCoord(spawn.pos)

        // Sort by distance from the first pos in the path

        adjacentCoords.sort((a, b) => {
            return getRangeOfCoords(a, path[0]) - getRangeOfCoords(b, path[0])
        })

        const directions: DirectionConstant[] = []

        for (const coord of adjacentCoords) {

            directions.push(getDirectionCoord(spawn.pos, coord))
        }

        spawn.spawning.setDirections(directions)

        return true
    }

    this.assignMoveRequest(path[0])

    // Inform success

    return true
}

PowerCreep.prototype.assignMoveRequest = Creep.prototype.assignMoveRequest = function (coord) {
    const { room } = this
    const packedCoord = packCoord(coord)

    this.moveRequest = packedCoord

    room.moveRequests.get(packedCoord)
        ? room.moveRequests.get(packedCoord).push(this.name)
        : room.moveRequests.set(packedCoord, [this.name])
}

PowerCreep.prototype.findShovePositions = Creep.prototype.findShovePositions = function (avoidPackedPositions) {
    const { room } = this

    const { x } = this.pos
    const { y } = this.pos

    const adjacentPackedPositions = [
        packXYAsCoord(x - 1, y - 1),
        packXYAsCoord(x - 1, y),
        packXYAsCoord(x - 1, y + 1),
        packXYAsCoord(x, y - 1),
        packXYAsCoord(x, y + 1),
        packXYAsCoord(x + 1, y - 1),
        packXYAsCoord(x + 1, y + 1),
        packXYAsCoord(x + 1, y - 1),
    ]

    const shovePositions = []

    const terrain = room.getTerrain()

    for (let index = 0; index < adjacentPackedPositions.length; index++) {
        const packedCoord = adjacentPackedPositions[index]

        if (room.creepPositions.get(packedCoord)) continue
        if (room.powerCreepPositions.get(packedCoord)) continue

        if (avoidPackedPositions.has(packedCoord)) continue

        const coord = unpackCoord(packedCoord)

        if (coord.x < 1 || coord.x >= roomDimensions - 1 || coord.y < 1 || coord.y >= roomDimensions - 1) continue

        const pos = new RoomPosition(coord.x, coord.y, room.name)

        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) continue

        // If the coord isn't safe to stand on

        if (room.enemyThreatCoords.has(packedCoord)) continue

        let hasImpassibleStructure

        for (const structure of pos.lookFor(LOOK_STRUCTURES)) {
            if (!impassibleStructureTypes.includes(structure.structureType)) continue

            hasImpassibleStructure = true
            break
        }

        if (hasImpassibleStructure) continue

        for (const cSite of pos.lookFor(LOOK_CONSTRUCTION_SITES)) {
            if (!cSite.my && !Memory.allyPlayers.includes(cSite.owner.username)) continue

            if (impassibleStructureTypes.includes(cSite.structureType)) {
                hasImpassibleStructure = true
                break
            }
        }

        if (hasImpassibleStructure) continue

        // If the shove positions must have viable ramparts

        if (this.memory.ROS) {
            let hasRampart

            for (const structure of pos.lookFor(LOOK_STRUCTURES)) {
                if (structure.structureType !== STRUCTURE_RAMPART) continue

                hasRampart = true
                break
            }

            if (!hasRampart) continue
        }

        shovePositions.push(pos)
    }

    return shovePositions
}

PowerCreep.prototype.shove = Creep.prototype.shove = function (shoverPos) {
    const { room } = this

    const shovePositions = this.findShovePositions(new Set([packCoord(shoverPos), packCoord(this.pos)]))
    if (!shovePositions.length) return false

    let goalPos: RoomPosition

    if (this.memory.GP) {
        goalPos = unpackPos(this.memory.GP)

        goalPos = shovePositions.sort((a, b) => {
            return getRange(goalPos.x, a.x, goalPos.y, a.y) - getRange(goalPos.x, b.x, goalPos.y, b.y)
        })[0]
    } else goalPos = shovePositions[0]

    const packedCoord = packCoord(goalPos)

    room.moveRequests.get(packedCoord)
        ? room.moveRequests.get(packedCoord).push(this.name)
        : room.moveRequests.set(packedCoord, [this.name])
    this.moveRequest = packedCoord

    if (Memory.roomVisuals)
        room.visual.circle(this.pos, {
            fill: '',
            stroke: myColors.red,
            radius: 0.5,
            strokeWidth: 0.15,
        })

    if (!this.moveRequest) return false

    if (Memory.roomVisuals) {
        room.visual.circle(this.pos, {
            fill: '',
            stroke: myColors.yellow,
            radius: 0.5,
            strokeWidth: 0.15,
            opacity: 0.3,
        })

        room.visual.line(this.pos, unpackCoordAsPos(this.moveRequest, this.room.name), {
            color: myColors.yellow,
        })
    }

    this.recurseMoveRequest()
    if (this.moved) return true

    return false
}

PowerCreep.prototype.runMoveRequest = Creep.prototype.runMoveRequest = function () {
    const { room } = this

    // If requests are not allowed for this pos, inform false

    if (!room.moveRequests.get(this.moveRequest)) return false

    if (this.move(this.pos.getDirectionTo(unpackCoordAsPos(this.moveRequest, room.name))) !== OK) return false

    if (Memory.roomVisuals)
        room.visual.rect(this.pos.x - 0.5, this.pos.y - 0.5, 1, 1, {
            fill: myColors.lightBlue,
            opacity: 0.2,
        })

    // Record where the creep is tying to move

    this.moved = this.moveRequest

    // Remove all moveRequests to the position

    room.moveRequests.delete(this.moveRequest)
    delete this.moveRequest

    // Remove record of the creep being on its current position

    /* room.creepPositions[packAsNum(this.pos)] = undefined */

    // Record the creep at its new position

    /* room.creepPositions[this.moveRequest] = this.name */

    return true
}

PowerCreep.prototype.recurseMoveRequest = Creep.prototype.recurseMoveRequest = function (queue = []) {
    const { room } = this

    if (!this.moveRequest) return
    if (!room.moveRequests.get(this.moveRequest)) {
        this.moved = 'moved'
        return
    }

    queue.push(this.name)

    // Try to find the name of the creep at pos

    const creepNameAtPos = room.creepPositions.get(this.moveRequest) || room.powerCreepPositions.get(this.moveRequest)

    // If there is no creep at the pos

    if (!creepNameAtPos) {
        // loop through each index of the queue, drawing visuals

        if (Memory.roomVisuals) {
            const moveRequestPos = unpackCoordAsPos(this.moveRequest, room.name)

            room.visual.rect(moveRequestPos.x - 0.5, moveRequestPos.y - 0.5, 1, 1, {
                fill: myColors.green,
                opacity: 0.2,
            })

            for (let index = queue.length - 1; index >= 0; index--) {
                const creep = Game.creeps[queue[index]] || Game.powerCreeps[queue[index]]

                room.visual.rect(creep.pos.x - 0.5, creep.pos.y - 0.5, 1, 1, {
                    fill: myColors.yellow,
                    opacity: 0.2,
                })
            }
        }

        // Otherwise, loop through each index of the queue

        for (let index = queue.length - 1; index >= 0; index--)
            // Have the creep run its moveRequesat

            (Game.creeps[queue[index]] || Game.powerCreeps[queue[index]]).runMoveRequest()

        return
    }

    const packedCoord = packCoord(this.pos)

    // Get the creepAtPos with the name

    const creepAtPos = Game.creeps[creepNameAtPos] || Game.powerCreeps[creepNameAtPos]

    if (creepAtPos.moved) {
        if (creepAtPos.moved === 'moved') {
            delete this.moveRequest
            this.moved = 'moved'
            return
        }

        if (creepAtPos.moved === 'yeild') {
            if (
                creepAtPos instanceof PowerCreep ||
                TrafficPriorities[this.role] + (this.freeStore() === 0 ? 0.1 : 0) >
                    TrafficPriorities[(creepAtPos as Creep).role] + (creepAtPos.freeStore() === 0 ? 0.1 : 0)
            ) {
                // Have the creep move to its moveRequest

                this.runMoveRequest()

                // Have the creepAtPos move to the creep and inform true

                creepAtPos.moveRequest = packedCoord
                room.moveRequests.set(packedCoord, [creepAtPos.name])
                creepAtPos.runMoveRequest()
                return
            }

            delete this.moveRequest
            this.moved = 'yeild'
            return
        }

        // If the creep is where the creepAtPos is trying to move to
        /*
        if (packedCoord === creepAtPos.moved) {
            if (Memory.roomVisuals)
                room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                    fill: myColors.purple,
                    opacity: 0.2,
                })

            this.runMoveRequest()
            return
        }
 */
        if (Memory.roomVisuals)
            room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                fill: myColors.white,
                opacity: 0.2,
            })

        // Otherwise, loop through each index of the queue

        for (let index = queue.length - 1; index >= 0; index--)
            // Have the creep run its moveRequest

            (Game.creeps[queue[index]] || Game.powerCreeps[queue[index]]).runMoveRequest()

        // loop through each index of the queue, drawing visuals

        if (Memory.roomVisuals)
            for (let index = queue.length - 1; index >= 0; index--)
                room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                    fill: myColors.yellow,
                    opacity: 0.2,
                })
        return
    }

    // If the creepAtPos has a moveRequest

    if (creepAtPos.moveRequest) {
        // If it's not valid

        if (!room.moveRequests.get(creepAtPos.moveRequest)) {
            /*
            if (Memory.roomVisuals)
                room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                    fill: myColors.teal,
                    opacity: 0.2,
                })

            // Have the creep move to its moveRequest

            this.runMoveRequest()

            // Have the creepAtPos move to the creep and inform true

            creepAtPos.moveRequest = packedCoord
            room.moveRequests.set(packedCoord, [creepAtPos.name])
            creepAtPos.runMoveRequest()
 */
            return
        }

        // If the creep's pos and the creepAtPos's moveRequests are aligned

        if (packedCoord === creepAtPos.moveRequest) {
            if (Memory.roomVisuals)
                room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                    fill: myColors.teal,
                    opacity: 0.2,
                })

            // Have the creep move to its moveRequest

            this.runMoveRequest()
            creepAtPos.runMoveRequest()
            return
        }

        // If both creeps moveRequests are aligned

        if (this.moveRequest === creepAtPos.moveRequest) {
            if (Memory.roomVisuals)
                room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                    fill: myColors.pink,
                    opacity: 0.2,
                })

            // Prefer the creep with the higher priority

            if (
                creepAtPos instanceof PowerCreep ||
                TrafficPriorities[this.role] + (this.freeStore() === 0 ? 0.1 : 0) >
                    TrafficPriorities[creepAtPos.role] + (creepAtPos.freeStore() === 0 ? 0.1 : 0)
            ) {
                this.runMoveRequest()

                delete creepAtPos.moveRequest
                creepAtPos.moved = 'moved'

                return
            }

            delete this.moveRequest
            this.moved = 'moved'

            creepAtPos.runMoveRequest()
            return
        }

        if (
            creepAtPos instanceof PowerCreep ||
            TrafficPriorities[this.role] + (this.freeStore() === 0 ? 0.1 : 0) >
                TrafficPriorities[creepAtPos.role] + (creepAtPos.freeStore() === 0 ? 0.1 : 0)
        ) {
            if (Memory.roomVisuals)
                room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                    fill: myColors.pink,
                    opacity: 0.2,
                })

            this.runMoveRequest()

            // Have the creepAtPos move to the creep and inform true

            creepAtPos.moveRequest = packedCoord
            room.moveRequests.set(packedCoord, [creepAtPos.name])
            creepAtPos.runMoveRequest()
            return
        }

        // If the creepAtPos is in the queue

        if (queue.includes(creepAtPos.name)) {
            // loop through each index of the queue

            for (let index = queue.length - 1; index >= 0; index--)
                // Have the creep run its moveRequest

                (Game.creeps[queue[index]] || Game.powerCreeps[queue[index]]).runMoveRequest()

            // loop through each index of the queue, drawing visuals

            if (Memory.roomVisuals)
                for (let index = queue.length - 1; index >= 0; index--)
                    room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
                        fill: myColors.yellow,
                        opacity: 0.2,
                    })

            return
        }

        creepAtPos.recurseMoveRequest(queue)
        return
    }

    // Otherwise if creepAtPos is fatigued, stop

    if (!(creepAtPos instanceof PowerCreep) && creepAtPos.fatigue > 0) return

    // Otherwise the creepAtPos has no moveRequest

    if (creepAtPos.shove(this.pos)) {
        this.runMoveRequest()
        return
    }

    if (Memory.roomVisuals)
        room.visual.rect(creepAtPos.pos.x - 0.5, creepAtPos.pos.y - 0.5, 1, 1, {
            fill: myColors.teal,
            opacity: 0.2,
        })

    // Have the creep move to its moveRequest

    this.runMoveRequest()

    // Have the creepAtPos move to the creep and inform true

    creepAtPos.moveRequest = packedCoord
    room.moveRequests.set(packedCoord, [creepAtPos.name])
    creepAtPos.runMoveRequest()
}

PowerCreep.prototype.avoidEnemyThreatCoords = Creep.prototype.avoidEnemyThreatCoords = function () {
    if (!this.room.enemyThreatCoords.has(packCoord(this.pos))) return false

    this.createMoveRequest({
        origin: this.pos,
        goals: [{ pos: this.pos, range: 5 }],
        flee: true,
    })

    return true
}
