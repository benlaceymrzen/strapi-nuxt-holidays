// const strapi = require('strapi')
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');

const dataDirectoryPath = path.join(__dirname, '../../../data/');

// Show welcome banner
console.log("")
console.log("")
console.log("******************************")
console.log("**  Custom Strapi Importer  **")
console.log("******************************")
console.log("")

// List data files that can be selected to import
function listImportFiles(){
  fs.readdir(dataDirectoryPath, function (err, filenames) {
    if (err) { return console.log('Unable to scan directory: ' + err); }
    let files = []
    let index = 1;

    if(!err) {
      filenames.forEach(file => {
        // console.log(file)
        files.push(
          {
            key: index,
            value: file
          }
        )

        index++
      });
      // console.log("")
    }

    //files = filenames.join(", ")
    // console.log(files)
    return files
  });
}


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
      let choices_list = [
        {key: 'a', value:'Facilities_enV4.json'},
        {key: 'b', value:'LocationsV4.json'},
        {key: 'c', value:'ProvincesV4.json'}
      ]

      // Prompt for the filename to import into Strapi
      inquirer.prompt([
        {
          type: 'expand',
          name: 'filenamePrompt',
          message: 'Select files to import: ',
          choices: choices_list
        },
      ])
        .then(answers => {
          const filenamePromptAnswer = answers.filenamePrompt;
          let json_file_path = dataDirectoryPath + filenamePromptAnswer

          console.log(filenamePromptAnswer)
          console.info('Filename: ', json_file_path)

          // Process File
          console.log("Processing File: ", answers.filenamePrompt)

          try {
            if (fs.existsSync(json_file_path)) {
              // file exists
              fs.readFile(json_file_path, (err, data) => {
                if (err) throw err;
                let parsedData = JSON.parse(data);
                console.log(parsedData);
              });
            }
          } catch(err) {
            console.error("Error reading file - ", err)
          }

        }
      );

    }
  }
);
