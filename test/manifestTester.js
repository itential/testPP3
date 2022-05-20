const AJV = require('ajv'),
  path = require('path'),
  fs = require('fs-extra'),
  r2 = require('r2'),
  betterAjvErrors = require('better-ajv-errors');

const ajv = new AJV({
  jsonPointers: true,
  allErrors: true
});

const args = process.argv.filter((element, index) => {
  return index >= 2;
});
if (args.length != 2) {
  const usage = `
  ==============================================================
    Simplified manifest schema validator, using ajv,
    that can be used for very quick schema validations.
    This will validate a json file against the schema
    found in manifest-schema.json

    Examples:
    Usage: node manifestTester.js someManifestFile.json PATH/TO/SCHEMA/FILE.json
    Usage: node manifestTester.js someManifestFile.json http://www.PATH.TO/SCHEMA/FILE.json

    NOTE: for a graphical JSON schema validator go to
    https://www.jsonschemavalidator.net/

  ==============================================================`;
  console.log(usage);
  process.exit(1);
}

async function runValidation() {
  let schema;
  if (args[1].includes("http")) {
    schema = await r2(args[1]).json;
  }
  else {
    schema = require(path.join(__dirname, args[1]));
  }
  // console.log(`the schema is : ${JSON.stringify(schema)}`)
  const filePath = path.normalize(args[0]);
  console.log(`Retrieving ${filePath}`);
  try {
    const manifest = await fs.readFile(filePath, 'utf8');
    console.log('Converting to JSON object');
    const data = JSON.parse(manifest);

    console.log('Initializing AJV with schema');
    ajv.addSchema(schema, 'manifestSchema');
    console.log(`Validating ${filePath} against the schema`);
    var valid = ajv.validate('manifestSchema', data);
    if (!valid) {
      console.error('❌  Validation Failed');
      const output = betterAjvErrors(schema, data, ajv.errors, { format: 'js' });
      console.log(output);
      process.exit(1);

    }
    else {
      console.log('✅  Validation passed');
    }
  }
  catch (error) {
    console.error(error);
    process.exit(1);
  }
}
try {
  runValidation();
}
catch (error) {
  console.error(`❌  Error occurred running the validator ${error}`);
  process.exit(1);
}