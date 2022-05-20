const path = require('path'),
      fs = require('fs-extra');

const args = process.argv.filter((element, index) => {
  return index >=2;
});
if (args.length <= 0) {
  const usage = `
  ==============================================================
    Simplified manifest schema validator, using ajv,
    that can be used for very quick schema validations.
    This will validate a json file against the schema
    found in manifest-schema.json

    Usage: node manifestTester.js someManifestFile.json

    NOTE: for a graphical JSON schema validator go to
    https://www.jsonschemavalidator.net/

  ==============================================================`;
  console.log(usage);
  process.exit(1);
}

async function runLinkValidation() {
  const filePath = path.normalize(args[0]);

  console.log(`Retrieving ${filePath}`);
  const manifest = await fs.readFile(filePath, 'utf8');
  console.log('Converting to JSON object');
  const data = JSON.parse(manifest);

  console.log('Iterating through artifacts...');
  let valid=true;
  for (let i=0; i<data.artifacts.length; i++){
    const current = data.artifacts[i].location;
    if (current){
      if (fs.existsSync(`./${current}`)){
        console.log(`\t✅  Validating ${current}`);
      }
      else{
        console.log(`\t❌  Validating ${current}`);
        valid = false;
      }
    }
  }
  if (!valid) {
    console.error('Validation Failed  👎');
    process.exit(1);
  }
  else {
    console.log('Validation passed  👍');
  }
}
try {
  runLinkValidation();
}
catch(error) {
  console.error(`Error occurred running the validator ${error}`);
}