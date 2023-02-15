import { controllerDowngradeUpgraderNeed, customColors } from 'international/constants'
import { customLog, scalePriority } from 'international/utils'
import { RoomManager } from './room'

export class ContainerManager {
    roomManager: RoomManager

    constructor(roomManager: RoomManager) {
        this.roomManager = roomManager
    }

    runRemote() {
        this.runSourceContainers()
    }

    runCommune() {
        this.runSourceContainers()
        this.runFastFillerContainers()
        this.runControllerContainer()
        this.runControllerLink()
        this.runMineralContainer()
    }

    private runFastFillerContainers() {
        if (!this.roomManager.room.myCreeps.fastFiller.length) return

        const fastFillerContainers = [
            this.roomManager.room.fastFillerContainerLeft,
            this.roomManager.room.fastFillerContainerRight,
        ]

        for (const container of fastFillerContainers) {
            if (!container) continue
            if (container.reserveStore.energy > container.store.getCapacity() * 0.8) continue

            this.roomManager.room.createRoomLogisticsRequest({
                target: container,
                type: 'transfer',
                onlyFull: true,
                priority: scalePriority(container.store.getCapacity(), container.reserveStore.energy, 20),
            })

            if (container.reserveStore.energy < container.store.getCapacity() * 0.6) continue

            this.roomManager.room.createRoomLogisticsRequest({
                target: container,
                maxAmount: container.reserveStore.energy * 0.5,
                onlyFull: true,
                type: 'offer',
                priority: scalePriority(container.store.getCapacity(), container.reserveStore.energy, 10, true),
            })
        }
    }

    private runSourceContainers() {
        for (const container of this.roomManager.room.sourceContainers) {
            this.roomManager.room.createRoomLogisticsRequest({
                target: container,
                type: 'withdraw',
                onlyFull: true,
                priority: scalePriority(container.store.getCapacity(), container.reserveStore.energy, 20, true),
            })
        }
    }

    private runControllerContainer() {
        const container = this.roomManager.room.controllerContainer
        if (!container) return

        if (container.usedReserveStore > container.store.getCapacity() * 0.75) return

        const priority = this.roomManager.room.controller.ticksToDowngrade < 2500 ? -0.1 : 15

        this.roomManager.room.createRoomLogisticsRequest({
            target: container,
            type: 'transfer',
            priority: priority + scalePriority(container.store.getCapacity(), container.reserveStore.energy, 20),
        })
    }

    private runControllerLink() {
        const link = this.roomManager.room.controllerLink
        if (!link || this.roomManager.room.creepsFromRoom['hubHauler'].length > 0) return
        if (link.reserveStore.energy > link.store.getCapacity(RESOURCE_ENERGY) * 0.8) return

        this.roomManager.room.createRoomLogisticsRequest({
            target: link,
            type: 'transfer',
            priority: 12.5 + scalePriority(link.store.getCapacity(RESOURCE_ENERGY), link.reserveStore.energy, 20),
        })
    }

    private runMineralContainer() {
        const container = this.roomManager.room.mineralContainer
        if (!container) return

        for (const res of Object.keys(container.store)) {
            this.roomManager.room.createRoomLogisticsRequest({
                target: container,
                resourceType: res as ResourceConstant,
                type: 'withdraw',
                onlyFull: true,
                priority:
                    5 +
                    scalePriority(
                        container.store.getCapacity(),
                        container.reserveStore[res as ResourceConstant],
                        20,
                        true,
                    ),
            })
        }
    }
}
