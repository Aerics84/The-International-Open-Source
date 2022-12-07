import { minerals } from 'international/constants'
import { CommuneManager } from './communeManager'
import { Hauler } from '../creeps/roleManagers/commune/hauler'
import { findObjectWithID, getRangeOfCoords } from 'international/utils'

const reactionCycleAmount = 5000

const reverseReactions: {
    [key in MineralCompoundConstant]?: (MineralConstant | MineralCompoundConstant)[]
} = {
    G: ['ZK', 'UL'],

    ZK: ['Z', 'K'],
    UL: ['U', 'L'],
    OH: ['H', 'O'],
    LH: ['L', 'H'],
    LO: ['L', 'O'],
    KO: ['K', 'O'],
    KH: ['K', 'H'],
    GH: ['G', 'H'],
    GO: ['G', 'O'],
    UO: ['U', 'O'],
    UH: ['U', 'H'],
    ZH: ['Z', 'H'],
    ZO: ['Z', 'O'],

    LH2O: ['LH', 'OH'],
    LHO2: ['LO', 'OH'],
    GH2O: ['GH', 'OH'],
    GHO2: ['GO', 'OH'],
    KHO2: ['KO', 'OH'],
    KH2O: ['KH', 'OH'],
    UH2O: ['UH', 'OH'],
    UHO2: ['UO', 'OH'],
    ZH2O: ['ZH', 'OH'],
    ZHO2: ['ZO', 'OH'],

    XLH2O: ['X', 'LH2O'],
    XLHO2: ['X', 'LHO2'],
    XGH2O: ['X', 'GH2O'],
    XGHO2: ['X', 'GHO2'],
    XKHO2: ['X', 'KHO2'],
    XKH2O: ['X', 'KH2O'],
    XUH2O: ['X', 'UH2O'],
    XUHO2: ['X', 'UHO2'],
    XZH2O: ['X', 'ZH2O'],
    XZHO2: ['X', 'ZHO2'],
}

const allCompounds: (MineralConstant | MineralCompoundConstant)[] = [...Object.keys(reverseReactions), ...minerals] as (
    | MineralConstant
    | MineralCompoundConstant
)[]

function decompose(compound: MineralConstant | MineralCompoundConstant): (MineralConstant | MineralCompoundConstant)[] {
    return reverseReactions[compound as MineralCompoundConstant]
}

const boostsInOrder: MineralBoostConstant[] = [
    // fatigue decrease speed

    RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
    RESOURCE_ZYNTHIUM_ALKALIDE,
    RESOURCE_ZYNTHIUM_OXIDE,

    // damage taken

    RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
    RESOURCE_GHODIUM_ALKALIDE,
    RESOURCE_GHODIUM_OXIDE,

    // heal and rangedHeal effectiveness

    RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
    RESOURCE_LEMERGIUM_ALKALIDE,
    RESOURCE_LEMERGIUM_OXIDE,

    // attack effectiveness

    RESOURCE_CATALYZED_UTRIUM_ACID,
    RESOURCE_UTRIUM_ACID,
    RESOURCE_UTRIUM_HYDRIDE,

    // rangedAttack and rangedMassAttack effectiveness

    RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
    RESOURCE_KEANIUM_ALKALIDE,
    RESOURCE_KEANIUM_OXIDE,

    // dismantle effectiveness

    RESOURCE_CATALYZED_ZYNTHIUM_ACID,
    RESOURCE_ZYNTHIUM_ACID,
    RESOURCE_ZYNTHIUM_HYDRIDE,

    // upgradeController effectiveness

    RESOURCE_CATALYZED_GHODIUM_ACID,
    RESOURCE_GHODIUM_ACID,
    RESOURCE_GHODIUM_HYDRIDE,

    // capacity

    RESOURCE_CATALYZED_KEANIUM_ACID,
    RESOURCE_KEANIUM_ACID,
    RESOURCE_KEANIUM_HYDRIDE,

    // repair and build effectiveness

    RESOURCE_CATALYZED_LEMERGIUM_ACID,
    RESOURCE_LEMERGIUM_ACID,
    RESOURCE_LEMERGIUM_HYDRIDE,

    // harvest effectiveness

    RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
    RESOURCE_UTRIUM_ALKALIDE,
    RESOURCE_UTRIUM_OXIDE,
]

export class LabManager {
    targetCompounds: { [key in MineralConstant | MineralCompoundConstant]?: number } = {
        KH: 15000,
        G: 10000,
        OH: 5000,
        [RESOURCE_CATALYZED_UTRIUM_ACID]: 5000,
        [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]: 5000,
        [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]: 5000,
        [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]: 5000,
        [RESOURCE_CATALYZED_LEMERGIUM_ACID]: 5000,
        [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: 5000,
        [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: 5000,
        [RESOURCE_CATALYZED_GHODIUM_ACID]: 5000,
    }

    deficits: { [key in MineralConstant | MineralCompoundConstant]?: number } = {}

    communeManager: CommuneManager
    outputRsc: MineralConstant | MineralCompoundConstant
    inputLab1Rsc: MineralConstant | MineralCompoundConstant
    inputLab2Rsc: MineralConstant | MineralCompoundConstant
    isReverse: boolean
    targetAmount: number
    inputLab1ID: Id<StructureLab>
    inputLab2ID: Id<StructureLab>
    private lastLayoutCheck: number
    private requestedBoosts: MineralBoostConstant[] = []
    private assignedBoosts: { [key in MineralBoostConstant]?: Id<StructureLab> }

    constructor(communeManager: CommuneManager) {
        this.communeManager = communeManager
    }

    //This is much like demand boost, but will return false if we don't have it, it can't be applied, etc.
    public acceptBoost(creep: Creep, boost: MineralBoostConstant): boolean {
        if (creep.ticksToLive < CREEP_LIFE_TIME - 100) return false

        if (creep.boosts[boost] > 0) return false

        const labId = this.assignedBoosts[boost]
        if (!labId) return false

        const lab = this.communeManager.structures.lab.find(lab => lab.id == labId)

        //See if the lab is ready to boost...
        if (lab.mineralType != boost) return false

        if (lab.mineralAmount < LAB_BOOST_MINERAL || lab.store.getUsedCapacity(RESOURCE_ENERGY) < LAB_BOOST_ENERGY)
            return false

        //This needs to see if the lab is fully ready to boost the creep.  This will work
        //  even if it partially boosts the creep.
        let result = lab.boostCreep(creep)

        if (result == OK) return false

        if (result == ERR_NOT_IN_RANGE) {
            creep.createMoveRequest({
                origin: creep.pos,
                goals: [
                    {
                        pos: lab.pos,
                        range: 1,
                    },
                ],
                avoidEnemyRanges: true,
            })
        } else {
            creep.message += 'BE' + result
        }

        return true
    }

    public demandBoost(creep: Creep, boost: MineralBoostConstant): boolean {
        if (creep.ticksToLive < CREEP_LIFE_TIME - 100) return false

        if (creep.boosts[boost] > 0) return false

        const labId = this.assignedBoosts[boost]
        if (!labId) return true

        const lab = this.communeManager.structures.lab.find(lab => lab.id == labId)

        //See if the lab is ready to boost...
        if (lab.mineralType != boost) return true

        //This needs to see if the lab is fully ready to boost the creep.  This will work
        //  even if it partially boosts the creep.
        let result = lab.boostCreep(creep)

        if (result == OK) return false

        if (result == ERR_NOT_IN_RANGE) {
            creep.createMoveRequest({
                origin: creep.pos,
                goals: [
                    {
                        pos: lab.pos,
                        range: 1,
                    },
                ],
                avoidEnemyRanges: true,
            })
        } else {
            creep.message += 'BE' + result
        }

        return true
    }

    // Checks to ensure all of the internal data is valid, populate it if it's not.
    private doLayoutCheck(): void {
        if (this.lastLayoutCheck + 1000 > Game.time) return

        this.lastLayoutCheck = Game.time

        if (this.inputLab1ID && this.inputLab2ID && this.inputLab1 && this.inputLab2) return

        this.inputLab1ID = null
        this.inputLab2ID = null

        const terminal = this.communeManager.room.terminal
        if (!terminal) return
        if (this.communeManager.structures.lab.length < 3) return

        //Sort the labs by the distance to the terminal, so that labs on the side of the hub are favored.

        const labs = this.communeManager.structures.lab.sort((a, b) => {
            return getRangeOfCoords(a.pos, terminal.pos) - getRangeOfCoords(b.pos, terminal.pos)
        })

        const inputLabIDs: Id<StructureLab>[] = []

        for (const lab of labs) {
            // We don't need more than 2 input labs

            if (inputLabIDs.length >= 2) break

            // We need the input lab to be in range of all labs

            const labsInRangeAmount = labs.filter(structure => getRangeOfCoords(lab.pos, structure.pos) <= 2).length
            if (labsInRangeAmount < labs.length) continue

            inputLabIDs.push(lab.id)
        }

        this.inputLab1ID = inputLabIDs[0]
        this.inputLab2ID = inputLabIDs[1]
    }

    public get inputLab1(): StructureLab {
        return findObjectWithID(this.inputLab1ID)
    }

    public get inputLab2(): StructureLab {
        return findObjectWithID(this.inputLab2ID)
    }

    public get outputLabs(): StructureLab[] {
        let boostingLabs = Object.values(this.assignedBoosts)

        return this.communeManager.structures.lab.filter(
            lab => lab.id != this.inputLab1ID && lab.id != this.inputLab2ID && !boostingLabs.includes(lab.id),
        )
    }

    public get all(): StructureLab[] {
        return this.communeManager.structures.lab
    }

    private isProperlyLoaded(): boolean {
        if (
            (this.inputLab1.mineralType == this.inputLab1Rsc || this.inputLab1.mineralType == null) &&
            (this.inputLab2.mineralType == this.inputLab2Rsc || this.inputLab2.mineralType == null)
        )
            return true
        return false
    }

    run() {
        if (!this.communeManager.room.storage || !this.communeManager.room.terminal) return

        this.doLayoutCheck()

        this.assignBoosts()
        this.manageReactions()
    }

    manageReactions() {
        // Make sure we have

        if (!this.inputLab1ID) return

        this.communeManager.room.errorVisual(this.inputLab1.pos, true)
        this.communeManager.room.errorVisual(this.inputLab2.pos, true)

        this.updateDeficits()
        this.setCurrentReaction()

        if (!this.isProperlyLoaded) return

        this.runReactions()
    }

    assignBoosts() {
        this.assignedBoosts = {}
        for (let compund of boostsInOrder) {
            if (this.requestedBoosts.includes(compund)) {
                //Special cases: an input lab can do double-duty as a boosting lab.
                if (this.inputLab1Rsc === compund) {
                    this.assignedBoosts[compund] = this.inputLab1ID
                    continue
                }
                if (this.inputLab2Rsc === compund) {
                    this.assignedBoosts[compund] = this.inputLab2ID
                    continue
                }

                //Otherwise grab a lab that's not the input labs, and not a boosting lab.
                let boostingLabs = Object.values(this.assignedBoosts)
                let freelabs = this.communeManager.structures.lab.filter(
                    lab => lab.id != this.inputLab1ID && lab.id != this.inputLab2ID && !boostingLabs.includes(lab.id),
                )

                if (freelabs.length == 0 && this.inputLab1ID && !boostingLabs.includes(this.inputLab1ID)) {
                    freelabs = [this.inputLab1]
                }

                if (freelabs.length == 0 && this.inputLab2ID && !boostingLabs.includes(this.inputLab2ID)) {
                    freelabs = [this.inputLab2]
                }

                if (freelabs.length > 0) {
                    //If there's a free lab that already has the correct compound, that'll be our boosting lab.
                    let pickedLab = freelabs.find(lab => lab.mineralType == compund)
                    if (!pickedLab) pickedLab = freelabs[0]

                    this.assignedBoosts[compund] = pickedLab.id
                } else {
                    //We needed a free lab, and couldn't find one.  Give up on assigning additional boosts.
                    return
                }
            }
        }
    }

    get reactionAmountRemaining() {
        if (this.isReverse) {
            return this.amount(this.outputRsc) - this.targetAmount
        } else {
            let minMaterial = _.min(_.map(decompose(this.outputRsc), comp => this.amount(comp)))
            return Math.min(minMaterial, this.targetAmount - this.amount(this.outputRsc))
        }
    }

    isValid(): boolean {
        return this.outputLabs.length > 0 && this.inputLab1 != null && this.inputLab2 != null
    }

    reactionPossible(): boolean {
        if (!this.isValid()) return false
        if (!this.outputRsc) return false

        if (!this.isReverse) {
            if (!this.inputLab1.mineralType || !this.inputSatisfied(this.inputLab1, this.inputLab1Rsc)) return false
            if (!this.inputLab2.mineralType || !this.inputSatisfied(this.inputLab2, this.inputLab2Rsc)) return false
        }

        return true
    }

    inputSatisfied(inputLab: StructureLab, inputRsc: MineralConstant | MineralCompoundConstant): boolean {
        if (!inputLab) return false
        return !inputLab.mineralType || inputLab.mineralType === inputRsc
    }

    inputFull(inputLab: StructureLab) {
        if (!inputLab) return false
        if (!inputLab.mineralType) return false
        return (
            inputLab.store.getFreeCapacity(inputLab.mineralType) === 0 &&
            inputLab.store.getUsedCapacity(inputLab.mineralType) >= this.reactionAmountRemaining
        )
    }

    runReactions() {
        if (!this.reactionPossible()) return false

        for (const output of this.outputLabs) {
            if (this.isReverse) {
                if (output.mineralType == this.outputRsc && output.store[this.outputRsc] >= LAB_REACTION_AMOUNT)
                    output.reverseReaction(this.inputLab1, this.inputLab2) //Reverse is here so the outputLabs line up with the expected locations
            } else {
                output.runReaction(this.inputLab1, this.inputLab2)
            }
        }
        return true
    }

    chainDecompose(compound: MineralConstant | MineralCompoundConstant, amount: number) {
        this.deficits[compound] = amount + (this.deficits[compound] || 0)
        amount = Math.min(amount, this.deficits[compound])
        amount = Math.max(amount, 0)

        let decomps = decompose(compound)

        for (var c in decomps) {
            this.chainDecompose(decomps[c], amount)
        }
    }

    /**
     * Figures out what we have
     */
    private updateDeficits() {
        //We don't need to update this super often, so save CPU, this is midly expensive.
        if (Game.time % 10 != 0) return

        this.deficits = {}
        for (let key of allCompounds) {
            this.deficits[key as MineralConstant | MineralCompoundConstant] = -this.amount(
                key as MineralConstant | MineralCompoundConstant,
            )
        }
        for (let compound in this.targetCompounds) {
            //console.log('updateDeficits ' + this.communeManager.room.name + ': ' + compound)
            var amount = Math.max(0, this.targetCompounds[compound as MineralConstant | MineralCompoundConstant]) // this.communeManager.roomai.trading.maxStorageAmount(compound))

            this.chainDecompose(compound as MineralConstant | MineralCompoundConstant, amount)
        }

        for (let key of Object.keys(this.deficits)) {
            if (this.deficits[key as MineralConstant | MineralCompoundConstant] < 0)
                this.deficits[key as MineralConstant | MineralCompoundConstant] = 0
        }
    }

    private setupReaction(outputRsc: MineralCompoundConstant, targetAmount: number, reverse: boolean) {
        this.outputRsc = outputRsc
        if (outputRsc == null) {
            this.inputLab1Rsc = null
            this.inputLab2Rsc = null
        } else {
            this.inputLab1Rsc = reverseReactions[outputRsc][0]
            this.inputLab2Rsc = reverseReactions[outputRsc][1]
        }
        this.isReverse = reverse
        this.targetAmount = targetAmount
    }

    snoozeUntil: number
    replanAt: number

    private setCurrentReaction() {
        if (this.snoozeUntil && this.snoozeUntil > Game.time) return
        if (!this.isCurrentReactionFinished() && this.replanAt > Game.time) return

        let nextReaction = this.findNextReaction()
        //was...   But I kept getting negative values in the targetAmount.  I think I jusut need to get to the cycleAmount instead.
        //  Even then, that doesn't seem quite right.  Maybe it's correct for intermediates, but not for the end products.
        //  The second argtument is what amount level will cause the reactor to stop.
        //this.setupReaction(nextReaction, reactionCycleAmount - this.amount(nextReaction));
        if (nextReaction) {
            this.setupReaction(
                nextReaction.type,
                this.amount(nextReaction.type) + Math.min(reactionCycleAmount, nextReaction.amount),
                false,
            )
        } else if (this.communeManager.room.storage.store['GO'] > 1000) {
            this.setupReaction('GO', 1000, true)
        } else if (this.communeManager.room.storage.store['LO'] > 500) {
            this.setupReaction('LO', 500, true)
        } else {
            this.setupReaction(null, 0, false)
            this.snoozeUntil = Game.time + 30
        }
        //ReplanAt prevents some reactions that could run for a super long time, like breaking down 10000's of a compound,
        this.replanAt = Game.time + 3000
    }

    private isCurrentReactionFinished(): boolean {
        let currentReaction = this.outputRsc
        if (!currentReaction) return true
        if (this.isReverse) {
            if (this.amount(currentReaction) <= this.targetAmount) return true
            return false
        } else {
            if (_.any(decompose(currentReaction), r => this.amount(r) < LAB_REACTION_AMOUNT)) return true
            return this.amount(currentReaction) >= this.targetAmount
        }
    }

    private chainFindNextReaction(
        target: MineralConstant | MineralCompoundConstant,
        targetAmount: number,
    ): { type: MineralCompoundConstant; amount: number } {
        let nextReaction = target
        let missing = _.filter(decompose(nextReaction), r => this.amount(r) < LAB_REACTION_AMOUNT)
        //console.log(targetAmount + ':' + target + ' missing: ' + JSON.stringify(missing))
        if (missing.length === 0) return { type: target as MineralCompoundConstant, amount: targetAmount }

        // filter uncookable resources (e.g. H). Can't get those using reactions.
        missing = _.filter(decompose(nextReaction), r => this.amount(r) < targetAmount)
        missing = _.filter(missing, r => decompose(r))
        for (let target of missing) {
            var result = this.chainFindNextReaction(target, targetAmount - this.amount(target))
            if (result) return result
        }
        return null
    }

    private findNextReaction(): { type: MineralCompoundConstant; amount: number } {
        let targets = _.sortBy(
            _.filter(
                Object.keys(this.targetCompounds),
                v => this.deficits[v as MineralConstant | MineralCompoundConstant] > 0,
            ),
            v => -this.deficits[v as MineralConstant | MineralCompoundConstant],
        )

        for (let target of targets) {
            var result = this.chainFindNextReaction(
                target as MineralConstant | MineralCompoundConstant,
                this.deficits[target as MineralConstant | MineralCompoundConstant],
            )
            if (result) return result
        }

        return null
    }

    private setupInputLab(
        creep: Hauler,
        inputLab: StructureLab,
        inputRsc: MineralConstant | MineralCompoundConstant,
    ): boolean {
        if (this.isReverse) {
            if (
                (inputLab.mineralType != null && inputLab.mineralType != inputRsc) ||
                inputLab.usedStore(inputRsc) >= creep.store.getFreeCapacity()
            ) {
                let amount = Math.min(creep.freeStore(), inputLab.store[inputLab.mineralType])

                if (amount != 0) creep.createReservation('withdraw', inputLab.id, amount, inputLab.mineralType)
                if (amount + creep.usedStore(inputLab.mineralType) != 0)
                    creep.createReservation(
                        'transfer',
                        this.communeManager.room.storage?.id,
                        amount + creep.store[inputLab.mineralType],
                        inputLab.mineralType,
                    )
            }
        } else {
            if (inputLab.mineralType == inputRsc || inputLab.mineralType == null) {
                let source =
                    this.communeManager.room?.storage.store[inputRsc] >
                    this.communeManager.room?.terminal.store[inputRsc]
                        ? this.communeManager.room.storage
                        : this.communeManager.room.terminal

                //This logic isn't quite correct, but it works, but I need to debug this at some point.
                //  If the creep starts with any of the desired resources, send the resources to it to free up the creep.
                //  Only if we have a creepful, should we withdraw from the source container.  This works, but isn't the minimum code to do it.
                let amount = Math.min(
                    creep.store.getFreeCapacity(),
                    source.store[inputRsc],
                    inputLab.store.getFreeCapacity(inputRsc),
                )
                amount = Math.max(amount, 0)
                //Do the transfer if there's a bunch of free space in the lab, not necessiarly if there's a bunch in storage, that way
                //  We react all the resources laying around.
                if (inputLab.store.getFreeCapacity(inputRsc) >= creep.store.getCapacity()) {
                    creep.createReservation('withdraw', source.id, amount, inputRsc)
                    creep.createReservation('transfer', inputLab.id, amount, inputRsc)
                }
            } else {
                let amount = Math.min(creep.store.getFreeCapacity(), inputLab.store[inputLab.mineralType])
                creep.createReservation('withdraw', inputLab.id, amount, inputLab.mineralType)
                creep.createReservation(
                    'transfer',
                    this.communeManager.room.storage?.id,
                    amount + creep.store[inputLab.mineralType],
                    inputLab.mineralType,
                )
            }
        }

        if (creep.memory.Rs?.length > 0) return true
        return false
    }

    private setupOutputLab(creep: Hauler, outputLab: StructureLab): boolean {
        if (this.isReverse) {
            if (outputLab.mineralType == this.outputRsc || outputLab.mineralType == null) {
                let source =
                    this.communeManager.room?.storage.store[this.outputRsc] >
                    this.communeManager.room?.terminal.store[this.outputRsc]
                        ? this.communeManager.room.storage
                        : this.communeManager.room.terminal

                let amount = Math.min(
                    creep.store.getFreeCapacity(),
                    source.store[this.outputRsc],
                    outputLab.store.getFreeCapacity(this.outputRsc),
                )
                amount = Math.max(amount, 0)

                if (outputLab.store.getFreeCapacity(this.outputRsc) >= creep.store.getCapacity()) {
                    creep.createReservation('withdraw', source.id, amount, this.outputRsc)
                    creep.createReservation('transfer', outputLab.id, amount, this.outputRsc)
                }
            } else {
                let amount = Math.min(creep.store.getFreeCapacity(), outputLab.store[outputLab.mineralType])
                creep.createReservation('withdraw', outputLab.id, amount, outputLab.mineralType)
                creep.createReservation(
                    'transfer',
                    this.communeManager.room.storage?.id,
                    amount + creep.store[outputLab.mineralType],
                    outputLab.mineralType,
                )
            }
        } else {
            if (
                (outputLab.mineralType != null && outputLab.mineralType != this.outputRsc) ||
                outputLab.usedStore(this.outputRsc) >= creep.store.getFreeCapacity()
            ) {
                let amount = Math.min(creep.freeStore(), outputLab.store[outputLab.mineralType])

                if (amount != 0) creep.createReservation('withdraw', outputLab.id, amount, outputLab.mineralType)
                if (amount + creep.usedStore(outputLab.mineralType) != 0)
                    creep.createReservation(
                        'transfer',
                        this.communeManager.room.storage?.id,
                        amount + creep.store[outputLab.mineralType],
                        outputLab.mineralType,
                    )
            }
        }

        if (creep.memory.Rs?.length > 0) return true
        return false
    }

    setupBoosterLab(creep: Hauler, lab: StructureLab, compound: MineralBoostConstant): boolean {
        if (lab.mineralType == compound || lab.mineralType == null) {
            //The 3*2 below are because it takes 30 compound and 20 energy to boost a creep, so make sure it's loaded
            //in a reasonably ratioed sequence.
            if (
                lab.store[RESOURCE_ENERGY] / 30 < lab.store[compound] / 20 &&
                lab.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getCapacity()
            ) {
                let source =
                    this.communeManager.room?.storage.store[RESOURCE_ENERGY] >
                    this.communeManager.room?.terminal.store[RESOURCE_ENERGY]
                        ? this.communeManager.room.storage
                        : this.communeManager.room.terminal

                creep.createReservation('withdraw', source.id, creep.store.getCapacity(), RESOURCE_ENERGY)
                creep.createReservation('transfer', lab.id, creep.store.getCapacity(), RESOURCE_ENERGY)
            } else {
                let source: AnyStoreStructure =
                    this.communeManager.room?.storage.store[compound] >
                    this.communeManager.room?.terminal.store[compound]
                        ? this.communeManager.room.storage
                        : this.communeManager.room.terminal

                if (source.store[compound] == 0) {
                    source = this.outputLabs.find(lab => lab.mineralType == compound && lab.mineralAmount > 100)
                }

                if (source) {
                    let amount = Math.min(
                        creep.store.getFreeCapacity(),
                        source.store[compound],
                        lab.store.getFreeCapacity(compound),
                    )
                    amount = Math.max(amount, 0)

                    if (lab.store.getFreeCapacity(compound) >= creep.store.getCapacity()) {
                        creep.createReservation('withdraw', source.id, amount, compound)
                        creep.createReservation('transfer', lab.id, amount, compound)
                    }
                }
            }
        } else {
            //Unload the wrong material
            let amount = Math.min(creep.store.getFreeCapacity(), lab.store[lab.mineralType])
            creep.createReservation('withdraw', lab.id, amount, lab.mineralType)
            creep.createReservation(
                'transfer',
                this.communeManager.room.storage?.id,
                amount + creep.store[lab.mineralType],
                lab.mineralType,
            )
        }

        if (creep.memory.Rs?.length > 0) return true
        return false
    }

    private amount(resource: MineralConstant | MineralCompoundConstant): number {
        if (!resource) return 0
        let storageAmount = this.communeManager.room.storage.store[resource] || 0
        let terminalAmount =
            (this.communeManager.room.terminal && this.communeManager.room.terminal.store[resource]) || 0
        let labAmount = _.sum(
            _.filter(this.all, l => l.mineralType == resource),
            l => l.mineralAmount,
        )

        //Sum of haulers as well.
        let haulerAmount = _.sum(
            this.communeManager.room.myCreeps.hauler,
            crName => Game.creeps[crName]?.store[resource] || 0,
        )

        return storageAmount + terminalAmount + labAmount + haulerAmount
    }

    public requestBoost(compound: MineralBoostConstant) {
        if (!this.requestedBoosts.includes(compound)) this.requestedBoosts.push(compound)
    }

    generateHaulingReservation(creep: Hauler) {
        if (this.assignedBoosts) {
            for (const compound in this.assignedBoosts) {
                const labId = this.assignedBoosts[compound as MineralBoostConstant]
                const lab = this.communeManager.structures.lab.find(lab => lab.id == labId)
                if (this.setupBoosterLab(creep, lab, compound as MineralBoostConstant)) return
            }
        }

        if (!this.inputLab1ID || !this.inputLab2ID) return

        //Priortize the worstly loaded lab.
        if (this.inputLab2.store[this.inputLab2Rsc] > this.inputLab1.store[this.inputLab1Rsc]) {
            if (this.isReverse) {
                if (this.setupInputLab(creep, this.inputLab2, this.inputLab2Rsc)) return
                if (this.setupInputLab(creep, this.inputLab1, this.inputLab1Rsc)) return
            } else {
                if (this.setupInputLab(creep, this.inputLab1, this.inputLab1Rsc)) return
                if (this.setupInputLab(creep, this.inputLab2, this.inputLab2Rsc)) return
            }
        } else {
            if (this.isReverse) {
                if (this.setupInputLab(creep, this.inputLab1, this.inputLab1Rsc)) return
                if (this.setupInputLab(creep, this.inputLab2, this.inputLab2Rsc)) return
            } else {
                if (this.setupInputLab(creep, this.inputLab2, this.inputLab2Rsc)) return
                if (this.setupInputLab(creep, this.inputLab1, this.inputLab1Rsc)) return
            }
        }
        for (const output of this.outputLabs) if (this.setupOutputLab(creep, output)) return
    }
}
