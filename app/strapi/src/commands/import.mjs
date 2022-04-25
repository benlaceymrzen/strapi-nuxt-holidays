import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomInt } from 'node:crypto'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import strapi from '@strapi/strapi'

/**
 *
 * @param {string[]} args Arguments to use
 */
async function run(args, strapi) {
    await yargs(args)
      .command('countries <path>', 'Import countries from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importCountries( resolve(argv.path), strapi, argv.dryRun)
      })
      .command('roomTypes <path>', 'Import room types from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importRoomTypes(resolve(argv.path), strapi, argv.dryRun)
      })
      .command('supplierBoardTypes <path>', 'Import supplier board types from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importSupplierBoardTypes(resolve(argv.path), strapi, argv.dryRun)
      })
      .command('accommodationTypes <path>', 'No supplied JSON', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importAccommodationTypes(resolve(argv.path), strapi, argv.dryRun)
      })
      .command('errataCategories <path>', 'Import errata categories from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importErrataCategories(resolve(argv.path), strapi, argv.dryRun)
      })
        .option('verbose', {
            alias: 'verbose',
            type: 'boolean',
            description: 'Enable verbose logging'
        })
        .option('dry-run', {
            type: 'boolean',
            description: 'Don\'t actually modify data. Just pretend.',
        })
        .parseAsync()
}


/**
 *
 * @author Leo Adamak
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importCountries(path, strapi, dryRun) {
  console.info(`Importing countries from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const countries = JSON.parse(file)
  console.info(`Importing ${countries.length} countries`)

  await Promise.all(countries.map(async c => {
    console.info(`Importing ${c.Title}`)

    let endpoint = 'api::country.country'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { country_id: { $eq: c.CountryId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new country: ${c.Title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            country_id: c.CountryId.toString(),
            title: c.Title,
            code: c.CountryCode,
          },
        })
        console.info(`Imported Country ${c.Title} (${entity.country_id})`)
      }
    }

    const provinces = await Promise.all(
      c.Provinces.map(async p => {
        let province = null

        try {
          let endpoint = 'api::province.province'
          province = (await strapi.entityService.findMany(endpoint, {
            filters: {
              province_id: { $eq: p.ProvinceId }
            },
            limit: 1
          }))[0]
        } catch(error) {
          console.error(error.message)
        }

        if (province === null || province === undefined) {
          console.info(`Creating new province ${c.Title} -> ${p.Title}`)

          if (!dryRun) {
            try {
              province = await strapi.entityService.create(endpoint, {
                data: {
                  province_id: p.ProvinceId.toString(),
                  title: p.Title,
                }
              })
            } catch (error) {
              console.error(`Unable to create province ${p.Title}: ${error.message}`)
            }
          }
        }

        const locations = await Promise.all(p.Locations.map(async l => {
          console.log(`Importing location ${l.Title}`)

          let endpoint = 'api::location.location'
          let location = null

          location = (await strapi.entityService.findMany(endpoint, {
            filters: {
              location_id: {$eq: l.LocationId}
            },
            limit: 1,
          }))[0]

          if (location === null || location === undefined) {
            console.log(`Creating new location ${c.Title} -> ${p.Title} -> ${l.Title}`)

            if (!dryRun) location = await strapi.entityService.create(endpoint, {
              data: {
                location_id: l.LocationId.toString(),
                title: l.Title,
              }
            })
          }

          return location
        }))

        console.log(`Assigning ${locations.length} locations to ${p.Title}`)
        if (!dryRun) await strapi.entityService.update('api::province.province', province.id, {
          data: {
            locations: locations.map(l => l.id),
          },
        })
        return province
      })
    )

    console.log(`Assigning ${provinces.length} provinces to ${entity.title}`)
    if (!dryRun) await strapi.entityService.update('api::country.country', entity.id, {
      data: { provinces: provinces.map(p => p.id) }
    })
  }))
}


/**
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importRoomTypes(path, strapi, dryRun) {
  console.info(`Importing room types from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const room_types = JSON.parse(file)
  console.info(`Importing ${room_types.length} room types`)

  await Promise.all(room_types.map(async rt => {
    console.info(`Importing ${rt.Title}`)

    let endpoint = 'api::room-type.room-type'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { standard_room_type_id: { $eq: rt.StandardRoomTypeId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new room type: ${rt.Title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            standard_room_type_id: rt.StandardRoomTypeId.toString(),
            title: rt.Title,
            //room_code: rt.RoomCode,
            // image: rt.ImageUrl,
            // image_id: rt.ImageId
          },
        })
        console.info(`Imported room type ${rt.Title} (${entity.room_type_id})`)
      }
    }

  }))
}


/**
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importSupplierBoardTypes(path, strapi, dryRun) {
  console.info(`Importing supplier board types from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const board_types = JSON.parse(file)
  console.info(`Importing ${board_types.length} board types`)

  await Promise.all(board_types.map(async bt => {
    console.info(`Importing ${bt.Title}`)

    let endpoint = 'api::supplier-board-type.supplier-board-type'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { supplier_board_type_id: { $eq: bt.SupplierBoardTypeId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new supplier board type: ${bt.Title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            supplier_board_type_id: bt.SupplierBoardTypeId.toString(),
            title: bt.Title,
          },
        })
        console.info(`Imported supplier board type ${bt.Title} (${entity.supplier_board_type_id})`)
      }
    }

  }))
}


/**
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importAccommodationTypes(path, strapi, dryRun) {
  console.info(`Importing accommodation types from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const accommodation_types = JSON.parse(file)
  console.info(`Importing ${accommodation_types.length} accommodation types`)

  await Promise.all(accommodation_types.map(async at => {
    console.info(`Importing ${at.AccommodationType}`)

    let endpoint = 'api::accommodation-type.accommodation-type'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { accommodation_type_id: { $eq: at.AccommodationTypeId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new accommodation type: ${at.AccommodationType}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            accommodation_type_id: at.AccommodationTypeId.toString(),
            accommodation_type: at.AccommodationType,
          },
        })
        console.info(`Imported accommodation type ${at.accommodation_type} (${entity.accommodation_type_id})`)
      }
    }
  }))
}


/**
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importErrataCategories(path, strapi, dryRun) {
  console.info(`Importing errata categories from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const errata_categories = JSON.parse(file)
  console.info(`Importing ${errata_categories.length} errata categories`)

  await Promise.all(errata_categories.map(async ec => {
    console.info(`Importing ${ec.ErrataCategoryID} - ${ec.Title}`)

    let endpoint = 'api::errata-category.errata-category'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { errata_category_id: { $eq: ec.ErrataCategoryId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new errata category: ${ec.ErrataCategoryId} - ${ec.Title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            errata_category_id: ec.ErrataCategoryId.toString(),
            title: ec.Title,
            definition: ec.Definition
          },
        })
        console.info(`Imported errata category ${ec.errata_category_id} (${entity.title})`)
      }
    }
  }))
}


(async () => {
  // Override the PORT param to a random port above 32768
  process.env.PORT = randomInt(32767) + 32768

  const instance = await (strapi().start())
  try {
    await run(hideBin(process.argv), instance)
  } catch(error) {
    console.error(`Run Failed: ${error.message}`)
  }
  instance.stop()
})()
