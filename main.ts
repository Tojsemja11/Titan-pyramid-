// TITAN PYRAMID — 100 x 100 Minecraft Education MakeCode project
// Type "pyramid" in game chat. The player marks the centered build origin.

const BASE_SIZE = 100
const TOTAL_HEIGHT = 101
const BODY_LAYERS = 100
const GOLD_START_LAYER = 90
const SHELL_THICKNESS = 3
const FOUNDATION_CHUNK_DEPTH = 16
const CAVITY_CHUNK_EDGE = 64
const CAVITY_CHUNK_HEIGHT = 8
const ENTRANCE_HALF_WIDTH = 7
const TUNNEL_LENGTH = 25
const HALL_HALF_SIZE = 24
const MAX_WORLD_COORD = 29999984
// Current Bedrock vertical range. Adjust for an older/custom world if needed.
const MIN_BUILD_Y = -64
const MAX_BUILD_Y = 319

let centerX = 0
let centerZ = 0
let baseY = 0
let isBuilding = false
let cancelBuild = false

function absMinX(): number { return centerX - BASE_SIZE / 2 }
function absMaxX(): number { return absMinX() + BASE_SIZE - 1 }
function absMinZ(): number { return centerZ - BASE_SIZE / 2 }
function absMaxZ(): number { return absMinZ() + BASE_SIZE - 1 }

function validBuildSpace(): boolean {
    const p = player.position()
    centerX = Math.floor(p.getValue(Axis.X))
    centerZ = Math.floor(p.getValue(Axis.Z))
    // player.position() is at the player's feet; put the foundation one block below them.
    baseY = Math.floor(p.getValue(Axis.Y)) - 1
    const minX = absMinX()
    const maxX = absMaxX()
    const minZ = absMinZ()
    const maxZ = absMaxZ()
    const topY = baseY + TOTAL_HEIGHT - 1

    if (minX < -MAX_WORLD_COORD || maxX > MAX_WORLD_COORD ||
        minZ < -MAX_WORLD_COORD || maxZ > MAX_WORLD_COORD) {
        player.say("TITAN PYRAMID cancelled: the 100 x 100 footprint crosses the world coordinate limit. Move closer to the world center.")
        return false
    }
    if (baseY < MIN_BUILD_Y || topY > MAX_BUILD_Y) {
        player.say("TITAN PYRAMID cancelled: Y " + baseY + ".." + topY + " is outside configured build height " + MIN_BUILD_Y + ".." + MAX_BUILD_Y + ".")
        return false
    }
    player.say("Space check passed: X " + minX + ".." + maxX + ", Z " + minZ + ".." + maxZ + ", Y " + baseY + ".." + topY + ". Use a backed-up Creative world with clear space.")
    return true
}

function fillAt(block: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    if (!cancelBuild) {
        blocks.fill(block, world(x1, y1, z1), world(x2, y2, z2), FillOperation.Replace)
    }
    loops.pause(1)
}

function placeAt(block: number, dx: number, y: number, dz: number) {
    if (!cancelBuild) {
        blocks.place(block, world(centerX + dx, y, centerZ + dz))
    }
    loops.pause(1)
}

function buildFoundation(sandstone: number) {
    const minX = absMinX()
    const maxX = absMaxX()
    const minZ = absMinZ()
    const maxZ = absMaxZ()
    // 100 x 1 x 16 = at most 1,600 blocks per fill.
    for (let z = minZ; z <= maxZ; z += FOUNDATION_CHUNK_DEPTH) {
        const zEnd = Math.min(z + FOUNDATION_CHUNK_DEPTH - 1, maxZ)
        fillAt(sandstone, minX, baseY, z, maxX, baseY, zEnd)
        if (cancelBuild) return
    }
}

function clearCavity() {
    const minX = absMinX() + SHELL_THICKNESS
    const maxX = absMaxX() - SHELL_THICKNESS
    const minZ = absMinZ() + SHELL_THICKNESS
    const maxZ = absMaxZ() - SHELL_THICKNESS
    const top = baseY + BODY_LAYERS - 1
    // 64 x 8 x 64 = 32,768 blocks; boundary chunks are smaller.
    for (let y = baseY + 1; y <= top; y += CAVITY_CHUNK_HEIGHT) {
        const yEnd = Math.min(y + CAVITY_CHUNK_HEIGHT - 1, top)
        for (let x = minX; x <= maxX; x += CAVITY_CHUNK_EDGE) {
            const xEnd = Math.min(x + CAVITY_CHUNK_EDGE - 1, maxX)
            for (let z = minZ; z <= maxZ; z += CAVITY_CHUNK_EDGE) {
                const zEnd = Math.min(z + CAVITY_CHUNK_EDGE - 1, maxZ)
                fillAt(AIR, x, y, z, xEnd, yEnd, zEnd)
                if (cancelBuild) return
            }
        }
    }
}

function buildShell(sandstone: number, quartz: number, goldBlock: number) {
    const minX0 = absMinX()
    const maxX0 = absMaxX()
    const minZ0 = absMinZ()
    const maxZ0 = absMaxZ()
    const tunnelMinX = centerX - ENTRANCE_HALF_WIDTH
    const tunnelMaxX = centerX + ENTRANCE_HALF_WIDTH

    for (let layer = 1; layer < BODY_LAYERS; layer++) {
        const y = baseY + layer
        // Each horizontal setback happens every two vertical blocks.
        const inset = Math.floor(layer / 2)
        const minX = minX0 + inset
        const maxX = maxX0 - inset
        const minZ = minZ0 + inset
        const maxZ = maxZ0 - inset
        const material = layer >= GOLD_START_LAYER ? goldBlock : sandstone
        const width = maxX - minX + 1

        // The final narrow courses become solid so the pyramid closes cleanly.
        if (width <= SHELL_THICKNESS * 2) {
            fillAt(material, minX, y, minZ, maxX, y, maxZ)
            if (cancelBuild) return
            continue
        }
        const innerMinX = minX + SHELL_THICKNESS
        const innerMaxX = maxX - SHELL_THICKNESS

        // Stepped sandstone perimeter; every side retreats by one block per two levels.
        fillAt(material, minX, y, minZ, minX + SHELL_THICKNESS - 1, y, maxZ)
        fillAt(material, maxX - SHELL_THICKNESS + 1, y, minZ, maxX, y, maxZ)
        fillAt(material, innerMinX, y, minZ, innerMaxX, y, minZ + SHELL_THICKNESS - 1)
        if (layer <= 9) {
            if (innerMinX <= tunnelMinX - 1) {
                fillAt(material, innerMinX, y, maxZ - SHELL_THICKNESS + 1, tunnelMinX - 1, y, maxZ)
            }
            if (tunnelMaxX + 1 <= innerMaxX) {
                fillAt(material, tunnelMaxX + 1, y, maxZ - SHELL_THICKNESS + 1, innerMaxX, y, maxZ)
            }
        } else {
            fillAt(material, innerMinX, y, maxZ - SHELL_THICKNESS + 1, innerMaxX, y, maxZ)
        }
        // Thin quartz belts make the stepped outside read as deliberate architectural courses.
        if (layer < GOLD_START_LAYER && layer % 16 == 0) {
            fillAt(quartz, minX, y, minZ, maxX, y, minZ)
            fillAt(quartz, minX, y, maxZ, maxX, y, maxZ)
            fillAt(quartz, minX, y, minZ, minX, y, maxZ)
            fillAt(quartz, maxX, y, minZ, maxX, y, maxZ)
        }
        if (layer % 8 == 0) {
            player.say("Stepped shell: level " + layer + " of " + (BODY_LAYERS - 1) + ". Type stop to cancel.")
        }
        if (cancelBuild) return
    }
    // A centered 2 x 2 gold cap keeps the summit symmetric on the even 100-block base.
    if (!cancelBuild) fillAt(goldBlock, centerX - 1, baseY + TOTAL_HEIGHT - 1, centerZ - 1,
        centerX, baseY + TOTAL_HEIGHT - 1, centerZ)
}

function buildEntrance(sandstone: number, quartz: number, modernLight: number, goldBlock: number) {
    const zStart = absMaxZ() - TUNNEL_LENGTH + 1
    const zEnd = absMaxZ()
    const bottom = baseY + 1
    const wallTop = baseY + 9
    // 15-wide, 9-high passage joins the outside entrance to the central hall.
    fillAt(sandstone, centerX - 8, bottom, zStart, centerX - 8, wallTop, zEnd)
    fillAt(sandstone, centerX + 8, bottom, zStart, centerX + 8, wallTop, zEnd)
    fillAt(sandstone, centerX - 8, baseY + 10, zStart, centerX + 8, baseY + 10, zEnd)
    fillAt(quartz, centerX - 9, baseY + 1, absMaxZ() - 2, centerX - 9, baseY + 11, absMaxZ() - 2)
    fillAt(quartz, centerX + 9, baseY + 1, absMaxZ() - 2, centerX + 9, baseY + 11, absMaxZ() - 2)
    fillAt(quartz, centerX - 10, baseY + 12, absMaxZ() - 2, centerX + 10, baseY + 12, absMaxZ() - 2)
    fillAt(goldBlock, centerX - 2, baseY + 12, absMaxZ() - 2, centerX + 2, baseY + 12, absMaxZ() - 2)
    for (let z = zStart + 3; z < zEnd; z += 6) {
        fillAt(modernLight, centerX, baseY + 9, z, centerX, baseY + 9, z)
    }
}

function buildCentralHall(sandstone: number, quartz: number, modernLight: number, goldBlock: number,
    carpet: number, oakFence: number, oakSlab: number, oakStairs: number,
    bookshelves: number, lectern: number, chest: number, barrel: number,
    craftingTable: number, furnace: number, enchantingTable: number) {
    const h = HALL_HALF_SIZE
    const south = centerZ + h
    const north = centerZ - h
    const west = centerX - h
    const east = centerX + h
    const low = baseY + 1
    const high = baseY + 9

    // Main hall connects to the two side lounges and all four bedroom doors.
    // West/east doors lead to the living room and kitchen wings.
    fillAt(sandstone, west, low, north, west + 1, high, centerZ - 3)
    fillAt(sandstone, west, low, centerZ + 3, west + 1, high, south)
    fillAt(sandstone, west, baseY + 3, centerZ - 2, west + 1, high, centerZ + 2)
    fillAt(sandstone, east - 1, low, north, east, high, centerZ - 3)
    fillAt(sandstone, east - 1, low, centerZ + 3, east, high, south)
    fillAt(sandstone, east - 1, baseY + 3, centerZ - 2, east, high, centerZ + 2)

    // Two north doors and two south bedroom doors; the main entrance stays centered.
    fillAt(sandstone, west + 2, low, north, centerX - 16, baseY + 2, north + 1)
    fillAt(sandstone, centerX - 11, low, north, centerX + 11, baseY + 2, north + 1)
    fillAt(sandstone, centerX + 16, low, north, east - 2, baseY + 2, north + 1)
    fillAt(sandstone, west + 2, baseY + 3, north, east - 2, high, north + 1)

    fillAt(sandstone, west + 2, low, south, centerX - 16, baseY + 2, south)
    fillAt(sandstone, centerX - 12, low, south, centerX - ENTRANCE_HALF_WIDTH - 1, baseY + 2, south)
    fillAt(sandstone, centerX + ENTRANCE_HALF_WIDTH + 1, low, south, centerX + 11, baseY + 2, south)
    fillAt(sandstone, centerX + 16, low, south, east - 2, baseY + 2, south)
    fillAt(sandstone, west + 2, baseY + 3, south, east - 2, high, south)

    // Main hall ceiling has a central opening for the spiral stair to the galleries.
    fillAt(sandstone, west, baseY + 10, north, east, baseY + 10, centerZ - 7)
    fillAt(sandstone, west, baseY + 10, centerZ + 7, east, baseY + 10, south)
    fillAt(sandstone, west, baseY + 10, centerZ - 6, centerX - 7, baseY + 10, centerZ + 6)
    fillAt(sandstone, centerX + 7, baseY + 10, centerZ - 6, east, baseY + 10, centerZ + 6)

    // A carpet ring frames the stairwell; the walking path from the entrance stays open.
    fillAt(carpet, centerX - 9, baseY + 1, centerZ - 9, centerX + 9, baseY + 1, centerZ - 7)
    fillAt(carpet, centerX - 9, baseY + 1, centerZ + 7, centerX + 9, baseY + 1, centerZ + 9)
    fillAt(carpet, centerX - 9, baseY + 1, centerZ - 6, centerX - 7, baseY + 1, centerZ + 6)
    fillAt(carpet, centerX + 7, baseY + 1, centerZ - 6, centerX + 9, baseY + 1, centerZ + 6)
    fillAt(goldBlock, centerX - 10, baseY + 1, centerZ - 10, centerX + 10, baseY + 1, centerZ - 10)
    fillAt(goldBlock, centerX - 10, baseY + 1, centerZ + 10, centerX + 10, baseY + 1, centerZ + 10)
    fillAt(goldBlock, centerX - 10, baseY + 1, centerZ - 9, centerX - 10, baseY + 1, centerZ + 9)
    fillAt(goldBlock, centerX + 10, baseY + 1, centerZ - 9, centerX + 10, baseY + 1, centerZ + 9)
    // A carpet aisle connects the monumental south entrance to the central medallion.
    fillAt(carpet, centerX - 3, baseY + 1, centerZ + 7, centerX + 3, baseY + 1, centerZ + 22)
    // Gold inlay frames the medallion without covering the walking path.
    fillAt(goldBlock, centerX - 7, baseY + 1, centerZ - 7, centerX + 7, baseY + 1, centerZ - 7)
    fillAt(goldBlock, centerX - 7, baseY + 1, centerZ + 7, centerX + 7, baseY + 1, centerZ + 7)
    fillAt(goldBlock, centerX - 7, baseY + 1, centerZ - 6, centerX - 7, baseY + 1, centerZ + 6)
    fillAt(goldBlock, centerX + 7, baseY + 1, centerZ - 6, centerX + 7, baseY + 1, centerZ + 6)
    for (let dx = -21; dx <= 20; dx += 41) {
        for (let dz = -21; dz <= 20; dz += 41) {
            fillAt(quartz, centerX + dx, low, centerZ + dz, centerX + dx + 1, baseY + 9, centerZ + dz + 1)
        }
    }

    // Recessed sea-lantern ceiling grid and a central hanging chandelier.
    fillAt(modernLight, centerX, baseY + 9, centerZ, centerX, baseY + 9, centerZ)
    for (let dx = -18; dx <= 18; dx += 12) {
        for (let dz = -18; dz <= 18; dz += 12) {
            fillAt(modernLight, centerX + dx, baseY + 9, centerZ + dz, centerX + dx, baseY + 9, centerZ + dz)
        }
    }
    fillAt(oakFence, centerX, baseY + 6, centerZ, centerX, baseY + 8, centerZ)
    fillAt(modernLight, centerX - 1, baseY + 8, centerZ - 1, centerX + 1, baseY + 8, centerZ + 1)
    placeAt(modernLight, 0, baseY + 9, 0)

    // Wall lights repeat symmetrically; the south doorway remains clear.
    for (let offset = -16; offset <= 16; offset += 16) {
        placeAt(modernLight, -23, baseY + 6, offset)
        placeAt(modernLight, 23, baseY + 6, offset)
        placeAt(modernLight, offset, baseY + 6, -23)
        if (offset != 0) placeAt(modernLight, offset, baseY + 6, 23)
    }

    // Four furnished oak tables with fence legs, slab tops, and stair chairs.
    for (let tx = -12; tx <= 12; tx += 24) {
        for (let tz = -10; tz <= 10; tz += 20) {
            fillAt(oakFence, centerX + tx - 1, baseY + 1, centerZ + tz - 1, centerX + tx + 1, baseY + 1, centerZ + tz + 1)
            fillAt(oakSlab, centerX + tx - 1, baseY + 2, centerZ + tz - 1, centerX + tx + 1, baseY + 2, centerZ + tz + 1)
            placeAt(oakStairs, tx - 2, baseY + 1, tz)
            placeAt(oakStairs, tx + 2, baseY + 1, tz)
            placeAt(oakStairs, tx, baseY + 1, tz - 2)
            placeAt(oakStairs, tx, baseY + 1, tz + 2)
        }
    }

    // North-side dais and a quartz throne with back and arm rests.
    fillAt(sandstone, centerX - 7, baseY + 1, centerZ - 22, centerX + 7, baseY + 1, centerZ - 17)
    fillAt(quartz, centerX - 2, baseY + 2, centerZ - 21, centerX + 2, baseY + 2, centerZ - 19)
    fillAt(quartz, centerX - 2, baseY + 3, centerZ - 22, centerX + 2, baseY + 5, centerZ - 22)
    fillAt(quartz, centerX - 3, baseY + 3, centerZ - 21, centerX - 3, baseY + 4, centerZ - 19)
    fillAt(quartz, centerX + 3, baseY + 3, centerZ - 21, centerX + 3, baseY + 4, centerZ - 19)
    fillAt(enchantingTable, centerX, baseY + 2, centerZ - 14, centerX, baseY + 2, centerZ - 14)

    // Bookshelves and lecterns on the west library side.
    fillAt(bookshelves, centerX - 21, baseY + 1, centerZ - 12, centerX - 20, baseY + 4, centerZ - 6)
    fillAt(bookshelves, centerX - 21, baseY + 1, centerZ + 6, centerX - 20, baseY + 4, centerZ + 12)
    placeAt(lectern, -17, baseY + 1, -9)
    placeAt(lectern, -17, baseY + 1, 9)

    // East-side workshop: workbenches, furnaces, chests, and barrels.
    for (let z = -12; z <= 12; z += 8) {
        placeAt(craftingTable, 19, baseY + 1, z)
        placeAt(furnace, 21, baseY + 1, z)
        placeAt(chest, 19, baseY + 1, z + 2)
        placeAt(barrel, 21, baseY + 1, z + 2)
    }
}

function buildSideRooms(sandstone: number, quartz: number, modernLight: number, warmCarpet: number,
    oakFence: number, oakSlab: number, oakStairs: number, bookshelves: number,
    chest: number, barrel: number, craftingTable: number, furnace: number) {
    const low = baseY + 1
    const top = baseY + 6

    // West living room; the inner wall has a three-wide opening to the main hall.
    fillAt(sandstone, centerX - 43, low, centerZ - 21, centerX - 43, top, centerZ + 21)
    fillAt(sandstone, centerX - 26, low, centerZ - 21, centerX - 26, baseY + 2, centerZ - 2)
    fillAt(sandstone, centerX - 26, low, centerZ + 2, centerX - 26, baseY + 2, centerZ + 21)
    fillAt(sandstone, centerX - 26, baseY + 3, centerZ - 21, centerX - 26, top, centerZ + 21)
    fillAt(sandstone, centerX - 43, low, centerZ - 21, centerX - 26, top, centerZ - 21)
    fillAt(sandstone, centerX - 43, low, centerZ + 21, centerX - 26, top, centerZ + 21)

    // East kitchen and dining room, mirrored to keep the plan balanced.
    fillAt(sandstone, centerX + 43, low, centerZ - 21, centerX + 43, top, centerZ + 21)
    fillAt(sandstone, centerX + 26, low, centerZ - 21, centerX + 26, baseY + 2, centerZ - 2)
    fillAt(sandstone, centerX + 26, low, centerZ + 2, centerX + 26, baseY + 2, centerZ + 21)
    fillAt(sandstone, centerX + 26, baseY + 3, centerZ - 21, centerX + 26, top, centerZ + 21)
    fillAt(sandstone, centerX + 26, low, centerZ - 21, centerX + 43, top, centerZ - 21)
    fillAt(sandstone, centerX + 26, low, centerZ + 21, centerX + 43, top, centerZ + 21)

    // Soft rugs, bookcases, and a low coffee table make the west wing a lounge.
    fillAt(warmCarpet, centerX - 41, low, centerZ - 8, centerX - 29, low, centerZ + 8)
    fillAt(bookshelves, centerX - 42, low, centerZ - 17, centerX - 41, baseY + 4, centerZ - 11)
    fillAt(bookshelves, centerX - 42, low, centerZ + 11, centerX - 41, baseY + 4, centerZ + 17)
    for (let z = -6; z <= 6; z += 3) placeAt(oakStairs, -39, low, z)
    fillAt(oakFence, centerX - 34, low, centerZ - 3, centerX - 31, low, centerZ + 3)
    fillAt(oakSlab, centerX - 34, baseY + 2, centerZ - 3, centerX - 31, baseY + 2, centerZ + 3)
    placeAt(modernLight, -42, baseY + 5, -7)
    placeAt(modernLight, -42, baseY + 5, 7)

    // Quartz worktop with crafting, cooking, and pantry storage in the east wing.
    fillAt(quartz, centerX + 34, low, centerZ - 17, centerX + 41, low, centerZ - 13)
    fillAt(oakSlab, centerX + 34, baseY + 2, centerZ - 17, centerX + 41, baseY + 2, centerZ - 13)
    placeAt(craftingTable, 39, low, -15)
    placeAt(furnace, 37, low, -15)
    placeAt(chest, 35, low, -15)
    placeAt(barrel, 35, low, -13)
    fillAt(oakFence, centerX + 29, low, centerZ + 3, centerX + 33, low, centerZ + 5)
    fillAt(oakSlab, centerX + 29, baseY + 2, centerZ + 3, centerX + 33, baseY + 2, centerZ + 5)
    fillAt(warmCarpet, centerX + 28, low, centerZ + 8, centerX + 39, low, centerZ + 16)
    placeAt(oakStairs, 28, low, 4)
    placeAt(oakStairs, 34, low, 4)
    placeAt(modernLight, 42, baseY + 5, -7)
    placeAt(modernLight, 42, baseY + 5, 7)
}

function buildBedroom(sandstone: number, quartz: number, modernLight: number, carpet: number,
    oakFence: number, oakSlab: number, oakStairs: number, bookshelves: number,
    chest: number, bedBlock: number,
    x1: number, x2: number, z1: number, z2: number, doorOnSouth: boolean) {
    const roomX = Math.floor((x1 + x2) / 2)
    const roomZ = Math.floor((z1 + z2) / 2)
    const low = baseY + 1
    const wallTop = baseY + 5
    const doorX = roomX

    // Four separate enclosed rooms, each with a two-block-high doorway facing the hall.
    fillAt(sandstone, centerX + x1, low, centerZ + z1, centerX + x1, wallTop, centerZ + z2)
    fillAt(sandstone, centerX + x2, low, centerZ + z1, centerX + x2, wallTop, centerZ + z2)
    if (doorOnSouth) {
        fillAt(sandstone, centerX + x1, low, centerZ + z1, centerX + x2, wallTop, centerZ + z1)
        fillAt(sandstone, centerX + x1, baseY + 3, centerZ + z2, centerX + x2, wallTop, centerZ + z2)
        fillAt(sandstone, centerX + x1, low, centerZ + z2, centerX + doorX - 2, baseY + 2, centerZ + z2)
        fillAt(sandstone, centerX + doorX + 2, low, centerZ + z2, centerX + x2, baseY + 2, centerZ + z2)
    } else {
        fillAt(sandstone, centerX + x1, baseY + 3, centerZ + z1, centerX + x2, wallTop, centerZ + z1)
        fillAt(sandstone, centerX + x1, low, centerZ + z1, centerX + doorX - 2, baseY + 2, centerZ + z1)
        fillAt(sandstone, centerX + doorX + 2, low, centerZ + z1, centerX + x2, baseY + 2, centerZ + z1)
        fillAt(sandstone, centerX + x1, low, centerZ + z2, centerX + x2, wallTop, centerZ + z2)
    }
    fillAt(sandstone, centerX + x1, baseY + 6, centerZ + z1, centerX + x2, baseY + 6, centerZ + z2)

    // A carpeted sleeping area, a real two-piece bed, bedside chests, a desk, and a reading shelf.
    fillAt(carpet, centerX + x1 + 2, low, centerZ + z1 + 2, centerX + x2 - 2, low, centerZ + z2 - 2)
    const bedZ = doorOnSouth ? z1 + 3 : z2 - 4
    const bedHeadZ = doorOnSouth ? bedZ + 1 : bedZ - 1
    const bedFoot = blocks.blockWithData(bedBlock, doorOnSouth ? 0 : 2)
    const bedHead = blocks.blockWithData(bedBlock, doorOnSouth ? 8 : 10)
    placeAt(bedFoot, roomX, low, bedZ)
    placeAt(bedHead, roomX, low, bedHeadZ)
    const bedBackZ = doorOnSouth ? z1 + 2 : z2 - 2
    fillAt(quartz, centerX + roomX - 2, low, centerZ + bedBackZ,
        centerX + roomX + 2, low, centerZ + bedBackZ)
    placeAt(chest, roomX - 3, low, bedZ)
    placeAt(chest, roomX + 3, low, bedZ)
    fillAt(bookshelves, centerX + x1 + 2, low, centerZ + roomZ - 2,
        centerX + x1 + 3, baseY + 4, centerZ + roomZ + 2)
    fillAt(oakFence, centerX + x2 - 5, low, centerZ + (doorOnSouth ? z2 - 6 : z1 + 6),
        centerX + x2 - 3, low, centerZ + (doorOnSouth ? z2 - 6 : z1 + 6))
    fillAt(oakSlab, centerX + x2 - 5, baseY + 2, centerZ + (doorOnSouth ? z2 - 6 : z1 + 6),
        centerX + x2 - 3, baseY + 2, centerZ + (doorOnSouth ? z2 - 6 : z1 + 6))
    placeAt(oakStairs, x2 - 6, low, doorOnSouth ? z2 - 6 : z1 + 6)
    placeAt(modernLight, roomX, baseY + 5, roomZ)
}

function buildBedrooms(sandstone: number, quartz: number, modernLight: number, carpet: number,
    oakFence: number, oakSlab: number, oakStairs: number, bookshelves: number,
    chest: number, bedBlock: number) {
    // Two quiet bedrooms north of the hall and two south of it: one private room per resident.
    buildBedroom(sandstone, quartz, modernLight, carpet, oakFence, oakSlab, oakStairs, bookshelves, chest, bedBlock, -21, -5, -43, -26, true)
    buildBedroom(sandstone, quartz, modernLight, carpet, oakFence, oakSlab, oakStairs, bookshelves, chest, bedBlock, 5, 21, -43, -26, true)
    buildBedroom(sandstone, quartz, modernLight, carpet, oakFence, oakSlab, oakStairs, bookshelves, chest, bedBlock, -21, -5, 26, 43, false)
    buildBedroom(sandstone, quartz, modernLight, carpet, oakFence, oakSlab, oakStairs, bookshelves, chest, bedBlock, 5, 21, 26, 43, false)
}

function buildGalleryLevel(sandstone: number, oakFence: number, carpet: number, bookshelves: number,
    oakSlab: number, modernLight: number, floorOffset: number, half: number) {
    const y = baseY + floorOffset
    // Broad gallery floor surrounds an open 13 x 13 stairwell.
    fillAt(sandstone, centerX - half, y, centerZ - half, centerX + half, y, centerZ - 7)
    fillAt(sandstone, centerX - half, y, centerZ + 7, centerX + half, y, centerZ + half)
    fillAt(sandstone, centerX - half, y, centerZ - 6, centerX - 7, y, centerZ + 6)
    fillAt(sandstone, centerX + 7, y, centerZ - 6, centerX + half, y, centerZ + 6)
    // Guard the atrium edge and add a small rug, reading shelf, and table on every gallery.
    fillAt(oakFence, centerX - 6, y + 1, centerZ - 6, centerX + 6, y + 1, centerZ - 6)
    fillAt(oakFence, centerX - 6, y + 1, centerZ + 6, centerX + 6, y + 1, centerZ + 6)
    fillAt(oakFence, centerX - 6, y + 1, centerZ - 5, centerX - 6, y + 1, centerZ + 5)
    fillAt(oakFence, centerX + 6, y + 1, centerZ - 5, centerX + 6, y + 1, centerZ + 5)
    fillAt(carpet, centerX - half + 2, y + 1, centerZ - half + 2,
        centerX - half + 5, y + 1, centerZ - half + 5)
    fillAt(bookshelves, centerX - half + 1, y + 1, centerZ - half + 2,
        centerX - half + 1, y + 3, centerZ - half + 6)
    fillAt(oakFence, centerX + half - 5, y + 1, centerZ + half - 5,
        centerX + half - 3, y + 1, centerZ + half - 3)
    fillAt(oakSlab, centerX + half - 5, y + 2, centerZ + half - 5,
        centerX + half - 3, y + 2, centerZ + half - 3)
    placeAt(modernLight, -half + 2, y + 1, half - 2)
}

function buildSpiralStair(oakStairs: number) {
    // A walkable stair path winds around the open atrium and rises one block per three treads.
    for (let step = 0; step <= 207; step++) {
        const t = (step + 5) % 40
        let dx = 0
        let dz = 0
        if (t < 10) {
            dx = 5 - t
            dz = 5
        } else if (t < 20) {
            dx = -5
            dz = 5 - (t - 10)
        } else if (t < 30) {
            dx = -5 + (t - 20)
            dz = -5
        } else {
            dx = 5
            dz = -5 + (t - 30)
        }
        placeAt(oakStairs, dx, baseY + 1 + Math.floor(step / 3), dz)
        if (cancelBuild) return
    }
}

function startPyramidBuild() {
    if (isBuilding) {
        player.say("TITAN PYRAMID is already running. Type stop to cancel.")
        return
    }
    if (!validBuildSpace()) return

    isBuilding = true
    cancelBuild = false
    // Smooth sandstone is sandstone with the smooth data variant in Education's MakeCode API.
    const sandstone = blocks.blockWithData(SANDSTONE, 2)
    const quartz = blocks.blockByName("quartz_block")
    const modernLight = blocks.blockByName("sea_lantern")
    const goldBlock = blocks.blockByName("gold_block")
    const carpet = blocks.blockByName("white_carpet")
    const warmCarpet = blocks.blockByName("orange_carpet")
    const oakFence = blocks.blockByName("oak_fence")
    const oakSlab = blocks.blockByName("oak_slab")
    const oakStairs = blocks.blockByName("oak_stairs")
    const bookshelves = blocks.blockByName("bookshelf")
    // Use a bookshelf at the lectern display positions for compatibility.
    const lectern = blocks.blockByName("bookshelf")
    const chest = blocks.blockByName("chest")
    const barrel = blocks.blockByName("barrel")
    const craftingTable = blocks.blockByName("crafting_table")
    const furnace = blocks.blockByName("furnace")
    const enchantingTable = blocks.blockByName("enchanting_table")
    const bedBlock = blocks.blockByName("bed")

    player.say("Phase 1/3 — 100 x 100 foundation, hollow core, two-block steps, and a gold cap.")
    buildFoundation(sandstone)
    if (!cancelBuild) clearCavity()
    if (!cancelBuild) buildShell(sandstone, quartz, goldBlock)

    if (!cancelBuild) {
        player.say("Phase 2/3 — entrance, large central hall, kitchen, lounge, and four private bedrooms.")
        buildEntrance(sandstone, quartz, modernLight, goldBlock)
        if (!cancelBuild) buildCentralHall(sandstone, quartz, modernLight, goldBlock, carpet,
            oakFence, oakSlab, oakStairs, bookshelves, lectern, chest, barrel,
            craftingTable, furnace, enchantingTable)
        if (!cancelBuild) buildSideRooms(sandstone, quartz, modernLight, warmCarpet,
            oakFence, oakSlab, oakStairs, bookshelves, chest, barrel, craftingTable, furnace)
        if (!cancelBuild) buildBedrooms(sandstone, quartz, modernLight, warmCarpet,
            oakFence, oakSlab, oakStairs, bookshelves, chest, bedBlock)
    }

    if (!cancelBuild) {
        player.say("Phase 3/3 — five walkable gallery levels and a spiral stair inside the atrium.")
        buildGalleryLevel(sandstone, oakFence, carpet, bookshelves, oakSlab, modernLight, 14, 35)
        buildGalleryLevel(sandstone, oakFence, carpet, bookshelves, oakSlab, modernLight, 28, 29)
        buildGalleryLevel(sandstone, oakFence, carpet, bookshelves, oakSlab, modernLight, 42, 23)
        buildGalleryLevel(sandstone, oakFence, carpet, bookshelves, oakSlab, modernLight, 56, 17)
        buildGalleryLevel(sandstone, oakFence, carpet, bookshelves, oakSlab, modernLight, 70, 11)
        if (!cancelBuild) buildSpiralStair(oakStairs)
    }

    if (cancelBuild) {
        player.say("TITAN PYRAMID stopped after the active fill. Run pyramid again to rebuild from the beginning.")
    } else {
        player.say("TITAN PYRAMID complete: 100 x 100 base, 101 blocks high, two-block steps, five galleries, four bedrooms, and a gold apex.")
    }
    isBuilding = false
}

player.onChat("pyramid", function () {
    startPyramidBuild()
})

player.onChat("stop", function () {
    if (isBuilding) {
        cancelBuild = true
        player.say("Stop requested. The active fill finishes first.")
    } else {
        player.say("No TITAN PYRAMID build is running.")
    }
})

// Optional physical Agent placement for a small detail; bulk construction uses blocks.fill.
player.onChat("agentready", function () {
    agent.teleportToPlayer()
    agent.setItem(blocks.blockWithData(SANDSTONE, 2), 64, 1)
    agent.setItem(blocks.blockByName("quartz_block"), 64, 2)
    agent.setItem(blocks.blockByName("sea_lantern"), 64, 3)
    agent.setSlot(2)
    player.say("Agent is ready. Type agentdetail to place one quartz block forward.")
})

player.onChat("agentdetail", function () {
    agent.setItem(blocks.blockByName("quartz_block"), 1, 2)
    agent.setSlot(2)
    agent.place(FORWARD)
    player.say("Agent placement attempted; it needs a clear block forward.")
})
