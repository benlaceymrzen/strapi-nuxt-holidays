import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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

    countries.forEach(async c => {
        console.debug(`Importing ${c.Title}`)
        let entity = await strapi.entityService.findOne('api::country.country', c.CountryId );

        if (entity === null) {
            console.debug(`Creating new country: ${c.Title}`)

            if (!dryRun) {
                entity = await strapi.entityService.create('api::country.country', {
                    data: {
                        country_id: c.CountryId.toString(),
                        title: c.Title,
                        code: c.CountryCode
                    }
                })
                console.info(`Imported Country ${c.Title} (${entity.country_id})`)
            }
        }

        return
    })
}

(async () => {
    const instance = await (strapi({ port: 32768 }).start())
   await run(hideBin(process.argv), instance)
})()
