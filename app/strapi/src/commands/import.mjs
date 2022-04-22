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
            return yargs.positional('path', { describe: 'Path to countries JSON' })
        }, async (argv) => {
            await importCountries( resolve(argv.path), strapi, argv.dryRun)
        })
        .option('verbose', {
            alias: 'v',
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

        let entity = (await strapi.entityService.findMany('api::country.country', { filters: { country_id: { $eq: c.CountryId }}, limit: 1}))[0]

        if (entity === null || entity === undefined) {
            console.info(`Creating new country: ${c.Title}`)

            if (!dryRun) {
                entity = await strapi.entityService.create('api::country.country', {
                    data: {
                        country_id: c.CountryId.toString(),
                        title: c.Title,
                        code: c.CountryCode,
                    },
                })
                console.info(`Imported Country ${c.Title} (${entity.country_id})`)
            }
        }

        await Promise.all(c.Provinces.map(async p => {
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
                       } catch(error) {
                           console.error(`Unable to create province ${p.Title}: ${error.message}`)
                       }
                   }
               }

               await Promise.all(p.Locations.map(async l => {
                   console.log(`Importing location ${l.Title}`)
                   let location = null

                   location = (await strapi.entityService.findMany('api::location.location', {
                       filters: {
                           location_id: { $eq: l.LocationId }
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
               }))
        }))
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
