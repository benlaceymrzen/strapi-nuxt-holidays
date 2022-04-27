import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomInt } from 'node:crypto'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import strapi from '@strapi/strapi'
import _ from 'lodash'


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
      .command('standardRoomTypes <path>', 'Import standard room types from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importStandardRoomTypes(resolve(argv.path), strapi, argv.dryRun)
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


      // Establishment Entities
      .command('establishments <path>', 'Import establishment from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importEstablishments(resolve(argv.path), strapi, argv.dryRun)
      })
      .command('establishmentFacilities <path>', 'Import establishment facilities from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importEstablishmentFacilities(resolve(argv.path), strapi, argv.dryRun)
      })
      .command('establishmentExtras <path>', 'Import establishment extras from JSON file', (yargs) => {
        return yargs.positional('path', { describe: 'Path to JSON file' })
      }, async (argv) => {
        await importEstablishmentExtras(resolve(argv.path), strapi, argv.dryRun)
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
          province = (await strapi.entityService.findMany('api::province.province', {
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
              province = await strapi.entityService.create('api::province.province', {
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
          let location = null

          location = (await strapi.entityService.findMany('api::location.location', {
            filters: {
              location_id: {$eq: l.LocationId}
            },
            limit: 1,
          }))[0]

          if (location === null || location === undefined) {
            console.log(`Creating new location ${c.Title} -> ${p.Title} -> ${l.Title}`)

            if (!dryRun) location = await strapi.entityService.create('api::location.location', {
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

    // TODO: Example of assigning linked entries
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
async function importStandardRoomTypes(path, strapi, dryRun) {
  console.info(`Importing standard room types from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const room_types = JSON.parse(file)
  console.info(`Importing ${room_types.length} standard room types`)

  await Promise.all(room_types.map(async rt => {
    console.info(`Importing ${rt.Title}`)

    let endpoint = 'api::standard-room-type.standard-room-type'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { standard_room_type_id: { $eq: rt.StandardRoomTypeId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new standard room type: ${rt.Title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            standard_room_type_id: rt.StandardRoomTypeId.toString(),
            title: rt.Title,
          },
        })
        console.info(`Imported standard room type ${rt.Title} (${entity.room_type_id})`)
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



/**
 * Import Establishments - We need to run accommodationTypes and Rating Types before importing establishments
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importEstablishments(path, strapi, dryRun) {
  console.info(`Importing establishments from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const establishments = JSON.parse(file)

  // Chunk the data
  let result = []
  let max_entries = 10
  console.log(`Number of Establishments: ${establishments.length}`)
  console.log(`Number of Chunks: ${max_entries}`)

  let loop_count = establishments.length / max_entries
  console.log("Loop Count: ", loop_count)


  // let chunkedEntries = _.chunk(establishments, max_entries)
  let chunkedEntries = establishments.slice(0, max_entries)
  console.log(`Number of Entries: ${chunkedEntries.length}`)

  await Promise.all(chunkedEntries.map(async e => {
    let endpoint = "api::establishment.establishment"
    let entity = await strapi.entityService.findMany(endpoint, {
      filters: {establishment_id: {$eq: e.EstablishmentId}},
      limit: 1
    })[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new establishment: ${e.EstablishmentId}: ${e.EstablishmentTitle}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            establishment_id: e.EstablishmentId.toString(),
            title: e.EstablishmentTitle,
            accommodation_type_id: e.AccommodationTypeId,
            address: e.Address,
            postal_code: e.PostalCode,
            email: e.Email,
            fax: e.FaxNumber,
            phone: e.PhoneNumber,
            location_id: e.LocationId,          // Lookup Location entity
            rating_type_id: e.RatingTypeId,
            rating: e.Rating
          },
        })
        console.info(`Imported establishment ${e.EstablishmentId}: ${e.EstablishmentTitle}`)

        // Add the component data
        // geographic_location

      }

      console.log("entity", entity)
    }

    // Import Establishment Images (component)

    // Import Establishment Geocode (component)
    // - Might have to find entity for the component and link the data back to the establishment id
    // latitude: e.Latitude,
    // longitude: e.longitude,
    // geocode_accuracy: e.GeocodeAccuracy,

  }))


  // console.info(`Importing ${establishments.length} establishments`)
  //
  // await Promise.all(establishments.map(async e => {
  //   console.info(`Importing ${e.EstablishmentID}: ${e.EstablishmentTitle}`)
  //

  // }))
}

/**
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importEstablishmentFacilities(path, strapi, dryRun) {
  console.info(`Importing establishment facilities from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const facilities = JSON.parse(file)
  console.info(`Importing ${facilities.length} establishment facilities`)

  await Promise.all(facilities.map(async f => {
    console.info(`Importing ${ef.FacilityID} ${ef.Title} for ${ef.EstablishmentId}`)

    let endpoint = 'api::establishment-facility.establishment-facility'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { FacilityId: { $eq: ef.FacilityId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new establishment facility: ${ef.EstablishmentId} - ${ef.FacilityGroup} - ${ef.FacilityType} - ${ef.title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            facility_id: ef.ErrataCategoryId.toString(),
            establishments: ef.EstablishmentId.toString(),
            facility_type: ef.FacilityType,
            facility_group: ef.FacilityGroup,
            title: ef.Title,
          },
        })
        console.info(`Imported establishment facility ${ef.EstablishmentId} (${entity.Title})`)
      }
    }
  }))
}

/**
 * We need ESTABLISHMENTS table to be imported before the extras
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importExtras(path, strapi, dryRun) {
  console.info(`Importing extras from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const extras = JSON.parse(file)
  console.info(`Importing ${extras.length} extras`)

  await Promise.all(extras.map(async e => {
    console.info(`Importing extras ${e.ExtraId} - ${e.type} - ${e.Title}`)

    let endpoint = 'api::extra.extra'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { extra_id: { $eq: e.ExtraId }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new extra ${e.ExtraId} - ${e.Type} - ${e.Title}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            extra_id: e.ExtraId,
            title: e.Title,
            type: e.Type,
            establishment: e.EstablishmentId.toString(),
          },
        })
        console.info(`Imported new extra ${e.ExtraId} (${entity.title})`)
      }
    }
  }))
}

/**
 * We need ESTABLISHMENTS table to be imported before the images
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importEstablishmentImages(path, strapi, dryRun) {
  console.info(`Importing establishment images from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const establishment_images = JSON.parse(file)
  console.info(`Importing ${establishment_images.length} establishment images`)

  await Promise.all(establishment_images.map(async ei => {
    console.info(`Importing image ${ei.ImageId} - ${ei.Url}`)

    // TODO: Check this and add the data as a repeatable component
    let entity = (await strapi.entityService.findMany('api::establishment', { filters: { establishment_id: { $eq: ei.EstablishmentId }}, limit: 1}))[0]
    console.log(entity)


    if (entity === null || entity === undefined) {
      console.info(`Creating new image for establishment ${ei.EstablishmentId} - ${ei.Url}`)

      if (!dryRun) {
        entity = await strapi.entityService.create('api::establishment-image.establishment-image', {
          data: {
            establishment: ei.EstablishmentId.toString(),
            image_id: ei.ImageId,
            image_url: ei.ImageUrl
          },
        })
        console.info(`Imported new image for establishment ${ei.establishment_id} (${entity.image_id})`)
      }
    }
  }))
}


/**
 * We need ESTABLISHMENTS table to be imported before the room types
 *
 * @author Ben Lacey
 * @param {string} path
 * @param {StrpaiInstance} strapi
 * @returns
 */
async function importEstablishmentRoomTypes(path, strapi, dryRun) {
  console.info(`Importing establishment room types from ${path}`)
  let file

  try {
    file = await readFile(path)
  } catch(error) {
    console.error(`Unable to open file: ${error.message}`)
    return
  }

  const establishment_room_types = JSON.parse(file)
  console.info(`Importing ${establishment_room_types.length} establishment room types`)

  await Promise.all(establishment_room_types.map(async ert => {
    console.info(`Importing room type for establishment ${ert.EstablishmentId} - ${ert.Title}`)

    let endpoint = 'api::establishment-room-type.establishment-room-type'
    let entity = (await strapi.entityService.findMany(endpoint, { filters: { room_code: { $eq: ert.RoomCode }}, limit: 1}))[0]

    if (entity === null || entity === undefined) {
      console.info(`Creating new room type for establishment ${ert.EstablishmentId} - ${ert.Title} - ${ert.ImageId}`)

      if (!dryRun) {
        entity = await strapi.entityService.create(endpoint, {
          data: {
            title: ert.Title,
            establishment: ert.EstablishmentId.toString(),
            description: ert.Description,
            image_id: ert.ImageId,
            image: ert.ImageUrl,           // TODO: Hopefully this will upload the media from the URL?
            image_url: ert.ImageUrl,
            room_code: ert.RoomCode
          },
        })
        console.info(`Imported new room type for establishment ${ert.EstablishmentId} (${entity.room_code}: ${entity.title})`)
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
