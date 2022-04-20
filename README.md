# Strapi Nuxt Holidays

## Dependencies
- Nuxt JS
- Axios
- Strapi
- Sqlite database

## Client Brief (Proof of Contept)
- **Static Data** - Map out the table structure within the system based on the data from the documentation and sample data
- **Strapi Data** - We can use Strapi to import the data as a full import with incremental imports based on the establishments diff
- **Transactional Data** - This will come from a separate system
- **Merged Data** - This is a blend of the Static Data, Strapi Data and Transactional Data that is sent to the frontend

## Documents
- Static Data Specifications v1.5 - documents/Client Docs/
- Booking API JSON Interface Specifications - documents/Client Docs/
- Entity Relationship Diagrams - documents/Database/

## JSON Content Importer
- Where possible we should be cleaning up the data, removing html where possible
- Images will most likely be imported and served through AssetZen where quality and size can be controlled
