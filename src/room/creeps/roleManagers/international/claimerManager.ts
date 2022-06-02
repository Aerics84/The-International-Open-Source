import { claimRequestNeedsIndex } from 'international/constants'
import { Claimer } from '../../creepClasses'
import './claimerFunctions'

export function claimerManager(room: Room, creepsOfRole: string[]) {
     // Loop through the names of the creeps of the role

     for (const creepName of creepsOfRole) {
          // Get the creep using its name

          const creep: Claimer = Game.creeps[creepName]

          const claimTarget = Memory.rooms[creep.memory.communeName].claimRequest

          // If the creep has no claim target, stop

          if (!claimTarget) return

          creep.say(claimTarget)

          Memory.claimRequests[Memory.rooms[creep.memory.communeName].claimRequest].needs[
               claimRequestNeedsIndex.claimer
          ] = 0

          if (room.name === claimTarget) {
               creep.claimRoom()
               continue
          }

          // Otherwise if the creep is not in the claimTarget

          // Move to it

          creep.createMoveRequest({
               origin: creep.pos,
               goal: { pos: new RoomPosition(25, 25, claimTarget), range: 25 },
               avoidEnemyRanges: true,
               swampCost: 1,
               cacheAmount: 200,
               typeWeights: {
                    enemy: Infinity,
                    ally: Infinity,
                    keeper: Infinity,
               },
          })
     }
}
