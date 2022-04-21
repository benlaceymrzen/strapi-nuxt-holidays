// const strapi = require('strapi')
const inquirer = require('inquirer');

// Show welcome banner
require('./src/welcome.js');

inquirer.prompt([
    {
      name: 'backupPrompt',
      message: 'Have you made a database backup? [Y or N]'
    },
  ])
  .then(answers => {
    const backupPromptAnswer = answers.backupPrompt.toLowerCase();

    if ( backupPromptAnswer == 'n' || backupPromptAnswer == 'no'){

      console.log("")
      console.log("Please make a backup before proceeding");

    } else {

      // Prompt for the filename to import into Strapi
      inquirer.prompt([
        {
          name: 'filenamePrompt',
          message: 'Please enter the filename to import: '
        },
      ])
        .then(answers => {
          const filenamePromptAnswer = answers.filenamePrompt;
          console.info('Filename: ', filenamePromptAnswer);
        }
      );
    }
  }
);
