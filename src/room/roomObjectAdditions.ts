import { findObjectWithID } from 'international/utils'

Object.defineProperties(RoomObject.prototype, {
    effectsData: {
        get() {
            if (this._effectsData) return this._effectsData

            this._effectsData = new Map()
            if (!this.effects) return this._effectsData

            for (const effectData of this.effects) {
                this._effectsData.set(effectData.effect, effectData)
            }

            return this._effectsData
        },
    },
    nextHits: {
        get(this: Structure<BuildableStructureConstant>) {
            if (this._nextHits) return this._nextHits

            return (this._nextHits = this.hits)
        },
        set(newEstimatedHits) {
            this._nextHits = newEstimatedHits
        },
    },
    /*
    nextStore: {
        get(this: AnyStoreStructure) {
            if (this._nextStore) return this._nextStore

            this._nextStore = {}

            for (const resource of RESOURCES_ALL) {

                this._nextStore[resource] = this.store[resource]
            }

            return this._nextStore
        },
    },
 */
    nextStore: {
        get(this: AnyStoreStructure) {
            if (this._nextStore) return this._nextStore

            const referenceStore = Object.assign({ parentID: this.id }, this.store)

            this._nextStore = new Proxy(referenceStore, {
                get(target: Partial<CustomStore>, resourceType: ResourceConstant) {
                    return target[resourceType] ?? 0
                },
                set(target: Partial<CustomStore>, resourceType: ResourceConstant, newAmount) {
                    // Update the change

                    target[resourceType] = newAmount

                    findObjectWithID(target.parentID)._usedReserveStore = newAmount - target[resourceType]
                    return true
                },
            })

            return this._nextStore
        },
    },
    usedNextStore: {
        get(this: RoomObject & { store?: StoreDefinition }) {
            if (this._usedNextStore !== undefined) return this._usedNextStore

            this._usedNextStore = 0
            const keys = Object.keys(this.nextStore)

            for (let i = 1; i < keys.length; i++) {

                this._usedNextStore += this.nextStore[keys[i] as ResourceConstant]
            }

            return this._usedNextStore
        },
    },
    freeNextStore: {
        get(this: RoomObject & { store?: StoreDefinition }) {
            return this.store.getCapacity() - this.usedNextStore
        },
    },
    reserveStore: {
        get(this: AnyStoreStructure) {
            if (this._reserveStore) return this._reserveStore

            const referenceStore = Object.assign({ parentID: this.id }, this.store)

            this._reserveStore = new Proxy(referenceStore, {
                get(target: Partial<CustomStore>, resourceType: ResourceConstant) {
                    return target[resourceType] ?? 0
                },
                set(target: Partial<CustomStore>, resourceType: ResourceConstant, newAmount) {
                    // Update the change

                    target[resourceType] = newAmount

                    findObjectWithID(target.parentID)._usedReserveStore = newAmount - target[resourceType]
                    return true
                },
            })

            return this._reserveStore
        },
    },
    usedReserveStore: {
        get(this: RoomObject & { store?: StoreDefinition }) {
            if (this._usedReserveStore !== undefined) return this._usedReserveStore

            this._usedReserveStore = 0
            const keys = Object.keys(this.reserveStore)

            for (let i = 1; i < keys.length; i++) {

                this._usedReserveStore += this.reserveStore[keys[i] as ResourceConstant]
            }

            return this._usedReserveStore
        },
    },
    freeReserveStore: {
        get(this: RoomObject & { store?: StoreDefinition }) {
            return this.store.getCapacity() - this.usedReserveStore
        },
    },
    /* reserveStore: {
        get(this: AnyStoreStructure) {
            if (this._reserveStore) return this._reserveStore

            this._reserveStore = {}

            for (const resource of RESOURCES_ALL) {

                this._reserveStore[resource] = this.store[resource]
            }

            return this._reserveStore
        },
    }, */
    reservePowers: {
        get() {
            if (this._reservePowers) return this._reservePowers

            return (this._reservePowers = new Set())
        },
    },
} as PropertyDescriptorMap & ThisType<RoomObject>)
