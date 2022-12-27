import { customLog, scalePriority } from 'international/utils'
import { RoomManager } from './room'

export class ContainerManager {
    roomManager: RoomManager

    constructor(roomManager: RoomManager) {
        this.roomManager = roomManager
    }

    run() {
        this.runSourceContainers()

        if (this.roomManager.room.memory.T === 'remote') return

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

            this.roomManager.room.createRoomLogisticsRequest({
                target: container,
                type: 'transfer',
                threshold: container.store.getCapacity(),
                onlyFull: true,
                priority: scalePriority(container.store.getCapacity(), container.reserveStore.energy, 20),
            })

            this.roomManager.room.createRoomLogisticsRequest({
                target: container,
                threshold: container.store.getCapacity() * 0.6,
                maxAmount: container.reserveStore.energy * 0.6,
                onlyFull: true,
                type: 'offer',
                priority: scalePriority(container.store.getCapacity(), container.reserveStore.energy, 20, true),
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

        this.roomManager.room.createRoomLogisticsRequest({
            target: container,
            type: 'transfer',
            threshold: container.store.getCapacity() * 0.75,
            priority: scalePriority(container.store.getCapacity(), container.reserveStore.energy, 20),
        })
    }

    private runControllerLink() {
        const link = this.roomManager.room.controllerLink
        if (!link || this.roomManager.room.creepsFromRoom['hubHauler'].length > 0) return

        this.roomManager.room.createRoomLogisticsRequest({
            target: link,
            type: 'transfer',
            priority: scalePriority(link.store.getCapacity(), link.reserveStore.energy, 20),
        })
    }

    private runMineralContainer() {
        const container = this.roomManager.room.mineralContainer
        if (!container) return

        const resourceType = this.roomManager.room.mineral.mineralType

        this.roomManager.room.createRoomLogisticsRequest({
            target: container,
            resourceType,
            type: 'withdraw',
            onlyFull: true,
            priority: 20 + scalePriority(container.store.getCapacity(), container.reserveStore[resourceType], 20, true),
        })
    }
}
